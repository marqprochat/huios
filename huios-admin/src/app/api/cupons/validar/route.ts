import { NextResponse } from 'next/server';
import { validateCoupon, describeCoupon, discountedMonthly } from '@/lib/coupons';

export const dynamic = 'force-dynamic';

/**
 * Preview de cupom (público). Body: { code, classId? }.
 * Não resgata nem incrementa uso — apenas valida e descreve o efeito para a UI.
 */
export async function POST(request: Request) {
  try {
    const { code, classId, monthlyAmount } = (await request.json()) as {
      code?: string;
      classId?: string | null;
      monthlyAmount?: number | null;
    };
    if (!code?.trim()) return NextResponse.json({ valid: false, error: 'Informe o código do cupom.' }, { status: 400 });

    const result = await validateCoupon(code, { classId: classId ?? null });
    if (!result.ok) return NextResponse.json({ valid: false, error: result.error });

    const effect = result.effect;
    const preview =
      typeof monthlyAmount === 'number' && monthlyAmount > 0
        ? discountedMonthly(effect, monthlyAmount, 0)
        : null;

    return NextResponse.json({
      valid: true,
      code: effect.code,
      description: describeCoupon(result.coupon),
      waiveEnrollmentFee: effect.waiveEnrollmentFee,
      discountType: effect.discountType,
      discountValue: effect.discountValue,
      discountMonths: effect.discountMonths,
      previewMonthlyAmount: preview,
    });
  } catch (error: any) {
    return NextResponse.json({ valid: false, error: error.message || 'Erro ao validar cupom.' }, { status: 400 });
  }
}
