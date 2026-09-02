import { NextResponse } from 'next/server'

import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions/server'
import { backupEstaRodando, criarBackup } from '@/lib/backup/dump'
import { aplicarRetencao } from '@/lib/backup/retention'
import { getBackupSettings } from '@/lib/backup/settings'

export const dynamic = 'force-dynamic'

interface BackupRow {
  id: string
  fileName: string
  sizeBytes: bigint | null
  type: string
  status: string
  errorMessage: string | null
  createdAt: Date
  finishedAt: Date | null
  createdBy: { name: string } | null
}

/** BigInt não sobrevive ao JSON.stringify — o tamanho vai como número. */
function serialize(record: BackupRow) {
  return {
    id: record.id,
    fileName: record.fileName,
    sizeBytes: record.sizeBytes === null ? null : Number(record.sizeBytes),
    type: record.type,
    status: record.status,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    finishedAt: record.finishedAt,
    createdByName: record.createdBy?.name || null,
  }
}

async function denied(permission: 'configuracoes.backup'): Promise<NextResponse | null> {
  try {
    await requirePermission(permission)
    return null
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
}

// GET — histórico de backups + configuração atual.
export async function GET() {
  const negado = await denied('configuracoes.backup')
  if (negado) return negado

  const [registros, settings] = await Promise.all([
    prisma.backupRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { createdBy: { select: { name: true } } },
    }),
    getBackupSettings(),
  ])

  return NextResponse.json({
    backups: (registros as BackupRow[]).map(serialize),
    config: settings,
    emAndamento: backupEstaRodando(),
  })
}

// POST — gera um backup manual agora.
export async function POST() {
  let context
  try {
    context = await requirePermission('configuracoes.backup')
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const resultado = await criarBackup({ tipo: 'MANUAL', userId: context.userId })
    await aplicarRetencao()
    return NextResponse.json({
      ok: true,
      backup: { ...resultado, sizeBytes: Number(resultado.sizeBytes) },
    })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Falha ao gerar o backup.'
    const status = (error as { code?: string })?.code === 'BACKUP_EM_ANDAMENTO' ? 409 : 500
    console.error('[backup] falha no backup manual:', error)
    return NextResponse.json({ error: mensagem }, { status })
  }
}
