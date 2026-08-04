# Controle de acesso por ação

## Objetivo

Fazer com que permissões administrativas correspondam exatamente às ações disponíveis em cada módulo. Usuários não devem visualizar botões, links ou formulários para operações que sua função não possui, e qualquer acesso direto sem autorização deve terminar em `/acesso-negado`, nunca em erro bruto.

## Modelo de permissões

O catálogo de permissões no código continua sendo a fonte das capacidades válidas. Cada módulo expõe somente as ações que realmente existem em sua interface:

- `visualizar`: abrir páginas, consultar listas e detalhes;
- `criar`: adicionar, cadastrar ou duplicar registros;
- `editar`: alterar dados, status ou configurações do registro;
- `excluir`: excluir, remover, cancelar ou desativar registros;
- ações especializadas, como `notificar`, `corrigir`, `conciliar`, `exportar` e `registrar`, permanecem independentes quando representam operações distintas.

`Equipe` e `Funções` deixam de usar `gerenciar` como autorização genérica e passam a ter ações específicas. Durante a sincronização, uma função que possua a permissão antiga `gerenciar` receberá as permissões equivalentes de criação, edição e exclusão, preservando seu acesso atual. A chave antiga deixa de ser usada pela aplicação depois da migração.

O Super Admin continua com acesso irrestrito pela regra protegida existente.

## Interface

Um contexto de acesso compartilhado disponibilizará `isSuperAdmin`, função e permissões atuais para componentes clientes. Um componente declarativo, como `Can`, renderizará seus filhos apenas quando a permissão exigida estiver presente.

Cada tela aplicará esse controle a:

- botões “Novo”, “Adicionar”, “Cadastrar” e “Duplicar”;
- links e botões de edição;
- botões de exclusão, remoção, cancelamento ou desativação;
- formulários e ações especializadas;
- cabeçalhos ou colunas de ações quando nenhuma ação estiver disponível.

Itens de navegação continuam dependendo de `visualizar`. A interface não substitui a autorização do servidor; ela apenas evita oferecer uma ação que falhará.

## Proteção de páginas

Será criado um helper de servidor que resolve o contexto atual e exige uma permissão. Seus resultados serão:

- sem sessão válida: redirecionar para `/login`;
- sessão válida sem permissão: redirecionar para `/acesso-negado`;
- permissão concedida: devolver o contexto de acesso.

Páginas de listagem exigem `visualizar`; páginas de cadastro exigem `criar`; páginas de edição exigem `editar`. Rotas de `Equipe` e `Funções` passam a seguir essas permissões em vez de lançar diretamente o erro de `requireSuperAdmin` durante a renderização.

O bloqueio cliente do `AppShell` permanece como resposta imediata de navegação, mas a decisão definitiva será feita no servidor para impedir renderização parcial e erros antes do redirecionamento.

## Proteção de operações

Server Actions e APIs validarão a permissão específica antes de ler ou alterar dados. A proteção não dependerá de botões ocultos, parâmetros enviados pelo navegador ou do papel legado salvo na sessão.

Operações compostas usarão a permissão que representa a intenção principal. Por exemplo, duplicar exige `criar`, alteração de status exige `editar` e desativação exige `excluir`.

## Erros e experiência

A página `/acesso-negado` explicará que a função atual não possui a permissão necessária e oferecerá retorno ao painel ou troca de usuário. Erros de autorização não serão capturados como falhas internas nem convertidos em respostas `500`.

Server Actions acionadas com dados obsoletos ou em outra aba deverão devolver uma mensagem de acesso negado sem executar alterações.

## Testes

Serão cobertos:

- unicidade e validade do catálogo atualizado;
- migração de `gerenciar` para ações específicas;
- `visualizar` sem concessão implícita de criar, editar ou excluir;
- visibilidade de controles por permissão;
- redirecionamento de páginas para `/acesso-negado`;
- bloqueio de Server Actions e APIs por chamada direta;
- bypass exclusivo do Super Admin protegido.

## Critérios de aceite

- Nenhum controle de ação aparece sem sua permissão correspondente.
- A URL direta de uma página proibida redireciona para `/acesso-negado`.
- Chamadas diretas a ações proibidas não alteram dados.
- Alterações na matriz de permissões valem na requisição seguinte.
- Funções que tinham `gerenciar` não perdem acesso durante a transição.
