import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const disciplinas = await prisma.discipline.findMany({
      include: {
        courseClass: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(disciplinas);
  } catch (error) {
    console.error('Error fetching disciplines:', error);
    return NextResponse.json({ error: 'Failed to fetch disciplines' }, { status: 500 });
  }
}
