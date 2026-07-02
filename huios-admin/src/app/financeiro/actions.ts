'use server'

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { gerarMensalidades } from '@/lib/enrollment';
import { resolveMonthlyPrice } from '@/lib/pricing';
import { validateCoupon, redeemCoupon, type CouponEffect } from '@/lib/coupons';

// ─── Categories ─────────────────────────────────────────────────────────────

export async function createCategory(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const type = formData.get('type') as string | null;
  const color = formData.get('color') as string;

  if (!name) return { success: false, message: 'Nome é obrigatório' };

  try {
    await (prisma as any).financialCategory.create({
      data: {
        name,
        type: (type === 'RECEITA' || type === 'DESPESA') ? type : null,
        color: color || null,
      }
    });
    revalidatePath('/financeiro/categorias');
    return { success: true, message: 'Categoria criada com sucesso!' };
  } catch (error: any) {
    if (error.code === 'P2002') return { success: false, message: 'Já existe uma categoria com este nome.' };
    return { success: false, message: 'Erro ao criar categoria: ' + error.message };
  }
}

export async function updateCategory(id: string, prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const type = formData.get('type') as string | null;
  const color = formData.get('color') as string;
  const isActive = formData.get('isActive') === 'true';

  if (!name) return { success: false, message: 'Nome é obrigatório' };

  try {
    await (prisma as any).financialCategory.update({
      where: { id },
      data: {
        name,
        type: (type === 'RECEITA' || type === 'DESPESA') ? type : null,
        color: color || null,
        isActive,
      }
    });
    revalidatePath('/financeiro/categorias');
    return { success: true, message: 'Categoria atualizada!' };
  } catch (error: any) {
    if (error.code === 'P2002') return { success: false, message: 'Já existe uma categoria com este nome.' };
    return { success: false, message: 'Erro ao atualizar: ' + error.message };
  }
}

export async function deleteCategory(id: string) {
  const count = await (prisma as any).financialTransaction.count({ where: { categoryId: id } });
  if (count > 0) {
    await (prisma as any).financialCategory.update({ where: { id }, data: { isActive: false } });
  } else {
    await (prisma as any).financialCategory.delete({ where: { id } });
  }
  revalidatePath('/financeiro/categorias');
}

// ─── Course Prices ───────────────────────────────────────────────────────────

