// Regras de negócio do módulo de Eventos com inscrição (excursões, eventos extras).
// Funções puras (sem Prisma) primeiro — testáveis sem banco. Helpers que tocam o
// banco ficam nas próximas seções deste arquivo, seguindo o padrão de coupons.ts.

import prisma from './prisma.ts';

export interface TicketLike {
  id: string;
  priceStudent: number;
  priceGeneral: number;
  quantity: number | null;
  salesStart: Date | null;
  salesEnd: Date | null;
  audience: 'ALL' | 'STUDENT' | 'EXTERNAL';
  isActive: boolean;
}

/** Preço aplicável ao inscrito, conforme ele é aluno matriculado ou não. */
export function applicablePrice(ticket: TicketLike, isStudent: boolean): number {
  return isStudent ? ticket.priceStudent : ticket.priceGeneral;
}

export type RegistrationStatus = 'PENDENTE' | 'CONFIRMADA' | 'CANCELADA' | 'EXPIRADA';

export interface RegistrationLike {
  status: RegistrationStatus;
  reservedUntil: Date | null;
}

/** Uma inscrição ocupa vaga se está confirmada, ou pendente com reserva ainda válida. */
export function isSlotOccupied(reg: RegistrationLike, now: Date): boolean {
  if (reg.status === 'CONFIRMADA') return true;
  if (reg.status === 'PENDENTE') return !reg.reservedUntil || reg.reservedUntil > now;
  return false;
}

export function countOccupiedSlots(regs: RegistrationLike[], now: Date): number {
  return regs.filter((r) => isSlotOccupied(r, now)).length;
}

/** Um lote está disponível para venda a um dado inscrito, em um dado instante. */
export function isTicketAvailable(
  ticket: TicketLike,
  opts: { now: Date; isStudent: boolean; occupied: number },
): boolean {
  if (!ticket.isActive) return false;
  if (ticket.salesStart && ticket.salesStart > opts.now) return false;
  if (ticket.salesEnd && ticket.salesEnd < opts.now) return false;
  if (ticket.audience === 'STUDENT' && !opts.isStudent) return false;
  if (ticket.audience === 'EXTERNAL' && opts.isStudent) return false;
  if (ticket.quantity != null && opts.occupied >= ticket.quantity) return false;
  return true;
}

export interface EventLike {
  isPublished: boolean;
  registrationEnabled: boolean;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  capacity: number | null;
}

/** A inscrição do evento está aberta ao público agora, considerando capacidade total. */
export function isRegistrationOpen(
  event: EventLike,
  opts: { now: Date; totalOccupied: number; hasAvailableTicket: boolean },
): boolean {
  if (!event.isPublished || !event.registrationEnabled) return false;
  if (event.registrationOpensAt && event.registrationOpensAt > opts.now) return false;
  if (event.registrationClosesAt && event.registrationClosesAt < opts.now) return false;
  if (event.capacity != null && opts.totalOccupied >= event.capacity) return false;
  return opts.hasAvailableTicket;
}

/** Prazo-limite da reserva de vaga aguardando pagamento. */
export function computeReservedUntil(now: Date, reservationHours: number): Date {
  return new Date(now.getTime() + reservationHours * 60 * 60 * 1000);
}

export interface CustomFieldDef {
  id: string;
  label: string;
  type: 'TEXT' | 'SELECT' | 'CHECKBOX';
  options: string[];
  required: boolean;
}

/** Valida as respostas do inscrito contra os campos extras do evento. Retorna a
 * primeira mensagem de erro encontrada, ou null se tudo estiver válido. */
export function validateCustomFieldAnswers(
  fields: CustomFieldDef[],
  answers: Record<string, string | boolean | undefined>,
): string | null {
  for (const field of fields) {
    const value = answers[field.id];
    if (field.type === 'CHECKBOX') {
      if (field.required && value !== true) return `Confirme "${field.label}".`;
      continue;
    }
    const strValue = typeof value === 'string' ? value.trim() : '';
    if (field.required && !strValue) return `Preencha "${field.label}".`;
    if (field.type === 'SELECT' && strValue && !field.options.includes(strValue)) {
      return `Opção inválida para "${field.label}".`;
    }
  }
  return null;
}

/** Ids das inscrições pendentes cuja reserva de vaga já venceu (usado pelo job de expiração). */
export function selectExpiredRegistrationIds(
  regs: { id: string; status: RegistrationStatus; reservedUntil: Date | null }[],
  now: Date,
): string[] {
  return regs
    .filter((r) => r.status === 'PENDENTE' && r.reservedUntil != null && r.reservedUntil < now)
    .map((r) => r.id);
}

/** Um lote com inscrições vinculadas nunca é excluído (violaria a integridade das
 * inscrições já feitas) — é desativado. Sem inscrições, pode ser removido de fato. */
export function resolveTicketRemoval(hasRegistrations: boolean): 'DELETE' | 'DEACTIVATE' {
  return hasRegistrations ? 'DEACTIVATE' : 'DELETE';
}

// ───────────────────────────────────────────────────────────────────────────
// A partir daqui: helpers que tocam o banco (não são funções puras).
// ───────────────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

