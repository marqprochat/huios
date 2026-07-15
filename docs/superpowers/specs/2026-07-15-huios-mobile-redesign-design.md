# HuIOS Mobile — Redesign do Portal do Aluno

**Data:** 15 de julho de 2026
**Status:** Aprovado para planejamento
**Direção visual:** Acadêmico moderno
**Navegação:** Quatro abas principais com menu “Mais”

## Objetivo

Modernizar o aplicativo mobile do aluno sem alterar suas funções acadêmicas centrais. O redesign deve tornar as informações mais fáceis de escanear, aplicar ícones consistentes, funcionar bem em celulares de diferentes tamanhos e exibir corretamente o nome e o perfil do aluno autenticado.

## Escopo

O trabalho cobre:

- login;
- início;
- aulas e detalhes de aula/check-in;
- provas e realização de prova;
- menu “Mais”;
- frequência;
- boletim;
- perfil;
- componentes compartilhados, estados de carregamento, vazio e erro;
- correção do contrato de autenticação e perfil entre API e mobile.

Não fazem parte deste redesign novas funções acadêmicas, mudanças nas regras de presença ou prova, alteração do painel administrativo ou criação de um sistema de temas.

## Direção visual

A interface seguirá uma estética acadêmica moderna:

- azul institucional `#135bec` como cor primária;
- azul profundo em gradientes de cabeçalho;
- fundo neutro muito claro;
- cards brancos com bordas suaves e sombras discretas;
- cantos arredondados consistentes;
- tipografia de alto contraste e hierarquia clara;
- verde para situações positivas, âmbar para atenção e vermelho para erro ou risco;
- ícones da família Material já instalada no projeto.

Emojis não serão usados como ícones funcionais. Eles poderão aparecer apenas em mensagens informais pontuais, como a saudação da tela inicial.

## Navegação

A barra inferior terá quatro destinos:

1. **Início** — resumo acadêmico e atalhos;
2. **Aulas** — agenda e detalhes das aulas;
3. **Provas** — avaliações pendentes e realizadas;
4. **Mais** — frequência, boletim, perfil e saída da conta.

O item ativo terá ícone e cor primária com fundo em formato de pílula. Os rótulos permanecerão visíveis. A barra respeitará a safe area e terá alvos de toque de pelo menos 44 pontos.

As telas de frequência e perfil deixarão de ser abas diretas, mas continuarão disponíveis por rotas próprias, acessadas pelo menu “Mais”. O boletim ganhará um destino explícito no mesmo menu; a tela inicial apontará para esse destino, corrigindo o atalho que hoje direciona para frequência.

## Telas

### Login

- logo original azul do HuIOS, atualmente disponível em `huios-admin/public/logo.png`, copiada para os assets do mobile;
- logo contida em um bloco branco arredondado para manter contraste com o cabeçalho azul;
- texto “Portal do Aluno” em destaque ao lado da logo, sem repetir a palavra “HuIOS”;
- campos com ícones de e-mail e senha;
- ação para mostrar ou ocultar a senha;
- botão principal de largura total;
- mensagens distintas para credenciais inválidas e falha de rede;
- teclado, foco e rolagem seguros em telas pequenas.

### Início

- cabeçalho em gradiente com saudação, primeiro nome, data e avatar por iniciais;
- cards de frequência geral e provas pendentes;
- lista das próximas aulas em ordem cronológica;
- atalhos para provas e boletim;
- ação de atualizar por gesto;
- skeletons durante carregamento e cards próprios para estados vazios ou de erro.

### Aulas

- cabeçalho com quantidade de aulas;
- alternância entre próximas e anteriores;
- agrupamento por data;
- ícones para horário, local e disciplina;
- cards adaptáveis a nomes longos;
- acesso ao detalhe e ao check-in quando aplicável.

### Provas

- alternância entre pendentes e realizadas;
- prazo e duração com hierarquia clara;
- ações “Iniciar” ou “Abrir” com alvo de toque adequado;
- estado expirado sem ação disponível;
- resultados recentes com nota e data de conclusão.

### Mais

- cabeçalho compacto com iniciais, nome e e-mail do aluno;
- opções para frequência, boletim e perfil;
- resumo curto em cada opção;
- saída da conta separada visualmente e confirmada por diálogo.

### Frequência

- resumo geral no cabeçalho;
- progresso por disciplina;
- status com cor e texto, nunca apenas cor;
- faltas e total de aulas legíveis;
- envio de justificativa preservado com estado de progresso e retorno de sucesso/erro.

### Boletim

- lista de disciplinas com nota atual ou final;
- barras de desempenho consistentes;
- estados sem nota e sem disciplinas;
- acesso direto pelo menu “Mais” e pelo atalho da tela inicial.

