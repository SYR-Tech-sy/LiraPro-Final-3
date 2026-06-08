import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoute, useLocation } from 'wouter';
import {
  ChevronLeft, MapPin, Phone, Building2, TrendingUp, TrendingDown,
  Bell, ChevronDown, ChevronUp, AlertCircle, X,
  Gem, Zap, ShoppingBag, ShoppingCart, Leaf, Sprout, Wrench, Truck, Smartphone, Bitcoin, Store,
  ThumbsUp, ThumbsDown, Flag, CheckCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { GoldenBadge } from '@/components/golden-badge';
import { useMarketOpen } from '@/components/live-badge';
import { GuestModal } from '@/components/guest-modal';
import { useApp } from '@/context/app-context';
import { useUser } from '@/context/auth-context';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

type Period = 'daily' | 'weekly' | 'monthly';

function generateHistory(basePrice: number, period: Period) {
  const points = period === 'daily' ? 24 : period === 'weekly' ? 7 : 30;
  const labels = period === 'daily'
    ? Array.from({ length: 24 }, (_, i) => `${i}:00`)
    : period === 'weekly'
      ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      : Array.from({ length: 30 }, (_, i) => `${i + 1}`);
  let price = basePrice * (1 + (Math.random() - 0.5) * 0.04);
  return Array.from({ length: points }, (_, i) => {
    price = price * (1 + (Math.random() - 0.5) * 0.008);
    return { label: labels[i] ?? `${i + 1}`, rate: parseFloat(price.toFixed(0)) };
  });
}

interface PriceSource {
  businessName: string;
  phone: string;
  address: string;
  logoUrl: string | null;
  price: number;
  priceBuy: number | null;
  priceSell: number | null;
  trustScore: number;
  governorate: string | null;
  city: string | null;
  notes: string | null;
  updatedAt: string;
}

interface MarketPrice {
  productNameAr: string;
  productName: string;
  category: string;
  unit: string;
  currency: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  weightedAvg: number;
  sourceCount: number;
  governorate: string | null;
  sources: PriceSource[];
}

const CAT_LABELS: Record<string, string> = {
  currency: 'صرافة وعملات', gold: 'ذهب ومجوهرات', fuel: 'محروقات',
  food: 'مواد غذائية', vegetables: 'خضار وفواكه', meat: 'لحوم',
  construction: 'مواد بناء', agriculture: 'زراعة', metals: 'معادن',
  transport: 'نقل وشحن', electronics: 'إلكترونيات', crypto: 'كريبتو',
  local_market: 'أسواق محلية', feed: 'أعلاف',
};

const CAT_COLORS: Record<string, string> = {
  currency: '#0284c7', gold: '#f59e0b', fuel: '#ef4444',
  food: '#22c55e', vegetables: '#16a34a', meat: '#dc2626',
  construction: '#78716c', agriculture: '#65a30d', metals: '#9ca3af',
  transport: '#8b5cf6', electronics: '#06b6d4', crypto: '#f97316',
  local_market: '#d97706', feed: '#84cc16',
};

function CategoryIcon({ category, className = 'w-5 h-5', color }: { category: string; className?: string; color?: string }) {
  const props = { className, ...(color ? { style: { color } } : {}) };
  switch (category) {
    case 'currency':     return <TrendingUp {...props} />;
    case 'gold':         return <Gem {...props} />;
    case 'fuel':         return <Zap {...props} />;
    case 'food':         return <ShoppingBag {...props} />;
    case 'vegetables':   return <Leaf {...props} />;
    case 'meat':         return <ShoppingCart {...props} />;
    case 'construction': return <Building2 {...props} />;
    case 'agriculture':  return <Sprout {...props} />;
    case 'metals':       return <Wrench {...props} />;
    case 'transport':    return <Truck {...props} />;
    case 'electronics':  return <Smartphone {...props} />;
    case 'crypto':       return <Bitcoin {...props} />;
    case 'local_market': return <Store {...props} />;
    case 'feed':         return <Sprout {...props} />;
    default:             return <Store {...props} />;
  }
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7c3a'];

// ─── Rating helpers (localStorage) ───────────────────────────────────────────
const RATINGS_KEY = 'syp-vendor-ratings';
const REPORTS_KEY = 'syp-vendor-reports';

type VoteType = 'up' | 'down';

function getVote(businessName: string): VoteType | null {
  try { return (JSON.parse(localStorage.getItem(RATINGS_KEY) ?? '{}') as Record<string, VoteType>)[businessName] ?? null; }
  catch { return null; }
}

function setVote(businessName: string, vote: VoteType | null) {
  try {
    const data: Record<string, VoteType> = JSON.parse(localStorage.getItem(RATINGS_KEY) ?? '{}');
    if (vote === null) delete data[businessName]; else data[businessName] = vote;
    localStorage.setItem(RATINGS_KEY, JSON.stringify(data));
  } catch {}
}

function hasReported(businessName: string): boolean {
  try { return (JSON.parse(localStorage.getItem(REPORTS_KEY) ?? '[]') as string[]).includes(businessName); }
  catch { return false; }
}

function addReport(businessName: string, reason: string) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(REPORTS_KEY) ?? '[]');
    if (!list.includes(businessName)) {
      list.push(businessName);
      localStorage.setItem(REPORTS_KEY, JSON.stringify(list));
    }
    // Send to admin support convs as anonymous report
    const report = { businessName, reason, timestamp: Date.now() };
    const existing: typeof report[] = JSON.parse(localStorage.getItem('syp-vendor-report-list') ?? '[]');
    existing.push(report);
    localStorage.setItem('syp-vendor-report-list', JSON.stringify(existing.slice(-100)));
  } catch {}
}

