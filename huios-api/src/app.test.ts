import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, createApp } from './app';

describe('GET /health', () => {
  it('returns the API health payload', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});

describe('API rate limiting', () => {
  it('limits API routes before their handlers using an injectable low threshold', async () => {
    const limitedApp = createApp({ rateLimitMax: 2 });
    const responses = [];
    for (let requestNumber = 0; requestNumber < 3; requestNumber += 1) {
      responses.push(await request(limitedApp).get('/api/auth/me'));
    }
    expect(responses.map(response => response.status)).toEqual([401, 401, 429]);
  });
});