### Perfil

- avatar por iniciais, nome completo e e-mail;
- curso, turma e situação da matrícula;
- média geral e faltas totais;
- telefone quando disponível;
- ação de sair da conta.

## Componentes compartilhados

Serão consolidados componentes reutilizáveis para:

- cabeçalho de tela;
- card de indicador;
- card de aula;
- item de menu com ícone;
- estado vazio;
- estado de erro com nova tentativa;
- skeleton de carregamento;
- badge de status;
- barra de progresso/nota.

Tokens de cor, espaçamento, raio e sombra serão centralizados na configuração do NativeWind. As telas não deverão repetir estilos extensos quando um componente compartilhado representar o mesmo padrão.

## Nome e perfil do aluno

### Problema atual

O endpoint de login retorna o nome no objeto básico `user`, enquanto as telas procuram `user.student.name`. O mobile também chama `/api/auth/me`, mas essa rota não está registrada na API. Como a falha é ignorada, o perfil completo nunca substitui o usuário básico e a interface mostra “Aluno”.

### Solução

- adicionar `name` ao tipo básico de usuário;
- implementar e registrar `GET /api/auth/me` protegido por JWT;
- retornar usuário e dados relacionados do aluno, incluindo matrículas, turma e curso;
- manter o usuário básico recebido no login como fallback imediato;
- após autenticar, buscar o perfil completo e substituir o fallback;
- após armazenar token e usuário, executar navegação explícita para `/(tabs)` na ação de login;
- manter o guard global como proteção de rotas e restauração de sessão, sem depender exclusivamente dele para a transição pós-login;
- ao restaurar uma sessão armazenada, buscar novamente `/api/auth/me` antes de concluir a inicialização;
- normalizar a leitura do nome em uma função compartilhada: `student.name`, depois `user.name`, depois “Aluno”.

Falhas temporárias ao carregar o perfil não encerrarão uma sessão válida. A interface usará o nome básico e permitirá nova tentativa nas áreas dependentes do perfil.

## Responsividade e acessibilidade

- safe areas aplicadas em todas as telas e na barra inferior;
- largura dos cards baseada no espaço disponível, sem valores absolutos de tela;
- duas colunas apenas quando cada card mantiver largura legível; abaixo disso, empilhamento vertical;
- textos longos com quebra controlada ou truncamento acompanhado de contexto suficiente;
- suporte a aumento moderado do tamanho da fonte sem sobreposição;
- alvos de toque de no mínimo 44 × 44 pontos;
- contraste de texto e estados compatível com WCAG AA sempre que aplicável;
- informação de status expressa por texto e ícone, além da cor;
- teclado não poderá cobrir campos ou ações no login e em formulários.

## Estados e erros

Cada consulta deve distinguir:

- carregando — skeleton ou indicador contextual;
- vazio — mensagem explicativa e, quando fizer sentido, ação;
- erro de rede — mensagem clara e botão “Tentar novamente”;
- erro de autenticação — limpar a sessão apenas para token inválido ou expirado;
- sucesso — conteúdo atualizado sem saltos de layout evitáveis.

Mensagens vindas da API serão preservadas quando forem seguras e úteis. Falhas de transporte não serão apresentadas como credenciais inválidas.

## Estratégia de testes

- testes do contrato de login e `GET /api/auth/me`;
- testes da prioridade usada para resolver o nome do aluno;
- testes de restauração da sessão e fallback de perfil;
- testes de componentes para loading, vazio, erro e conteúdo;
- verificação de rotas da nova navegação e dos atalhos;
- TypeScript e bundle Android obrigatoriamente sem erros;
- validação manual no Expo Go para as funções compatíveis;
- validation em development build para notificações push remotas;
- revisão manual em pelo menos uma largura compacta e uma largura ampla, incluindo Android com barra de navegação e iPhone com safe area.

## Critérios de aceitação

- o nome real do aluno aparece no início, no menu “Mais” e no perfil;
- a tela de login exibe a logo original azul sobre base branca e “Portal do Aluno” ao lado;
- um login bem-sucedido navega imediatamente para a tela inicial;
- uma sessão restaurada carrega novamente os dados do aluno;
- a barra inferior contém somente Início, Aulas, Provas e Mais;
- frequência, boletim e perfil estão acessíveis pelo menu “Mais”;
- as ações relevantes têm ícones Material consistentes;
- nenhum conteúdo essencial fica cortado em telas compactas;
- todas as consultas apresentam estados de carregamento, vazio e erro;
- login, aulas, provas, presença, boletim, perfil e logout continuam funcionais;
- verificação de tipos e bundle Android são concluídos sem erro.
