# Seleção de alunos por prova — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que administradores escolham participantes específicos, agrupados por turma, e garantir que somente esses alunos possam acessar e responder à prova.

**Architecture:** Uma associação explícita `ExamParticipant` será a fonte de autorização. O painel terá um formulário cliente compartilhado entre criação e edição, apoiado por funções puras testáveis; ações administrativas validarão elegibilidade e integridade dentro de transações. As rotas de portal do Next.js e da API Express filtrarão e autorizarão pelo participante, sem confiar apenas na disciplina.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 6/PostgreSQL, Node test runner, Vitest/Supertest, Expo/React Native.

## Global Constraints

- Somente alunos com matrícula `CURSANDO` em turma vinculada à disciplina podem ser selecionados.
- Todos os alunos começam desmarcados na criação.
- É obrigatório selecionar ao menos um participante.
- Trocar a disciplina descarta a seleção anterior.
- Participantes com `ExamSubmission` não podem ser removidos.
- Duplicar uma prova copia os participantes e mantém a cópia como rascunho.
- Todas as rotas de leitura e mutação do aluno devem conferir o vínculo explícito.
- Erros esperados devem ser apresentados em português e operações compostas devem ser transacionais.

---

### Task 1: Persistir participantes da prova

**Files:**
- Create: `huios-admin/src/lib/exam-participant-schema.test.mts`
- Modify: `huios-admin/prisma/schema.prisma`
- Modify: `huios-api/prisma/schema.prisma`
- Create: `huios-admin/prisma/migrations/20260806120000_add_exam_participants/migration.sql`
- Create: `huios-api/prisma/migrations/20260806120000_add_exam_participants/migration.sql`

**Interfaces:**
- Produces: Prisma model `ExamParticipant` and relations `Exam.participants` / `Student.examParticipations`.

- [ ] **Step 1: Write the failing schema parity test**

```ts
test('schemas e migrações definem participantes da prova', () => {
  for (const schema of [adminSchema, apiSchema]) {
    assert.match(schema, /model ExamParticipant/);
    assert.match(schema, /@@id\(\[examId, studentId\]\)/);
    assert.match(schema, /participants\s+ExamParticipant\[\]/);
    assert.match(schema, /examParticipations\s+ExamParticipant\[\]/);
  }
  assert.equal(adminMigration, apiMigration);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --test-name-pattern="schemas e migrações"` from `huios-admin`.
Expected: FAIL because `ExamParticipant` is absent.

- [ ] **Step 3: Add the model and migration**

```prisma
model ExamParticipant {
  examId    String
  studentId String
  createdAt DateTime @default(now())
  exam      Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@id([examId, studentId])
  @@index([studentId])
}
```

The SQL must create the table, composite primary key, student index, and cascading foreign keys to `Exam` and `Student` in both migration trees.

- [ ] **Step 4: Generate both Prisma clients and verify GREEN**

Run: `npx prisma generate && npm test -- --test-name-pattern="schemas e migrações"` in each package as applicable.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/prisma huios-api/prisma huios-admin/src/lib/exam-participant-schema.test.mts
git commit -m "feat: add exam participant persistence"
```

### Task 2: Criar regras de seleção e validação

**Files:**
- Create: `huios-admin/src/lib/exam-participants.ts`
- Create: `huios-admin/src/lib/exam-participants.test.ts`

**Interfaces:**
- Produces: `parseParticipantIds(formData): string[]`.
- Produces: `groupDisciplineStudents(discipline): ExamClassGroup[]`.
- Produces: `validateParticipantSelection(input, gateway): Promise<string[]>`.
- Produces: `assertRemovableParticipants(examId, currentIds, nextIds, gateway): Promise<void>`.
- Produces types `ExamClassGroup` and `ExamClassStudent` for the form.

- [ ] **Step 1: Write failing tests for parsing, grouping, eligibility, and locked removal**

```ts
test('agrupa apenas alunos cursando e elimina duplicatas entre turmas', () => {
  const groups = groupDisciplineStudents(disciplineFixture);
  assert.deepEqual(groups.map(group => group.students.map(student => student.id)), [['a1'], ['a1', 'a2']]);
});

