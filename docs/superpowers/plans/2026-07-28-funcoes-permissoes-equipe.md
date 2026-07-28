# Funções e Permissões da Equipe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar contas de equipe com funções configuráveis, permissões por ação, troca obrigatória de senha e acesso duplo ao administrativo e ao portal.

**Architecture:** O Prisma armazenará funções, permissões, vínculos e auditoria; um catálogo TypeScript será a fonte das chaves suportadas. O Next.js consultará a autorização atual no servidor e o Express revalidará usuário e permissões a cada requisição autenticada, sem confiar no papel gravado no JWT.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 6, PostgreSQL, Express, jose/jsonwebtoken, bcryptjs, Vitest.

## Global Constraints

- Bloquear por padrão toda capacidade não concedida.
- Uma conta pode ter simultaneamente vínculo com `Student` e `TeamMember`.
- Cada usuário possui no máximo uma função administrativa.
- Somente Super Admin administra equipe, funções e permissões.
- Super Admin tem acesso irrestrito e sua função protegida não pode ser alterada.
- O último Super Admin ativo não pode ser desativado ou rebaixado.
- Senhas, hashes e tokens não entram em logs ou auditoria.
- O usuário mestre é `admin@huios.com.br`; a senha inicial vem de `SUPER_ADMIN_INITIAL_PASSWORD`, com compatibilidade local para a credencial aprovada.
- Professor e Monitor exigem permissão e vínculo com a turma solicitada.

---

## Mapa de arquivos

- `huios-admin/prisma/schema.prisma` e `huios-api/prisma/schema.prisma`: modelos RBAC idênticos.
- `huios-admin/prisma/migrations/20260728170000_add_rbac_team_access/migration.sql`: migração compatível com dados existentes.
- `huios-admin/src/lib/permissions/catalog.ts`: catálogo tipado compartilhado no admin.
- `huios-admin/src/lib/permissions/server.ts`: resolução de acesso e invariantes do Super Admin.
- `huios-admin/src/lib/permissions/path-access.ts`: requisitos de permissão por rota.
- `huios-api/src/auth/permissions.ts`: autorização do Express.
- `huios-admin/src/app/funcoes/*`: listagem e editor de funções.
- `huios-admin/src/app/equipe/*`: criação e manutenção transacional de contas.
- `huios-admin/src/app/trocar-senha/*`: troca obrigatória de senha.
- `huios-admin/src/app/components/Sidebar.tsx`: navegação filtrada e alternância de contexto.

### Task 1: Persistência RBAC e migração

**Files:**
- Modify: `huios-admin/prisma/schema.prisma`
- Modify: `huios-api/prisma/schema.prisma`
- Create: `huios-admin/prisma/migrations/20260728170000_add_rbac_team_access/migration.sql`

**Interfaces:**
- Produces: modelos Prisma `Role`, `Permission`, `RolePermission`, `AuditLog`; `User.adminRoleId`, `User.mustChangePassword`, `TeamMember.userId`, `TeamMember.active`.

- [ ] **Step 1: Adicionar os modelos aos dois schemas**

```prisma
model Role {
  id          String           @id @default(uuid())
  key         String           @unique
  name        String
  description String?
  active      Boolean          @default(true)
  protected   Boolean          @default(false)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  users       User[]
  permissions RolePermission[]
}

model Permission {
  id          String           @id @default(uuid())
  key         String           @unique
  module      String
  action      String
  description String?
  roles       RolePermission[]
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
}

model AuditLog {
  id           String   @id @default(uuid())
  actorId      String?
  action       String
  entity       String
  entityId     String?
  changes      Json?
  createdAt    DateTime @default(now())
  actor        User?    @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull)
}
```

Adicionar a `User`: `adminRoleId String?`, `adminRole Role?`, `mustChangePassword Boolean @default(false)` e `auditLogs AuditLog[] @relation("AuditActor")`. Adicionar a `TeamMember`: `userId String? @unique`, `user User? @relation(...)` e `active Boolean @default(true)`.

- [ ] **Step 2: Escrever a migração SQL segura**

