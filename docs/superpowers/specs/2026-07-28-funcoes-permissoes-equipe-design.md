# Funções, permissões e acesso da equipe

## Objetivo

Transformar o cadastro de equipe em contas reais de acesso e permitir que o Super Admin controle, por função, quais módulos e ações cada membro pode usar. Uma mesma conta poderá representar um aluno e um membro da equipe, com alternância entre o Portal do Aluno e a Área Administrativa.

## Escopo aprovado

- Criar funções administrativas reutilizáveis.
- Configurar permissões por módulo e ação.
- Criar o acesso de um membro junto com seu cadastro na equipe.
- Exigir troca da senha temporária no primeiro login.
- Permitir que uma conta vinculada a um aluno também tenha uma função administrativa.
- Ocultar itens sem acesso e bloquear páginas, APIs e ações no servidor.
- Registrar em auditoria alterações de membros, funções e permissões.
- Criar ou atualizar o Super Admin mestre `admin@huios.com.br` no provisionamento inicial, usando a credencial inicial fornecida pelo responsável do sistema.

Não fazem parte deste primeiro ciclo: múltiplas funções administrativas simultâneas para a mesma conta, permissões individuais fora de uma função, convites por e-mail e aprovação em múltiplas etapas.

## Modelo de autorização

O sistema adotará RBAC com uma função administrativa por usuário:

- `User` continua sendo a identidade de login.
- `Student` e `TeamMember` podem apontar para o mesmo `User`.
- `User` terá uma função administrativa opcional. A existência do vínculo com `Student`, e não o nome da função, concederá acesso ao Portal do Aluno.
- `Role` representa uma função configurável e contém nome, descrição, status e indicador de função protegida.
- `Permission` é o catálogo estável de capacidades do sistema, identificado por uma chave como `alunos.visualizar` ou `notas.lancar`.
- `RolePermission` associa uma função às permissões concedidas.
- `AuditLog` registra autor, ação, entidade afetada, identificador, resumo das mudanças e data.
- `User.mustChangePassword` obriga a troca da senha temporária.

Os textos atuais em `User.role` e `TeamMember.role` serão migrados para o novo modelo. Depois da migração, os nomes de função deixarão de ser a fonte de autorização. O vínculo entre `TeamMember` e `User` será obrigatório para novos membros com acesso e único para impedir duas fichas de equipe para a mesma conta.

## Catálogo de permissões

As permissões serão definidas no código e sincronizadas com o banco. Funções podem ser criadas e configuradas pela interface, mas não podem inventar chaves que o sistema não saiba aplicar.

Cada módulo usará somente as ações que fizerem sentido:

- Ações comuns: `visualizar`, `criar`, `editar` e `excluir`.
- Alunos e matrículas: consulta e manutenção cadastral.
- Professores, equipe, igrejas, cursos, turmas e disciplinas: consulta e manutenção.
- Aulas: consulta, criação, edição, exclusão e registro de presença.
- Provas: consulta, criação, edição, exclusão, aplicação e correção.
- Notas e boletins: consulta, lançamento e edição.
- Avaliações: consulta, gestão e envio de notificações.
- Relatórios: consulta e exportação.
- Financeiro: consulta, criação, edição, exclusão, conciliação e exportação, separados por contas, preços, cupons, categorias e relatórios.
- Configurações: consulta e edição.
- Funções e permissões: consulta e gestão, reservadas ao Super Admin.
- Equipe e contas de acesso: consulta e gestão, reservadas ao Super Admin.

O catálogo será centralizado e tipado para que menu, páginas, APIs, ações e testes usem as mesmas chaves.

## Super Admin

Super Admin é uma função protegida e possui acesso irrestrito por regra do servidor, independentemente das associações em `RolePermission`.

Regras invariáveis:

- Somente Super Admin administra membros da equipe, funções e permissões.
- A função não pode ser excluída, desativada, renomeada ou ter seu acesso reduzido.
- Um Super Admin não pode desativar a própria conta.
- O último Super Admin ativo não pode ser desativado nem rebaixado.
- O provisionamento inicial fará `upsert` do usuário mestre, garantindo nome, função protegida e conta ativa sem criar duplicidade.
- A senha inicial não será exibida em logs. Em produção, o provisionamento deverá receber a senha por variável de ambiente; o valor informado pelo responsável será usado para a inicialização solicitada.

## Funções iniciais

- **Coordenador:** gestão acadêmica, cadastros, matrículas e relatórios; sem funções, equipe ou configurações financeiras sensíveis.
- **Secretaria:** alunos, igrejas, turmas e matrículas; consulta acadêmica e relatórios; sem exclusão acadêmica, lançamento de notas ou financeiro completo.
- **Financeiro:** módulos financeiros, relatórios financeiros e consulta básica de alunos e matrículas.
- **Professor:** somente turmas e aulas vinculadas; presença, provas, notas e avaliações relacionadas.
- **Monitor:** somente turmas e aulas atribuídas; consulta e registro de presença, sem notas, provas ou alterações da estrutura acadêmica.
- **Super Admin:** acesso irrestrito.

