import { fireEvent, render } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import DashboardScreen, {
  countActionableExams,
  formatLessonTime,
  getActiveEnrollmentLabel,
  getAttendanceMetric,
  getSaoPauloDateKey,
  shouldStackCards,
  sortLessonsByStartTime,
} from '../../app/(tabs)/index';
import type { Lesson } from '@/types';

const mockPush = jest.fn();
const refetchMocks = {
  aulas: jest.fn(),
  boletim: jest.fn(),
  presenca: jest.fn(),
  provas: jest.fn(),
};

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 12 }) }));
jest.mock('@/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('@/store/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    user: {
      id: 'u1', email: 'gabriel@example.com', role: 'ALUNO', name: 'Gabriel Lima',
      student: {
        id: 's1', name: 'Gabriel de Lima', enrollments: [{
          id: 'e1', status: 'CURSANDO',
          courseClass: { id: 't1', name: 'Turma 2026 A', course: { id: 'c1', name: 'Engenharia de Software' } },
        }],
      },
    },
  }),
}));

const today = new Date().toISOString().split('T')[0];
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const queryData = {
  aulas: [
    { id: 'late', date: `${today}T12:00:00.000Z`, startTime: `${today}T22:00:00.000Z`, endTime: `${today}T23:00:00.000Z`, discipline: { id: 'd2', name: 'Arquitetura' } },
    { id: 'early', date: `${today}T12:00:00.000Z`, startTime: `${today}T11:00:00.000Z`, endTime: `${today}T12:00:00.000Z`, discipline: { id: 'd1', name: 'Algoritmos' }, attendance: { id: 'at1', status: 'PENDING' } },
  ] as Lesson[],
  boletim: [],
  presenca: [{ disciplineId: 'd1', disciplineName: 'Algoritmos', totalLessons: 20, absences: 2, attendanceRate: 90, status: 'OK', pendingJustifications: 0 }],
  provas: [{ id: 'p1', title: 'Prova 1', startDate: oneHourAgo, deadline: oneHourFromNow }],
};

