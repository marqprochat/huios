import prisma from '@/lib/prisma';
import NovaDisciplinaClient from './NovaDisciplinaClient';

export default async function NovaDisciplinaPage() {
    const turmas = await prisma.courseClass.findMany({
        include: { course: true },
        orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });

    const professores = await prisma.teacher.findMany({
        orderBy: { name: 'asc' }
    });

    const currentYear = new Date().getFullYear();

    return (
        <NovaDisciplinaClient 
            turmas={turmas}
            professores={professores}
            currentYear={currentYear}
        />
    );
}
