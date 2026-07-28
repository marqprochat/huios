# Relatório de Alunos — Exportação PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a exportação CSV do Relatório de Alunos por um download de PDF profissional que represente exatamente os filtros aplicados.

**Architecture:** A página continua calculando `filtered` como fonte única de dados e passa uma adaptação tipada desses dados a um módulo cliente em `src/lib`. O módulo carrega o logo HUIOS, usa `jsPDF` e `autoTable` para compor o PDF em paisagem e retorna uma Promise que permite à página controlar o estado do botão.

**Tech Stack:** Next.js 16, React 19, TypeScript, jsPDF, jspdf-autotable, Tailwind CSS.

## Global Constraints

- Instalar somente `jspdf` e `jspdf-autotable` como dependências de produção.
- Remover o uso da exportação CSV apenas da página `relatorios/alunos`; não remover o utilitário compartilhado nem alterar outros relatórios.
- Gerar exclusivamente no navegador, sem criar endpoint de API ou persistir arquivos no servidor.
- Usar `public/logo.png`; se a imagem falhar, finalizar o PDF com cabeçalho textual HUIOS.
- A origem dos registros é sempre o array `filtered`, para preservar turma, situação, modalidade e busca ativos.
- Exibir somente aluno, turma, modalidade, situação, média, frequência e faltas na tabela do PDF.

---

## Estrutura de arquivos

- `huios-admin/package.json`: registra as duas bibliotecas de geração de PDF.
- `huios-admin/package-lock.json`: trava as versões instaladas.
- `huios-admin/src/lib/exportStudentReportPDF.ts`: tipos, carregamento seguro da logo e geração do documento.
- `huios-admin/src/app/relatorios/alunos/page.tsx`: remove o CSV, constrói o payload do PDF e exibe o estado de exportação.

### Task 1: Instalar a base de geração de PDF

**Files:**
- Modify: `huios-admin/package.json`
- Modify: `huios-admin/package-lock.json`

**Interfaces:**
- Produces: pacotes importáveis `jsPDF` de `jspdf` e `autoTable` de `jspdf-autotable`.

- [ ] **Step 1: Instalar as dependências de produção**

Run: `npm install jspdf jspdf-autotable`

Expected: `package.json` passa a conter exatamente `jspdf` e `jspdf-autotable` em `dependencies`, e o lockfile é atualizado.

- [ ] **Step 2: Confirmar o grafo instalado**

Run: `npm ls jspdf jspdf-autotable`

Expected: ambos aparecem sem `UNMET DEPENDENCY` ou `invalid`.

- [ ] **Step 3: Commit**

```bash
git add huios-admin/package.json huios-admin/package-lock.json
git commit -m "chore: add PDF export dependencies"
```

### Task 2: Criar o gerador de PDF do relatório de alunos

**Files:**
- Create: `huios-admin/src/lib/exportStudentReportPDF.ts`

**Interfaces:**
- Consumes: `jsPDF`, `autoTable` e a URL pública `/logo.png`.
- Produces:

```ts
export interface StudentReportPDFRow {
  studentName: string;
  className: string;
  modality: string;
  status: string;
  avgGrade: string;
  frequency: string;
  absences: number;
}

export interface StudentReportPDFData {
  generatedAt: Date;
  filters: { className: string; status: string; modality: string; search: string };
  stats: { total: number; cursando: number; aprovado: number; reprovado: number };
  rows: StudentReportPDFRow[];
}

export function exportStudentReportPDF(data: StudentReportPDFData): Promise<void>;
```

- [ ] **Step 1: Criar o módulo com os tipos e a normalização mínima de texto**

Implementar os tipos acima e uma função local que remove caracteres de controle e converte valores em texto, preservando acentos. Não aceitar strings indefinidas na montagem das células.

- [ ] **Step 2: Implementar carregamento tolerante a falhas da logo**

Implementar uma função local que carrega `/logo.png` em um `HTMLImageElement`, desenha a imagem em um canvas e devolve `string | null` via Promise. Em `onerror`, devolver `null` para que o relatório continue sem imagem.

- [ ] **Step 3: Gerar o documento em paisagem e baixar o arquivo**

Criar `new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })`; adicionar logo se disponível, título, data/hora `pt-BR`, filtros, quatro métricas e a tabela via `autoTable`. Definir `head` como `['Aluno', 'Turma', 'Modalidade', 'Situação', 'Média', 'Frequência', 'Faltas']`, repetir o cabeçalho automaticamente e usar `didDrawPage` para rodapé `HUIOS · Página X`. Salvar como `relatorio-alunos-YYYY-MM-DD.pdf`.

- [ ] **Step 4: Verificar tipagem e regras estáticas**

Run: `npx tsc --noEmit`

Expected: exit code 0, sem erros no novo módulo.

- [ ] **Step 5: Commit**

```bash
git add huios-admin/src/lib/exportStudentReportPDF.ts
git commit -m "feat: add student report PDF generator"
```

### Task 3: Substituir o botão CSV pela exportação PDF

**Files:**
- Modify: `huios-admin/src/app/relatorios/alunos/page.tsx`

**Interfaces:**
- Consumes: `exportStudentReportPDF(data: StudentReportPDFData): Promise<void>`.
- Produces: botão único `Exportar PDF` que reflete os filtros ativos e impede acionamentos duplicados.

- [ ] **Step 1: Remover a dependência e o manipulador de CSV**

Remover `import { exportCSV } from '@/lib/exportCSV'` e `handleExport`. Não alterar o utilitário `src/lib/exportCSV.ts`, pois ele é usado por outros relatórios.

- [ ] **Step 2: Adaptar os dados filtrados para o contrato do PDF**

Importar o novo gerador e criar `handleExportPDF` assíncrono. Converter modalidade e situação pelos mesmos rótulos da tela; renderizar média somente para `POR_NOTA` com `toFixed(1)`, frequência como `N%` e ausências como número. Enviar a turma selecionada a partir de `classes`, além de situação, modalidade e busca atuais.

- [ ] **Step 3: Adicionar estado de processamento e botão único**

Adicionar `const [exportingPDF, setExportingPDF] = useState(false)`. Enquanto a Promise estiver pendente, desabilitar o botão e trocar o texto por `Gerando PDF...`; no `finally`, reabilitá-lo. Exibir `Exportar PDF` com ícone `picture_as_pdf` quando houver resultados.

- [ ] **Step 4: Verificar lint e build de produção**

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0 e rota `/relatorios/alunos` compilada.

- [ ] **Step 5: Verificação manual no navegador**

Com filtros de turma, situação, modalidade e busca preenchidos, baixar o PDF e confirmar: logo HUIOS (ou título textual se indisponível), filtros exibidos, totais corretos, somente as linhas visíveis, colunas enxutas, cabeçalho repetido em múltiplas páginas e rodapé paginado.

- [ ] **Step 6: Commit**

```bash
git add huios-admin/src/app/relatorios/alunos/page.tsx
git commit -m "feat: export filtered student report as PDF"
```