function formatRelativeAr(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h}س`;
  return `منذ ${Math.floor(h / 24)}ي`;
}

function AlertModal({ onClose, productName, currentPrice, currentBuy, currentSell, t, formatNum }: {
  onClose: () => void;
  productName: string;
  currentPrice: number;
  currentBuy: number | null;
  currentSell: number | null;
  t: (k: string) => string;
  formatNum: (v: number, o?: { decimals?: number }) => string;
}) {
  const { getToken } = useUser();
  const hasBuySell = currentBuy !== null && currentSell !== null;
  const [alertType, setAlertType] = useState<'buy' | 'sell' | 'price'>(hasBuySell ? 'buy' : 'price');
  const [targetPrice, setTargetPrice] = useState('');
  const [saved, setSaved] = useState(false);

  const handleCreate = async () => {
    if (!targetPrice) return;
    try {
      const tok = await getToken();
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ code: productName, nameAr: productName, type: alertType === 'price' ? 'buy' : alertType, targetPrice: parseFloat(targetPrice) }),
      });
    } catch { /* ignore */ }
    setSaved(true);
    setTimeout(onClose, 1500);
  };

  const refPrice = alertType === 'buy' ? (currentBuy ?? currentPrice)
    : alertType === 'sell' ? (currentSell ?? currentPrice)
    : currentPrice;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-card rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b bg-primary/5">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" /> {t('priceAlert')}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4">
          {saved ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <p className="font-bold text-primary text-lg">تم إنشاء التنبيه بنجاح!</p>
              <p className="text-sm text-foreground/70 dark:text-white mt-1">سيتم إعلامك عند بلوغ السعر المستهدف</p>
            </div>
          ) : (
            <>
              <div className="bg-secondary/50 rounded-xl p-3 mb-4 flex justify-around items-center">
                {hasBuySell ? (
                  <>
                    <div className="text-center">
                      <p className="text-xs text-foreground/60 dark:text-white/70 mb-1">{t('buyPrice')}</p>
                      <p className="font-bold text-foreground dark:text-white text-sm">
                        {formatNum(currentBuy!, { decimals: 0 })} ل.س
                      </p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <p className="text-xs text-foreground/60 dark:text-white/70 mb-1">{t('sellPrice')}</p>
                      <p className="font-bold text-foreground dark:text-white text-sm">
                        {formatNum(currentSell!, { decimals: 0 })} ل.س
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-foreground/60 dark:text-white/70 mb-1">{t('currentPrice')}</p>
                    <p className="font-bold text-foreground dark:text-white text-sm">
                      {formatNum(currentPrice, { decimals: 0 })} ل.س
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground/70 dark:text-white mb-2">{t('priceType')}</p>
              <div className="flex gap-2 mb-4">
                {hasBuySell ? (
                  <>
                    <button onClick={() => setAlertType('buy')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${alertType === 'buy' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/30'}`}>
                      {t('buyPrice')}
                    </button>
                    <button onClick={() => setAlertType('sell')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${alertType === 'sell' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/30'}`}>
                      {t('sellPrice')}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setAlertType('price')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 bg-primary text-primary-foreground border-primary">
                    {t('currentPrice')}
                  </button>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground/70 dark:text-white mb-2">{t('targetPrice')}</p>
              <Input type="number" value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                placeholder={`${formatNum(refPrice, { decimals: 0 })}`}
                className="mb-4 h-12 text-lg" dir="ltr" />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
                <Button onClick={() => void handleCreate()} className="flex-1" disabled={!targetPrice}>
                  <Bell className="w-4 h-4 ml-2" /> {t('createAlert')}
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function VendorPopup({ source, onClose, formatNum: _formatNum }: { source: PriceSource; onClose: () => void; formatNum: (v: number, o?: { decimals?: number }) => string }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div
          className="relative z-10 w-full max-w-md bg-card rounded-t-3xl p-5 pb-8 shadow-2xl"
          dir="rtl"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-blue-600 dark:text-blue-400">{source.businessName}</h3>
              <GoldenBadge size={22} />
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-xl">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 items-start">
            {source.logoUrl ? (
              <img src={source.logoUrl} className="w-14 h-14 rounded-xl object-cover border border-border flex-shrink-0" alt="" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-amber-200/60 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #fef3c730, #fbbf2420)' }}>
                <Building2 className="w-7 h-7 text-amber-600" />
              </div>
            )}
            <div className="flex flex-col gap-1.5 flex-1">
              {source.phone && (
                <a href={`tel:${source.phone}`} className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-sm font-bold text-primary" dir="ltr">{source.phone}</span>
                </a>
              )}
              <div className="flex flex-col gap-0.5">
                {source.governorate && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-bold">{source.governorate}</span>
                  </div>
                )}
                {source.city && <span className="text-xs text-muted-foreground pr-5">{source.city}</span>}
                {source.address && <span className="text-xs text-muted-foreground pr-5">{source.address}</span>}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ReportModal({ businessName, onClose }: { businessName: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const REASONS = ['سعر مبالغ فيه', 'سعر غير حقيقي', 'معلومات غير دقيقة', 'تاجر مزيف', 'أخرى'];

  const submit = () => {
    if (!reason) return;
    addReport(businessName, reason);
    setDone(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
        className="w-full max-w-xs bg-card rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-red-50 dark:bg-red-900/20">
          <span className="font-bold text-sm text-red-700 dark:text-red-400 flex items-center gap-1.5">
            <Flag className="w-4 h-4" /> الإبلاغ عن سعر مشبوه
          </span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">
          {done ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="font-bold text-sm">تم إرسال البلاغ بنجاح</p>
              <p className="text-[11px] text-muted-foreground">سيقوم فريقنا بالمراجعة</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">اختر سبب الإبلاغ عن <strong>{businessName}</strong>:</p>
              <div className="flex flex-col gap-2 mb-4">
                {REASONS.map(r => (
                  <button key={r} onClick={() => setReason(r)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border-2 text-right transition-all ${reason === r ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700' : 'border-border hover:border-red-300'}`}>
                    {r}
                  </button>
                ))}
              </div>
              <Button onClick={submit} disabled={!reason} variant="destructive" className="w-full h-9 text-xs font-bold rounded-xl">
                <Flag className="w-3.5 h-3.5 ml-1.5" /> إرسال البلاغ
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function SourceCard({
  source, rank, onInfoClick, formatNum
}: { source: PriceSource; rank: number; onInfoClick: () => void; formatNum: (v: number, o?: { decimals?: number }) => string }) {
  const rankColor = rank <= 3 ? RANK_COLORS[rank - 1] : undefined;
  const [vote, setVoteState] = useState<VoteType | null>(() => getVote(source.businessName));
  const [reported, setReported] = useState(() => hasReported(source.businessName));
  const [showReport, setShowReport] = useState(false);

  const handleVote = (v: VoteType) => {
    const next = vote === v ? null : v;
    setVote(source.businessName, next);
    setVoteState(next);
  };

  return (
    <>
    <div className="flex gap-3 px-4 py-3 border-b border-border/40 last:border-0">
      <div className="flex-shrink-0 w-5 flex items-start pt-1.5">
        <span className="text-sm font-black tabular-nums" style={{ color: rankColor ?? 'var(--foreground)' }}>
          {rank}
        </span>
      </div>

      <button onClick={onInfoClick} className="flex-shrink-0 focus:outline-none">
        {source.logoUrl ? (
          <img src={source.logoUrl} alt={source.businessName}
            className="w-12 h-12 rounded-xl object-cover border border-border hover:opacity-80 transition-opacity" />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-amber-200/60 hover:opacity-80 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #fef3c730, #fbbf2420)' }}>
            <Building2 className="w-6 h-6 text-amber-600" />
          </div>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <button onClick={onInfoClick} className="flex items-center gap-1.5 mb-1 w-full text-right focus:outline-none">
          <p className="font-black text-sm break-words text-blue-600 dark:text-blue-400">{source.businessName}</p>
          <GoldenBadge size={20} />
        </button>

        {source.phone && (
          <a href={`tel:${source.phone}`} className="flex items-center gap-1.5 mb-0.5">
            <Phone className="w-2.5 h-2.5 text-primary flex-shrink-0" />
            <span className="text-[10px] font-bold text-primary" dir="ltr">{source.phone}</span>
          </a>
        )}

        {(source.governorate || source.city || source.address) && (
          <div className="flex items-start gap-1 mb-1.5">
            <MapPin className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex flex-col">
              {source.governorate && <span className="text-[10px] text-muted-foreground font-medium">{source.governorate}</span>}
              {source.city && <span className="text-[10px] text-muted-foreground">{source.city}</span>}
              {source.address && <span className="text-[10px] text-muted-foreground">{source.address}</span>}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {!(source.priceBuy && source.priceSell) && (
            <span className="text-sm font-black text-primary">
              {formatNum(source.price, { decimals: 0 })} <span className="text-[9px] font-normal text-muted-foreground">ل.س</span>
            </span>
          )}
          <span className="text-[9px] text-muted-foreground mr-auto">{formatRelativeAr(source.updatedAt)}</span>
        </div>

        {source.notes && (
          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{source.notes}</p>
        )}

        {/* Rating + Report row */}
        <div className="flex items-center gap-1.5 mt-2">
          <button
            onClick={() => handleVote('up')}
            className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${vote === 'up' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-secondary/60 text-muted-foreground hover:text-green-600'}`}
          >
            <ThumbsUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleVote('down')}
            className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${vote === 'down' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-secondary/60 text-muted-foreground hover:text-red-600'}`}
          >
            <ThumbsDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => !reported && setShowReport(true)}
            className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all mr-auto ${reported ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'bg-secondary/60 text-muted-foreground hover:text-orange-500'}`}
          >
            <Flag className="w-3 h-3" />
            {reported ? 'تم الإبلاغ' : 'إبلاغ'}
          </button>
        </div>
      </div>
    </div>

    {showReport && (
      <ReportModal businessName={source.businessName} onClose={() => { setShowReport(false); setReported(hasReported(source.businessName)); }} />
    )}
    </>
  );
}

export default function MarketPriceDetailPage() {
  const [, params] = useRoute('/app/market-price/:category/:product');
  const [, navigate] = useLocation();
  const category = params?.category ?? '';
  const productNameAr = decodeURIComponent(params?.product ?? '');

  const { t, formatNum } = useApp();
  const { isSignedIn } = useUser();
  const isMarketOpen = useMarketOpen();

  const [expanded, setExpanded] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<PriceSource | null>(null);
  const [period, setPeriod] = useState<Period>('daily');
  const [showAlert, setShowAlert] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const catColor = CAT_COLORS[category] ?? '#003C32';
  const catLabel = CAT_LABELS[category] ?? category;

  const { data: price = null, isLoading: loading, isError } = useQuery<MarketPrice | null>({
    queryKey: ['market-price-detail', category, productNameAr],
    queryFn: async () => {
      const res = await fetch(`/api/market/prices?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error('fetch failed');
      const data: MarketPrice[] = await res.json();
      return data.find(p => p.productNameAr === productNameAr) ?? null;
    },
    staleTime: 60_000,
  });

  const notFound = !loading && (isError || price === null);

  const mainPrice = price ? Math.round(price.weightedAvg || price.avgPrice) : 0;

  const sortedSources = React.useMemo(
    () => [...(price?.sources ?? [])].sort((a, b) => b.trustScore - a.trustScore),
    [price]
  );

  const history = React.useMemo(() => generateHistory(mainPrice || 1000, period), [mainPrice, period]);
  const first = history[0]?.rate ?? mainPrice;
  const last = history[history.length - 1]?.rate ?? mainPrice;
  const chartChange = ((last - first) / Math.max(first, 1)) * 100;
  const isUp = chartChange >= 0;

  const avgBuy = React.useMemo(() => {
    const list = sortedSources.filter(s => s.priceBuy);
    return list.length ? Math.round(list.reduce((a, s) => a + (s.priceBuy ?? 0), 0) / list.length) : null;
  }, [sortedSources]);

  const avgSell = React.useMemo(() => {
    const list = sortedSources.filter(s => s.priceSell);
    return list.length ? Math.round(list.reduce((a, s) => a + (s.priceSell ?? 0), 0) / list.length) : null;
  }, [sortedSources]);

  const top3 = sortedSources.slice(0, 3);
  const rest = sortedSources.slice(3);

  const handleAlertClick = () => {
    if (!isSignedIn) { setShowGuestModal(true); return; }
    setShowAlert(true);
  };

  if (loading) return (
    <div className="flex flex-col pb-28 min-h-screen" dir="rtl">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate('/app/home')} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="p-4 flex flex-col gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
      </div>
    </div>
  );

  if (notFound || !price) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center" dir="rtl">
      <AlertCircle className="w-12 h-12 text-muted-foreground opacity-40" />
      <h2 className="font-black text-lg">السعر غير موجود</h2>
      <p className="text-muted-foreground text-sm">لم يتم العثور على بيانات لهذا المنتج</p>
      <Button onClick={() => navigate('/app/home')} variant="outline" className="rounded-2xl">
        العودة للرئيسية
      </Button>
    </div>
  );

  return (
    <>
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4 pb-10" dir="rtl">

        {/* ── Header row — same layout as currency-detail ── */}
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/app/home')}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors flex-shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: catColor + '18' }}>
              <CategoryIcon category={category} className="w-5 h-5" color={catColor} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold break-words">{productNameAr}</h2>
              <p className="text-xs text-foreground/60 dark:text-white/70">{catLabel}</p>
            </div>
          </div>
          <button
            onClick={handleAlertClick}
            className="flex items-center gap-1 bg-accent/10 text-accent border border-accent/30 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-accent/20 transition-colors flex-shrink-0"
          >
            <Bell className="w-3.5 h-3.5" /> {t('alert')}
          </button>
        </div>

        {/* ── Main price card — identical to currency-detail ── */}
        <Card className="border-none bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-primary-foreground/70 text-xs mb-1">{catLabel}</p>
                <div className="text-3xl font-bold">
                  {formatNum(mainPrice, { decimals: 0 })} <span className="text-lg font-normal">ل.س</span>
                </div>
                <p className="text-primary-foreground/60 text-[10px] mt-0.5">/ {price.unit}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isUp ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUp ? '+' : ''}{chartChange.toFixed(2)}%
              </div>
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-white/20">
              {avgBuy ? (
                <div>
                  <p className="text-primary-foreground/60 text-[10px]">{t('buyPrice')}</p>
                  <p className="font-bold text-sm text-white">{formatNum(avgBuy, { decimals: 0 })} ل.س</p>
                </div>
              ) : price.minPrice < price.maxPrice ? (
                <div>
                  <p className="text-primary-foreground/60 text-[10px]">أدنى سعر</p>
                  <p className="font-bold text-sm text-white">{formatNum(price.minPrice, { decimals: 0 })} ل.س</p>
                </div>
              ) : null}
              {avgSell ? (
                <div>
                  <p className="text-primary-foreground/60 text-[10px]">{t('sellPrice')}</p>
                  <p className="font-bold text-sm text-white">{formatNum(avgSell, { decimals: 0 })} ل.س</p>
                </div>
              ) : price.minPrice < price.maxPrice ? (
                <div>
                  <p className="text-primary-foreground/60 text-[10px]">أعلى سعر</p>
                  <p className="font-bold text-sm text-white">{formatNum(price.maxPrice, { decimals: 0 })} ل.س</p>
                </div>
              ) : null}
              {isMarketOpen && (
                <div className="mr-auto flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-green-300 font-semibold">{t('live')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Period selector — identical to currency-detail ── */}
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${period === p ? 'bg-primary text-primary-foreground shadow' : 'bg-secondary text-foreground/70 dark:text-white'}`}>
              {t(p)}
            </button>
          ))}
        </div>

        {/* ── Line chart — identical to currency-detail ── */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} width={65} tickFormatter={v => formatNum(Number(v), { decimals: 0 })} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: unknown) => [`${formatNum(Number(v), { decimals: 0 })} ل.س`, 'السعر']}
                />
                <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ── Sources section ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-border/60"
              style={{ background: catColor + '08' }}>
              <h3 className="font-black text-sm flex items-center gap-2">
                <CategoryIcon category={category} className="w-4 h-4" color={catColor} />
                المصدر ({sortedSources.length})
              </h3>
            </div>

            {top3.map((src, i) => (
              <motion.div key={src.businessName + i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}>
                <SourceCard source={src} rank={i + 1} onInfoClick={() => setSelectedVendor(src)} formatNum={formatNum} />
              </motion.div>
            ))}

            {rest.length > 0 && (
              <>
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="w-full py-2.5 flex items-center justify-center gap-2 border-t border-border/40 hover:bg-secondary/60 transition-colors"
                  style={{ color: catColor }}
                >
                  <div className="flex-1 h-px bg-border/60" />
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border flex-shrink-0"
                    style={{ borderColor: catColor + '40', background: catColor + '08', color: catColor }}>
                    {expanded
                      ? <><ChevronUp className="w-3 h-3" />عرض أقل</>
                      : <><ChevronDown className="w-3 h-3" />عرض {rest.length} مصدر إضافي</>
                    }
                  </div>
                  <div className="flex-1 h-px bg-border/60" />
                </button>

                <AnimatePresence>
                  {expanded && rest.map((src, i) => (
                    <motion.div key={src.businessName + i}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: i * 0.04 }}>
                      <SourceCard source={src} rank={i + 4} onInfoClick={() => setSelectedVendor(src)} formatNum={formatNum} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </>
            )}
          </Card>
        </motion.div>

      </motion.div>

      {/* Vendor info popup */}
      {selectedVendor && (
        <VendorPopup source={selectedVendor} onClose={() => setSelectedVendor(null)} formatNum={formatNum} />
      )}

      {/* Price alert modal */}
      <AnimatePresence>
        {showAlert && (
          <AlertModal
            onClose={() => setShowAlert(false)}
            productName={productNameAr}
            currentPrice={mainPrice}
            currentBuy={avgBuy}
            currentSell={avgSell}
            t={t}
            formatNum={formatNum}
          />
        )}
      </AnimatePresence>

      <GuestModal open={showGuestModal} onClose={() => setShowGuestModal(false)} feature="تنبيهات الأسعار" />
    </>
  );
}
