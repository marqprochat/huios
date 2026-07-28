# Exportação em PDF — Relatório de Alunos

## Objetivo

Permitir que a administração baixe diretamente um PDF claro e profissional do Relatório de Alunos, contendo exclusivamente os dados compatíveis com os filtros ativos da tela.

## Abordagem aprovada

Usar as dependências `jspdf` e `jspdf-autotable` no cliente. Elas produzirão um arquivo PDF real — sem abrir a caixa de impressão — com paginação automática e repetição do cabeçalho da tabela em cada página.

## Experiência na tela

- Manter a exportação CSV existente.
- Exibir, ao lado dela, o botão `Exportar PDF` quando houver ao menos um resultado filtrado.
- O botão gera e baixa o arquivo imediatamente; enquanto o arquivo é preparado, permanece desabilitado e informa que a exportação está em andamento.
- O nome do arquivo identifica o relatório e a data de geração, por exemplo `relatorio-alunos-2026-07-28.pdf`.

## Conteúdo do PDF

O documento terá orientação paisagem para preservar a leitura da tabela e incluirá somente:

1. Logo HUIOS (`public/logo.png`), título “Relatório de Alunos” e data/hora de geração.
2. Linha de filtros aplicados: turma, situação, modalidade e busca. Filtros sem valor serão descritos como “Todas” ou “Não informada”, conforme o campo.
3. Resumo com: total de alunos, cursando, aprovados e reprovados.
4. Tabela: aluno, turma, modalidade, situação, média, frequência e faltas.
5. Rodapé com paginação e identificação HUIOS.

O PDF não incluirá email, curso, motivo de situação, barras visuais da tela ou detalhes de perfil, mantendo-o objetivo e legível.

## Dados e regras

- A fonte será o array `filtered` já calculado pela página. Portanto, os filtros remotos (turma e situação) e locais (modalidade e busca) serão sempre respeitados.
- A modalidade será apresentada como “Por Nota” ou “Por Presença”; a situação seguirá os rótulos já definidos pela página.
- Média e frequência indisponíveis serão mostradas como “—”.
- Cada valor de texto será convertido para formato seguro antes de ser inserido na tabela; quebras de linha e caracteres de controle não devem quebrar o layout.
- A imagem do logo será carregada antes da geração; se ela não carregar, o PDF continuará sendo produzido apenas com o título textual HUIOS.

## Estrutura

- Um módulo novo em `src/lib` concentrará a conversão da logo, a montagem do documento e as definições de tipos do relatório.
- A página de Relatório de Alunos apenas adaptará os dados filtrados e os rótulos de filtros ao módulo e controlará o estado do botão.

## Verificação

- Testar a transformação de dados: filtros, rótulos, valores ausentes e texto de células.
- Executar o lint e o build do admin.
- Confirmar manualmente que o download contém logo, filtros ativos, resumo, tabela paginada e apenas os alunos exibidos na tela.
