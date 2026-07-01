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
  enrollmentFeeDueDate?: Date | string | null;
  startDate?: Date;
}): Promise<string[]> {
  const { studentId, enrollmentId, monthlyAmount, courseName } = opts;
  const installments = Math.max(1, opts.installments || 1);
  const base = opts.startDate ? new Date(opts.startDate) : new Date();
  const ids: string[] = [];

  const mensalidadeCat = await findCategoryId('Mensalidade');

  // Taxa de matrícula (opcional) — vencimento: data fixa configurada no
  // Financeiro (Preços dos Cursos); se não houver, cai em 7 dias após hoje.
  if (opts.enrollmentFee && opts.enrollmentFee > 0) {
    const matriculaCat = (await findCategoryId('Matrícula')) ?? mensalidadeCat;
    let dueDate: Date;
    if (opts.enrollmentFeeDueDate) {
      dueDate = new Date(opts.enrollmentFeeDueDate);
    } else {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
    }
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

/**
 * Gera as presenças PENDENTES de um aluno para TODAS as aulas já existentes
 * da turma (CourseClass), via disciplinas vinculadas. Idempotente: usa
 * skipDuplicates, então pode ser chamado quantas vezes for preciso.
 *
 * Necessário porque o sistema só cria Attendance no momento em que a aula é
 * criada (lessonController). Sem isto, alunos matriculados DEPOIS das aulas
 * nunca aparecem na lista de presença.
 */
export async function sincronizarPresencas(studentId: string, classId: string): Promise<number> {
  const lessons = await prisma.lesson.findMany({
    where: { disciplines: { some: { courseClasses: { some: { id: classId } } } } },
    select: { id: true },
  });
  if (lessons.length === 0) return 0;

  const result = await (prisma as any).attendance.createMany({
    data: lessons.map((l) => ({ lessonId: l.id, studentId, status: 'PENDING' })),
    skipDuplicates: true,
  });
  return result.count ?? 0;
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
  // Dados pessoais e de vida cristã (formulário completo de matrícula)
  birthDate?: Date | null;
  maritalStatus?: string | null;
  address?: string | null;
  conversionTime?: string | null;
  churchMembershipTime?: string | null;
  isBaptized?: boolean | null;
  baptismTime?: string | null;
}): Promise<{ studentId: string }> {
  const email = person.email.trim().toLowerCase();

  // Campos pessoais/espirituais (só inclui o que veio preenchido).
  const profileData = {
    ...(person.phone ? { phone: person.phone } : {}),
    ...(person.cpf ? { cpf: person.cpf } : {}),
    ...(person.birthDate ? { birthDate: person.birthDate } : {}),
    ...(person.maritalStatus ? { maritalStatus: person.maritalStatus } : {}),
    ...(person.address ? { address: person.address } : {}),
    ...(person.conversionTime ? { conversionTime: person.conversionTime } : {}),
    ...(person.churchMembershipTime ? { churchMembershipTime: person.churchMembershipTime } : {}),
    ...(typeof person.isBaptized === 'boolean' ? { isBaptized: person.isBaptized } : {}),
    ...(person.baptismTime ? { baptismTime: person.baptismTime } : {}),
  };

  // Reaproveita aluno existente pelo email.
  const existing = await prisma.student.findUnique({ where: { email } });
  if (existing) {
    await prisma.student.update({
      where: { id: existing.id },
      data: {
        ...profileData,
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
      ...profileData,
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
  // Dados pessoais
  birthDate?: string | null; // ISO (yyyy-mm-dd)
  maritalStatus?: string | null;
  address?: string | null; // endereço completo já montado (a partir do CEP)
  // Vida cristã
  conversionTime?: string | null;
  churchName?: string | null; // igreja que frequenta
  churchMembershipTime?: string | null;
  isBaptized?: boolean | null;
  baptismTime?: string | null;
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
      // Igreja vinculada (link parceira) tem prioridade; senão usa a declarada pela pessoa.
      churchName: church?.name ?? person.churchName ?? null,
      birthDate: person.birthDate ? new Date(person.birthDate) : null,
      maritalStatus: person.maritalStatus ?? null,
      address: person.address ?? null,
      conversionTime: person.conversionTime ?? null,
      churchMembershipTime: person.churchMembershipTime ?? null,
      isBaptized: typeof person.isBaptized === 'boolean' ? person.isBaptized : null,
      baptismTime: person.baptismTime ?? null,
    });

    // Evita matrícula duplicada (constraint @@unique studentId+classId).
    const dup = await prisma.enrollment.findFirst({ where: { studentId, classId: input.classId } });
    if (dup) {
      await sincronizarPresencas(studentId, input.classId);
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

    await sincronizarPresencas(studentId, input.classId);

    const transactionIds = await gerarMensalidades({
      studentId,
      enrollmentId: enrollment.id,
      monthlyAmount: amount,
      installments,
      courseName,
      enrollmentFee: coursePrice?.enrollmentFee ?? null,
      enrollmentFeeDueDate: coursePrice?.enrollmentFeeDueDate ?? null,
      startDate: cc.startDate ?? undefined,
    });

    enrollments.push({ enrollmentId: enrollment.id, studentId, tier, monthlyAmount: amount, transactionIds });
  }

  return { enrollments };
}

export interface AutoMatriculaResultado {
  enrollmentId: string;
  alreadyEnrolled: boolean;
  tier: PriceTier;
  monthlyAmount: number;
  transactionIds: string[];
}

/**
 * Auto-matrícula de um aluno JÁ EXISTENTE (logado no portal) em uma turma com
 * matrículas abertas. Reaproveita o Student/User e resolve o preço a partir da
 * igreja já vinculada ao aluno. Idempotente: se já matriculado, apenas
 * sincroniza presenças e retorna a matrícula existente.
 */
export async function matricularAlunoExistente(studentId: string, classId: string): Promise<AutoMatriculaResultado> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { church: true } as any,
  });
  if (!student) throw new Error('Aluno não encontrado.');

  const courseClass = await prisma.courseClass.findUnique({
    where: { id: classId },
    include: { course: { include: { coursePrice: true } } },
  });
  if (!courseClass) throw new Error('Turma não encontrada.');

  const cc = courseClass as any;
  if (cc.enrollmentStatus !== 'ABERTA') throw new Error('As matrículas desta turma estão fechadas.');
  const now = new Date();
  if (cc.enrollmentOpensAt && now < new Date(cc.enrollmentOpensAt)) throw new Error('As matrículas ainda não abriram.');
  if (cc.enrollmentClosesAt && now > new Date(cc.enrollmentClosesAt)) throw new Error('O período de matrícula encerrou.');

  // Já matriculado nesta turma? (constraint @@unique studentId+classId)
  const dup = await prisma.enrollment.findFirst({ where: { studentId, classId } });
  if (dup) {
    await sincronizarPresencas(studentId, classId);
    return {
      enrollmentId: dup.id,
      alreadyEnrolled: true,
      tier: ((dup as any).priceTier as PriceTier) ?? 'NON_MEMBER',
      monthlyAmount: (dup as any).monthlyAmount ?? 0,
      transactionIds: [],
    };
  }

  const coursePrice = (cc.course?.coursePrice ?? null) as CoursePriceTiers | null;
  const courseName = cc.course?.name ?? 'Curso';
  const installments = cc.installments ?? 1;

  const church = (student as any).church;
  const isPartnerChurch = !!church?.isPartner;
  const churchType = church?.type ?? null;

  // Contagem do grupo parceiro = já matriculados nesta turma + este aluno.
  let partnerGroupCount = 1;
  if (isPartnerChurch && church) {
    const existing = await prisma.enrollment.count({ where: { classId, churchId: church.id } as any });
    partnerGroupCount = existing + 1;
  }

  const { amount, tier } = resolveMonthlyPrice({
    coursePrice,
    churchType,
    isPartnerChurch,
    familyCount: 0,
    partnerGroupCount,
  });

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId,
      classId,
      status: 'CURSANDO',
      priceTier: tier,
      monthlyAmount: amount,
      churchId: church?.id ?? null,
      origin: 'PORTAL',
    } as any,
  });

  await sincronizarPresencas(studentId, classId);

  const transactionIds = await gerarMensalidades({
    studentId,
    enrollmentId: enrollment.id,
    monthlyAmount: amount,
    installments,
    courseName,
    enrollmentFee: coursePrice?.enrollmentFee ?? null,
    enrollmentFeeDueDate: coursePrice?.enrollmentFeeDueDate ?? null,
    startDate: cc.startDate ?? undefined,
  });

  return { enrollmentId: enrollment.id, alreadyEnrolled: false, tier, monthlyAmount: amount, transactionIds };
}
