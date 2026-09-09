# Módulo de Eventos com Inscrição — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir cadastrar eventos (excursões, eventos extras) pagos ou gratuitos, com inscrição de alunos e não-alunos por uma página pública, cobrança pelo gateway já existente, lançamento automático em Contas a Receber, e exibição nos calendários do admin e do aluno.

**Architecture:** Estende o model `Event` já existente (em vez de criar um segundo tipo de evento) com campos de inscrição, local/logística e conteúdo informativo, e adiciona três models novos: `EventTicket` (lote de inscrição, com preço de aluno e de não-aluno), `EventRegistration` (a inscrição) e `EventCustomField` (perguntas extras configuráveis por evento). O fluxo de pagamento reaproveita 100% o checkout e os webhooks do PagBank/Santander já existentes — a única mudança ali é fazer o checkout funcionar também quando não há `Student` (inscrito externo). Toda regra de disponibilidade de lote/vaga/janela de inscrição vive em funções puras testáveis em `src/lib/events.ts`.

**Tech Stack:** Next.js App Router (huios-admin), Prisma + PostgreSQL, node:test nativo (`.test.mts`), Tailwind.

## Global Constraints

- Banco: `prisma db push` (projeto não usa migrations versionadas — ver `[[project_pagbank_config_db]]`), não criar arquivo de migration.
- Todo texto de UI em português, seguindo o vocabulário já usado no projeto (ex.: "Inscritos", "Lote", "Inscrição").
- Nenhuma alteração no fluxo de matrícula acadêmica (`Enrollment`/`Student`) — inscrito externo nunca gera `Student`.
- Toda ação server-side que muda dados chama `requirePermission(...)` antes de tocar no banco (padrão do projeto).
- Datas de formulário (dia) usam `parseBRLocal`; combinações de dia+hora usam `parseBRDateAndTime` — nunca `new Date(string)` direto (arquivo `src/lib/date-utils.ts` já resolve fuso de Brasília).
- **Resolução de nomenclatura de rotas (desvio do texto do spec, mesma funcionalidade):** o spec usa `/eventos` tanto para a vitrine pública quanto para a lista do admin — isso colide no App Router (uma única árvore de rotas). Seguindo a convenção já usada no projeto (`/matricula` público singular vs. `/matriculas` admin plural), as rotas públicas ficam em **`/evento`** (singular) e as administrativas em **`/eventos`** (plural, como pedido). `/portal/eventos` não colide porque o prefixo `/portal` já é tratado como namespace próprio.

---

## Task 1: Schema do banco — Event estendido + EventTicket + EventRegistration + EventCustomField

**Files:**
- Modify: `huios-admin/prisma/schema.prisma`

**Interfaces:**
- Produces: models `EventTicket`, `EventRegistration`, `EventCustomField`; campos novos em `Event`; relações inversas `EventRegistration[]` em `Student` e `EventRegistration?` em `FinancialTransaction`. Todas as tasks seguintes dependem destes nomes de campo exatamente como definidos aqui.

- [ ] **Step 1: Adicionar os campos novos ao model `Event`**

Abra `prisma/schema.prisma` e localize o model `Event` (bloco `// EVENTOS INSTITUCIONAIS (calendário)`). Adicione os campos abaixo **antes** da linha `attendances EventAttendance[]`, mantendo todos os campos existentes intactos:

```prisma
model Event {
  id          String   @id @default(uuid())
  title       String
  type        String?
  description String?

  date      DateTime
  startTime DateTime?
  endTime   DateTime?

  courseClasses CourseClass[]

  requiresCheckIn Boolean @default(false)
  locationName    String?
  latitude        Float?
  longitude       Float?
  radiusMeters    Int     @default(100)

  // Inscrição (excursões, eventos extras — pagos ou gratuitos)
  registrationEnabled  Boolean   @default(false)
  isPublished          Boolean   @default(false)
  publicSlug           String?   @unique
  registrationOpensAt  DateTime?
  registrationClosesAt DateTime?
  capacity             Int?
  reservationHours     Int       @default(24)

  // Apresentação e local (página pública)
  bannerUrl       String?
  locationAddress String?
  mapUrl          String?

  // Logística (excursões)
  meetingPoint  String?
  meetingTime   DateTime?
  returnTime    DateTime?
  transportInfo String?

  // Informações ao inscrito
  includedItems      String?
  whatToBring        String?
  extraNotes         String?
  organizerName      String?
  organizerPhone     String?
  cancellationPolicy String?

  tickets       EventTicket[]
  customFields  EventCustomField[]
  registrations EventRegistration[]

  attendances EventAttendance[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Adicionar os models `EventTicket`, `EventRegistration` e `EventCustomField`**

Ainda em `prisma/schema.prisma`, adicione estes três models **imediatamente depois** do model `Event` (antes de `model EventAttendance`):

```prisma
model EventTicket {
  id           String   @id @default(cuid())
  eventId      String
  event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name         String
  description  String?
  priceStudent Float    @default(0)
  priceGeneral Float    @default(0)
  quantity     Int?
  salesStart   DateTime?
  salesEnd     DateTime?
  audience     String   @default("ALL") // ALL | STUDENT | EXTERNAL
  isActive     Boolean  @default(true)
  order        Int      @default(0)

  registrations EventRegistration[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([eventId])
}

model EventRegistration {
  id       String @id @default(cuid())
  eventId  String
  event    Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  ticketId String
  ticket   EventTicket @relation(fields: [ticketId], references: [id])

  studentId String?
  student   Student? @relation(fields: [studentId], references: [id])
  isStudent Boolean  @default(false)

  name  String
  email String
  phone String?
  cpf   String?

  amount  Float
  status  String @default("PENDENTE") // PENDENTE | CONFIRMADA | CANCELADA | EXPIRADA
  answers Json?

  transactionId String?               @unique
  transaction   FinancialTransaction? @relation(fields: [transactionId], references: [id])

  reservedUntil DateTime?
  confirmedAt   DateTime?
  canceledAt    DateTime?
  notes         String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([eventId, status])
  @@index([studentId])
}

model EventCustomField {
  id       String @id @default(cuid())
  eventId  String
  event    Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  label    String
  type     String   @default("TEXT") // TEXT | SELECT | CHECKBOX
  options  String[] @default([])
  required Boolean  @default(false)
  order    Int      @default(0)

  @@index([eventId])
}
```

- [ ] **Step 3: Adicionar as relações inversas em `Student` e `FinancialTransaction`**

No model `Student`, depois da linha `eventAttendances EventAttendance[]`, adicione:

```prisma
  eventRegistrations EventRegistration[]
```

No model `FinancialTransaction`, depois da linha `attachments   TransactionAttachment[]`, adicione:

```prisma
  eventRegistration EventRegistration?
```

- [ ] **Step 4: Aplicar o schema no banco e gerar o client**

Run: `cd huios-admin && npx prisma db push && npx prisma generate`
Expected: `The database is now in sync with your Prisma schema.` seguido de `✔ Generated Prisma Client`.

- [ ] **Step 5: Verificar que o projeto compila**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos relacionados a `Event`/`EventTicket`/`EventRegistration`/`EventCustomField` (erros pré-existentes, se houver, não são desta task).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(eventos): estende Event e adiciona EventTicket, EventRegistration, EventCustomField

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Regras de negócio puras — `src/lib/events.ts` (parte 1: preço, disponibilidade, janela)

**Files:**
- Create: `huios-admin/src/lib/events.ts`
- Test: `huios-admin/src/lib/events.test.mts`

**Interfaces:**
- Consumes: nada (funções puras, sem Prisma).
- Produces: `TicketLike`, `applicablePrice(ticket, isStudent)`, `RegistrationStatus`, `RegistrationLike`, `isSlotOccupied(reg, now)`, `countOccupiedSlots(regs, now)`, `isTicketAvailable(ticket, opts)`, `EventLike`, `isRegistrationOpen(event, opts)`, `computeReservedUntil(now, reservationHours)`. Usados por Task 3 (validação de campos extras), Task 4 (job de expiração), Task 9 (server actions), Task 16 (registro público/portal).

- [ ] **Step 1: Escrever os testes (falhando)**

Crie `src/lib/events.test.mts`:

```typescript
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applicablePrice,
  isSlotOccupied,
  countOccupiedSlots,
  isTicketAvailable,
  isRegistrationOpen,
  computeReservedUntil,
  type TicketLike,
  type EventLike,
} from './events.ts';

const baseTicket: TicketLike = {
  id: 't1',
  priceStudent: 50,
  priceGeneral: 100,
  quantity: null,
  salesStart: null,
  salesEnd: null,
  audience: 'ALL',
  isActive: true,
};

test('applicablePrice usa o preço de aluno quando isStudent é true', () => {
  assert.equal(applicablePrice(baseTicket, true), 50);
  assert.equal(applicablePrice(baseTicket, false), 100);
});

test('isSlotOccupied: confirmada sempre ocupa', () => {
  assert.equal(isSlotOccupied({ status: 'CONFIRMADA', reservedUntil: null }, new Date()), true);
});

test('isSlotOccupied: pendente ocupa só enquanto a reserva não expirou', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  assert.equal(isSlotOccupied({ status: 'PENDENTE', reservedUntil: new Date('2026-01-10T13:00:00Z') }, now), true);
  assert.equal(isSlotOccupied({ status: 'PENDENTE', reservedUntil: new Date('2026-01-10T11:00:00Z') }, now), false);
});

test('isSlotOccupied: cancelada e expirada nunca ocupam', () => {
  const now = new Date();
  assert.equal(isSlotOccupied({ status: 'CANCELADA', reservedUntil: null }, now), false);
  assert.equal(isSlotOccupied({ status: 'EXPIRADA', reservedUntil: null }, now), false);
});

test('countOccupiedSlots soma apenas os registros ocupando vaga', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  const regs = [
    { status: 'CONFIRMADA' as const, reservedUntil: null },
    { status: 'PENDENTE' as const, reservedUntil: new Date('2026-01-10T13:00:00Z') },
    { status: 'EXPIRADA' as const, reservedUntil: null },
    { status: 'CANCELADA' as const, reservedUntil: null },
  ];
  assert.equal(countOccupiedSlots(regs, now), 2);
});

test('isTicketAvailable respeita isActive, janela de vendas e vagas', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  assert.equal(isTicketAvailable({ ...baseTicket, isActive: false }, { now, isStudent: false, occupied: 0 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, salesStart: new Date('2026-02-01T00:00:00Z') }, { now, isStudent: false, occupied: 0 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, salesEnd: new Date('2026-01-01T00:00:00Z') }, { now, isStudent: false, occupied: 0 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, quantity: 5 }, { now, isStudent: false, occupied: 5 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, quantity: 5 }, { now, isStudent: false, occupied: 4 }), true);
});

test('isTicketAvailable respeita o público-alvo do lote', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  assert.equal(isTicketAvailable({ ...baseTicket, audience: 'STUDENT' }, { now, isStudent: false, occupied: 0 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, audience: 'STUDENT' }, { now, isStudent: true, occupied: 0 }), true);
  assert.equal(isTicketAvailable({ ...baseTicket, audience: 'EXTERNAL' }, { now, isStudent: true, occupied: 0 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, audience: 'EXTERNAL' }, { now, isStudent: false, occupied: 0 }), true);
});

const baseEvent: EventLike = {
  isPublished: true,
  registrationEnabled: true,
  registrationOpensAt: null,
  registrationClosesAt: null,
  capacity: null,
};

test('isRegistrationOpen exige publicado, habilitado e ao menos um lote disponível', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  assert.equal(isRegistrationOpen({ ...baseEvent, isPublished: false }, { now, totalOccupied: 0, hasAvailableTicket: true }), false);
  assert.equal(isRegistrationOpen({ ...baseEvent, registrationEnabled: false }, { now, totalOccupied: 0, hasAvailableTicket: true }), false);
  assert.equal(isRegistrationOpen(baseEvent, { now, totalOccupied: 0, hasAvailableTicket: false }), false);
  assert.equal(isRegistrationOpen(baseEvent, { now, totalOccupied: 0, hasAvailableTicket: true }), true);
});

test('isRegistrationOpen respeita janela de datas e capacidade total', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  assert.equal(isRegistrationOpen({ ...baseEvent, registrationOpensAt: new Date('2026-02-01T00:00:00Z') }, { now, totalOccupied: 0, hasAvailableTicket: true }), false);
  assert.equal(isRegistrationOpen({ ...baseEvent, registrationClosesAt: new Date('2026-01-01T00:00:00Z') }, { now, totalOccupied: 0, hasAvailableTicket: true }), false);
  assert.equal(isRegistrationOpen({ ...baseEvent, capacity: 10 }, { now, totalOccupied: 10, hasAvailableTicket: true }), false);
  assert.equal(isRegistrationOpen({ ...baseEvent, capacity: 10 }, { now, totalOccupied: 9, hasAvailableTicket: true }), true);
});

