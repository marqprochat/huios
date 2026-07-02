// Sistema de cupons: isenção da taxa de matrícula e/ou desconto nas mensalidades.
// Helpers reutilizáveis chamados por server actions e route handlers (não é 'use server').

import prisma from './prisma';

export type DiscountType = 'PERCENT' | 'FIXED';

/** Efeito aplicável de um cupom já validado. */
export interface CouponEffect {
  couponId: string;
  code: string;
  waiveEnrollmentFee: boolean;
  discountType: DiscountType | null;
  discountValue: number | null;
  /** nº de mensalidades com desconto; null/0 = todas. */
  discountMonths: number | null;
}

export type ValidateResult =
  | { ok: true; effect: CouponEffect; coupon: any }
  | { ok: false; error: string };

/** Normaliza o código: remove espaços das pontas e força maiúsculas. */
export function normalizeCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

function toEffect(c: any): CouponEffect {
  return {
    couponId: c.id,
    code: c.code,
    waiveEnrollmentFee: !!c.waiveEnrollmentFee,
    discountType: (c.discountType as DiscountType) ?? null,
    discountValue: typeof c.discountValue === 'number' ? c.discountValue : null,
    discountMonths: typeof c.discountMonths === 'number' ? c.discountMonths : null,
  };
}

/** Texto humano descrevendo o que o cupom faz (usado no admin e nos previews). */
export function describeCoupon(c: {
  waiveEnrollmentFee?: boolean | null;
  discountType?: string | null;
  discountValue?: number | null;
  discountMonths?: number | null;
}): string {
  const parts: string[] = [];
  if (c.waiveEnrollmentFee) parts.push('Isenta a taxa de matrícula');
  if (c.discountType && c.discountValue) {
    const val =
      c.discountType === 'PERCENT'
        ? `${c.discountValue}%`
        : c.discountValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const janela =
      c.discountMonths && c.discountMonths > 0
        ? ` nas ${c.discountMonths} primeiras mensalidades`
        : ' em todas as mensalidades';
    parts.push(`${val} de desconto${janela}`);
  }
  return parts.length ? parts.join(' + ') : 'Sem efeito configurado';
}

/**
 * Valida um cupom para um contexto (turma/curso/aluno) e retorna seu efeito.
 * `studentId` só é conhecido no portal/admin; na matrícula pública a checagem
 * de "1 uso por aluno" é refeita na hora de aplicar (dentro de matricularGrupo).
 */
export async function validateCoupon(
  rawCode: string,
  ctx: { classId?: string | null; courseId?: string | null; studentId?: string | null }
): Promise<ValidateResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: 'Informe o código do cupom.' };

  const coupon = await (prisma as any).coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) return { ok: false, error: 'Cupom inválido.' };

  const now = new Date();
  if (coupon.validFrom && now < new Date(coupon.validFrom))
    return { ok: false, error: 'Este cupom ainda não está válido.' };
  if (coupon.validUntil && now > new Date(coupon.validUntil))
    return { ok: false, error: 'Este cupom está expirado.' };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)
    return { ok: false, error: 'Este cupom já atingiu o limite de usos.' };

  // Restrição por turma / curso.
  let courseId = ctx.courseId ?? null;
  if (ctx.classId && (!courseId || (coupon.classIds?.length ?? 0) > 0)) {
    const cc = await prisma.courseClass.findUnique({
      where: { id: ctx.classId },
      select: { courseId: true },
    });
    if (cc) courseId = cc.courseId;
  }
  if (coupon.classIds?.length && ctx.classId && !coupon.classIds.includes(ctx.classId))
    return { ok: false, error: 'Cupom não válido para esta turma.' };
  if (coupon.courseIds?.length && courseId && !coupon.courseIds.includes(courseId))
    return { ok: false, error: 'Cupom não válido para este curso.' };

  // 1 uso por aluno (quando já sabemos quem é).
  if (coupon.onePerStudent && ctx.studentId) {
    const prev = await (prisma as any).couponRedemption.findFirst({
      where: { couponId: coupon.id, studentId: ctx.studentId },
    });
    if (prev) return { ok: false, error: 'Você já utilizou este cupom.' };
  }

  return { ok: true, effect: toEffect(coupon), coupon };
}

/**
 * Valor da mensalidade nº `monthIndex` (0-based) após o desconto do cupom.
 * Não altera parcelas fora da janela de `discountMonths`.
 */
export function discountedMonthly(
  effect: CouponEffect | null | undefined,
  amount: number,
  monthIndex: number
): number {
  if (!effect || !effect.discountType || !effect.discountValue) return amount;
  const months = effect.discountMonths ?? 0;
  const applies = !months || months <= 0 || monthIndex < months;
  if (!applies) return amount;

  let v = amount;
  if (effect.discountType === 'PERCENT') v = amount * (1 - effect.discountValue / 100);
  else v = amount - effect.discountValue;

  return Math.max(0, Math.round(v * 100) / 100);
}

/** Registra o resgate de um cupom e incrementa o contador de usos. */
export async function redeemCoupon(
  effect: CouponEffect,
  opts: { studentId: string; enrollmentId: string }
): Promise<void> {
  await (prisma as any).couponRedemption.create({
    data: {
      couponId: effect.couponId,
      code: effect.code,
      studentId: opts.studentId,
      enrollmentId: opts.enrollmentId,
    },
  });
  await (prisma as any).coupon.update({
    where: { id: effect.couponId },
    data: { usedCount: { increment: 1 } },
  });
}
