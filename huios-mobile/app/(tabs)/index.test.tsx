import { fireEvent, render } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import DashboardScreen from './index';

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
const queryData = {
  aulas: [
    { id: 'late', title: 'Arquitetura', date: `${today}T12:00:00.000Z`, startTime: '19:00', endTime: '20:00' },
    { id: 'early', title: 'Algoritmos', date: `${today}T12:00:00.000Z`, startTime: '08:00', endTime: '09:00', attendance: { id: 'at1', status: 'PENDING' } },
  ],
  boletim: [],
  presenca: [{ disciplineId: 'd1', disciplineName: 'Algoritmos', totalLessons: 20, absences: 2, attendanceRate: 90, status: 'OK', pendingJustifications: 0 }],
  provas: [{ id: 'p1', title: 'Prova 1' }],
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
});
