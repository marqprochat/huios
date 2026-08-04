# Controle de acesso por ação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align every admin module with explicit action permissions, hide unavailable controls, and redirect forbidden access to `/acesso-negado` instead of exposing raw errors.

**Architecture:** We will keep the permission catalog as the source of truth, add a shared client-side access context for rendering controls, and move page access checks to a server helper that returns either the authorized context or a redirect target. The same action keys will drive UI visibility, page guards, and server-side mutation checks so the browser cannot reveal or execute an operation that the role does not have.

**Tech Stack:** Next.js App Router, React client components, TypeScript, server actions, Express API helpers, node:test.

## Global Constraints

- `visualizar` opens pages, lists and details.
- `criar` covers add, register, duplicate and create flows.
- `editar` covers update, status changes and configuration edits.
- `excluir` covers remove, cancel and deactivate flows.
- Specialized actions like `notificar`, `corrigir`, `conciliar`, `exportar` and `registrar` remain separate when they represent distinct operations.
- `Equipe` and `Funções` must stop relying on generic `gerenciar` in the application flow.
- `Super Admin` keeps unrestricted access.
- Forbidden direct access must end at `/acesso-negado`.

---

### Task 1: Replace the permission model with explicit action keys

**Files:**
- Modify: `huios-admin/src/lib/permissions/catalog.ts`
- Modify: `huios-admin/src/lib/permissions/catalog.test.ts`
- Modify: `huios-admin/src/lib/permissions/path-access.ts`
- Modify: `huios-admin/src/lib/permissions/path-access.test.ts`
- Modify: `huios-admin/src/lib/permissions/server.ts`
- Modify: `huios-admin/src/lib/permissions/server.test.ts`
- Modify: `huios-admin/src/app/funcoes/[id]/PermissionMatrix.tsx`
- Modify: `huios-admin/src/app/funcoes/actions.ts`
- Modify: `huios-admin/src/app/funcoes/actions.test.ts`

**Interfaces:**
- Consumes: `PermissionKey`, `DEFAULT_ROLE_PERMISSIONS`, `resolvePathRequirement`, `requirePermission`, `requireSuperAdmin`.
- Produces: explicit `equipe.criar|editar|excluir` and `funcoes.criar|editar|excluir` permissions, plus compatible grants for roles that previously had `gerenciar`.

- [ ] **Step 1: Write the failing catalog and route tests**
  - Add assertions that `MODULE_ACTIONS.equipe` and `MODULE_ACTIONS.funcoes` only expose `visualizar`, `criar`, `editar`, `excluir`.
  - Add assertions that default roles do not get implicit access to `equipe.*` or `funcoes.*`.
  - Add route tests that `/equipe`, `/equipe/novo`, `/equipe/:id/editar`, `/funcoes`, `/funcoes/nova`, `/funcoes/:id`, and `/funcoes/:id/editar` resolve to `permission` requirements instead of `super-admin`.

- [ ] **Step 2: Run the targeted tests and confirm the current failure**
  - Run: `node --test huios-admin/src/lib/permissions/catalog.test.ts huios-admin/src/lib/permissions/path-access.test.ts`
  - Expected: failures showing the old `gerenciar`/`super-admin` assumptions.

- [ ] **Step 3: Update the catalog and role sync**
  - Replace `gerenciar` on `equipe` and `funcoes` with CRUD-style keys.
  - Keep the legacy `gerenciar` data only as migration input during role synchronization, mapping it to the new action grants so existing roles do not lose access.
  - Update the permission matrix labels so the UI says `Adicionar`, `Editar`, `Excluir`, and `Visualizar`.

- [ ] **Step 4: Move the page guards from super-admin-only to action-based access**
  - Update the permission map so team and role pages require `equipe.visualizar`, `equipe.criar`, `equipe.editar`, `equipe.excluir`, `funcoes.visualizar`, `funcoes.criar`, `funcoes.editar`, and `funcoes.excluir` as appropriate.
  - Keep the `requireSuperAdmin` helper for truly protected admin-only operations if any remain.

- [ ] **Step 5: Verify the tests pass**
  - Run: `node --test huios-admin/src/lib/permissions/catalog.test.ts huios-admin/src/lib/permissions/path-access.test.ts huios-admin/src/lib/permissions/server.test.ts`

### Task 2: Add a shared access context and page redirect helper

