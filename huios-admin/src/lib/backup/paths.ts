import path from 'node:path'

/** Tipos de backup gravados em BackupRecord.type. */
export type BackupType = 'AUTO' | 'MANUAL' | 'PRE_RESTORE'

/** Estados de BackupRecord.status. */
export type BackupStatus = 'RUNNING' | 'SUCCESS' | 'FAILED'

export const BACKUP_TYPES: readonly BackupType[] = ['AUTO', 'MANUAL', 'PRE_RESTORE']

/**
 * Diretório onde os pacotes ficam. Em produção é um volume Docker montado em
 * /app/backups; em desenvolvimento cai em <projeto>/backups.
 */
export function backupDir(): string {
  return process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
}

/** Pasta de arquivos enviados pelos usuários, incluída no pacote. */
export function uploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * huios-backup-2026-09-02-0300-auto.tar.gz
 *
 * A data usada é a local do processo — em produção o container roda em UTC e o
 * agendador dispara pelo horário de Brasília, então o nome pode não bater com a
 * hora configurada. A data exibida na tela vem sempre de createdAt, não do nome.
 */
export function buildBackupFileName(type: BackupType, date: Date = new Date()): string {
  const stamp = [
    date.getFullYear(),
    twoDigits(date.getMonth() + 1),
    twoDigits(date.getDate()),
  ].join('-')
  const time = `${twoDigits(date.getHours())}${twoDigits(date.getMinutes())}${twoDigits(date.getSeconds())}`
  return `huios-backup-${stamp}-${time}-${type.toLowerCase()}.tar.gz`
}

/**
 * Aceita apenas nomes simples de arquivo .tar.gz. Barra, contrabarra, ".." ou
 * caminho absoluto são recusados: o nome vem do banco, mas essa é a barreira que
 * impede que um registro adulterado vire leitura arbitrária de disco.
 */
export function isSafeBackupFileName(fileName: unknown): fileName is string {
  if (typeof fileName !== 'string') return false
  if (fileName.length === 0 || fileName.length > 200) return false
  if (/[\\/]/.test(fileName)) return false
  if (fileName.includes('\u0000')) return false
  if (fileName === '.' || fileName === '..') return false
  if (fileName.startsWith('.')) return false
  if (path.isAbsolute(fileName)) return false
  if (path.basename(fileName) !== fileName) return false
  return fileName.endsWith('.tar.gz')
}

export class UnsafeBackupFileNameError extends Error {
  readonly code = 'UNSAFE_BACKUP_FILE_NAME'

  constructor(fileName: unknown) {
    super(`Nome de arquivo de backup inválido: ${String(fileName)}`)
    this.name = 'UnsafeBackupFileNameError'
  }
}

/** Resolve o caminho absoluto do pacote, recusando qualquer nome fora do diretório. */
export function resolveBackupFilePath(fileName: unknown, dir: string = backupDir()): string {
  if (!isSafeBackupFileName(fileName)) throw new UnsafeBackupFileNameError(fileName)
  return path.join(dir, fileName)
}
