# Task 10 — Relatório de implementação

## Resultado

As telas acadêmicas foram redesenhadas sobre os endpoints reais: Aulas, Provas, Frequência/Justificativa, Boletim, Perfil, detalhe/check-in e realização de prova. Home, login, navegação e menu Mais foram preservados.

## Escopo entregue

- Aulas separadas em Próximas/Anteriores, ordenadas e agrupadas pela data civil de São Paulo, com loading, vazio, erro, retry e pull-to-refresh.
- Provas separadas em Pendentes/Realizadas, prazo e duração textuais, expirada sem ação, nota/aguardo de correção e botão de iniciar com alvo mínimo.
- Frequência geral ponderada pelo total real de aulas, progresso/status textual por disciplina e envio seguro de justificativa pelo `attendanceId` da falta.
- API ampliada de forma mínima para retornar o `attendanceId` pendente sem aceitar identificadores acadêmicos arbitrários do cliente.
- Boletim real com disciplinas, `GradeBar`, média apenas das notas lançadas e estados sem nota/sem disciplinas.
- Perfil com nome/iniciais normalizados, matrícula ativa, curso/turma/situação, média, faltas, telefone, layout responsivo e logout confirmado.
- Detalhes de aula e prova passaram a distinguir loading e erro recuperável, preservando localização, confirmação da submissão e invalidação de cache.
- Metro exclui testes colocados sob `app/` do bundle de produção, preservando-os no Jest.

## TDD — RED

`npm test -- --runTestsByPath src/utils/academic.test.ts` falhou porque `src/utils/academic.ts` não existia. Os casos exigiam separação de aulas, prazo encerrado, frequência vazia e nota ausente.

Na verificação integrada, o teste do contrato de frequência também falhou ao detectar que o novo campo `id` ainda não fazia parte da seleção esperada. O contrato foi atualizado para exigir `attendanceId` e passou.

O primeiro export Android falhou porque o Expo Router incluía `app/**/*.test.tsx` e tentava empacotar `@testing-library/react-native`. A exclusão de testes no Metro reproduziu a correção no segundo export.

## GREEN e verificação final

- Mobile Jest: 14 suítes, 69/69 testes passaram.
- Mobile TypeScript: `npx tsc --noEmit`, exit code 0.
- API Vitest: 4 suítes, 39/39 testes passaram.
- API build: `npm run build`, exit code 0.
- Android: `npx expo export --platform android`, bundle de 1.694 módulos exportado com sucesso.
- `git diff --check`: exit code 0; somente avisos informativos de LF/CRLF no Windows.

## Commit

Consulte `git log --oneline` para os commits da implementação e das correções de revisão; o relatório não registra hash autorreferente.

## Correções após revisão

- provas futuras recebem status explícito `NOT_STARTED`/“Ainda não iniciada” e não apresentam ação de início;
- questões só são expostas dentro da janela, para disciplina autorizada, prova publicada e tentativa ainda não submetida;
- abrir questões cria a tentativa por `upsert` atômico e idempotente; o envio exige tentativa previamente aberta;
- o prazo efetivo é o menor entre `endDate` e `startedAt + duration`, e uma atualização compare-and-set impede dupla submissão concorrente;
- listagem e resultado expõem `gradeScore` normalizado de 0 a 10, mantendo pontos brutos apenas como dados técnicos;
- perfil distingue loading conjunto, erro, ausência de indicadores e conteúdo;
- realização da prova respeita safe area inferior e oferece papéis/estados/rótulos acessíveis para alternativas e ações;
- emojis e setas textuais foram substituídos por Material Icons nas ações de prova e check-in;
- datas de aula serializadas pelo Prisma como meia-noite UTC preservam o componente civil `YYYY-MM-DD`.

### RED/GREEN da revisão

Os novos testes falharam inicialmente por ausência de filtros temporais, bloqueio de submissão, tentativa antecipada, deadline por duração, compare-and-set, nota normalizada, status futuro, data civil e estado de loading do perfil. Após as correções:

- API: 4 suítes, 44/44 testes passaram; build TypeScript sem erros;
- mobile: 14 suítes, 71/71 testes passaram; TypeScript sem erros;
- o export Android bem-sucedido da implementação anterior permanece válido; esta revisão não alterou dependências, assets ou configuração de bundle.