**Files:**
- Create: `huios-admin/src/app/components/AccessContext.tsx`
- Modify: `huios-admin/src/app/components/AppShell.tsx`
- Modify: `huios-admin/src/app/components/Sidebar.tsx`
- Modify: `huios-admin/src/app/components/Header.tsx`
- Modify: `huios-admin/src/app/page.tsx`
- Modify: `huios-admin/src/app/professores/page.tsx`
- Modify: `huios-admin/src/app/equipe/page.tsx`
- Modify: `huios-admin/src/app/equipe/[id]/editar/page.tsx`
- Modify: `huios-admin/src/app/equipe/novo/page.tsx`
- Modify: `huios-admin/src/app/funcoes/page.tsx`
- Modify: `huios-admin/src/app/funcoes/[id]/page.tsx`
- Modify: `huios-admin/src/app/funcoes/[id]/editar/page.tsx`
- Modify: `huios-admin/src/app/funcoes/novo/page.tsx`
- Modify: `huios-admin/src/app/acesso-negado/page.tsx`

**Interfaces:**
- Consumes: `resolvePathRequirement`, `getAccessContext`, `AccessContext`, `canAccess`.
- Produces: a client `Can` helper and a server-side redirect path for unauthorized page loads.

- [ ] **Step 1: Write the failing access-context tests**
  - Add tests that a client component can read `isSuperAdmin`, `permissions`, and the current role from a provider.
  - Add tests that forbidden page loads redirect to `/acesso-negado` instead of rendering the page body.

- [ ] **Step 2: Implement the shared access context**
  - Create a provider that exposes the current access context to client components.
  - Add a small `Can` wrapper for button, link, and form visibility.

- [ ] **Step 3: Add a reusable server guard**
  - Add a helper that resolves access on the server and maps `AuthenticationRequiredError` to `/login` and `ForbiddenError` to `/acesso-negado`.
  - Use it in the page entry points before they fetch protected data.

- [ ] **Step 4: Wire the shell and high-level pages to the new context**
  - Feed the context from `AppShell` into `Sidebar`, `Header`, and module pages.
  - Ensure `/equipe` and `/funcoes` render their forbidden state through the redirect path rather than throwing raw errors.

- [ ] **Step 5: Verify the page guard tests**
  - Run the existing App Router and permissions tests that cover access requirements and redirect behavior.

### Task 3: Hide unavailable controls across module UIs and enforce server-side action checks

**Files:**
- Modify: `huios-admin/src/app/professores/ProfessoresClient.tsx`
- Modify: `huios-admin/src/app/professores/page.tsx`
- Modify: `huios-admin/src/app/alunos/AlunosClient.tsx`
- Modify: `huios-admin/src/app/alunos/[id]/StudentDetailClient.tsx`
- Modify: `huios-admin/src/app/alunos/[id]/StatusModal.tsx`
- Modify: `huios-admin/src/app/igrejas/IgrejasClient.tsx`
- Modify: `huios-admin/src/app/cursos/page.tsx`
- Modify: `huios-admin/src/app/cursos/novo/page.tsx`
- Modify: `huios-admin/src/app/cursos/DeleteButton.tsx`
- Modify: `huios-admin/src/app/turmas/page.tsx`
- Modify: `huios-admin/src/app/turmas/novo/page.tsx`
- Modify: `huios-admin/src/app/turmas/DeleteButton.tsx`
- Modify: `huios-admin/src/app/disciplinas/DisciplinasClient.tsx`
- Modify: `huios-admin/src/app/disciplinas/novo/NovaDisciplinaClient.tsx`
- Modify: `huios-admin/src/app/disciplinas/DeleteButton.tsx`
- Modify: `huios-admin/src/app/aulas/CalendarContainer.tsx`
- Modify: `huios-admin/src/app/aulas/components/LessonDetailsModal.tsx`
- Modify: `huios-admin/src/app/aulas/components/EventDetailsModal.tsx`
- Modify: `huios-admin/src/app/aulas/components/LessonMaterials.tsx`
- Modify: `huios-admin/src/app/aulas/[id]/editar/page.tsx`
- Modify: `huios-admin/src/app/aulas/eventos/novo/page.tsx`
- Modify: `huios-admin/src/app/provas/page.tsx`
- Modify: `huios-admin/src/app/provas/[id]/editar/page.tsx`
- Modify: `huios-admin/src/app/provas/[id]/duplicar/page.tsx`
- Modify: `huios-admin/src/app/provas/[id]/questoes/page.tsx`
- Modify: `huios-admin/src/app/boletins/[alunoId]/page.tsx`
- Modify: `huios-admin/src/app/avaliacoes/*`
- Modify: `huios-admin/src/app/financeiro/contas-a-receber/ContasReceberClient.tsx`
- Modify: `huios-admin/src/app/financeiro/contas-a-pagar/ContasPagarClient.tsx`
- Modify: `huios-admin/src/app/financeiro/TransactionAttachments.tsx`
- Modify: `huios-admin/src/app/cupons/CuponsClient.tsx`
- Modify: `huios-admin/src/app/configuracoes/page.tsx`
- Modify: `huios-admin/src/app/equipe/page.tsx`
- Modify: `huios-admin/src/app/equipe/novo/page.tsx`
- Modify: `huios-admin/src/app/equipe/DeleteButton.tsx`
- Modify: `huios-admin/src/app/funcoes/RoleList.tsx`
- Modify: `huios-admin/src/app/funcoes/[id]/page.tsx`
- Modify: `huios-admin/src/app/funcoes/[id]/PermissionMatrix.tsx`
- Modify: `huios-admin/src/app/funcoes/actions.ts`
- Modify: `huios-admin/src/app/equipe/actions.ts`

