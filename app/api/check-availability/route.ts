import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { product_id } = await req.json();
    const configDoc = await getDoc(doc(db, 'config', 'main'));
    const config = configDoc.data();

    if (!config) {
      return NextResponse.json({ error: 'System not configured' }, { status: 500 });
    }

    const response = await fetch(`${config.orderBaseUrl}/check_availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.orderApiKey || 'YOUR_API_KEY_HERE',
      },
      body: JSON.stringify({ product_id }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Availability Check Error:', error);
    return NextResponse.json({ error: 'Availability check failed' }, { status: 500 });
  }
}
