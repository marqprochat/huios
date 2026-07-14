# Relatório de status da Avaliação do Professor + notificação ao aluno — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar aos coordenadores um relatório por turma/disciplina de quem já fez a avaliação do professor, quem está pendente (liberado, não fez) e quem ainda não está liberado — com botão para notificar um aluno específico ou todos os pendentes de uma vez, via um novo sino de notificações no Portal do Aluno.

**Architecture:** Next.js App Router (huios-admin). Novo model Prisma `StudentNotification` (studentId-alvo, espelha o `Notification` admin que hoje é role-alvo). Duas novas rotas admin (`/api/avaliacoes/[disciplineId]/status` e `/notificar`) reaproveitando a regra de elegibilidade já usada em `/api/portal/avaliacoes`. Duas novas rotas portal (`/api/portal/notificacoes` GET/PUT) consumidas por um componente de sino novo no `PortalHeader`. UI admin: modal no card de disciplina já existente em `/avaliacoes`.

**Tech Stack:** Next.js 16 (App Router), Prisma 6.19 + PostgreSQL, React 19, Tailwind classes inline (sem CSS modules), Toast global (`@/app/components/Toast/useToast`).

## Global Constraints

- Não existe framework de testes automatizados no projeto (`huios-admin/package.json` não tem `jest`/`vitest`) — verificação é por `npx tsc --noEmit` (checagem de tipos) + teste manual no navegador, seguindo a convenção já usada no projeto.
- Migrações de banco seguem o padrão já usado no projeto: `npx prisma db push` (não `prisma migrate dev`) — ver spec, seção "Modelo de dados".
- `huios-api/prisma/schema.prisma` espelha os models do `huios-admin` mesmo quando não usados por lá (mesmo banco Postgres compartilhado) — mudança de schema deve ser replicada nos dois arquivos, mas `db push` só precisa rodar uma vez (mesmo `DATABASE_URL`).
- Todas as rotas admin usam o guard `session.role !== 'SUPER_ADMIN' && session.role !== 'COORDENADOR'` → 403.
- Regra de "liberado" (não deve ser reimplementada com lógica diferente): disciplina tem `lessons.length > 0` E todas as lessons com fim (`endTime` ou fim do dia de `date`) no passado.
- Um aluno pode estar matriculado em mais de uma `CourseClass` que compartilha a mesma `Discipline` (relação N:N implícita `Discipline.courseClasses` / `CourseClass.disciplines`) — a lista de alunos elegíveis de uma disciplina deve deduplicar por `studentId` através de todas as `courseClasses` da disciplina.

---

## File Structure

- `huios-admin/prisma/schema.prisma` — add model `StudentNotification` + relação em `Student`
- `huios-api/prisma/schema.prisma` — mesmo add (espelho)
- `huios-admin/src/app/api/avaliacoes/[disciplineId]/status/route.ts` — **novo**, GET
- `huios-admin/src/app/api/avaliacoes/[disciplineId]/notificar/route.ts` — **novo**, POST
- `huios-admin/src/app/api/portal/notificacoes/route.ts` — **novo**, GET
- `huios-admin/src/app/api/portal/notificacoes/[id]/route.ts` — **novo**, PUT
- `huios-admin/src/app/avaliacoes/page.tsx` — modificar (botão + modal de status)
- `huios-admin/src/app/portal/components/NotificationBell.tsx` — **novo**, componente do sino
- `huios-admin/src/app/portal/components/PortalHeader.tsx` — modificar (renderiza o sino novo)

---

### Task 1: Model `StudentNotification` no Prisma

**Files:**
- Modify: `huios-admin/prisma/schema.prisma`
- Modify: `huios-api/prisma/schema.prisma`

**Interfaces:**
- Produces: `prisma.studentNotification` client model com campos `{ id, studentId, disciplineId, type, title, message, read, readAt, createdAt }`, usado pelas Tasks 3, 4.

- [ ] **Step 1: Adicionar o model em `huios-admin/prisma/schema.prisma`**

Adicionar logo após o model `TeacherEvaluationSubmission` (linha 517, antes do comentário `// JUSTIFICATIVAS DE FALTA E NOTIFICAÇÕES`):

```prisma
model StudentNotification {
  id           String    @id @default(uuid())
  studentId    String
  student      Student   @relation(fields: [studentId], references: [id])
  disciplineId String?
  type         String    // "TEACHER_EVALUATION_REMINDER"
  title        String
  message      String
  read         Boolean   @default(false)
  readAt       DateTime?
  createdAt    DateTime  @default(now())
}
```

