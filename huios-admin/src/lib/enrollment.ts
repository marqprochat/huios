// Lógica compartilhada de matrícula (admin manual + link público).
// Não é um arquivo 'use server': são helpers reutilizáveis chamados por
// server actions e route handlers.

import prisma from './prisma';
import { hashPassword } from './auth';
import { resolveMonthlyPrice, PriceTier, CoursePriceTiers } from './pricing';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function findCategoryId(name: string): Promise<string | null> {
  const cat = await (prisma as any).financialCategory.findFirst({
    where: { name, isActive: true },
  });
  return cat?.id ?? null;
}

/**
 * Gera `installments` mensalidades PENDENTES (uma por mês) para uma matrícula,
 * e, opcionalmente, uma cobrança de taxa de matrícula.
 * Retorna os ids das transações criadas (primeira = mais próxima do vencimento).
 */
export async function gerarMensalidades(opts: {
  studentId: string;
  enrollmentId: string;
  monthlyAmount: number;
  installments: number;
  courseName: string;
  enrollmentFee?: number | null;
  startDate?: Date;
}): Promise<string[]> {
  const { studentId, enrollmentId, monthlyAmount, courseName } = opts;
  const installments = Math.max(1, opts.installments || 1);
  const base = opts.startDate ? new Date(opts.startDate) : new Date();
  const ids: string[] = [];

  const mensalidadeCat = await findCategoryId('Mensalidade');

  // Taxa de matrícula (opcional) — vence em 7 dias.
  if (opts.enrollmentFee && opts.enrollmentFee > 0) {
    const matriculaCat = (await findCategoryId('Matrícula')) ?? mensalidadeCat;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const fee = await (prisma as any).financialTransaction.create({
      data: {
        type: 'RECEITA',
        status: 'PENDENTE',
        amount: opts.enrollmentFee,
        description: `Taxa de matrícula — ${courseName}`,
        dueDate,
        categoryId: matriculaCat,
        studentId,
        enrollmentId,
      },
    });
    ids.push(fee.id);
  }

  if (monthlyAmount > 0) {
    for (let i = 0; i < installments; i++) {
      const dueDate = addMonths(base, i + 1);
      const t = await (prisma as any).financialTransaction.create({
        data: {
          type: 'RECEITA',
          status: 'PENDENTE',
          amount: monthlyAmount,
          description: `Mensalidade ${i + 1}/${installments} — ${courseName}`,
          dueDate,
          categoryId: mensalidadeCat,
          studentId,
          enrollmentId,
        },
      });
      ids.push(t.id);
    }
  }

  return ids;
}

/** Garante Student + User(ALUNO). Reaproveita registros existentes por email. */
export async function ensureStudentAndUser(person: {
  name: string;
  email: string;
  phone?: string | null;
  cpf?: string | null;
  familyId?: string | null;
  churchId?: string | null;
  churchName?: string | null;
}): Promise<{ studentId: string }> {
  const email = person.email.trim().toLowerCase();

  // Reaproveita aluno existente pelo email.
  const existing = await prisma.student.findUnique({ where: { email } });
  if (existing) {
    await prisma.student.update({
      where: { id: existing.id },
      data: {
        ...(person.familyId ? { familyId: person.familyId } : {}),
        ...(person.churchId ? { churchId: person.churchId } : {}),
        ...(person.churchName ? { churchName: person.churchName } : {}),
      } as any,
    });
    return { studentId: existing.id };
  }

  const student = await prisma.student.create({
    data: {
      name: person.name,
      email,
      phone: person.phone || null,
      cpf: person.cpf || null,
      churchName: person.churchName || null,
      familyId: person.familyId || null,
      churchId: person.churchId || null,
    } as any,
  });

  // Cria login (senha = CPF só números, ou 'huios123').
  try {
    const rawPassword = person.cpf ? person.cpf.replace(/\D/g, '') || 'huios123' : 'huios123';
    const hashedPw = await hashPassword(rawPassword);
    const existingUser = await prisma.user.findUnique({ where: { email } });
    const userId = existingUser
      ? existingUser.id
      : (
          await prisma.user.create({
            data: { name: person.name, email, password: hashedPw, role: 'ALUNO', active: true },
          })
        ).id;
    await prisma.student.update({ where: { id: student.id }, data: { userId } });
  } catch (e: any) {
    console.warn('Não foi possível criar login do aluno:', e?.message);
  }

  return { studentId: student.id };
}

export interface PersonInput {
  name: string;
  email: string;
  phone?: string | null;
  cpf?: string | null;
  isMemberOfSede?: boolean; // declarado na matrícula genérica
}

