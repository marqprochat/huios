# Cadastro de Eventos no Calendário — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que a coordenação cadastre eventos institucionais (formatura, conferência, retiro etc.) que aparecem no mesmo calendário de Aulas — no admin (`/aulas`) e no portal do aluno (`/portal/aulas`) — com vínculo opcional a turmas e check-in de presença opcional por geolocalização.

**Architecture:** Next.js App Router (`huios-admin`). Novos models Prisma `Event` e `EventAttendance` (espelham `Lesson`/`Attendance`). Cadastro via server actions, seguindo o padrão de `src/app/aulas/actions.ts`. O calendário existente (`CalendarContainer`) passa a mesclar aulas e eventos. O portal ganha uma rota de API para listar eventos do aluno e uma rota de check-in geolocalizado auto-contida (não depende do serviço externo `huios-api`).

**Tech Stack:** Next.js 16 (App Router), Prisma 6.19 + PostgreSQL, React 19, Tailwind classes inline (sem CSS modules).

## Global Constraints

- Não existe framework de testes automatizados no projeto (`huios-admin/package.json` não tem `jest`/`vitest`) — verificação é por `npx tsc --noEmit` (checagem de tipos) + teste manual no navegador/API, seguindo a convenção já usada no projeto.
- Migrações de banco seguem o padrão já usado no projeto: `npx prisma db push` (não `prisma migrate dev`).
- `huios-api/prisma/schema.prisma` espelha os models do `huios-admin` mesmo quando não usados por lá (mesmo banco Postgres compartilhado) — mudança de schema deve ser replicada nos dois arquivos, mas `db push` só precisa rodar uma vez (mesmo `DATABASE_URL`).
- Datas/horários devem ser tratados como horário do Brasil (`America/Sao_Paulo`, UTC-3): ao salvar, usar a mesma função `parseLocalToUTC` já usada em `huios-admin/src/app/aulas/actions.ts` (aplica offset `-03:00` fixo a strings de data/hora "soltas" vindas do formulário); ao exibir, usar `toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })` ou `timeZone: 'UTC'` para datas literais (sem horário), exatamente como já é feito em `LessonDetailsModal.tsx` e `date-utils.ts`.
- O projeto tem dois fluxos de check-in coexistindo: `/checkin/[id]` (auto-contido, chama a API Route interna do próprio `huios-admin`) e `/portal/checkin/[id]` (chama o serviço externo `huios-api` via `API_URL`). Para eventos, seguimos o padrão **auto-contido** (rota de API interna do `huios-admin`), evitando introduzir uma dependência nova no `huios-api` — mantém o escopo inteiramente dentro do `huios-admin`, como decidido na spec (`docs/superpowers/specs/2026-07-21-cadastro-eventos-calendario-design.md`).
- Todas as rotas e Server Actions do admin (`/aulas/eventos/...`) não têm guard de role adicional além do que já existe hoje em `/aulas` e `/aulas/novo` (nenhum `getSession()`/checagem de role nessas páginas atualmente) — não introduzir um guard novo que não existe no fluxo de Aulas, para manter consistência.

---

## File Structure

- `huios-admin/prisma/schema.prisma` — add models `Event`, `EventAttendance` + relação `eventAttendances` em `Student`
- `huios-api/prisma/schema.prisma` — mesmo add (espelho)
- `huios-admin/src/app/aulas/eventos/actions.ts` — **novo**, Server Actions `createEvent`, `createEventWithRedirect`, `deleteEvent`
- `huios-admin/src/app/aulas/eventos/novo/page.tsx` — **novo**, página server component (busca turmas)
- `huios-admin/src/app/aulas/eventos/novo/NovoEventoForm.tsx` — **novo**, formulário client component
- `huios-admin/src/app/aulas/components/EventDetailsModal.tsx` — **novo**, modal de detalhes/exclusão (admin)
- `huios-admin/src/app/aulas/CalendarContainer.tsx` — modificar (mescla eventos, botão "Novo Evento", modal)
- `huios-admin/src/app/aulas/page.tsx` — modificar (busca eventos, passa prop nova)
- `huios-admin/src/app/api/portal/eventos/route.ts` — **novo**, GET lista eventos do aluno logado
- `huios-admin/src/app/api/portal/eventos/[id]/checkin/route.ts` — **novo**, POST check-in/check-out geolocalizado
- `huios-admin/src/app/portal/aulas/page.tsx` — modificar (mescla eventos no calendário do portal)
- `huios-admin/src/app/portal/checkin/evento/[id]/page.tsx` — **novo**, tela de check-in do evento (aluno)

---

### Task 1: Models `Event` e `EventAttendance` no Prisma

**Files:**
- Modify: `huios-admin/prisma/schema.prisma`
- Modify: `huios-api/prisma/schema.prisma`

**Interfaces:**
- Produces: `prisma.event` e `prisma.eventAttendance` (client models), campos `Event { id, title, type, description, date, startTime, endTime, courseClasses, requiresCheckIn, locationName, latitude, longitude, radiusMeters, attendances, createdAt, updatedAt }` e `EventAttendance { id, eventId, studentId, status, checkInAt, checkInLat, checkInLong, distance, checkOutAt, checkOutLat, checkOutLong, checkOutDistance, markedById, markedAt, notes }` (com `@@unique([eventId, studentId])`), usados pelas Tasks 2, 5, 6, 7, 8.

- [ ] **Step 1: Adicionar os models em `huios-admin/prisma/schema.prisma`**

Adicionar ao final do arquivo (após o model `CouponRedemption`, última linha `790` `}`):

```prisma

// ============================================================
// EVENTOS INSTITUCIONAIS (calendário)
// ============================================================

model Event {
  id          String   @id @default(uuid())
  title       String
  type        String?  // texto livre: "Formatura", "Conferência", etc.
  description String?

  date      DateTime
  startTime DateTime?
  endTime   DateTime?

  // Vínculo opcional com turmas; vazio (nenhuma relação) = evento geral
  courseClasses CourseClass[]

  // Check-in opcional
  requiresCheckIn Boolean @default(false)
  locationName    String?
  latitude        Float?
  longitude       Float?
  radiusMeters    Int     @default(100)

  attendances EventAttendance[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model EventAttendance {
  id        String @id @default(uuid())
  eventId   String
  event     Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  studentId String
  student   Student @relation(fields: [studentId], references: [id])

  status AttendanceStatus @default(PENDING)

  checkInAt   DateTime?
  checkInLat  Float?
  checkInLong Float?
  distance    Float?

  checkOutAt       DateTime?
  checkOutLat      Float?
  checkOutLong     Float?
  checkOutDistance Float?

  markedById String?
  markedAt   DateTime?
  notes      String?

  @@unique([eventId, studentId])
}
```

E adicionar a relação inversa no model `CourseClass` (após a linha `enrollments Enrollment[]`, dentro do model, por volta da linha 187):

```prisma
  events      Event[]
```

E adicionar a relação inversa no model `Student` (após a linha `studentNotifications StudentNotification[]`, por volta da linha 51):

```prisma
  eventAttendances EventAttendance[]
```

