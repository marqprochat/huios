import { NextRequest, NextResponse } from 'next/server';

function getApiBase() {
  // Sempre resolve em runtime
  const internalUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://api:3001/api';
  let base = internalUrl;
  
  if (base.includes('localhost') || base.includes('127.0.0.1')) {
    base = 'http://api:3001/api';
  }

  if (base.endsWith('/')) base = base.slice(0, -1);
  if (base.endsWith('/api')) base = base.slice(0, -4);
  return base;
}

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const apiPath = path.join('/');
  const apiBase = getApiBase();
  
  // path already includes 'api/...' from the client-side URL
  const targetUrl = new URL(`/${apiPath}`, apiBase);

  // Forward query parameters
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  console.log(`[API Proxy] ${request.method} -> ${targetUrl.toString()}`);

  const headers = new Headers();
  // Forward relevant headers
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('Authorization', authorization);

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  // Forward body for non-GET/HEAD requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      if (contentType?.includes('multipart/form-data')) {
        const formData = await request.formData();
        fetchOptions.body = formData;
        headers.delete('Content-Type');
      } else {
        fetchOptions.body = await request.text();
      }
    } catch (e) {
      console.warn('[API Proxy] Could not parse body:', e);
    }
  }

  try {
    const response = await fetch(targetUrl.toString(), fetchOptions);

    const responseContentType = response.headers.get('content-type') || '';
    
    // For file downloads or PDFs, stream the response
    if (
      responseContentType.includes('application/octet-stream') ||
      responseContentType.includes('application/pdf') ||
      response.headers.get('content-disposition')
    ) {
      const blob = await response.blob();
      const responseHeaders = new Headers();
      if (responseContentType) responseHeaders.set('Content-Type', responseContentType);
      const cd = response.headers.get('content-disposition');
      if (cd) responseHeaders.set('Content-Disposition', cd);
      return new NextResponse(blob, { status: response.status, headers: responseHeaders });
    }

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': responseContentType || 'application/json',
      },
    });
  } catch (error: any) {
    console.error(`[API Proxy] Error proxying ${request.method} /${apiPath}:`, error);
    return NextResponse.json(
      { error: `Erro de comunicação interna: ${error.message}` },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}
