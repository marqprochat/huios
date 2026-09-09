# Módulo de Eventos com Inscrição (pagos e gratuitos)

**Data:** 2026-09-09
**Status:** Aprovado — pronto para plano de implementação

## Problema

O sistema já tem um `Event` institucional (calendário + check-in por geolocalização), mas
ele não aceita inscrição, não tem preço e não aparece no portal do aluno. A coordenação
precisa cadastrar eventos como excursões e eventos extras, cobrar por eles (ou não),
receber inscrições de **alunos e de público externo** por uma página pública, ver a
receita em Contas a Receber e ter o evento visível nos calendários do admin e do aluno.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Modelo | Estender o `Event` existente; **não** criar um segundo tipo de evento |
| Preço | Por **lote/tipo de inscrição** (`EventTicket`), cada um com preço de aluno e preço de não-aluno |
| Cadastro do externo | Dados básicos + campos extras configuráveis por evento. **Não** cria `Student` |
| Confirmação | Inscrição paga só é confirmada após o pagamento; a vaga fica reservada por um prazo configurável no evento |
| Cupons | Fora do escopo desta versão |
| Check-in | Fora do escopo. Apenas lista de inscritos (o check-in institucional atual continua como está) |
| Financeiro | Categoria `Eventos`, criada automaticamente |
| Admin | Nova seção `/eventos` no menu |
| Calendário do aluno | Nova página `/portal/eventos` + bloco na home do portal |

## Arquitetura

Tudo vive no app `huios-admin` (Next.js App Router + Prisma/PostgreSQL), que é onde já
estão matrícula, financeiro, gateway de pagamento e portal do aluno.

### Rejeitadas

- **Model `PaidEvent` independente:** criaria duas fontes de "evento" no calendário e dois
  cadastros; o coordenador teria de saber em qual cadastrar.
- **Evento como `Course`/`CourseClass`/`Enrollment`:** `Enrollment` exige `Student`, e o
  requisito central é inscrever não-aluno. Contaminaria a base de alunos e os relatórios
  acadêmicos.

## Modelo de dados

### `Event` — campos novos

```prisma
// Inscrição
registrationEnabled   Boolean   @default(false)  // liga o módulo de inscrição
isPublished           Boolean   @default(false)  // rascunho x publicado
publicSlug            String?   @unique          // /eventos/excursao-israel-2026
registrationOpensAt   DateTime?
registrationClosesAt  DateTime?
capacity              Int?                        // vagas totais do evento (null = ilimitado)
reservationHours      Int       @default(24)      // prazo da reserva aguardando pagamento

// Apresentação e local
bannerUrl        String?
locationAddress  String?
mapUrl           String?

// Logística
meetingPoint   String?
meetingTime    DateTime?
returnTime     DateTime?
transportInfo  String?

// Informações ao inscrito
includedItems      String?
whatToBring        String?
extraNotes         String?
organizerName      String?
organizerPhone     String?
cancellationPolicy String?

// Relações
tickets       EventTicket[]
customFields  EventCustomField[]
registrations EventRegistration[]
```

Os campos existentes (`title`, `type`, `description`, `date`, `startTime`, `endTime`,
`courseClasses`, check-in, `attendances`) permanecem intocados. Um evento com
`registrationEnabled = false` se comporta exatamente como hoje.

### `EventTicket` — lote / tipo de inscrição

```prisma
model EventTicket {
  id           String   @id @default(cuid())
  eventId      String
  event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name         String   // "1º Lote — Inteira", "Meia", "Só almoço"
  description  String?
  priceStudent Float    @default(0)  // valor para aluno matriculado
  priceGeneral Float    @default(0)  // valor para não-aluno
  quantity     Int?                  // vagas do lote (null = ilimitado)
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
```

Lote = tipo de inscrição. Um lote deixa de ser vendável quando `salesEnd` passa, quando
`quantity` esgota, ou quando `isActive = false`; o próximo assume automaticamente.
Evento gratuito é um lote único com os dois preços em `0`.

### `EventRegistration` — inscrição

```prisma
model EventRegistration {
  id       String @id @default(cuid())
  eventId  String
  event    Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  ticketId String
  ticket   EventTicket @relation(fields: [ticketId], references: [id])

  studentId String?   // preenchido só quando é aluno
  student   Student?  @relation(fields: [studentId], references: [id])
  isStudent Boolean   @default(false)

  // Snapshot: para o externo, é o único dado que existe
  name  String
  email String
  phone String?
  cpf   String?

  amount   Float                       // preço travado no momento da inscrição
  status   String @default("PENDENTE") // PENDENTE | CONFIRMADA | CANCELADA | EXPIRADA
  answers  Json?                       // respostas dos campos extras

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
```

