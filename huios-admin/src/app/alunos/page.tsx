import Link from 'next/link';
import prisma from '@/lib/prisma';
import { AlunosClient } from './AlunosClient';
import { requirePageAccess } from '@/lib/permissions/page-guard';

export default async function AlunosPage() {
  await requirePageAccess('alunos.visualizar');
  const alunos = await prisma.student.findMany({
    orderBy: { name: 'asc' }
  });

  return <AlunosClient alunos={alunos} />;
}