Criar tabelas e índices, adicionar colunas inicialmente opcionais, inserir funções iniciais com chaves `SUPER_ADMIN`, `COORDENADOR`, `SECRETARIA`, `FINANCEIRO`, `PROFESSOR`, `MONITOR`, migrar `User.role` para `adminRoleId`, e ligar `TeamMember.userId` por e-mail apenas quando houver correspondência única.

- [ ] **Step 3: Validar os schemas**

Run: `npx prisma validate --schema huios-admin/prisma/schema.prisma`
Expected: `The schema ... is valid`

Run: `npx prisma validate --schema huios-api/prisma/schema.prisma`
Expected: `The schema ... is valid`

- [ ] **Step 4: Gerar os clientes**

Run: `npx prisma generate --schema huios-admin/prisma/schema.prisma`
Run: `npx prisma generate --schema huios-api/prisma/schema.prisma`
Expected: ambos finalizam sem erro.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/prisma huios-api/prisma/schema.prisma
git commit -m "feat: add rbac data model"
```

### Task 2: Catálogo de permissões e provisionamento

**Files:**
- Create: `huios-admin/src/lib/permissions/catalog.ts`
- Create: `huios-admin/src/lib/permissions/catalog.test.ts`
- Modify: `huios-admin/prisma/seed.ts`
- Modify: `huios-api/prisma/seed.ts`

**Interfaces:**
- Produces: `PERMISSIONS`, `PermissionKey`, `DEFAULT_ROLE_PERMISSIONS`, `syncAuthorizationSeed(prisma)`.

- [ ] **Step 1: Escrever teste do catálogo**

Testar que as chaves são únicas, seguem `modulo.acao`, que todas as permissões padrão existem e que `SUPER_ADMIN` não depende de associações.

- [ ] **Step 2: Executar o teste e confirmar falha**

Run: `cd huios-admin; npx tsx --test src/lib/permissions/catalog.test.ts`
Expected: FAIL porque `catalog.ts` não existe.

- [ ] **Step 3: Implementar catálogo tipado**

```ts
export const MODULE_ACTIONS = {
  dashboard: ["visualizar"],
  alunos: ["visualizar", "criar", "editar", "excluir"],
  professores: ["visualizar", "criar", "editar", "excluir"],
  equipe: ["visualizar", "gerenciar"],
  funcoes: ["visualizar", "gerenciar"],
  igrejas: ["visualizar", "criar", "editar", "excluir"],
  cursos: ["visualizar", "criar", "editar", "excluir"],
  turmas: ["visualizar", "criar", "editar", "excluir"],
  disciplinas: ["visualizar", "criar", "editar", "excluir"],
  matriculas: ["visualizar", "criar", "editar", "excluir"],
  aulas: ["visualizar", "criar", "editar", "excluir"],
  presenca: ["visualizar", "registrar", "editar"],
  provas: ["visualizar", "criar", "editar", "excluir", "aplicar", "corrigir"],
  notas: ["visualizar", "lancar", "editar"],
  boletins: ["visualizar", "editar"],
  avaliacoes: ["visualizar", "gerenciar", "notificar"],
  relatorios: ["visualizar", "exportar"],
  financeiro: ["visualizar", "criar", "editar", "excluir", "conciliar", "exportar"],
  configuracoes: ["visualizar", "editar"],
} as const;

type ModuleKey = keyof typeof MODULE_ACTIONS;
export type PermissionKey = {
  [M in ModuleKey]: `${M}.${(typeof MODULE_ACTIONS)[M][number]}`
}[ModuleKey];

