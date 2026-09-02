import prisma from '@/lib/prisma'

export interface BackupSettings {
  backupEnabled: boolean
  backupHour: number
  backupRetentionCount: number
  backupIncludeUploads: boolean
  lastBackupAt: Date | null
}

export const BACKUP_SETTINGS_DEFAULTS: BackupSettings = {
  backupEnabled: true,
  backupHour: 3,
  backupRetentionCount: 14,
  backupIncludeUploads: true,
  lastBackupAt: null,
}

export const MIN_RETENTION = 1
export const MAX_RETENTION = 90

function clampHour(value: unknown): number {
  const hour = Number(value)
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return BACKUP_SETTINGS_DEFAULTS.backupHour
  return hour
}

function clampRetention(value: unknown): number {
  const count = Number(value)
  if (!Number.isInteger(count)) return BACKUP_SETTINGS_DEFAULTS.backupRetentionCount
  return Math.min(MAX_RETENTION, Math.max(MIN_RETENTION, count))
}

/** Normaliza o que veio do formulário antes de gravar. */
export function normalizeBackupSettingsInput(input: Record<string, unknown>): Omit<BackupSettings, 'lastBackupAt'> {
  return {
    backupEnabled: input.backupEnabled !== false,
    backupHour: clampHour(input.backupHour),
    backupRetentionCount: clampRetention(input.backupRetentionCount),
    backupIncludeUploads: input.backupIncludeUploads !== false,
  }
}

/** Lê a configuração de backup, caindo nos padrões quando o registro ainda não existe. */
export async function getBackupSettings(): Promise<BackupSettings> {
  const settings = await prisma.systemSettings.findFirst()
  if (!settings) return { ...BACKUP_SETTINGS_DEFAULTS }

  return {
    backupEnabled: settings.backupEnabled !== false,
    backupHour: clampHour(settings.backupHour ?? BACKUP_SETTINGS_DEFAULTS.backupHour),
    backupRetentionCount: clampRetention(
      settings.backupRetentionCount ?? BACKUP_SETTINGS_DEFAULTS.backupRetentionCount,
    ),
    backupIncludeUploads: settings.backupIncludeUploads !== false,
    lastBackupAt: settings.lastBackupAt ?? null,
  }
}

/** Grava a configuração, criando o SystemSettings se ainda não houver. */
export async function saveBackupSettings(
  input: Omit<BackupSettings, 'lastBackupAt'>,
): Promise<BackupSettings> {
  const existing = await prisma.systemSettings.findFirst()
  if (existing) {
    await prisma.systemSettings.update({ where: { id: existing.id }, data: input })
  } else {
    await prisma.systemSettings.create({ data: input })
  }
  return getBackupSettings()
}

export async function markLastBackupAt(date: Date): Promise<void> {
  const existing = await prisma.systemSettings.findFirst()
  if (existing) {
    await prisma.systemSettings.update({
      where: { id: existing.id },
      data: { lastBackupAt: date },
    })
  } else {
    await prisma.systemSettings.create({ data: { lastBackupAt: date } })
  }
}
