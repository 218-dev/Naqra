'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, CreditCard, CheckCircle, Copy, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface Category {
  id: string;
  name: string;
  imageUrl: string;
}

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  buyingPrice: number;
  productId: string;
  categoryId: string;
  isAvailable?: boolean;
}

export default function Storefront() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'code' | 'otp' | 'success' | 'fail'>('select');
  const [purchaseCode, setPurchaseCode] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const q = query(collection(db, 'products'), where('categoryId', '==', selectedCategory.id));
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        
        const checkedProds = await Promise.all(prods.map(async (p) => {
          try {
            const res = await fetch('/api/check-availability', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product_id: p.productId })
            });
            const data = await res.json();
            return { ...p, isAvailable: data.available };
          } catch (e) {
            return { ...p, isAvailable: false };
          }
        }));
        
        setProducts(checkedProds);
      });
      return () => unsubscribe();
    }
  }, [selectedCategory]);

  const handleOpenSession = async () => {
    if (purchaseCode.length !== 9) {
      setError('رمز الشراء يجب أن يتكون من 9 أرقام');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      const res = await fetch('/api/open-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedProduct?.sellingPrice, identityCard: purchaseCode })
      });
      const data = await res.json();
      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
        setPurchaseStep('otp');
      } else {
        setError(data.messages?.[0] || 'فشل فتح الجلسة');
      }
    } catch (e) {
      setError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteSession = async () => {
    setProcessing(true);
    setError('');
    try {
      const res = await fetch('/api/complete-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, sessionToken })
      });
      const data = await res.json();
      
      if (data.type === 1) {
        const orderRes = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            product_id: selectedProduct?.productId,
            productName: selectedProduct?.name,
            sellingPrice: selectedProduct?.sellingPrice,
            buyingPrice: selectedProduct?.buyingPrice
          })
        });
        const orderData = await orderRes.json();
        if (orderData.success) {
          setCardCode(orderData.code);
          setPurchaseStep('success');
        } else {
          setError(orderData.message || 'فشل إنشاء الطلب');
          setPurchaseStep('fail');
        }
      } else {
        setError(data.messages?.[0] || 'فشل التحقق من الرمز');
      }
    } catch (e) {
      setError('حدث خطأ أثناء إكمال العملية');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto mb-12 flex justify-between items-center">
        <h1 className="text-4xl font-bold text-primary flex items-center gap-2">
          <ShoppingCart className="w-10 h-10" />
          نقرة
        </h1>
        {selectedCategory && (
          <button 
            onClick={() => { setSelectedCategory(null); setSelectedProduct(null); setPurchaseStep('select'); }}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للفئات
          </button>
        )}
      </header>

      <main className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {!selectedCategory ? (
            <motion.div 
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {categories.map((cat) => (
                <div 
                  key={cat.id} 
                  className="card cursor-pointer group overflow-hidden"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                    <Image 
                      src={cat.imageUrl} 
                      alt={cat.name} 
                      fill 
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-center">{cat.name}</h3>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="products"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex flex-col items-center mb-8">
                <div className="relative w-32 h-32 mb-4 rounded-full overflow-hidden border-4 border-primary">
                  <Image 
                    src={selectedCategory.imageUrl} 
                    alt={selectedCategory.name} 
                    fill 
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h2 className="text-2xl font-bold">{selectedCategory.name}</h2>
                <p className="text-gray-400 mt-2">اختر الباقة المناسبة لك</p>
              </div>

              <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
                {products.map((prod) => (
                  <div 
                    key={prod.id} 
                    className={`card flex justify-between items-center ${!prod.isAvailable ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => prod.isAvailable && setSelectedProduct(prod)}
                  >
                    <div>
                      <h4 className="text-lg font-bold">{prod.name}</h4>
                      <p className="text-primary font-mono">{prod.sellingPrice} د.ل</p>
                    </div>
                    {!prod.isAvailable ? (
                      <span className="text-red-500 font-bold">غير متوفر</span>
                    ) : (
                      <button className="btn-primary py-2 px-4">شراء</button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface w-full max-w-md p-8 rounded-2xl border border-gray-800 relative"
            >
              <button 
                onClick={() => { setSelectedProduct(null); setPurchaseStep('select'); setError(''); }}
                className="absolute top-4 left-4 text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{selectedProduct.name}</h3>
                <p className="text-primary text-xl font-mono">{selectedProduct.sellingPrice} د.ل</p>
              </div>

              {purchaseStep === 'select' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">رمز الشراء (9 أرقام)</label>
                    <input 
                      type="text" 
                      maxLength={9}
                      value={purchaseCode}
                      onChange={(e) => setPurchaseCode(e.target.value.replace(/\D/g, ''))}
                      className="input-field text-center text-2xl tracking-widest"
                      placeholder="332280166"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm flex items-center gap-1 justify-center"><AlertCircle className="w-4 h-4" /> {error}</p>}
                  <button 
                    onClick={handleOpenSession}
                    disabled={processing || purchaseCode.length !== 9}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                    متابعة الدفع
                  </button>
                </div>
              )}

              {purchaseStep === 'otp' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">أدخل رمز التحقق (OTP)</label>
                    <input 
                      type="text" 
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="input-field text-center text-2xl tracking-widest"
                      placeholder="123456"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm flex items-center gap-1 justify-center"><AlertCircle className="w-4 h-4" /> {error}</p>}
                  <button 
                    onClick={handleCompleteSession}
                    disabled={processing || !otp}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    تأكيد الشراء
                  </button>
                </div>
              )}

              {purchaseStep === 'success' && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-12 h-12 text-primary" />
                  </div>
                  <h4 className="text-2xl font-bold">تم الشراء بنجاح!</h4>
                  <div className="bg-black/40 p-6 rounded-xl border border-primary/30 relative group">
                    <p className="text-xs text-gray-500 mb-2">كود البطاقة الخاص بك:</p>
                    <p className="text-2xl font-mono text-primary break-all">{cardCode}</p>
                    <button 
                      onClick={() => copyToClipboard(cardCode)}
                      className="mt-4 flex items-center gap-2 mx-auto text-sm text-gray-400 hover:text-primary transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      نسخ الكود
                    </button>
                  </div>
                  <button 
                    onClick={() => { setSelectedProduct(null); setPurchaseStep('select'); setPurchaseCode(''); setOtp(''); }}
                    className="btn-secondary w-full"
                  >
                    إغلاق
                  </button>
                </div>
              )}

              {purchaseStep === 'fail' && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                  </div>
                  <h4 className="text-2xl font-bold text-red-500">فشلت العملية</h4>
                  <p className="text-gray-400">{error || 'حدث خطأ غير متوقع أثناء تنفيذ الطلب'}</p>
                  <button 
                    onClick={() => setPurchaseStep('select')}
                    className="btn-primary w-full"
                  >
                    حاول مرة أخرى
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