`FinancialTransaction` ganha a relação inversa `eventRegistration EventRegistration?`.
`Student` ganha `eventRegistrations EventRegistration[]`.

### `EventCustomField` — campos extras por evento

```prisma
model EventCustomField {
  id       String   @id @default(cuid())
  eventId  String
  event    Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  label    String   // "Tamanho da camiseta"
  type     String   @default("TEXT") // TEXT | SELECT | CHECKBOX
  options  String[] @default([])     // usado quando type = SELECT
  required Boolean  @default(false)
  order    Int      @default(0)

  @@index([eventId])
}
```

As respostas ficam em `EventRegistration.answers` como `{ [customFieldId]: valor }`.
Guardar por id (e não por label) mantém as respostas estáveis se o label for editado; a
tela de inscritos resolve o label a partir do `EventCustomField`.

### Migração

Seguir o padrão do projeto: `prisma db push` (o módulo PagBank já registrou que este
projeto não usa migrations versionadas). Todos os campos novos em `Event` são opcionais ou
têm default, então nenhum dado existente quebra.

## Regras de negócio

Concentradas em `src/lib/events.ts` como **funções puras** (recebem dados, não tocam no
Prisma), para serem testáveis sem banco.

1. **Preço aplicável:** `isStudent ? ticket.priceStudent : ticket.priceGeneral`.
2. **Lote disponível** em um instante `now`, para um dado tipo de inscrito:
   - `isActive`, e
   - `salesStart == null || salesStart <= now`, e
   - `salesEnd == null || salesEnd >= now`, e
   - `audience` compatível (`ALL`, ou `STUDENT` para aluno, ou `EXTERNAL` para externo), e
   - `quantity == null || vagasOcupadasNoLote < quantity`.
3. **Vaga ocupada** = inscrição com status `CONFIRMADA`, **ou** `PENDENTE` com
   `reservedUntil > now`. `CANCELADA` e `EXPIRADA` não ocupam.
4. **Inscrição aberta** = `isPublished && registrationEnabled`, dentro da janela
   `registrationOpensAt`/`registrationClosesAt`, com `capacity` não esgotada e ao menos um
   lote disponível.
5. **Duplicidade:** um aluno não pode ter duas inscrições ativas (`PENDENTE` não expirada
   ou `CONFIRMADA`) no mesmo evento. Para externo, a mesma checagem por `email` no evento.
6. **Reserva:** `reservedUntil = createdAt + event.reservationHours`.

## Fluxos

### Inscrição gratuita (valor 0)

`EventRegistration` nasce `CONFIRMADA`, `confirmedAt = now`, sem `FinancialTransaction`.

### Inscrição paga

1. Cria `EventRegistration` `PENDENTE` com `reservedUntil = now + reservationHours`.
2. Cria `FinancialTransaction`:
   - `type = RECEITA`, `status = PENDENTE`
   - `amount` = preço travado
   - `categoryId` = categoria `Eventos` (buscada por nome; criada se não existir)
   - `dueDate = reservedUntil`
   - `description = "Inscrição — <evento> (<lote>)"`
   - `studentId` só quando é aluno
3. Redireciona para o checkout que **já existe**:
   `/matricula/pagamento/[transactionId]?retorno=/eventos/inscricao/[registrationId]`
4. O webhook (PagBank/Santander) já marca a transação como `PAGO`. Passo novo: se a
   transação tiver `eventRegistration`, marca a inscrição como `CONFIRMADA`, grava
   `confirmedAt` e limpa `reservedUntil`.
5. Job de expiração varre pendentes vencidas → inscrição `EXPIRADA`, transação
   `CANCELADA`, vaga liberada.

Passos 4 e 5 são idempotentes: reprocessar o mesmo webhook não altera nada, e o job ignora
inscrições que já saíram de `PENDENTE`.

### Ajuste necessário no checkout

Hoje `api/pagamentos/criar/route.ts` e `matricula/pagamento/[transactionId]/page.tsx` leem
nome/e-mail/CPF/telefone de `tx.student`, que é `null` para o inscrito externo. Ambos
passam a incluir `eventRegistration` no `include` e a cair para os dados dela quando não
houver `student`. Mudança pequena e localizada; não altera o comportamento da matrícula.

### Job de expiração

Novo `src/lib/jobs/eventReservations.ts`, no mesmo padrão de `financialDueDates.ts`,
disparado pelo agendador já existente em `instrumentation.ts`.

