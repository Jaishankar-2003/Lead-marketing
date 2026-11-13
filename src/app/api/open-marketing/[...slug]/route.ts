import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.OPEN_MARKETING_BACKEND_URL || 'http://127.0.0.1:3001';

async function proxyRequest(req: NextRequest, { params }: { params: { slug?: string[] } }) {
  const slugPath = (params.slug || []).join('/');
  const targetUrl = new URL(`/api/${slugPath}`, BACKEND_BASE);

  // Append query params
  const reqUrl = new URL(req.url);
  reqUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers = new Headers();
  const forwardHeaderList = ['content-type', 'accept', 'authorization', 'user-agent'];
  forwardHeaderList.forEach((h) => {
    const val = req.headers.get(h);
    if (val) headers.set(h, val);
  });

  let body: BodyInit | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.arrayBuffer();
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });

    const resHeaders = new Headers();
    const copyHeaderList = ['content-type', 'content-disposition', 'cache-control'];
    copyHeaderList.forEach((h) => {
      const val = response.headers.get(h);
      if (val) resHeaders.set(h, val);
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, {
        status: response.status,
        headers: resHeaders,
      });
    }

    const dataBuffer = await response.arrayBuffer();
    return new NextResponse(dataBuffer, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (error: any) {
    console.error(`[OpenMarketing Proxy Error] Failed to reach ${targetUrl.toString()}:`, error.message);
    return NextResponse.json(
      {
        error: 'Open Marketing backend service is unreachable.',
        details: error.message,
        target: targetUrl.toString(),
        suggestion: 'Verify that Open Marketing backend is running on port 3001 or execute npm run dev to launch both services.',
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
