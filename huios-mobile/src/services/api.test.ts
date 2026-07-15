import { api, ApiError } from './api';

describe('api errors', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('classifies fetch failures as network errors', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    await expect(api.get('/api/auth/me')).rejects.toMatchObject({
      kind: 'network',
      message: 'Não foi possível conectar à API',
    });

    try {
      await api.get('/api/auth/me');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
    }
  });

  it('preserves useful API messages and HTTP status', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ message: 'Token expirado' }),
    } as unknown as Response);

    await expect(api.get('/api/auth/me')).rejects.toMatchObject({
      kind: 'http',
      status: 401,
      message: 'Token expirado',
    });
  });
});
