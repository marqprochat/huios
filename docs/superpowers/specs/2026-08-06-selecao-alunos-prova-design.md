# Seleção de alunos por prova

## Objetivo

Permitir que uma prova seja destinada somente a alunos específicos vinculados à disciplina escolhida. A seleção será feita por aluno, com agrupamento e ações em lote por turma, seguindo a experiência já usada no fluxo de Conta a receber.

## Escopo funcional

### Criação

1. O usuário preenche os dados da prova e escolhe uma disciplina.
2. Depois da escolha, o formulário exibe o botão **Selecionar alunos**.
3. O botão abre um modal com os alunos `CURSANDO` em turmas vinculadas à disciplina.
4. Os alunos aparecem agrupados por turma e inicialmente desmarcados.
5. O usuário pode:
   - marcar ou desmarcar um aluno;
   - marcar todos os alunos de uma turma;
   - desmarcar todos os alunos de uma turma;
   - pesquisar alunos pelo nome;
   - confirmar ou cancelar as alterações temporárias do modal.
6. O formulário mostra um resumo com a quantidade de alunos e turmas selecionadas.
7. A criação exige ao menos um aluno selecionado.

Ao trocar a disciplina, o formulário descarta a seleção anterior. Isso impede que alunos de uma disciplina sejam enviados acidentalmente para outra.

### Edição

O mesmo modal estará disponível na edição. Ele abrirá com os participantes atuais marcados e permitirá incluir ou remover alunos elegíveis.

Um aluno que já tenha iniciado ou enviado a prova não poderá ser removido. No modal, ele permanecerá marcado e desabilitado, com uma indicação do motivo. O servidor repetirá essa validação para impedir que uma requisição direta burle a interface.

### Duplicação

A duplicação copiará os dados da prova, as perguntas e a seleção de alunos da prova original. A cópia continuará não publicada, como no comportamento atual.

## Interface

### Botão e resumo

Antes da escolha da disciplina, o botão de selecionar alunos não será exibido. Depois da escolha, o formulário exibirá o botão **Selecionar alunos**.

Após a confirmação do modal, o formulário mostrará um resumo no formato equivalente a **8 alunos selecionados em 2 turmas**. Se a seleção estiver vazia, mostrará que nenhum aluno foi selecionado e impedirá o envio.

### Modal

O modal terá:

- título e identificação da disciplina;
- campo de busca por nome do aluno;
- seções por turma, identificadas pelo nome da turma e do curso;
- contagem de selecionados por turma;
- botões **Marcar todos** e **Desmarcar todos** em cada turma;
- checkbox individual para cada aluno;
- total geral selecionado;
- botões **Cancelar** e **Confirmar seleção**.

A seleção dentro do modal será temporária. **Cancelar** fechará o modal sem alterar o formulário; **Confirmar seleção** aplicará a seleção temporária.

Turmas sem alunos `CURSANDO` serão omitidas. Se a disciplina não possuir alunos elegíveis, o modal apresentará o estado vazio **Nenhum aluno cursando encontrado**.

## Modelo de dados

Será criada uma relação explícita muitos-para-muitos entre `Exam` e `Student`, representada por uma tabela associativa de participantes da prova.

Requisitos da associação:

- chave composta ou restrição única para `examId + studentId`;
- índices para consultas por prova e por aluno;
- exclusão em cascata dos vínculos quando a prova for excluída;
- relações correspondentes nos modelos `Exam` e `Student`;
- mesma alteração nos schemas Prisma do painel administrativo e da API;
- migração versionada no repositório.

A associação representa autorização para fazer a prova. Ela não substitui `ExamSubmission`, que continuará representando o início e o envio de uma tentativa.

## Consultas e validação

### Carregamento do formulário

As páginas de criação e edição carregarão as disciplinas com suas turmas e apenas matrículas com status `CURSANDO`. Os dados serão transformados em uma estrutura própria para o componente cliente do formulário/modal.

Na edição, também serão carregados:

- participantes atuais;
- IDs dos participantes que já possuem uma submissão, iniciada ou concluída.

### Criação e edição

O servidor receberá os IDs selecionados e validará:

- que existe ao menos um ID;
- que não há IDs duplicados;
- que todos os alunos existem;
- que cada aluno está `CURSANDO` em ao menos uma turma vinculada à disciplina escolhida.

A prova e seus participantes serão gravados na mesma transação. Na edição, a atualização da prova e a substituição dos participantes também serão transacionais.

Antes de remover participantes na edição, o servidor comparará a seleção anterior com a nova. Se qualquer aluno removido possuir `ExamSubmission` para a prova, a operação será rejeitada com uma mensagem em português e nenhuma alteração parcial será persistida.

### Acesso do aluno

Uma prova somente poderá ser acessada por um aluno quando:

- estiver publicada;
- o aluno possuir um vínculo explícito de participante;
- as demais regras existentes, como janela de início e término, forem satisfeitas onde já são aplicadas.

Essa autorização será aplicada em todas as superfícies:

- listagem de provas do portal web;
- listagem de provas do aplicativo móvel;
- carregamento das questões;
- avaliação do professor associada à prova, quando aplicável;
- início e envio de respostas;
- rota web de submissão existente.

As rotas de detalhe e mutação deverão validar o participante diretamente, mesmo que a prova não apareça na listagem, para impedir acesso por ID ou URL conhecida.

## Tratamento de erros

Erros esperados terão mensagens claras em português, incluindo:

- nenhuma disciplina selecionada;
- nenhum aluno selecionado;
- aluno não elegível para a disciplina;
- tentativa de remover aluno que já iniciou a prova;
- prova não disponível para o aluno autenticado.

Operações compostas serão transacionais para evitar prova criada ou atualizada sem a seleção correspondente.

## Compatibilidade e dados existentes

Provas existentes não terão participantes após a migração e, portanto, não deverão ser publicadas para todos implicitamente. Antes de publicar ou editar uma prova existente, o administrador precisará selecionar ao menos um aluno. Essa regra mantém o novo modelo seguro e explícito.

O servidor também impedirá a publicação de uma prova sem participantes. Relatórios e notas continuarão baseados nas submissões e notas existentes; a associação de participantes não alterará o cálculo atual de submissões.

## Testes e verificação

Os testes automatizados deverão cobrir:

- agrupamento apenas de alunos `CURSANDO` por turma vinculada à disciplina;
- estado inicial sem seleção e ações individuais/em lote do seletor;
- descarte da seleção ao trocar a disciplina;
- rejeição de seleção vazia, duplicada ou com aluno não elegível;
- criação transacional da prova e seus participantes;
- edição dos participantes;
- bloqueio da remoção de aluno com submissão;
- bloqueio da publicação de prova sem participantes;
- cópia dos participantes ao duplicar;
- listagem somente para participantes;
- bloqueio de questões e envio para não participantes;
- manutenção dos fluxos autorizados para participantes.

Depois dos testes direcionados, serão executados lint, verificação de tipos ou build e as suítes relevantes do painel, da API e, quando afetado, do aplicativo móvel.

## Fora de escopo

- Selecionar alunos que não estejam `CURSANDO` em uma turma da disciplina.
- Criar uma prova sem participantes ou destinada implicitamente a todos.
- Alterar regras de nota, tentativas, duração ou janela da prova.
- Remover ou apagar submissões para liberar a retirada de um participante.
- Enviar notificações específicas sobre a nova prova.