- [ ] **Step 2: Replicar exatamente os mesmos três trechos em `huios-api/prisma/schema.prisma`**

Mesmo bloco `Event`/`EventAttendance` (ao final do arquivo, após `CouponRedemption`), mesma relação `events Event[]` no model `CourseClass` (após `enrollments Enrollment[]`, linha 197 desse arquivo) e mesma relação `eventAttendances EventAttendance[]` no model `Student` (após `studentNotifications StudentNotification[]`, linha 51 desse arquivo).

- [ ] **Step 3: Gerar o client Prisma nos dois projetos**

```bash
cd huios-admin && npx prisma generate
cd ../huios-api && npx prisma generate
```

Expected: ambos terminam com `✔ Generated Prisma Client`, sem erros de schema.

- [ ] **Step 4: Sincronizar o banco (uma vez só, mesmo `DATABASE_URL` dos dois projetos)**

```bash
cd huios-admin && npx prisma db push
```

Expected: saída inclui `The database is now in sync with your Prisma schema` e menciona a criação das tabelas `Event` e `EventAttendance`.

- [ ] **Step 5: Verificar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros novos relacionados a `Event`/`EventAttendance` (o comando pode já ter warnings pré-existentes no projeto — confirme que nenhum novo erro cita esses models).

- [ ] **Step 6: Commit**

```bash
git add huios-admin/prisma/schema.prisma huios-api/prisma/schema.prisma
git commit -m "feat: adiciona models Event e EventAttendance para eventos no calendário"
```

---

### Task 2: Server Actions de eventos (criar / excluir)

**Files:**
- Create: `huios-admin/src/app/aulas/eventos/actions.ts`

**Interfaces:**
- Consumes: `prisma.event`, `prisma.eventAttendance`, `prisma.enrollment` (Task 1).
- Produces: `createEvent(formData: FormData): Promise<Event>`, `createEventWithRedirect(formData: FormData): Promise<void>` (redireciona para `/aulas`), `deleteEvent(id: string): Promise<{ success: true }>`. Consumidas pelas Tasks 3 (form) e 4 (modal, `deleteEvent`).

- [ ] **Step 1: Criar o arquivo**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

// Aplica o fuso horário do Brasil (America/Sao_Paulo, UTC-3 fixo) a uma string
// de data/hora "solta" vinda do formulário (sem timezone), igual ao padrão
// já usado em src/app/aulas/actions.ts para aulas.
function parseLocalToUTC(localStr: string): Date {
  if (!localStr) return new Date();
  if (localStr.includes('Z') || localStr.includes('+') || (localStr.includes('-') && localStr.length > 10 && localStr.lastIndexOf('-') > 10)) {
    return new Date(localStr);
  }
  return new Date(localStr + (localStr.includes('T') ? ':00.000-03:00' : 'T12:00:00.000-03:00'));
}

export async function createEvent(formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const type = (formData.get('type') as string) || null;
    const description = (formData.get('description') as string) || null;
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const courseClassIds = formData.getAll('courseClassIds') as string[];
    const requiresCheckIn = formData.get('requiresCheckIn') === 'on';
    const locationName = (formData.get('locationName') as string) || null;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const radiusMeters = formData.get('radiusMeters') as string;

    const event = await prisma.event.create({
      data: {
        title,
        type,
        description,
        date: parseLocalToUTC(date),
        startTime: startTime ? parseLocalToUTC(`${date}T${startTime}`) : null,
        endTime: endTime ? parseLocalToUTC(`${date}T${endTime}`) : null,
        courseClasses: courseClassIds.length > 0 ? { connect: courseClassIds.map(id => ({ id })) } : undefined,
        requiresCheckIn,
        locationName: requiresCheckIn ? locationName : null,
        latitude: requiresCheckIn && latitude ? parseFloat(latitude) : null,
        longitude: requiresCheckIn && longitude ? parseFloat(longitude) : null,
        radiusMeters: requiresCheckIn ? (parseInt(radiusMeters) || 100) : 100
      }
    });

    if (requiresCheckIn) {
      let studentIds: string[];

      if (courseClassIds.length > 0) {
        const enrollments = await prisma.enrollment.findMany({
          where: { classId: { in: courseClassIds }, status: 'CURSANDO' },
          select: { studentId: true }
        });
        studentIds = [...new Set(enrollments.map(e => e.studentId))];
      } else {
        const enrollments = await prisma.enrollment.findMany({
          where: { status: 'CURSANDO' },
          select: { studentId: true },
          distinct: ['studentId']
        });
        studentIds = enrollments.map(e => e.studentId);
      }

      if (studentIds.length > 0) {
        await prisma.eventAttendance.createMany({
          data: studentIds.map(studentId => ({
            eventId: event.id,
            studentId,
            status: 'PENDING'
          })),
          skipDuplicates: true
        });
      }
    }

    revalidatePath('/aulas');
    return event;
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error('Failed to create event');
  }
}

export async function createEventWithRedirect(formData: FormData) {
  await createEvent(formData);
  redirect('/aulas');
}

