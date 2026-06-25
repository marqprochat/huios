'use server'

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

async function requireCoordinator() {
  const session = await getSession();
  if (!session || (session.role !== 'COORDENADOR' && session.role !== 'SUPER_ADMIN')) {
    throw new Error('Não autorizado');
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

export async function createChurch(prevState: any, formData: FormData) {
  await requireCoordinator();
  const name = (formData.get('name') as string)?.trim();
  const type = formData.get('type') as string;
  if (!name) return { success: false, message: 'Nome é obrigatório' };

  const isPartner = type === 'PARCEIRA';
  // Link exclusivo apenas para parceiras.
  const publicSlug = isPartner ? `${slugify(name)}-${randomUUID().slice(0, 8)}` : null;

  try {
    await (prisma as any).church.create({
      data: { name, type: type || 'EXTERNA', isPartner, publicSlug },
    });
    revalidatePath('/igrejas');
    return { success: true, message: 'Igreja cadastrada com sucesso!' };
  } catch (error: any) {
    return { success: false, message: 'Erro ao cadastrar: ' + error.message };
  }
}

export async function updateChurch(id: string, prevState: any, formData: FormData) {
  await requireCoordinator();
  const name = (formData.get('name') as string)?.trim();
  const type = formData.get('type') as string;
  const isActive = formData.get('isActive') === 'true';
  if (!name) return { success: false, message: 'Nome é obrigatório' };

  const isPartner = type === 'PARCEIRA';

  try {
    const current = await (prisma as any).church.findUnique({ where: { id } });
    // Gera slug se virou parceira e ainda não tem; mantém o existente.
    let publicSlug = current?.publicSlug ?? null;
    if (isPartner && !publicSlug) publicSlug = `${slugify(name)}-${randomUUID().slice(0, 8)}`;
    if (!isPartner) publicSlug = null;

    await (prisma as any).church.update({
      where: { id },
      data: { name, type: type || 'EXTERNA', isPartner, isActive, publicSlug },
    });
    revalidatePath('/igrejas');
    return { success: true, message: 'Igreja atualizada!' };
  } catch (error: any) {
    return { success: false, message: 'Erro ao atualizar: ' + error.message };
  }
}

export async function regenerateChurchLink(id: string) {
  await requireCoordinator();
  try {
    const church = await (prisma as any).church.findUnique({ where: { id } });
    if (!church?.isPartner) return { success: false, message: 'Apenas igrejas parceiras têm link.' };
    const publicSlug = `${slugify(church.name)}-${randomUUID().slice(0, 8)}`;
    await (prisma as any).church.update({ where: { id }, data: { publicSlug } });
    revalidatePath('/igrejas');
    return { success: true, message: 'Novo link gerado!' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteChurch(id: string) {
  await requireCoordinator();
  try {
    const count = await prisma.enrollment.count({ where: { churchId: id } as any });
    if (count > 0) {
      // Soft-delete se houver matrículas vinculadas.
      await (prisma as any).church.update({ where: { id }, data: { isActive: false } });
    } else {
      await (prisma as any).church.delete({ where: { id } });
    }
    revalidatePath('/igrejas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
