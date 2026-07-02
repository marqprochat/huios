'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { normalizeCode } from '@/lib/coupons';

function parseForm(formData: FormData) {
  const code = normalizeCode(formData.get('code') as string);
  const description = (formData.get('description') as string)?.trim() || null;
  const isActive = formData.get('isActive') !== 'false';
  const waiveEnrollmentFee = formData.get('waiveEnrollmentFee') === 'true';

  const discountTypeRaw = (formData.get('discountType') as string) || '';
  const discountType = discountTypeRaw === 'PERCENT' || discountTypeRaw === 'FIXED' ? discountTypeRaw : null;

  const num = (key: string): number | null => {
    const raw = formData.get(key) as string;
    if (raw == null || raw === '') return null;
    const v = parseFloat(raw);
    return isNaN(v) ? null : v;
  };
  const int = (key: string): number | null => {
    const raw = formData.get(key) as string;
    if (raw == null || raw === '') return null;
    const v = parseInt(raw, 10);
    return isNaN(v) ? null : v;
  };
  const date = (key: string): Date | null => {
    const raw = formData.get(key) as string;
    return raw ? new Date(`${raw}T12:00:00`) : null;
  };

  const discountValue = discountType ? num('discountValue') : null;

  return {
    code,
    description,
    isActive,
    waiveEnrollmentFee,
    discountType,
    discountValue,
    discountMonths: discountType ? int('discountMonths') : null,
    validFrom: date('validFrom'),
    validUntil: date('validUntil'),
    maxUses: int('maxUses'),
    onePerStudent: formData.get('onePerStudent') === 'true',
    courseIds: formData.getAll('courseIds').map(String).filter(Boolean),
    classIds: formData.getAll('classIds').map(String).filter(Boolean),
  };
}

function validate(data: ReturnType<typeof parseForm>): string | null {
  if (!data.code) return 'Informe o código do cupom.';
  if (!/^[A-Z0-9._-]+$/.test(data.code)) return 'O código deve conter apenas letras, números, ponto, hífen ou underline.';
  if (!data.waiveEnrollmentFee && !data.discountType) {
    return 'Configure ao menos um efeito: isentar a taxa ou aplicar desconto.';
  }
  if (data.discountType && (data.discountValue == null || data.discountValue <= 0)) {
    return 'Informe um valor de desconto maior que zero.';
  }
  if (data.discountType === 'PERCENT' && data.discountValue != null && data.discountValue > 100) {
    return 'O desconto percentual não pode ser maior que 100%.';
  }
  if (data.validFrom && data.validUntil && data.validFrom > data.validUntil) {
    return 'A data de início não pode ser posterior à data de término.';
  }
  return null;
}

export async function createCoupon(prevState: any, formData: FormData) {
  const data = parseForm(formData);
  const err = validate(data);
  if (err) return { success: false, message: err };

  try {
    await (prisma as any).coupon.create({ data });
    revalidatePath('/cupons');
    return { success: true, message: 'Cupom criado com sucesso!' };
  } catch (error: any) {
    if (error.code === 'P2002') return { success: false, message: 'Já existe um cupom com este código.' };
    return { success: false, message: 'Erro ao criar cupom: ' + error.message };
  }
}

export async function updateCoupon(id: string, prevState: any, formData: FormData) {
  const data = parseForm(formData);
  const err = validate(data);
  if (err) return { success: false, message: err };

  try {
    await (prisma as any).coupon.update({ where: { id }, data });
    revalidatePath('/cupons');
    return { success: true, message: 'Cupom atualizado!' };
  } catch (error: any) {
    if (error.code === 'P2002') return { success: false, message: 'Já existe um cupom com este código.' };
    return { success: false, message: 'Erro ao atualizar: ' + error.message };
  }
}

export async function toggleCoupon(id: string, isActive: boolean) {
  await (prisma as any).coupon.update({ where: { id }, data: { isActive } });
  revalidatePath('/cupons');
}

export async function deleteCoupon(id: string) {
  // Se já foi usado, apenas desativa (preserva o histórico de resgates).
  const used = await (prisma as any).couponRedemption.count({ where: { couponId: id } });
  if (used > 0) {
    await (prisma as any).coupon.update({ where: { id }, data: { isActive: false } });
  } else {
    await (prisma as any).coupon.delete({ where: { id } });
  }
  revalidatePath('/cupons');
}
