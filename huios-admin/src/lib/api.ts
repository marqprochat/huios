// Server-side: use INTERNAL_API_URL to call backend directly (container-to-container)
// Client-side: use /api/proxy to go through Next.js proxy (avoids SSL issues with api subdomain)

/**
 * Returns the API base URL. Must be called at runtime (not module init) to ensure
 * environment variables are available in standalone builds.
 */
export function getApiUrl(): string {
  const isServer = typeof window === 'undefined';

  if (!isServer) {
    return '/api/proxy';
  }

  let url = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  // Strip trailing /api if present — callers add /api themselves
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (url.endsWith('/api')) url = url.slice(0, -4);
  return url;
}

/**
 * Client-side API URL constant. Always points to the Next.js proxy route.
 * For server-side code (API routes, server actions), use getApiUrl() instead.
 */
export const API_URL = '/api/proxy';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