export async function upsertCoursePrice(courseId: string, prevState: any, formData: FormData) {
  const description = formData.get('description') as string;
  const isActive = formData.get('isActive') !== 'false';

  const num = (key: string): number | null => {
    const raw = formData.get(key) as string;
    if (raw == null || raw === '') return null;
    const v = parseFloat(raw);
    return isNaN(v) ? null : v;
  };

  const amount = num('amount') ?? 0;

  const enrollmentFeeDueDateRaw = formData.get('enrollmentFeeDueDate') as string;
  const enrollmentFeeDueDate =
    enrollmentFeeDueDateRaw && enrollmentFeeDueDateRaw !== ''
      ? new Date(`${enrollmentFeeDueDateRaw}T12:00:00`)
      : null;

  try {
    const data = {
      amount,
      description: description || null,
      isActive,
      enrollmentFee: num('enrollmentFee'),
      enrollmentFeeDueDate,
      amountMember: num('amountMember'),
      amountNonMember: num('amountNonMember'),
      amountFamily: num('amountFamily'),
      amountPartner: num('amountPartner'),
    };
    await (prisma as any).coursePrice.upsert({
      where: { courseId },
      create: { courseId, ...data },
      update: data,
    });
    revalidatePath('/financeiro/precos-cursos');
    return { success: true, message: 'Preço salvo com sucesso!' };
  } catch (error: any) {
    return { success: false, message: 'Erro ao salvar preço: ' + error.message };
  }
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function createTransaction(prevState: any, formData: FormData) {
  const type = formData.get('type') as string;
  const categoryId = formData.get('categoryId') as string;
  const description = formData.get('description') as string;
  const amountRaw = formData.get('amount') as string;
  const dueDate = formData.get('dueDate') as string;
  const status = formData.get('status') as string;
  const paymentMethod = formData.get('paymentMethod') as string;
  const paidAt = formData.get('paidAt') as string;
  const notes = formData.get('notes') as string;
  const studentId = formData.get('studentId') as string;
  const enrollmentId = formData.get('enrollmentId') as string;
  const teacherId = formData.get('teacherId') as string;

  if (!description || !amountRaw || !dueDate || !type) {
    return { success: false, message: 'Descrição, valor, tipo e vencimento são obrigatórios' };
  }

  const amount = parseFloat(amountRaw);
  if (isNaN(amount) || amount < 0) return { success: false, message: 'Valor inválido' };

  try {
    await (prisma as any).financialTransaction.create({
      data: {
        type,
        status: status || 'PENDENTE',
        amount,
        description,
        dueDate: new Date(dueDate),
        paidAt: paidAt ? new Date(paidAt) : null,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        categoryId: categoryId || null,
        studentId: studentId || null,
        enrollmentId: enrollmentId || null,
        teacherId: teacherId || null,
      }
    });
    revalidatePath('/financeiro/contas-a-receber');
    revalidatePath('/financeiro/contas-a-pagar');
    revalidatePath('/financeiro');
    return { success: true, message: 'Lançamento criado com sucesso!' };
  } catch (error: any) {
    return { success: false, message: 'Erro ao criar lançamento: ' + error.message };
  }
}

export async function updateTransaction(id: string, prevState: any, formData: FormData) {
  const categoryId = formData.get('categoryId') as string;
  const description = formData.get('description') as string;
  const amountRaw = formData.get('amount') as string;
  const dueDate = formData.get('dueDate') as string;
  const status = formData.get('status') as string;
  const paymentMethod = formData.get('paymentMethod') as string;
  const paidAt = formData.get('paidAt') as string;
  const notes = formData.get('notes') as string;
  const studentId = formData.get('studentId') as string;
  const enrollmentId = formData.get('enrollmentId') as string;
  const teacherId = formData.get('teacherId') as string;

  if (!description || !amountRaw || !dueDate) {
    return { success: false, message: 'Descrição, valor e vencimento são obrigatórios' };
  }

  const amount = parseFloat(amountRaw);
  if (isNaN(amount) || amount < 0) return { success: false, message: 'Valor inválido' };

  try {
    await (prisma as any).financialTransaction.update({
      where: { id },
      data: {
        status: status || 'PENDENTE',
        amount,
        description,
        dueDate: new Date(dueDate),
        paidAt: paidAt ? new Date(paidAt) : null,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        categoryId: categoryId || null,
        studentId: studentId || null,
        enrollmentId: enrollmentId || null,
        teacherId: teacherId || null,
      }
    });
    revalidatePath('/financeiro/contas-a-receber');
    revalidatePath('/financeiro/contas-a-pagar');
    revalidatePath('/financeiro');
    return { success: true, message: 'Lançamento atualizado!' };
  } catch (error: any) {
    return { success: false, message: 'Erro ao atualizar: ' + error.message };
  }
}

export async function markAsPaid(id: string, paymentMethod?: string) {
  try {
    await (prisma as any).financialTransaction.update({
      where: { id },
      data: {
        status: 'PAGO',
        paidAt: new Date(),
        paymentMethod: paymentMethod || 'OUTRO',
      }
    });
    revalidatePath('/financeiro/contas-a-receber');
    revalidatePath('/financeiro/contas-a-pagar');
    revalidatePath('/financeiro');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteTransaction(id: string) {
  await (prisma as any).financialTransaction.delete({ where: { id } });
  revalidatePath('/financeiro/contas-a-receber');
  revalidatePath('/financeiro/contas-a-pagar');
  revalidatePath('/financeiro');
}

// ─── Auto-charge helper (called from alunos/actions.ts) ──────────────────────

export async function createEnrollmentCharge(studentId: string, enrollmentId: string, classId: string, couponCode?: string | null) {
  try {
    const courseClass = await prisma.courseClass.findUnique({
      where: { id: classId },
      include: { course: { include: { coursePrice: true } } }
    });

    const cc = courseClass as any;
    const price = cc?.course?.coursePrice;
    if (!price || !price.isActive) return;

    // Sem contexto de igreja/família aqui → cai no nível padrão (não-membro/base).
    const { amount } = resolveMonthlyPrice({ coursePrice: price });
    if (amount <= 0) return;

    // Cupom (opcional): valida e aplica isenção de taxa / desconto.
    let couponEffect: CouponEffect | null = null;
    if (couponCode) {
      const v = await validateCoupon(couponCode, { classId, studentId });
      if (v.ok) couponEffect = v.effect;
    }

    await gerarMensalidades({
      studentId,
      enrollmentId,
      monthlyAmount: amount,
      installments: cc?.installments ?? 1,
      courseName: cc?.course?.name ?? 'Curso',
      enrollmentFee: price.enrollmentFee ?? null,
      startDate: cc?.startDate ?? undefined,
      coupon: couponEffect,
    });

    if (couponEffect) await redeemCoupon(couponEffect, { studentId, enrollmentId });
  } catch (error) {
    console.error('Erro ao gerar cobrança automática:', error);
  }
}
