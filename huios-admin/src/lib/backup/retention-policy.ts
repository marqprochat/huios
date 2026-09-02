import type { BackupType } from './paths.ts'

export interface RetentionCandidate {
  id: string
  fileName: string
  type: BackupType | string
  status: string
  createdAt: Date
}

/**
 * Decide o que apagar. Só backups AUTO entram na conta: MANUAL foi pedido por
 * alguém e PRE_RESTORE é a rede de segurança de uma restauração — nenhum dos
 * dois some sozinho. SUCCESS e FAILED são contados em listas separadas para que
 * uma sequência de falhas não empurre os backups bons para fora da janela.
 */
export function selectBackupsToDelete(
  candidates: readonly RetentionCandidate[],
  retentionCount: number,
): RetentionCandidate[] {
  const keep = Math.max(1, Math.floor(retentionCount) || 1)
  const maisNovoPrimeiro = (a: RetentionCandidate, b: RetentionCandidate) => (
    b.createdAt.getTime() - a.createdAt.getTime()
  )

  const automaticos = candidates.filter((candidate) => candidate.type === 'AUTO')
  const concluidos = automaticos.filter((c) => c.status === 'SUCCESS').sort(maisNovoPrimeiro)
  const falhos = automaticos.filter((c) => c.status === 'FAILED').sort(maisNovoPrimeiro)

  return [...concluidos.slice(keep), ...falhos.slice(keep)]
}
