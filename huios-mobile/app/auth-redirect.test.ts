import { getAuthRedirect } from './auth-redirect';

describe('getAuthRedirect', () => {
  it('protects private routes when there is no authenticated session', () => {
    expect(getAuthRedirect({ token: null, isLoading: false, inAuthGroup: false, justHydrated: false }))
      .toBe('/(auth)/login');
  });

  it('opens tabs when a stored session has just finished hydrating', () => {
    expect(getAuthRedirect({ token: 'token', isLoading: false, inAuthGroup: true, justHydrated: true }))
      .toBe('/(tabs)');
  });

  it('does not compete with explicit navigation after an interactive login', () => {
    expect(getAuthRedirect({ token: 'token', isLoading: false, inAuthGroup: true, justHydrated: false }))
      .toBeNull();
  });
});
