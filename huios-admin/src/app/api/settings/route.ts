import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions/server'

export async function GET() {
    try {
        await requirePermission('configuracoes.visualizar');
        const settings = await prisma.systemSettings.findFirst();
        return NextResponse.json(settings || {});
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        await requirePermission('configuracoes.editar');

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
