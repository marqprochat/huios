import { api } from './api';

export async function registerPushToken(token: string, platform: 'android' | 'ios') {
  return api.post('/api/push-tokens', { token, platform });
}

export async function removePushToken(token: string) {
  return api.delete(`/api/push-tokens/${encodeURIComponent(token)}`);
}
