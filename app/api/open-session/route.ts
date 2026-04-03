import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { amount, identityCard } = await req.json();
    const configDoc = await getDoc(doc(db, 'config', 'main'));
    const config = configDoc.data();

    if (!config) {
      return NextResponse.json({ error: 'System not configured' }, { status: 500 });
    }

    const response = await fetch(`${config.paymentBaseUrl}/open-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.paymentApiKey || '1420',
      },
      body: JSON.stringify({ amount, identityCard }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Payment Error:', error);
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
  }
}
