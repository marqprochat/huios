import { NextRequest, NextResponse } from 'next/server'

import { requirePermission, requireSuperAdmin } from '@/lib/permissions/server'
import { InvalidBackupError } from '@/lib/backup/manifest'
import { restaurarBackup, type OrigemRestauracao } from '@/lib/backup/restore'

export const dynamic = 'force-dynamic'

const CONFIRMACAO = 'RESTAURAR'
const TAMANHO_MAXIMO = 2 * 1024 * 1024 * 1024 // 2 GB

/**
 * POST — substitui o banco e os arquivos enviados pelo conteúdo de um backup.
 *
 * Aceita `multipart/form-data` com `backupId` (pacote já no servidor) ou
 * `arquivo` (.tar.gz enviado pelo navegador). Exige, além da permissão
 * configuracoes.restaurar, ser super admin e digitar RESTAURAR — é a operação
 * mais destrutiva do sistema.
 */
export async function POST(request: NextRequest) {
  let userId: string
  try {
    await requirePermission('configuracoes.restaurar')
    const context = await requireSuperAdmin()
    userId = context.userId
  } catch {
    return NextResponse.json(
      { error: 'Apenas um super administrador com permissão de restauração pode executar esta ação.' },
      { status: 403 },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  if (String(form.get('confirmacao') || '').trim() !== CONFIRMACAO) {
    return NextResponse.json(
      { error: `Digite ${CONFIRMACAO} para confirmar a restauração.` },
      { status: 400 },
    )
  }

  const backupId = form.get('backupId')
  const arquivo = form.get('arquivo')

  let origem: OrigemRestauracao
  if (typeof backupId === 'string' && backupId.length > 0) {
    origem = { tipo: 'registro', backupId }
  } else if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > TAMANHO_MAXIMO) {
      return NextResponse.json({ error: 'O arquivo enviado é grande demais.' }, { status: 413 })
    }
    origem = {
      tipo: 'upload',
      nomeOriginal: arquivo.name,
      conteudo: Buffer.from(await arquivo.arrayBuffer()),
    }
  } else {
    return NextResponse.json(
      { error: 'Escolha um backup do histórico ou envie um arquivo .tar.gz.' },
      { status: 400 },
    )
  }

  try {
    const resultado = await restaurarBackup({ origem, userId })
    return NextResponse.json({
      ok: true,
      backupDeSeguranca: resultado.backupDeSeguranca,
      uploadsRestaurados: resultado.uploadsRestaurados,
      criadoEm: resultado.manifest.createdAt,
    })
  } catch (error) {
    const codigo = (error as { code?: string })?.code
    const mensagem = error instanceof Error ? error.message : 'Falha ao restaurar o backup.'
    console.error('[backup] falha na restauração:', error)

    if (error instanceof InvalidBackupError) {
      return NextResponse.json({ error: mensagem }, { status: 400 })
    }
    if (codigo === 'RESTAURACAO_EM_ANDAMENTO' || codigo === 'BACKUP_EM_ANDAMENTO') {
      return NextResponse.json({ error: mensagem }, { status: 409 })
    }
    return NextResponse.json(
      {
        error: mensagem,
        backupDeSeguranca: (error as { backupDeSeguranca?: string })?.backupDeSeguranca || null,
      },
      { status: 500 },
    )
  }
}