test('computeReservedUntil soma as horas de reserva à data base', () => {
  const now = new Date('2026-01-10T12:00:00.000Z');
  assert.equal(computeReservedUntil(now, 24).toISOString(), '2026-01-11T12:00:00.000Z');
  assert.equal(computeReservedUntil(now, 2).toISOString(), '2026-01-10T14:00:00.000Z');
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd huios-admin && node --test src/lib/events.test.mts`
Expected: FAIL — `Cannot find module './events.ts'` (o arquivo ainda não existe).

- [ ] **Step 3: Criar `src/lib/events.ts` com as funções**

```typescript
// Regras de negócio do módulo de Eventos com inscrição (excursões, eventos extras).
// Funções puras (sem Prisma) primeiro — testáveis sem banco. Helpers que tocam o
// banco ficam nas próximas seções deste arquivo, seguindo o padrão de coupons.ts.

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
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd huios-admin && node --test src/lib/events.test.mts`
Expected: PASS — todos os testes acima em verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events.ts src/lib/events.test.mts
git commit -m "feat(eventos): regras puras de preco, vagas e janela de inscricao

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Regras de negócio puras — campos extras e expiração de reserva

**Files:**
- Modify: `huios-admin/src/lib/events.ts`
- Modify: `huios-admin/src/lib/events.test.mts`

**Interfaces:**
- Consumes: nada de novo.
- Produces: `CustomFieldDef`, `validateCustomFieldAnswers(fields, answers)`, `selectExpiredRegistrationIds(regs, now)`, `resolveTicketRemoval(hasRegistrations)`. Usados por Task 4 (job), Task 9 (sincronização de lotes) e Task 16 (validação do formulário de inscrição).

- [ ] **Step 1: Adicionar os testes**

Anexe ao final de `src/lib/events.test.mts` (ajuste o bloco de imports do topo do arquivo para incluir os novos nomes):

```typescript
import {
  applicablePrice,
  isSlotOccupied,
  countOccupiedSlots,
  isTicketAvailable,
  isRegistrationOpen,
  computeReservedUntil,
  validateCustomFieldAnswers,
  selectExpiredRegistrationIds,
  resolveTicketRemoval,
  type TicketLike,
  type EventLike,
  type CustomFieldDef,
} from './events.ts';
```

E adicione ao final do arquivo:

```typescript
const textField: CustomFieldDef = { id: 'f1', label: 'Tamanho da camiseta', type: 'TEXT', options: [], required: true };
const selectField: CustomFieldDef = { id: 'f2', label: 'Restrição alimentar', type: 'SELECT', options: ['Nenhuma', 'Vegetariano'], required: false };
const checkboxField: CustomFieldDef = { id: 'f3', label: 'Aceito os termos', type: 'CHECKBOX', options: [], required: true };

test('validateCustomFieldAnswers exige campos obrigatórios preenchidos', () => {
  assert.equal(validateCustomFieldAnswers([textField], {}), 'Preencha "Tamanho da camiseta".');
  assert.equal(validateCustomFieldAnswers([textField], { f1: '  ' }), 'Preencha "Tamanho da camiseta".');
  assert.equal(validateCustomFieldAnswers([textField], { f1: 'M' }), null);
});

test('validateCustomFieldAnswers valida a opção do campo SELECT', () => {
  assert.equal(validateCustomFieldAnswers([selectField], { f2: 'Vegano' }), 'Opção inválida para "Restrição alimentar".');
  assert.equal(validateCustomFieldAnswers([selectField], { f2: 'Vegetariano' }), null);
  assert.equal(validateCustomFieldAnswers([selectField], {}), null); // não obrigatório
});

test('validateCustomFieldAnswers exige CHECKBOX obrigatório marcado como true', () => {
  assert.equal(validateCustomFieldAnswers([checkboxField], {}), 'Confirme "Aceito os termos".');
  assert.equal(validateCustomFieldAnswers([checkboxField], { f3: false }), 'Confirme "Aceito os termos".');
  assert.equal(validateCustomFieldAnswers([checkboxField], { f3: true }), null);
});

test('selectExpiredRegistrationIds seleciona só pendentes com reserva vencida', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  const regs = [
    { id: 'r1', status: 'PENDENTE' as const, reservedUntil: new Date('2026-01-10T11:00:00Z') }, // vencida
    { id: 'r2', status: 'PENDENTE' as const, reservedUntil: new Date('2026-01-10T13:00:00Z') }, // ainda válida
    { id: 'r3', status: 'CONFIRMADA' as const, reservedUntil: null },
    { id: 'r4', status: 'PENDENTE' as const, reservedUntil: null }, // sem prazo — nunca expira
  ];
  assert.deepEqual(selectExpiredRegistrationIds(regs, now), ['r1']);
});

test('resolveTicketRemoval mantém (desativa) lotes com inscrições e remove os sem uso', () => {
  assert.equal(resolveTicketRemoval(true), 'DEACTIVATE');
  assert.equal(resolveTicketRemoval(false), 'DELETE');
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd huios-admin && node --test src/lib/events.test.mts`
Expected: FAIL — `validateCustomFieldAnswers`, `selectExpiredRegistrationIds` e `resolveTicketRemoval` não exportados.

- [ ] **Step 3: Adicionar as funções em `src/lib/events.ts`**

Adicione ao final do arquivo (depois de `computeReservedUntil`):

```typescript
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
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd huios-admin && node --test src/lib/events.test.mts`
Expected: PASS — todos os testes do arquivo em verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events.ts src/lib/events.test.mts
git commit -m "feat(eventos): validacao de campos extras e selecao de reservas expiradas

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Helpers de banco em `events.ts` + job de expiração de reservas

**Files:**
- Modify: `huios-admin/src/lib/events.ts`
- Create: `huios-admin/src/lib/jobs/eventReservations.ts`
- Modify: `huios-admin/instrumentation.ts`

**Interfaces:**
- Consumes: `selectExpiredRegistrationIds` (Task 3), `computeReservedUntil`, `applicablePrice`, `isTicketAvailable`, `isRegistrationOpen`, `countOccupiedSlots`, `validateCustomFieldAnswers` (Tasks 2–3).
- Produces: `slugify(name)`, `generateUniqueEventSlug(title)`, `findOrCreateEventCategory()`, `registerForEvent(input)` com `RegisterForEventInput`/`RegisterForEventResult`, `confirmRegistrationForTransaction(transactionId)`, `expireEventReservations(now?)`. Usados pelas Tasks 5 (webhooks), 9 (admin actions), 16 (registro público/portal).

Não há teste automatizado de banco para estes helpers e para o job — segue a convenção já usada no projeto (`enrollment.ts`, `coupons.ts`, `financialDueDates.ts` não têm testes de banco; só a lógica pura deles é testada). A verificação aqui é o build (`tsc --noEmit`) mais o teste manual descrito no Step 5.

- [ ] **Step 1: Adicionar os helpers de banco em `src/lib/events.ts`**

Adicione ao topo do arquivo (depois do comentário inicial) o import do Prisma, e ao final do arquivo os helpers:

```typescript
import prisma from './prisma';
```

```typescript
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
```

Ao topo do arquivo, junto aos demais imports de tipos/funções já definidos no próprio arquivo, garanta que `applicablePrice`, `isTicketAvailable`, `isRegistrationOpen`, `countOccupiedSlots`, `computeReservedUntil` e `validateCustomFieldAnswers` já estejam declarados **antes** de `registerForEvent` no arquivo (todas foram criadas nas Tasks 2–3 acima, no mesmo arquivo — nenhum import extra é necessário além de `prisma`).

- [ ] **Step 2: Criar o job de expiração**

Crie `src/lib/jobs/eventReservations.ts`:

```typescript
import prisma from '@/lib/prisma';
import { selectExpiredRegistrationIds } from '@/lib/events';

export interface EventReservationResult {
  expired: number;
}

/**
 * Job diário: expira inscrições PENDENTES cuja reserva de vaga venceu, e cancela
 * a cobrança pendente vinculada (se ainda não tiver sido paga nem cancelada).
 */
export async function expireEventReservations(now: Date = new Date()): Promise<EventReservationResult> {
  const pending = await (prisma as any).eventRegistration.findMany({
    where: { status: 'PENDENTE', reservedUntil: { not: null } },
    select: { id: true, status: true, reservedUntil: true, transactionId: true },
  });

  const expiredIds = selectExpiredRegistrationIds(pending, now);
  if (expiredIds.length === 0) return { expired: 0 };

  const transactionIds = pending
    .filter((r: any) => expiredIds.includes(r.id) && r.transactionId)
    .map((r: any) => r.transactionId as string);

  await (prisma as any).eventRegistration.updateMany({
    where: { id: { in: expiredIds } },
    data: { status: 'EXPIRADA', canceledAt: now },
  });

  if (transactionIds.length > 0) {
    await (prisma as any).financialTransaction.updateMany({
      where: { id: { in: transactionIds }, status: 'PENDENTE' },
      data: { status: 'CANCELADA' },
    });
  }

  return { expired: expiredIds.length };
}
```

- [ ] **Step 3: Agendar o job em `instrumentation.ts`**

Abra `instrumentation.ts` e adicione, dentro de `register()`, depois do bloco `cron.schedule('0 6 * * *', ...)` (job de vencimento financeiro):

```typescript
  // Todo dia às 07:00 de Brasília: expira inscrições de evento cuja reserva de
  // vaga venceu sem pagamento, liberando a vaga e cancelando a cobrança.
  cron.schedule('0 7 * * *', async () => {
    try {
      const { expireEventReservations } = await import('./src/lib/jobs/eventReservations');
      const result = await expireEventReservations();
      console.log('[eventReservations] executado:', result);
    } catch (error) {
      console.error('[eventReservations] falhou:', error);
    }
  }, { timezone: 'America/Sao_Paulo' });
```

- [ ] **Step 4: Verificar que o projeto compila e os testes puros continuam passando**

Run: `cd huios-admin && npx tsc --noEmit && node --test src/lib/events.test.mts`
Expected: sem erros de tipo; testes de `events.test.mts` em verde (o job e os helpers de banco não têm teste automatizado, por convenção do projeto).

- [ ] **Step 5: Commit**

```bash
git add src/lib/events.ts src/lib/jobs/eventReservations.ts instrumentation.ts
git commit -m "feat(eventos): helpers de inscricao/pagamento e job de expiracao de reserva

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Permissões — módulo `eventos` no catálogo e nas rotas

**Files:**
- Modify: `huios-admin/src/lib/permissions/catalog.ts`
- Modify: `huios-admin/src/lib/permissions/path-access.ts`
- Modify: `huios-admin/src/lib/permissions/path-access.test.ts`

**Interfaces:**
- Produces: permissões `eventos.visualizar`, `eventos.criar`, `eventos.editar`, `eventos.excluir`; prefixo público `/evento`; padrões de rota para `/eventos`, `/eventos/novo`, `/eventos/:id/editar`, `/eventos/:id/inscritos`. Consumidos pelas Tasks 9–12 (`requirePermission`) e pelo `Sidebar` (Task 12).

- [ ] **Step 1: Adicionar o módulo ao catálogo**

Em `src/lib/permissions/catalog.ts`, adicione ao objeto `MODULE_ACTIONS` (ordem alfabética, junto a `equipe`):

```typescript
  eventos: ['visualizar', 'criar', 'editar', 'excluir'],
```

Em `DEFAULT_ROLE_PERMISSIONS.COORDENADOR`, localize a constante `academicCrud` e adicione `'eventos'`:

```typescript
const academicCrud = [
  'alunos',
  'professores',
  'igrejas',
  'cursos',
  'turmas',
  'disciplinas',
  'matriculas',
  'aulas',
  'eventos',
] as const
```

Isso já dá ao COORDENADOR as 4 permissões de `eventos` via `crudPermissions(academicCrud)`, sem editar a lista manual do COORDENADOR.

Em `DEFAULT_ROLE_PERMISSIONS.SECRETARIA`, adicione (junto às linhas de `aulas.visualizar`):

```typescript
    'eventos.visualizar',
    'eventos.criar',
    'eventos.editar',
```

- [ ] **Step 2: Rodar o teste do catálogo**

Run: `cd huios-admin && node --test src/lib/permissions/catalog.test.ts`
Expected: PASS — os testes de unicidade/formato/coerência do catálogo continuam passando com o módulo novo.

- [ ] **Step 3: Adicionar as rotas ao `path-access.ts`**

Em `src/lib/permissions/path-access.ts`, adicione estas entradas ao array `pathPermissions` (qualquer posição, o array é reordenado por tamanho automaticamente):

```typescript
  { pattern: '/eventos/:id/inscritos', requirement: { kind: 'permission', permission: 'eventos.visualizar' } },
  { pattern: '/eventos/:id/editar', requirement: { kind: 'permission', permission: 'eventos.editar' } },
  { pattern: '/eventos/novo', requirement: { kind: 'permission', permission: 'eventos.criar' } },
  { pattern: '/eventos', requirement: { kind: 'permission', permission: 'eventos.visualizar' } },
```

Depois, dentro de `resolvePathRequirement`, no bloco que já reconhece `/matricula` como público, adicione o prefixo `/evento` (singular):

```typescript
  if (
    normalized === '/login' ||
    normalized === '/portal/login' ||
    hasPathPrefix(normalized, '/matricula') ||
    hasPathPrefix(normalized, '/evento')
  ) {
    return { kind: 'public' }
  }
```

- [ ] **Step 4: Adicionar os testes de rota**

Em `src/lib/permissions/path-access.test.ts`, adicione (próximo ao teste `'does not confuse public enrollment with admin enrollments'`):

```typescript
test('does not confuse public event pages with admin eventos', () => {
  assert.deepEqual(resolvePathRequirement('/evento'), { kind: 'public' })
  assert.deepEqual(resolvePathRequirement('/evento/excursao-israel-2026'), { kind: 'public' })
  assert.deepEqual(resolvePathRequirement('/eventos'), {
    kind: 'permission',
    permission: 'eventos.visualizar',
  })
  assert.deepEqual(resolvePathRequirement('/eventos/novo'), {
    kind: 'permission',
    permission: 'eventos.criar',
  })
  assert.deepEqual(resolvePathRequirement(`/eventos/${UUID}/editar`), {
    kind: 'permission',
    permission: 'eventos.editar',
  })
  assert.deepEqual(resolvePathRequirement(`/eventos/${UUID}/inscritos`), {
    kind: 'permission',
    permission: 'eventos.visualizar',
  })
})
```

Nota: `/eventos/:id/...` usa `cuid()` como id (ex.: `c1a2b3...`), não uuid — mas `isDatabaseId` já aceita ambos os formatos (`c[a-z0-9]{20,31}` cobre cuid; o `UUID` de teste também funciona porque o matcher só valida o *formato* do segmento, não qual model o gerou).

- [ ] **Step 5: Rodar os testes de permissão**

Run: `cd huios-admin && node --test src/lib/permissions/path-access.test.ts`
Expected: PASS — incluindo o teste novo.

- [ ] **Step 6: Commit**

```bash
git add src/lib/permissions/catalog.ts src/lib/permissions/path-access.ts src/lib/permissions/path-access.test.ts
git commit -m "feat(eventos): permissoes e rotas do modulo de eventos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Middleware — liberar `/evento` como página pública

**Files:**
- Modify: `huios-admin/src/middleware.ts`

**Interfaces:**
- Consumes: nada.
- Produces: visitante sem sessão pode acessar `/evento` e subrotas sem ser redirecionado para `/login`.

- [ ] **Step 1: Adicionar a função de reconhecimento e usá-la**

Em `src/middleware.ts`, depois da função `isPublicEnroll`, adicione:

```typescript
function isPublicEvent(pathname: string): boolean {
    return pathname === '/evento' || pathname.startsWith('/evento/');
}
```

E na linha que calcula `isPublicPath`, inclua a nova checagem:

```typescript
    const isPublicPath =
        PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
        isPublicEnroll(pathname) ||
        isPublicEvent(pathname);
```

- [ ] **Step 2: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(eventos): libera /evento como rota publica no middleware

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Checkout — suportar inscrito sem `Student`

**Files:**
- Modify: `huios-admin/src/app/api/pagamentos/criar/route.ts`
- Modify: `huios-admin/src/app/matricula/pagamento/[transactionId]/page.tsx`

**Interfaces:**
- Consumes: `EventRegistration` (Task 1) via `FinancialTransaction.eventRegistration`.
- Produces: checkout funcional quando `tx.student` é `null` mas existe `tx.eventRegistration`.

- [ ] **Step 1: Ajustar `api/pagamentos/criar/route.ts`**

Localize o bloco:

```typescript
    const tx = await (prisma as any).financialTransaction.findUnique({
      where: { id: body.transactionId },
      include: { student: true },
    });
    if (!tx) return NextResponse.json({ error: 'Cobrança não encontrada.' }, { status: 404 });
    if (tx.status === 'PAGO') return NextResponse.json({ error: 'Esta cobrança já foi paga.' }, { status: 409 });

    const amountCents = Math.round((tx.amount as number) * 100);
    const customer = {
      name: tx.student?.name || 'Aluno',
      email: tx.student?.email || 'sememail@huios.com.br',
      taxId: tx.student?.cpf || null,
      phone: tx.student?.phone || null,
    };
```

Substitua por:

```typescript
    const tx = await (prisma as any).financialTransaction.findUnique({
      where: { id: body.transactionId },
      include: { student: true, eventRegistration: true },
    });
    if (!tx) return NextResponse.json({ error: 'Cobrança não encontrada.' }, { status: 404 });
    if (tx.status === 'PAGO') return NextResponse.json({ error: 'Esta cobrança já foi paga.' }, { status: 409 });

    const amountCents = Math.round((tx.amount as number) * 100);
    const registration = tx.eventRegistration;
    const customer = {
      name: tx.student?.name || registration?.name || 'Cliente',
      email: tx.student?.email || registration?.email || 'sememail@huios.com.br',
      taxId: tx.student?.cpf || registration?.cpf || null,
      phone: tx.student?.phone || registration?.phone || null,
    };
```

- [ ] **Step 2: Ajustar a página de checkout**

Em `src/app/matricula/pagamento/[transactionId]/page.tsx`, localize:

```typescript
  const tx = await (prisma as any).financialTransaction.findUnique({
    where: { id: transactionId },
    include: { student: { select: { name: true } } },
  });
  if (!tx) notFound();
```

Substitua por:

```typescript
  const tx = await (prisma as any).financialTransaction.findUnique({
    where: { id: transactionId },
    include: { student: { select: { name: true } }, eventRegistration: { select: { name: true } } },
  });
  if (!tx) notFound();
```

E logo abaixo, onde `studentName` é passado ao `PagamentoClient` (`studentName={tx.student?.name ?? ''}`), troque por:

```typescript
            studentName={tx.student?.name ?? tx.eventRegistration?.name ?? ''}
```

- [ ] **Step 3: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/pagamentos/criar/route.ts "src/app/matricula/pagamento/[transactionId]/page.tsx"
git commit -m "fix(pagamentos): checkout funciona sem Student (inscrito externo de evento)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Webhooks — confirmar inscrição de evento quando a cobrança é paga

**Files:**
- Modify: `huios-admin/src/app/api/pagamentos/webhook/pagbank/route.ts`
- Modify: `huios-admin/src/app/api/pagamentos/webhook/santander/route.ts`

**Interfaces:**
- Consumes: `confirmRegistrationForTransaction(transactionId)` (Task 4).
- Produces: `EventRegistration` passa a `CONFIRMADA` automaticamente quando o gateway confirma o pagamento.

- [ ] **Step 1: Ajustar o webhook do PagBank**

Em `src/app/api/pagamentos/webhook/pagbank/route.ts`, adicione o import no topo:

```typescript
import { confirmRegistrationForTransaction } from '@/lib/events';
```

Localize o bloco que marca a transação como paga:

```typescript
      if (status === 'PAID') {
        await (prisma as any).financialTransaction.update({
          where: { id: payment.transactionId },
          data: {
            status: 'PAGO',
            paidAt: new Date(),
            paymentMethod: METHOD_TO_PAYMENTMETHOD[methodType || payment.method] || 'OUTRO',
            reference: chargeId ?? payment.gatewayChargeId,
          },
        });
      }
```

Adicione a chamada logo depois do `update`:

```typescript
      if (status === 'PAID') {
        await (prisma as any).financialTransaction.update({
          where: { id: payment.transactionId },
          data: {
            status: 'PAGO',
            paidAt: new Date(),
            paymentMethod: METHOD_TO_PAYMENTMETHOD[methodType || payment.method] || 'OUTRO',
            reference: chargeId ?? payment.gatewayChargeId,
          },
        });
        await confirmRegistrationForTransaction(payment.transactionId);
      }
```

- [ ] **Step 2: Ajustar o webhook do Santander**

Em `src/app/api/pagamentos/webhook/santander/route.ts`, adicione o import:

```typescript
import { confirmRegistrationForTransaction } from '@/lib/events';
```

Localize:

```typescript
      await (prisma as any).financialTransaction.update({
        where: { id: payment.transactionId },
        data: {
          status: 'PAGO',
          paidAt: new Date(),
          paymentMethod: 'PIX',
          reference: pix?.endToEndId || txid,
        },
      });
```

Substitua por:

```typescript
      await (prisma as any).financialTransaction.update({
        where: { id: payment.transactionId },
        data: {
          status: 'PAGO',
          paidAt: new Date(),
          paymentMethod: 'PIX',
          reference: pix?.endToEndId || txid,
        },
      });
      await confirmRegistrationForTransaction(payment.transactionId);
```

- [ ] **Step 3: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/pagamentos/webhook/pagbank/route.ts src/app/api/pagamentos/webhook/santander/route.ts
git commit -m "feat(eventos): confirma inscricao automaticamente quando o pagamento e aprovado

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Admin — server actions do CRUD de evento, lotes, campos extras e inscritos

**Files:**
- Create: `huios-admin/src/app/eventos/actions.ts`

**Interfaces:**
- Consumes: `generateUniqueEventSlug`, `resolveTicketRemoval` (Tasks 3–4); `requirePermission` (existente); `parseBRLocal`, `parseBRDateAndTime` (existente).
- Produces: `createEvent(prevState, formData)`, `updateEvent(id, prevState, formData)`, `deleteEvent(id)`, `confirmRegistration(registrationId)`, `cancelRegistration(registrationId)`. Consumidos pelas Tasks 10–11 (páginas admin).

- [ ] **Step 1: Criar o arquivo com parsing, validação e `createEvent`/`updateEvent`**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions/server';
import { parseBRLocal, parseBRDateAndTime } from '@/lib/date-utils';
import { generateUniqueEventSlug, resolveTicketRemoval } from '@/lib/events';

export interface TicketInput {
  id?: string;
  name: string;
  description: string | null;
  priceStudent: number;
  priceGeneral: number;
  quantity: number | null;
  salesStart: string | null;
  salesEnd: string | null;
  audience: 'ALL' | 'STUDENT' | 'EXTERNAL';
  isActive: boolean;
  order: number;
}

export interface CustomFieldInput {
  id?: string;
  label: string;
  type: 'TEXT' | 'SELECT' | 'CHECKBOX';
  options: string[];
  required: boolean;
  order: number;
}

function parseEventForm(formData: FormData) {
  const date = formData.get('date') as string;
  const title = ((formData.get('title') as string) || '').trim();
  const courseClassIds = formData.getAll('courseClassIds') as string[];
  const requiresCheckIn = formData.get('requiresCheckIn') === 'on';
  const registrationEnabled = formData.get('registrationEnabled') === 'on';
  const isPublished = formData.get('isPublished') === 'on';

  const num = (key: string): number | null => {
    const raw = formData.get(key) as string;
    if (!raw) return null;
    const v = parseFloat(raw);
    return Number.isNaN(v) ? null : v;
  };
  const int = (key: string, fallback: number | null = null): number | null => {
    const raw = formData.get(key) as string;
    if (!raw) return fallback;
    const v = parseInt(raw, 10);
    return Number.isNaN(v) ? fallback : v;
  };
  const str = (key: string): string | null => {
    const raw = ((formData.get(key) as string) || '').trim();
    return raw || null;
  };

  let tickets: TicketInput[] = [];
  let customFields: CustomFieldInput[] = [];
  try {
    tickets = JSON.parse((formData.get('ticketsJson') as string) || '[]');
    customFields = JSON.parse((formData.get('customFieldsJson') as string) || '[]');
  } catch {
    tickets = [];
    customFields = [];
  }

  return {
    title,
    type: str('type'),
    description: str('description'),
    date: parseBRLocal(date) ?? new Date(),
    startTime: parseBRDateAndTime(date, formData.get('startTime') as string),
    endTime: parseBRDateAndTime(date, formData.get('endTime') as string),
    courseClassIds,
    requiresCheckIn,
    locationName: requiresCheckIn ? str('locationName') : null,
    latitude: requiresCheckIn ? num('latitude') : null,
    longitude: requiresCheckIn ? num('longitude') : null,
    radiusMeters: requiresCheckIn ? (int('radiusMeters', 100) ?? 100) : 100,

    bannerUrl: str('bannerUrl'),
    locationAddress: str('locationAddress'),
    mapUrl: str('mapUrl'),
    meetingPoint: str('meetingPoint'),
    meetingTime: parseBRDateAndTime(date, formData.get('meetingTime') as string),
    returnTime: parseBRDateAndTime(date, formData.get('returnTime') as string),
    transportInfo: str('transportInfo'),
    includedItems: str('includedItems'),
    whatToBring: str('whatToBring'),
    extraNotes: str('extraNotes'),
    organizerName: str('organizerName'),
    organizerPhone: str('organizerPhone'),
    cancellationPolicy: str('cancellationPolicy'),

    registrationEnabled,
    isPublished,
    registrationOpensAt: parseBRLocal(formData.get('registrationOpensAt') as string),
    registrationClosesAt: parseBRLocal(formData.get('registrationClosesAt') as string),
    capacity: int('capacity'),
    reservationHours: int('reservationHours', 24) ?? 24,

    tickets,
    customFields,
  };
}

type EventFormData = ReturnType<typeof parseEventForm>;

function validateEventForm(data: EventFormData): string | null {
  if (!data.title) return 'Informe o título do evento.';
  if (data.registrationEnabled && data.tickets.length === 0) {
    return 'Cadastre ao menos um lote para habilitar a inscrição.';
  }
  for (const t of data.tickets) {
    if (!t.name?.trim()) return 'Todo lote precisa de um nome.';
    if (t.priceStudent < 0 || t.priceGeneral < 0) return 'Preços não podem ser negativos.';
  }
  for (const f of data.customFields) {
    if (!f.label?.trim()) return 'Todo campo extra precisa de um rótulo.';
    if (f.type === 'SELECT' && f.options.length === 0) return `O campo "${f.label}" precisa de ao menos uma opção.`;
  }
  return null;
}

function ticketPayload(t: TicketInput, order: number) {
  return {
    name: t.name,
    description: t.description,
    priceStudent: t.priceStudent,
    priceGeneral: t.priceGeneral,
    quantity: t.quantity,
    salesStart: t.salesStart ? new Date(`${t.salesStart}T00:00:00`) : null,
    salesEnd: t.salesEnd ? new Date(`${t.salesEnd}T23:59:59`) : null,
    audience: t.audience,
    isActive: t.isActive,
    order: t.order ?? order,
  };
}

function customFieldPayload(f: CustomFieldInput, order: number) {
  return { label: f.label, type: f.type, options: f.options, required: f.required, order: f.order ?? order };
}

async function generateEventAttendances(eventId: string, courseClassIds: string[]) {
  let studentIds: string[];
  if (courseClassIds.length > 0) {
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: { in: courseClassIds }, status: 'CURSANDO' },
      select: { studentId: true },
    });
    studentIds = [...new Set(enrollments.map((e) => e.studentId))];
  } else {
    const enrollments = await prisma.enrollment.findMany({
      where: { status: 'CURSANDO' },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    studentIds = enrollments.map((e) => e.studentId);
  }
  if (studentIds.length > 0) {
    await prisma.eventAttendance.createMany({
      data: studentIds.map((studentId) => ({ eventId, studentId, status: 'PENDING' })),
      skipDuplicates: true,
    });
  }
}

export async function createEvent(_prevState: { success: boolean; message: string }, formData: FormData) {
  await requirePermission('eventos.criar');
  const data = parseEventForm(formData);
  const error = validateEventForm(data);
  if (error) return { success: false, message: error };

  try {
    const publicSlug = data.registrationEnabled ? await generateUniqueEventSlug(data.title) : null;

    const event = await (prisma as any).event.create({
      data: {
        title: data.title,
        type: data.type,
        description: data.description,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        courseClasses: data.courseClassIds.length > 0 ? { connect: data.courseClassIds.map((id) => ({ id })) } : undefined,
        requiresCheckIn: data.requiresCheckIn,
        locationName: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMeters: data.radiusMeters,
        bannerUrl: data.bannerUrl,
        locationAddress: data.locationAddress,
        mapUrl: data.mapUrl,
        meetingPoint: data.meetingPoint,
        meetingTime: data.meetingTime,
        returnTime: data.returnTime,
        transportInfo: data.transportInfo,
        includedItems: data.includedItems,
        whatToBring: data.whatToBring,
        extraNotes: data.extraNotes,
        organizerName: data.organizerName,
        organizerPhone: data.organizerPhone,
        cancellationPolicy: data.cancellationPolicy,
        registrationEnabled: data.registrationEnabled,
        isPublished: data.isPublished,
        publicSlug,
        registrationOpensAt: data.registrationOpensAt,
        registrationClosesAt: data.registrationClosesAt,
        capacity: data.capacity,
        reservationHours: data.reservationHours,
        tickets: data.tickets.length > 0
          ? { create: data.tickets.map((t, i) => ticketPayload(t, i)) }
          : undefined,
        customFields: data.customFields.length > 0
          ? { create: data.customFields.map((f, i) => customFieldPayload(f, i)) }
          : undefined,
      },
    });

    if (data.requiresCheckIn) {
      await generateEventAttendances(event.id, data.courseClassIds);
    }

    revalidatePath('/eventos');
    revalidatePath('/aulas');
    redirect(`/eventos/${event.id}/editar`);
  } catch (err: any) {
    console.error('Erro ao criar evento:', err);
    return { success: false, message: 'Erro ao criar o evento.' };
  }
}

async function syncTickets(eventId: string, tickets: TicketInput[]) {
  const existing = await (prisma as any).eventTicket.findMany({
    where: { eventId },
    select: { id: true, _count: { select: { registrations: true } } },
  });
  const submittedIds = new Set(tickets.filter((t) => t.id).map((t) => t.id));

  for (const row of existing) {
    if (submittedIds.has(row.id)) continue;
    const action = resolveTicketRemoval(row._count.registrations > 0);
    if (action === 'DELETE') {
      await (prisma as any).eventTicket.delete({ where: { id: row.id } });
    } else {
      await (prisma as any).eventTicket.update({ where: { id: row.id }, data: { isActive: false } });
    }
  }

  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    const payload = ticketPayload(t, i);
    if (t.id) {
      await (prisma as any).eventTicket.update({ where: { id: t.id }, data: payload });
    } else {
      await (prisma as any).eventTicket.create({ data: { ...payload, eventId } });
    }
  }
}

async function syncCustomFields(eventId: string, fields: CustomFieldInput[]) {
  const existing = await (prisma as any).eventCustomField.findMany({ where: { eventId }, select: { id: true } });
  const submittedIds = new Set(fields.filter((f) => f.id).map((f) => f.id));

  for (const row of existing) {
    if (!submittedIds.has(row.id)) {
      await (prisma as any).eventCustomField.delete({ where: { id: row.id } });
    }
  }

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const payload = customFieldPayload(f, i);
    if (f.id) {
      await (prisma as any).eventCustomField.update({ where: { id: f.id }, data: payload });
    } else {
      await (prisma as any).eventCustomField.create({ data: { ...payload, eventId } });
    }
  }
}

export async function updateEvent(
  id: string,
  _prevState: { success: boolean; message: string },
  formData: FormData,
) {
  await requirePermission('eventos.editar');
  const data = parseEventForm(formData);
  const error = validateEventForm(data);
  if (error) return { success: false, message: error };

  try {
    const current = await (prisma as any).event.findUnique({ where: { id }, select: { publicSlug: true } });
    if (!current) return { success: false, message: 'Evento não encontrado.' };

    let publicSlug = current.publicSlug;
    if (data.registrationEnabled && !publicSlug) {
      publicSlug = await generateUniqueEventSlug(data.title);
    }

    await (prisma as any).event.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        description: data.description,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        courseClasses: { set: data.courseClassIds.map((cid) => ({ id: cid })) },
        requiresCheckIn: data.requiresCheckIn,
        locationName: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMeters: data.radiusMeters,
        bannerUrl: data.bannerUrl,
        locationAddress: data.locationAddress,
        mapUrl: data.mapUrl,
        meetingPoint: data.meetingPoint,
        meetingTime: data.meetingTime,
        returnTime: data.returnTime,
        transportInfo: data.transportInfo,
        includedItems: data.includedItems,
        whatToBring: data.whatToBring,
        extraNotes: data.extraNotes,
        organizerName: data.organizerName,
        organizerPhone: data.organizerPhone,
        cancellationPolicy: data.cancellationPolicy,
        registrationEnabled: data.registrationEnabled,
        isPublished: data.isPublished,
        publicSlug,
        registrationOpensAt: data.registrationOpensAt,
        registrationClosesAt: data.registrationClosesAt,
        capacity: data.capacity,
        reservationHours: data.reservationHours,
      },
    });

    await syncTickets(id, data.tickets);
    await syncCustomFields(id, data.customFields);

    revalidatePath('/eventos');
    revalidatePath(`/eventos/${id}/editar`);
    revalidatePath('/aulas');
    return { success: true, message: 'Evento atualizado com sucesso!' };
  } catch (err: any) {
    console.error('Erro ao atualizar evento:', err);
    return { success: false, message: 'Erro ao atualizar o evento.' };
  }
}

export async function deleteEvent(id: string) {
  await requirePermission('eventos.excluir');
  await (prisma as any).event.delete({ where: { id } });
  revalidatePath('/eventos');
  revalidatePath('/aulas');
}
```

- [ ] **Step 2: Adicionar `confirmRegistration` e `cancelRegistration`**

Adicione ao final do arquivo:

```typescript
export async function confirmRegistration(registrationId: string) {
  await requirePermission('eventos.editar');
  const registration = await (prisma as any).eventRegistration.findUnique({ where: { id: registrationId } });
  if (!registration) throw new Error('Inscrição não encontrada.');

  await (prisma as any).eventRegistration.update({
    where: { id: registrationId },
    data: { status: 'CONFIRMADA', confirmedAt: new Date(), reservedUntil: null },
  });

  if (registration.transactionId) {
    await (prisma as any).financialTransaction.update({
      where: { id: registration.transactionId },
      data: { status: 'PAGO', paidAt: new Date(), paymentMethod: 'DINHEIRO' },
    });
  }

  revalidatePath(`/eventos/${registration.eventId}/inscritos`);
}

export async function cancelRegistration(registrationId: string) {
  await requirePermission('eventos.editar');
  const registration = await (prisma as any).eventRegistration.findUnique({ where: { id: registrationId } });
  if (!registration) throw new Error('Inscrição não encontrada.');

  await (prisma as any).eventRegistration.update({
    where: { id: registrationId },
    data: { status: 'CANCELADA', canceledAt: new Date() },
  });

  if (registration.transactionId) {
    await (prisma as any).financialTransaction.updateMany({
      where: { id: registration.transactionId, status: 'PENDENTE' },
      data: { status: 'CANCELADA' },
    });
  }

  revalidatePath(`/eventos/${registration.eventId}/inscritos`);
}
```

- [ ] **Step 3: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add src/app/eventos/actions.ts
git commit -m "feat(eventos): server actions de CRUD do evento, lotes, campos extras e inscritos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Admin — formulário unificado do evento (`EventForm`)

**Files:**
- Create: `huios-admin/src/app/eventos/EventForm.tsx`

**Interfaces:**
- Consumes: `createEvent`, `updateEvent` (Task 9); `TicketInput`, `CustomFieldInput` (Task 9, tipos exportados).
- Produces: componente `EventForm` usado pelas Tasks 11 (novo/editar).

- [ ] **Step 1: Criar o componente**

```typescript
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../components/Toast/useToast';
import type { TicketInput, CustomFieldInput } from './actions';

const inputCls = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white';
const labelCls = 'text-sm font-bold text-slate-700 dark:text-slate-300';
const sectionTitleCls = 'text-base font-bold text-slate-800 dark:text-slate-200 mb-4';

export interface EventFormValues {
  id?: string;
  title: string;
  type: string;
  description: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  endTime: string;
  courseClassIds: string[];
  requiresCheckIn: boolean;
  locationName: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
  bannerUrl: string;
  locationAddress: string;
  mapUrl: string;
  meetingPoint: string;
  meetingTime: string;
  returnTime: string;
  transportInfo: string;
  includedItems: string;
  whatToBring: string;
  extraNotes: string;
  organizerName: string;
  organizerPhone: string;
  cancellationPolicy: string;
  registrationEnabled: boolean;
  isPublished: boolean;
  registrationOpensAt: string;
  registrationClosesAt: string;
  capacity: string;
  reservationHours: string;
  tickets: TicketInput[];
  customFields: CustomFieldInput[];
}

interface Props {
  mode: 'create' | 'edit';
  initialValues: EventFormValues;
  courseClasses: { id: string; name: string; courseName: string }[];
  action: (prevState: { success: boolean; message: string }, formData: FormData) => Promise<{ success: boolean; message: string } | void>;
}

let ticketSeq = 0;
let fieldSeq = 0;

export default function EventForm({ mode, initialValues, courseClasses, action }: Props) {
  const [state, formAction] = useActionState(action as any, { success: false, message: '' });
  const { toast } = useToast();
  const router = useRouter();

  const [requiresCheckIn, setRequiresCheckIn] = useState(initialValues.requiresCheckIn);
  const [registrationEnabled, setRegistrationEnabled] = useState(initialValues.registrationEnabled);
  const [tickets, setTickets] = useState(initialValues.tickets.map((t) => ({ ...t, _key: `t${ticketSeq++}` })));
  const [customFields, setCustomFields] = useState(initialValues.customFields.map((f) => ({ ...f, _key: `f${fieldSeq++}` })));

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast('success', 'Sucesso', state.message);
        router.push('/eventos');
      } else {
        toast('error', 'Erro', state.message);
      }
    }
  }, [state, toast, router]);

  const addTicket = () => setTickets((prev) => [...prev, {
    id: undefined, name: '', description: null, priceStudent: 0, priceGeneral: 0,
    quantity: null, salesStart: null, salesEnd: null, audience: 'ALL', isActive: true,
    order: prev.length, _key: `t${ticketSeq++}`,
  }]);
  const removeTicket = (key: string) => setTickets((prev) => prev.filter((t) => t._key !== key));
  const updateTicket = (key: string, patch: Partial<TicketInput>) =>
    setTickets((prev) => prev.map((t) => (t._key === key ? { ...t, ...patch } : t)));

  const addField = () => setCustomFields((prev) => [...prev, {
    id: undefined, label: '', type: 'TEXT', options: [], required: false, order: prev.length, _key: `f${fieldSeq++}`,
  }]);
  const removeField = (key: string) => setCustomFields((prev) => prev.filter((f) => f._key !== key));
  const updateField = (key: string, patch: Partial<CustomFieldInput>) =>
    setCustomFields((prev) => prev.map((f) => (f._key === key ? { ...f, ...patch } : f)));

  return (
    <form action={formAction} className="space-y-10">
      <input type="hidden" name="ticketsJson" value={JSON.stringify(tickets.map(({ _key, ...t }) => t))} />
      <input type="hidden" name="customFieldsJson" value={JSON.stringify(customFields.map(({ _key, ...f }) => f))} />

      {/* ───── DADOS ───── */}
      <section>
        <h3 className={sectionTitleCls}>Dados do evento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Título <span className="text-red-500">*</span></label>
            <input name="title" defaultValue={initialValues.title} required className={inputCls} placeholder="Ex: Excursão a Israel 2026" />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Tipo</label>
            <input name="type" defaultValue={initialValues.type} className={inputCls} placeholder="Ex: Excursão, Conferência" />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Data <span className="text-red-500">*</span></label>
            <input type="date" name="date" defaultValue={initialValues.date} required className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Hora de início</label>
            <input type="time" name="startTime" defaultValue={initialValues.startTime} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Hora de término</label>
            <input type="time" name="endTime" defaultValue={initialValues.endTime} className={inputCls} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Descrição</label>
            <textarea name="description" defaultValue={initialValues.description} className={inputCls} rows={3} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Turmas vinculadas (opcional — vazio = evento geral)</label>
            <select name="courseClassIds" multiple defaultValue={initialValues.courseClassIds} className={`${inputCls} h-32`}>
              {courseClasses.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.courseName} — {cc.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input type="checkbox" id="requiresCheckIn" name="requiresCheckIn" defaultChecked={requiresCheckIn}
              onChange={(e) => setRequiresCheckIn(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="requiresCheckIn" className={labelCls}>Exige check-in por localização (uso institucional)</label>
          </div>
          {requiresCheckIn && (
            <>
              <div className="space-y-2">
                <label className={labelCls}>Nome do local</label>
                <input name="locationName" defaultValue={initialValues.locationName} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Raio (metros)</label>
                <input type="number" name="radiusMeters" defaultValue={initialValues.radiusMeters || '100'} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Latitude</label>
                <input name="latitude" defaultValue={initialValues.latitude} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Longitude</label>
                <input name="longitude" defaultValue={initialValues.longitude} className={inputCls} />
              </div>
            </>
          )}
        </div>
      </section>

      {/* ───── LOCAL & LOGÍSTICA ───── */}
      <section>
        <h3 className={sectionTitleCls}>Local & logística</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Banner (URL da imagem)</label>
            <input name="bannerUrl" defaultValue={initialValues.bannerUrl} className={inputCls} placeholder="https://..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Endereço do local</label>
            <input name="locationAddress" defaultValue={initialValues.locationAddress} className={inputCls} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Link do mapa</label>
            <input name="mapUrl" defaultValue={initialValues.mapUrl} className={inputCls} placeholder="https://maps.google.com/..." />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Ponto de encontro</label>
            <input name="meetingPoint" defaultValue={initialValues.meetingPoint} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Horário de encontro</label>
            <input type="time" name="meetingTime" defaultValue={initialValues.meetingTime} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Previsão de retorno</label>
            <input type="time" name="returnTime" defaultValue={initialValues.returnTime} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Transporte</label>
            <input name="transportInfo" defaultValue={initialValues.transportInfo} className={inputCls} placeholder="Ex: Ônibus fretado, saída da sede" />
          </div>
        </div>
      </section>

      {/* ───── INFORMAÇÕES ───── */}
      <section>
        <h3 className={sectionTitleCls}>Informações ao inscrito</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>O que está incluso</label>
            <textarea name="includedItems" defaultValue={initialValues.includedItems} className={inputCls} rows={2} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>O que levar</label>
            <textarea name="whatToBring" defaultValue={initialValues.whatToBring} className={inputCls} rows={2} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Observações</label>
            <textarea name="extraNotes" defaultValue={initialValues.extraNotes} className={inputCls} rows={2} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Responsável pelo evento</label>
            <input name="organizerName" defaultValue={initialValues.organizerName} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>WhatsApp do responsável</label>
            <input name="organizerPhone" defaultValue={initialValues.organizerPhone} className={inputCls} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Política de cancelamento</label>
            <textarea name="cancellationPolicy" defaultValue={initialValues.cancellationPolicy} className={inputCls} rows={2} />
          </div>
        </div>
      </section>

      {/* ───── INSCRIÇÃO ───── */}
      <section>
        <h3 className={sectionTitleCls}>Inscrição</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="registrationEnabled" name="registrationEnabled" defaultChecked={registrationEnabled}
              onChange={(e) => setRegistrationEnabled(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="registrationEnabled" className={labelCls}>Habilitar inscrição (evento pago ou gratuito)</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPublished" name="isPublished" defaultChecked={initialValues.isPublished} className="h-4 w-4" />
            <label htmlFor="isPublished" className={labelCls}>Publicado (visível na página pública)</label>
          </div>
          {registrationEnabled && (
            <>
              <div className="space-y-2">
                <label className={labelCls}>Inscrições abrem em</label>
                <input type="datetime-local" name="registrationOpensAt" defaultValue={initialValues.registrationOpensAt} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Inscrições encerram em</label>
                <input type="datetime-local" name="registrationClosesAt" defaultValue={initialValues.registrationClosesAt} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Vagas totais (vazio = ilimitado)</label>
                <input type="number" name="capacity" defaultValue={initialValues.capacity} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Horas para expirar a reserva não paga</label>
                <input type="number" name="reservationHours" defaultValue={initialValues.reservationHours || '24'} className={inputCls} />
              </div>
            </>
          )}
        </div>
      </section>

      {/* ───── LOTES ───── */}
      {registrationEnabled && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className={sectionTitleCls}>Lotes</h3>
            <button type="button" onClick={addTicket} className="text-primary text-sm font-bold hover:underline">+ Adicionar lote</button>
          </div>
          <div className="space-y-4">
            {tickets.map((t) => (
              <div key={t._key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input placeholder="Nome do lote" value={t.name} onChange={(e) => updateTicket(t._key, { name: e.target.value })} className={inputCls} />
                  <input type="number" placeholder="Preço aluno" value={t.priceStudent} onChange={(e) => updateTicket(t._key, { priceStudent: parseFloat(e.target.value) || 0 })} className={inputCls} />
                  <input type="number" placeholder="Preço não-aluno" value={t.priceGeneral} onChange={(e) => updateTicket(t._key, { priceGeneral: parseFloat(e.target.value) || 0 })} className={inputCls} />
                  <input type="number" placeholder="Vagas (vazio=ilimitado)" value={t.quantity ?? ''} onChange={(e) => updateTicket(t._key, { quantity: e.target.value ? parseInt(e.target.value, 10) : null })} className={inputCls} />
                  <input type="date" placeholder="Início da venda" value={t.salesStart ?? ''} onChange={(e) => updateTicket(t._key, { salesStart: e.target.value || null })} className={inputCls} />
                  <input type="date" placeholder="Fim da venda" value={t.salesEnd ?? ''} onChange={(e) => updateTicket(t._key, { salesEnd: e.target.value || null })} className={inputCls} />
                  <select value={t.audience} onChange={(e) => updateTicket(t._key, { audience: e.target.value as any })} className={inputCls}>
                    <option value="ALL">Todos</option>
                    <option value="STUDENT">Só alunos</option>
                    <option value="EXTERNAL">Só não-alunos</option>
                  </select>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={t.isActive} onChange={(e) => updateTicket(t._key, { isActive: e.target.checked })} className="h-4 w-4" />
                    <span className="text-sm">Ativo</span>
                  </label>
                </div>
                <button type="button" onClick={() => removeTicket(t._key)} className="text-red-500 text-xs font-bold hover:underline">Remover lote</button>
              </div>
            ))}
            {tickets.length === 0 && <p className="text-sm text-slate-400">Nenhum lote cadastrado ainda.</p>}
          </div>
        </section>
      )}

      {/* ───── CAMPOS EXTRAS ───── */}
      {registrationEnabled && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className={sectionTitleCls}>Campos extras</h3>
            <button type="button" onClick={addField} className="text-primary text-sm font-bold hover:underline">+ Adicionar campo</button>
          </div>
          <div className="space-y-4">
            {customFields.map((f) => (
              <div key={f._key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input placeholder="Rótulo (ex: Tamanho da camiseta)" value={f.label} onChange={(e) => updateField(f._key, { label: e.target.value })} className={inputCls} />
                  <select value={f.type} onChange={(e) => updateField(f._key, { type: e.target.value as any })} className={inputCls}>
                    <option value="TEXT">Texto</option>
                    <option value="SELECT">Opções (seleção)</option>
                    <option value="CHECKBOX">Confirmação (sim/não)</option>
                  </select>
                  {f.type === 'SELECT' && (
                    <input placeholder="Opções separadas por vírgula" value={f.options.join(', ')}
                      onChange={(e) => updateField(f._key, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                      className={inputCls} />
                  )}
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={f.required} onChange={(e) => updateField(f._key, { required: e.target.checked })} className="h-4 w-4" />
                    <span className="text-sm">Obrigatório</span>
                  </label>
                </div>
                <button type="button" onClick={() => removeField(f._key)} className="text-red-500 text-xs font-bold hover:underline">Remover campo</button>
              </div>
            ))}
            {customFields.length === 0 && <p className="text-sm text-slate-400">Nenhum campo extra cadastrado.</p>}
          </div>
        </section>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
        <button type="submit" className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
          {mode === 'create' ? 'Criar evento' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add src/app/eventos/EventForm.tsx
git commit -m "feat(eventos): formulario unificado de cadastro/edicao de evento

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: Admin — páginas de lista, criação e edição

**Files:**
- Create: `huios-admin/src/app/eventos/page.tsx`
- Create: `huios-admin/src/app/eventos/novo/page.tsx`
- Create: `huios-admin/src/app/eventos/[id]/editar/page.tsx`

**Interfaces:**
- Consumes: `EventForm`, `EventFormValues` (Task 10); `createEvent`, `updateEvent` (Task 9); `toCivilDateInput`, `toBRTimeInput`, `toBRDateTimeInput` (existentes em `date-utils.ts`).
- Produces: rotas `/eventos`, `/eventos/novo`, `/eventos/[id]/editar`.

- [ ] **Step 1: Criar a lista `/eventos`**

```typescript
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { requirePageAccess } from '@/lib/permissions/page-guard';
import { formatDateBR } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function EventosPage() {
  await requirePageAccess('eventos.visualizar');

  const eventos = await (prisma as any).event.findMany({
    where: { registrationEnabled: true },
    include: {
      registrations: { select: { status: true, amount: true } },
    },
    orderBy: { date: 'desc' },
  });

  return (
    <div className="mx-auto max-w-[1200px] p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Eventos</h2>
          <p className="text-slate-500 dark:text-slate-400">Excursões e eventos extras com inscrição</p>
        </div>
        <Link href="/eventos/novo" className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
          + Novo evento
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-slate-500">
            <tr>
              <th className="p-4 font-semibold">Evento</th>
              <th className="p-4 font-semibold">Data</th>
              <th className="p-4 font-semibold">Situação</th>
              <th className="p-4 font-semibold">Inscritos</th>
              <th className="p-4 font-semibold">Arrecadado</th>
              <th className="p-4 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((evento: any) => {
              const confirmadas = evento.registrations.filter((r: any) => r.status === 'CONFIRMADA');
              const pendentes = evento.registrations.filter((r: any) => r.status === 'PENDENTE');
              const arrecadado = confirmadas.reduce((sum: number, r: any) => sum + r.amount, 0);
              return (
                <tr key={evento.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{evento.title}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{formatDateBR(evento.date)}</td>
                  <td className="p-4">
                    {!evento.isPublished ? (
                      <span className="text-xs font-bold uppercase text-slate-400">Rascunho</span>
                    ) : (
                      <span className="text-xs font-bold uppercase text-emerald-600">Publicado</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{confirmadas.length} confirmadas · {pendentes.length} pendentes</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{fmtBRL(arrecadado)}</td>
                  <td className="p-4 text-right space-x-3 whitespace-nowrap">
                    <Link href={`/eventos/${evento.id}/inscritos`} className="text-primary text-xs font-bold hover:underline">Inscritos</Link>
                    <Link href={`/eventos/${evento.id}/editar`} className="text-primary text-xs font-bold hover:underline">Editar</Link>
                  </td>
                </tr>
              );
            })}
            {eventos.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum evento com inscrição cadastrado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Criar `/eventos/novo`**

```typescript
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { requirePageAccess } from '@/lib/permissions/page-guard';
import { createEvent } from '../actions';
import EventForm, { EventFormValues } from '../EventForm';

export const dynamic = 'force-dynamic';

const emptyValues: EventFormValues = {
  title: '', type: '', description: '', date: '', startTime: '', endTime: '',
  courseClassIds: [], requiresCheckIn: false, locationName: '', latitude: '', longitude: '', radiusMeters: '100',
  bannerUrl: '', locationAddress: '', mapUrl: '', meetingPoint: '', meetingTime: '', returnTime: '', transportInfo: '',
  includedItems: '', whatToBring: '', extraNotes: '', organizerName: '', organizerPhone: '', cancellationPolicy: '',
  registrationEnabled: false, isPublished: false, registrationOpensAt: '', registrationClosesAt: '', capacity: '', reservationHours: '24',
  tickets: [], customFields: [],
};

export default async function NovoEventoPage() {
  await requirePageAccess('eventos.criar');

  const courseClasses = await prisma.courseClass.findMany({
    select: { id: true, name: true, course: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/eventos" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Novo evento</h2>
          <p className="text-slate-500 dark:text-slate-400">Excursão, evento extra ou institucional</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <EventForm
          mode="create"
          initialValues={emptyValues}
          courseClasses={courseClasses.map((cc) => ({ id: cc.id, name: cc.name, courseName: cc.course.name }))}
          action={createEvent}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Criar `/eventos/[id]/editar`**

```typescript
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requirePageAccess } from '@/lib/permissions/page-guard';
import { toCivilDateInput, toBRTimeInput, toBRDateTimeInput } from '@/lib/date-utils';
import { updateEvent } from '../../actions';
import EventForm, { EventFormValues } from '../../EventForm';

export const dynamic = 'force-dynamic';

export default async function EditarEventoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAccess('eventos.editar');
  const { id } = await params;

  const [evento, courseClasses] = await Promise.all([
    (prisma as any).event.findUnique({
      where: { id },
      include: { courseClasses: { select: { id: true } }, tickets: { orderBy: { order: 'asc' } }, customFields: { orderBy: { order: 'asc' } } },
    }),
    prisma.courseClass.findMany({ select: { id: true, name: true, course: { select: { name: true } } }, orderBy: { name: 'asc' } }),
  ]);
  if (!evento) notFound();

  const initialValues: EventFormValues = {
    id: evento.id,
    title: evento.title,
    type: evento.type ?? '',
    description: evento.description ?? '',
    date: toCivilDateInput(evento.date),
    startTime: toBRTimeInput(evento.startTime),
    endTime: toBRTimeInput(evento.endTime),
    courseClassIds: evento.courseClasses.map((cc: any) => cc.id),
    requiresCheckIn: evento.requiresCheckIn,
    locationName: evento.locationName ?? '',
    latitude: evento.latitude?.toString() ?? '',
    longitude: evento.longitude?.toString() ?? '',
    radiusMeters: evento.radiusMeters?.toString() ?? '100',
    bannerUrl: evento.bannerUrl ?? '',
    locationAddress: evento.locationAddress ?? '',
    mapUrl: evento.mapUrl ?? '',
    meetingPoint: evento.meetingPoint ?? '',
    meetingTime: toBRTimeInput(evento.meetingTime),
    returnTime: toBRTimeInput(evento.returnTime),
    transportInfo: evento.transportInfo ?? '',
    includedItems: evento.includedItems ?? '',
    whatToBring: evento.whatToBring ?? '',
    extraNotes: evento.extraNotes ?? '',
    organizerName: evento.organizerName ?? '',
    organizerPhone: evento.organizerPhone ?? '',
    cancellationPolicy: evento.cancellationPolicy ?? '',
    registrationEnabled: evento.registrationEnabled,
    isPublished: evento.isPublished,
    registrationOpensAt: toBRDateTimeInput(evento.registrationOpensAt),
    registrationClosesAt: toBRDateTimeInput(evento.registrationClosesAt),
    capacity: evento.capacity?.toString() ?? '',
    reservationHours: evento.reservationHours?.toString() ?? '24',
    tickets: evento.tickets.map((t: any) => ({
      id: t.id, name: t.name, description: t.description, priceStudent: t.priceStudent, priceGeneral: t.priceGeneral,
      quantity: t.quantity, salesStart: t.salesStart ? toCivilDateInput(t.salesStart) : null, salesEnd: t.salesEnd ? toCivilDateInput(t.salesEnd) : null,
      audience: t.audience, isActive: t.isActive, order: t.order,
    })),
    customFields: evento.customFields.map((f: any) => ({
      id: f.id, label: f.label, type: f.type, options: f.options, required: f.required, order: f.order,
    })),
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/eventos" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editar evento</h2>
          <p className="text-slate-500 dark:text-slate-400">{evento.title}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <EventForm
          mode="edit"
          initialValues={initialValues}
          courseClasses={courseClasses.map((cc) => ({ id: cc.id, name: cc.name, courseName: cc.course.name }))}
          action={updateEvent.bind(null, evento.id)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos. Se `toCivilDateInput`/`toBRDateTimeInput` reclamarem de tipo `Date | null`, confirme a assinatura em `src/lib/date-utils.ts` (já aceitam `string | Date | null | undefined`).

- [ ] **Step 5: Commit**

```bash
git add src/app/eventos/page.tsx src/app/eventos/novo/page.tsx "src/app/eventos/[id]/editar/page.tsx"
git commit -m "feat(eventos): paginas de lista, criacao e edicao de evento

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: Admin — página de inscritos + sidebar + redirecionamento do cadastro antigo

**Files:**
- Create: `huios-admin/src/app/eventos/[id]/inscritos/page.tsx`
- Create: `huios-admin/src/app/eventos/[id]/inscritos/InscritosClient.tsx`
- Modify: `huios-admin/src/app/components/Sidebar.tsx`
- Modify: `huios-admin/src/app/aulas/eventos/novo/page.tsx`
- Delete: `huios-admin/src/app/aulas/eventos/novo/NovoEventoForm.tsx`
- Modify: `huios-admin/src/app/aulas/eventos/actions.ts`
- Modify: `huios-admin/src/app/aulas/CalendarContainer.tsx`

**Interfaces:**
- Consumes: `confirmRegistration`, `cancelRegistration` (Task 9); `exportCSV` (existente).
- Produces: rota `/eventos/[id]/inscritos`; item "Eventos" no menu admin; `/aulas/eventos/novo` redireciona.

- [ ] **Step 1: Criar a página de inscritos (server component)**

```typescript
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requirePageAccess } from '@/lib/permissions/page-guard';
import InscritosClient from './InscritosClient';

export const dynamic = 'force-dynamic';

export default async function InscritosPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAccess('eventos.visualizar');
  const { id } = await params;

  const evento = await (prisma as any).event.findUnique({
    where: { id },
    include: {
      customFields: { orderBy: { order: 'asc' } },
      registrations: {
        include: { ticket: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!evento) notFound();

  return (
    <div className="mx-auto max-w-[1200px] p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/eventos" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Inscritos</h2>
          <p className="text-slate-500 dark:text-slate-400">{evento.title}</p>
        </div>
      </div>

      <InscritosClient
        eventTitle={evento.title}
        customFields={evento.customFields.map((f: any) => ({ id: f.id, label: f.label }))}
        registrations={evento.registrations.map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          isStudent: r.isStudent,
          ticketName: r.ticket.name,
          amount: r.amount,
          status: r.status,
          answers: r.answers ?? {},
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 2: Criar o client component com ações e exportação CSV**

```typescript
'use client';

import { useState, useTransition } from 'react';
import { confirmRegistration, cancelRegistration } from '../../actions';
import { exportCSV } from '@/lib/exportCSV';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CustomField { id: string; label: string }
interface Registration {
  id: string; name: string; email: string; phone: string | null; isStudent: boolean;
  ticketName: string; amount: number; status: string; answers: Record<string, any>; createdAt: string;
}

const statusLabel: Record<string, string> = {
  PENDENTE: 'Pendente', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada',
};

export default function InscritosClient({ eventTitle, customFields, registrations }: {
  eventTitle: string; customFields: CustomField[]; registrations: Registration[];
}) {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(registrations);

  const handleConfirm = (id: string) => startTransition(async () => {
    await confirmRegistration(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'CONFIRMADA' } : r)));
  });

  const handleCancel = (id: string) => startTransition(async () => {
    if (!confirm('Cancelar esta inscrição?')) return;
    await cancelRegistration(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'CANCELADA' } : r)));
  });

  const handleExport = () => {
    const headers = ['Nome', 'E-mail', 'Telefone', 'Tipo', 'Lote', 'Valor', 'Situação', ...customFields.map((f) => f.label)];
    const dataRows = rows.map((r) => [
      r.name, r.email, r.phone || '', r.isStudent ? 'Aluno' : 'Não-aluno', r.ticketName,
      r.amount, statusLabel[r.status] || r.status,
      ...customFields.map((f) => {
        const v = r.answers[f.id];
        return typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : (v ?? '');
      }),
    ]);
    exportCSV(`inscritos-${eventTitle}.csv`, headers, dataRows);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleExport} className="text-primary text-sm font-bold hover:underline">Exportar CSV</button>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-slate-500">
            <tr>
              <th className="p-4 font-semibold">Nome</th>
              <th className="p-4 font-semibold">Contato</th>
              <th className="p-4 font-semibold">Tipo</th>
              <th className="p-4 font-semibold">Lote</th>
              <th className="p-4 font-semibold">Valor</th>
              <th className="p-4 font-semibold">Situação</th>
              <th className="p-4 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-4 font-bold text-slate-900 dark:text-white">{r.name}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{r.email}{r.phone ? ` · ${r.phone}` : ''}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{r.isStudent ? 'Aluno' : 'Não-aluno'}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{r.ticketName}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{fmtBRL(r.amount)}</td>
                <td className="p-4">
                  <span className="text-xs font-bold uppercase">{statusLabel[r.status] || r.status}</span>
                </td>
                <td className="p-4 text-right space-x-3 whitespace-nowrap">
                  {r.status === 'PENDENTE' && (
                    <button disabled={isPending} onClick={() => handleConfirm(r.id)} className="text-emerald-600 text-xs font-bold hover:underline disabled:opacity-50">
                      Confirmar (pago em dinheiro)
                    </button>
                  )}
                  {(r.status === 'PENDENTE' || r.status === 'CONFIRMADA') && (
                    <button disabled={isPending} onClick={() => handleCancel(r.id)} className="text-red-500 text-xs font-bold hover:underline disabled:opacity-50">
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhuma inscrição ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Adicionar "Eventos" ao menu admin**

Em `src/app/components/Sidebar.tsx`, no array `academic`, adicione a entrada depois de `aulas`:

```typescript
    { permission: 'aulas.visualizar', href: '/aulas', icon: 'calendar_today', label: 'Aulas' },
    { permission: 'eventos.visualizar', href: '/eventos', icon: 'confirmation_number', label: 'Eventos' },
```

- [ ] **Step 4: Redirecionar o cadastro simples antigo**

Substitua o conteúdo de `src/app/aulas/eventos/novo/page.tsx` por:

```typescript
import { redirect } from 'next/navigation';

export default function LegacyNovoEventoPage() {
  redirect('/eventos/novo');
}
```

Delete o arquivo `src/app/aulas/eventos/novo/NovoEventoForm.tsx` (não é mais importado por nada).

Em `src/app/aulas/eventos/actions.ts`, remova as funções `createEvent` e `createEventWithRedirect` (deixando apenas `deleteEvent`, que continua usada por `EventDetailsModal.tsx`) — e remova os imports que ficarem sem uso (`parseBRLocal`, `parseBRDateAndTime`, se só eram usados por `createEvent`).

- [ ] **Step 5: Apontar o link do calendário direto para a nova página**

Em `src/app/aulas/CalendarContainer.tsx`, troque:

```typescript
          <CalendarLink href="/aulas/eventos/novo" icon="celebration" tone="event">Novo Evento</CalendarLink>
```

por:

```typescript
          <CalendarLink href="/eventos/novo" icon="celebration" tone="event">Novo Evento</CalendarLink>
```

- [ ] **Step 6: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos, e sem erros de import quebrado por `NovoEventoForm.tsx` removido.

- [ ] **Step 7: Commit**

```bash
git add -A src/app/eventos src/app/components/Sidebar.tsx src/app/aulas/eventos src/app/aulas/CalendarContainer.tsx
git commit -m "feat(eventos): pagina de inscritos, item no menu e migracao do cadastro antigo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 13: Calendário admin — badge de inscrição no evento

**Files:**
- Modify: `huios-admin/src/app/aulas/page.tsx`
- Modify: `huios-admin/src/app/aulas/CalendarContainer.tsx`
- Modify: `huios-admin/src/app/aulas/components/EventDetailsModal.tsx`

**Interfaces:**
- Consumes: `Event.registrationEnabled`, `Event._count.registrations` (Task 1).
- Produces: badge visual + link para `/eventos/[id]/inscritos` no calendário admin.

- [ ] **Step 1: Incluir a contagem de inscrições na busca**

Em `src/app/aulas/page.tsx`, na query `prisma.event.findMany`, troque:

```typescript
    prisma.event.findMany({
      include: { courseClasses: { select: { name: true } } },
      orderBy: { date: 'asc' }
    }),
```

por:

```typescript
    (prisma as any).event.findMany({
      include: {
        courseClasses: { select: { name: true } },
        _count: { select: { registrations: { where: { status: { in: ['PENDENTE', 'CONFIRMADA'] } } } } },
      },
      orderBy: { date: 'asc' }
    }),
```

E no `map` de `initialEvents`, adicione os dois campos novos:

```typescript
  const initialEvents = eventos.map((evento: any) => ({
    id: evento.id,
    title: evento.title,
    type: evento.type,
    description: evento.description,
    date: evento.date,
    startTime: evento.startTime,
    endTime: evento.endTime,
    requiresCheckIn: evento.requiresCheckIn,
    locationName: evento.locationName,
    courseClasses: evento.courseClasses,
    registrationEnabled: evento.registrationEnabled,
    registrationCount: evento._count.registrations,
  }));
```

- [ ] **Step 2: Propagar os campos no `CalendarContainer`**

Em `src/app/aulas/CalendarContainer.tsx`, adicione os dois campos à interface `EventItem`:

```typescript
interface EventItem {
  id: string;
  title: string;
  type: string | null;
  description: string | null;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  requiresCheckIn: boolean;
  locationName: string | null;
  courseClasses: { name: string }[];
  registrationEnabled: boolean;
  registrationCount: number;
}
```

No `EventCard`, adicione um selo quando `registrationEnabled`. Localize a função `EventCard` e substitua o conteúdo do `<div className="min-w-0">` para incluir a contagem:

```typescript
function EventCard({ event, onSelect }: { event: EventItem; onSelect: () => void }) {
  return <button onClick={onSelect} className="flex w-full items-center gap-1 overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/10 p-1.5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"><span className="material-symbols-outlined text-[12px] leading-none text-amber-600">celebration</span><div className="min-w-0"><div className="truncate text-[10px] font-black uppercase tracking-tighter text-amber-600">{event.title}{event.registrationEnabled ? ` · ${event.registrationCount} insc.` : ''}</div><div className="truncate text-[9px] font-medium text-slate-500">{event.startTime ? event.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--'}</div></div></button>;
}
```

- [ ] **Step 3: Adicionar o link "Ver inscritos" no modal de detalhes**

Em `src/app/aulas/components/EventDetailsModal.tsx`, adicione os campos à interface `EventItem`:

```typescript
interface EventItem {
  id: string;
  title: string;
  type: string | null;
  description: string | null;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  requiresCheckIn: boolean;
  locationName: string | null;
  courseClasses: { name: string }[];
  registrationEnabled: boolean;
  registrationCount: number;
}
```

E adicione, imediatamente antes do bloco `{event.description && (...)}`, o link condicional:

```typescript
          {event.registrationEnabled && (
            <EventDetail icon="confirmation_number" title="Inscrição">
              <p className="font-bold text-slate-900 dark:text-white">{event.registrationCount} inscrito(s)</p>
              <a href={`/eventos/${event.id}/inscritos`} className="text-sm text-primary hover:underline">Ver inscritos</a>
            </EventDetail>
          )}
```

- [ ] **Step 4: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add src/app/aulas/page.tsx src/app/aulas/CalendarContainer.tsx src/app/aulas/components/EventDetailsModal.tsx
git commit -m "feat(eventos): badge de inscritos no calendario admin

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 14: Público — server actions de inscrição

**Files:**
- Create: `huios-admin/src/app/evento/actions.ts`

**Interfaces:**
- Consumes: `registerForEvent` (Task 4); `getSession` (existente).
- Produces: `createPublicRegistration(prevState, formData)`, usado pela Task 15 (formulário público).

- [ ] **Step 1: Criar o arquivo**

```typescript
'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { registerForEvent } from '@/lib/events';

export async function createPublicRegistration(
  _prevState: { success: boolean; message: string },
  formData: FormData,
) {
  const eventId = formData.get('eventId') as string;
  const ticketId = formData.get('ticketId') as string;
  const name = ((formData.get('name') as string) || '').trim();
  const email = ((formData.get('email') as string) || '').trim();
  const phone = ((formData.get('phone') as string) || '').trim() || null;
  const cpf = ((formData.get('cpf') as string) || '').trim() || null;

  if (!eventId || !ticketId) return { success: false, message: 'Selecione um lote de inscrição.' };
  if (!name || !email) return { success: false, message: 'Informe nome e e-mail.' };

  const answers: Record<string, string | boolean> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('answer_')) {
      const fieldId = key.replace('answer_', '');
      answers[fieldId] = value === 'true' ? true : value === 'false' ? false : String(value);
    }
  }

  const session = await getSession();
  let studentId: string | null = null;
  let isStudent = false;
  if (session?.role === 'ALUNO') {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { student: true } });
    if (user?.student) {
      studentId = user.student.id;
      isStudent = true;
    }
  }

  const result = await registerForEvent({
    eventId, ticketId, isStudent, studentId, name, email, phone, cpf, answers,
  });

  if (!result.ok) return { success: false, message: result.error };

  if (result.requiresPayment && result.transactionId) {
    redirect(`/matricula/pagamento/${result.transactionId}?retorno=/evento/inscricao/${result.registrationId}`);
  }
  redirect(`/evento/inscricao/${result.registrationId}`);
}
```

- [ ] **Step 2: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add src/app/evento/actions.ts
git commit -m "feat(eventos): server action de inscricao publica

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 15: Público — vitrine, página do evento, formulário de inscrição e comprovante

**Files:**
- Create: `huios-admin/src/app/evento/page.tsx`
- Create: `huios-admin/src/app/evento/[slug]/page.tsx`
- Create: `huios-admin/src/app/evento/[slug]/inscricao/page.tsx`
- Create: `huios-admin/src/app/evento/[slug]/inscricao/InscricaoForm.tsx`
- Create: `huios-admin/src/app/evento/inscricao/[id]/page.tsx`

**Interfaces:**
- Consumes: `isRegistrationOpen`, `isTicketAvailable`, `applicablePrice`, `countOccupiedSlots` (Task 2); `createPublicRegistration` (Task 14); `getSession` (existente); `maskPhone`, `maskCpf` (existente em `@/lib/masks`).
- Produces: rotas públicas `/evento`, `/evento/[slug]`, `/evento/[slug]/inscricao`, `/evento/inscricao/[id]`.

- [ ] **Step 1: Vitrine `/evento`**

```typescript
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { formatDateBR } from '@/lib/date-utils';
import { isRegistrationOpen, countOccupiedSlots } from '@/lib/events';

export const dynamic = 'force-dynamic';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function EventoVitrinePage() {
  const now = new Date();
  const eventos = await (prisma as any).event.findMany({
    where: { isPublished: true, registrationEnabled: true, publicSlug: { not: null } },
    include: { tickets: true, registrations: { select: { status: true, reservedUntil: true } } },
    orderBy: { date: 'asc' },
  });

  const abertos = eventos.filter((evento: any) => {
    const totalOccupied = countOccupiedSlots(evento.registrations, now);
    const hasAvailableTicket = evento.tickets.some((t: any) =>
      t.isActive && (!t.salesEnd || t.salesEnd >= now) && (!t.salesStart || t.salesStart <= now));
    return isRegistrationOpen(evento, { now, totalOccupied, hasAvailableTicket });
  });

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Huios" className="h-12 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-black text-slate-900">Eventos</h1>
          <p className="text-slate-500 text-sm">Excursões e eventos extras do Seminário Huios</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {abertos.map((evento: any) => {
            const menorPreco = Math.min(...evento.tickets.map((t: any) => Math.min(t.priceStudent, t.priceGeneral)));
            return (
              <Link key={evento.id} href={`/evento/${evento.publicSlug}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
                {evento.bannerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={evento.bannerUrl} alt={evento.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-5 space-y-2">
                  <h2 className="font-bold text-slate-900">{evento.title}</h2>
                  <p className="text-sm text-slate-500">{formatDateBR(evento.date)}{evento.locationAddress ? ` · ${evento.locationAddress}` : ''}</p>
                  <p className="text-sm font-bold text-primary">{menorPreco > 0 ? `A partir de ${fmtBRL(menorPreco)}` : 'Gratuito'}</p>
                </div>
              </Link>
            );
          })}
          {abertos.length === 0 && (
            <p className="text-center text-slate-400 col-span-2 py-10">Nenhum evento com inscrição aberta no momento.</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Página do evento `/evento/[slug]`**

```typescript
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { formatDateBR, formatTimeBR } from '@/lib/date-utils';
import { getSession } from '@/lib/auth';
import { isRegistrationOpen, isTicketAvailable, applicablePrice, countOccupiedSlots } from '@/lib/events';

export const dynamic = 'force-dynamic';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function EventoDetalhePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const now = new Date();

  const evento = await (prisma as any).event.findFirst({
    where: { publicSlug: slug, isPublished: true, registrationEnabled: true },
    include: { tickets: { orderBy: { order: 'asc' } }, registrations: { select: { status: true, reservedUntil: true, ticketId: true } } },
  });
  if (!evento) notFound();

  const session = await getSession();
  const isStudent = session?.role === 'ALUNO';

  const totalOccupied = countOccupiedSlots(evento.registrations, now);
  const ticketsWithAvailability = evento.tickets.map((t: any) => {
    const ticketRegs = evento.registrations.filter((r: any) => r.ticketId === t.id);
    const occupied = countOccupiedSlots(ticketRegs, now);
    return { ...t, available: isTicketAvailable(t, { now, isStudent, occupied }) };
  });
  const hasAvailableTicket = ticketsWithAvailability.some((t: any) => t.available);
  const registrationOpen = isRegistrationOpen(evento, { now, totalOccupied, hasAvailableTicket });

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {evento.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={evento.bannerUrl} alt={evento.title} className="w-full h-56 object-cover rounded-2xl" />
        )}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{evento.title}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {formatDateBR(evento.date)}
              {evento.startTime ? ` · ${formatTimeBR(evento.startTime)}` : ''}
            </p>
            {evento.locationAddress && <p className="text-slate-500 text-sm">{evento.locationAddress}</p>}
            {evento.mapUrl && <a href={evento.mapUrl} target="_blank" className="text-primary text-sm hover:underline">Ver no mapa</a>}
          </div>

          {evento.description && <p className="text-slate-700 text-sm leading-relaxed">{evento.description}</p>}

          {(evento.meetingPoint || evento.transportInfo) && (
            <div className="border-t border-slate-100 pt-4 space-y-1">
              <h3 className="text-sm font-bold text-slate-800">Logística</h3>
              {evento.meetingPoint && <p className="text-sm text-slate-600">Ponto de encontro: {evento.meetingPoint}</p>}
              {evento.meetingTime && <p className="text-sm text-slate-600">Horário de encontro: {formatTimeBR(evento.meetingTime)}</p>}
              {evento.returnTime && <p className="text-sm text-slate-600">Previsão de retorno: {formatTimeBR(evento.returnTime)}</p>}
              {evento.transportInfo && <p className="text-sm text-slate-600">{evento.transportInfo}</p>}
            </div>
          )}

          {evento.includedItems && (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-1">O que está incluso</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line">{evento.includedItems}</p>
            </div>
          )}
          {evento.whatToBring && (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-1">O que levar</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line">{evento.whatToBring}</p>
            </div>
          )}
          {evento.extraNotes && (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Observações</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line">{evento.extraNotes}</p>
            </div>
          )}
          {(evento.organizerName || evento.cancellationPolicy) && (
            <div className="border-t border-slate-100 pt-4 space-y-1">
              {evento.organizerName && <p className="text-sm text-slate-600">Organização: {evento.organizerName}{evento.organizerPhone ? ` · ${evento.organizerPhone}` : ''}</p>}
              {evento.cancellationPolicy && <p className="text-sm text-slate-500 italic">{evento.cancellationPolicy}</p>}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Lotes</h3>
            {!registrationOpen && <p className="text-sm text-slate-500">As inscrições para este evento não estão abertas no momento.</p>}
            {registrationOpen && ticketsWithAvailability.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="font-bold text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-500">{fmtBRL(applicablePrice(t, isStudent))}{isStudent ? ' (aluno)' : ''}</p>
                </div>
                {t.available ? (
                  <Link href={`/evento/${slug}/inscricao?ticket=${t.id}`} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
                    Inscrever-se
                  </Link>
                ) : (
                  <span className="text-xs font-bold uppercase text-slate-400">Esgotado</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Formulário de inscrição `/evento/[slug]/inscricao`**

```typescript
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import InscricaoForm from './InscricaoForm';

export const dynamic = 'force-dynamic';

export default async function InscricaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { slug } = await params;
  const { ticket: ticketId } = await searchParams;

  const evento = await (prisma as any).event.findFirst({
    where: { publicSlug: slug, isPublished: true, registrationEnabled: true },
    include: { tickets: true, customFields: { orderBy: { order: 'asc' } } },
  });
  if (!evento) notFound();

  const ticket = evento.tickets.find((t: any) => t.id === ticketId);
  if (!ticket) redirect(`/evento/${slug}`);

  const session = await getSession();
  let prefill = { name: '', email: '', phone: '', cpf: '' };
  if (session?.role === 'ALUNO') {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { student: true } });
    if (user?.student) {
      prefill = { name: user.student.name, email: user.student.email, phone: user.student.phone ?? '', cpf: user.student.cpf ?? '' };
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <InscricaoForm
          eventId={evento.id}
          eventTitle={evento.title}
          ticket={{ id: ticket.id, name: ticket.name, priceStudent: ticket.priceStudent, priceGeneral: ticket.priceGeneral }}
          isStudent={session?.role === 'ALUNO'}
          customFields={evento.customFields.map((f: any) => ({ id: f.id, label: f.label, type: f.type, options: f.options, required: f.required }))}
          prefill={prefill}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Client component `InscricaoForm`**

```typescript
'use client';

import { useActionState } from 'react';
import { maskPhone, maskCpf } from '@/lib/masks';
import { createPublicRegistration } from '../../actions';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all';
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CustomField { id: string; label: string; type: 'TEXT' | 'SELECT' | 'CHECKBOX'; options: string[]; required: boolean }

export default function InscricaoForm({
  eventId, eventTitle, ticket, isStudent, customFields, prefill,
}: {
  eventId: string;
  eventTitle: string;
  ticket: { id: string; name: string; priceStudent: number; priceGeneral: number };
  isStudent: boolean;
  customFields: CustomField[];
  prefill: { name: string; email: string; phone: string; cpf: string };
}) {
  const [state, formAction] = useActionState(createPublicRegistration, { success: false, message: '' });
  const price = isStudent ? ticket.priceStudent : ticket.priceGeneral;

  return (
    <form action={formAction} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="ticketId" value={ticket.id} />

      <div>
        <h1 className="text-xl font-black text-slate-900">Inscrição</h1>
        <p className="text-slate-500 text-sm">{eventTitle} — {ticket.name}</p>
        <p className="text-primary font-bold mt-1">{price > 0 ? fmtBRL(price) : 'Gratuito'}</p>
      </div>

      {state?.message && !state.success && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{state.message}</p>
      )}

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">Nome completo *</label>
          <input name="name" defaultValue={prefill.name} required className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">E-mail *</label>
          <input type="email" name="email" defaultValue={prefill.email} required className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">Telefone</label>
          <input name="phone" defaultValue={prefill.phone} onChange={(e) => { e.target.value = maskPhone(e.target.value); }} className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">CPF</label>
          <input name="cpf" defaultValue={prefill.cpf} onChange={(e) => { e.target.value = maskCpf(e.target.value); }} className={inputCls} />
        </div>
      </div>

      {customFields.length > 0 && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          {customFields.map((f) => (
            <div key={f.id} className="space-y-1">
              <label className="text-sm font-bold text-slate-700">{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'TEXT' && <input name={`answer_${f.id}`} required={f.required} className={inputCls} />}
              {f.type === 'SELECT' && (
                <select name={`answer_${f.id}`} required={f.required} className={inputCls}>
                  <option value="">Selecione...</option>
                  {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
              {f.type === 'CHECKBOX' && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" name={`answer_${f.id}`} value="true" className="h-4 w-4" />
                  <span className="text-sm text-slate-600">Confirmo</span>
                </label>
              )}
            </div>
          ))}
        </div>
      )}

      <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
        {price > 0 ? 'Continuar para pagamento' : 'Confirmar inscrição'}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Comprovante `/evento/inscricao/[id]`**

```typescript
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { formatDateBR } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusLabel: Record<string, string> = {
  PENDENTE: 'Pagamento pendente', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada (vaga liberada)',
};

export default async function ComprovanteInscricaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const registration = await (prisma as any).eventRegistration.findUnique({
    where: { id },
    include: { event: { select: { title: true, date: true } }, ticket: { select: { name: true } } },
  });
  if (!registration) notFound();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-4xl">confirmation_number</span>
        </div>
        <h1 className="text-xl font-black text-slate-900">{registration.event.title}</h1>
        <p className="text-slate-500 text-sm">{formatDateBR(registration.event.date)} · {registration.ticket.name}</p>
        <p className="text-2xl font-black text-slate-900">{registration.amount > 0 ? fmtBRL(registration.amount) : 'Gratuito'}</p>
        <p className="text-sm font-bold uppercase text-primary">{statusLabel[registration.status] || registration.status}</p>
        {registration.status === 'PENDENTE' && (
          <Link href={`/matricula/pagamento/${registration.transactionId}`} className="inline-flex w-full items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
            Ir para o pagamento
          </Link>
        )}
        <p className="text-xs text-slate-400">Código da inscrição: {registration.id}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 7: Commit**

```bash
git add src/app/evento
git commit -m "feat(eventos): vitrine, pagina do evento, formulario de inscricao e comprovante publicos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 16: Portal do aluno — API de eventos e inscrição

**Files:**
- Create: `huios-admin/src/app/api/portal/eventos/route.ts`
- Create: `huios-admin/src/app/api/portal/eventos/inscrever/route.ts`

**Interfaces:**
- Consumes: `registerForEvent` (Task 4); `getSession` (existente); `isRegistrationOpen`, `isTicketAvailable`, `applicablePrice`, `countOccupiedSlots` (Task 2).
- Produces: `GET /api/portal/eventos`, `POST /api/portal/eventos/inscrever`. Consumidos pela Task 17.

- [ ] **Step 1: Criar a rota de listagem**

```typescript
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isRegistrationOpen, isTicketAvailable, applicablePrice, countOccupiedSlots } from '@/lib/events';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { student: true } });
  if (!user?.student) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
  const studentId = user.student.id;

  const now = new Date();
  const eventos = await (prisma as any).event.findMany({
    where: { isPublished: true, registrationEnabled: true },
    include: {
      tickets: { orderBy: { order: 'asc' } },
      registrations: { select: { studentId: true, status: true, reservedUntil: true, ticketId: true, id: true, amount: true, createdAt: true } },
    },
    orderBy: { date: 'asc' },
  });

  const open = eventos
    .map((evento: any) => {
      const totalOccupied = countOccupiedSlots(evento.registrations, now);
      const tickets = evento.tickets.map((t: any) => {
        const ticketRegs = evento.registrations.filter((r: any) => r.ticketId === t.id);
        const occupied = countOccupiedSlots(ticketRegs, now);
        return {
          id: t.id, name: t.name, price: applicablePrice(t, true),
          available: isTicketAvailable(t, { now, isStudent: true, occupied }),
        };
      });
      const hasAvailableTicket = tickets.some((t: any) => t.available);
      const registrationOpen = isRegistrationOpen(evento, { now, totalOccupied, hasAvailableTicket });
      return {
        id: evento.id, title: evento.title, date: evento.date, bannerUrl: evento.bannerUrl,
        registrationOpen, tickets,
      };
    })
    .filter((e: any) => e.registrationOpen);

  const myRegistrations = eventos.flatMap((evento: any) =>
    evento.registrations
      .filter((r: any) => r.studentId === studentId)
      .map((r: any) => ({
        id: r.id, eventTitle: evento.title, eventDate: evento.date,
        status: r.status, amount: r.amount, createdAt: r.createdAt,
      })));

  return NextResponse.json({ open, myRegistrations });
}
```

- [ ] **Step 2: Criar a rota de inscrição**

```typescript
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { registerForEvent } from '@/lib/events';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { student: true } });
  if (!user?.student) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { eventId, ticketId, answers } = body as { eventId?: string; ticketId?: string; answers?: Record<string, string | boolean> };
  if (!eventId || !ticketId) return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });

  const result = await registerForEvent({
    eventId,
    ticketId,
    isStudent: true,
    studentId: user.student.id,
    name: user.student.name,
    email: user.student.email,
    phone: user.student.phone,
    cpf: user.student.cpf,
    answers,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    registrationId: result.registrationId,
    requiresPayment: result.requiresPayment,
    transactionId: result.transactionId,
  });
}
```

- [ ] **Step 3: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/portal/eventos
git commit -m "feat(eventos): API do portal para listar e se inscrever em eventos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 17: Portal do aluno — página `/portal/eventos` e bloco na home

**Files:**
- Create: `huios-admin/src/app/portal/eventos/page.tsx`
- Modify: `huios-admin/src/app/portal/page.tsx`

**Interfaces:**
- Consumes: `GET /api/portal/eventos`, `POST /api/portal/eventos/inscrever` (Task 16).
- Produces: rota `/portal/eventos`; bloco "Próximos eventos" na home do portal.

- [ ] **Step 1: Criar `/portal/eventos`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toLocalDate } from '@/lib/date-utils';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Ticket { id: string; name: string; price: number; available: boolean }
interface OpenEvent { id: string; title: string; date: string; bannerUrl: string | null; tickets: Ticket[] }
interface MyRegistration { id: string; eventTitle: string; eventDate: string; status: string; amount: number; createdAt: string }

const statusLabel: Record<string, string> = {
  PENDENTE: 'Pagamento pendente', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada',
};

export default function PortalEventosPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'abertos' | 'minhas'>('abertos');
  const [open, setOpen] = useState<OpenEvent[]>([]);
  const [mine, setMine] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await fetch('/api/portal/eventos');
      if (res.ok) {
        const data = await res.json();
        setOpen(data.open || []);
        setMine(data.myRegistrations || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const inscrever = async (eventId: string, ticketId: string) => {
    setSubmitting(ticketId);
    try {
      const res = await fetch('/api/portal/eventos/inscrever', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ticketId }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Erro ao se inscrever.'); return; }
      if (data.requiresPayment) {
        router.push(`/matricula/pagamento/${data.transactionId}?retorno=/portal/eventos`);
      } else {
        await load();
        setTab('minhas');
      }
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <div className="p-6 text-slate-400">Carregando...</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-xl font-black text-slate-900 dark:text-white">Eventos</h1>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => setTab('abertos')} className={`px-4 py-2 text-sm font-bold ${tab === 'abertos' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>Eventos abertos</button>
        <button onClick={() => setTab('minhas')} className={`px-4 py-2 text-sm font-bold ${tab === 'minhas' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>Minhas inscrições</button>
      </div>

      {tab === 'abertos' && (
        <div className="space-y-4">
          {open.map((evento) => (
            <div key={evento.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white">{evento.title}</h3>
              <p className="text-sm text-slate-500">{toLocalDate(evento.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <div className="space-y-2">
                {evento.tickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.price > 0 ? fmtBRL(t.price) : 'Gratuito'}</p>
                    </div>
                    <button
                      disabled={!t.available || submitting === t.id}
                      onClick={() => inscrever(evento.id, t.id)}
                      className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {t.available ? (submitting === t.id ? 'Enviando...' : 'Inscrever-se') : 'Esgotado'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {open.length === 0 && <p className="text-center text-slate-400 py-10">Nenhum evento com inscrição aberta no momento.</p>}
        </div>
      )}

      {tab === 'minhas' && (
        <div className="space-y-3">
          {mine.map((r) => (
            <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{r.eventTitle}</p>
                <p className="text-xs text-slate-500">{toLocalDate(r.eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · {r.amount > 0 ? fmtBRL(r.amount) : 'Gratuito'}</p>
              </div>
              <span className="text-xs font-bold uppercase text-primary">{statusLabel[r.status] || r.status}</span>
            </div>
          ))}
          {mine.length === 0 && <p className="text-center text-slate-400 py-10">Você ainda não se inscreveu em nenhum evento.</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Adicionar o bloco "Próximos eventos" na home do portal**

Em `src/app/portal/page.tsx`, adicione o estado (junto aos demais `useState` do topo):

```typescript
  const [openEvents, setOpenEvents] = useState<any[]>([]);
```

No `useEffect` inicial, adicione a chamada:

```typescript
  useEffect(() => {
    fetchLessons();
    fetchExams();
    fetchGrades();
    fetchOpenTurmas();
    fetchOpenEvents();
  }, []);

  const fetchOpenEvents = async () => {
    try {
      const res = await fetch('/api/portal/eventos');
      if (res.ok) {
        const data = await res.json();
        setOpenEvents(data.open || []);
      }
    } catch (e) {
      console.error(e);
    }
  };
```

E, imediatamente **depois** do bloco `{/* Today's Calendar */}` (o `<div>` que termina o card "Calendário de Aulas"), adicione um novo card:

```typescript
          {openEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#135bec]">confirmation_number</span>
                  <h3 className="font-semibold text-slate-900">Próximos Eventos</h3>
                </div>
                <Link href="/portal/eventos" className="text-[#135bec] text-xs font-semibold hover:underline">
                  Ver Todos
                </Link>
              </div>
              <div className="space-y-3">
                {openEvents.slice(0, 3).map((evento: any) => (
                  <Link key={evento.id} href="/portal/eventos" className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-bold text-slate-800">{evento.title}</span>
                    <span className="text-xs text-slate-400">{toLocalDate(evento.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
```

- [ ] **Step 3: Verificar compilação**

Run: `cd huios-admin && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add src/app/portal/eventos src/app/portal/page.tsx
git commit -m "feat(eventos): pagina de eventos do portal e bloco na home do aluno

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 18: Verificação final

**Files:** nenhum arquivo novo — apenas verificação.

- [ ] **Step 1: Rodar toda a suíte de testes**

Run: `cd huios-admin && npm test`
Expected: todos os testes passam, incluindo `src/lib/events.test.mts`, `src/lib/permissions/catalog.test.ts` e `src/lib/permissions/path-access.test.ts`.

- [ ] **Step 2: Build completo do projeto**

Run: `cd huios-admin && npm run build`
Expected: build conclui sem erros. Preste atenção a qualquer aviso sobre `courseClasses` (multi-select) ou tipos `any` — são aceitáveis (o projeto já usa `(prisma as any)` extensivamente), mas erros de tipo não são.

- [ ] **Step 3: Fluxo manual ponta-a-ponta (checklist, requer app rodando com banco local)**

1. Admin cria um evento em `/eventos/novo`: marca "Habilitar inscrição", publica, cadastra 1 lote gratuito e 1 lote pago (preço aluno e não-aluno diferentes) e 1 campo extra obrigatório.
2. Acessa `/evento` (sem login) → evento aparece na vitrine → abre `/evento/[slug]` → lote pago mostra o preço de não-aluno.
3. Se inscreve no lote gratuito preenchendo o campo extra → cai direto no comprovante como CONFIRMADA, sem cobrança.
4. Se inscreve no lote pago → é redirecionado para `/matricula/pagamento/[id]` → após simular pagamento (ou aprovar via Pix sandbox), o comprovante em `/evento/inscricao/[id]` mostra CONFIRMADA.
5. Confere em `/financeiro/contas-a-receber` que a cobrança aparece com a categoria "Eventos" e status PAGO.
6. Loga como aluno, acessa `/portal/eventos`, confere o preço de aluno (diferente do público) e se inscreve pelo lote pago; confirma que aparece em "Minhas inscrições" como pendente até pagar.
7. No admin, `/eventos/[id]/inscritos` lista as duas inscrições (aluno e externo), com as respostas do campo extra e exporta CSV corretamente.
8. No calendário admin (`/aulas`), o evento aparece com o badge de inscritos; no portal, aparece em "Próximos Eventos" na home.
9. Reduz manualmente `reservationHours` para um valor pequeno num evento de teste, cria uma inscrição pendente, avança a data do servidor (ou aguarda) e roda `expireEventReservations()` diretamente — confirma que a inscrição vira EXPIRADA e a cobrança vira CANCELADA, liberando a vaga.

Expected: todos os 9 pontos se comportam como descrito.

- [ ] **Step 4: Commit final (se algum ajuste foi necessário durante a verificação)**

```bash
git add -A
git commit -m "chore(eventos): ajustes finais de verificacao ponta-a-ponta

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

Se nenhum ajuste foi necessário, não há o que commitar — pule este passo.
