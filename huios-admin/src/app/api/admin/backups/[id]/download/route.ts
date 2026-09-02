import fs from 'node:fs/promises'

import { NextRequest, NextResponse } from 'next/server'

import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions/server'
import { UnsafeBackupFileNameError, resolveBackupFilePath } from '@/lib/backup/paths'

export const dynamic = 'force-dynamic'

// GET — baixa o pacote. O caminho é derivado do fileName gravado no banco e
// passa por resolveBackupFilePath; o usuário só escolhe o id do registro.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('configuracoes.backup')
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { id } = await params
  const record = await prisma.backupRecord.findUnique({ where: { id } })
  if (!record || record.status !== 'SUCCESS') {
    return NextResponse.json({ error: 'Backup não encontrado.' }, { status: 404 })
  }

  let conteudo: Buffer
  try {
    conteudo = await fs.readFile(resolveBackupFilePath(record.fileName))
  } catch (error) {
    if (error instanceof UnsafeBackupFileNameError) {
      console.error('[backup] nome de arquivo recusado no download:', record.fileName)
      return NextResponse.json({ error: 'Arquivo de backup inválido.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'O arquivo deste backup não está mais no servidor.' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(conteudo), {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Length': String(conteudo.byteLength),
      'Content-Disposition': `attachment; filename="${record.fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
