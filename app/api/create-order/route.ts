import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { product_id, productName, sellingPrice, buyingPrice } = await req.json();
    const configDoc = await getDoc(doc(db, 'config', 'main'));
    const config = configDoc.data();

    if (!config) {
      return NextResponse.json({ error: 'System not configured' }, { status: 500 });
    }

    const response = await fetch(`${config.orderBaseUrl}/create_order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.orderApiKey || 'YOUR_API_KEY_HERE',
      },
      body: JSON.stringify({ product_id }),
    });

    const data = await response.json();

    if (data.success) {
      await addDoc(collection(db, 'sales'), {
        productName,
        sellingPrice,
        buyingPrice,
        profit: sellingPrice - buyingPrice,
        timestamp: serverTimestamp(),
        code: data.code,
        productId: product_id
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Order Error:', error);
    return NextResponse.json({ error: 'Order creation failed' }, { status: 500 });
  }
}
