import Link from 'next/link';
import prisma from '@/lib/prisma';
import { ProfessoresClient } from './ProfessoresClient';

export default async function ProfessoresPage() {
  const professores = await prisma.teacher.findMany({
    orderBy: { name: 'asc' }
  });

  return <ProfessoresClient professores={professores} />;
}
