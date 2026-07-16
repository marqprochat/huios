import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/services/api';
import LoginScreen from '../../app/(auth)/login';

const mockLogin = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/components/AppIcon', () => ({ AppIcon: () => null }));

describe('LoginScreen', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockReplace.mockReset();
  });

  it('shows only the HuIOS logo and Portal do Aluno in the brand area', () => {
    const { getByLabelText, getByText, queryByText } = render(<LoginScreen />);

    expect(getByLabelText('Logo HuIOS')).toBeTruthy();
    expect(getByText('Portal do Aluno')).toBeTruthy();
    expect(queryByText('HuIOS')).toBeNull();
  });

  it('replaces login with tabs after successful authentication', async () => {
    mockLogin.mockResolvedValue(undefined);
    const { getByLabelText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText('E-mail'), '  aluno@huios.com  ');
    fireEvent.changeText(getByLabelText('Senha'), 'segredo');
    fireEvent.press(getByText('Entrar no portal'));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('aluno@huios.com', 'segredo'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('allows the student to show and hide the password', () => {
    const { getByLabelText } = render(<LoginScreen />);
    const password = getByLabelText('Senha');

    expect(password.props.secureTextEntry).toBe(true);
    fireEvent.press(getByLabelText('Mostrar senha'));
    expect(getByLabelText('Senha').props.secureTextEntry).toBe(false);
    fireEvent.press(getByLabelText('Ocultar senha'));
    expect(getByLabelText('Senha').props.secureTextEntry).toBe(true);
  });

  it('explains which required fields must be filled', async () => {
    const { getByLabelText, getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('Entrar no portal'));
    expect(getByText('Informe seu e-mail e sua senha.')).toBeTruthy();

    fireEvent.changeText(getByLabelText('E-mail'), 'aluno@huios.com');
    fireEvent.press(getByText('Entrar no portal'));
    expect(getByText('Informe sua senha.')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it.each([
    [new ApiError('http', 'Unauthorized', 401), 'E-mail ou senha incorretos.'],
    [new ApiError('network', 'Falha', undefined), 'Não foi possível conectar. Verifique sua internet e tente novamente.'],
    [new Error('Serviço indisponível'), 'Serviço indisponível'],
  ])('shows a clear login error for %p', async (error, message) => {
    mockLogin.mockRejectedValue(error);
    const { getByLabelText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText('E-mail'), 'aluno@huios.com');
    fireEvent.changeText(getByLabelText('Senha'), 'segredo');
    fireEvent.press(getByText('Entrar no portal'));

    expect(await waitFor(() => getByText(message))).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
