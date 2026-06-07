import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import {
  ChevronLeft, Plus, Edit3, Trash2, Eye, TrendingUp, Star, BarChart2,
  MapPin, Loader2, CheckCircle, X, AlertCircle, Package, RefreshCw,
  Building2, Shield, ChevronDown, DollarSign
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useApp } from '@/context/app-context';
import { toast } from 'sonner';
import { GoldenBadge } from '@/components/golden-badge';

const CATEGORIES: Record<string, string> = {
  currency: 'العملات والصرافة', gold: 'الذهب والمجوهرات', fuel: 'المحروقات',
  construction: 'مواد البناء', agriculture: 'المحاصيل الزراعية', vegetables: 'الخضار والفواكه',
  food: 'المواد الغذائية', feed: 'الأعلاف والثروة الحيوانية', meat: 'اللحوم',
  metals: 'المعادن', transport: 'النقل والشحن', electronics: 'الأجهزة والإلكترونيات',
  local_market: 'الأسواق المحلية', crypto: 'الكريبتو والعملات الرقمية',
};

const CURRENCIES = ['دولار أمريكي (USD)', 'يورو (EUR)', 'ليرة تركية (TRY)', 'ريال سعودي (SAR)', 'درهم إماراتي (AED)', 'جنيه إسترليني (GBP)', 'دولار كندي (CAD)', 'فرنك سويسري (CHF)', 'ين ياباني (JPY)', 'دينار أردني (JOD)', 'ليرة سورية (SYP)'];
const FUEL_TYPES = ['بنزين أوكتان 95', 'بنزين أوكتان 90', 'ديزل', 'مازوت منزلي', 'غاز منزلي (LPG)'];
const GOLD_KARATS = ['14 قيراط', '16 قيراط', '18 قيراط', '21 قيراط', '22 قيراط', '24 قيراط'];
const CRYPTO_COINS = ['Bitcoin (BTC)', 'Ethereum (ETH)', 'Tether (USDT)', 'BNB', 'Ripple (XRP)', 'Solana (SOL)'];
const WEIGHT_UNITS = ['كغ', 'غرام', 'طن', 'قنطار', 'صندوق', 'كيس', 'قطعة', 'دزينة', 'رأس'];
const BUILD_UNITS = ['طن', 'م3', 'م2', 'متر', 'قطعة', 'حبة', 'كغ'];

interface VendorProfile {
  id: number;
  businessName: string;
  category: string;
  governorate: string;
  city: string;
  trustScore: number;
  isActive: boolean;
}

interface VendorPrice {
  id: number;
  productNameAr: string;
  price: number;
  priceBuy: number | null;
  priceSell: number | null;
  unit: string;
  currency: string;
  governorate: string | null;
  notes: string | null;
  quantity: string | null;
  isActive: boolean;
  updatedAt: string;
  views: number;
}

interface VendorStats {
  trustScore: number;
  totalPrices: number;
  activePrices: number;
  totalViews: number;
  businessName: string;
  category: string;
  governorate: string;
}