export const PERMISSIONS: Array<{
  key: PermissionKey;
  module: ModuleKey;
  action: string;
}> = (Object.entries(MODULE_ACTIONS) as Array<
  [ModuleKey, readonly string[]]
>).flatMap(
  ([module, actions]) => actions.map(action => ({
    key: `${module}.${action}` as PermissionKey,
    module,
    action,
  }))
);
```

Preencher `DEFAULT_ROLE_PERMISSIONS` conforme a especificação, sem incluir as chaves de gestão de equipe/funções em funções configuráveis.

- [ ] **Step 4: Atualizar os seeds**

Fazer `upsert` de permissões, funções e associações. Fazer `upsert` do mestre, hash de `process.env.SUPER_ADMIN_INITIAL_PASSWORD ?? "admin123"`, função protegida, `active: true` e `mustChangePassword: false`; nunca imprimir a senha.

- [ ] **Step 5: Executar o teste**

Run: `cd huios-admin; npx tsx --test src/lib/permissions/catalog.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add huios-admin/src/lib/permissions huios-admin/prisma/seed.ts huios-api/prisma/seed.ts
git commit -m "feat: seed roles and permission catalog"
```

### Task 3: Autorização central no Next.js

**Files:**
- Create: `huios-admin/src/lib/permissions/server.ts`
- Create: `huios-admin/src/lib/permissions/server.test.ts`
- Create: `huios-admin/src/lib/permissions/path-access.ts`
- Modify: `huios-admin/src/app/api/auth/me/route.ts`

**Interfaces:**
- Produces: `getAccessContext()`, `requirePermission(key)`, `requireSuperAdmin()`, `canAccess(context, key)`, `AccessContext`.

- [ ] **Step 1: Escrever testes das regras**

Cobrir usuário inativo, Super Admin sem associações, função inativa, permissão concedida/negada, conta apenas de aluno e `mustChangePassword`.

- [ ] **Step 2: Executar e confirmar falha**

Run: `cd huios-admin; npx tsx --test src/lib/permissions/server.test.ts`
Expected: FAIL porque o módulo não existe.

- [ ] **Step 3: Implementar o contexto**

```ts
export interface AccessContext {
  userId: string;
  name: string;
  email: string;
  isStudent: boolean;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  role: { id: string; key: string; name: string } | null;
  permissions: Set<PermissionKey>;
}

