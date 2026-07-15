# HuIOS Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o Portal do Aluno mobile redesenhado, responsivo e funcional, com perfil completo, nome correto, login que navega para o Início e endpoints autenticados próprios na API Docker.

**Architecture:** A API Express será a fonte única para o mobile e ganhará rotas protegidas em `/api/portal` derivadas do usuário do JWT, sem aceitar `studentId` do cliente. No mobile, autenticação e perfil serão normalizados no Zustand; componentes visuais reutilizáveis sustentarão quatro abas principais e as telas secundárias dentro de “Mais”.

**Tech Stack:** Expo SDK 54, Expo Router 6, React Native 0.81, React 19, TypeScript 5.9, NativeWind 4, TanStack Query 5, Zustand 5, Express 4, Prisma 6, PostgreSQL 15, Vitest e Supertest na API, jest-expo e React Native Testing Library no mobile.

## Global Constraints

- Cor primária: `#135bec`; azul profundo em gradientes; fundo neutro claro; cards brancos.
- Usar `MaterialIcons`; emojis não podem representar ações funcionais.
- Navegação inferior: Início, Aulas, Provas e Mais.
- Alvos de toque: no mínimo 44 × 44 pontos.
- Status sempre deve ter texto ou ícone além de cor.
- Safe area, teclado e textos longos não podem cortar conteúdo essencial.
- Logo do login: `huios-admin/public/logo.png`, copiada para o mobile, sobre base branca; exibir “Portal do Aluno” ao lado e não repetir “HuIOS”.
- Push remoto continua desativado somente no Expo Go; development build e produção preservam o recurso.
- Não alterar regras acadêmicas de presença, prova ou nota.

---

## File Structure

### API

- `huios-api/src/app.ts` — monta middlewares e rotas sem iniciar a porta, permitindo testes HTTP.
- `huios-api/src/index.ts` — carrega ambiente e chama `app.listen`.
- `huios-api/src/controllers/authController.ts` — login e perfil `/api/auth/me`.
- `huios-api/src/controllers/portalController.ts` — consultas acadêmicas vinculadas ao aluno autenticado.
- `huios-api/src/routes/authRoutes.ts` — `/login` e `/me`.
- `huios-api/src/routes/portalRoutes.ts` — aulas, boletim, presença e provas do aluno.
- `huios-api/src/services/studentContext.ts` — resolve `userId` do JWT para `studentId` e matrículas ativas.
- `huios-api/src/**/*.test.ts` — testes unitários dos contratos e autorização.

### Mobile

- `huios-mobile/src/utils/user.ts` — resolução única do nome e iniciais.
- `huios-mobile/src/store/auth.ts` — token, usuário básico, perfil completo e restauração.
- `huios-mobile/src/hooks/useAuth.ts` — login, perfil e logout.
- `huios-mobile/src/services/api.ts` — erros HTTP/rede tipados.
- `huios-mobile/src/services/*.ts` — contratos alinhados aos endpoints Express.
- `huios-mobile/src/components/` — cabeçalhos, indicadores, estados, menu e cards.
- `huios-mobile/app/(auth)/login.tsx` — login redesenhado e navegação explícita.
- `huios-mobile/app/(tabs)/` — Início, Aulas, Provas e Mais.
- `huios-mobile/app/frequencia.tsx`, `boletim.tsx`, `perfil.tsx` — destinos secundários.
- `huios-mobile/assets/logo-huios.png` — logo original do HuIOS.

---

### Task 1: Test Harness e Aplicação Express Testável

**Files:**
- Create: `huios-api/src/app.ts`
- Create: `huios-api/src/app.test.ts`
- Modify: `huios-api/src/index.ts`
- Modify: `huios-api/package.json`
- Modify: `huios-api/package-lock.json`

**Interfaces:**
- Produces: `export const app: Express` sem `listen`.
- Produces: script `npm test` executando Vitest.

- [ ] **Step 1: Adicionar dependências e script de teste**

Em `huios-api/package.json`, adicionar:

