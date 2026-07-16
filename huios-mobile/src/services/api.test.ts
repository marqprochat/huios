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

  it.each([
    ['upload', 'Conteúdo do arquivo inválido'],
    ['radius', 'Você está fora do local da aula'],
  ])('preserves an API error string for %s failures', async (_label, apiMessage) => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: apiMessage }),
    } as unknown as Response);

    await expect(api.post('/api/portal/action', {})).rejects.toMatchObject({
      kind: 'http', status: 400, message: apiMessage,
    });
  });

  it('ignores unsafe non-string API error values', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: { internal: 'secret' } }),
    } as unknown as Response);
    await expect(api.get('/api/portal/action')).rejects.toMatchObject({ message: 'HTTP 400' });
  });

  it.each([
    ['null JSON', jest.fn().mockResolvedValue(null)],
    ['empty body', jest.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input'))],
    ['invalid JSON', jest.fn().mockRejectedValue(new SyntaxError('Unexpected token'))],
  ])('keeps HTTP errors typed for a %s response body', async (_label, json) => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 502,
      json,
    } as unknown as Response);

    await expect(api.get('/api/auth/me')).rejects.toMatchObject({
      kind: 'http',
      status: 502,
      message: 'HTTP 502',
    });
  });
});
