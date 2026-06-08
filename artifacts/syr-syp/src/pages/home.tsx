import React, { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGetExchangeRates, useGetGoldPrices, useGetNews, useGetProfile } from "@workspace/api-client-react";
import { useAlertChecker } from '@/components/notifications-panel';
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Newspaper, Search, ExternalLink, Gem, CreditCard, Clock, Stethoscope, ShoppingCart, Zap, Smartphone, MapPin, Building2, ChevronDown, X, RefreshCw, Store, Navigation, Loader2, Phone, ShoppingBag, Leaf, Sprout, Wrench, Truck, Bitcoin, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useLocation, useSearch } from 'wouter';
import { useApp } from '@/context/app-context';
import { useUser } from '@/context/auth-context';
import { AnimatedLogo } from '@/components/animated-logo';
import { LiveBadge, useMarketOpen } from '@/components/live-badge';
import { GoldenBadge } from '@/components/golden-badge';
import { ManualBadge } from '@/components/manual-badge';

const SYRIAN_GOVERNORATES = [
  'إدلب','دمشق','ريف دمشق','حلب','حمص','حماة',
  'اللاذقية','طرطوس','دير الزور','الرقة','الحسكة','السويداء','درعا','القنيطرة',
];

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

const CAT_CONF: Record<string, { label: string; color: string }> = {
  currency:     { label: 'صرافة وعملات',   color: '#0284c7' },
  gold:         { label: 'ذهب ومجوهرات',   color: '#f59e0b' },
  fuel:         { label: 'محروقات',         color: '#ef4444' },
  food:         { label: 'مواد غذائية',    color: '#22c55e' },
  vegetables:   { label: 'خضار وفواكه',    color: '#16a34a' },
  meat:         { label: 'لحوم',            color: '#dc2626' },
  construction: { label: 'مواد بناء',      color: '#78716c' },
  agriculture:  { label: 'محاصيل زراعية',  color: '#65a30d' },
  metals:       { label: 'معادن',           color: '#9ca3af' },
  transport:    { label: 'نقل وشحن',       color: '#8b5cf6' },
  electronics:  { label: 'إلكترونيات',     color: '#06b6d4' },
  crypto:       { label: 'كريبتو',          color: '#f97316' },
  local_market: { label: 'أسواق محلية',    color: '#d97706' },
  feed:         { label: 'أعلاف',           color: '#84cc16' },
  oils:         { label: 'الزيت',           color: '#78a75a' },
  cars:         { label: 'سيارات',          color: '#7c3aed' },
};

interface VendorPopupData {
  name: string; phone: string; address: string;
  governorate: string | null; city: string | null; logoUrl: string | null;
}