E adicionar a relação inversa no model `Student` (após a linha `absenceJustifications AbsenceJustification[]`, dentro do bloco de relações novas, por volta da linha 49):

```prisma
  studentNotifications StudentNotification[]
```

- [ ] **Step 2: Replicar exatamente os mesmos dois trechos em `huios-api/prisma/schema.prisma`**

Mesmo model `StudentNotification` (após `TeacherEvaluationSubmission`) e mesma relação `studentNotifications StudentNotification[]` no model `Student` do schema do `huios-api`.

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

Expected: saída inclui `The database is now in sync with your Prisma schema` e menciona a criação da tabela `StudentNotification`.

- [ ] **Step 5: Verificar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros novos relacionados a `studentNotification`/`StudentNotification` (o comando pode já ter warnings pré-existentes no projeto — confirme que nenhum novo erro cita esse model).

- [ ] **Step 6: Commit**

```bash
git add huios-admin/prisma/schema.prisma huios-api/prisma/schema.prisma
git commit -m "feat: adiciona model StudentNotification para notificar alunos"
```

---

### Task 2: `GET /api/avaliacoes/[disciplineId]/status` — status por aluno

**Files:**
- Create: `huios-admin/src/app/api/avaliacoes/[disciplineId]/status/route.ts`

**Interfaces:**
- Consumes: `prisma.discipline`, `prisma.teacherEvaluationSubmission` (existentes); `getSession()` de `@/lib/auth`.
- Produces: resposta JSON `{ disciplineId: string, disciplineName: string, liberado: boolean, feito: {studentId:string, studentName:string}[], pendente: {studentId:string, studentName:string}[], naoLiberado: {studentId:string, studentName:string}[] }`, consumida pela Task 5 (UI) e reaproveitada em espírito pela Task 3.

- [ ] **Step 1: Criar o arquivo da rota**

```typescript
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ disciplineId: string }> }
) {
    try {
        const session = await getSession();
        if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'COORDENADOR')) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const { disciplineId } = await params;

        const discipline = await prisma.discipline.findUnique({
            where: { id: disciplineId },
            include: {
                lessons: true,
                courseClasses: {
                    include: {
                        enrollments: {
                            where: { status: { in: ['CURSANDO', 'APROVADO'] } },
                            include: { student: true }
                        }
                    }
                }
            }
        });

        if (!discipline) {
            return NextResponse.json({ error: 'Disciplina não encontrada' }, { status: 404 });
        }

        const now = new Date();
        const liberado = discipline.lessons.length > 0 && discipline.lessons.every(lesson => {
            const end = lesson.endTime ? new Date(lesson.endTime) : new Date(lesson.date);
            if (!lesson.endTime) {
                end.setHours(23, 59, 59, 999);
            }
            return now > end;
        });

        const studentsMap = new Map<string, string>();
        for (const courseClass of discipline.courseClasses) {
            for (const enrollment of courseClass.enrollments) {
                studentsMap.set(enrollment.studentId, enrollment.student.name);
            }
        }

        const submissions = await prisma.teacherEvaluationSubmission.findMany({
            where: { disciplineId, studentId: { in: [...studentsMap.keys()] } }
        });
        const submittedIds = new Set(submissions.map(s => s.studentId));

        const feito: { studentId: string; studentName: string }[] = [];
        const pendente: { studentId: string; studentName: string }[] = [];
        const naoLiberado: { studentId: string; studentName: string }[] = [];

        for (const [studentId, studentName] of studentsMap) {
            const entry = { studentId, studentName };
            if (submittedIds.has(studentId)) {
                feito.push(entry);
            } else if (liberado) {
                pendente.push(entry);
            } else {
                naoLiberado.push(entry);
            }
        }

        const byName = (a: { studentName: string }, b: { studentName: string }) => a.studentName.localeCompare(b.studentName);
        feito.sort(byName);
        pendente.sort(byName);
        naoLiberado.sort(byName);

        return NextResponse.json({
            disciplineId,
            disciplineName: discipline.name,
            liberado,
            feito,
            pendente,
            naoLiberado
        });
    } catch (error) {
        console.error('Discipline evaluation status error:', error);
        return NextResponse.json({ error: 'Erro ao carregar status das avaliações' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros no arquivo novo.

- [ ] **Step 3: Testar manualmente com o servidor de dev**

```bash
cd huios-admin && npm run dev
```

Logado como `SUPER_ADMIN` ou `COORDENADOR` no navegador, abra `http://localhost:3000/api/avaliacoes/<um-disciplineId-real>/status` (pegue um `disciplineId` na tela `/disciplinas` ou no console do `/avaliacoes`). Expected: JSON com `disciplineName`, `liberado` e as 3 listas — nenhum aluno duplicado entre `feito`/`pendente`/`naoLiberado`.