```
expireEventReservations(now = new Date()) -> { expired: number }
```

Busca `EventRegistration` com `status = PENDENTE` e `reservedUntil < now`; para cada uma,
em transação: inscrição → `EXPIRADA`; `FinancialTransaction` vinculada, se ainda
`PENDENTE` → `CANCELADA`.

## Páginas

### Público (sem login)

| Rota | Conteúdo |
|---|---|
| `/eventos` | Vitrine dos eventos publicados com inscrição aberta: banner, data, local, "a partir de R$ X" |
| `/eventos/[slug]` | Página do evento: banner, descrição, local + mapa, logística, o que está incluso, o que levar, observações, contato do organizador, política de cancelamento, lotes disponíveis com vagas restantes |
| `/eventos/[slug]/inscricao` | Formulário: escolhe o lote → dados básicos → campos extras → confirma |
| `/eventos/inscricao/[id]` | Comprovante: código, lote, valor, situação do pagamento. Destino do `retorno` do checkout |

Havendo sessão de aluno, os dados vêm preenchidos e o preço exibido é o de aluno; caso
contrário, o de não-aluno.

### Portal do aluno

- `/portal/eventos` — abas *Eventos abertos* (inscrever) e *Minhas inscrições* (situação,
  valor, link de pagamento quando pendente). Eventos institucionais sem inscrição também
  aparecem, sem botão.
- Bloco "Próximos eventos" na home do portal (`/portal/page.tsx`), ao lado do calendário
  de aulas.
- API: `/api/portal/eventos` (listar) e `/api/portal/eventos/inscrever`.

### Admin

Permissões novas no catálogo: `eventos.visualizar`, `eventos.criar`, `eventos.editar`,
`eventos.excluir`, registradas também em `path-access.ts`.

| Rota | Conteúdo |
|---|---|
| `/eventos` | Lista: data, situação (rascunho/publicado/encerrado), inscritos/vagas, arrecadado x pendente |
| `/eventos/novo`, `/eventos/[id]/editar` | Formulário em abas: **Dados** · **Local & Logística** · **Informações** · **Lotes** · **Campos extras** |
| `/eventos/[id]/inscritos` | Tabela de inscritos (aluno x externo), lote, valor, situação, respostas dos campos extras. Ações: confirmar manualmente (pago em dinheiro), cancelar, exportar CSV |

`/aulas/eventos/novo` passa a redirecionar para `/eventos/novo`. A criação de evento pelo
calendário continua funcionando para o evento institucional sem inscrição.

### Calendário

- **Admin:** `/aulas` já lista `Event`. Passa a marcar os eventos com inscrição com um
  badge e a contagem de inscritos, com link para `/eventos/[id]/inscritos`.
- **Aluno:** bloco na home do portal + `/portal/eventos`, conforme acima.

## Tratamento de erros

- **Lote esgotado entre abrir o formulário e enviar:** a criação da inscrição revalida a
  disponibilidade dentro de uma transação; se falhar, retorna erro claro e reexibe os lotes
  atualizados.
- **Inscrição duplicada:** bloqueada pela regra 5, com mensagem indicando a inscrição
  existente e link para o comprovante.
- **Pagamento online desligado** (`onlinePaymentsEnabled = false`): o checkout já exibe o
  aviso padrão. A inscrição fica `PENDENTE` e o admin pode confirmá-la manualmente.
- **Webhook para transação sem inscrição:** comportamento atual, sem alteração.
- **Slug duplicado:** gerado a partir do título e sufixado com contador até ser único.

## Testes

No padrão `.test.mts` já usado no projeto, sobre as funções puras de `src/lib/events.ts`:

- preço aplicável por tipo de inscrito;
- seleção do lote vigente (janela de datas, vagas, `audience`, `isActive`);
- contagem de vagas ocupadas incluindo pendentes não expiradas e excluindo expiradas/canceladas;
- `isRegistrationOpen` nas várias combinações de publicação, janela e capacidade;
- cálculo de `reservedUntil` a partir de `reservationHours`;
- validação das respostas dos campos extras (obrigatórios, opções válidas de `SELECT`).

Para o job de expiração, teste da função de seleção das inscrições vencidas com `now`
injetado, no mesmo estilo de `financialDueDates`.

## Fora do escopo

- Cupons de desconto em eventos.
- Check-in por geolocalização para inscritos.
- Reembolso ou estorno pelo gateway.
- Lista de espera quando as vagas esgotam.
- E-mail automático de confirmação (o portal e o comprovante já mostram a situação).
