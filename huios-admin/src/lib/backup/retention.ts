import fs from 'node:fs/promises'

import prisma from '@/lib/prisma'

import { resolveBackupFilePath } from './paths.ts'
import { selectBackupsToDelete, type RetentionCandidate } from './retention-policy.ts'
import { getBackupSettings } from './settings.ts'

export { selectBackupsToDelete } from './retention-policy.ts'
export type { RetentionCandidate } from './retention-policy.ts'

/** Aplica a retenção configurada, removendo arquivo e registro. */
export async function aplicarRetencao(): Promise<{ removidos: number }> {
  const { backupRetentionCount } = await getBackupSettings()
  const candidates = await prisma.backupRecord.findMany({
    where: { type: 'AUTO' },
    orderBy: { createdAt: 'desc' },
  })

  const toDelete = selectBackupsToDelete(candidates as RetentionCandidate[], backupRetentionCount)

  for (const record of toDelete) {
    await removeBackupFile(record.fileName)
    await prisma.backupRecord.delete({ where: { id: record.id } }).catch(() => undefined)
  }

  return { removidos: toDelete.length }
}

/** Apaga o arquivo do disco. Ausente já é o resultado desejado. */
export async function removeBackupFile(fileName: string): Promise<void> {
  try {
    await fs.rm(resolveBackupFilePath(fileName), { force: true })
  } catch (error) {
    console.error('[backup] falha ao remover arquivo:', fileName, error)
  }
}