- [ ] **Step 4: Commit**

```bash
git add huios-admin/src/app/api/avaliacoes/[disciplineId]/status/route.ts
git commit -m "feat: endpoint de status de avaliação do professor por disciplina"
```

---

### Task 3: `POST /api/avaliacoes/[disciplineId]/notificar` — disparo de notificação

**Files:**
- Create: `huios-admin/src/app/api/avaliacoes/[disciplineId]/notificar/route.ts`

**Interfaces:**
- Consumes: `prisma.discipline`, `prisma.teacherEvaluationSubmission`, `prisma.studentNotification.createMany` (Task 1); `getSession()`.
- Produces: resposta JSON `{ notified: number }`, consumida pela Task 5 (UI).

- [ ] **Step 1: Criar o arquivo da rota**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ disciplineId: string }> }
) {
    try {
        const session = await getSession();
        if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'COORDENADOR')) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const { disciplineId } = await params;
        const body = await request.json().catch(() => ({}));
        const studentId: string | undefined = body?.studentId;

        const discipline = await prisma.discipline.findUnique({
            where: { id: disciplineId },
            include: {
                lessons: true,
                courseClasses: {
                    include: {
                        enrollments: {
                            where: { status: { in: ['CURSANDO', 'APROVADO'] } },
                            include: { student: true }
                        }
                    }
                }
            }
        });

        if (!discipline) {
            return NextResponse.json({ error: 'Disciplina não encontrada' }, { status: 404 });
        }

        const now = new Date();
        const liberado = discipline.lessons.length > 0 && discipline.lessons.every(lesson => {
            const end = lesson.endTime ? new Date(lesson.endTime) : new Date(lesson.date);
            if (!lesson.endTime) {
                end.setHours(23, 59, 59, 999);
            }
            return now > end;
        });

        if (!liberado) {
            return NextResponse.json({ error: 'Avaliação ainda não liberada para esta disciplina' }, { status: 400 });
        }

        const studentsMap = new Map<string, string>();
        for (const courseClass of discipline.courseClasses) {
            for (const enrollment of courseClass.enrollments) {
                studentsMap.set(enrollment.studentId, enrollment.student.name);
            }
        }

        const submissions = await prisma.teacherEvaluationSubmission.findMany({
            where: { disciplineId, studentId: { in: [...studentsMap.keys()] } }
        });
        const submittedIds = new Set(submissions.map(s => s.studentId));

        let targetIds = [...studentsMap.keys()].filter(id => !submittedIds.has(id));

        if (studentId) {
            if (!targetIds.includes(studentId)) {
                return NextResponse.json({ error: 'Aluno não está pendente para esta disciplina' }, { status: 400 });
            }
            targetIds = [studentId];
        }

        if (targetIds.length === 0) {
            return NextResponse.json({ notified: 0 });
        }

        await prisma.studentNotification.createMany({
            data: targetIds.map(id => ({
                studentId: id,
                disciplineId,
                type: 'TEACHER_EVALUATION_REMINDER',
                title: 'Avalie seu professor!',
                message: `Sua avaliação do professor de ${discipline.name} está disponível — dê seu feedback!`
            }))
        });

        return NextResponse.json({ notified: targetIds.length });
    } catch (error) {
        console.error('Notify teacher evaluation error:', error);
        return NextResponse.json({ error: 'Erro ao notificar alunos' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros no arquivo novo.

- [ ] **Step 3: Testar manualmente**

Com `npm run dev` rodando e logado como coordenador, no console do navegador (na aba de qualquer página do admin, para reaproveitar o cookie de sessão):

```javascript
fetch('/api/avaliacoes/<disciplineId-liberado>/notificar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
}).then(r => r.json()).then(console.log)
```

Expected: `{ notified: N }` com N igual ao tamanho da lista `pendente` retornada pela Task 2 para essa disciplina. Repetir o `GET /status` (Task 2) e confirmar que os alunos notificados continuam em `pendente` (a notificação não move o aluno para "feito" — só a resposta da avaliação faz isso).

- [ ] **Step 4: Commit**

```bash
git add huios-admin/src/app/api/avaliacoes/[disciplineId]/notificar/route.ts
git commit -m "feat: endpoint para notificar alunos pendentes de avaliação do professor"
```

---

### Task 4: API de notificações do Portal (GET lista + PUT marcar lida)

**Files:**
- Create: `huios-admin/src/app/api/portal/notificacoes/route.ts`
- Create: `huios-admin/src/app/api/portal/notificacoes/[id]/route.ts`

**Interfaces:**
- Consumes: `prisma.studentNotification` (Task 1); `getSession()`; padrão de resolução de `studentId` a partir da sessão já usado em `huios-admin/src/app/api/portal/avaliacoes/route.ts` (`prisma.user.findUnique({ where: { id: session.userId }, include: { student: true } })`).
- Produces: `GET` retorna `{ notifications: {id,type,title,message,read,createdAt,disciplineId}[], unreadCount: number }`; `PUT /[id]` retorna `{ success: true }`. Consumidas pela Task 6 (componente `NotificationBell`).

- [ ] **Step 1: Criar `huios-admin/src/app/api/portal/notificacoes/route.ts`**

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

        const notifications = await prisma.studentNotification.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const unreadCount = await prisma.studentNotification.count({
            where: { studentId, read: false }
        });

        return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Portal notificacoes error:', error);
        return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Criar `huios-admin/src/app/api/portal/notificacoes/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        const notification = await prisma.studentNotification.findUnique({ where: { id } });
        if (!notification || notification.studentId !== user.student.id) {
            return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
        }

        await prisma.studentNotification.update({
            where: { id },
            data: { read: true, readAt: new Date() }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Mark student notification read error:', error);
        return NextResponse.json({ error: 'Erro ao atualizar notificação' }, { status: 500 });
    }
}
```

- [ ] **Step 3: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros nos dois arquivos novos.

- [ ] **Step 4: Testar manualmente**

Logado como aluno no `/portal`, no console do navegador:

```javascript
fetch('/api/portal/notificacoes').then(r => r.json()).then(console.log)
```

Expected: `{ notifications: [...], unreadCount: N }`. Depois de rodar a Task 3 contra uma disciplina desse aluno, repetir e confirmar que `unreadCount` aumentou e a notificação aparece na lista com `disciplineId` preenchido. Pegue o `id` de uma notificação não lida e rode:

```javascript
fetch(`/api/portal/notificacoes/${id}`, { method: 'PUT' }).then(r => r.json()).then(console.log)
```

Expected: `{ success: true }`; repetir o `GET` e confirmar `read: true` nessa notificação e `unreadCount` reduzido em 1.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/src/app/api/portal/notificacoes
git commit -m "feat: API de notificações do aluno no portal"
```

---

### Task 5: UI admin — modal de status por disciplina em `/avaliacoes`

**Files:**
- Modify: `huios-admin/src/app/avaliacoes/page.tsx`

**Interfaces:**
- Consumes: `GET /api/avaliacoes/[disciplineId]/status` (Task 2), `POST /api/avaliacoes/[disciplineId]/notificar` (Task 3), `useToast` de `@/app/components/Toast/useToast` (padrão já usado em `TransactionAttachments.tsx`).

- [ ] **Step 1: Adicionar import do toast e novos estados**

Em `huios-admin/src/app/avaliacoes/page.tsx`, logo após a linha `import { useState, useEffect } from 'react';`:

```typescript
import { useToast } from '@/app/components/Toast/useToast';
```

E dentro de `AdminAvaliacoesPage`, logo após `const [selectedDiscipline, setSelectedDiscipline] = useState<any>(null);`:

```typescript
  const { toast } = useToast();
  const [statusModal, setStatusModal] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [notifyingKey, setNotifyingKey] = useState<string | null>(null);
```

- [ ] **Step 2: Adicionar as funções de carregar status e notificar**

Após a função `fetchData`, dentro do componente:

```typescript
  const openStatusModal = async (disciplineId: string, disciplineName: string, teacherName: string) => {
    setStatusModal({ disciplineId, disciplineName, teacherName, liberado: false, feito: [], pendente: [], naoLiberado: [] });
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/avaliacoes/${disciplineId}/status`);
      if (res.ok) {
        const json = await res.json();
        setStatusModal((prev: any) => ({ ...prev, ...json }));
      } else {
        toast('error', 'Erro ao carregar status', 'Tente novamente.');
      }
    } catch {
      toast('error', 'Erro de conexão', 'Não foi possível carregar o status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const notifyStudents = async (disciplineId: string, studentId?: string) => {
    const key = studentId || 'ALL';
    setNotifyingKey(key);
    try {
      const res = await fetch(`/api/avaliacoes/${disciplineId}/notificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentId ? { studentId } : {})
      });
      const json = await res.json();
      if (res.ok) {
        toast('success', 'Notificação enviada', `${json.notified} aluno(s) notificado(s).`);
        setStatusModal((prev: any) => {
          if (!prev) return prev;
          if (studentId) {
            return { ...prev, pendente: prev.pendente.filter((s: any) => s.studentId !== studentId) };
          }
          return { ...prev, pendente: [] };
        });
      } else {
        toast('error', 'Erro ao notificar', json.error || 'Tente novamente.');
      }
    } catch {
      toast('error', 'Erro de conexão', 'Não foi possível notificar.');
    } finally {
      setNotifyingKey(null);
    }
  };
