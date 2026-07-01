// Motor de preços de mensalidade (matrícula de turmas)
// Regra: "menor preço aplicável vence" — entre os níveis cuja condição é
// satisfeita E que estão configurados, escolhe-se o de menor valor (mais
// benéfico ao aluno). NON_MEMBER é o fallback padrão. Ver §6 do plano.

export type PriceTier = 'MEMBER' | 'NON_MEMBER' | 'FAMILY' | 'PARTNER';

export const TIER_LABELS: Record<PriceTier, string> = {
  MEMBER: 'Membro da sede',
  NON_MEMBER: 'Não-membro',
  FAMILY: 'Família (2+)',
  PARTNER: 'Igreja parceira (3+)',
};

export interface CoursePriceTiers {
  amount: number; // base / fallback
  enrollmentFee?: number | null;
  enrollmentFeeDueDate?: Date | string | null;
  amountMember?: number | null;
  amountNonMember?: number | null;
  amountFamily?: number | null;
  amountPartner?: number | null;
}

export interface PricingContext {
  coursePrice: CoursePriceTiers | null | undefined;
  /** type da igreja vinculada (ex.: 'SEDE', 'PARCEIRA', 'EXTERNA') */
  churchType?: string | null;
  isPartnerChurch?: boolean;
  /** nº de pessoas da mesma família nesta matrícula em lote */
  familyCount?: number;
  /** nº de pessoas da mesma igreja parceira nesta turma/lote */
  partnerGroupCount?: number;
}

export interface ResolvedPrice {
  tier: PriceTier;
  amount: number;
}

function valueOrNull(v: number | null | undefined): number | null {
  return typeof v === 'number' && v > 0 ? v : null;
}

/**
 * Resolve a mensalidade aplicável e o nível (tier) correspondente.
 * Retorna sempre um valor (cai no NON_MEMBER / amount base como último recurso).
 */
export function resolveMonthlyPrice(ctx: PricingContext): ResolvedPrice {
  const cp = ctx.coursePrice;
  const base = cp?.amount ?? 0;

  // Candidatos: [tier, valor] apenas para condições satisfeitas + configuradas.
  const candidates: ResolvedPrice[] = [];

  // NON_MEMBER é sempre candidato (fallback padrão).
  const nonMember = valueOrNull(cp?.amountNonMember) ?? base;
  candidates.push({ tier: 'NON_MEMBER', amount: nonMember });

  if (ctx.churchType === 'SEDE') {
    const m = valueOrNull(cp?.amountMember);
    if (m !== null) candidates.push({ tier: 'MEMBER', amount: m });
  }

  if ((ctx.familyCount ?? 0) >= 2) {
    const f = valueOrNull(cp?.amountFamily);
    if (f !== null) candidates.push({ tier: 'FAMILY', amount: f });
  }

  if (ctx.isPartnerChurch && (ctx.partnerGroupCount ?? 0) >= 3) {
    const p = valueOrNull(cp?.amountPartner);
    if (p !== null) candidates.push({ tier: 'PARTNER', amount: p });
  }

  // Menor valor aplicável vence.
  return candidates.reduce((best, c) => (c.amount < best.amount ? c : best));
}
