import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const settings = await prisma.systemSettings.findFirst();
        return NextResponse.json(settings || {});
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const data = await req.json();
        const { locationName, latitude, longitude, radiusMeters } = data;

        let settings = await prisma.systemSettings.findFirst();

        if (settings) {
            settings = await prisma.systemSettings.update({
                where: { id: settings.id },
                data: {
                    locationName,
                    latitude,
                    longitude,
                    radiusMeters
                }
            });
        } else {
            settings = await prisma.systemSettings.create({
                data: {
                    locationName,
                    latitude,
                    longitude,
                    radiusMeters
                }
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Settings PUT error:', error);
        return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
    }
}
