import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { otp, sessionToken } = await req.json();
    const configDoc = await getDoc(doc(db, 'config', 'main'));
    const config = configDoc.data();

    if (!config) {
      return NextResponse.json({ error: 'System not configured' }, { status: 500 });
    }

    const response = await fetch(`${config.paymentBaseUrl}/complete-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.paymentApiKey || '1420',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ otp }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Payment Completion Error:', error);
    return NextResponse.json({ error: 'Payment completion failed' }, { status: 500 });
  }
}