export function canAccess(ctx: AccessContext, key: PermissionKey): boolean {
  return ctx.isSuperAdmin || ctx.permissions.has(key);
}
```

`getAccessContext()` deve reler `active`, vínculos, função e permissões pelo `session.userId`. `requirePermission` lança erro tipado `ForbiddenError`; `requireSuperAdmin` aplica a invariante protegida.

- [ ] **Step 4: Mapear rotas administrativas**

Criar `PATH_PERMISSIONS` com prefixos mais específicos primeiro e cobrir todos os itens do Sidebar; `/equipe` exige `equipe.visualizar` e `/funcoes` exige `funcoes.visualizar`.

- [ ] **Step 5: Ampliar `/api/auth/me`**

Retornar `isStudent`, `isAdmin`, `mustChangePassword`, função e array de permissões, sem hashes ou campos internos.

- [ ] **Step 6: Rodar testes**

Run: `cd huios-admin; npx tsx --test src/lib/permissions/server.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add huios-admin/src/lib/permissions huios-admin/src/app/api/auth/me/route.ts
git commit -m "feat: centralize admin authorization"
```

### Task 4: Login, sessão atual e troca obrigatória de senha

**Files:**
- Modify: `huios-api/src/controllers/authController.ts`
- Modify: `huios-api/src/middlewares/auth.ts`
- Modify: `huios-api/src/controllers/authController.test.ts`
- Create: `huios-admin/src/app/api/auth/change-password/route.ts`
- Create: `huios-admin/src/app/trocar-senha/page.tsx`
- Modify: `huios-admin/src/middleware.ts`

**Interfaces:**
- Produces: `POST /api/auth/change-password`; login retorna contextos disponíveis e `mustChangePassword`.

- [ ] **Step 1: Acrescentar testes de autenticação**

Testar recusa de usuário inativo, resposta com `isStudent` e `isAdmin`, papel administrativo atual e bloqueio de requisição quando a conta foi desativada após emissão do JWT.

- [ ] **Step 2: Confirmar falhas**

Run: `cd huios-api; npm test -- src/controllers/authController.test.ts`
Expected: novos casos FAIL.

- [ ] **Step 3: Atualizar login e middleware Express**

JWT conterá somente `id` e `email` como identidade. `authenticateToken` relerá o usuário e recusará conta ausente/inativa. Login incluirá função administrativa e vínculo de aluno.

- [ ] **Step 4: Implementar troca de senha**

Validar senha atual, nova senha com ao menos 8 caracteres, confirmação igual e diferença da senha anterior; salvar hash bcrypt e `mustChangePassword: false`.

- [ ] **Step 5: Criar a tela obrigatória**

Formulário com senha atual, nova senha e confirmação; sucesso redireciona ao contexto administrativo quando houver função, senão ao portal.

- [ ] **Step 6: Bloquear navegação durante troca pendente**

No middleware, permitir apenas `/trocar-senha`, endpoints de sessão, alteração de senha e logout quando a informação assinada indicar troca pendente; a API fará a verificação definitiva no servidor.

- [ ] **Step 7: Rodar testes e build da API**

Run: `cd huios-api; npm test -- src/controllers/authController.test.ts`
Run: `cd huios-api; npm run build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add huios-api/src huios-admin/src/app/api/auth/change-password huios-admin/src/app/trocar-senha huios-admin/src/middleware.ts
git commit -m "feat: enforce temporary password change"
```

### Task 5: Gestão transacional de membros da equipe

**Files:**
- Modify: `huios-admin/src/app/equipe/actions.ts`
- Create: `huios-admin/src/app/equipe/actions.test.ts`
- Modify: `huios-admin/src/app/equipe/novo/page.tsx`
- Modify: `huios-admin/src/app/equipe/[id]/editar/page.tsx`
- Modify: `huios-admin/src/app/equipe/page.tsx`

**Interfaces:**
- Consumes: `requireSuperAdmin()`, modelos `Role`, `User`, `TeamMember`.
- Produces: `createTeamMember`, `updateTeamMember`, `setTeamMemberActive`, `resetTeamMemberPassword`.

- [ ] **Step 1: Escrever testes das ações**

Cobrir criação de pessoa nova, vínculo com usuário/aluno existente, conflito de e-mail, função inativa, senha temporária, transação atômica, desativação imediata, autorrestrição e último Super Admin.

- [ ] **Step 2: Confirmar falhas**

Run: `cd huios-admin; npx tsx --test src/app/equipe/actions.test.ts`
Expected: novos casos FAIL.

- [ ] **Step 3: Implementar ações protegidas**

Todas começam com `const actor = await requireSuperAdmin()`. Criação usa `$transaction`, hash bcrypt e `mustChangePassword: true`. Atualização altera `TeamMember`, `User` e função na mesma transação. Exclusão física deixa de ser usada para contas com histórico.

- [ ] **Step 4: Atualizar formulários**

Substituir o seletor fixo por funções ativas vindas do banco; incluir senha temporária e status. Ao selecionar aluno, reutilizar a conta já vinculada. A edição permite função, ativação/desativação e redefinição de senha.

- [ ] **Step 5: Atualizar listagem**

Exibir função configurável, status da conta, indicação de aluno e ações compatíveis. Somente Super Admin abre criar/editar.

- [ ] **Step 6: Rodar testes**

Run: `cd huios-admin; npx tsx --test src/app/equipe/actions.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add huios-admin/src/app/equipe
git commit -m "feat: create team member access accounts"
```

### Task 6: Funções e matriz de permissões

**Files:**
- Create: `huios-admin/src/app/funcoes/actions.ts`
- Create: `huios-admin/src/app/funcoes/actions.test.ts`
- Create: `huios-admin/src/app/funcoes/page.tsx`
- Create: `huios-admin/src/app/funcoes/RoleList.tsx`
- Create: `huios-admin/src/app/funcoes/[id]/page.tsx`
- Create: `huios-admin/src/app/funcoes/[id]/PermissionMatrix.tsx`

**Interfaces:**
- Produces: `createRole`, `updateRole`, `duplicateRole`, `setRoleActive`, `replaceRolePermissions`.

- [ ] **Step 1: Escrever testes das invariantes**

Cobrir chave/nome único, duplicação, substituição atômica de permissões, rejeição de chave desconhecida, bloqueio de função protegida, função inativa em uso e auditoria.

- [ ] **Step 2: Confirmar falhas**

Run: `cd huios-admin; npx tsx --test src/app/funcoes/actions.test.ts`
Expected: FAIL porque as ações não existem.

- [ ] **Step 3: Implementar ações**

Gerar `key` normalizada apenas na criação, filtrar permissões pelo catálogo e executar atualizações em transação. `setRoleActive(false)` mantém vínculos e impede uso administrativo até nova atribuição.

- [ ] **Step 4: Criar listagem**

Mostrar nome, descrição, status, proteção e quantidade de usuários; disponibilizar criar, duplicar, editar e desativar conforme regras.

- [ ] **Step 5: Criar matriz**

Agrupar `PERMISSIONS` por módulo, linhas por ação, seleção por checkbox e ações “marcar módulo”/“limpar módulo”. Super Admin é somente leitura.

- [ ] **Step 6: Rodar testes**

Run: `cd huios-admin; npx tsx --test src/app/funcoes/actions.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add huios-admin/src/app/funcoes
git commit -m "feat: manage roles and permissions"
```

### Task 7: Navegação filtrada e alternância de contexto

**Files:**
- Modify: `huios-admin/src/app/components/AppShell.tsx`
- Modify: `huios-admin/src/app/components/Sidebar.tsx`
- Modify: `huios-admin/src/app/components/Header.tsx`
- Create: `huios-admin/src/app/acesso-negado/page.tsx`
- Create: `huios-admin/src/app/components/navigation.test.ts`

**Interfaces:**
- Consumes: resposta ampliada de `/api/auth/me`, `PermissionKey`.

- [ ] **Step 1: Escrever teste de filtragem**

Validar que grupos vazios somem, Financeiro exige chaves financeiras, Equipe/Funções aparecem apenas ao Super Admin e alternância aparece apenas quando `isStudent && isAdmin`.

- [ ] **Step 2: Confirmar falha**

Run: `cd huios-admin; npx tsx --test src/app/components/navigation.test.ts`
Expected: FAIL.

- [ ] **Step 3: Centralizar itens de navegação**

Cada link terá `permission: PermissionKey`; filtrar com `isSuperAdmin || permissions.includes(permission)`.

- [ ] **Step 4: Implementar alternância**

Adicionar “Portal do Aluno” no admin e “Área Administrativa” no portal quando ambos os contextos existirem. A ação apenas navega; não troca token.

- [ ] **Step 5: Adicionar acesso negado**

Página com explicação curta e retorno ao primeiro destino permitido, sem revelar o recurso bloqueado.

- [ ] **Step 6: Rodar teste**

Run: `cd huios-admin; npx tsx --test src/app/components/navigation.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add huios-admin/src/app/components huios-admin/src/app/acesso-negado huios-admin/src/app/portal
git commit -m "feat: filter navigation by permissions"
```

### Task 8: Proteger páginas, APIs e Server Actions

**Files:**
- Modify: `huios-admin/src/middleware.ts`
- Modify: Server Actions em `huios-admin/src/app/**/actions.ts`
- Modify: Route handlers em `huios-admin/src/app/api/admin/**/route.ts`
- Create: `huios-admin/src/lib/permissions/path-access.test.ts`

**Interfaces:**
- Consumes: `PATH_PERMISSIONS`, `requirePermission`, `requireSuperAdmin`.

- [ ] **Step 1: Testar cobertura das rotas**

Enumerar todos os hrefs do menu e assegurar que cada rota administrativa não pública possui requisito no mapa. Testar precedência de `/financeiro/relatorios` sobre `/financeiro`.

- [ ] **Step 2: Confirmar falha de cobertura**

Run: `cd huios-admin; npx tsx --test src/lib/permissions/path-access.test.ts`
Expected: FAIL listando rotas ainda não mapeadas.

- [ ] **Step 3: Completar o mapa e a barreira de página**

Resolver a permissão pelo prefixo mais específico. Rotas sem requisito explícito são negadas, exceto login, portal, matrícula pública, troca de senha e acesso negado.

- [ ] **Step 4: Proteger leituras e mutações**

Em cada arquivo de ações/rotas administrativas, aplicar a chave exata: visualizar para consultas, criar, editar, excluir, exportar ou ação especial para mutações. A validação ocorre antes de consultar o recurso.

- [ ] **Step 5: Restringir escopo de Professor e Monitor**

Para aulas, presença, provas e notas, verificar vínculo do usuário com o professor/equipe e a turma antes da consulta ou alteração. Consultas listam somente turmas vinculadas.

- [ ] **Step 6: Rodar cobertura e lint**

Run: `cd huios-admin; npx tsx --test src/lib/permissions/path-access.test.ts`
Run: `cd huios-admin; npm run lint`
Expected: PASS, sem rota administrativa descoberta fora do mapa.

- [ ] **Step 7: Commit**

```bash
git add huios-admin/src
git commit -m "feat: enforce permissions across admin operations"
```

### Task 9: Autorização equivalente na API Express

**Files:**
- Create: `huios-api/src/auth/permissions.ts`
- Create: `huios-api/src/auth/permissions.test.ts`
- Modify: `huios-api/src/middlewares/auth.ts`
- Modify: `huios-api/src/routes/*.ts`

**Interfaces:**
- Produces: `requireApiPermission(key)`, `requireClassScope(getClassId)`.

- [ ] **Step 1: Escrever testes do middleware**

Cobrir Super Admin, permissão concedida/negada, função inativa, usuário desativado após JWT, Professor/Monitor sem turma e resposta `403`.

- [ ] **Step 2: Confirmar falha**

Run: `cd huios-api; npm test -- src/auth/permissions.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar middleware**

`authenticateToken` anexa usuário atual e permissões. `requireApiPermission` aceita `PermissionKey` equivalente ao catálogo e responde `403` sem dados adicionais. `requireClassScope` valida o identificador resolvido da requisição.

- [ ] **Step 4: Aplicar às rotas administrativas**

Manter rotas de portal sob identidade de aluno; adicionar permissão exata às rotas acadêmicas e administrativas existentes.

- [ ] **Step 5: Rodar testes e build**

Run: `cd huios-api; npm test`
Run: `cd huios-api; npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add huios-api/src
git commit -m "feat: enforce rbac in api"
```

### Task 10: Auditoria, verificação integrada e documentação operacional

**Files:**
- Create: `huios-admin/src/lib/audit.ts`
- Create: `huios-admin/src/lib/audit.test.ts`
- Modify: ações de `huios-admin/src/app/equipe/actions.ts`
- Modify: ações de `huios-admin/src/app/funcoes/actions.ts`
- Modify: `.env.example`
- Create: `docs/acesso-equipe.md`

**Interfaces:**
- Produces: `writeAudit(tx, event)` com sanitização de campos secretos.

- [ ] **Step 1: Escrever testes de auditoria**

Garantir armazenamento de ator/entidade/alterações e remoção recursiva de `password`, `passwordHash`, `token` e `secret`.

- [ ] **Step 2: Confirmar falha**

Run: `cd huios-admin; npx tsx --test src/lib/audit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar e integrar auditoria**

Gravar eventos na mesma transação da alteração. Falha na auditoria deve reverter a operação sensível.

- [ ] **Step 4: Documentar operação**

Adicionar `SUPER_ADMIN_INITIAL_PASSWORD` ao `.env.example` sem valor real. Documentar seed, criação de função, senha temporária, desativação e recuperação do mestre.

- [ ] **Step 5: Executar verificação completa**

Run: `cd huios-api; npm test`
Run: `cd huios-api; npm run build`
Run: `cd huios-admin; npm run lint`
Run: `cd huios-admin; npm run build`
Expected: todos finalizam com código zero.

- [ ] **Step 6: Verificação manual**

Executar a migração em banco de desenvolvimento, rodar seed e confirmar: mestre entra; cria função e membro; membro troca senha; menus são filtrados; URL/API negam acesso; aluno+membro alterna de área; desativação encerra o acesso.

- [ ] **Step 7: Commit**

```bash
git add huios-admin/src/lib/audit.ts huios-admin/src/lib/audit.test.ts huios-admin/src/app/equipe/actions.ts huios-admin/src/app/funcoes/actions.ts .env.example docs/acesso-equipe.md
git commit -m "docs: finalize team access controls"
```