export interface MatricularGrupoInput {
  classId: string;
  origin: 'ADMIN' | 'PUBLIC_LINK';
  churchId?: string | null; // igreja vinculada (link parceira / seleção)
  people: PersonInput[];
  family?: { name: string; responsibleName?: string; responsiblePhone?: string } | null;
  /** ignora a validação de matrícula aberta (uso admin). */
  skipOpenCheck?: boolean;
}

export interface MatriculaResultado {
  enrollments: { enrollmentId: string; studentId: string; tier: PriceTier; monthlyAmount: number; transactionIds: string[] }[];
}

/**
 * Matrícula em lote: cria família (se aplicável), alunos, matrículas com preço
 * resolvido e mensalidades. Usado pelo link público e pelo cadastro manual.
 */
export async function matricularGrupo(input: MatricularGrupoInput): Promise<MatriculaResultado> {
  const courseClass = await prisma.courseClass.findUnique({
    where: { id: input.classId },
    include: { course: { include: { coursePrice: true } } },
  });
  if (!courseClass) throw new Error('Turma não encontrada.');

  const cc = courseClass as any;
  if (!input.skipOpenCheck) {
    if (cc.enrollmentStatus !== 'ABERTA') throw new Error('As matrículas desta turma estão fechadas.');
    const now = new Date();
    if (cc.enrollmentOpensAt && now < new Date(cc.enrollmentOpensAt)) throw new Error('As matrículas ainda não abriram.');
    if (cc.enrollmentClosesAt && now > new Date(cc.enrollmentClosesAt)) throw new Error('O período de matrícula encerrou.');
  }

  const coursePrice = (cc.course?.coursePrice ?? null) as CoursePriceTiers | null;
  const courseName = cc.course?.name ?? 'Curso';
  const installments = cc.installments ?? 1;

  // Igreja vinculada.
  let church: any = null;
  if (input.churchId) {
    church = await (prisma as any).church.findUnique({ where: { id: input.churchId } });
  }
  const isPartnerChurch = !!church?.isPartner;
  const churchType = church?.type ?? null;

  // Família (se mais de uma pessoa ou family informada).
  let familyId: string | null = null;
  if (input.family && (input.people.length > 1 || input.family.responsibleName)) {
    const fam = await (prisma as any).family.create({
      data: {
        name: input.family.name,
        responsibleName: input.family.responsibleName || null,
        responsiblePhone: input.family.responsiblePhone || null,
      },
    });
    familyId = fam.id;
  }
  const familyCount = familyId ? input.people.length : 0;

  // Contagem do grupo parceiro = já matriculados nesta turma + este lote.
  let partnerGroupCount = input.people.length;
  if (isPartnerChurch && church) {
    const existing = await prisma.enrollment.count({
      where: { classId: input.classId, churchId: church.id } as any,
    });
    partnerGroupCount = existing + input.people.length;
  }

  const enrollments: MatriculaResultado['enrollments'] = [];

  for (const person of input.people) {
    // type efetivo da igreja para esta pessoa.
    const effectiveChurchType = churchType ?? (person.isMemberOfSede ? 'SEDE' : null);

    const { amount, tier } = resolveMonthlyPrice({
      coursePrice,
      churchType: effectiveChurchType,
      isPartnerChurch,
      familyCount,
      partnerGroupCount,
    });

    const { studentId } = await ensureStudentAndUser({
      name: person.name,
      email: person.email,
      phone: person.phone,
      cpf: person.cpf,
      familyId,
      churchId: church?.id ?? null,
      churchName: church?.name ?? null,
    });

    // Evita matrícula duplicada (constraint @@unique studentId+classId).
    const dup = await prisma.enrollment.findFirst({ where: { studentId, classId: input.classId } });
    if (dup) {
      enrollments.push({ enrollmentId: dup.id, studentId, tier, monthlyAmount: amount, transactionIds: [] });
      continue;
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classId: input.classId,
        status: 'CURSANDO',
        priceTier: tier,
        monthlyAmount: amount,
        churchId: church?.id ?? null,
        origin: input.origin,
      } as any,
    });

    const transactionIds = await gerarMensalidades({
      studentId,
      enrollmentId: enrollment.id,
      monthlyAmount: amount,
      installments,
      courseName,
      enrollmentFee: coursePrice?.enrollmentFee ?? null,
      startDate: cc.startDate ?? undefined,
    });

    enrollments.push({ enrollmentId: enrollment.id, studentId, tier, monthlyAmount: amount, transactionIds });
  }

  return { enrollments };
}
