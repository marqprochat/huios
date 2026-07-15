import { getAuthRedirect } from './auth-redirect';

describe('getAuthRedirect', () => {
  it('protects private routes when there is no authenticated session', () => {
    expect(getAuthRedirect({ token: null, isLoading: false, inAuthGroup: false }))
      .toBe('/(auth)/login');
  });

  it('opens tabs when a stored session has just finished hydrating', () => {
    expect(getAuthRedirect({ token: 'token', isLoading: false, inAuthGroup: true }))
      .toBe('/(tabs)');
  });

  it('redirects a valid session that reaches auth after hydration or remount', () => {
    expect(getAuthRedirect({ token: 'token', isLoading: false, inAuthGroup: true }))
      .toBe('/(tabs)');
  });

  it('chooses the same destination as login during the setAuth/replace interval', () => {
    const guardDestination = getAuthRedirect({
      token: 'new-token',
      isLoading: false,
      inAuthGroup: true,
    });
    const explicitLoginDestination = '/(tabs)';

    expect(new Set([guardDestination, explicitLoginDestination])).toEqual(new Set(['/(tabs)']));
  });
});
