import prisma from '@/lib/prisma';
import { canAccess, requirePermission } from '@/lib/permissions/server';
import { ProfessoresClient } from './ProfessoresClient';

export default async function ProfessoresPage() {
  const context = await requirePermission('professores.visualizar');
  const professores = await prisma.teacher.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <ProfessoresClient
      professores={professores}
      canCreate={canAccess(context, 'professores.criar')}
      canEdit={canAccess(context, 'professores.editar')}
      canDelete={canAccess(context, 'professores.excluir')}
    />
  );
}