export async function deleteEvent(id: string) {
  try {
    await prisma.event.delete({ where: { id } });
    revalidatePath('/aulas');
    return { success: true };
  } catch (error) {
    console.error('Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
}
```

- [ ] **Step 2: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros no arquivo novo.

- [ ] **Step 3: Commit**

```bash
git add huios-admin/src/app/aulas/eventos/actions.ts
git commit -m "feat: server actions para criar e excluir eventos"
```

---

### Task 3: Formulário de cadastro de evento (admin)

**Files:**
- Create: `huios-admin/src/app/aulas/eventos/novo/NovoEventoForm.tsx`
- Create: `huios-admin/src/app/aulas/eventos/novo/page.tsx`

**Interfaces:**
- Consumes: `createEventWithRedirect` (Task 2), `prisma.courseClass`.
- Produces: página em `/aulas/eventos/novo` que envia um `<form>` para `createEventWithRedirect`, com campos `title`, `type`, `date`, `startTime`, `endTime`, `courseClassIds[]`, `requiresCheckIn`, `locationName`, `latitude`, `longitude`, `radiusMeters`, `description` — os mesmos nomes lidos por `createEvent` na Task 2.

- [ ] **Step 1: Criar `NovoEventoForm.tsx` (client component)**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CourseClassOption {
  id: string;
  name: string;
  courseName: string;
}

interface NovoEventoFormProps {
  courseClasses: CourseClassOption[];
  today: string;
  action: (formData: FormData) => void | Promise<void>;
}

export default function NovoEventoForm({ courseClasses, today, action }: NovoEventoFormProps) {
  const [requiresCheckIn, setRequiresCheckIn] = useState(false);

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Título *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            placeholder="Ex: Formatura 2026"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Tipo
          </label>
          <input
            type="text"
            id="type"
            name="type"
            placeholder="Ex: Formatura, Conferência, Retiro"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
            Turmas (opcional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
            {courseClasses.map((cc) => (
              <label key={cc.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group">
                <div className="relative flex items-center mt-0.5">
                  <input
                    type="checkbox"
                    name="courseClassIds"
                    value={cc.id}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary transition-all"
                  />
                  <span className="material-symbols-outlined absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none text-base font-bold">
                    check
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                    {cc.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{cc.courseName}</span>
                </div>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Nenhuma turma selecionada = evento geral, visível a todos os alunos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Data *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              required
              defaultValue={today}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label htmlFor="startTime" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Horário Início
            </label>
            <input
              type="time"
              id="startTime"
              name="startTime"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label htmlFor="endTime" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Horário Término
            </label>
            <input
              type="time"
              id="endTime"
              name="endTime"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="requiresCheckIn"
              checked={requiresCheckIn}
              onChange={(e) => setRequiresCheckIn(e.target.checked)}
              className="h-5 w-5 cursor-pointer rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary transition-all"
            />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Requer check-in de presença?</span>
          </label>

          {requiresCheckIn && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="locationName" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Nome do local
                </label>
                <input
                  type="text"
                  id="locationName"
                  name="locationName"
                  placeholder="Ex: Auditório Principal"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="radiusMeters" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Raio de tolerância (m)
                </label>
                <input
                  type="number"
                  id="radiusMeters"
                  name="radiusMeters"
                  defaultValue={100}
                  min={10}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="latitude" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Latitude
                </label>
                <input
                  type="text"
                  id="latitude"
                  name="latitude"
                  placeholder="Ex: -23.55052"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Longitude
                </label>
                <input
                  type="text"
                  id="longitude"
                  name="longitude"
                  placeholder="Ex: -46.633308"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Observações
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            placeholder="Observações opcionais sobre o evento"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
        <Link
          href="/aulas"
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          Criar Evento
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Criar `page.tsx` (server component)**

```tsx
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { createEventWithRedirect } from '../actions';
import NovoEventoForm from './NovoEventoForm';

export default async function NovoEventoPage() {
  const courseClasses = await prisma.courseClass.findMany({
    select: { id: true, name: true, course: { select: { name: true } } },
    orderBy: { name: 'asc' }
  });

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/aulas" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Novo Evento</h2>
          <p className="text-slate-500 dark:text-slate-400">Cadastre um evento institucional (formatura, conferência, etc.)</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <NovoEventoForm
          courseClasses={courseClasses.map(cc => ({ id: cc.id, name: cc.name, courseName: cc.course.name }))}
          today={today}
          action={createEventWithRedirect}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros novos nos dois arquivos.

- [ ] **Step 4: Testar manualmente no navegador**

```bash
cd huios-admin && npm run dev
```

Abrir `http://localhost:3000/aulas/eventos/novo`. Preencher título "Formatura Teste", tipo "Formatura", data de hoje, marcar "Requer check-in de presença?" (deve revelar os campos de localização), preencher latitude/longitude/raio, e enviar. Expected: redireciona para `/aulas` sem erro. Repetir sem marcar turma nenhuma e sem check-in, confirmando que também salva.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/src/app/aulas/eventos/novo
git commit -m "feat: formulário de cadastro de evento no admin"
```

---

### Task 4: Modal de detalhes do evento (admin)

**Files:**
- Create: `huios-admin/src/app/aulas/components/EventDetailsModal.tsx`

**Interfaces:**
- Consumes: `deleteEvent` (Task 2).
- Produces: componente `EventDetailsModal({ event, onClose, onDelete })`, consumido pela Task 5 (`CalendarContainer`). Espera `event: { id, title, type, description, date, startTime, endTime, requiresCheckIn, locationName, courseClasses: { name }[] }`.

- [ ] **Step 1: Criar o arquivo**

```tsx
'use client';

import { deleteEvent } from '../eventos/actions';

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
}

interface EventDetailsModalProps {
  event: EventItem;
  onClose: () => void;
  onDelete?: () => void;
}

export default function EventDetailsModal({ event, onClose, onDelete }: EventDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="h-32 p-8 flex items-end justify-between bg-amber-500 relative">
          <div className="z-10">
            <div className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">
              {event.type || 'Evento'}
            </div>
            <h3 className="text-2xl font-black text-white">{event.title}</h3>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors z-20">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data e Horário</div>
              <div className="text-slate-900 dark:text-white font-bold">
                {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </div>
              <div className="text-sm text-slate-500">
                {event.startTime ? new Date(event.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--'}
                {event.endTime ? ` às ${new Date(event.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <span className="material-symbols-outlined text-primary">layers</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turmas</div>
              <div className="text-slate-900 dark:text-white font-bold">
                {event.courseClasses.length > 0 ? event.courseClasses.map(cc => cc.name).join(', ') : 'Evento geral (todos os alunos)'}
              </div>
            </div>
          </div>

          {event.requiresCheckIn && (
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <span className="material-symbols-outlined text-primary">map</span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Localização (check-in)</div>
                <div className="text-slate-900 dark:text-white font-bold">{event.locationName || 'Não definido'}</div>
              </div>
            </div>
          )}

          {event.description && (
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <span className="material-symbols-outlined text-primary">notes</span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observações</div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 italic leading-relaxed">
                  "{event.description}"
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
            <button
              onClick={async () => {
                if (confirm('Tem certeza que deseja excluir este evento?')) {
                  await deleteEvent(event.id);
                  if (onDelete) onDelete();
                  onClose();
                }
              }}
              className="text-slate-300 hover:text-red-500 transition-colors"
            >
              <span className="material-symbols-outlined">delete_forever</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros no arquivo novo (o import de `deleteEvent` só resolve de fato depois da Task 5 ligar este componente ao `CalendarContainer`, mas o arquivo em si já deve compilar isoladamente).

- [ ] **Step 3: Commit**

```bash
git add huios-admin/src/app/aulas/components/EventDetailsModal.tsx
git commit -m "feat: modal de detalhes do evento no admin"
```

---

### Task 5: Mesclar eventos no calendário do admin (`/aulas`)

**Files:**
- Modify: `huios-admin/src/app/aulas/CalendarContainer.tsx`
- Modify: `huios-admin/src/app/aulas/page.tsx`

**Interfaces:**
- Consumes: `EventDetailsModal` (Task 4), `prisma.event` (Task 1).
- Produces: `CalendarContainer` passa a aceitar a prop `initialEvents?: EventItem[]`, usada pela Task 7 como referência de shape (mesmo formato retornado por `/api/portal/eventos`, menos os campos exclusivos de `Attendance`).

- [ ] **Step 1: Substituir todo o conteúdo de `huios-admin/src/app/aulas/CalendarContainer.tsx`**

```tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { deleteLesson } from './actions';
import LessonMaterials from './components/LessonMaterials';
import { toLocalDate } from '@/lib/date-utils';
import LessonDetailsModal from './components/LessonDetailsModal';
import EventDetailsModal from './components/EventDetailsModal';

interface Lesson {
  id: string;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  locationName: string | null;
  description: string | null;
  disciplines: {
    name: string;
    courseClasses: {
      name: string;
    }[]
  }[];
}

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
}

interface CalendarProps {
  initialLessons: Lesson[];
  initialEvents?: EventItem[];
  defaultLocationName?: string;
}

export default function CalendarContainer({ initialLessons, initialEvents = [], defaultLocationName }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const lessons = useMemo(() => {
    return initialLessons.map(l => ({
      ...l,
      date: toLocalDate(l.date),
      startTime: l.startTime ? new Date(l.startTime) : null,
      endTime: l.endTime ? new Date(l.endTime) : null,
      description: l.description,
    }));
  }, [initialLessons]);

  const events = useMemo(() => {
    return initialEvents.map(e => ({
      ...e,
      date: toLocalDate(e.date),
      startTime: e.startTime ? new Date(e.startTime) : null,
      endTime: e.endTime ? new Date(e.endTime) : null,
    }));
  }, [initialEvents]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);

    const days = [];

    // Previous month padding
    const prevMonthTotalDays = daysInMonth(year, month - 1);
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        day: prevMonthTotalDays - i,
        currentMonth: false,
        date: new Date(year, month - 1, prevMonthTotalDays - i)
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        currentMonth: true,
        date: new Date(year, month, i)
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        currentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }

    return days;
  }, [currentDate]);

  const getLessonsForDay = (date: Date) => {
    return lessons.filter(l =>
      l.date.getDate() === date.getDate() &&
      l.date.getMonth() === date.getMonth() &&
      l.date.getFullYear() === date.getFullYear()
    );
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(e =>
      e.date.getDate() === date.getDate() &&
      e.date.getMonth() === date.getMonth() &&
      e.date.getFullYear() === date.getFullYear()
    );
  };

  // Color generator based on discipline name
  const getDisciplineColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500',
      'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white capitalize">{monthName}</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie o calendário acadêmico e materiais</p>
        </div>

        <div className="flex items-center gap-2">
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 flex items-center mr-4">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              Hoje
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>

          <Link
            href="/aulas/lote"
            className="bg-primary/10 text-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/20 transition-all border border-primary/20"
          >
            <span className="material-symbols-outlined text-sm">layers</span>
            Cadastro em Lote
          </Link>
          <Link
            href="/aulas/novo"
            className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Aula Única
          </Link>
          <Link
            href="/aulas/eventos/novo"
            className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-amber-500/20"
          >
            <span className="material-symbols-outlined text-sm">celebration</span>
            Novo Evento
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 grid-rows-6 h-[800px] md:h-[900px]">
          {calendarDays.map((calDay, i) => {
            const dayLessons = getLessonsForDay(calDay.date);
            const dayEvents = getEventsForDay(calDay.date);
            const isToday = new Date().toDateString() === calDay.date.toDateString();

            return (
              <div
                key={i}
                className={`border-r border-b border-slate-50 dark:border-slate-800/50 p-2 overflow-y-auto last:border-r-0 ${
                  !calDay.currentMonth ? 'bg-slate-50/50 dark:bg-slate-900/10' : ''
                }`}
              >
                <div className={`flex items-center justify-center w-7 h-7 text-xs font-bold mb-2 ml-auto rounded-full ${
                  isToday ? 'bg-primary text-white shadow-lg shadow-primary/40' : 'text-slate-500'
                } ${!calDay.currentMonth && !isToday ? 'opacity-30' : ''}`}>
                  {calDay.day}
                </div>

                <div className="space-y-1">
                  {dayLessons.map(lesson => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`w-full text-left p-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] group overflow-hidden ${getDisciplineColor(lesson.disciplines[0]?.name || '')}/10 border border-transparent hover:border-current`}
                      style={{ borderLeftColor: getDisciplineColor(lesson.disciplines[0]?.name || '').replace('bg-', '') }}
                    >
                      <div className={`text-[10px] font-black uppercase tracking-tighter truncate ${getDisciplineColor(lesson.disciplines[0]?.name || '').replace('bg-', 'text-')}`}>
                        {lesson.disciplines[0]?.name}
                        {lesson.disciplines.length > 1 && ` (+${lesson.disciplines.length - 1})`}
                      </div>
                      <div className="text-[9px] text-slate-500 font-medium truncate">
                        {lesson.startTime ? lesson.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                    </button>
                  ))}
                  {dayEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full text-left p-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] group overflow-hidden bg-amber-500/10 border border-amber-500/30 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-amber-600 text-[12px] leading-none">celebration</span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-tighter truncate text-amber-600">
                          {event.title}
                        </div>
                        <div className="text-[9px] text-slate-500 font-medium truncate">
                          {event.startTime ? event.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLesson && (
        <LessonDetailsModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onDelete={() => window.location.reload()}
          defaultLocationName={defaultLocationName}
        />
      )}

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={() => window.location.reload()}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Substituir todo o conteúdo de `huios-admin/src/app/aulas/page.tsx`**

```tsx
import prisma from '@/lib/prisma';
import CalendarContainer from './CalendarContainer';

export default async function AulasPage() {
  const aulas = await prisma.lesson.findMany({
    include: {
      disciplines: {
        include: {
          courseClasses: true
        }
      },
      _count: {
        select: {
          attendances: true
        }
      }
    },
  });

  const eventos = await prisma.event.findMany({
    include: {
      courseClasses: { select: { name: true } }
    },
    orderBy: { date: 'asc' }
  });

  const settings = await prisma.systemSettings.findFirst();
  const defaultLocationName = settings?.locationName || undefined;

  // Convert to plain objects for client component
  const initialLessons = aulas.map(aula => ({
    id: aula.id,
    date: aula.date,
    startTime: aula.startTime,
    endTime: aula.endTime,
    locationName: aula.locationName,
    description: aula.description,
    disciplines: aula.disciplines.map(d => ({
      name: d.name,
      courseClasses: d.courseClasses.map(cc => ({ name: cc.name }))
    }))
  }));

  const initialEvents = eventos.map(evento => ({
    id: evento.id,
    title: evento.title,
    type: evento.type,
    description: evento.description,
    date: evento.date,
    startTime: evento.startTime,
    endTime: evento.endTime,
    requiresCheckIn: evento.requiresCheckIn,
    locationName: evento.locationName,
    courseClasses: evento.courseClasses.map(cc => ({ name: cc.name }))
  }));

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
      <CalendarContainer initialLessons={initialLessons} initialEvents={initialEvents} defaultLocationName={defaultLocationName} />
    </div>
  );
}
```

- [ ] **Step 3: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros novos nos dois arquivos.

- [ ] **Step 4: Testar manualmente no navegador**

Com `npm run dev` rodando, abrir `/aulas`. O evento criado na Task 3 deve aparecer no dia correto com ícone `celebration` e fundo âmbar, distinto visualmente das aulas. Clicar nele deve abrir o `EventDetailsModal` com os dados corretos. Clicar em "Novo Evento" no cabeçalho deve levar para `/aulas/eventos/novo`. No modal, clicar no ícone de lixeira e confirmar deve excluir o evento e recarregar a página, removendo-o do calendário.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/src/app/aulas/CalendarContainer.tsx huios-admin/src/app/aulas/page.tsx
git commit -m "feat: mescla eventos no calendário de aulas do admin"
```

---

### Task 6: API do portal — listar eventos e check-in

**Files:**
- Create: `huios-admin/src/app/api/portal/eventos/route.ts`
- Create: `huios-admin/src/app/api/portal/eventos/[id]/checkin/route.ts`

**Interfaces:**
- Consumes: `getSession()` de `@/lib/auth`, `prisma.event`, `prisma.eventAttendance`, `prisma.systemSettings` (Task 1).
- Produces: `GET /api/portal/eventos` → array de `Event` (com `courseClasses: {name}[]` e `attendances: EventAttendance[]` filtrado pelo aluno logado); `POST /api/portal/eventos/[id]/checkin` → `{ attendance, distance, isWithinRadius, message }` ou `{ error }`. Consumidos pelas Tasks 7 e 8.

- [ ] **Step 1: Criar `huios-admin/src/app/api/portal/eventos/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: { student: true }
        });

        if (!user?.student) {
            return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
        }

        const studentId = user.student.id;

        const enrollments = await prisma.enrollment.findMany({
            where: { studentId, status: 'CURSANDO' },
            select: { classId: true }
        });
        const classIds = enrollments.map(e => e.classId);

        const events = await prisma.event.findMany({
            where: {
                OR: [
                    { courseClasses: { none: {} } },
                    { courseClasses: { some: { id: { in: classIds } } } }
                ]
            },
            include: {
                courseClasses: { select: { name: true } },
                attendances: { where: { studentId } }
            },
            orderBy: { date: 'asc' }
        });

        return NextResponse.json(events);
    } catch (error) {
        console.error('Portal eventos error:', error);
        return NextResponse.json({ error: 'Erro ao carregar eventos' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Criar `huios-admin/src/app/api/portal/eventos/[id]/checkin/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: { student: true }
        });

        if (!user?.student) {
            return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
        }

        const eventId = resolvedParams.id;
        const studentId = user.student.id;
        const body = await request.json();
        const { latitude, longitude, action = 'checkin' } = body;

        if (!latitude || !longitude) {
            return NextResponse.json({ error: 'Localização não fornecida' }, { status: 400 });
        }

        const event = await prisma.event.findUnique({ where: { id: eventId } });

        if (!event) {
            return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
        }

        if (!event.requiresCheckIn) {
            return NextResponse.json({ error: 'Este evento não requer check-in' }, { status: 400 });
        }

        const existingAttendance = await prisma.eventAttendance.findUnique({
            where: { eventId_studentId: { eventId, studentId } }
        });

        if (!existingAttendance) {
            return NextResponse.json({ error: 'Você não está habilitado para check-in neste evento' }, { status: 403 });
        }

        const now = new Date();
        const start = event.startTime ? new Date(event.startTime) : null;
        const end = event.endTime ? new Date(event.endTime) : null;

        let bufferMinutes = 30;
        try {
            const settings = await prisma.systemSettings.findFirst();
            if (settings?.checkInBufferMinutes != null) {
                bufferMinutes = settings.checkInBufferMinutes;
            }
        } catch (e) {
            console.error("Could not read checkin config, using default 30 min", e);
        }

        const earlyBuffer = bufferMinutes * 60 * 1000;
        const lateBuffer = bufferMinutes * 60 * 1000;

        if (start && end) {
            if (action === 'checkin') {
                const checkInStart = new Date(start.getTime() - earlyBuffer);
                const checkInEnd = new Date(start.getTime() + lateBuffer);

                if (now < checkInStart) {
                    return NextResponse.json({
                        error: `Check-in não permitido ainda. Horário de check-in inicia às ${checkInStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}.`
                    }, { status: 400 });
                }

                if (now > checkInEnd) {
                    return NextResponse.json({
                        error: `Passou do horário de check-in. O prazo era até as ${checkInEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}.`
                    }, { status: 400 });
                }
            } else if (action === 'checkout') {
                const checkOutStart = new Date(end.getTime());
                const checkOutEnd = new Date(end.getTime() + lateBuffer);

                if (now < checkOutStart) {
                    return NextResponse.json({
                        error: `O evento ainda não terminou. O check-out só é permitido após as ${checkOutStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}.`
                    }, { status: 400 });
                }

                if (now > checkOutEnd) {
                    return NextResponse.json({
                        error: `Tempo de check-out esgotado. Era apenas até as ${checkOutEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}.`
                    }, { status: 400 });
                }
            }
        }

        if (!event.latitude || !event.longitude) {
            return NextResponse.json({ error: 'Evento não possui localização definida. Procure a secretaria.' }, { status: 400 });
        }

        const distance = calculateDistance(
            event.latitude,
            event.longitude,
            parseFloat(latitude),
            parseFloat(longitude)
        );

        const isWithinRadius = distance <= event.radiusMeters;

        if (!isWithinRadius) {
            return NextResponse.json({
                error: `Você está fora do local do evento. Aproxime-se e tente novamente. Tolerância: ${event.radiusMeters}m.`
            }, { status: 400 });
        }

        let attendance;

        if (action === 'checkin') {
            attendance = await prisma.eventAttendance.update({
                where: { eventId_studentId: { eventId, studentId } },
                data: {
                    status: 'PRESENT',
                    checkInAt: new Date(),
                    checkInLat: parseFloat(latitude),
                    checkInLong: parseFloat(longitude),
                    distance: Math.round(distance)
                }
            });
        } else {
            if (!existingAttendance.checkInAt) {
                return NextResponse.json({ error: 'Você não fez check-in neste evento para poder fazer check-out.' }, { status: 400 });
            }

            attendance = await prisma.eventAttendance.update({
                where: { eventId_studentId: { eventId, studentId } },
                data: {
                    checkOutAt: new Date(),
                    checkOutLat: parseFloat(latitude),
                    checkOutLong: parseFloat(longitude),
                    checkOutDistance: Math.round(distance)
                }
            });
        }

        return NextResponse.json({
            attendance,
            distance: Math.round(distance),
            isWithinRadius: true,
            message: action === 'checkin' ? 'Check-in realizado com sucesso!' : 'Check-out realizado com sucesso!'
        });

    } catch (error) {
        console.error('Portal event checkin error:', error);
        return NextResponse.json({ error: 'Erro interno ao realizar registro de presença' }, { status: 500 });
    }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
```

- [ ] **Step 3: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros novos nos dois arquivos.

- [ ] **Step 4: Testar manualmente com o servidor de dev**

```bash
cd huios-admin && npm run dev
```

Logado como aluno no `/portal`, no console do navegador:

```javascript
fetch('/api/portal/eventos').then(r => r.json()).then(console.log)
```

Expected: array incluindo o evento geral criado na Task 3 (com `attendances` vazio, já que esse evento não exigia check-in) e, se você criou um evento vinculado a uma turma na qual o aluno logado está matriculado, ele também deve aparecer.

Crie agora, pelo formulário (`/aulas/eventos/novo`), um evento com "Requer check-in" marcado, sem turma (geral), com latitude/longitude reais (ex: as mesmas configuradas em Configurações > Localização). Repita o `fetch('/api/portal/eventos')` e confirme que esse evento tem um item em `attendances` com `status: 'PENDING'`. Pegue o `id` desse evento e rode:

```javascript
fetch(`/api/portal/eventos/${id}/checkin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ latitude: <mesma latitude do evento>, longitude: <mesma longitude>, action: 'checkin' })
}).then(r => r.json()).then(console.log)
```

Expected: `{ attendance: { status: 'PRESENT', checkInAt: ... }, distance: 0, isWithinRadius: true, message: 'Check-in realizado com sucesso!' }`.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/src/app/api/portal/eventos
git commit -m "feat: API do portal para listar eventos e fazer check-in"
```

---

### Task 7: Mesclar eventos no calendário do portal (`/portal/aulas`)

**Files:**
- Modify: `huios-admin/src/app/portal/aulas/page.tsx`

**Interfaces:**
- Consumes: `GET /api/portal/eventos` (Task 6).
- Produces: link `/portal/checkin/evento/[id]` usado pelo botão de check-in do modal, consumido pela Task 8.

- [ ] **Step 1: Substituir todo o conteúdo de `huios-admin/src/app/portal/aulas/page.tsx`**

```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toLocalDate } from '@/lib/date-utils';

interface Lesson {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  description: string | null;
  discipline: {
    name: string;
    teacher: { name: string } | null;
    courseClasses: { name: string }[];
  };
  attendances: Array<{ status: string; checkInAt: string | null }>;
  materials: Array<{ id: string; fileName: string; filePath: string; mimeType: string }>;
}

interface EventItem {
  id: string;
  title: string;
  type: string | null;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  requiresCheckIn: boolean;
  locationName: string | null;
  courseClasses: { name: string }[];
  attendances: Array<{ status: string; checkInAt: string | null }>;
}

type CalendarEntry =
  | { kind: 'lesson'; item: Lesson; actualDate: Date }
  | { kind: 'event'; item: EventItem; actualDate: Date };

export default function AulasPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [lessonsRes, eventsRes] = await Promise.all([
        fetch('/api/portal/aulas'),
        fetch('/api/portal/eventos')
      ]);
      if (lessonsRes.ok) {
        setLessons(await lessonsRes.json());
      }
      if (eventsRes.ok) {
        setEvents(await eventsRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);
    const days = [];

    const prevMonthTotalDays = daysInMonth(year, month - 1);
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: prevMonthTotalDays - i, currentMonth: false, date: new Date(year, month - 1, prevMonthTotalDays - i) });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
    }
    return days;
  }, [currentDate]);

  const entries: CalendarEntry[] = useMemo(() => {
    const lessonEntries: CalendarEntry[] = lessons.map(l => ({ kind: 'lesson', item: l, actualDate: toLocalDate(l.date) }));
    const eventEntries: CalendarEntry[] = events.map(e => ({ kind: 'event', item: e, actualDate: toLocalDate(e.date) }));
    return [...lessonEntries, ...eventEntries];
  }, [lessons, events]);

  const getEntriesForDay = (date: Date) => {
    return entries.filter(entry =>
      entry.actualDate.getDate() === date.getDate() &&
      entry.actualDate.getMonth() === date.getMonth() &&
      entry.actualDate.getFullYear() === date.getFullYear()
    );
  };

  const getDisciplineColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 capitalize">{monthName}</h2>
          <p className="text-slate-500 text-sm">Calendário de aulas, eventos e materiais</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 text-sm font-semibold hover:bg-slate-50 rounded-lg transition-colors">
              Hoje
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-[#135bec] text-3xl">refresh</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-100">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 grid-rows-6" style={{ minHeight: '600px' }}>
            {calendarDays.map((calDay, i) => {
              const dayEntries = getEntriesForDay(calDay.date);
              const isToday = new Date().toDateString() === calDay.date.toDateString();

              return (
                <div
                  key={i}
                  className={`border-r border-b border-slate-50 p-1.5 overflow-y-auto last:border-r-0 ${
                    !calDay.currentMonth ? 'bg-slate-50/50' : ''
                  }`}
                >
                  <div className={`flex items-center justify-center w-7 h-7 text-xs font-bold mb-1 ml-auto rounded-full ${
                    isToday ? 'bg-[#135bec] text-white' : 'text-slate-500'
                  } ${!calDay.currentMonth && !isToday ? 'opacity-30' : ''}`}>
                    {calDay.day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEntries.map(entry => {
                      if (entry.kind === 'lesson') {
                        const lesson = entry.item;
                        const attended = lesson.attendances?.some((a) => a.status === 'PRESENT');
                        return (
                          <button
                            key={`lesson-${lesson.id}`}
                            onClick={() => setSelectedLesson(lesson)}
                            className={`w-full text-left p-1 rounded-lg transition-all hover:scale-[1.02] ${getDisciplineColor(lesson.discipline.name)}/10 relative`}
                          >
                            <div className={`text-[9px] font-bold truncate ${getDisciplineColor(lesson.discipline.name).replace('bg-', 'text-')}`}>
                              {lesson.discipline.name}
                            </div>
                            {attended && (
                              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
                            )}
                          </button>
                        );
                      }

                      const event = entry.item;
                      const attended = event.attendances?.some((a) => a.status === 'PRESENT');
                      return (
                        <button
                          key={`event-${event.id}`}
                          onClick={() => setSelectedEvent(event)}
                          className="w-full text-left p-1 rounded-lg transition-all hover:scale-[1.02] bg-amber-500/10 relative flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-amber-600 text-[10px] leading-none">celebration</span>
                          <span className="text-[9px] font-bold truncate text-amber-600">{event.title}</span>
                          {attended && (
                            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className={`p-6 ${getDisciplineColor(selectedLesson.discipline.name)} text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Detalhes da Aula</p>
                  <h3 className="text-xl font-bold mt-1">{selectedLesson.discipline.name}</h3>
                </div>
                <button onClick={() => setSelectedLesson(null)} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">calendar_today</span>
                <div>
                  <p className="text-xs text-slate-400">Data</p>
                  <p className="font-medium text-slate-800">
                    {toLocalDate(selectedLesson.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">schedule</span>
                <div>
                  <p className="text-xs text-slate-400">Horário</p>
                  <p className="font-medium text-slate-800">
                    {selectedLesson.startTime ? new Date(selectedLesson.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--'}
                    {selectedLesson.endTime && ` às ${new Date(selectedLesson.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`}
                  </p>
                </div>
              </div>
              {selectedLesson.locationName && (
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">location_on</span>
                  <div>
                    <p className="text-xs text-slate-400">Local</p>
                    <p className="font-medium text-slate-800">{selectedLesson.locationName}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">person</span>
                <div>
                  <p className="text-xs text-slate-400">Professor</p>
                  <p className="font-medium text-slate-800">{selectedLesson.discipline.teacher?.name || 'Não definido'}</p>
                </div>
              </div>

              {/* Attendance status */}
              <div className={`p-3 rounded-xl flex items-center gap-2 ${
                selectedLesson.attendances?.some((a) => a.status === 'PRESENT') ? 'bg-emerald-50' : 'bg-slate-50'
              }`}>
                <span className={`material-symbols-outlined ${
                  selectedLesson.attendances?.some((a) => a.status === 'PRESENT') ? 'text-emerald-500' : 'text-slate-400'
                }`}>
                  {selectedLesson.attendances?.some((a) => a.status === 'PRESENT') ? 'check_circle' : 'pending'}
                </span>
                <span className={`text-sm font-medium ${
                  selectedLesson.attendances?.some((a) => a.status === 'PRESENT') ? 'text-emerald-700' : 'text-slate-500'
                }`}>
                  {selectedLesson.attendances?.some((a) => a.status === 'PRESENT') ? 'Presença registrada' : 'Presença pendente'}
                </span>
              </div>

              {/* Materials */}
              {selectedLesson.materials?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Materiais</p>
                  <div className="space-y-2">
                    {selectedLesson.materials.map((mat) => (
                      <a
                        key={mat.id}
                        href={`/uploads/${mat.filePath}`}
                        target="_blank"
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-[#135bec]/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[#135bec]">attach_file</span>
                        <span className="text-sm font-medium text-slate-700 truncate">{mat.fileName}</span>
                        <span className="material-symbols-outlined text-slate-400 ml-auto">download</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {(!selectedLesson.attendances?.some((a) => a.checkInAt) || !selectedLesson.attendances?.some((a) => a.checkOutAt)) && (
                  <Link
                    href={`/portal/checkin/${selectedLesson.id}`}
                    className={`flex-1 ${selectedLesson.attendances?.some((a) => a.checkInAt) ? 'bg-amber-600' : 'bg-[#135bec]'} text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {selectedLesson.attendances?.some((a) => a.checkInAt) ? 'logout' : 'my_location'}
                    </span>
                    {selectedLesson.attendances?.some((a) => a.checkInAt) ? 'Check-out' : 'Check-in'}
                  </Link>
                )}
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 bg-amber-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">{selectedEvent.type || 'Evento'}</p>
                  <h3 className="text-xl font-bold mt-1">{selectedEvent.title}</h3>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">calendar_today</span>
                <div>
                  <p className="text-xs text-slate-400">Data</p>
                  <p className="font-medium text-slate-800">
                    {toLocalDate(selectedEvent.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">schedule</span>
                <div>
                  <p className="text-xs text-slate-400">Horário</p>
                  <p className="font-medium text-slate-800">
                    {selectedEvent.startTime ? new Date(selectedEvent.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--'}
                    {selectedEvent.endTime && ` às ${new Date(selectedEvent.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`}
                  </p>
                </div>
              </div>
              {selectedEvent.locationName && (
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">location_on</span>
                  <div>
                    <p className="text-xs text-slate-400">Local</p>
                    <p className="font-medium text-slate-800">{selectedEvent.locationName}</p>
                  </div>
                </div>
              )}
              {selectedEvent.description && (
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">notes</span>
                  <div>
                    <p className="text-xs text-slate-400">Observações</p>
                    <p className="font-medium text-slate-800">{selectedEvent.description}</p>
                  </div>
                </div>
              )}

              {selectedEvent.requiresCheckIn && (
                <>
                  <div className={`p-3 rounded-xl flex items-center gap-2 ${
                    selectedEvent.attendances?.some((a) => a.status === 'PRESENT') ? 'bg-emerald-50' : 'bg-slate-50'
                  }`}>
                    <span className={`material-symbols-outlined ${
                      selectedEvent.attendances?.some((a) => a.status === 'PRESENT') ? 'text-emerald-500' : 'text-slate-400'
                    }`}>
                      {selectedEvent.attendances?.some((a) => a.status === 'PRESENT') ? 'check_circle' : 'pending'}
                    </span>
                    <span className={`text-sm font-medium ${
                      selectedEvent.attendances?.some((a) => a.status === 'PRESENT') ? 'text-emerald-700' : 'text-slate-500'
                    }`}>
                      {selectedEvent.attendances?.some((a) => a.status === 'PRESENT') ? 'Presença registrada' : 'Presença pendente'}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {(!selectedEvent.attendances?.some((a) => a.checkInAt) || !selectedEvent.attendances?.some((a) => a.checkOutAt)) && (
                      <Link
                        href={`/portal/checkin/evento/${selectedEvent.id}`}
                        className={`flex-1 ${selectedEvent.attendances?.some((a) => a.checkInAt) ? 'bg-amber-600' : 'bg-[#135bec]'} text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {selectedEvent.attendances?.some((a) => a.checkInAt) ? 'logout' : 'my_location'}
                        </span>
                        {selectedEvent.attendances?.some((a) => a.checkInAt) ? 'Check-out' : 'Check-in'}
                      </Link>
                    )}
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                    >
                      Fechar
                    </button>
                  </div>
                </>
              )}

              {!selectedEvent.requiresCheckIn && (
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros novos no arquivo.

- [ ] **Step 3: Testar manualmente no navegador**

Logado como aluno em `/portal/aulas`, confirme que o evento geral (sem check-in) da Task 3 aparece no dia certo com ícone `celebration` e fundo âmbar, e que o evento com check-in da Task 6 também aparece — clicando nele, o modal deve mostrar o botão "Check-in" (já que não há `checkInAt` ainda).

- [ ] **Step 4: Commit**

```bash
git add huios-admin/src/app/portal/aulas/page.tsx
git commit -m "feat: mescla eventos no calendário do portal do aluno"
```

---

### Task 8: Tela de check-in do evento (portal)

**Files:**
- Create: `huios-admin/src/app/portal/checkin/evento/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/portal/eventos` (Task 6, usado para localizar o evento e a presença atual do aluno pelo `id` na URL), `POST /api/portal/eventos/[id]/checkin` (Task 6).

- [ ] **Step 1: Criar o arquivo**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toLocalDate } from '@/lib/date-utils';

interface EventItem {
  id: string;
  title: string;
  type: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  radiusMeters: number;
  attendances: Array<{
    status: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    distance: number | null;
    checkOutDistance: number | null;
  }>;
}

export default function EventoCheckInPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [checkInResult, setCheckInResult] = useState<any>(null);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const res = await fetch('/api/portal/eventos');
      if (res.ok) {
        const events: EventItem[] = await res.json();
        const found = events.find(e => e.id === eventId) || null;
        setEvent(found);
        if (found?.attendances?.length > 0) {
          setCheckInResult({ attendance: found.attendances[0], isWithinRadius: true });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationAction = (action: 'checkin' | 'checkout') => {
    const setBusy = action === 'checkin' ? setCheckingIn : setCheckingOut;
    setBusy(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada por este navegador.');
      setBusy(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(`/api/portal/eventos/${eventId}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              action
            })
          });
          const data = await res.json();
          if (res.ok) {
            setCheckInResult(data);
          } else {
            setLocationError(data.error || `Erro ao realizar ${action === 'checkin' ? 'check-in' : 'check-out'}`);
          }
        } catch (error) {
          console.error(error);
          setLocationError('Erro ao conectar com o servidor');
        } finally {
          setBusy(false);
        }
      },
      (error) => {
        let msg = 'Erro ao obter localização: ';
        switch (error.code) {
          case error.PERMISSION_DENIED: msg += 'Permissão negada.'; break;
          case error.POSITION_UNAVAILABLE: msg += 'Localização indisponível.'; break;
          case error.TIMEOUT: msg += 'Tempo esgotado.'; break;
          default: msg += error.message;
        }
        setLocationError(msg);
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <span className="material-symbols-outlined animate-spin text-[#135bec] text-3xl">refresh</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">event_busy</span>
        <h2 className="font-bold text-slate-800 mb-2">Evento não encontrado</h2>
        <p className="text-sm text-slate-400 mb-6">O link acessado pode estar incorreto, o evento foi removido, ou você não está habilitado para fazer check-in nele.</p>
        <button onClick={() => router.push('/portal/aulas')} className="bg-[#135bec] text-white px-6 py-2 rounded-xl text-sm font-semibold">
          Voltar ao Calendário
        </button>
      </div>
    );
  }

  const isCheckedIn = !!checkInResult?.attendance?.checkInAt;
  const isCheckedOut = !!checkInResult?.attendance?.checkOutAt;

  return (
    <div className="max-w-md mx-auto p-4 lg:p-8 space-y-6">
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-3xl text-amber-600">celebration</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Check-in do Evento</h2>
        <p className="text-sm text-slate-400">Registre sua presença por geolocalização</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-amber-600">celebration</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{event.title}</h3>
            {event.type && <p className="text-xs text-slate-400">{event.type}</p>}
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="material-symbols-outlined text-sm text-slate-400">event</span>
            {toLocalDate(event.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
            {event.startTime ? new Date(event.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--'}
            {event.endTime && ` - ${new Date(event.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`}
          </div>
          {event.locationName && (
            <div className="flex items-center gap-2 text-slate-500">
              <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
              {event.locationName}
            </div>
          )}
        </div>
      </div>

      {isCheckedIn ? (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
            <h3 className="font-bold text-emerald-800 mb-1">Check-in Realizado!</h3>
            <p className="text-emerald-600 text-sm">Sua presença foi registrada.</p>
            {checkInResult?.attendance?.distance !== null && checkInResult?.attendance?.distance !== undefined && (
              <p className="text-emerald-500 text-xs mt-2">Distância (In): {Math.round(checkInResult.attendance.distance)}m</p>
            )}
          </div>

          {isCheckedOut ? (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-blue-500 mb-2">logout</span>
              <h3 className="font-bold text-blue-800 mb-1">Check-out Realizado!</h3>
              <p className="text-blue-600 text-sm">Sua saída foi registrada com sucesso.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">sensor_door</span>
              <h3 className="font-semibold text-slate-800 mb-2">Finalizar Evento (Check-out)</h3>
              <p className="text-xs text-slate-500 mb-4">Ao final do evento, registre sua saída para completar a presença.</p>
              <button
                onClick={() => handleLocationAction('checkout')}
                disabled={checkingOut}
                className="w-full bg-slate-800 text-white py-4 rounded-xl font-semibold text-lg hover:bg-slate-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkingOut ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    Obtendo localização...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">logout</span>
                    Fazer Check-out
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">my_location</span>
          <h3 className="font-semibold text-slate-800 mb-2">Realizar Check-in</h3>
          <p className="text-xs text-slate-500 mb-4">Clique no botão abaixo. O sistema solicitará acesso à sua localização.</p>
          <button
            onClick={() => handleLocationAction('checkin')}
            disabled={checkingIn}
            className="w-full bg-[#135bec] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#0d47a1] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checkingIn ? (
              <>
                <span className="material-symbols-outlined animate-spin">refresh</span>
                Obtendo localização...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">my_location</span>
                Fazer Check-in
              </>
            )}
          </button>
        </div>
      )}

      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 flex-shrink-0">error</span>
          <p className="text-sm text-red-700">{locationError}</p>
        </div>
      )}

      <div className="bg-slate-50 rounded-xl p-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Como funciona?</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-xs text-emerald-500">check</span>
            Permita o acesso à localização
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-xs text-emerald-500">check</span>
            Esteja dentro do raio de {event.radiusMeters}m do evento
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-xs text-emerald-500">check</span>
            Seu check-in será registrado automaticamente
          </li>
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros novos no arquivo.

- [ ] **Step 3: Testar manualmente no navegador**

Logado como aluno, no `/portal/aulas`, abra o modal do evento com check-in criado na Task 6 e clique em "Check-in" — deve navegar para `/portal/checkin/evento/<id>`. Clique em "Fazer Check-in" e autorize a localização do navegador (em ambiente de desenvolvimento local, o navegador normalmente reporta uma localização próxima da real ou pode ser simulada nas DevTools em Sensors > Location). Expected: se dentro do raio, tela mostra "Check-in Realizado!" com a distância; se fora do raio, mostra o erro `Você está fora do local do evento...`. Volte para `/portal/aulas` e confirme que o card do evento agora tem a bolinha verde de presença.

- [ ] **Step 4: Commit**

```bash
git add huios-admin/src/app/portal/checkin/evento
git commit -m "feat: tela de check-in do evento no portal do aluno"
```

---

## Self-Review Notes

- **Cobertura do spec:** modelo de dados `Event`/`EventAttendance` com geração de presença condicional (Task 1, 2), cadastro admin com tipo livre/turmas opcionais/toggle de check-in (Task 3), calendário mesclado no admin (Task 5) e no portal (Task 7), API do portal + check-in geolocalizado (Task 6, 8), exclusão de evento (Task 2, 4). Todas as seções da spec (`docs/superpowers/specs/2026-07-21-cadastro-eventos-calendario-design.md`) têm task correspondente. "Fora de escopo" da spec (edição, notificações, materiais, categorias fixas) foi respeitado — nenhuma task implementa isso.
- **Consistência de tipos:** `EventItem` tem o mesmo shape (`id, title, type, description, date, startTime, endTime, requiresCheckIn, locationName, courseClasses: {name}[]`) entre a Task 5 (`CalendarContainer`/`page.tsx`, produz) e a Task 4 (`EventDetailsModal`, consome). O shape retornado por `GET /api/portal/eventos` (Task 6: campos do model `Event` + `attendances: EventAttendance[]`) é consumido de forma consistente pelas Tasks 7 e 8. `createEvent` (Task 2) lê exatamente os mesmos nomes de campo de formulário (`title`, `type`, `date`, `startTime`, `endTime`, `courseClassIds`, `requiresCheckIn`, `locationName`, `latitude`, `longitude`, `radiusMeters`, `description`) que `NovoEventoForm` (Task 3) envia.
- **Fora do escopo** (conforme spec): edição de eventos, notificações, materiais anexados, categorias fixas de tipo, integração com `huios-mobile` (não mencionado em nenhum momento da conversa) e com o serviço `huios-api` para o fluxo de check-in (decisão documentada nas Global Constraints).
