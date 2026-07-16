import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockLogout = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 18, left: 0 }),
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Ada Lovelace', email: 'ada@huios.test' },
    logout: mockLogout,
  }),
}));
jest.mock('@/components/AppIcon', () => ({
  AppIcon: () => null,
}));

import MaisScreen from '../../app/(tabs)/mais';

describe('menu Mais', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['Frequência', '/frequencia'],
    ['Boletim', '/boletim'],
    ['Perfil', '/perfil'],
  ])('navega pelo MenuRow %s', (label, route) => {
    const screen = render(<MaisScreen />);
    fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${label}\\.`) }));
    expect(mockPush).toHaveBeenCalledWith(route);
  });

  it('só encerra a sessão e navega depois da confirmação', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const screen = render(<MaisScreen />);

    fireEvent.press(screen.getByRole('button', { name: /^Sair da conta\./ }));
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2]!;
    await act(async () => buttons.find((button) => button.text === 'Sair')!.onPress?.());

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
