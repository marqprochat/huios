import * as SecureStore from 'expo-secure-store';
import { ApiError } from '@/services/api';
import { getMe } from '@/services/auth';
import { useAuthStore } from './auth';

jest.mock('@/services/auth', () => ({ getMe: jest.fn() }));

const basicUser = {
  id: 'user-1',
  name: 'Nome Básico',
  email: 'aluno@huios.com',
  role: 'ALUNO' as const,
};

const fullUser = {
  ...basicUser,
  student: { id: 'student-1', name: 'Nome Completo' },
};

describe('auth store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isLoading: true });
  });

  it('hydrates the full profile while preserving the current token', async () => {
    useAuthStore.setState({ token: 'token', user: basicUser });
    jest.mocked(getMe).mockResolvedValue(fullUser);

    await useAuthStore.getState().hydrateProfile();

    expect(useAuthStore.getState()).toMatchObject({ token: 'token', user: fullUser });
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('keeps the basic user when profile hydration has a temporary failure', async () => {
    useAuthStore.setState({ token: 'token', user: basicUser });
    jest.mocked(getMe).mockRejectedValue(new ApiError('network', 'Falha temporária'));

    await useAuthStore.getState().hydrateProfile();

    expect(useAuthStore.getState()).toMatchObject({ token: 'token', user: basicUser });
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it.each([401, 403])('clears an invalid stored session on HTTP %i', async (status) => {
    useAuthStore.setState({ token: 'token', user: basicUser });
    jest.mocked(getMe).mockRejectedValue(new ApiError('http', 'Token inválido', status));

    await useAuthStore.getState().hydrateProfile();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('huios_jwt');
    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
  });

  it('rehydrates a stored token and fetches the current profile before finishing', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('stored-token');
    jest.mocked(getMe).mockResolvedValue(fullUser);

    await useAuthStore.getState().loadStoredAuth();

    expect(getMe).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      token: 'stored-token',
      user: fullUser,
      isLoading: false,
    });
  });
});