function _formatRelativeAr(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h}س`;
  return `منذ ${Math.floor(h / 24)}ي`;
}

const CATS_FILTER = [
  { id: 'currency', label: 'صرافة' },
  { id: 'gold', label: 'ذهب' },
  { id: 'fuel', label: 'وقود' },
  { id: 'agriculture', label: 'محاصيل' },
  { id: 'food', label: 'غذاء' },
  { id: 'vegetables', label: 'خضار' },
  { id: 'meat', label: 'لحوم' },
  { id: 'construction', label: 'بناء' },
  { id: 'oils',         label: 'الزيت' },
  { id: 'cars',         label: 'سيارات' },
];

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
    case 'oils': {
      const { className: cls, style: st } = props as { className?: string; style?: React.CSSProperties };
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} style={st} aria-hidden="true">
          {/* Olive tree trunk */}
          <line x1="12" y1="16" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Roots */}
          <line x1="12" y1="20" x2="9.5" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="12" y1="20" x2="14.5" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          {/* Tree canopy - filled circles to represent olive leaves */}
          <circle cx="12" cy="10" r="4.5" fill="currentColor" opacity="0.85"/>
          <circle cx="8.5" cy="12" r="2.8" fill="currentColor" opacity="0.75"/>
          <circle cx="15.5" cy="12" r="2.8" fill="currentColor" opacity="0.75"/>
          <circle cx="9.5" cy="8.5" r="2.5" fill="currentColor" opacity="0.70"/>
          <circle cx="14.5" cy="8.5" r="2.5" fill="currentColor" opacity="0.70"/>
          {/* Small olives on tree */}
          <circle cx="10.5" cy="10.5" r="1" fill="white" opacity="0.7"/>
          <circle cx="13.5" cy="9" r="0.9" fill="white" opacity="0.6"/>
          {/* Oil bottle left */}
          <rect x="6.5" y="18.5" width="3" height="4" rx="0.7" fill="currentColor" opacity="0.6"/>
          <rect x="7.2" y="17.5" width="1.6" height="1.2" rx="0.4" fill="currentColor" opacity="0.55"/>
          {/* Oil bottle right */}
          <rect x="14.5" y="18.5" width="3" height="4" rx="0.7" fill="currentColor" opacity="0.6"/>
          <rect x="15.2" y="17.5" width="1.6" height="1.2" rx="0.4" fill="currentColor" opacity="0.55"/>
        </svg>
      );
    }
    case 'cars':         return <Car {...props} />;
    default:             return <Store {...props} />;
  }
}

function CatFilterRow({ cats, category, setCategory, searchStr }: {
  cats: { id: string; label: string }[];
  category: string;
  setCategory: (c: string) => void;
  searchStr: string;
}) {
  const highlight = useMemo(() => {
    try { return new URLSearchParams(searchStr).get('highlight') === 'cats'; } catch { return false; }
  }, [searchStr]);
  const rowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (highlight) rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight]);

  return (
    <div ref={rowRef} className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {cats.map(c => (
        <button
          key={c.id}
          onClick={() => setCategory(c.id)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-bold border shadow-sm transition-all"
          style={{
            ...(category === c.id
              ? { background: '#D20073', color: '#fff', borderColor: '#D20073', boxShadow: '0 2px 8px #D2007330' }
              : c.id
                ? { background: (CAT_CONF[c.id]?.color ?? '#003C32') + '14', color: CAT_CONF[c.id]?.color ?? '#003C32', borderColor: (CAT_CONF[c.id]?.color ?? '#003C32') + '40' }
                : { background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)' }),
            ...(highlight && c.id ? {} : {}),
          }}
        >
          {c.id && <CategoryIcon category={c.id} className="w-3.5 h-3.5" color={category === c.id ? 'rgba(255,255,255,0.9)' : (CAT_CONF[c.id]?.color ?? '#003C32')} />}
          <span className="relative overflow-hidden inline-block">
            {c.label}
            {highlight && c.id && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: -3, bottom: -3,
                  width: '45%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.82), transparent)',
                  borderRadius: 2,
                  pointerEvents: 'none',
                  animation: 'cat-shimmer-pass 0.85s ease-in-out 3 forwards',
                }}
              />
            )}
          </span>
        </button>
      ))}
      {highlight && (
        <style>{`
          @keyframes cat-shimmer-pass {
            0%   { transform: translateX(-200%); opacity: 0; }
            8%   { opacity: 1; }
            92%  { opacity: 1; }
            100% { transform: translateX(300%); opacity: 0; }
          }
        `}</style>
      )}
    </div>
  );
}

function LocalMarketSection() {
  const searchStr = useSearch();
  const queryClient = useQueryClient();
  const [governorate, setGovernorate] = useState('');
  const [detectedCity, setDetectedCity] = useState('');
  const [showGovPicker, setShowGovPicker] = useState(false);
  const [category, setCategory] = useState(() => {
    try { return new URLSearchParams(searchStr).get('cat') ?? ''; } catch { return ''; }
  });
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [autoLocated, setAutoLocated] = useState(false);
  const [vendorPopup, setVendorPopup] = useState<VendorPopupData | null>(null);
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [, navigate] = useLocation();
  const { formatNum } = useApp();

  const detectGovernorate = () => {
    if (!navigator.geolocation) {
      setGeoError('الجهاز لا يدعم تحديد الموقع');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data?.address ?? {};
            const state: string = addr.state ?? '';
            const cityHint: string = addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.county ?? '';
            const matchedGov = SYRIAN_GOVERNORATES.find(
              g => state.includes(g) || g.includes(state.replace('محافظة ', ''))
            );
            if (matchedGov) {
              setGovernorate(matchedGov);
              setAutoLocated(true);
              if (cityHint && cityHint !== matchedGov) {
                setDetectedCity(cityHint);
              } else {
                setDetectedCity('');
              }
            } else {
              setGeoError('تعذّر تحديد المحافظة — تأكد أنك داخل سوريا');
            }
          } else {
            setGeoError('فشل جلب بيانات الموقع');
          }
        } catch { setGeoError('خطأ في تحديد الموقع'); }
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) setGeoError('تم رفض الوصول للموقع — يرجى السماح من إعدادات المتصفح');
        else if (err.code === 2) setGeoError('تعذّر تحديد الموقع حاليًا، حاول مجددًا');
        else setGeoError('انتهت مهلة تحديد الموقع');
      },
      { timeout: 8000 }
    );
  };

  const { data: prices = [], isFetching: loading } = useQuery<MarketPrice[]>({
    queryKey: ['market-prices', governorate, detectedCity, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (governorate) params.set('governorate', governorate);
      if (detectedCity) params.set('city', detectedCity);
      if (category) params.set('category', category);
      const res = await fetch(`/api/market/prices?${params}`);
      if (res.ok) return res.json() as Promise<MarketPrice[]>;
      return [];
    },
    staleTime: 30_000,
  });

  const fetchPrices = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['market-prices', governorate, detectedCity, category] });
  }, [queryClient, governorate, detectedCity, category]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, MarketPrice[]>();
    for (const p of prices) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return map;
  }, [prices]);

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Store className="w-4 h-4 text-amber-600" />
          <span>الأسعار المحلية</span>
          <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
            من المصادر المحلية الموثوقة
          </span>
        </h2>
        <button onClick={fetchPrices} className="p-1.5 hover:bg-secondary rounded-xl transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <button
            onClick={detectGovernorate}
            disabled={geoLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] font-bold border transition-all flex-shrink-0"
            style={{ background: 'var(--secondary)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
          >
            {geoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
            {autoLocated && (detectedCity || governorate) ? (detectedCity || governorate) : 'حسب موقعي'}
          </button>

          <div className="relative flex-1">
            <button
              onClick={() => setShowGovPicker(v => !v)}
              className={`w-full flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] font-bold border transition-all ${
                governorate
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'
              }`}
            >
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate flex-1 text-right">
                {governorate
                  ? (detectedCity ? `${governorate} — ${detectedCity}` : governorate)
                  : 'اختيار المحافظة'}
              </span>
              {governorate
                ? <button onClick={e => { e.stopPropagation(); setGovernorate(''); setDetectedCity(''); }}><X className="w-2.5 h-2.5" /></button>
                : <ChevronDown className="w-3 h-3 opacity-60 flex-shrink-0" />}
            </button>
            <AnimatePresence>
              {showGovPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-1 right-0 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-full"
                >
                  <div className="p-1 flex flex-col gap-0.5 max-h-56 overflow-y-auto">
                    {SYRIAN_GOVERNORATES.map(g => (
                      <button
                        key={g}
                        onClick={() => { setGovernorate(g); setShowGovPicker(false); }}
                        className={`text-right px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                          governorate === g ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                        }`}
                      >{g}</button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Geo error */}
        {geoError && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-xs text-red-700 dark:text-red-400">
            <X className="w-3 h-3 flex-shrink-0" />
            <span>{geoError}</span>
          </div>
        )}

        {/* Category pills — always visible, never hidden */}
        <CatFilterRow
          cats={CATS_FILTER}
          category={category}
          setCategory={setCategory}
          searchStr={searchStr}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : prices.length === 0 ? (
        /* Empty state — section stays visible, never disappears */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-border/60"
          style={{ background: 'var(--secondary)' + '60' }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: '#f59e0b18' }}>
            {category
              ? <CategoryIcon category={category} className="w-7 h-7" color={CAT_CONF[category]?.color ?? '#d97706'} />
              : <Store className="w-7 h-7 text-amber-600" />}
          </div>
          <p className="font-black text-sm text-foreground/80">لا توجد معلومات عن الأسعار بعد</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {governorate
              ? `لم تُدخل أسعار في ${governorate} لهذه الفئة`
              : 'لم يقم أي تاجر بإدخال أسعار في هذه الفئة'}
          </p>
          {(category || governorate) && (
            <button
              onClick={() => { setCategory(''); setGovernorate(''); }}
              className="mt-3 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
            >
              عرض كل الأسعار
            </button>
          )}
        </motion.div>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(grouped.entries()).map(([cat, catPrices]) => {
            const conf = CAT_CONF[cat] ?? { label: cat, color: '#003C32', emoji: '📊' };

            return (
              <div key={cat} className="flex flex-col gap-2">
                {/* Category header */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: conf.color + '15' }}>
                    <CategoryIcon category={cat} className="w-4 h-4" color={conf.color} />
                  </div>
                  <span className="font-black text-sm">{conf.label}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide tabular-nums text-muted-foreground bg-secondary" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
                    {catPrices.length} سعر
                  </span>
                  {governorate && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 bg-primary/15 text-primary">
                      <MapPin className="w-2 h-2" />{governorate}
                    </span>
                  )}
                </div>

                {/* Price cards — source names above each card */}
                <div className="flex flex-col gap-3">
                  {catPrices.map((p, idx) => {
                    const cardKey = `${cat}-${idx}`;
                    const isExpanded = expandedVendors.has(cardKey);
                    const visibleSources = isExpanded ? p.sources : p.sources.slice(0, 3);
                    const hasMoreSources = p.sources.length > 3;
                    const mainPrice = Math.round(p.weightedAvg || p.avgPrice);
                    const hasBuySell = p.sources.some(s => s.priceBuy && s.priceSell);
                    const srcsBuy = p.sources.filter(s => s.priceBuy);
                    const srcsSell = p.sources.filter(s => s.priceSell);
                    const avgBuy = hasBuySell && srcsBuy.length
                      ? Math.round(srcsBuy.reduce((a, s) => a + (s.priceBuy ?? 0), 0) / srcsBuy.length)
                      : null;
                    const avgSell = hasBuySell && srcsSell.length
                      ? Math.round(srcsSell.reduce((a, s) => a + (s.priceSell ?? 0), 0) / srcsSell.length)
                      : null;

                    return (
                      <div key={idx} className="flex flex-col gap-1.5">
                        {/* Source names — max 3, expand button if more */}
                        {p.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1 px-0.5">
                            {visibleSources.map((src, si) => (
                              <button
                                key={si}
                                onClick={() => setVendorPopup({
                                  name: src.businessName, logoUrl: src.logoUrl,
                                  phone: src.phone, address: src.address,
                                  governorate: src.governorate, city: src.city,
                                })}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all active:scale-95 bg-primary/[.08] border-primary/25"
                              >
                                {src.logoUrl && (
                                  <img src={src.logoUrl} className="w-3 h-3 rounded-full object-cover flex-shrink-0" alt="" />
                                )}
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 break-all">{src.businessName}</span>
                                <GoldenBadge size={11} />
                              </button>
                            ))}
                            {hasMoreSources && (
                              <button
                                onClick={() => setExpandedVendors(prev => {
                                  const next = new Set(prev);
                                  if (next.has(cardKey)) next.delete(cardKey); else next.add(cardKey);
                                  return next;
                                })}
                                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-border text-[10px] font-bold text-muted-foreground hover:bg-secondary transition-colors"
                              >
                                {isExpanded ? 'عرض أقل' : `توسيع +${p.sources.length - 3}`}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Price card */}
                        <motion.button
                          onClick={() => navigate(`/app/market-price/${p.category}/${encodeURIComponent(p.productNameAr)}`)}
                          className="w-full text-right"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          whileTap={{ scale: 0.985 }}
                        >
                          {idx === 0 ? (
                            <div className="rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-primary to-primary/80">
                              <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0"
                                        style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                                        <motion.span className="w-1.5 h-1.5 rounded-full bg-green-400"
                                          animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                                          style={{ boxShadow: '0 0 4px #4ade80' }} />
                                        موثوق
                                      </div>
                                      <span className="text-white/50 text-[9px]">{p.sourceCount} {p.sourceCount === 1 ? 'مصدر' : 'مصادر'}</span>
                                    </div>
                                    <p className="text-white/60 text-xs mt-1 truncate">{p.productNameAr}</p>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-white font-bold text-2xl tabular-nums" style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}>{formatNum(mainPrice, { decimals: 0 })}</span>
                                      <span className="text-white/60 text-sm">ل.س</span>
                                    </div>
                                  </div>
                                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mr-3"
                                    style={{ background: 'rgba(255,255,255,0.12)' }}>
                                    <CategoryIcon category={cat} className="w-5 h-5" color="rgba(255,255,255,0.8)" />
                                  </div>
                                </div>
                                {hasBuySell && avgBuy && avgSell ? (
                                  <div className="flex gap-6 text-[10px] border-t border-white/10 pt-3">
                                    <div><p className="text-white/50">سعر الشراء</p><p className="text-white font-bold">{formatNum(avgBuy, { decimals: 0 })} ل.س</p></div>
                                    <div><p className="text-white/50">سعر البيع</p><p className="text-white font-bold">{formatNum(avgSell, { decimals: 0 })} ل.س</p></div>
                                  </div>
                                ) : p.minPrice < p.maxPrice ? (
                                  <div className="flex items-center justify-between text-[10px] border-t border-white/10 pt-3">
                                    <span className="text-white/50">النطاق</span>
                                    <span className="text-white/80 font-bold" dir="ltr">{formatNum(p.minPrice, { decimals: 0 })} — {formatNum(p.maxPrice, { decimals: 0 })}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-primary to-primary/80">
                              <div className="p-4 flex items-center justify-between">
                                <div className="flex flex-col gap-1 items-start">
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold w-fit"
                                    style={{ background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.3)' }}>
                                    <motion.span className="w-1.5 h-1.5 rounded-full bg-green-400"
                                      animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                                      style={{ boxShadow: '0 0 4px #4ade80' }} />
                                    <span className="text-green-400 font-bold">موثوق</span>
                                  </div>
                                  {hasBuySell && avgBuy && avgSell ? (
                                    <div className="flex gap-2 text-[10px] text-white/60">
                                      <span>ش: {formatNum(avgBuy, { decimals: 0 })}</span>
                                      <span>ب: {formatNum(avgSell, { decimals: 0 })}</span>
                                    </div>
                                  ) : p.minPrice < p.maxPrice ? (
                                    <span className="text-[10px] text-white/60" dir="ltr">
                                      {formatNum(p.minPrice, { decimals: 0 })} — {formatNum(p.maxPrice, { decimals: 0 })}
                                    </span>
                                  ) : null}
                                  <span className="text-[9px] text-white/50">{p.sourceCount} {p.sourceCount === 1 ? 'مصدر' : 'مصادر'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <p className="text-white/60 text-xs">{p.productNameAr}</p>
                                    <p className="font-bold text-base text-white tabular-nums" style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}>{formatNum(mainPrice, { decimals: 0 })}<span className="text-xs font-normal text-white/60"> ل.س</span></p>
                                  </div>
                                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(255,255,255,0.12)' }}>
                                    <CategoryIcon category={cat} className="w-4 h-4" color="rgba(255,255,255,0.8)" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vendor popup overlay */}
      <AnimatePresence>
        {vendorPopup && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setVendorPopup(null)}
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
                  <h3 className="font-black text-base text-blue-600 dark:text-blue-400">{vendorPopup.name}</h3>
                  <GoldenBadge size={22} />
                </div>
                <button onClick={() => setVendorPopup(null)} className="p-1.5 hover:bg-secondary rounded-xl">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-3 items-start">
                {vendorPopup.logoUrl ? (
                  <img src={vendorPopup.logoUrl} className="w-14 h-14 rounded-xl object-cover border border-border flex-shrink-0" alt="" />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-amber-200/60 flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #fef3c730, #fbbf2420)' }}>
                    <Building2 className="w-7 h-7 text-amber-600" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5 flex-1">
                  {vendorPopup.phone && (
                    <a href={`tel:${vendorPopup.phone}`} className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-sm font-bold text-primary" dir="ltr">{vendorPopup.phone}</span>
                    </a>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {vendorPopup.governorate && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-bold">{vendorPopup.governorate}</span>
                      </div>
                    )}
                    {vendorPopup.city && (
                      <span className="text-xs text-muted-foreground pr-5">{vendorPopup.city}</span>
                    )}
                    {vendorPopup.address && (
                      <span className="text-xs text-muted-foreground pr-5">{vendorPopup.address}</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── Floating Stars for Services Card ─────────────────────────── */
const STAR_SLOTS = [
  { x: '8%',  y: '14%', size: 11, dur: 3.2, delay: 0 },
  { x: '22%', y: '78%', size: 7,  dur: 2.8, delay: 0.7 },
  { x: '38%', y: '22%', size: 9,  dur: 3.6, delay: 1.4 },
  { x: '52%', y: '68%', size: 6,  dur: 2.5, delay: 0.3 },
  { x: '65%', y: '12%', size: 12, dur: 3.9, delay: 1.8 },
  { x: '78%', y: '55%', size: 8,  dur: 2.9, delay: 0.9 },
  { x: '88%', y: '28%', size: 6,  dur: 3.3, delay: 2.1 },
  { x: '12%', y: '48%', size: 10, dur: 3.7, delay: 1.1 },
  { x: '45%', y: '85%', size: 7,  dur: 2.6, delay: 2.4 },
  { x: '72%', y: '82%', size: 9,  dur: 3.1, delay: 0.5 },
  { x: '30%', y: '40%', size: 6,  dur: 4.0, delay: 1.6 },
  { x: '92%', y: '65%', size: 8,  dur: 2.7, delay: 2.8 },
];

function StarShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 1 L13.8 8.5 L21 10.5 L13.8 12.5 L12 20 L10.2 12.5 L3 10.5 L10.2 8.5 Z"
        fill={color}
      />
      <path
        d="M12 5 L12.8 9.5 L17 10.5 L12.8 11.5 L12 16 L11.2 11.5 L7 10.5 L11.2 9.5 Z"
        fill="rgba(255,255,255,0.55)"
      />
    </svg>
  );
}

function FloatingStars() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl" style={{ zIndex: 1 }}>
      {STAR_SLOTS.map((s, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', left: s.x, top: s.y }}
          animate={{
            opacity: [0, 0, 1, 1, 0],
            scale:   [0.2, 0.2, 1, 1, 0.2],
            rotate:  [0, 0, 15, -10, 0],
          }}
          transition={{
            duration: s.dur,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.15, 0.4, 0.75, 1],
          }}
        >
          <StarShape size={s.size} color="#D20073" />
        </motion.div>
      ))}
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
};

const FLAG_MAP: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', TRY: '🇹🇷', GBP: '🇬🇧',
  AED: '🇦🇪', SAR: '🇸🇦', EGP: '🇪🇬', IQD: '🇮🇶',
};

function CurrencyFlag({ code, className = "w-6 h-6" }: { code: string; className?: string }) {
  if (code === 'SYP') {
    return <img src="/syria-flag.png" alt="SY" className={`${className} rounded-full object-cover flex-shrink-0`} />;
  }
  return <span className="text-2xl leading-none flex-shrink-0">{FLAG_MAP[code] ?? '🌍'}</span>;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} ي`;
}

