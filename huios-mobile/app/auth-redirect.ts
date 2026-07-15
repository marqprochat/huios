interface AuthRedirectState {
  token: string | null;
  isLoading: boolean;
  inAuthGroup: boolean;
  justHydrated: boolean;
}

export function getAuthRedirect({
  token,
  isLoading,
  inAuthGroup,
  justHydrated,
}: AuthRedirectState): '/(auth)/login' | '/(tabs)' | null {
  if (isLoading) return null;
  if (!token && !inAuthGroup) return '/(auth)/login';
  if (token && inAuthGroup && justHydrated) return '/(tabs)';
  return null;
}
