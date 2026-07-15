import * as SecureStore from 'expo-secure-store';
import { api, ApiError } from '@/services/api';
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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

  it('does not replace a newer login with a late profile response', async () => {
    const pendingProfile = deferred<typeof fullUser>();
    useAuthStore.setState({ token: 'token-a', user: basicUser });
    jest.mocked(getMe).mockReturnValue(pendingProfile.promise);
    const hydration = useAuthStore.getState().hydrateProfile();
    const newerUser = { ...basicUser, id: 'user-2', name: 'Login B' };

    useAuthStore.setState({ token: 'token-b', user: newerUser });
    pendingProfile.resolve(fullUser);
    await hydration;

    expect(useAuthStore.getState()).toMatchObject({ token: 'token-b', user: newerUser });
  });

  it('does not restore a logged-out session from a late profile response', async () => {
    const pendingProfile = deferred<typeof fullUser>();
    useAuthStore.setState({ token: 'token-a', user: basicUser });
    jest.mocked(getMe).mockReturnValue(pendingProfile.promise);
    const hydration = useAuthStore.getState().hydrateProfile();

    useAuthStore.setState({ token: null, user: null });
    pendingProfile.resolve(fullUser);
    await hydration;

    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
  });

  it.each([401, 403])('does not clear a newer login after a stale HTTP %i', async (status) => {
    const pendingProfile = deferred<typeof fullUser>();
    useAuthStore.setState({ token: 'token-a', user: basicUser });
    jest.mocked(getMe).mockReturnValue(pendingProfile.promise);
    const hydration = useAuthStore.getState().hydrateProfile();
    const newerUser = { ...basicUser, id: 'user-2', name: 'Login B' };

    useAuthStore.setState({ token: 'token-b', user: newerUser });
    pendingProfile.reject(new ApiError('http', 'Token antigo inválido', status));
    await hydration;

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ token: 'token-b', user: newerUser });
  });

  it('preserves a newer login started while deletion of the old token is pending', async () => {
    let storedToken: string | null = 'token-a';
    const deletionStarted = deferred<void>();
    const releaseDeletion = deferred<void>();
    jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async () => {
      deletionStarted.resolve();
      await releaseDeletion.promise;
      storedToken = null;
    });
    jest.mocked(SecureStore.setItemAsync).mockImplementation(async (_key, token) => {
      storedToken = token;
    });
    useAuthStore.setState({ token: 'token-a', user: basicUser });
    jest.mocked(getMe).mockRejectedValue(new ApiError('http', 'Token antigo inválido', 401));

    const staleHydration = useAuthStore.getState().hydrateProfile();
    await deletionStarted.promise;
    const newerUser = { ...basicUser, id: 'user-2', name: 'Login B' };
    const newerLogin = useAuthStore.getState().setAuth('token-b', newerUser);
    releaseDeletion.resolve();
    await Promise.all([staleHydration, newerLogin]);

    expect(storedToken).toBe('token-b');
    expect(useAuthStore.getState()).toMatchObject({ token: 'token-b', user: newerUser });
  });

  it('publishes a new session only after its token is persisted', async () => {
    let storedToken: string | null = 'token-a';
    const writeStarted = deferred<void>();
    const releaseWrite = deferred<void>();
    jest.mocked(SecureStore.setItemAsync).mockImplementation(async (_key, token) => {
      writeStarted.resolve();
      await releaseWrite.promise;
      storedToken = token;
    });
    jest.mocked(SecureStore.getItemAsync).mockImplementation(async () => storedToken);
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true }),
    } as unknown as Response);
    useAuthStore.setState({ token: 'token-a', user: basicUser });
    const newerUser = { ...basicUser, id: 'user-2', name: 'Login B' };

    const newerLogin = useAuthStore.getState().setAuth('token-b', newerUser);
    await writeStarted.promise;
    await api.get('/probe');
    const storedTokenDuringWrite = storedToken;
    const stateDuringWrite = useAuthStore.getState();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/probe'), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer token-a' }),
    }));
    fetchMock.mockRestore();

    releaseWrite.resolve();
    await newerLogin;
    expect(storedTokenDuringWrite).toBe('token-a');
    expect(stateDuringWrite).toMatchObject({ token: 'token-a', user: basicUser });
    expect(storedToken).toBe('token-b');
    expect(useAuthStore.getState()).toMatchObject({ token: 'token-b', user: newerUser });
  });

  it('keeps the previous session when persisting a new token fails', async () => {
    let storedToken: string | null = 'token-a';
    jest.mocked(SecureStore.setItemAsync).mockImplementation(async () => {
      throw new Error('secure storage unavailable');
    });
    useAuthStore.setState({ token: 'token-a', user: basicUser });
    const newerUser = { ...basicUser, id: 'user-2', name: 'Login B' };

    await expect(useAuthStore.getState().setAuth('token-b', newerUser)).rejects.toThrow(
      'secure storage unavailable',
    );

    expect(storedToken).toBe('token-a');
    expect(useAuthStore.getState()).toMatchObject({ token: 'token-a', user: basicUser });
  });

  it('keeps the current session when deleting its token fails', async () => {
    let storedToken: string | null = 'token-a';
    jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async () => {
      throw new Error('secure storage unavailable');
    });
    useAuthStore.setState({ token: 'token-a', user: basicUser });

    await expect(useAuthStore.getState().clearAuth()).rejects.toThrow('secure storage unavailable');

    expect(storedToken).toBe('token-a');
    expect(useAuthStore.getState()).toMatchObject({ token: 'token-a', user: basicUser });
  });

  it('continues processing token transitions after a storage rejection', async () => {
    let storedToken: string | null = 'token-a';
    jest.mocked(SecureStore.setItemAsync)
      .mockRejectedValueOnce(new Error('first write failed'))
      .mockImplementation(async (_key, token) => {
        storedToken = token;
      });
    useAuthStore.setState({ token: 'token-a', user: basicUser });

    await expect(useAuthStore.getState().setAuth('token-b', basicUser)).rejects.toThrow(
      'first write failed',
    );
    const finalUser = { ...basicUser, id: 'user-3', name: 'Login C' };
    await useAuthStore.getState().setAuth('token-c', finalUser);

    expect(storedToken).toBe('token-c');
    expect(useAuthStore.getState()).toMatchObject({ token: 'token-c', user: finalUser });
  });
});
