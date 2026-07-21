# Cadastro de Eventos no Calendário

**Data:** 2026-07-21
**Status:** Aprovado para implementação

## Contexto

O sistema já possui um calendário acadêmico (`/aulas`, admin, e `/portal/aulas`, aluno) baseado no model `Lesson`, sempre vinculado a uma ou mais `Discipline`. Não existe hoje um conceito de evento genérico institucional (formatura, conferência, retiro, reunião) que não esteja atrelado a uma disciplina específica.

O objetivo é permitir que a coordenação cadastre esse tipo de evento e que ele apareça no mesmo calendário de aulas, tanto no admin quanto no portal do aluno.

## Decisões

- **Onde aparece:** no mesmo calendário de Aulas (`/aulas` no admin, `/portal/aulas` no portal), não em uma seção separada.
- **Visibilidade:** admin (coordenação/monitor) e portal do aluno.
- **Público-alvo:** evento pode opcionalmente ser vinculado a turmas (`CourseClass`) específicas. Sem vínculo = evento geral, visível a todos os alunos.
- **Tipo do evento:** campo de texto livre (ex.: "Formatura", "Conferência Anual"), sem lista fixa de categorias.
- **Check-in/presença:** opcional, definido no momento do cadastro do evento via toggle. Quando ligado, reaproveita a lógica de geolocalização já usada nas aulas.

## Modelo de dados (Prisma)

### `Event`

```prisma
model Event {
  id          String   @id @default(uuid())
  title       String
  type        String?           // texto livre: "Formatura", "Conferência", etc.
  description String?

  date      DateTime
  startTime DateTime?
  endTime   DateTime?

  // Vínculo opcional com turmas; vazio = evento geral (todos os alunos)
  courseClasses CourseClass[]

  // Check-in opcional
  requiresCheckIn Boolean  @default(false)
  locationName    String?
  latitude        Float?
  longitude       Float?
  radiusMeters    Int      @default(100)

  attendances EventAttendance[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### `EventAttendance`

Espelha o model `Attendance` (usado em `Lesson`), reaproveitando o enum `AttendanceStatus` já existente.

```prisma
model EventAttendance {
  id      String @id @default(uuid())
  eventId String
  event   Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
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

`Student` recebe uma nova relação `eventAttendances EventAttendance[]`.

### Geração de presença

Assim como em `Lesson`/`Attendance` (ver `project_attendance_generation`), os registros de `EventAttendance` só nascem no momento da criação do evento, e apenas se `requiresCheckIn = true`:
- Se o evento tem turmas vinculadas: gera `EventAttendance` para os alunos com `Enrollment.status = 'CURSANDO'` nessas turmas.
- Se o evento é geral (sem turmas): gera `EventAttendance` para todos os alunos ativos (com matrícula `CURSANDO` em qualquer turma).

Eventos com `requiresCheckIn = false` não geram nenhum registro de presença.

## Cadastro (admin)

Novo botão **"Novo Evento"** em `CalendarContainer` (`/aulas`), ao lado de "Aula Única" e "Cadastro em Lote", levando a `/aulas/eventos/novo`.

Formulário (seguindo o padrão visual de `/aulas/novo`):
- Título (obrigatório)
- Tipo (texto livre, opcional)
- Data, horário de início/término
- Turmas (checkboxes multi-seleção, opcional — vazio = evento geral)
- Descrição/observações
- Toggle "Requer check-in de presença?" — quando ligado, revela campos de localização (nome do local, latitude, longitude, raio em metros), reaproveitando os componentes/lógica já usados em Nova Aula

Server actions em `src/app/aulas/eventos/actions.ts`: `createEvent`, `createEventWithRedirect`, `deleteEvent` — seguindo o mesmo padrão de `src/app/aulas/actions.ts` (parse de datas locais para UTC, `revalidatePath('/aulas')`).

## Calendário (admin + portal)

- `AulasPage` (`/aulas/page.tsx`) passa a buscar também `Event` (com `courseClasses` e `_count.attendances`) e repassa para `CalendarContainer` via nova prop `initialEvents`.
- `CalendarContainer` mescla lições e eventos nas células do dia. Eventos são renderizados com um ícone diferenciado (`celebration`) em vez da cor por disciplina, para distinção visual clara de aulas.
- Clique em um evento abre `EventDetailsModal` (novo componente, análogo a `LessonDetailsModal`): título, tipo, data/hora, local (se `requiresCheckIn`), turmas vinculadas (ou "Evento geral"), descrição, e botão excluir.
- No portal (`/portal/aulas/page.tsx`), a mesma mesclagem é aplicada: uma nova rota `GET /api/portal/eventos` retorna eventos gerais + eventos vinculados às turmas em que o aluno logado está matriculado. O modal de detalhes no portal exibe o mesmo conteúdo do admin, mais o botão de check-in quando `requiresCheckIn = true` e o aluno tiver um `EventAttendance` pendente.

## Check-in de eventos

Reaproveita o fluxo de geolocalização já existente (`/checkin/[id]` no admin/QR e o padrão de `/api/portal/aulas/[id]/checkin`), mas com uma nova rota `POST /api/portal/eventos/[id]/checkin` que opera sobre `EventAttendance` em vez de `Attendance`. Mesma lógica de cálculo de distância (Haversine) e comparação com `radiusMeters`.

## Fora de escopo

- Edição de eventos após criados (só criação e exclusão, como hoje ocorre implicitamente com aulas via `updateLesson` — se necessário no futuro, seguir o mesmo padrão).
- Notificações push/e-mail sobre novos eventos.
- Materiais anexados a eventos (como `LessonMaterial` em aulas).
- Categorias fixas de tipo de evento — texto livre é suficiente por ora.
