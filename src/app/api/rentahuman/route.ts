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

    // Fetch active agent rentals if an API key is provided
    if (apiKey && data.success && data.human) {
      try {
        console.log(`[RentAHuman Proxy] Fetching agent rentals for active status check...`);
        const rentalsResponse = await fetch('https://rentahuman.ai/api/escrow/agent-rentals', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
        });
        if (rentalsResponse.ok) {
          const rentalsData = await rentalsResponse.json();
          if (rentalsData && rentalsData.success) {
            data.human.rentalsSummary = rentalsData.summary || null;
            data.human.activeRentalsCount = rentalsData.summary?.active || 0;
            data.human.rentals = rentalsData.rentals || [];
          }
        }
      } catch (err) {
        console.error('[RentAHuman Proxy] Error fetching agent rentals:', err);
      }
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[RentAHuman Proxy] Exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
