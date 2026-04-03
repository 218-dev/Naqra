import type {Metadata} from 'next';
import { Noto_Sans_Arabic } from 'next/font/google';
import './globals.css';

const notoAuthArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
});

export const metadata: Metadata = {
  title: 'نقرة - متجر بطاقات رقمية',
  description: 'متجر لبيع البطاقات الرقمية مع لوحة تحكم متكاملة ونظام دفع آمن',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl" className={notoAuthArabic.variable}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
