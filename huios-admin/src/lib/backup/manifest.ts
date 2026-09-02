import { BACKUP_TYPES, type BackupType } from './paths.ts'

/** Versão do formato do pacote. Sobe quando o layout do .tar.gz mudar. */
export const BACKUP_MANIFEST_VERSION = 1

export const MANIFEST_FILE = 'manifest.json'
export const DUMP_FILE = 'dump.pgc'
export const UPLOADS_ENTRY = 'uploads'

export interface BackupManifest {
  version: number
  createdAt: string
  type: BackupType
  includesUploads: boolean
  appVersion: string | null
  schemaHash: string | null
}

export class InvalidBackupError extends Error {
  readonly code = 'INVALID_BACKUP'

  constructor(message: string) {
    super(message)
    this.name = 'InvalidBackupError'
  }
}

export function buildManifest(input: {
  type: BackupType
  includesUploads: boolean
  appVersion?: string | null
  schemaHash?: string | null
  createdAt?: Date
}): BackupManifest {
  return {
    version: BACKUP_MANIFEST_VERSION,
    createdAt: (input.createdAt || new Date()).toISOString(),
    type: input.type,
    includesUploads: input.includesUploads,
    appVersion: input.appVersion ?? null,
    schemaHash: input.schemaHash ?? null,
  }
}

/**
 * Lê o manifest de um pacote. Qualquer inconsistência vira InvalidBackupError —
 * a restauração aborta aqui, antes de tocar no banco.
 */
export function parseManifest(raw: string): BackupManifest {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new InvalidBackupError('O manifest do backup não é um JSON válido.')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidBackupError('O manifest do backup está corrompido.')
  }

  const data = parsed as Record<string, unknown>

  if (typeof data.version !== 'number' || !Number.isInteger(data.version)) {
    throw new InvalidBackupError('O manifest do backup não informa a versão.')
  }
  if (data.version > BACKUP_MANIFEST_VERSION) {
    throw new InvalidBackupError(
      `Este backup foi gerado por uma versão mais nova do sistema (formato ${data.version}).`,
    )
  }
  if (typeof data.createdAt !== 'string' || Number.isNaN(Date.parse(data.createdAt))) {
    throw new InvalidBackupError('O manifest do backup não tem data de criação válida.')
  }
  if (typeof data.type !== 'string' || !BACKUP_TYPES.includes(data.type as BackupType)) {
    throw new InvalidBackupError('O manifest do backup tem um tipo desconhecido.')
  }
  if (typeof data.includesUploads !== 'boolean') {
    throw new InvalidBackupError('O manifest do backup não diz se inclui os arquivos enviados.')
  }

  return {
    version: data.version,
    createdAt: data.createdAt,
    type: data.type as BackupType,
    includesUploads: data.includesUploads,
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : null,
    schemaHash: typeof data.schemaHash === 'string' ? data.schemaHash : null,
  }
}