function TrustMeter({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">نسبة الموثوقية</span>
        <span className="font-black" style={{ color }}>{score}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

function SimpleSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none flex items-center justify-between gap-2 text-right">
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{value || placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-[200] top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            {options.map(opt => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-right px-3 py-2 text-sm transition-colors hover:bg-secondary ${value === opt ? 'bg-primary/10 font-bold text-primary' : ''}`}>
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetalCategorySelect({ value, onChange }: { value: 'gold' | 'silver'; onChange: (v: 'gold' | 'silver') => void }) {
  const [open, setOpen] = useState(false);
  const options: { val: 'gold' | 'silver'; label: string; emoji: string }[] = [
    { val: 'gold', label: 'الذهب', emoji: '🥇' },
    { val: 'silver', label: 'الفضة', emoji: '🥈' },
  ];
  const current = options.find(o => o.val === value)!;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full border-2 border-primary/30 rounded-xl px-3 py-2.5 text-sm bg-primary/5 focus:outline-none flex items-center justify-between gap-2 text-right font-bold">
        <span className="flex items-center gap-2"><span>{current.emoji}</span><span>{current.label}</span></span>
        <ChevronDown className={`w-4 h-4 text-primary flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute z-[200] top-full mt-1 w-full bg-card border-2 border-primary/20 rounded-xl shadow-xl overflow-hidden">
            {options.map(opt => (
              <button key={opt.val} type="button" onClick={() => { onChange(opt.val); setOpen(false); }}
                className={`w-full text-right px-3 py-3 text-sm transition-colors hover:bg-primary/10 flex items-center gap-2 font-bold ${value === opt.val ? 'bg-primary/10 text-primary' : ''}`}>
                <span>{opt.emoji}</span><span>{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PriceFormModal({
  onClose, onSave, editData, category,
}: {
  onClose: () => void;
  onSave: (data: Record<string, string>) => Promise<void>;
  editData?: VendorPrice | null;
  category: string;
}) {
  const isCurrency = category === 'currency';
  const isGold = category === 'gold';
  const isFuel = category === 'fuel';
  const isCrypto = category === 'crypto';
  const isConstruction = category === 'construction' || category === 'metals';
  const isGenericGoods = ['agriculture', 'vegetables', 'food', 'feed', 'meat', 'local_market'].includes(category);
  const isTransport = category === 'transport';
  const isElectronics = category === 'electronics';

  const [fromCurrency, setFromCurrency] = useState(editData?.productNameAr?.split(' / ')?.[0] ?? '');
  const [toCurrency, setToCurrency] = useState(editData?.productNameAr?.split(' / ')?.[1] ?? 'ليرة سورية (SYP)');
  const [goldKarat, setGoldKarat] = useState(editData?.productNameAr?.replace('ذهب عيار ', '').replace('فضة عيار ', '') ?? '');
  const [silverKarat, setSilverKarat] = useState('');
  const [metalCategory, setMetalCategory] = useState<'gold' | 'silver'>(() => {
    if (editData?.productNameAr?.startsWith('فضة')) return 'silver';
    return 'gold';
  });
  const [fuelType, setFuelType] = useState(isFuel ? (editData?.productNameAr ?? '') : '');
  const [cryptoCoin, setCryptoCoin] = useState(isCrypto ? (editData?.productNameAr ?? '') : '');

  const [form, setForm] = useState({
    productNameAr: editData?.productNameAr ?? '',
    price: editData?.price.toString() ?? '',
    priceBuy: editData?.priceBuy?.toString() ?? '',
    priceSell: editData?.priceSell?.toString() ?? '',
    unit: editData?.unit ?? '',
    notes: editData?.notes ?? '',
    quantity: editData?.quantity ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalName = form.productNameAr;
    let finalUnit = form.unit;

    if (isCurrency) {
      if (!fromCurrency) { toast.error('اختر العملة المصدر'); return; }
      finalName = `${fromCurrency} / ${toCurrency}`;
      finalUnit = toCurrency.includes('(') ? toCurrency.split('(')[0].trim() : toCurrency;
    } else if (isGold) {
      if (metalCategory === 'silver') {
        const karat = silverKarat.trim();
        if (!karat) { toast.error('أدخل عيار الفضة'); return; }
        finalName = `فضة عيار ${karat}`;
      } else {
        if (!goldKarat) { toast.error('اختر العيار'); return; }
        finalName = `ذهب عيار ${goldKarat}`;
      }
      finalUnit = 'غرام';
      if (!form.priceBuy) { toast.error('سعر الغرام بالدولار مطلوب'); return; }
    } else if (isFuel) {
      if (!fuelType) { toast.error('اختر نوع الوقود'); return; }
      finalName = fuelType;
      if (!finalUnit) finalUnit = fuelType.includes('غاز') ? 'أسطوانة' : 'لتر';
    } else if (isCrypto) {
      if (!cryptoCoin) { toast.error('اختر العملة الرقمية'); return; }
      finalName = cryptoCoin;
      finalUnit = finalUnit || 'دولار';
    }

    if (!finalName || !form.price) { toast.error('يرجى تعبئة الحقول المطلوبة'); return; }
    setSaving(true);
    await onSave({ ...form, productNameAr: finalName, unit: finalUnit });
    setSaving(false);
  };

  const inp = (label: string, key: keyof typeof form, placeholder: string, type = 'text', required = false) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold text-foreground/70">{label}{required && ' *'}</label>
      <input type={type} value={form[key]} onChange={set(key)} placeholder={placeholder}
        className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div className="w-full max-w-md bg-card rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 22, stiffness: 380, mass: 0.8 }}>
        <div className="sticky top-0 bg-card px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <h3 className="font-black text-sm">{editData ? 'تعديل السعر' : 'إضافة سعر جديد'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col overflow-y-auto">
          <div className="p-4 flex flex-col gap-3" dir="rtl">

            {/* CURRENCY EXCHANGE */}
            {isCurrency && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground/70">من عملة *</label>
                  <SimpleSelect value={fromCurrency} onChange={setFromCurrency} options={CURRENCIES} placeholder="اختر العملة المصدر" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground/70">إلى عملة</label>
                  <SimpleSelect value={toCurrency} onChange={setToCurrency} options={CURRENCIES} placeholder="اختر العملة الهدف" />
                </div>
                {inp('السعر الرئيسي *', 'price', '0', 'number', true)}
                {inp('سعر الشراء', 'priceBuy', '0', 'number')}
                {inp('سعر البيع', 'priceSell', '0', 'number')}
                {inp('ملاحظات', 'notes', 'معلومات إضافية...')}
              </>
            )}

            {/* GOLD / SILVER */}
            {isGold && (
              <>
                {/* Category selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground/70">اختيار الفئة *</label>
                  <MetalCategorySelect value={metalCategory} onChange={setMetalCategory} />
                </div>

                {metalCategory === 'gold' ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-foreground/70">العيار *</label>
                      <SimpleSelect value={goldKarat} onChange={setGoldKarat} options={GOLD_KARATS} placeholder="اختر العيار" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-foreground/70">العيار *</label>
                      <input
                        type="text"
                        value={silverKarat}
                        onChange={e => setSilverKarat(e.target.value)}
                        placeholder="مثال: 925"
                        className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </>
                )}

                {/* SYP price */}
                {inp('سعر الغرام ليرة سورية *', 'price', '0', 'number', true)}
                {/* USD price — required */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground/70">سعر الغرام بدولار *</label>
                  <input
                    type="number"
                    value={form.priceBuy}
                    onChange={set('priceBuy')}
                    placeholder="0.00"
                    step="0.001"
                    className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {inp('ملاحظات', 'notes', 'معلومات إضافية...')}
              </>
            )}

            {/* FUEL */}
            {isFuel && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground/70">نوع الوقود *</label>
                  <SimpleSelect value={fuelType} onChange={setFuelType} options={FUEL_TYPES} placeholder="اختر نوع الوقود" />
                </div>
                {inp('السعر *', 'price', '0', 'number', true)}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground/70">الوحدة</label>
                  <SimpleSelect value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))} options={['لتر', 'أسطوانة', 'طن']} placeholder="لتر" />
                </div>
                {inp('ملاحظات', 'notes', 'معلومات إضافية...')}
              </>
            )}

            {/* CRYPTO */}
            {isCrypto && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground/70">العملة الرقمية *</label>
                  <SimpleSelect value={cryptoCoin} onChange={setCryptoCoin} options={CRYPTO_COINS} placeholder="اختر العملة" />
                </div>
                {inp('السعر (دولار) *', 'price', '0', 'number', true)}
                {inp('سعر الشراء', 'priceBuy', '0', 'number')}
                {inp('سعر البيع', 'priceSell', '0', 'number')}
                {inp('ملاحظات', 'notes', 'معلومات إضافية...')}
              </>
            )}

            {/* CONSTRUCTION / METALS */}
            {isConstruction && (
              <>
                {inp('نوع المادة *', 'productNameAr', 'مثال: حديد تسليح 12', 'text', true)}
                {inp('السعر *', 'price', '0', 'number', true)}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground/70">الوحدة</label>
                  <SimpleSelect value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))} options={BUILD_UNITS} placeholder="اختر الوحدة" />
                </div>
                {inp('الكمية المتاحة', 'quantity', 'مثال: 10 طن')}
                {inp('ملاحظات', 'notes', 'معلومات إضافية...')}
              </>
            )}

            {/* GENERIC GOODS */}
            {isGenericGoods && (
              <>
                {inp('اسم المنتج *', 'productNameAr', 'مثال: طماطم، برتقال...', 'text', true)}
                {inp('السعر *', 'price', '0', 'number', true)}
                {inp('سعر الجملة (اختياري)', 'priceBuy', '0', 'number')}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-foreground/70">الوحدة</label>
                  <SimpleSelect value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))} options={WEIGHT_UNITS} placeholder="اختر الوحدة" />
                </div>
                {inp('الكمية المتاحة', 'quantity', 'مثال: 500 كغ')}
                {inp('ملاحظات', 'notes', 'معلومات إضافية...')}
              </>
            )}

            {/* TRANSPORT */}
            {isTransport && (
              <>
                {inp('الوجهة / الخدمة *', 'productNameAr', 'مثال: دمشق ← حلب', 'text', true)}
                {inp('السعر *', 'price', '0', 'number', true)}
                {inp('الوحدة', 'unit', 'مثال: رحلة، طن/كم')}
                {inp('ملاحظات', 'notes', 'معلومات إضافية...')}
              </>
            )}

            {/* ELECTRONICS */}
            {isElectronics && (
              <>
                {inp('اسم المنتج *', 'productNameAr', 'مثال: شاشة Samsung 55"', 'text', true)}
                {inp('السعر *', 'price', '0', 'number', true)}
                {inp('ملاحظات', 'notes', 'الحالة، الضمان، الإمكانيات...')}
              </>
            )}

            {/* FALLBACK */}
            {!isCurrency && !isGold && !isFuel && !isCrypto && !isConstruction && !isGenericGoods && !isTransport && !isElectronics && (
              <>
                {inp('اسم المنتج / الخدمة *', 'productNameAr', 'مثال: منتج أو خدمة', 'text', true)}
                {inp('السعر الرئيسي *', 'price', '0', 'number', true)}
                {inp('سعر الشراء (اختياري)', 'priceBuy', '0', 'number')}
                {inp('سعر البيع (اختياري)', 'priceSell', '0', 'number')}
                {inp('الوحدة', 'unit', 'مثال: قطعة، كغ')}
                {inp('الكمية المتاحة', 'quantity', 'مثال: 100 قطعة')}
                {inp('ملاحظات', 'notes', 'معلومات إضافية...')}
              </>
            )}

            <Button type="submit" disabled={saving}
              className="w-full h-12 font-black gap-2 rounded-2xl mt-2 mb-2 bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</> : <><CheckCircle className="w-4 h-4" /> حفظ السعر</>}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function VendorDashboard() {
  const { getToken, user } = useAuth();
  const userId = user?.id;
  const { formatNum } = useApp();
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editPrice, setEditPrice] = useState<VendorPrice | null>(null);
  const [activeTab, setActiveTab] = useState<'prices' | 'stats'>('prices');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const authFetch = useCallback(async (url: string, opts?: RequestInit) => {
    const token = await getToken();
    return fetch(url, { ...opts, headers: { ...(opts?.headers as Record<string, string>), Authorization: `Bearer ${token}` } });
  }, [getToken]);

  const { data: dashData, isLoading: loading, refetch: loadAll } = useQuery({
    queryKey: ['vendor-dashboard', userId],
    queryFn: async () => {
      const [profileRes, statsRes, pricesRes] = await Promise.all([
        authFetch('/api/vendor/profile'),
        authFetch('/api/vendor/stats'),
        authFetch('/api/vendor/prices'),
      ]);
      if (profileRes.status === 403) return { notVendor: true as const, profile: null as VendorProfile | null, stats: null as VendorStats | null, prices: [] as VendorPrice[] };
      const profile = profileRes.ok ? await profileRes.json() as VendorProfile : null;
      if (profile) { try { localStorage.setItem('syp-is-vendor', '1'); } catch { /**/ } }
      const stats  = statsRes.ok  ? await statsRes.json() as VendorStats  : null;
      const prices = pricesRes.ok ? await pricesRes.json() as VendorPrice[] : [];
      return { notVendor: false as const, profile, stats, prices };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const profile  = dashData?.profile  ?? null;
  const stats    = dashData?.stats    ?? null;
  const prices   = dashData?.prices   ?? [];
  const notVendor = dashData?.notVendor ?? false;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAll();
    setIsRefreshing(false);
  };

  const handleSavePrice = async (data: Record<string, string>) => {
    try {
      const body = {
        productNameAr: data.productNameAr,
        productName: data.productNameAr,
        price: Number(data.price),
        priceBuy: data.priceBuy ? Number(data.priceBuy) : null,
        priceSell: data.priceSell ? Number(data.priceSell) : null,
        unit: data.unit || 'وحدة',
        notes: data.notes || null,
        quantity: data.quantity || null,
      };
      const res = await authFetch(
        editPrice ? `/api/vendor/prices/${editPrice.id}` : '/api/vendor/prices',
        { method: editPrice ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      if (res.ok) {
        toast.success(editPrice ? 'تم تحديث السعر' : 'تمت إضافة السعر');
        setShowForm(false);
        setEditPrice(null);
        await loadAll();
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? 'فشل الحفظ');
      }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السعر؟')) return;
    const res = await authFetch(`/api/vendor/prices/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('تم الحذف'); void loadAll(); }
    else toast.error('فشل الحذف');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">جاري التحميل...</p>
    </div>
  );

  if (notVendor) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center" dir="rtl">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-50 dark:bg-amber-900/20">
        <Shield className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="font-black text-lg">غير مصرح لك بالوصول</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        هذه الصفحة مخصصة للتجار ومدخلي الأسعار المعتمدين فقط.<br />
        يمكنك التقدم للانضمام من خلال صفحة طلب العضوية.
      </p>
      <Link href="/app/membership">
        <Button className="font-bold gap-2 rounded-2xl" style={{ background: 'linear-gradient(135deg, #D20073, #a8005a)' }}>
          <Star className="w-4 h-4" /> اطلب العضوية
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="flex flex-col pb-28 min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/app/home">
            <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm">{profile?.businessName ?? 'لوحة التاجر'}</span>
          </div>
        </div>
        <button
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
          className="p-2 hover:bg-secondary rounded-xl transition-colors disabled:opacity-60"
          title="تحديث البيانات"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'إجمالي الأسعار', value: stats?.totalPrices ?? 0, icon: DollarSign, color: '#003C32' },
            { label: 'إجمالي المشاهدات', value: stats?.totalViews ?? 0, icon: Eye, color: '#0284c7' },
          ].map(s => (
            <Card key={s.label} className="border-none shadow-sm">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color + '18' }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xl font-black" style={{ color: s.color }}>{formatNum(s.value, { decimals: 0 })}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Business profile card */}
        <Card className="border-none shadow-sm cursor-pointer active:scale-[0.99] transition-transform" onClick={() => navigate('/app/vendor/profile')}>
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
                <Building2 className="w-4 h-4" />
                الملف الشخصي للنشاط / الشركة
              </h3>
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{profile?.businessName}</span>
                {userId && localStorage.getItem(`syp-verify-status-${userId}`) === 'approved' && (
                  <GoldenBadge size={18} />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{CATEGORIES[profile?.category ?? ''] ?? profile?.category}</span>
            </div>
            <TrustMeter score={stats?.trustScore ?? 50} />
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{profile?.governorate} — {profile?.city}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 bg-secondary/60 rounded-2xl p-1">
          {[
            { id: 'prices', label: 'أسعاري', icon: DollarSign },
            { id: 'stats', label: 'الإحصائيات', icon: BarChart2 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as 'prices' | 'stats')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'prices' && (
          <>
            <Button onClick={() => { setEditPrice(null); setShowForm(true); }}
              className="w-full h-12 font-black gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-5 h-5" /> إضافة سعر جديد
            </Button>

            {prices.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Package className="w-12 h-12 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">لا توجد أسعار مُضافة بعد</p>
                <p className="text-xs text-muted-foreground/60">اضغط على "إضافة سعر جديد" للبدء</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {prices.map(p => (
                  <motion.div key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-none shadow-sm overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-3 flex flex-col gap-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{p.productNameAr}</span>
                              {!p.isActive && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">غير نشط</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setEditPrice(p); setShowForm(true); }}
                                className="flex items-center gap-1 px-2 py-1 hover:bg-primary/10 rounded-lg transition-colors">
                                <Edit3 className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[10px] font-bold text-primary">تعديل</span>
                              </button>
                              <button onClick={() => handleDelete(p.id)}
                                className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-end gap-2 flex-wrap">
                            <div>
                              <span className="text-2xl font-black text-primary">{formatNum(p.price, { decimals: 0 })}</span>
                              <span className="text-xs text-muted-foreground mr-1">{p.currency} / {p.unit}</span>
                            </div>
                            {p.priceBuy && (p.productNameAr.includes('ذهب') || p.productNameAr.includes('فضة')) && (
                              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                ${formatNum(p.priceBuy, { decimals: 3 })} / غ
                              </span>
                            )}
                          </div>
                          {(p.priceBuy || p.priceSell) && !(p.productNameAr.includes('ذهب') || p.productNameAr.includes('فضة')) && (
                            <div className="flex gap-2">
                              {p.priceBuy && <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-lg">شراء: {formatNum(p.priceBuy, { decimals: 0 })}</span>}
                              {p.priceSell && <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-lg">بيع: {formatNum(p.priceSell, { decimals: 0 })}</span>}
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.views}</span>
                            {p.quantity && <span>الكمية: {p.quantity}</span>}
                            {p.notes && <span className="truncate max-w-[120px]">{p.notes}</span>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'stats' && (
          <div className="flex flex-col gap-3">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex flex-col gap-4">
                <h3 className="font-black text-sm">إحصائياتك</h3>
                {[
                  { label: 'الأسعار النشطة', value: stats?.activePrices ?? 0, color: '#22c55e' },
                  { label: 'إجمالي الأسعار', value: stats?.totalPrices ?? 0, color: '#003C32' },
                  { label: 'إجمالي المشاهدات', value: stats?.totalViews ?? 0, color: '#0284c7' },
                  { label: 'نسبة الموثوقية', value: `${stats?.trustScore ?? 50}%`, color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                    <span className="font-black text-lg" style={{ color: s.color }}>{typeof s.value === 'number' ? formatNum(s.value, { decimals: 0 }) : s.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-black text-sm mb-3">كيف تزيد موثوقيتك؟</h3>
                {[
                  { tip: 'حدّث أسعارك يومياً لتبقى دقيقة وموثوقة', done: stats && stats.totalPrices > 0 },
                  { tip: 'أضف سعر الشراء والبيع لمزيد من الدقة', done: prices.some(p => p.priceBuy || p.priceSell) },
                  { tip: 'أضف ملاحظات توضيحية للمنتجات', done: prices.some(p => p.notes) },
                  { tip: 'أضف 5 منتجات أو أكثر', done: stats && stats.totalPrices >= 5 },
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 py-2 border-b border-border/40 last:border-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${tip.done ? 'bg-green-100 text-green-600' : 'bg-secondary text-muted-foreground'}`}>
                      {tip.done ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    </div>
                    <p className={`text-xs leading-relaxed ${tip.done ? 'line-through text-muted-foreground' : ''}`}>{tip.tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Price Form Modal */}
      <AnimatePresence>
        {showForm && (
          <PriceFormModal
            onClose={() => { setShowForm(false); setEditPrice(null); }}
            onSave={handleSavePrice}
            editData={editPrice}
            category={profile?.category ?? ''}
          />
        )}
      </AnimatePresence>

      {/* Hidden to keep imports */}
      <span className="hidden"><TrendingUp className="w-0 h-0" /></span>
    </div>
  );
}
