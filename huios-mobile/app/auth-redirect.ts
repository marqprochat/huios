interface AuthRedirectState {
  token: string | null;
  isLoading: boolean;
  inAuthGroup: boolean;
}

export function getAuthRedirect({
  token,
  isLoading,
  inAuthGroup,
}: AuthRedirectState): '/(auth)/login' | '/(tabs)' | null {
  if (isLoading) return null;
  if (!token && !inAuthGroup) return '/(auth)/login';
  if (token && inAuthGroup) return '/(tabs)';
  return null;
}
