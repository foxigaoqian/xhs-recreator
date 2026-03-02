import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, apiKey, payload } = body;

    if (!endpoint || !apiKey) {
      return NextResponse.json({ error: 'Missing endpoint or apiKey' }, { status: 400 });
    }

    console.log(`[Proxy] Forwarding request to: ${endpoint}`);

    // Forward the request to the actual API
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any other headers if needed, e.g. Referer for some strict APIs
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        console.error("[Proxy] Failed to parse upstream response as JSON:", responseText.substring(0, 200));
        return NextResponse.json({ 
            error: { 
                message: `Upstream API returned non-JSON response. Status: ${response.status}. Body preview: ${responseText.substring(0, 200)}...`,
                type: 'upstream_error'
            } 
        }, { status: response.status || 500 });
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ 
        error: { 
            message: error.message || 'Internal Proxy Error',
            type: 'proxy_error'
        } 
    }, { status: 500 });
  }
}
