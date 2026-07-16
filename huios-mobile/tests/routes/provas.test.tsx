import { fireEvent, render } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import ProvasScreen from '../../app/(tabs)/provas';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('@/components/ScreenHeader', () => ({ ScreenHeader: ({ title }: { title: string }) => title }));

describe('ProvasScreen attempts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useQuery).mockReturnValue({
      data: [{
        id: 'exam-1', title: 'Prova iniciada', startDate: new Date(Date.now() - 60_000).toISOString(),
        deadline: new Date(Date.now() + 60_000).toISOString(), attemptStatus: 'STARTED',
        startedAt: new Date(Date.now() - 120_000).toISOString(),
      }],
      isLoading: false, isError: false, isRefetching: false, refetch: jest.fn(),
    } as never);
  });

  it('keeps an opened unfinished exam pending and resumes it with Continuar', () => {
    const screen = render(<ProvasScreen />);
    expect(screen.getByText('Continuar')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Continuar Prova iniciada'));
    expect(mockPush).toHaveBeenCalledWith('/provas/exam-1');
    expect(screen.queryByText('Nota:')).toBeNull();
  });
});