function mockQueries(overrides: Record<string, object> = {}) {
  (useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: [keyof typeof queryData] }) => {
    const key = queryKey[0];
    return { data: queryData[key], isLoading: false, isError: false, refetch: refetchMocks[key], ...overrides[key] };
  });
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueries();
  });

  it('shows the real student identity, enrollment and academic metrics', () => {
    const { getByText, getByLabelText } = render(<DashboardScreen />);

    expect(getByText('Olá, Gabriel')).toBeTruthy();
    expect(getByLabelText('Avatar de Gabriel de Lima')).toBeTruthy();
    expect(getByText('GD')).toBeTruthy();
    expect(getByText('Engenharia de Software • Turma 2026 A')).toBeTruthy();
    expect(getByText('90%')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });

  it('orders today lessons by start time and preserves check-in navigation', () => {
    const { getAllByText, getByLabelText } = render(<DashboardScreen />);
    const titles = getAllByText(/Algoritmos|Arquitetura/).map((node) => node.props.children);

    expect(titles).toEqual(['Algoritmos', 'Arquitetura']);
    fireEvent.press(getByLabelText('Fazer check-in em Algoritmos'));
    expect(mockPush).toHaveBeenCalledWith('/checkin/early');
  });

  it('routes the shortcuts to exams and the report card', () => {
    const { getByText } = render(<DashboardScreen />);

    fireEvent.press(getByText('Ver provas'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/provas');
    fireEvent.press(getByText('Ver boletim'));
    expect(mockPush).toHaveBeenCalledWith('/boletim');
  });

  it('shows loading, empty and error states with retry', () => {
    mockQueries({ aulas: { data: undefined, isLoading: true } });
    const loading = render(<DashboardScreen />);
    expect(loading.getByLabelText('Carregando conteúdo')).toBeTruthy();
    loading.unmount();

    mockQueries({ aulas: { data: [], isLoading: false } });
    const empty = render(<DashboardScreen />);
    expect(empty.getByText('Nenhuma aula hoje')).toBeTruthy();
    empty.unmount();

    mockQueries({ aulas: { data: undefined, isError: true } });
    const error = render(<DashboardScreen />);
    expect(error.getByText('Não foi possível carregar as aulas de hoje.')).toBeTruthy();
    fireEvent.press(error.getByLabelText('Tentar novamente'));
    expect(refetchMocks.aulas).toHaveBeenCalled();
  });

  it('renders an API lesson without title and announces one missing-time placeholder', () => {
    mockQueries({ aulas: { data: [{
      id: 'without-time', date: `${today}T12:00:00.000Z`, startTime: null, endTime: null,
      discipline: { id: 'd3', name: 'Banco de Dados' },
    }] } });
    const { getByText } = render(<DashboardScreen />);
    expect(getByText('Banco de Dados')).toBeTruthy();
    const timeText = getByText(/Horário não informado/).props.children.join('');
    expect(timeText.match(/Horário não informado/g)).toHaveLength(1);
  });
});

describe('Home data normalization', () => {
  it('uses the civil date in America/Sao_Paulo across the UTC day boundary', () => {
    expect(getSaoPauloDateKey(new Date('2026-07-16T01:30:00.000Z'))).toBe('2026-07-15');
    expect(getSaoPauloDateKey(new Date('2026-07-16T03:00:00.000Z'))).toBe('2026-07-16');
  });

  it('formats and orders real ISO lesson timestamps', () => {
    const late = { ...queryData.aulas[0], startTime: '2026-07-15T22:00:00.000Z', endTime: '2026-07-15T23:00:00.000Z' };
    const early = { ...queryData.aulas[1], startTime: '2026-07-15T11:00:00.000Z', endTime: '2026-07-15T12:00:00.000Z' };
    expect(sortLessonsByStartTime([late, early]).map((lesson) => lesson.id)).toEqual(['early', 'late']);
    expect(formatLessonTime(early.startTime)).toBe('08:00');
  });

  it('shows a clear placeholder and stably places lessons without a time last', () => {
    const firstWithoutTime = { ...queryData.aulas[0], id: 'no-time-1', startTime: null, endTime: null };
    const timed = { ...queryData.aulas[1], id: 'timed', startTime: '2026-07-15T11:00:00.000Z' };
    const secondWithoutTime = { ...queryData.aulas[0], id: 'no-time-2', startTime: null, endTime: null };

    expect(formatLessonTime(null)).toBe('Horário não informado');
    expect(sortLessonsByStartTime([firstWithoutTime, timed, secondWithoutTime]).map((lesson) => lesson.id))
      .toEqual(['timed', 'no-time-1', 'no-time-2']);
  });

  it('stacks cards while their real minimum width would not fit', () => {
    expect(shouldStackCards(350)).toBe(true);
    expect(shouldStackCards(364)).toBe(false);
  });

  it('reports attendance as unavailable when there are no recorded lessons', () => {
    expect(getAttendanceMetric([])).toEqual({ value: '—', status: 'neutral', statusLabel: 'Sem dados' });
  });

  it('does not recommend a minimum attendance rate before attendance exists', () => {
    mockQueries({ presenca: { data: [] } });
    const { getByText, queryByText } = render(<DashboardScreen />);
    expect(getByText('Sem dados')).toBeTruthy();
    expect(queryByText('Mínimo recomendado: 75%')).toBeNull();
  });

  it('does not present an inactive enrollment as the current course', () => {
    expect(getActiveEnrollmentLabel([{
      id: 'inactive', status: 'TRANCADO',
      courseClass: { id: 't1', name: 'Turma antiga', course: { id: 'c1', name: 'Curso antigo' } },
    }])).toBe('Matrícula ativa não encontrada');
  });

  it('counts only exams currently inside their actionable window', () => {
    const now = new Date('2026-07-15T15:00:00.000Z');
    expect(countActionableExams([
      { id: 'active', title: 'Ativa', startDate: '2026-07-15T14:00:00.000Z', deadline: '2026-07-15T16:00:00.000Z' },
      { id: 'future', title: 'Futura', startDate: '2026-07-15T16:00:00.000Z', deadline: '2026-07-15T17:00:00.000Z' },
      { id: 'expired', title: 'Expirada', startDate: '2026-07-15T12:00:00.000Z', deadline: '2026-07-15T14:00:00.000Z' },
      { id: 'done', title: 'Feita', startDate: '2026-07-15T14:00:00.000Z', deadline: '2026-07-15T16:00:00.000Z', submission: { id: 's', startedAt: '2026-07-15T14:00:00.000Z', submittedAt: '2026-07-15T14:30:00.000Z' } },
    ], now)).toBe(1);
  });
});
