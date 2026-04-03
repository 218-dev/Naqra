'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Layers, 
  Package, 
  TrendingUp, 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  ShoppingCart, 
  Loader2,
  LogOut,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';

type Tab = 'overview' | 'categories' | 'products' | 'sales' | 'config';

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
}

interface Sale {
  id: string;
  productName: string;
  sellingPrice: number;
  buyingPrice: number;
  profit: number;
  timestamp: any;
  code: string;
}

interface Config {
  paymentApiKey: string;
  orderApiKey: string;
  paymentBaseUrl: string;
  orderBaseUrl: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [config, setConfig] = useState<Config>({
    paymentApiKey: '',
    orderApiKey: '',
    paymentBaseUrl: 'http://102.203.200.128:3000/api',
    orderBaseUrl: 'http://localhost:8090'
  });
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  // Forms
  const [newCategory, setNewCategory] = useState({ name: '', imageUrl: '' });
  const [newProduct, setNewProduct] = useState({ name: '', sellingPrice: 0, buyingPrice: 0, productId: '', categoryId: '' });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Check if user is admin
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        const isDefaultAdmin = user.email === "ahmed5678ahmd@gmail.com";
        
        if (adminDoc.exists() || isDefaultAdmin) {
          setIsAdmin(true);
          setAuthLoading(false);
        } else {
          setIsAdmin(false);
          setAuthLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubAuth();
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });
    const unsubProds = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    const unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('timestamp', 'desc')), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    });
    const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data() as Config);
      } else {
        setDoc(doc.ref, {
          paymentApiKey: '1420',
          orderApiKey: 'YOUR_API_KEY_HERE',
          paymentBaseUrl: 'http://102.203.200.128:3000/api',
          orderBaseUrl: 'http://localhost:8090'
        });
      }
      setLoading(false);
    });

    return () => { unsubCats(); unsubProds(); unsubSales(); unsubConfig(); };
  }, [isAdmin]);

  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.imageUrl) return;
    await addDoc(collection(db, 'categories'), newCategory);
    setNewCategory({ name: '', imageUrl: '' });
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.categoryId) return;
    await addDoc(collection(db, 'products'), newProduct);
    setNewProduct({ name: '', sellingPrice: 0, buyingPrice: 0, productId: '', categoryId: '' });
  };

  const handleDelete = async (coll: string, id: string) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      await deleteDoc(doc(db, coll, id));
    }
  };

  const handleSaveConfig = async () => {
    await setDoc(doc(db, 'config', 'main'), config);
    alert('تم حفظ الإعدادات بنجاح');
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <div className="card max-w-md text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">وصول مرفوض</h2>
          <p className="text-gray-400 mb-6">ليس لديك صلاحيات المسؤول للوصول إلى هذه الصفحة.</p>
          <button onClick={handleLogout} className="btn-primary w-full">تسجيل الخروج</button>
        </div>
      </div>
    );
  }

  const totalSales = sales.reduce((acc, s) => acc + s.sellingPrice, 0);
  const totalProfit = sales.reduce((acc, s) => acc + s.profit, 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex" dir="rtl">
      <aside className="w-64 bg-surface border-l border-gray-800 p-6 flex flex-col gap-8">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <LayoutDashboard className="w-8 h-8" />
          نقرة
        </h2>
        <nav className="flex flex-col gap-2 flex-1">
          <NavItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<TrendingUp />} label="نظرة عامة" />
          <NavItem active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Layers />} label="الفئات" />
          <NavItem active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<Package />} label="المنتجات" />
          <NavItem active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} icon={<ShoppingCart />} label="المبيعات" />
          <NavItem active={activeTab === 'config'} onClick={() => setActiveTab('config')} icon={<Settings />} label="الإعدادات" />
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all">
          <LogOut className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<ShoppingCart className="text-blue-500" />} label="إجمالي المبيعات" value={`${totalSales.toFixed(2)} د.ل`} />
                <StatCard icon={<TrendingUp className="text-green-500" />} label="إجمالي الأرباح" value={`${totalProfit.toFixed(2)} د.ل`} />
                <StatCard icon={<Package className="text-purple-500" />} label="عدد الطلبات" value={sales.length.toString()} />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-6">آخر المبيعات</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
                        <th className="pb-4">المنتج</th>
                        <th className="pb-4">السعر</th>
                        <th className="pb-4">الربح</th>
                        <th className="pb-4">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.slice(0, 5).map(sale => (
                        <tr key={sale.id} className="border-b border-gray-800/50">
                          <td className="py-4">{sale.productName}</td>
                          <td className="py-4 font-mono">{sale.sellingPrice} د.ل</td>
                          <td className="py-4 font-mono text-green-500">+{sale.profit} د.ل</td>
                          <td className="py-4 text-sm text-gray-500">{sale.timestamp?.toDate().toLocaleString('ar-LY')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div key="categories" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="card">
                <h3 className="text-xl font-bold mb-6">إضافة فئة جديدة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="اسم الفئة" className="input-field" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} />
                  <input type="text" placeholder="رابط الصورة" className="input-field" value={newCategory.imageUrl} onChange={e => setNewCategory({...newCategory, imageUrl: e.target.value})} />
                </div>
                <button onClick={handleAddCategory} className="btn-primary mt-4 flex items-center gap-2"><Plus className="w-5 h-5" /> إضافة الفئة</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(cat => (
                  <div key={cat.id} className="card group relative">
                    <div className="relative h-32 mb-4 rounded-lg overflow-hidden">
                      <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <h4 className="text-center font-bold">{cat.name}</h4>
                    <button onClick={() => handleDelete('categories', cat.id)} className="absolute top-2 left-2 p-2 bg-red-500/20 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div key="products" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="card">
                <h3 className="text-xl font-bold mb-6">إضافة منتج جديد</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="اسم المنتج" className="input-field" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  <input type="number" placeholder="سعر البيع" className="input-field" value={newProduct.sellingPrice} onChange={e => setNewProduct({...newProduct, sellingPrice: parseFloat(e.target.value)})} />
                  <input type="number" placeholder="سعر الشراء" className="input-field" value={newProduct.buyingPrice} onChange={e => setNewProduct({...newProduct, buyingPrice: parseFloat(e.target.value)})} />
                  <input type="text" placeholder="Product ID" className="input-field" value={newProduct.productId} onChange={e => setNewProduct({...newProduct, productId: e.target.value})} />
                  <select className="input-field" value={newProduct.categoryId} onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})}>
                    <option value="">اختر الفئة</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <button onClick={handleAddProduct} className="btn-primary mt-4 flex items-center gap-2"><Plus className="w-5 h-5" /> إضافة المنتج</button>
              </div>

              <div className="card">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
                        <th className="pb-4">المنتج</th>
                        <th className="pb-4">الفئة</th>
                        <th className="pb-4">البيع</th>
                        <th className="pb-4">الشراء</th>
                        <th className="pb-4">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(prod => (
                        <tr key={prod.id} className="border-b border-gray-800/50">
                          <td className="py-4">{prod.name}</td>
                          <td className="py-4 text-sm text-gray-400">{categories.find(c => c.id === prod.categoryId)?.name}</td>
                          <td className="py-4 font-mono">{prod.sellingPrice} د.ل</td>
                          <td className="py-4 font-mono text-gray-500">{prod.buyingPrice} د.ل</td>
                          <td className="py-4">
                            <button onClick={() => handleDelete('products', prod.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'sales' && (
            <motion.div key="sales" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card">
              <h3 className="text-xl font-bold mb-6">سجل المبيعات الكامل</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="pb-4">المنتج</th>
                      <th className="pb-4">سعر البيع</th>
                      <th className="pb-4">الربح</th>
                      <th className="pb-4">الكود</th>
                      <th className="pb-4">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id} className="border-b border-gray-800/50">
                        <td className="py-4">{sale.productName}</td>
                        <td className="py-4 font-mono">{sale.sellingPrice} د.ل</td>
                        <td className="py-4 font-mono text-green-500">+{sale.profit} د.ل</td>
                        <td className="py-4 text-xs font-mono text-gray-400">{sale.code}</td>
                        <td className="py-4 text-sm text-gray-500">{sale.timestamp?.toDate().toLocaleString('ar-LY')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div key="config" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card max-w-2xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Settings className="w-6 h-6" /> إعدادات النظام</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Payment API Key</label>
                  <input type="password" value={config.paymentApiKey} onChange={e => setConfig({...config, paymentApiKey: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Payment Base URL</label>
                  <input type="text" value={config.paymentBaseUrl} onChange={e => setConfig({...config, paymentBaseUrl: e.target.value})} className="input-field" />
                </div>
                <div className="border-t border-gray-800 pt-6">
                  <label className="block text-sm text-gray-400 mb-2">Order API Key</label>
                  <input type="password" value={config.orderApiKey} onChange={e => setConfig({...config, orderApiKey: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Order Base URL</label>
                  <input type="text" value={config.orderBaseUrl} onChange={e => setConfig({...config, orderBaseUrl: e.target.value})} className="input-field" />
                </div>
                <button onClick={handleSaveConfig} className="btn-primary w-full flex items-center justify-center gap-2"><Save className="w-5 h-5" /> حفظ الإعدادات</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="card flex items-center gap-6">
      <div className="p-4 bg-white/5 rounded-2xl">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold font-mono">{value}</p>
      </div>
    </div>
  );
}