**Interfaces:**
- Consumes: `Can`, `canAccess`, `AccessContext`, and the new explicit permission keys.
- Produces: UI that hides add/edit/delete/duplicate controls when the corresponding permission is missing, plus server actions that reject direct calls without the matching permission.

- [ ] **Step 1: Write focused UI tests for representative modules**
  - Cover a CRUD page with create/edit/delete buttons.
  - Cover a detail page with edit-only controls.
  - Cover a specialized page that still keeps unique permissions like `corrigir`, `notificar`, `conciliar`, or `exportar`.

- [ ] **Step 2: Render controls only when the matching permission exists**
  - Replace unconditional buttons with `Can` wrappers or `canAccess` checks.
  - Remove action columns entirely when no action is available for that row.

- [ ] **Step 3: Enforce the same permissions on server actions and APIs**
  - Convert team and role mutations to explicit `requirePermission` checks.
  - Keep the old `gerenciar` compatibility only in migration logic, not in runtime checks.

- [ ] **Step 4: Verify the module tests and spot-check the affected routes**
  - Run the page and action test files for the modules that were updated.
  - Manually confirm the buttons disappear when permissions are missing.

### Task 4: Make check-in and check-out respect the configured time window and show clear errors

**Files:**
- Modify: `huios-admin/src/app/api/portal/aulas/[id]/checkin/route.ts`
- Modify: `huios-admin/src/app/api/portal/aulas/[id]/checkin/attendance-window.mjs`
- Modify: `huios-admin/src/app/checkin/[id]/page.tsx`
- Modify: `huios-admin/src/app/portal/checkin/[id]/page.tsx`
- Modify: `huios-admin/src/app/portal/checkin/[id]/student-attendance-client.ts`
- Modify: `huios-admin/src/app/portal/aulas/page.tsx`
- Modify: `huios-admin/src/app/checkin/page.tsx`
- Modify: `huios-api/src/controllers/portalController.ts`
- Modify: `huios-api/src/controllers/portalController.test.ts`

**Interfaces:**
- Consumes: the configured `checkInBufferMinutes`, lesson start/end times, and portal attendance endpoints.
- Produces: consistent time-window validation for both check-in and check-out, plus human-readable error messages in the UI.

- [ ] **Step 1: Write regression tests for the time window**
  - Add coverage for a non-default `checkInBufferMinutes` value.
  - Add coverage for check-out using the same configured window logic as check-in.

- [ ] **Step 2: Tighten the attendance window helper and route**
  - Ensure the helper computes `start ± buffer` for check-in and `end ± buffer` for check-out.
  - Return explicit error strings for early/late attempts.

- [ ] **Step 3: Surface the error message in the check-in UI**
  - Render the API error text in the page instead of a generic failure.
  - Keep the confirmation state separate so the user can see why the attempt failed.

- [ ] **Step 4: Run the attendance tests**
  - Run the portal controller test file and the admin route test file that cover the student attendance flow.

