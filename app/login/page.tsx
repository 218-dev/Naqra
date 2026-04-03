'use client';

import { useState } from 'react';
import { auth } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { LogIn, ShoppingCart, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      // Add custom parameters if needed
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
      router.push('/admin');
    } catch (e: any) {
      console.error('Login Error:', e);
      if (e.code === 'auth/unauthorized-domain') {
        setError('هذا النطاق غير مصرح به في إعدادات Firebase Auth. يرجى إضافة النطاق الحالي إلى قائمة النطاقات المصرح بها.');
      } else if (e.code === 'auth/popup-blocked') {
        setError('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
      } else {
        setError(`فشل تسجيل الدخول: ${e.message || 'يرجى المحاولة مرة أخرى.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-md p-8 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-primary">نقرة</h1>
        <p className="text-gray-400 mb-8">لوحة تحكم الإدارة</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-6 flex flex-col items-center gap-2 justify-center">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
            {error.includes('النطاق') && (
              <p className="text-xs mt-2 opacity-80">
                النطاق الحالي: <code className="bg-black/50 px-1 rounded">{window.location.hostname}</code>
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-lg"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <LogIn className="w-6 h-6" />
                تسجيل الدخول باستخدام Google
              </>
            )}
          </button>

          <button 
            onClick={openInNewTab}
            className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
          >
            فتح في نافذة جديدة
          </button>
        </div>
        
        <p className="mt-6 text-xs text-gray-500">
          هذه المنطقة مخصصة للمسؤولين فقط. إذا واجهت مشكلة في تسجيل الدخول داخل الإطار، جرب "فتح في نافذة جديدة".
        </p>
      </motion.div>
    </div>
  );
}
