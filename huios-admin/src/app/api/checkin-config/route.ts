import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const configPath = path.join(process.cwd(), 'checkin-config.json')

export async function GET() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(configData)
      return NextResponse.json(config)
    }
    return NextResponse.json({ checkInBufferMinutes: 30 })
  } catch (error) {
    console.error('Error reading checkin config:', error)
    return NextResponse.json({ checkInBufferMinutes: 30 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    
    // Validar tipo de dado
    if (typeof body.checkInBufferMinutes !== 'number' && typeof body.checkInBufferMinutes !== 'string') {
        return NextResponse.json({ error: 'Invalid checkInBufferMinutes' }, { status: 400 })
    }

    const value = typeof body.checkInBufferMinutes === 'string' ? parseInt(body.checkInBufferMinutes, 10) : body.checkInBufferMinutes;

    fs.writeFileSync(configPath, JSON.stringify({ checkInBufferMinutes: value }, null, 2))
    return NextResponse.json({ success: true, checkInBufferMinutes: value })
  } catch (error) {
    console.error('Error saving checkin config:', error)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
