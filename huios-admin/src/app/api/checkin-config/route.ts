import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULT_BUFFER = 30

/** Garante que exista um registro de SystemSettings e o retorna. */
async function ensureSettings(): Promise<any> {
  let s = await (prisma as any).systemSettings.findFirst()
  if (!s) s = await (prisma as any).systemSettings.create({ data: {} })
  return s
}

export async function GET() {
  try {
    const s = await (prisma as any).systemSettings.findFirst()
    return NextResponse.json({ checkInBufferMinutes: s?.checkInBufferMinutes ?? DEFAULT_BUFFER })
  } catch (error) {
    console.error('Error reading checkin config:', error)
    return NextResponse.json({ checkInBufferMinutes: DEFAULT_BUFFER })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    // Aceita número ou string numérica.
    if (typeof body.checkInBufferMinutes !== 'number' && typeof body.checkInBufferMinutes !== 'string') {
      return NextResponse.json({ error: 'Invalid checkInBufferMinutes' }, { status: 400 })
    }
    const parsed = typeof body.checkInBufferMinutes === 'string'
      ? parseInt(body.checkInBufferMinutes, 10)
      : body.checkInBufferMinutes
    if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json({ error: 'Invalid checkInBufferMinutes' }, { status: 400 })
    }
    const value = Math.round(parsed)

    const s = await ensureSettings()
    await (prisma as any).systemSettings.update({ where: { id: s.id }, data: { checkInBufferMinutes: value } })
    return NextResponse.json({ success: true, checkInBufferMinutes: value })
  } catch (error) {
    console.error('Error saving checkin config:', error)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
