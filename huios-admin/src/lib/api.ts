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

  // No servidor, priorizamos a comunicação interna do Docker
  // O nome do serviço no docker-compose é 'api', rodando na porta 3001
  const internalUrl = process.env.INTERNAL_API_URL || 'http://api:3001/api';
  
  let url = internalUrl;
  
  // Se por algum motivo a URL interna falhar ou for o localhost vindo do .env público
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
     // Forçamos o uso do nome do serviço docker se estivermos no servidor
     url = 'http://api:3001/api';
  }

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
  const fullUrl = `${baseUrl}${endpoint}`;
  
  const response = await fetch(fullUrl, {
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
