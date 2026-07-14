# Relatório de status da Avaliação do Professor + notificação ao aluno

**Data:** 2026-07-14
**Status:** Aprovado para implementação

## Contexto

O sistema já tem a feature de "Avaliação do Professor" (anônima):
- `TeacherEvaluation` — respostas anônimas (sem `studentId`), por `disciplineId`.
- `TeacherEvaluationSubmission` — controle de quem já respondeu (`studentId` + `disciplineId`, `@@unique`), sem armazenar as respostas. É a chave para saber "quem fez".
- Elegibilidade ("liberado") hoje só é calculada no portal (`GET /api/portal/avaliacoes`): todas as aulas (`lessons`) da disciplina precisam ter `endTime` (ou fim do dia da `lesson.date`) no passado.
- Painel admin (`/avaliacoes`) já mostra estatísticas agregadas por disciplina, mas não mostra quem respondeu ou não.
- Não existe hoje nenhum canal para notificar um aluno logado (sem e-mail, sem WhatsApp, sem sino no portal — o "sino" existente no `PortalHeader` é na verdade atalho para pendências financeiras).

## Objetivo

1. Relatório por turma/disciplina mostrando quais alunos: **fizeram**, **estão pendentes** (liberado mas não fez) e **ainda não liberados** (aulas não terminaram).
2. Botão para notificar um aluno específico e botão para notificar todos os pendentes de uma disciplina.
3. Canal de notificação: sino de notificações no Portal do Aluno (novo, genérico — não reaproveita o sino financeiro existente).

## Modelo de dados

Novo model `StudentNotification` (em `huios-admin/prisma/schema.prisma`, espelhado em `huios-api/prisma/schema.prisma` conforme padrão já usado pelos outros models compartilhados):

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

Adicionar a relação inversa `studentNotifications StudentNotification[]` no model `Student`.

Migração via `prisma db push` (mesmo padrão usado no resto do projeto — ver [[project_pagbank_config_db]]).

## Backend

### `GET /api/avaliacoes/[disciplineId]/status` (admin, `SUPER_ADMIN`/`COORDENADOR`)

Para a disciplina informada:
1. Busca a `Discipline` com `lessons` e a `class` a que pertence.
2. Calcula `liberado` (boolean) com a mesma regra do `GET /api/portal/avaliacoes`: `lessons.length > 0` e todas as `lessons` com fim no passado.
3. Busca os alunos matriculados na `class` da disciplina com `enrollment.status in ['CURSANDO', 'APROVADO']`.
4. Para cada aluno, busca se existe `TeacherEvaluationSubmission` (studentId + disciplineId).
5. Classifica cada aluno em:
   - `feito` — tem submission
   - `pendente` — não tem submission e `liberado === true`
   - `naoLiberado` — não tem submission e `liberado === false`
6. Retorna `{ disciplineId, disciplineName, liberado, feito: [...], pendente: [...], naoLiberado: [...] }` (cada item da lista: `{ studentId, studentName }`).

### `POST /api/avaliacoes/[disciplineId]/notificar` (admin, mesmo controle de acesso)

Body opcional `{ studentId?: string }`.

- Se `studentId` presente: valida que o aluno está na lista de "pendente" daquela disciplina (reaproveita a lógica do endpoint de status) e cria 1 `StudentNotification`.
- Se `studentId` ausente: recalcula a lista de "pendente" da disciplina e cria 1 `StudentNotification` para cada aluno pendente (bulk, sem limite de frequência/reenvio — coordenador pode notificar de novo quando quiser).
- Mensagem: `title: "Avalie seu professor!"`, `message: "Sua avaliação do professor de {disciplineName} está disponível — dê seu feedback!"`, `type: "TEACHER_EVALUATION_REMINDER"`, `disciplineId`.
- Retorna `{ notified: number }`.

### `GET /api/portal/notificacoes` (aluno autenticado)

Retorna `{ notifications: StudentNotification[], unreadCount: number }` do aluno logado, ordenado por `createdAt desc`.

### `PUT /api/portal/notificacoes/[id]` (aluno autenticado)

Marca a notificação como lida (`read: true, readAt: now`), valida que pertence ao aluno da sessão.

## Frontend

### Admin — `/avaliacoes` (`page.tsx`)

Cada card de disciplina ganha um botão "Ver status dos alunos" (ícone `checklist`) que abre um modal (mesmo padrão visual do modal de observações já existente) com:
- 3 seções: **Fizeram** (lista simples), **Pendentes** (lista com botão "Notificar" por linha + botão "Notificar todos pendentes" no topo da seção), **Ainda não liberado** (lista simples, sem ação).
- Ao clicar em "Notificar" (individual ou em massa), chama a rota `POST` correspondente e mostra um toast/feedback de sucesso (ex.: "3 alunos notificados").

### Portal do Aluno — novo sino de notificações

Adicionar no `PortalHeader.tsx` um segundo ícone (diferente do já existente, que continua sendo o atalho financeiro), com dropdown seguindo o padrão do `Header.tsx` admin:
- Polling de `unreadCount` a cada 30s.
- Ao abrir, busca lista completa via `GET /api/portal/notificacoes`.
- Clique no item marca como lido (`PUT`) e navega para `/portal/avaliacoes/[disciplineId]` quando `disciplineId` presente.

## Fora do escopo

- Notificação por e-mail/WhatsApp/push (não existe integração hoje; ficou definido que o canal é só o sino no portal).
- Bloqueio/limite de frequência de reenvio de notificação.
- Push/service worker.