test('rejeita seleção vazia, duplicada ou inelegível', async () => {
  await assert.rejects(() => validateParticipantSelection({ disciplineId: 'd1', studentIds: [] }, gateway), /Selecione ao menos um aluno/);
  await assert.rejects(() => validateParticipantSelection({ disciplineId: 'd1', studentIds: ['a1', 'a1'] }, gateway), /duplicados/);
  await assert.rejects(() => validateParticipantSelection({ disciplineId: 'd1', studentIds: ['fora'] }, gateway), /não está cursando/);
});

test('impede remover participante que iniciou a prova', async () => {
  await assert.rejects(() => assertRemovableParticipants('p1', ['a1'], [], gatewayWithSubmission), /já iniciou/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --test-name-pattern="agrupa|seleção vazia|impede remover"` from `huios-admin`.
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement minimal pure rules and a small Prisma-compatible gateway interface**

```ts
export type ParticipantGateway = {
  findEligibleStudentIds(disciplineId: string, studentIds: string[]): Promise<string[]>;
  findSubmittedStudentIds(examId: string, studentIds: string[]): Promise<string[]>;
};

export async function validateParticipantSelection(
  input: { disciplineId: string; studentIds: string[] },
  gateway: ParticipantGateway,
): Promise<string[]> { /* normalize, reject empty/duplicates, compare eligible IDs */ }
```

`groupDisciplineStudents` must preserve each turma and sort its students by name. It may show the same student in two groups, but the submitted participant ID set remains unique.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- --test-name-pattern="agrupa|seleção vazia|impede remover"` from `huios-admin`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/src/lib/exam-participants.ts huios-admin/src/lib/exam-participants.test.ts
git commit -m "feat: add exam participant validation"
```

### Task 3: Construir seletor modal e formulário compartilhado

**Files:**
- Create: `huios-admin/src/app/provas/ExamForm.tsx`
- Create: `huios-admin/src/app/provas/StudentSelectionModal.tsx`
- Create: `huios-admin/src/app/provas/student-selection.ts`
- Create: `huios-admin/src/app/provas/student-selection.test.ts`
- Modify: `huios-admin/src/app/provas/novo/page.tsx`
- Modify: `huios-admin/src/app/provas/[id]/editar/page.tsx`

**Interfaces:**
- `ExamForm({ disciplines, action, initialExam?, initialParticipantIds?, lockedParticipantIds? })` renders both create/edit fields and hidden `studentIds` inputs.
- `StudentSelectionModal({ open, groups, selectedIds, lockedIds, onCancel, onConfirm })` owns a temporary selection.
- Pure helpers: `toggleStudent`, `selectClass`, `clearClass`, `countSelectedClasses`, `filterGroups`.

- [ ] **Step 1: Write failing selection-state tests**

```ts
test('seleciona e limpa uma turma sem remover participantes bloqueados', () => {
  assert.deepEqual([...selectClass(new Set(), ['a1', 'a2'])], ['a1', 'a2']);
  assert.deepEqual([...clearClass(new Set(['a1', 'a2']), ['a1', 'a2'], new Set(['a1']))], ['a1']);
});

test('trocar disciplina devolve seleção vazia', () => {
  assert.deepEqual([...selectionAfterDisciplineChange('d1', 'd2', new Set(['a1']))], []);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --test-name-pattern="seleciona e limpa|trocar disciplina"` from `huios-admin`.
Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Implement helpers, modal, and form**

The modal must include search, sections by course/turma, per-class counts, `Marcar todos`, `Desmarcar todos`, individual checkboxes, locked badges, total count, `Cancelar`, and `Confirmar seleção`. `Cancelar` must not mutate the parent set. The form must render one hidden input per selected ID:

```tsx
{[...selectedIds].map(id => <input key={id} type="hidden" name="studentIds" value={id} />)}
```

Hide the selection button until a discipline is chosen. Require at least one selected ID before submit and display `N alunos selecionados em M turmas`.

- [ ] **Step 4: Replace create/edit duplicated forms and verify GREEN**

The server pages must query disciplines → course classes → `CURSANDO` enrollments → student, call `groupDisciplineStudents`, and pass initial/locked IDs on edit.

Run: `npm test -- --test-name-pattern="seleciona e limpa|trocar disciplina" && npm run lint -- src/app/provas src/lib/exam-participants.ts` from `huios-admin`.
Expected: PASS with no new lint errors.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/src/app/provas huios-admin/src/lib/exam-participants.ts
git commit -m "feat: add exam student selection modal"
```

### Task 4: Tornar ações administrativas transacionais e seguras

**Files:**
- Create: `huios-admin/src/app/provas/exam-actions.test.ts`
- Create: `huios-admin/src/app/provas/exam-participant-operations.ts`
- Modify: `huios-admin/src/app/provas/actions.ts`
- Modify: `huios-admin/src/app/provas/page.tsx`
- Modify: `huios-admin/src/app/provas/[id]/duplicar/page.tsx`

**Interfaces:**
- Produces operation functions `createExamWithParticipants`, `updateExamWithParticipants`, `duplicateExamWithParticipants`, `publishExamWithParticipants` using an injected Prisma-shaped gateway.
- Server actions remain named `createExam`, `updateExam`, `duplicateExam`, and `publishExam`.

- [ ] **Step 1: Write failing operation tests**

```ts
test('cria prova e participantes em uma transação', async () => {
  await createExamWithParticipants(input, fakeGateway);
  assert.deepEqual(fakeGateway.createdParticipants, [{ studentId: 'a1' }, { studentId: 'a2' }]);
});

test('duplicação copia participantes e mantém rascunho', async () => {
  const copy = await duplicateExamWithParticipants('p1', dates, fakeGateway);
  assert.equal(copy.isPublished, false);
  assert.deepEqual(copy.studentIds, ['a1', 'a2']);
});

test('publicação exige participante', async () => {
  await assert.rejects(() => publishExamWithParticipants('p1', emptyGateway), /Selecione ao menos um aluno/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --test-name-pattern="cria prova|duplicação copia|publicação exige"` from `huios-admin`.
Expected: FAIL because operations do not exist.

- [ ] **Step 3: Implement operations and wire actions**

Creation and update must call Task 2 validation before a single `$transaction`. Update computes removed IDs and calls `assertRemovableParticipants` before delete/create. Duplicate includes `participants` and creates copied `{ studentId }` rows. Publish counts participants and throws `Selecione ao menos um aluno antes de publicar a prova.` when zero.

- [ ] **Step 4: Add participant counts to the list/duplicate copy and verify GREEN**

Update `_count` to include `participants`; show the participant count in the administrative table. Update duplicate-page copy to state that questions, alternatives, and selected students will be copied.

Run: `npm test -- --test-name-pattern="cria prova|duplicação copia|publicação exige" && npm run lint -- src/app/provas` from `huios-admin`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/src/app/provas
git commit -m "feat: enforce exam participant lifecycle"
```

### Task 5: Restringir portal web do Next.js

**Files:**
- Create: `huios-admin/src/app/api/portal/provas/exam-access.test.ts`
- Create: `huios-admin/src/app/api/portal/provas/exam-access.ts`
- Modify: `huios-admin/src/app/api/portal/provas/route.ts`
- Modify: `huios-admin/src/app/api/portal/provas/[id]/submit/route.ts`

**Interfaces:**
- Produces `studentExamWhere(studentId, extra?)` returning a Prisma-compatible filter with `participants: { some: { studentId } }`.

- [ ] **Step 1: Write failing access-filter tests**

```ts
test('filtro exige vínculo explícito do aluno', () => {
  assert.deepEqual(studentExamWhere('a1'), {
    isPublished: true,
    participants: { some: { studentId: 'a1' } },
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --test-name-pattern="vínculo explícito"` from `huios-admin`.
Expected: FAIL because helper does not exist.

- [ ] **Step 3: Apply the filter to list and submission**

List exams by publication plus participant relation. In submit, replace `findUnique` with an authorized `findFirst` including `id`, `isPublished`, and participant; return 404 `Prova não disponível para este aluno` before checking or creating submissions when authorization fails.

- [ ] **Step 4: Run and verify GREEN**

Run: `npm test -- --test-name-pattern="vínculo explícito" && npm run lint -- src/app/api/portal/provas` from `huios-admin`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/src/app/api/portal/provas
git commit -m "fix: restrict web exams to selected students"
```

### Task 6: Restringir API usada pelo aplicativo móvel

**Files:**
- Modify: `huios-api/src/controllers/portalController.test.ts`
- Modify: `huios-api/src/controllers/portalController.ts`
- Modify: `huios-api/src/controllers/examController.ts`

**Interfaces:**
- Every student exam query adds `participants: { some: { studentId } }`.
- Administrative API creation/update accepts `studentIds: string[]`; publication requires at least one participant.

- [ ] **Step 1: Change portal tests to require participant scope**

```ts
expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
  where: expect.objectContaining({ participants: { some: { studentId: 'student-1' } } })
}));
expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
  where: expect.objectContaining({ participants: { some: { studentId: 'student-1' } } })
}));
```

Cover list, teacher-evaluation read/write, questions, and submit. Add a 404 case for a nonparticipant and assert no submission/grade mutation occurs.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/controllers/portalController.test.ts` from `huios-api`.
Expected: FAIL because participant filters are absent.

- [ ] **Step 3: Add participant filters and administrative participant writes**

In `listStudentExams`, `getStudentExamTeacherEvaluation`, `submitStudentExamTeacherEvaluation`, `listStudentExamQuestions`, and `submitStudentExam`, add:

```ts
participants: { some: { studentId } }
```

Administrative create/update must validate eligibility and write participant rows transactionally; duplicate copies `participants`; publish rejects zero participants.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- --run src/controllers/portalController.test.ts && npm run build` from `huios-api`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add huios-api/src/controllers
git commit -m "fix: restrict mobile exams to selected students"
```

### Task 7: Verificação integrada e documentação operacional

**Files:**
- Modify only files required to resolve failures caused by Tasks 1–6.

**Interfaces:**
- Consumes all preceding tasks; produces a verified feature without new behavior.

- [ ] **Step 1: Apply migrations to a disposable/test database or validate SQL and Prisma schemas**

Run `npx prisma validate` and `npx prisma generate` in both `huios-admin` and `huios-api`. If a disposable database is configured, run `npx prisma migrate deploy` there only.

- [ ] **Step 2: Run complete test suites**

Run `npm test` in `huios-admin`, `npm test -- --run` in `huios-api`, and `npm test -- --runInBand` in `huios-mobile`.
Expected: all suites PASS.

- [ ] **Step 3: Run static verification**

Run `npm run lint` and `npm run build` in `huios-admin`; run `npm run build` in `huios-api`.
Expected: no new errors or warnings attributable to this change.

- [ ] **Step 4: Manually verify the critical UI path when a runnable environment is available**

Create a draft, select one student, select/clear a whole turma, cancel/reopen the modal, edit participants, duplicate, publish, and confirm a selected and unselected student see different portal results.

- [ ] **Step 5: Commit verification-only fixes if any**

```bash
git add huios-admin/src/app/provas huios-admin/src/app/api/portal/provas huios-admin/src/lib/exam-participants.ts huios-api/src/controllers/portalController.ts huios-api/src/controllers/portalController.test.ts
git commit -m "test: verify exam participant access"
```