```json
{
  "scripts": { "test": "vitest run" },
  "devDependencies": {
    "@types/supertest": "^6.0.3",
    "supertest": "^7.1.4",
    "vitest": "^3.2.4"
  }
}
```

Executar: `cd huios-api && npm install`

- [ ] **Step 2: Escrever o teste que exige app sem listener**

```ts
// huios-api/src/app.test.ts
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app';

describe('GET /health', () => {
  it('returns the API health payload', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar falha**

Executar: `npm test -- src/app.test.ts`

Esperado: FAIL porque `./app` ainda não existe.

- [ ] **Step 4: Extrair a construção do Express**

Mover middlewares, rotas e `/health` de `src/index.ts` para `src/app.ts` e exportar:

```ts
export const app = express();
// middlewares e app.use(...) existentes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

Deixar `src/index.ts` somente com:

```ts
import dotenv from 'dotenv';
dotenv.config();
import { app } from './app';

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server is running on port ${port}`));
```

- [ ] **Step 5: Verificar teste e build**

Executar: `npm test -- src/app.test.ts && npm run build`

Esperado: 1 teste PASS e TypeScript sem erros.

- [ ] **Step 6: Commit**

```bash
git add huios-api/src/app.ts huios-api/src/app.test.ts huios-api/src/index.ts huios-api/package.json huios-api/package-lock.json
git commit -m "test: prepara api para testes http"
```

---

### Task 2: Perfil Autenticado e Contrato do Nome do Aluno

**Files:**
- Create: `huios-api/src/controllers/authController.test.ts`
- Modify: `huios-api/src/controllers/authController.ts`
- Modify: `huios-api/src/routes/authRoutes.ts`

**Interfaces:**
- Produces: `GET /api/auth/me` protegido por `authenticateToken`.
- Produces: `{ id, name, email, role, student?: { id, name, phone, enrollments } }`.

- [ ] **Step 1: Escrever teste do perfil sem token**

```ts
it('rejects /api/auth/me without a token', async () => {
  const response = await request(app).get('/api/auth/me');
  expect(response.status).toBe(401);
});
```

- [ ] **Step 2: Rodar e confirmar falha de rota**

Executar: `npm test -- src/controllers/authController.test.ts`

Esperado: FAIL; a rota atual responde 404.

- [ ] **Step 3: Implementar `getMe` com seleção segura**

```ts
export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, role: true,
      student: {
        select: {
          id: true, name: true, phone: true,
          enrollments: {
            where: { status: 'CURSANDO' },
            select: {
              id: true, status: true,
              class: { select: { id: true, name: true, course: { select: { id: true, name: true } } } }
            }
          }
        }
      }
    }
  });
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  return res.json({
    ...user,
    student: user.student ? {
      ...user.student,
      enrollments: user.student.enrollments.map(({ class: courseClass, ...enrollment }) => ({
        ...enrollment,
        courseClass
      }))
    } : undefined
  });
};
```

Registrar:

```ts
router.get('/me', authenticateToken, getMe);
```

- [ ] **Step 4: Testar token inválido e perfil válido**

Mockar `prisma.user.findUnique`, assinar JWT com o segredo de teste e verificar que senha/CPF não aparecem no JSON.

Executar: `npm test -- src/controllers/authController.test.ts`

Esperado: casos 401, 403 e 200 PASS.

- [ ] **Step 5: Commit**

```bash
git add huios-api/src/controllers/authController.ts huios-api/src/controllers/authController.test.ts huios-api/src/routes/authRoutes.ts
git commit -m "feat: adiciona perfil autenticado do aluno"
```

---

### Task 3: Contexto Seguro do Aluno e Rotas Portal

**Files:**
- Create: `huios-api/src/services/studentContext.ts`
- Create: `huios-api/src/services/studentContext.test.ts`
- Create: `huios-api/src/controllers/portalController.ts`
- Create: `huios-api/src/controllers/portalController.test.ts`
- Create: `huios-api/src/routes/portalRoutes.ts`
- Modify: `huios-api/src/app.ts`

**Interfaces:**
- Produces: `getStudentContext(userId: string): Promise<{ studentId: string; classIds: string[]; disciplineIds: string[] }>`.
- Produces: endpoints protegidos `/api/portal/aulas`, `/boletim`, `/presenca`, `/provas`.

- [ ] **Step 1: Escrever teste de isolamento por usuário**

```ts
it('derives studentId from the authenticated user', async () => {
  prismaMock.user.findUnique.mockResolvedValue({
    student: { id: 'student-1', enrollments: [{ classId: 'class-1' }] }
  });
  prismaMock.discipline.findMany.mockResolvedValue([{ id: 'discipline-1' }]);
  await expect(getStudentContext('user-1')).resolves.toEqual({
    studentId: 'student-1', classIds: ['class-1'], disciplineIds: ['discipline-1']
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Executar: `npm test -- src/services/studentContext.test.ts`

Esperado: FAIL porque o serviço não existe.

- [ ] **Step 3: Implementar contexto sem aceitar IDs do cliente**

```ts
export async function getStudentContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { student: { select: { id: true, enrollments: { where: { status: 'CURSANDO' }, select: { classId: true } } } } }
  });
  if (!user?.student) throw new StudentNotFoundError();
  const classIds = user.student.enrollments.map(item => item.classId);
  const disciplines = await prisma.discipline.findMany({
    where: { courseClasses: { some: { id: { in: classIds } } } }, select: { id: true }
  });
  return { studentId: user.student.id, classIds, disciplineIds: disciplines.map(item => item.id) };
}
```

- [ ] **Step 4: Escrever testes de cada endpoint**

Verificar que todos exigem JWT e filtram pelo contexto:

```ts
expect(prismaMock.lesson.findMany).toHaveBeenCalledWith(expect.objectContaining({
  where: { disciplines: { some: { id: { in: ['discipline-1'] } } } }
}));
```

- [ ] **Step 5: Implementar consultas do portal**

Migrar a lógica equivalente das rotas Next em `huios-admin/src/app/api/portal`, preservando os formatos consumidos pelo mobile:

```ts
router.use(authenticateToken);
router.get('/aulas', listStudentLessons);
router.get('/aulas/:id', getStudentLesson);
router.get('/boletim', getStudentReportCard);
router.get('/presenca/pendencias', getStudentAttendanceSummary);
router.get('/provas', listStudentExams);
router.get('/provas/:id/questoes', listStudentExamQuestions);
router.post('/provas/:id/submit', submitStudentExam);
```

Montar em `app.ts`:

```ts
app.use('/api/portal', portalRoutes);
```

- [ ] **Step 6: Verificar contratos**

Executar: `npm test -- src/services/studentContext.test.ts src/controllers/portalController.test.ts && npm run build`

Esperado: todos PASS e build sem erros.

- [ ] **Step 7: Commit**

```bash
git add huios-api/src/services/studentContext* huios-api/src/controllers/portalController* huios-api/src/routes/portalRoutes.ts huios-api/src/app.ts
git commit -m "feat: expõe dados acadêmicos do aluno na api"
```

---

### Task 4: Check-in e Justificativa Autorizados pelo JWT

**Files:**
- Modify: `huios-api/src/controllers/portalController.ts`
- Modify: `huios-api/src/controllers/portalController.test.ts`
- Modify: `huios-api/src/routes/portalRoutes.ts`

**Interfaces:**
- Produces: `POST /api/portal/aulas/:id/checkin`, `/checkout` e `/presenca/justificativa`.
- Consumes: `getStudentContext(req.user.id)` da Task 3.

- [ ] **Step 1: Escrever teste que bloqueia aula de outra matrícula**

```ts
it('returns 404 when lesson is outside the student disciplines', async () => {
  prismaMock.lesson.findFirst.mockResolvedValue(null);
  const response = await authenticatedRequest.post('/api/portal/aulas/foreign/checkin').send({ latitude: -23, longitude: -46 });
  expect(response.status).toBe(404);
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Executar: `npm test -- src/controllers/portalController.test.ts`

Esperado: FAIL porque os endpoints ainda não existem.

- [ ] **Step 3: Migrar check-in/out e upload**

Reutilizar a fórmula de Haversine e regras atuais, mas buscar a aula com:

```ts
where: { id: req.params.id, disciplines: { some: { id: { in: context.disciplineIds } } } }
```

Registrar upload com Multer e validar que `attendance.studentId === context.studentId` antes de criar justificativa.

- [ ] **Step 4: Verificar autorização e casos de domínio**

Executar: `npm test -- src/controllers/portalController.test.ts`

Esperado: PASS para fora do raio, janela inválida, aula alheia, upload alheio e sucesso.

- [ ] **Step 5: Commit**

```bash
git add huios-api/src/controllers/portalController.ts huios-api/src/controllers/portalController.test.ts huios-api/src/routes/portalRoutes.ts
git commit -m "feat: protege ações acadêmicas do aluno"
```

---

### Task 5: Autenticação Mobile, Erros Tipados e Nome

**Files:**
- Create: `huios-mobile/src/utils/user.ts`
- Create: `huios-mobile/src/utils/user.test.ts`
- Create: `huios-mobile/jest.setup.ts`
- Modify: `huios-mobile/package.json`
- Modify: `huios-mobile/package-lock.json`
- Modify: `huios-mobile/src/types/index.ts`
- Modify: `huios-mobile/src/services/api.ts`
- Modify: `huios-mobile/src/store/auth.ts`
- Modify: `huios-mobile/src/hooks/useAuth.ts`

**Interfaces:**
- Produces: `getDisplayName(user: User | null): string` e `getInitials(user: User | null): string`.
- Produces: `ApiError` com `kind: 'http' | 'network'` e `status?: number`.
- Produces: `hydrateProfile(): Promise<void>` no store/hook.

- [ ] **Step 1: Configurar Jest Expo e escrever testes do nome**

Adicionar `jest-expo`, `jest`, `@types/jest`, `@testing-library/react-native`, `react-test-renderer@19.1.0` e `@types/react-test-renderer` às devDependencies. Adicionar o script `"test": "jest --runInBand"`, `"preset": "jest-expo"` e `"setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"]` na configuração Jest do `package.json`; o preset deve respeitar o alias `@` já definido no TypeScript/Babel.

```ts
it('prefers the student name and falls back to the basic user name', () => {
  expect(getDisplayName({ id: '1', email: 'a@b.com', role: 'ALUNO', name: 'Nome Básico', student: { id: 's', name: 'Nome Completo' } })).toBe('Nome Completo');
  expect(getDisplayName({ id: '1', email: 'a@b.com', role: 'ALUNO', name: 'Nome Básico' })).toBe('Nome Básico');
  expect(getDisplayName(null)).toBe('Aluno');
});
```

Executar: `npm test -- src/utils/user.test.ts`

Esperado: FAIL porque o utilitário ainda não existe.

- [ ] **Step 2: Implementar tipos e utilitários**

```ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  student?: Student;
}

export const getDisplayName = (user: User | null) => user?.student?.name?.trim() || user?.name?.trim() || 'Aluno';
export const getInitials = (user: User | null) => getDisplayName(user).split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
```

- [ ] **Step 3: Escrever teste de erro de rede**

Mockar `fetch` rejeitando com `TypeError('Network request failed')` e esperar `ApiError.kind === 'network'` com mensagem “Não foi possível conectar à API”.

- [ ] **Step 4: Implementar `ApiError` e perfil hidratado**

Persistir token; após login e restauração, chamar `/api/auth/me`. Guardar usuário básico antes da chamada para permitir fallback. Limpar sessão somente para 401/403 de token.

- [ ] **Step 5: Rodar testes e TypeScript**

Executar: `npm test && npx tsc --noEmit`

Esperado: todos PASS e zero erros TypeScript.

- [ ] **Step 6: Commit**

```bash
git add huios-mobile/src/utils huios-mobile/jest.setup.ts huios-mobile/src/types/index.ts huios-mobile/src/services/api.ts huios-mobile/src/store/auth.ts huios-mobile/src/hooks/useAuth.ts huios-mobile/package.json huios-mobile/package-lock.json
git commit -m "fix: normaliza autenticação e perfil do aluno"
```

---

### Task 6: Design Tokens e Componentes de Estado

**Files:**
- Modify: `huios-mobile/tailwind.config.js`
- Create: `huios-mobile/src/components/AppIcon.tsx`
- Create: `huios-mobile/src/components/MetricCard.tsx`
- Create: `huios-mobile/src/components/EmptyState.tsx`
- Create: `huios-mobile/src/components/ErrorState.tsx`
- Create: `huios-mobile/src/components/LoadingSkeleton.tsx`
- Create: `huios-mobile/src/components/MenuRow.tsx`
- Modify: `huios-mobile/src/components/ScreenHeader.tsx`
- Modify: `huios-mobile/src/components/LessonCard.tsx`

**Interfaces:**
- Produces componentes com props tipadas e alvos de toque mínimos.

- [ ] **Step 1: Escrever testes de renderização dos estados**

```tsx
it('exposes a retry action on errors', () => {
  const retry = jest.fn();
  const { getByRole } = render(<ErrorState message="Falha ao carregar" onRetry={retry} />);
  fireEvent.press(getByRole('button'));
  expect(retry).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Executar: `npm test -- src/components/ErrorState.test.tsx`

Esperado: FAIL porque o componente não existe.

- [ ] **Step 3: Centralizar tokens**

Adicionar cores `primary`, `primary-dark`, `surface`, estados e raios semânticos ao NativeWind. Criar os componentes com `MaterialIcons`, `accessibilityLabel`, `min-h-11` e texto de apoio.

- [ ] **Step 4: Substituir emojis dos cards**

Em `LessonCard`, trocar localização e ações por `AppIcon` e preservar check-in/out.

- [ ] **Step 5: Verificar componentes**

Executar: `npm test -- src/components && npx tsc --noEmit`

Esperado: PASS e zero erros.

- [ ] **Step 6: Commit**

```bash
git add huios-mobile/tailwind.config.js huios-mobile/src/components
git commit -m "feat: cria sistema visual do app mobile"
```

---

### Task 7: Login Redesenhado e Navegação Pós-Login

**Files:**
- Create: `huios-mobile/assets/logo-huios.png` a partir de `huios-admin/public/logo.png`
- Modify: `huios-mobile/app/(auth)/login.tsx`
- Modify: `huios-mobile/app/_layout.tsx`
- Test: `huios-mobile/app/(auth)/login.test.tsx`

**Interfaces:**
- Consumes: `login(email, password)` da Task 5.
- Produces: navegação explícita `router.replace('/(tabs)')` após sucesso.

- [ ] **Step 1: Escrever teste da navegação**

```tsx
it('replaces login with tabs after successful authentication', async () => {
  loginMock.mockResolvedValue(undefined);
  fireEvent.press(getByText('Entrar no portal'));
  await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/(tabs)'));
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Executar: `npm test -- 'app/(auth)/login.test.tsx'`

Esperado: FAIL; a tela atual não chama `router.replace`.

- [ ] **Step 3: Copiar logo e implementar layout aprovado**

Usar `Image` com `resizeMode="contain"`, bloco branco arredondado e texto “Portal do Aluno” ao lado. Adicionar ícones, mostrar/ocultar senha, `ScrollView`, `KeyboardAvoidingView` e safe area.

- [ ] **Step 4: Navegar explicitamente e tratar erros**

```ts
try {
  await login(email.trim(), password);
  router.replace('/(tabs)');
} catch (error) {
  setFormError(toLoginMessage(error));
}
```

Manter o guard para usuário sem token e restauração; ele não deve competir com a ação de login.

- [ ] **Step 5: Verificar teste, tipos e bundle**

Executar: `npm test -- 'app/(auth)/login.test.tsx' && npx tsc --noEmit && npx expo export --platform android --output-dir "$TEMP/huios-login-verify"`

Esperado: PASS e export Android concluído.

- [ ] **Step 6: Commit**

```bash
git add huios-mobile/assets/logo-huios.png 'huios-mobile/app/(auth)/login.tsx' huios-mobile/app/_layout.tsx 'huios-mobile/app/(auth)/login.test.tsx'
git commit -m "feat: redesenha login e corrige navegação inicial"
```

---

### Task 8: Quatro Abas e Menu Mais

**Files:**
- Modify: `huios-mobile/app/(tabs)/_layout.tsx`
- Create: `huios-mobile/app/(tabs)/mais.tsx`
- Move: `huios-mobile/app/(tabs)/presenca.tsx` → `huios-mobile/app/frequencia.tsx`
- Move: `huios-mobile/app/(tabs)/perfil.tsx` → `huios-mobile/app/perfil.tsx`
- Create: `huios-mobile/app/boletim.tsx`
- Modify: `huios-mobile/app/_layout.tsx`

**Interfaces:**
- Produces quatro abas e rotas `/frequencia`, `/boletim`, `/perfil`.

- [ ] **Step 1: Escrever teste da configuração de destinos**

Testar uma constante exportada `TAB_ROUTES` igual a `['index', 'aulas', 'provas', 'mais']`.

- [ ] **Step 2: Rodar e confirmar falha**

Executar: `npm test -- 'app/(tabs)/_layout.test.ts'`

Esperado: FAIL; configuração atual tem cinco abas.

- [ ] **Step 3: Implementar abas e menu**

```ts
export const TAB_ROUTES = ['index', 'aulas', 'provas', 'mais'] as const;
```

Configurar ícones `home`, `event`, `assignment` e `more-horiz`; usar `MenuRow` para frequência, boletim, perfil e logout.

- [ ] **Step 4: Registrar telas secundárias no Stack**

Adicionar telas com cabeçalho customizado e retorno, sem exibi-las no tab bar.

- [ ] **Step 5: Verificar rotas e tipos**

Executar: `npm test -- 'app/(tabs)/_layout.test.ts' && npx tsc --noEmit`

Esperado: PASS e zero erros.

- [ ] **Step 6: Commit**

```bash
git add huios-mobile/app huios-mobile/src/components/MenuRow.tsx
git commit -m "feat: simplifica navegação do portal do aluno"
```

---

### Task 9: Início Responsivo com Nome Real

**Files:**
- Modify: `huios-mobile/app/(tabs)/index.tsx`
- Test: `huios-mobile/app/(tabs)/index.test.tsx`

**Interfaces:**
- Consumes: `getDisplayName`, `getInitials`, `MetricCard`, estados compartilhados.

- [ ] **Step 1: Escrever teste do nome e atalhos**

```tsx
expect(getByText('Olá, Gabriel')).toBeTruthy();
fireEvent.press(getByText('Ver boletim'));
expect(pushMock).toHaveBeenCalledWith('/boletim');
```

- [ ] **Step 2: Rodar e confirmar falha**

Executar: `npm test -- 'app/(tabs)/index.test.tsx'`

Esperado: FAIL; o nome lê apenas `student.name` e o boletim aponta para presença.

- [ ] **Step 3: Implementar cabeçalho e métricas**

Usar primeiro nome de `getDisplayName(user)`, iniciais, data, frequência e pendências. Em larguras compactas empilhar métricas se cada card não puder manter pelo menos 140 pontos.

- [ ] **Step 4: Adicionar estados e atalhos corretos**

Consultas devem exibir skeleton, vazio ou `ErrorState`; “Ver boletim” usa `/boletim` e “Ver provas” usa `/(tabs)/provas`.

- [ ] **Step 5: Verificar**

Executar: `npm test -- 'app/(tabs)/index.test.tsx' && npx tsc --noEmit`

Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add 'huios-mobile/app/(tabs)/index.tsx' 'huios-mobile/app/(tabs)/index.test.tsx'
git commit -m "feat: redesenha início do aluno"
```

---

### Task 10: Aulas, Provas, Frequência, Boletim e Perfil

**Files:**
- Modify: `huios-mobile/app/(tabs)/aulas.tsx`
- Modify: `huios-mobile/app/(tabs)/provas.tsx`
- Modify: `huios-mobile/app/frequencia.tsx`
- Modify: `huios-mobile/app/boletim.tsx`
- Modify: `huios-mobile/app/perfil.tsx`
- Modify: `huios-mobile/app/checkin/[id].tsx`
- Modify: `huios-mobile/app/provas/[id].tsx`
- Modify: `huios-mobile/src/services/aulas.ts`
- Modify: `huios-mobile/src/services/provas.ts`
- Modify: `huios-mobile/src/services/presenca.ts`
- Modify: `huios-mobile/src/services/boletim.ts`

**Interfaces:**
- Consumes endpoints da Task 3 e componentes da Task 6.

- [ ] **Step 1: Escrever testes de transformação e estados**

Cobrir agrupamento de aulas, prazo de prova, média de frequência, nota vazia e perfil sem matrícula com funções puras exportadas.

```ts
expect(groupLessonsByPeriod(lessons).upcoming).toHaveLength(1);
expect(formatExamDeadline(yesterday)).toBe('Prazo encerrado');
expect(calculateAttendanceRate([])).toBe(100);
```

- [ ] **Step 2: Rodar e confirmar falhas**

Executar: `npm test -- app src`

Esperado: novos testes FAIL antes das funções e estados.

- [ ] **Step 3: Alinhar serviços aos contratos da API**

Manter prefixos `/api/portal`; corrigir payload de presença para usar `attendanceId`, mapear resposta real da API e preservar `ApiError`.

- [ ] **Step 4: Aplicar o sistema visual aprovado**

Aulas usam segmentos Próximas/Anteriores; provas usam Pendentes/Realizadas; frequência usa progresso e justificativas; boletim usa `GradeBar`; perfil usa nome normalizado, curso e indicadores. Detalhes preservam regras existentes e recebem ícones, estados e safe areas.

- [ ] **Step 5: Verificar testes, tipos e bundle**

Executar: `npm test && npx tsc --noEmit && npx expo export --platform android --output-dir "$TEMP/huios-mobile-final"`

Esperado: todos PASS, TypeScript limpo e Android exportado.

- [ ] **Step 6: Commit**

```bash
git add huios-mobile/app huios-mobile/src/services huios-mobile/src/components
git commit -m "feat: aplica redesign às telas acadêmicas"
```

---

### Task 11: Verificação Integrada em Docker e Dispositivos

**Files:**
- Modify only if a failing verification requires a scoped fix.

**Interfaces:**
- Validates all deliverables from Tasks 1–10.

- [ ] **Step 1: Rodar suíte completa**

```powershell
cd huios-api
npm test
npm run build
cd ..\huios-mobile
npm test
npx tsc --noEmit
npx expo install --check
```

Esperado: zero falhas e dependências atualizadas.

- [ ] **Step 2: Reconstruir API Docker**

Executar: `docker compose up -d --build api`

Esperado: `docker compose ps` mostra `huios-api` como healthy.

- [ ] **Step 3: Testar contratos reais**

Fazer login com aluno de teste, guardar token apenas em variável local e validar `/api/auth/me`, `/api/portal/aulas`, `/boletim`, `/presenca/pendencias` e `/provas`. Não imprimir o token.

- [ ] **Step 4: Testar no Expo Go**

Executar: `cd huios-mobile && npx expo start --clear`.

Validar em aparelho físico: logo, teclado, login → Início, nome, quatro abas, Mais, rolagem, textos longos, estados vazios e erro de rede.

- [ ] **Step 5: Testar notificações em development build**

Notificações remotas não serão validadas no Expo Go. Usar development build e confirmar registro/remoção do push token.

- [ ] **Step 6: Revisar diff e commit final de correções**

Executar: `git diff --check && git status --short`.

Se houver correções de verificação, adicionar explicitamente somente os arquivos alterados e commitá-los isoladamente. Exemplo para uma correção no login:

```bash
git add 'huios-mobile/app/(auth)/login.tsx' 'huios-mobile/app/(auth)/login.test.tsx'
git commit -m "fix: conclui validação do app mobile"
```
