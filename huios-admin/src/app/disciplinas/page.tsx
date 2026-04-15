import prisma from '@/lib/prisma';
import DisciplinasClient from './DisciplinasClient';

export default async function DisciplinasPage() {
    const disciplinas = await prisma.discipline.findMany({
        include: { 
            courseClasses: { include: { course: true } }, 
            teacher: true 
        },
        orderBy: { name: 'asc' }
    });

    // Get distinct years for the filter
    const yearsSet = new Set<number>();
    disciplinas.forEach(d => {
        if (d.year) yearsSet.add(d.year);
    });
    const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

    return (
        <DisciplinasClient
            disciplinas={disciplinas as any}
            availableYears={availableYears}
        />
    );
}
