import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import prisma from '@/lib/prisma'

import { criarBackup } from './dump.ts'
import {
  DUMP_FILE,
  InvalidBackupError,
  MANIFEST_FILE,
  UPLOADS_ENTRY,
  parseManifest,
  type BackupManifest,
} from './manifest.ts'
import { resolveBackupFilePath, uploadsDir } from './paths.ts'
import { parseDatabaseUrl, pgEnv, systemProcessRunner, type ProcessRunner } from './process.ts'

export type OrigemRestauracao =
  | { tipo: 'registro'; backupId: string }
  | { tipo: 'upload'; nomeOriginal: string; conteudo: Buffer }

export interface RestaurarBackupInput {
  origem: OrigemRestauracao
  userId?: string | null
  runner?: ProcessRunner
}

export interface RestauracaoResult {
  manifest: BackupManifest
  backupDeSeguranca: string
  uploadsRestaurados: boolean
}

export class RestauracaoEmAndamentoError extends Error {
  readonly code = 'RESTAURACAO_EM_ANDAMENTO'

  constructor() {
    super('Já existe uma restauração em andamento.')
    this.name = 'RestauracaoEmAndamentoError'
  }
}

export class RestauracaoFalhouError extends Error {
  readonly code = 'RESTAURACAO_FALHOU'

  constructor(message: string, readonly backupDeSeguranca?: string) {
    super(message)
    this.name = 'RestauracaoFalhouError'
  }
}

let restauracaoEmAndamento = false

export function restauracaoEstaRodando(): boolean {
  return restauracaoEmAndamento
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

/** Materializa o pacote num caminho local, venha ele do disco ou de um upload. */
async function resolverPacote(
  origem: OrigemRestauracao,
  tmpDir: string,
): Promise<string> {
  if (origem.tipo === 'registro') {
    const record = await prisma.backupRecord.findUnique({ where: { id: origem.backupId } })
    if (!record) throw new InvalidBackupError('Backup não encontrado.')
    if (record.status !== 'SUCCESS') {
      throw new InvalidBackupError('Este backup não foi concluído com sucesso e não pode ser restaurado.')
    }
    const caminho = resolveBackupFilePath(record.fileName)
    if (!(await pathExists(caminho))) {
      throw new InvalidBackupError('O arquivo deste backup não está mais no servidor.')
    }
    return caminho
  }

  if (!origem.nomeOriginal.endsWith('.tar.gz')) {
    throw new InvalidBackupError('Envie um arquivo .tar.gz gerado por este sistema.')
  }
  const destino = path.join(tmpDir, 'enviado.tar.gz')
  await fs.writeFile(destino, origem.conteudo)
  return destino
}

function resumoDeErro(raw: string, fallback: string): string {
  const texto = raw.trim() || fallback
  return texto.length > 2000 ? `${texto.slice(0, 2000)}…` : texto
}

/**
 * Substitui o banco e os arquivos enviados pelo conteúdo de um backup.
 *
 * A ordem importa: tudo que pode falhar sem consequência (extrair, validar o
 * manifest, gerar a cópia de segurança) acontece ANTES do pg_restore. Depois que
 * o restore começa, o banco atual já foi descartado.
 */
export async function restaurarBackup(input: RestaurarBackupInput): Promise<RestauracaoResult> {
  if (restauracaoEmAndamento) throw new RestauracaoEmAndamentoError()
  restauracaoEmAndamento = true

  const runner = input.runner || systemProcessRunner
  let tmpDir: string | null = null

  try {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'huios-restore-'))
    const pacote = await resolverPacote(input.origem, tmpDir)

    // 1) Extrai o pacote.
    const extraido = path.join(tmpDir, 'conteudo')
    await fs.mkdir(extraido, { recursive: true })
    const tar = await runner.run('tar', ['-xzf', pacote, '-C', extraido])
    if (tar.code !== 0) {
      throw new InvalidBackupError(resumoDeErro(tar.stderr, 'Não foi possível abrir o arquivo de backup.'))
    }

    // 2) Valida o manifest e a presença do dump.
    let manifestRaw: string
    try {
      manifestRaw = await fs.readFile(path.join(extraido, MANIFEST_FILE), 'utf8')
    } catch {
      throw new InvalidBackupError('O arquivo não parece um backup do Huios (manifest ausente).')
    }
    const manifest = parseManifest(manifestRaw)

    const dumpPath = path.join(extraido, DUMP_FILE)
    if (!(await pathExists(dumpPath))) {
      throw new InvalidBackupError('O backup não contém o dump do banco de dados.')
    }

    // 3) Rede de segurança: o estado atual vira um backup antes de ser descartado.
    const seguranca = await criarBackup({
      tipo: 'PRE_RESTORE',
      userId: input.userId,
      incluirUploads: true,
      runner,
    })

    // 4) Restaura o banco. A partir daqui não há como voltar sem o PRE_RESTORE.
    const connection = parseDatabaseUrl()
    const restore = await runner.run(
      'pg_restore',
      [
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-acl',
        '--single-transaction',
        '--dbname', connection.database,
        dumpPath,
      ],
      { env: pgEnv(connection) },
    )
    if (restore.code !== 0) {
      throw new RestauracaoFalhouError(
        resumoDeErro(restore.stderr, 'pg_restore falhou.'),
        seguranca.fileName,
      )
    }

    // 5) Arquivos enviados.
    let uploadsRestaurados = false
    const origemUploads = path.join(extraido, UPLOADS_ENTRY)
    if (manifest.includesUploads && (await pathExists(origemUploads))) {
      const destinoUploads = uploadsDir()
      await fs.rm(destinoUploads, { recursive: true, force: true })
      await fs.mkdir(path.dirname(destinoUploads), { recursive: true })
      await fs.cp(origemUploads, destinoUploads, { recursive: true })
      uploadsRestaurados = true
    }

    return {
      manifest,
      backupDeSeguranca: seguranca.fileName,
      uploadsRestaurados,
    }
  } finally {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined)
    restauracaoEmAndamento = false
  }
}