Professor e Monitor terão duas verificações cumulativas: permissão da função e vínculo com o registro solicitado. O Super Admin poderá ajustar as permissões das funções não protegidas depois da instalação.

## Fluxos de interface

### Equipe

O Super Admin poderá listar, criar, editar e desativar membros. O formulário reunirá dados pessoais, vínculo opcional com aluno existente, função administrativa, status e senha temporária.

Ao usar um e-mail já pertencente a um aluno, o sistema vinculará o membro ao `User` existente, preservando uma única conta. Para uma pessoa nova, criará `User` e `TeamMember` na mesma transação. E-mail pertencente a outra pessoa será rejeitado com uma mensagem clara.

Excluir será substituído por desativar quando houver conta ou histórico associado. A reativação exigirá função válida; o Super Admin poderá definir nova senha temporária quando necessário.

### Funções e permissões

A área permitirá listar, criar, renomear, duplicar e desativar funções, mostrar a quantidade de usuários e editar uma matriz de módulos por ações. A função Super Admin aparecerá bloqueada para edição.

Uma função em uso não será apagada. Ao ser desativada, os usuários associados perderão a Área Administrativa até receberem outra função, mas continuarão usando o Portal do Aluno quando possuírem vínculo de aluno.

### Navegação e troca de contexto

O menu administrativo exibirá somente links autorizados. Um usuário que também seja aluno verá uma ação para alternar entre Área Administrativa e Portal do Aluno. A troca não altera a conta nem exige novo login.

O primeiro login com senha temporária redirecionará para a troca de senha. Enquanto `mustChangePassword` estiver ativo, somente sessão, logout e alteração da própria senha serão permitidos.

## Verificação de acesso

A autorização será bloqueada por padrão. Uma capacidade não concedida é negada.

- Um serviço central resolverá a sessão, o usuário ativo, o contexto disponível e as permissões atuais.
- Helpers separados verificarão `requirePermission(chave)` e, nos casos de Professor e Monitor, o escopo do registro.
- Páginas e layouts bloquearão renderização não autorizada.
- Route handlers e Server Actions validarão novamente a permissão antes de ler ou alterar dados.
- O middleware continuará responsável por autenticação e direcionamento geral, mas não será a única barreira de autorização.
- A sessão não será a fonte definitiva das permissões. Função, status e permissões atuais serão consultados no servidor para que alterações tenham efeito imediato.
- APIs do serviço `huios-api` que exponham as mesmas capacidades aplicarão o mesmo catálogo e regras, sem confiar apenas no papel presente no JWT.

Tentativas de abrir uma URL sem acesso retornarão `403` nas APIs e uma página de “Acesso negado” na interface. Falhas de validação não revelarão dados do recurso protegido.

## Consistência, erros e auditoria

Criação de membro, usuário e vínculos ocorrerá em transação. Conflitos de e-mail, função inativa, vínculo duplicado e tentativa de alterar recursos protegidos produzirão mensagens específicas.

Serão auditados:

- criação, alteração, ativação e desativação de membros;
- atribuição e remoção de função;
- criação, duplicação, alteração e desativação de função;
- mudanças na matriz de permissões;
- redefinição administrativa de senha;
- bloqueios administrativos relacionados ao último Super Admin.

Senhas, hashes e tokens nunca serão gravados na auditoria.

## Migração e compatibilidade

1. Criar as novas tabelas e campos opcionais.
2. Sincronizar o catálogo de permissões e as funções iniciais.
3. Converter usuários administrativos existentes para funções equivalentes.
4. Vincular `TeamMember` a `User` pelo vínculo explícito ou por e-mail somente quando não houver ambiguidade.
5. Provisionar o Super Admin mestre por `upsert`.
6. Atualizar autenticação e autorização.
7. Tornar obrigatórios os vínculos aplicáveis após validar os dados migrados.
8. Remover gradualmente decisões baseadas nos textos legados de função.

Registros ambíguos não serão unidos automaticamente; a migração os reportará para correção, evitando associar pessoas erradas.

## Testes e critérios de aceite

- O Super Admin mestre entra no sistema e possui acesso total.
- Apenas Super Admin cria membros, funções e atribui permissões.
- Um membro novo entra com senha temporária e é obrigado a trocá-la.
- Uma conta que também é aluno alterna entre as duas áreas sem novo login.
- Menus sem permissão não aparecem, URLs diretas são bloqueadas e APIs retornam `403`.
- Alterar ou remover uma permissão produz efeito na requisição seguinte.
- Conta desativada perde acesso mesmo que ainda possua cookie válido.
- Professor e Monitor não acessam dados de turmas sem vínculo.
- O último Super Admin ativo não pode ser desativado ou rebaixado.
- Funções em uso não são apagadas e funções desativadas não podem ser atribuídas.
- Operações sensíveis geram auditoria sem dados secretos.
- Migração preserva alunos, membros e usuários existentes sem duplicar contas.
- Testes automatizados cobrem o catálogo, helpers de autorização, rotas, Server Actions, troca de senha, escopo por turma e invariantes de Super Admin.
- Ao final, serão executados testes, lint e build dos projetos afetados.