const CURRENCIES = [
  { code: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', isPrimary: true },
  { code: 'EUR', nameAr: 'يورو', nameEn: 'Euro' },
  { code: 'TRY', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira' },
  { code: 'GBP', nameAr: 'جنيه إسترليني', nameEn: 'British Pound' },
  { code: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal' },
  { code: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham' },
];

interface BroadcastData {
  text: string;
  textColor: string;
  countdown?: number;
  countdownColor?: string;
  startedAt: string;
  endsAt?: string;
  speed?: 'slow' | 'normal' | 'fast';
}

export default function HomePage() {
  const { data: ratesData, isLoading: loadingRates } = useGetExchangeRates();
  const { data: goldData, isLoading: loadingGold } = useGetGoldPrices();
  // Check user price alerts whenever exchange rates update
  useAlertChecker(ratesData?.rates as Record<string, number> | undefined);
  const [newsSearch, setNewsSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { formatNum, getBuyRate, getSellRate, getCustomBuyRate, getCustomSellRate, t, language } = useApp();
  const isMarketOpen = useMarketOpen();
  const [, navigate] = useLocation();
  const { isSignedIn } = useUser();

  // Live broadcast
  const [broadcast, setBroadcast] = useState<BroadcastData | null>(null);
  const [broadcastRemaining, setBroadcastRemaining] = useState(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/broadcast');
        if (res.ok) {
          const data = await res.json() as BroadcastData | null;
          setBroadcast(data);
          if (data?.endsAt) {
            setBroadcastRemaining(Math.max(0, Math.floor((new Date(data.endsAt).getTime() - Date.now()) / 1000)));
          }
        }
      } catch { /* silent */ }
    };
    void poll();
    const interval = setInterval(() => void poll(), 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!broadcast?.endsAt) return;
    const tick = setInterval(() => {
      const rem = Math.max(0, Math.floor((new Date(broadcast.endsAt!).getTime() - Date.now()) / 1000));
      setBroadcastRemaining(rem);
      if (rem === 0) setBroadcast(null);
    }, 1000);
    return () => clearInterval(tick);
  }, [broadcast?.endsAt]);
  const { data: profileData } = useGetProfile();
  const _firstName = isSignedIn
    ? (profileData?.firstName
        || (profileData as Record<string, string> | undefined)?.first_name
        || ((profileData as Record<string, string> | undefined)?.fullName ?? '').split(' ')[0]
        || '')
    : '';

  const _getTimeGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'صباح الخير';
    if (h >= 12 && h < 17) return 'مساء الخير';
    if (h >= 17 && h < 21) return 'مساء النور';
    return 'تصبح على خير';
  };

  /* ── Animated price changes — persistent across nav via sessionStorage ── */
  const PRICE_SS_KEY = 'syp-price-changes-ss';
  const [priceChanges, setPriceChanges] = useState<Record<string, number>>(() => {
    try {
      const s = sessionStorage.getItem(PRICE_SS_KEY);
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return Object.fromEntries(CURRENCIES.map(c => [c.code, parseFloat(((Math.random() - 0.35) * 2.5).toFixed(2))]));
  });

  const handleNewsSearch = (val: string) => {
    setNewsSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 600);
  };

  const { data: newsData, isLoading: loadingNews } = useGetNews(
    debouncedSearch ? { q: debouncedSearch } : {},
    { query: { staleTime: 5 * 60 * 1000, queryKey: ['news', debouncedSearch] as readonly unknown[] } }
  );

  /* ── Persist price changes to sessionStorage ── */
  useEffect(() => {
    try { sessionStorage.setItem(PRICE_SS_KEY, JSON.stringify(priceChanges)); } catch { /* ignore */ }
  }, [priceChanges]);

  /* ── Random animated price changes ── */
  useEffect(() => {
    const timer = setInterval(() => {
      setPriceChanges(prev => {
        const idx = Math.floor(Math.random() * CURRENCIES.length);
        const code = CURRENCIES[idx].code;
        const delta = (Math.random() - 0.45) * 0.3;
        return { ...prev, [code]: parseFloat(((prev[code] ?? 0) + delta).toFixed(2)) };
      });
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const rates = ratesData?.rates ?? {};
  const usdToSyp = ratesData?.usd_to_syp ?? 0;

  function getCurrencyRateSYP(code: string) {
    if (code === 'SYP') return 1;
    const codeRate = rates[code];
    if (!codeRate || !usdToSyp) return 0;
    return usdToSyp / codeRate;
  }

  const KARATS = [24, 22, 21, 18, 14];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex flex-col gap-6">

      {/* Hero */}
      <motion.div variants={itemVariants} className="flex flex-col">
        <div className="rounded-2xl overflow-hidden py-3 px-6 flex flex-col items-center border border-border shadow-sm bg-card" style={broadcast ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}}>
          <AnimatedLogo fontSize="clamp(1.5rem, 6vw, 2rem)" />
        </div>
        {broadcast && (
          <div
            className="overflow-hidden border-x border-b border-border rounded-b-2xl"
            style={{ background: 'rgba(10,10,10,0.90)', height: 34 }}
            dir="rtl"
          >
            <style>{`
              @keyframes lira-ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
            `}</style>
            <div className="flex items-center h-full gap-2 px-2">
              <span className="flex-shrink-0 flex items-center gap-1 text-[9px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded-md leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                مباشر
              </span>
              <div className="flex-1 overflow-hidden relative h-full">
                <span
                  className="absolute inset-y-0 flex items-center whitespace-nowrap text-[11px] font-bold"
                  style={{
                    color: broadcast.textColor,
                    animation: `lira-ticker ${broadcast.speed === 'slow' ? 35 : broadcast.speed === 'fast' ? 12 : 20}s linear infinite`,
                  }}
                >
                  {broadcast.text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{broadcast.text}
                </span>
              </div>
              {broadcast.endsAt && (
                <span
                  className="flex-shrink-0 text-[11px] font-mono font-black tabular-nums"
                  style={{ color: broadcast.countdownColor ?? '#ff4444' }}
                >
                  {Math.floor(broadcastRemaining / 60).toString().padStart(2, '0')}:{(broadcastRemaining % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Services & Balance — Coming Soon CTA */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col items-center gap-1 mb-1">
          <span
            className="text-[10px] font-black px-3 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'rgba(210,0,115,0.12)', color: '#D20073' }}
          >
            <Clock className="w-2.5 h-2.5" /> {language === 'ar' ? 'قريباً' : 'Coming Soon'}
          </span>
        </div>
        <motion.button
          onClick={() => navigate('/app/services/onboarding')}
          className="w-full relative overflow-hidden rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(210,0,115,0.1), rgba(0,60,50,0.07))',
            border: '2px solid rgba(210,0,115,0.3)',
          }}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.005 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <FloatingStars />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: 'rgba(0,60,50,0.15)' }} />
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full pointer-events-none"
            style={{ background: 'rgba(210,0,115,0.18)' }} />

          <div className="relative z-10 flex flex-col items-center gap-3 py-7 px-4">
            <motion.div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              animate={{ boxShadow: ['0 8px 24px rgba(210,0,115,0.3)', '0 12px 36px rgba(210,0,115,0.5)', '0 8px 24px rgba(210,0,115,0.3)'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ background: 'linear-gradient(135deg, #D20073, #ff3d8f)' }}
            >
              <CreditCard className="w-10 h-10 text-white" />
            </motion.div>
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="font-black text-xl leading-none" style={{ color: '#D20073' }}>
                {t('servicesBalance')}
              </p>
              <p className="text-xs text-foreground/70 dark:text-white leading-relaxed max-w-[230px]">
                {t('servicesSubtitle')}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap justify-center">
                {([
                  { Icon: Stethoscope, label: language === 'ar' ? 'عيادات' : 'Clinics' },
                  { Icon: ShoppingCart, label: language === 'ar' ? 'تسوق' : 'Shop' },
                  { Icon: Zap,          label: language === 'ar' ? 'فواتير' : 'Bills' },
                  { Icon: Smartphone,   label: language === 'ar' ? 'خدمات' : 'Services' },
                  { Icon: CreditCard,   label: language === 'ar' ? 'دفع' : 'Pay' },
                ] as const).map(({ Icon, label }) => (
                  <span
                    key={label}
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                    style={{ background: 'rgba(210,0,115,0.12)', color: '#D20073' }}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.button>
      </motion.div>

      {/* ── Local Market Prices (top section, below services) ── */}
      <motion.div variants={itemVariants}>
        <LocalMarketSection />
      </motion.div>


      {/* Exchange Rates */}
      <section>
        <div className="flex items-center gap-3 mb-4" style={{ marginBottom: '0.5rem' }}>
          <div className="flex-1 h-[2.5px] rounded-full" style={{ background: '#D20073' }} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> أسعار الصرف المتداولة عالمياً
          </h2>
          <LiveBadge />
        </div>

        {loadingRates ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : ratesData ? (
          <div className="flex flex-col gap-4">
            {CURRENCIES.map((cur) => {
              const rate = getCurrencyRateSYP(cur.code);
              if (!rate) return null;
              const buyR = getCustomBuyRate(cur.code, rate);
              const sellR = getCustomSellRate(cur.code, rate);
              const name = language === 'ar' ? cur.nameAr : cur.nameEn;
              const change = priceChanges[cur.code] ?? 0;
              const isUp = change >= 0;
              const _arrowColor = isUp ? '#16a34a' : '#ef4444';

              if (cur.isPrimary) {
                return (
                  <motion.div key={cur.code} variants={itemVariants}>
                    <Link href={`/app/currency/${cur.code}`}>
                      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-md overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                        <CardContent className="p-5 relative z-10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <CurrencyFlag code={cur.code} className="w-7 h-7" />
                              <div>
                                <p className="text-primary-foreground/80 text-xs">{name} ({cur.code})</p>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-2xl font-bold">{formatNum(rate, { decimals: 0 })} <span className="text-sm font-normal">ل.س</span></h3>
                                  {ratesData.is_manual_rate && <ManualBadge updatedAt={ratesData.manual_updated_at ?? undefined} />}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <LiveBadge />
                              <div className="flex items-center gap-0.5" style={{ color: isUp ? '#86efac' : '#fca5a5' }}>
                                <motion.span
                                  animate={{ y: isUp ? [-1.5, 1.5] : [1.5, -1.5] }}
                                  transition={{ duration: 0.9, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                                  className="text-sm font-bold"
                                >
                                  {isUp ? '▲' : '▼'}
                                </motion.span>
                                <span className="text-[11px] font-bold" dir="ltr">{Math.abs(change).toFixed(2)}%</span>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-white/40" />
                            </div>
                          </div>
                          <div className="flex gap-4 border-t border-white/20 pt-3">
                            <div>
                              <p className="text-[10px] text-white/60">{t('buyPrice')}</p>
                              <p className="font-bold text-xs">{formatNum(buyR, { decimals: 0 })} ل.س</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-white/60">{t('sellPrice')}</p>
                              <p className="font-bold text-xs">{formatNum(sellR, { decimals: 0 })} ل.س</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              }

              return (
                <motion.div key={cur.code} variants={itemVariants}>
                  <Link href={`/app/currency/${cur.code}`}>
                    <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-md cursor-pointer active:scale-[0.98] transition-transform">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CurrencyFlag code={cur.code} />
                          <div>
                            <p className="text-primary-foreground/70 text-xs">{name} ({cur.code})</p>
                            <p className="font-bold text-base">{formatNum(rate, { decimals: 0 })} <span className="text-xs font-normal text-primary-foreground/60">ل.س</span></p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <LiveBadge />
                          <div className="flex items-center gap-0.5" style={{ color: isUp ? '#86efac' : '#fca5a5' }}>
                            <motion.span
                              animate={{ y: isUp ? [-1.5, 1.5] : [1.5, -1.5] }}
                              transition={{ duration: 0.9, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                              className="text-[12px] font-bold"
                            >
                              {isUp ? '▲' : '▼'}
                            </motion.span>
                            <span className="text-[10px] font-bold" dir="ltr">{Math.abs(change).toFixed(2)}%</span>
                          </div>
                          <div className="flex gap-2 text-[10px] text-primary-foreground/60">
                            <span>{language === 'ar' ? 'ش' : 'B'}: {formatNum(buyR, { decimals: 0 })}</span>
                            <span>{language === 'ar' ? 'ب' : 'S'}: {formatNum(sellR, { decimals: 0 })}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* Gold Prices */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Gem className="w-4 h-4 text-yellow-500 dark:text-yellow-400" /> {t('goldPrices')}
          </h2>
          <LiveBadge />
        </div>

        {loadingGold ? (
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : goldData ? (
          <div className="grid grid-cols-2 gap-4">
            {(goldData.karats ?? [])
              .filter(k => KARATS.includes(k.karat))
              .sort((a, b) => b.karat - a.karat)
              .map((karat) => {
                const buy = getBuyRate(karat.pricePerGramSYP);
                const sell = getSellRate(karat.pricePerGramSYP);
                return (
                  <motion.div key={karat.karat} variants={itemVariants}>
                    <Link href={`/app/gold/${karat.karat}`}>
                      <Card className="border-border shadow-sm cursor-pointer active:scale-[0.97] transition-transform hover:border-yellow-400/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-bold">{language === 'ar' ? 'عيار' : 'Karat'} {karat.karat}</p>
                            <div className="flex items-center gap-1">
                              {goldData.isManual && <ManualBadge updatedAt={goldData.updatedAt ?? undefined} />}
                              <span className="text-[9px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 rounded font-bold">
                                {(karat.purity * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <h3 className="text-sm font-bold text-primary dark:text-white">
                            {formatNum(karat.pricePerGramSYP, { decimals: 0 })} <span className="text-[10px] font-normal">ل.س</span>
                          </h3>
                          <div className="flex gap-1.5 text-[9px] text-foreground/60 dark:text-white/70 mt-1.5">
                            <span>{language === 'ar' ? 'ش' : 'B'}: {formatNum(buy, { decimals: 0 })}</span>
                            <span>{language === 'ar' ? 'ب' : 'S'}: {formatNum(sell, { decimals: 0 })}</span>
                          </div>
                          {isMarketOpen && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-[9px] text-green-600 dark:text-green-400 font-semibold">{t('live')}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
          </div>
        ) : null}
      </section>

      {/* News */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-accent" /> {t('latestNews')}
          </h2>
        </div>

        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t('searchNews')}
            value={newsSearch}
            onChange={e => handleNewsSearch(e.target.value)}
            className="pr-9 h-10 rounded-xl bg-secondary/50 border-border"
          />
          {newsSearch && (
            <button
              onClick={() => { setNewsSearch(''); setDebouncedSearch(''); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >✕</button>
          )}
        </div>

        {loadingNews ? (
          <div className="flex flex-col gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : newsData && newsData.length > 0 ? (
          <div className="flex flex-col gap-4">
            {debouncedSearch && (
              <p className="text-xs text-foreground/70 dark:text-white px-1">
                {language === 'ar' ? `نتائج "${debouncedSearch}": ${newsData.length}` : `Results for "${debouncedSearch}": ${newsData.length}`}
              </p>
            )}
            {newsData.map((news) => (
              <motion.div key={news.id} variants={itemVariants}>
                <Card
                  className="border-border shadow-sm hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => (news as unknown as { url?: string }).url && window.open((news as unknown as { url: string }).url, '_blank')}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-1.5">
                      <Badge variant="outline" className="bg-secondary text-secondary-foreground text-[9px] px-1.5">
                        {news.category === 'currency'
                          ? (language === 'ar' ? 'عملات' : 'Currencies')
                          : news.category === 'gold'
                            ? (language === 'ar' ? 'ذهب' : 'Gold')
                            : news.category === 'crypto'
                              ? (language === 'ar' ? 'كريبتو' : 'Crypto')
                              : (language === 'ar' ? 'اقتصاد' : 'Economy')}
                      </Badge>
                      <div className="flex items-center gap-1 text-[9px] text-foreground/60 dark:text-white/60">
                        <span>{formatRelativeTime(news.publishedAt)}</span>
                        {(news as unknown as { url?: string }).url && <ExternalLink className="w-2.5 h-2.5" />}
                      </div>
                    </div>
                    <h3 className="font-bold text-xs mb-1 leading-snug line-clamp-2">{news.title}</h3>
                    <p className="text-[10px] text-foreground/70 dark:text-white/80 line-clamp-2">{news.summary}</p>
                    {news.source && (
                      <p className="text-[9px] text-primary/70 mt-1 font-medium">{news.source}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-foreground/70 dark:text-white text-sm">
            {debouncedSearch
              ? (language === 'ar' ? `لا نتائج لـ "${debouncedSearch}"` : `No results for "${debouncedSearch}"`)
              : (language === 'ar' ? 'جارٍ تحميل الأخبار...' : 'Loading news...')}
          </div>
        )}
      </section>

    </motion.div>
  );
}
