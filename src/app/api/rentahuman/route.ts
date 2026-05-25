import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const humanId = searchParams.get('humanId');
    const apiKey = searchParams.get('apiKey');

    if (!humanId) {
      return NextResponse.json({ error: 'humanId is required' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    console.log(`[RentAHuman Proxy] Fetching profile for human ID: ${humanId}`);
    
    const response = await fetch(`https://rentahuman.ai/api/humans/${humanId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('[RentAHuman Proxy] API Error:', JSON.stringify(errData));
      return NextResponse.json({ 
        error: errData.error || 'RentAHuman API Error',
        raw: errData 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[RentAHuman Proxy] Exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
