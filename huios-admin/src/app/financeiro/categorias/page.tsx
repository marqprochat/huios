import prisma from '@/lib/prisma';
import { CategoriasClient } from './CategoriasClient';

export default async function CategoriasPage() {
  const categories = await (prisma as any).financialCategory.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  return <CategoriasClient categories={categories} />;
}