/** Gera um slug público único para a página do evento, a partir do título. */
export async function generateUniqueEventSlug(title: string): Promise<string> {
  const base = slugify(title) || 'evento';
  let slug = base;
  let attempt = 1;
  while (await (prisma as any).event.findUnique({ where: { publicSlug: slug } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

/** Categoria financeira "Eventos", criada automaticamente na primeira cobrança. */
export async function findOrCreateEventCategory(): Promise<string> {
  const category = await (prisma as any).financialCategory.upsert({
    where: { name: 'Eventos' },
    update: {},
    create: { name: 'Eventos', type: 'RECEITA', isDefault: false, isActive: true },
  });
  return category.id;
}

export interface RegisterForEventInput {
  eventId: string;
  ticketId: string;
  isStudent: boolean;
  studentId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  cpf?: string | null;
  answers?: Record<string, string | boolean>;
}

export type RegisterForEventResult =
  | { ok: true; registrationId: string; requiresPayment: boolean; transactionId: string | null }
  | { ok: false; error: string };

/** Cria a inscrição (e a cobrança, se o lote não for gratuito), revalidando
 * disponibilidade dentro de uma transação para evitar corrida por vaga. */
export async function registerForEvent(input: RegisterForEventInput): Promise<RegisterForEventResult> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const event = await (tx as any).event.findUnique({
      where: { id: input.eventId },
      include: { tickets: true, customFields: true, registrations: { select: { status: true, reservedUntil: true } } },
    });
    if (!event) return { ok: false, error: 'Evento não encontrado.' };

    const ticket = event.tickets.find((t: any) => t.id === input.ticketId);
    if (!ticket) return { ok: false, error: 'Lote não encontrado.' };

    const totalOccupied = countOccupiedSlots(event.registrations, now);
    if (!isRegistrationOpen(event, { now, totalOccupied, hasAvailableTicket: true })) {
      return { ok: false, error: 'As inscrições para este evento estão fechadas.' };
    }

    const ticketRegs = await (tx as any).eventRegistration.findMany({
      where: { ticketId: ticket.id },
      select: { status: true, reservedUntil: true },
    });
    const ticketOccupied = countOccupiedSlots(ticketRegs, now);
    if (!isTicketAvailable(ticket, { now, isStudent: input.isStudent, occupied: ticketOccupied })) {
      return { ok: false, error: 'Este lote não está mais disponível.' };
    }

    const duplicateWhere = input.studentId
      ? { eventId: input.eventId, studentId: input.studentId, status: { in: ['PENDENTE', 'CONFIRMADA'] } }
      : { eventId: input.eventId, email: input.email, status: { in: ['PENDENTE', 'CONFIRMADA'] } };
    const duplicate = await (tx as any).eventRegistration.findFirst({ where: duplicateWhere });
    if (duplicate) return { ok: false, error: 'Você já tem uma inscrição neste evento.' };

    const fieldsError = validateCustomFieldAnswers(
      event.customFields.map((f: any) => ({ id: f.id, label: f.label, type: f.type, options: f.options, required: f.required })),
      input.answers ?? {},
    );
    if (fieldsError) return { ok: false, error: fieldsError };

    const amount = applicablePrice(ticket, input.isStudent);
    const requiresPayment = amount > 0;

    if (!requiresPayment) {
      const registration = await (tx as any).eventRegistration.create({
        data: {
          eventId: input.eventId,
          ticketId: ticket.id,
          studentId: input.studentId ?? null,
          isStudent: input.isStudent,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          cpf: input.cpf ?? null,
          amount: 0,
          status: 'CONFIRMADA',
          confirmedAt: now,
          answers: input.answers ?? {},
        },
      });
      return { ok: true, registrationId: registration.id, requiresPayment: false, transactionId: null };
    }

    const categoryId = await findOrCreateEventCategory();
    const reservedUntil = computeReservedUntil(now, event.reservationHours);

    const financialTransaction = await (tx as any).financialTransaction.create({
      data: {
        type: 'RECEITA',
        status: 'PENDENTE',
        amount,
        description: `Inscrição — ${event.title} (${ticket.name})`,
        dueDate: reservedUntil,
        categoryId,
        studentId: input.studentId ?? null,
      },
    });

    const registration = await (tx as any).eventRegistration.create({
      data: {
        eventId: input.eventId,
        ticketId: ticket.id,
        studentId: input.studentId ?? null,
        isStudent: input.isStudent,
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        cpf: input.cpf ?? null,
        amount,
        status: 'PENDENTE',
        reservedUntil,
        answers: input.answers ?? {},
        transactionId: financialTransaction.id,
      },
    });

    return { ok: true, registrationId: registration.id, requiresPayment: true, transactionId: financialTransaction.id };
  });
}

/** Chamado pelos webhooks de pagamento (PagBank/Santander) quando a transação vira PAGO.
 * Idempotente: reprocessar o mesmo webhook não tem efeito adicional. */
export async function confirmRegistrationForTransaction(transactionId: string): Promise<void> {
  const registration = await (prisma as any).eventRegistration.findUnique({ where: { transactionId } });
  if (!registration || registration.status !== 'PENDENTE') return;
  await (prisma as any).eventRegistration.update({
    where: { id: registration.id },
    data: { status: 'CONFIRMADA', confirmedAt: new Date(), reservedUntil: null },
  });
}
