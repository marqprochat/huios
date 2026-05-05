import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getApiBase() {
  let base = INTERNAL_API_URL;
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
    if (contentType?.includes('multipart/form-data')) {
      // For multipart, pass the raw body and let fetch set the boundary
      const formData = await request.formData();
      fetchOptions.body = formData;
      // Remove content-type so fetch sets it correctly with boundary
      headers.delete('Content-Type');
    } else {
      fetchOptions.body = await request.text();
    }
  }

  try {
    const response = await fetch(targetUrl.toString(), fetchOptions);

    // For file downloads, stream the response
    const responseContentType = response.headers.get('content-type') || '';
    if (
      responseContentType.includes('application/octet-stream') ||
      responseContentType.includes('application/pdf') ||
      response.headers.get('content-disposition')
    ) {
      const blob = await response.blob();
      const responseHeaders = new Headers();
      const ct = response.headers.get('content-type');
      if (ct) responseHeaders.set('Content-Type', ct);
      const cd = response.headers.get('content-disposition');
      if (cd) responseHeaders.set('Content-Disposition', cd);
      return new NextResponse(blob, { status: response.status, headers: responseHeaders });
    }

    // For JSON responses
    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': responseContentType || 'application/json',
      },
    });
  } catch (error) {
    console.error(`[API Proxy] Error proxying ${request.method} /api/${apiPath}:`, error);
    return NextResponse.json(
      { error: 'Erro de comunicação com o servidor.' },
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