```

- [ ] **Step 3: Adicionar o botão "Ver status dos alunos" no card**

Dentro do bloco `<div className="p-6 space-y-6">` de cada card (após o `<RatingSection .../>` de `mastery`, antes do bloco de comentários), adicionar:

```tsx
                <button
                  onClick={() => openStatusModal(item.disciplineId, item.disciplineName, item.teacherName)}
                  className="text-primary text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:underline"
                >
                  Ver status dos alunos
                  <span className="material-symbols-outlined text-sm">checklist</span>
                </button>
```

- [ ] **Step 4: Adicionar o modal de status (JSX)**

Após o bloco `{selectedDiscipline && (...)}` existente, antes do fechamento `</div>` final do componente:

```tsx
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <div>
                <h3 className="font-black text-xl text-slate-800 dark:text-white">Status - {statusModal.disciplineName}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">Professor: {statusModal.teacherName}</p>
              </div>
              <button onClick={() => setStatusModal(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {statusLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto space-y-6">
                <StatusSection
                  title="Fizeram"
                  color="text-emerald-600"
                  students={statusModal.feito}
                  emptyLabel="Nenhum aluno avaliou ainda."
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest">
                      Pendentes ({statusModal.pendente.length})
                    </h4>
                    {statusModal.pendente.length > 0 && (
                      <button
                        onClick={() => notifyStudents(statusModal.disciplineId)}
                        disabled={notifyingKey !== null}
                        className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {notifyingKey === 'ALL' ? 'Enviando...' : 'Notificar todos pendentes'}
                      </button>
                    )}
                  </div>
                  {statusModal.pendente.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">Nenhum aluno pendente.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {statusModal.pendente.map((s: any) => (
                        <div key={s.studentId} className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.studentName}</span>
                          <button
                            onClick={() => notifyStudents(statusModal.disciplineId, s.studentId)}
                            disabled={notifyingKey !== null}
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline disabled:opacity-50"
                          >
                            {notifyingKey === s.studentId ? 'Enviando...' : 'Notificar'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <StatusSection
                  title="Ainda não liberado"
                  color="text-slate-400"
                  students={statusModal.naoLiberado}
                  emptyLabel="Todos os alunos já estão liberados para avaliar."
                />
              </div>
            )}

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button onClick={() => setStatusModal(null)} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 5: Adicionar o componente auxiliar `StatusSection`**

Após a função `RatingSection` já existente, no final do arquivo:

```typescript
function StatusSection({ title, color, students, emptyLabel }: { title: string, color: string, students: any[], emptyLabel: string }) {
  return (
    <div>
      <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${color}`}>
        {title} ({students.length})
      </h4>
      {students.length === 0 ? (
        <p className="text-slate-400 text-sm italic">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {students.map((s: any) => (
            <span key={s.studentId} className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
              {s.studentName}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros novos em `avaliacoes/page.tsx`.

- [ ] **Step 7: Testar manualmente no navegador**

Com `npm run dev` rodando, logar como coordenador e abrir `/avaliacoes`. Clicar em "Ver status dos alunos" num card: o modal deve abrir mostrando spinner e depois as 3 listas. Clicar em "Notificar" num aluno pendente: o botão vira "Enviando...", some da lista de pendentes ao concluir e aparece um toast de sucesso. Clicar em "Notificar todos pendentes" (se houver mais de um pendente): a lista de pendentes deve esvaziar e o toast mostrar a contagem correta.

- [ ] **Step 8: Commit**

```bash
git add huios-admin/src/app/avaliacoes/page.tsx
git commit -m "feat: modal de status e notificação de avaliação por disciplina"
```

---

### Task 6: Sino de notificações no Portal do Aluno

**Files:**
- Create: `huios-admin/src/app/portal/components/NotificationBell.tsx`
- Modify: `huios-admin/src/app/portal/components/PortalHeader.tsx`

**Interfaces:**
- Consumes: `GET /api/portal/notificacoes`, `PUT /api/portal/notificacoes/[id]` (Task 4).

- [ ] **Step 1: Criar `huios-admin/src/app/portal/components/NotificationBell.tsx`**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface StudentNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  disciplineId: string | null;
}

export default function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/portal/notificacoes');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portal/notificacoes');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
    setLoading(false);
  };

  const handleBellClick = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications();
  };

  const handleItemClick = async (notif: StudentNotification) => {
    if (!notif.read) {
      try {
        await fetch(`/api/portal/notificacoes/${notif.id}`, { method: 'PUT' });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }
    setOpen(false);
    if (notif.disciplineId) {
      router.push(`/portal/avaliacoes/${notif.disciplineId}`);
    }
  };

  const formatRelative = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'agora mesmo';
    if (mins < 60) return `há ${mins} min`;
    if (hours < 24) return `há ${hours}h`;
    return `há ${days}d`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        title="Notificações"
        className="relative p-2 hover:bg-slate-50 rounded-xl transition-colors"
      >
        <span className="material-symbols-outlined text-slate-400">campaign</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold bg-red-500 text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-bold text-slate-800 text-sm">Notificações</p>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold text-[#135bec] bg-[#135bec]/10 px-2 py-0.5 rounded-full">
                {unreadCount} nova{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="material-symbols-outlined animate-spin text-[#135bec]">refresh</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300">notifications_off</span>
                <p className="text-sm text-slate-400 mt-2">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`px-4 py-3 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-[#135bec]/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${!notif.read ? 'bg-[#135bec]/15' : 'bg-slate-100'}`}>
                      <span className={`material-symbols-outlined text-sm ${!notif.read ? 'text-[#135bec]' : 'text-slate-400'}`}>rate_review</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${!notif.read ? 'text-slate-800' : 'text-slate-600'}`}>
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatRelative(notif.createdAt)}</p>
                    </div>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-[#135bec] rounded-full flex-shrink-0 mt-1"></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Renderizar o sino no `PortalHeader.tsx`**

Em `huios-admin/src/app/portal/components/PortalHeader.tsx`, adicionar o import no topo:

```typescript
import NotificationBell from './NotificationBell';
```

E adicionar `<NotificationBell />` dentro da `<div className="flex items-center gap-3">`, logo antes do `<Link href="/portal/financeiro" ...>` existente:

```tsx
        <NotificationBell />
        <Link href="/portal/financeiro" className="relative p-2 hover:bg-slate-50 rounded-xl transition-colors" title={pending > 0 ? `${pending} cobrança(s) em aberto` : 'Financeiro'}>
```

- [ ] **Step 3: Checar tipos**

```bash
cd huios-admin && npx tsc --noEmit
```

Expected: sem erros novos em `NotificationBell.tsx` / `PortalHeader.tsx`.

- [ ] **Step 4: Testar manualmente no navegador**

Com `npm run dev` rodando, logar como o mesmo aluno que recebeu a notificação de teste da Task 3/4 e abrir qualquer página do `/portal`. O sino novo (ícone `campaign`, ao lado do ícone financeiro) deve mostrar o badge com a contagem. Clicar abre o dropdown com a notificação; clicar na notificação marca como lida (badge diminui) e navega para `/portal/avaliacoes/<disciplineId>`.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/src/app/portal/components/NotificationBell.tsx huios-admin/src/app/portal/components/PortalHeader.tsx
git commit -m "feat: sino de notificações no portal do aluno"
```

---

## Self-Review Notes

- **Cobertura do spec:** modelo de dados (Task 1), rota de status (Task 2), rota de notificar individual/em massa (Task 3), API de notificações do portal (Task 4), UI admin com as 3 listas + botões (Task 5), sino no portal (Task 6). Todas as seções do spec têm task correspondente.
- **Consistência de tipos:** `studentId`/`disciplineId`/`studentName` usados de forma idêntica entre Task 2 (produz), Task 3 (reusa a mesma forma de cálculo) e Task 5 (consome `{studentId, studentName}[]`). `StudentNotification` (`id, type, title, message, read, createdAt, disciplineId`) é o mesmo shape entre Task 4 (produz) e Task 6 (consome).
- **Fora do escopo** (conforme spec): e-mail/WhatsApp/push, limite de frequência de reenvio.
