# Backup automático e restauração — Design

**Data:** 2026-09-02
**Status:** Aprovado
**Escopo:** `huios-admin` (Next.js + Prisma/Postgres, self-hosted em Docker)

## Problema

O sistema não tem backup. Uma falha de disco, um `docker compose down -v` acidental ou uma
operação errada em produção significam perda total de alunos, matrículas, notas, presenças e
lançamentos financeiros. Não existe também nenhuma forma de restaurar um estado anterior sem
acesso SSH ao servidor.

## Objetivo

Backup automático diário do banco **e** dos arquivos enviados, com histórico, download e
restauração completa operáveis pela tela de Configurações do próprio app.

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Conteúdo | Postgres + `public/uploads` | Restaurar só o banco deixa registros apontando para anexos inexistentes |
| Mecanismo | `pg_dump -Fc` / `pg_restore` nativos | Fidelidade total (constraints, sequences, tipos); export lógico via Prisma quebra com mudança de schema |
| Destino | Volume Docker `backups_data` em `/app/backups` | Sem custo nem credencial externa; download pela UI cobre a cópia off-site manual |
| Restauração | Completa, com confirmação forte | Restauração seletiva é arriscada com chaves estrangeiras |
| Agendamento | Diário às 03:00 (BRT), reter 14 | Configurável na UI |

## Infraestrutura

- `Dockerfile.prod`, estágio de produção: `RUN apk add --no-cache postgresql-client tar`.
  A imagem base é `node:20-alpine` e o servidor é Postgres 15 — um `pg_dump` de versão igual ou
  superior ao servidor é suportado oficialmente.
- `docker-compose.yml`: novo volume nomeado `backups_data` montado em `/app/backups` no serviço
  `admin`. Volume nomeado (não bind mount) para sobreviver a rebuilds.
- Formato do arquivo: `huios-backup-YYYY-MM-DD-HHmm-<tipo>.tar.gz`, contendo:
  - `dump.pgc` — saída de `pg_dump -Fc`
  - `uploads/` — cópia de `public/uploads`
  - `manifest.json` — `{ version, createdAt, type, schemaHash, appVersion, includesUploads }`

## Modelo de dados

### Novo model `BackupRecord`

```prisma
model BackupRecord {
  id            String   @id @default(uuid())
  fileName      String   @unique
  sizeBytes     BigInt?
  type          String   // AUTO | MANUAL | PRE_RESTORE
  status        String   // RUNNING | SUCCESS | FAILED
  errorMessage  String?
  createdAt     DateTime @default(now())
  finishedAt    DateTime?
  createdById   String?
  createdBy     User?    @relation(fields: [createdById], references: [id])
}
```

### Campos novos em `SystemSettings`

```prisma
backupEnabled        Boolean? @default(true)
backupHour           Int?     @default(3)     // 0-23, horário de Brasília
backupRetentionCount Int?     @default(14)
backupIncludeUploads Boolean? @default(true)
lastBackupAt         DateTime?
```

O projeto usa `prisma db push` (sem migrations) — o `CMD` do `Dockerfile.prod` já roda
`npx prisma db push` no start, então as colunas novas entram no deploy sem passo manual.

## Núcleo — `src/lib/backup/`

### `dump.ts` — `criarBackup({ tipo, userId })`

1. Toma um lock em memória; se já houver backup rodando, retorna erro `BACKUP_EM_ANDAMENTO`.
2. Cria `BackupRecord` com status `RUNNING`.
3. Executa `pg_dump -Fc` via `child_process.spawn` (sem shell). As credenciais vêm de
   `DATABASE_URL` parseada, passadas por variáveis de ambiente (`PGPASSWORD` etc.), nunca na
   linha de comando.
4. Empacota `dump.pgc` + `uploads/` (se `backupIncludeUploads`) + `manifest.json` com `tar -czf`.
5. Atualiza o registro para `SUCCESS` com `sizeBytes` e `finishedAt`; grava `lastBackupAt`.
6. Qualquer falha: registro vira `FAILED` com `errorMessage`, arquivos temporários removidos.

### `restore.ts` — `restaurarBackup({ origem, userId })`

`origem` é um `BackupRecord` existente ou um arquivo enviado por upload.

