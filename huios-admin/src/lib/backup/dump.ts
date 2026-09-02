import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import prisma from '@/lib/prisma'

import {
  DUMP_FILE,
  MANIFEST_FILE,
  UPLOADS_ENTRY,
  buildManifest,
} from './manifest.ts'
import {
  backupDir,
  buildBackupFileName,
  resolveBackupFilePath,
  uploadsDir,
  type BackupType,
} from './paths.ts'
import { parseDatabaseUrl, pgEnv, systemProcessRunner, type ProcessRunner } from './process.ts'
import { getBackupSettings, markLastBackupAt } from './settings.ts'

export interface CriarBackupInput {
  tipo: BackupType
  userId?: string | null
  /** Sobrepõe a configuração; usado pela restauração, que sempre leva os uploads. */
  incluirUploads?: boolean
  runner?: ProcessRunner
}

export interface BackupResult {
  id: string
  fileName: string
  sizeBytes: number
  createdAt: Date
}

export class BackupEmAndamentoError extends Error {
  readonly code = 'BACKUP_EM_ANDAMENTO'

  constructor() {
    super('Já existe um backup em andamento. Aguarde a conclusão.')
    this.name = 'BackupEmAndamentoError'
  }
}

export class BackupFalhouError extends Error {
  readonly code = 'BACKUP_FALHOU'

  constructor(message: string) {
    super(message)
    this.name = 'BackupFalhouError'
  }
}

// Lock de processo: o app roda num único container, então basta impedir dois
// backups concorrentes aqui (manual e agendado disparando juntos, por exemplo).
let backupEmAndamento = false

export function backupEstaRodando(): boolean {
  return backupEmAndamento
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function schemaHash(): Promise<string | null> {
  try {
    const schema = await fs.readFile(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
    return crypto.createHash('sha256').update(schema).digest('hex').slice(0, 16)
  } catch {
    return null
  }
}

async function appVersion(): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8')
    const parsed = JSON.parse(raw) as { version?: string }
    return parsed.version || null
  } catch {
    return null
  }
}

/** Trunca o stderr do processo para caber em errorMessage sem virar um romance. */
function resumoDeErro(raw: string, fallback: string): string {
  const texto = raw.trim() || fallback
  return texto.length > 2000 ? `${texto.slice(0, 2000)}…` : texto
}

/**
 * Gera um pacote .tar.gz com o dump do Postgres, os arquivos enviados e o
 * manifest. Cada execução deixa rastro em BackupRecord — inclusive as que falham.
 */
export async function criarBackup(input: CriarBackupInput): Promise<BackupResult> {
  if (backupEmAndamento) throw new BackupEmAndamentoError()
  backupEmAndamento = true

  const runner = input.runner || systemProcessRunner
  const criadoEm = new Date()
  const fileName = buildBackupFileName(input.tipo, criadoEm)
  const destino = resolveBackupFilePath(fileName)

  const settings = await getBackupSettings()
  const incluirUploads = input.incluirUploads ?? settings.backupIncludeUploads

  const record = await prisma.backupRecord.create({
    data: {
      fileName,
      type: input.tipo,
      status: 'RUNNING',
      createdById: input.userId || null,
      createdAt: criadoEm,
    },
  })

  let staging: string | null = null

  try {
    await fs.mkdir(backupDir(), { recursive: true })
    staging = await fs.mkdtemp(path.join(os.tmpdir(), 'huios-backup-'))

    // 1) Dump do banco em formato custom (comprimido e restaurável seletivamente).
    const connection = parseDatabaseUrl()
    const dumpPath = path.join(staging, DUMP_FILE)
    const dump = await runner.run(
      'pg_dump',
      ['--format=custom', '--no-owner', '--no-acl', '--file', dumpPath],
      { env: pgEnv(connection) },
    )
    if (dump.code !== 0) {
      throw new BackupFalhouError(resumoDeErro(dump.stderr, 'pg_dump falhou.'))
    }

    // 2) Arquivos enviados pelos usuários.
    const origemUploads = uploadsDir()
    const levaUploads = incluirUploads && (await pathExists(origemUploads))
    if (levaUploads) {
      await fs.cp(origemUploads, path.join(staging, UPLOADS_ENTRY), { recursive: true })
    }

    // 3) Manifest — é o que a restauração valida antes de tocar no banco.
    const manifest = buildManifest({
      type: input.tipo,
      includesUploads: levaUploads,
      appVersion: await appVersion(),
      schemaHash: await schemaHash(),
      createdAt: criadoEm,
    })
    await fs.writeFile(path.join(staging, MANIFEST_FILE), JSON.stringify(manifest, null, 2), 'utf8')

    // 4) Empacota tudo.
    const tar = await runner.run('tar', ['-czf', destino, '-C', staging, '.'])
    if (tar.code !== 0) {
      throw new BackupFalhouError(resumoDeErro(tar.stderr, 'Falha ao compactar o backup.'))
    }

    const { size } = await fs.stat(destino)

    await prisma.backupRecord.update({
      where: { id: record.id },
      data: { status: 'SUCCESS', sizeBytes: BigInt(size), finishedAt: new Date() },
    })
    await markLastBackupAt(new Date())

    return { id: record.id, fileName, sizeBytes: size, createdAt: criadoEm }
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error)
    await prisma.backupRecord.update({
      where: { id: record.id },
      data: { status: 'FAILED', errorMessage: resumoDeErro(mensagem, 'Erro desconhecido.'), finishedAt: new Date() },
    }).catch(() => undefined)
    await fs.rm(destino, { force: true }).catch(() => undefined)
    throw error
  } finally {
    if (staging) await fs.rm(staging, { recursive: true, force: true }).catch(() => undefined)
    backupEmAndamento = false
  }
}
