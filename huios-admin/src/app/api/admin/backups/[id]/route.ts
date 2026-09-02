import { NextRequest, NextResponse } from 'next/server'

import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions/server'
import { removeBackupFile } from '@/lib/backup/retention'

export const dynamic = 'force-dynamic'

// DELETE — remove o pacote do disco e o registro do histórico.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('configuracoes.backup')
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { id } = await params
  const record = await prisma.backupRecord.findUnique({ where: { id } })
  if (!record) return NextResponse.json({ error: 'Backup não encontrado.' }, { status: 404 })

  await removeBackupFile(record.fileName)
  await prisma.backupRecord.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