1. Extrai o `.tar.gz` num diretório temporário.
2. Valida `manifest.json` — arquivo ausente ou inválido aborta antes de tocar o banco.
3. Gera um backup `PRE_RESTORE` do estado atual (rede de segurança).
4. `pg_restore --clean --if-exists --no-owner` contra a `DATABASE_URL`.
5. Substitui `public/uploads` pelo conteúdo do pacote.
6. Remove o temporário e registra o resultado.

Falha em qualquer etapa anterior à 4 aborta sem alterar nada. Falha na 4 ou 5 é reportada com o
nome do backup `PRE_RESTORE` para recuperação.

### `retention.ts` — `aplicarRetencao()`

Mantém os `backupRetentionCount` backups `AUTO` mais recentes; apaga arquivo e registro dos
demais. Nunca apaga `MANUAL` nem `PRE_RESTORE` automaticamente.

### Agendador

Em `instrumentation.ts`, ao lado do job financeiro já existente: `cron.schedule('0 * * * *')`
com timezone `America/Sao_Paulo`. A cada hora lê `SystemSettings` e dispara se
`backupEnabled && hora === backupHour`. Ler a config a cada disparo evita restart do container
quando o horário muda na tela.

## API

Todas sob `/api/admin/backups`. Permissões novas no catálogo: `configuracoes.backup` e
`configuracoes.restaurar`.

| Rota | Método | Autorização |
|---|---|---|
| `/api/admin/backups` | GET | `configuracoes.backup` — lista histórico + config |
| `/api/admin/backups` | POST | `configuracoes.backup` — gera backup manual |
| `/api/admin/backups/[id]/download` | GET | `configuracoes.backup` — stream do arquivo |
| `/api/admin/backups/[id]` | DELETE | `configuracoes.backup` |
| `/api/admin/backups/config` | PUT | `configuracoes.editar` |
| `/api/admin/backups/restaurar` | POST | `configuracoes.restaurar` **e** `isSuperAdmin` |

**Segurança:**
- O download resolve o caminho a partir do `fileName` gravado no `BackupRecord`, nunca de
  parâmetro do usuário — o `id` é a única entrada. Evita path traversal.
- Restaurar exige, além de super admin, o campo `confirmacao: "RESTAURAR"` no corpo.
- Backups contêm dados pessoais e credenciais de pagamento; nenhuma rota é pública e o download
  não é cacheado.

## Interface

A aba nova vive em `src/app/configuracoes/BackupTab.tsx` — componente próprio com estado próprio,
montado pela `page.tsx` (que já tem 1191 linhas e não deve crescer). Mesmo padrão de composição
já usado nos clients do financeiro.

Conteúdo:

1. **Cartão de status** — último backup (data, tamanho, resultado), próximo agendado.
2. **Gerar backup agora** — botão com indicador de progresso; desabilitado enquanto roda.
3. **Agendamento** — ligar/desligar, hora do dia, quantos manter, incluir arquivos enviados.
4. **Histórico** — tabela com data, tipo, tamanho, status e ações: baixar, restaurar, excluir.
   Linhas `FAILED` em vermelho, com a mensagem de erro visível.
5. **Modal de restauração** — vermelho, explica que todos os dados atuais serão substituídos,
   avisa que um backup de segurança será gerado antes, e exige digitar `RESTAURAR`.
   Aceita também upload de um `.tar.gz` externo.

## Erros

Nenhuma falha é silenciosa. `pg_dump`/`pg_restore` com exit code ≠ 0 gravam `FAILED` com o
stderr truncado em `errorMessage`, visível na tela e no log do container. O job agendado que
falha não interrompe o cron — registra e tenta de novo no próximo ciclo.

## Testes

Com `node:test`, como o resto do projeto:

- `retention.test.mts` — quais arquivos sobram para diferentes retenções e misturas de tipo.
- `manifest.test.mts` — parsing e rejeição de manifestos inválidos/ausentes.
- `download-path.test.mts` — resolução do caminho rejeita nomes com `..` ou separadores.

`dump.ts` e `restore.ts` recebem o executor de processo por injeção, permitindo testar a
sequência de comandos e o tratamento de erro sem tocar num banco real.

## Fora de escopo

- Envio para nuvem (S3/R2) — pode ser acrescentado depois sobre o mesmo pipeline.
- Restauração seletiva por módulo.
- Backup incremental / point-in-time recovery.
