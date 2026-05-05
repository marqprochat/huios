// Server-side: use INTERNAL_API_URL to call backend directly (container-to-container)
// Client-side: use /api/proxy to go through Next.js proxy (avoids SSL issues with api subdomain)
const isServer = typeof window === 'undefined';

function getServerApiUrl() {
  let url = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  // Strip trailing /api if present — components add /api themselves
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (url.endsWith('/api')) url = url.slice(0, -4);
  return url;
}

export const API_URL = isServer ? getServerApiUrl() : '/api/proxy';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
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
