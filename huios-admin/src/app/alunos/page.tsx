import Link from 'next/link';
import prisma from '@/lib/prisma';
import { AlunosClient } from './AlunosClient';

export default async function AlunosPage() {
  const alunos = await prisma.student.findMany({
    orderBy: { name: 'asc' }
  });

  return <AlunosClient alunos={alunos} />;
}
