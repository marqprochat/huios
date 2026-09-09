'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions/server';

export async function deleteEvent(id: string) {
  await requirePermission('aulas.excluir');
  try {
    await prisma.event.delete({ where: { id } });
    revalidatePath('/aulas');
    return { success: true };
  } catch (error) {
    console.error('Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
}
