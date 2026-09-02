import { NextRequest, NextResponse } from 'next/server'

import { requirePermission } from '@/lib/permissions/server'
import { normalizeBackupSettingsInput, saveBackupSettings } from '@/lib/backup/settings'

export const dynamic = 'force-dynamic'

// PUT — salva agendamento e retenção. É configuração do sistema, então usa a
// mesma permissão das demais abas de Configurações.
export async function PUT(request: NextRequest) {
  try {
    await requirePermission('configuracoes.editar')
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const config = await saveBackupSettings(normalizeBackupSettingsInput(body))
  return NextResponse.json({ ok: true, config })
}
