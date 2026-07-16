import { render } from '@testing-library/react-native';
import CheckinScreen from '../../app/checkin/[id]';

let mockLesson = { id: 'lesson-1', date: '2026-07-15T00:00:00.000Z', startTime: null as string | null, endTime: null as string | null, discipline: { id: 'd', name: 'Direito' } };

jest.mock('@expo/vector-icons', () => ({ MaterialIcons: () => null }));

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: 'lesson-1' }), useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  useQuery: () => ({ data: mockLesson, isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) }));
jest.mock('expo-location', () => ({ Accuracy: { High: 1 }, requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn() }));
jest.mock('@/services/aulas', () => ({ getAula: jest.fn(), checkin: jest.fn(), checkout: jest.fn() }));

describe('check-in accessibility and safe area', () => {
  beforeEach(() => { mockLesson = { id: 'lesson-1', date: '2026-07-15T00:00:00.000Z', startTime: null, endTime: null, discipline: { id: 'd', name: 'Direito' } }; });
  it('applies device insets and exposes the primary action semantics', () => {
    const { getByRole, UNSAFE_getByType } = render(<CheckinScreen />);
    const action = getByRole('button', { name: 'Fazer check-in nesta aula' });
    expect(action.props.accessibilityState).toEqual({ disabled: false, busy: false });
    const { ScrollView } = require('react-native');
    expect(UNSAFE_getByType(ScrollView).props.contentContainerStyle).toEqual(expect.objectContaining({ paddingTop: 47, paddingBottom: 58 }));
  });

  it('formats Prisma civil date and ISO times in São Paulo', () => {
    mockLesson = { ...mockLesson, startTime: '2026-07-15T11:00:00.000Z', endTime: '2026-07-15T12:30:00.000Z' };
    const { getByText } = render(<CheckinScreen />);
    expect(getByText(/quarta-feira, 15 de julho/i)).toBeTruthy();
    expect(getByText('08:00 – 09:30')).toBeTruthy();
  });

  it('shows one placeholder when both lesson times are absent', () => {
    const { getAllByText } = render(<CheckinScreen />);
    expect(getAllByText('Horário não informado')).toHaveLength(1);
  });
});
