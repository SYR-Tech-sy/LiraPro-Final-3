import React, { useState, useMemo, useEffect } from 'react';
import { useGetExchangeRates, useGetGoldPrices } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Calculator, Search, ChevronDown, X, Globe, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from '@/context/app-context';
import { LiveBadge } from '@/components/live-badge';
import { ManualBadge } from '@/components/manual-badge';

const PINNED = ['SYP', 'USD', 'TRY', 'EUR', 'AED', 'SAR'];
const EXCLUDED = ['ILS', 'IRR'];

const CURRENCY_NAMES_AR: Record<string, string> = {
  SYP: 'الليرة السورية', USD: 'الدولار الأمريكي', EUR: 'اليورو',
  TRY: 'الليرة التركية', GBP: 'الجنيه الإسترليني', AED: 'الدرهم الإماراتي',
  SAR: 'الريال السعودي', EGP: 'الجنيه المصري', IQD: 'الدينار العراقي',
  JOD: 'الدينار الأردني', KWD: 'الدينار الكويتي', BHD: 'الدينار البحريني',
  QAR: 'الريال القطري', OMR: 'الريال العماني', LBP: 'الليرة اللبنانية',
  CNY: 'اليوان الصيني', RUB: 'الروبل الروسي',
};

const CURRENCY_NAMES_EN: Record<string, string> = {
  SYP: 'Syrian Pound', USD: 'US Dollar', EUR: 'Euro',
  TRY: 'Turkish Lira', GBP: 'British Pound', AED: 'UAE Dirham',
  SAR: 'Saudi Riyal', EGP: 'Egyptian Pound', IQD: 'Iraqi Dinar',
  JOD: 'Jordanian Dinar', KWD: 'Kuwaiti Dinar', BHD: 'Bahraini Dinar',
  QAR: 'Qatari Riyal', OMR: 'Omani Riyal', LBP: 'Lebanese Pound',
  CNY: 'Chinese Yuan', RUB: 'Russian Ruble',
};

const FLAG_MAP: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', TRY: '🇹🇷', GBP: '🇬🇧',
  AED: '🇦🇪', SAR: '🇸🇦', EGP: '🇪🇬', IQD: '🇮🇶', JOD: '🇯🇴',
  KWD: '🇰🇼', BHD: '🇧🇭', QAR: '🇶🇦', OMR: '🇴🇲', LBP: '🇱🇧',
  CNY: '🇨🇳', RUB: '🇷🇺',
};

function getFlag(code: string): string | null {
  if (code === 'SYP') return null;
  if (FLAG_MAP[code]) return FLAG_MAP[code];
  const cc = code.substring(0, 2).toUpperCase();
  try { return String.fromCodePoint(...cc.split('').map(c => 127397 + c.charCodeAt(0))); }
  catch { return '🌍'; }
}

function CurrencyFlagIcon({ code, size = 'text-lg' }: { code: string; size?: string }) {
  if (code === 'SYP') {
    return <img src="/syria-flag.png" alt="SY" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />;
  }
  return <span className={`${size} flex-shrink-0`}>{getFlag(code) ?? '🌍'}</span>;
}

interface CurrencyPickerProps {
  value: string;
  onChange: (v: string) => void;
  currencies: string[];
  label: string;
}

function CurrencyPicker({ value, onChange, currencies, label }: CurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { language } = useApp();
  const NAMES = language === 'ar' ? CURRENCY_NAMES_AR : CURRENCY_NAMES_EN;

  const pinned = PINNED.filter(c => currencies.includes(c));
  const others = currencies.filter(c => !PINNED.includes(c));
  const all = [...pinned, ...others];
  const filtered = search
    ? all.filter(c => c.toLowerCase().includes(search.toLowerCase()) || (NAMES[c] ?? '').toLowerCase().includes(search.toLowerCase()))
    : all;

  return (
    <div className="flex-1">
      <label className="text-xs font-medium text-foreground/70 dark:text-white mb-1.5 block">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-12 px-3 rounded-xl border border-border bg-background flex items-center justify-between gap-2 hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CurrencyFlagIcon code={value} />
          <span className="font-bold text-sm" dir="ltr">{value}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center"
          onClick={() => { setOpen(false); setSearch(''); }}
        >
          <motion.div
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            className="w-full max-w-md bg-card rounded-t-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: '75vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="font-bold">{language === 'ar' ? 'اختر عملة' : 'Choose Currency'}</h3>
              <button onClick={() => { setOpen(false); setSearch(''); }}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-3 border-b flex-shrink-0">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'ابحث عن عملة...' : 'Search currency...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-9 h-10"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {!search && (
                <p className="text-[10px] text-foreground/60 dark:text-white/70 px-2 py-1 font-semibold">
                  {language === 'ar' ? 'الأكثر استخداماً' : 'Most Used'}
                </p>
              )}
              {filtered.map(c => (
                <button
                  key={c}
                  onClick={() => { onChange(c); setOpen(false); setSearch(''); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${value === c ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                >
                  <CurrencyFlagIcon code={c} />
                  <span className="font-bold text-sm" dir="ltr">{c}</span>
                  <span className="text-xs text-foreground/60 dark:text-white/70 mr-1">{NAMES[c] ?? ''}</span>
                  {PINNED.includes(c) && !search && (
                    <span className="ml-auto text-[9px] opacity-40 font-semibold">
                      {language === 'ar' ? 'مثبّت' : 'Pinned'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function ConverterPage() {
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('SYP');
  const [isSwapping, setIsSwapping] = useState(false);
  const [buySellMode, setBuySellMode] = useState<'buy' | 'sell'>('buy');
  const [goldWeight, setGoldWeight] = useState('1');
  const [selectedKarat, setSelectedKarat] = useState('21');
  const [goldDisplay, setGoldDisplay] = useState<'SYP' | 'USD'>('SYP');
  const [goldBuySellMode, setGoldBuySellMode] = useState<'buy' | 'sell'>('buy');
  const [rateMode, setRateMode] = useState<'local' | 'global'>(() =>
    (localStorage.getItem('syp-rate-mode') as 'local' | 'global') ?? 'global'
  );
  const [showModeModal, setShowModeModal] = useState(() => !localStorage.getItem('syp-rate-mode-remember'));
  const [rememberChoice, setRememberChoice] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>('');

  const { data: ratesData, isLoading: loadingRates } = useGetExchangeRates();
  const { data: goldData, isLoading: loadingGold } = useGetGoldPrices();
  const { formatNum, t, language } = useApp();

  const rates = useMemo(() => ratesData?.rates ?? {}, [ratesData]);
  const isManualRate = ratesData?.is_manual_rate ?? false;
  const localUsdToSyp = ratesData?.usd_to_syp ?? 0;
  const globalUsdToSyp = (ratesData as unknown as { global_usd_to_syp?: number } | undefined)?.global_usd_to_syp ?? localUsdToSyp;

  const [localCurrencyPrices, setLocalCurrencyPrices] = useState<Array<{
    productNameAr: string; avgPrice: number; weightedAvg: number; unit: string; sourceCount: number;
  }>>([]);
  const [localCurrencyFetched, setLocalCurrencyFetched] = useState(false);

  const [localGoldPrices, setLocalGoldPrices] = useState<Array<{
    productNameAr: string; avgPrice: number; weightedAvg: number; unit: string; sourceCount: number;
  }>>([]);
  const [localGoldFetched, setLocalGoldFetched] = useState(false);

  useEffect(() => {
    if (rateMode === 'local') {
      setLocalCurrencyFetched(false);
      setLocalGoldFetched(false);
      const fetchAll = async () => {
        try {
          const prov = selectedProvince ? `&province=${encodeURIComponent(selectedProvince)}` : '';
          const [r1, r2, r3] = await Promise.all([
            fetch(`/api/market/prices?category=currency${prov}`).then(r => r.ok ? r.json() : []),
            fetch(`/api/market/prices?category=صرافة${prov}`).then(r => r.ok ? r.json() : []),
            fetch(`/api/market/prices?category=gold${prov}`).then(r => r.ok ? r.json() : []),
          ]) as [typeof localCurrencyPrices, typeof localCurrencyPrices, typeof localGoldPrices];
          const combined = [...(Array.isArray(r1) ? r1 : []), ...(Array.isArray(r2) ? r2 : [])];
          setLocalCurrencyPrices(combined);
          setLocalGoldPrices(Array.isArray(r3) ? r3 : []);
        } catch {
          setLocalCurrencyPrices([]);
          setLocalGoldPrices([]);
        } finally {
          setLocalCurrencyFetched(true);
          setLocalGoldFetched(true);
        }
      };
      void fetchAll();
    } else {
      setLocalCurrencyFetched(false);
      setLocalGoldFetched(false);
    }
  }, [rateMode, selectedProvince]);

  const localMarketEntry = useMemo(() => {
    if (!localCurrencyPrices.length) return null;
    const usdKeywords = ['USD', 'دولار', 'dollar'];
    const usdEntry = localCurrencyPrices.find(p =>
      usdKeywords.some(kw => p.productNameAr.toLowerCase().includes(kw.toLowerCase()))
    );
    if (usdEntry) return usdEntry;
    const firstEntry = localCurrencyPrices[0];
    if (firstEntry && firstEntry.avgPrice > 1000) return firstEntry;
    return null;
  }, [localCurrencyPrices]);

  const localRateSourceCount = localMarketEntry?.sourceCount ?? 0;

  const localMarketSypRate = localMarketEntry
    ? (localMarketEntry.weightedAvg > 0 ? localMarketEntry.weightedAvg : localMarketEntry.avgPrice)
    : null;

  const usdToSyp = rateMode === 'local' ? (localMarketSypRate ?? localUsdToSyp) : globalUsdToSyp;

  const currencies = useMemo(() => {
    if (!ratesData) return PINNED;
    const all = Object.keys(rates).filter(c => !EXCLUDED.includes(c));
    if (!all.includes('SYP')) all.push('SYP');
    const pinned = PINNED.filter(c => all.includes(c));
    const others = all.filter(c => !PINNED.includes(c)).sort();
    return [...pinned, ...others];
  }, [ratesData, rates]);

  function getRateSYP(code: string): number {
    if (code === 'SYP') return 1;
    const codeRate = rates[code];
    if (!codeRate || !usdToSyp) return 0;
    return usdToSyp / codeRate;
  }

  function convert(fromCode: string, toCode: string, amt: number): number {
    if (!amt || !usdToSyp) return 0;
    const fromSYP = getRateSYP(fromCode);
    const toSYP = getRateSYP(toCode);
    if (!fromSYP || !toSYP) return 0;
    const inSYP = amt * fromSYP;
    return inSYP / toSYP;
  }

  const numericAmount = parseFloat(amount) || 0;
  const rawResult = convert(fromCurrency, toCurrency, numericAmount);
  const spread = 0.015;
  const result = buySellMode === 'buy'
    ? rawResult * (1 + spread)
    : rawResult * (1 - spread);
  const rawRate = convert(fromCurrency, toCurrency, 1);
  const displayRate = buySellMode === 'buy' ? rawRate * (1 + spread) : rawRate * (1 - spread);

  const handleSwap = () => {
    setIsSwapping(true);
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setTimeout(() => setIsSwapping(false), 300);
  };

  const localGoldPricePerGram = useMemo(() => {
    if (!localGoldPrices.length) return null;
    const karatEntry = localGoldPrices.find(p =>
      p.productNameAr.includes(selectedKarat) || p.productNameAr.toLowerCase().includes(`karat ${selectedKarat}`)
    );
    if (karatEntry) {
      const price = karatEntry.weightedAvg > 0 ? karatEntry.weightedAvg : karatEntry.avgPrice;
      return price > 0 ? price : null;
    }
    const anyEntry = localGoldPrices[0];
    if (anyEntry) {
      const price = anyEntry.weightedAvg > 0 ? anyEntry.weightedAvg : anyEntry.avgPrice;
      return price > 0 ? price : null;
    }
    return null;
  }, [localGoldPrices, selectedKarat]);

  const goldCalc = useMemo(() => {
    if (!goldData) return { syp: 0, usd: 0, buySyp: 0, buyUsd: 0, sellSyp: 0, sellUsd: 0 };
    const kd = (goldData.karats ?? []).find(k => k.karat.toString() === selectedKarat);
    if (!kd) return { syp: 0, usd: 0, buySyp: 0, buyUsd: 0, sellSyp: 0, sellUsd: 0 };
    const w = parseFloat(goldWeight) || 0;
    const pricePerGramSYP = (rateMode === 'local' && localGoldPricePerGram)
      ? localGoldPricePerGram
      : kd.pricePerGramSYP;
    return {
      syp: pricePerGramSYP * w,
      usd: kd.pricePerGramUSD * w,
      buySyp: pricePerGramSYP * w * (1 + spread),
      buyUsd: kd.pricePerGramUSD * w * (1 + spread),
      sellSyp: pricePerGramSYP * w * (1 - spread),
      sellUsd: kd.pricePerGramUSD * w * (1 - spread),
    };
  }, [goldData, selectedKarat, goldWeight, rateMode, localGoldPricePerGram]);

  const goldValue = goldBuySellMode === 'buy'
    ? { syp: goldCalc.buySyp, usd: goldCalc.buyUsd }
    : { syp: goldCalc.sellSyp, usd: goldCalc.sellUsd };

  const selectMode = (mode: 'local' | 'global') => {
    setRateMode(mode);
    if (rememberChoice) {
      localStorage.setItem('syp-rate-mode', mode);
      localStorage.setItem('syp-rate-mode-remember', '1');
    } else {
      localStorage.removeItem('syp-rate-mode-remember');
    }
    setShowModeModal(false);
  };

  return (
    <>
    {/* Mode selection modal */}
    <AnimatePresence>
      {showModeModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            dir="rtl"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          >
            <h2 className="text-lg font-black mb-1">اختر وضع التحويل</h2>
            <p className="text-sm text-muted-foreground mb-5">كيف تريد حساب أسعار الصرف؟</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => selectMode('local')}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-right transition-all ${rateMode === 'local' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">بالسعر المحلي</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    استناداً إلى أسعار التجار والمحلات المحلية
                  </p>
                </div>
              </button>
              <button
                onClick={() => selectMode('global')}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-right transition-all ${rateMode === 'global' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-border hover:border-blue-300'}`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-bold text-sm">بالسعر العالمي</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    استناداً إلى أسعار الصرف العالمية المباشرة
                  </p>
                </div>
              </button>
            </div>
            <label className="flex items-center gap-2 mt-3 pt-3 border-t border-border cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={e => setRememberChoice(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="text-xs text-muted-foreground">تذكر اختياري (لن يُسأل مجدداً)</span>
            </label>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">

      {/* Rate mode banner */}
      <div className={`flex items-center gap-2 p-3 rounded-2xl border text-xs ${
        rateMode === 'local'
          ? 'border-primary/30 bg-primary/5'
          : 'border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-blue-900/20'
      }`}>
        {rateMode === 'local'
          ? <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          : <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />}
        <span className={`flex-1 font-medium ${rateMode === 'local' ? 'text-primary' : 'text-blue-700 dark:text-blue-300'}`}>
          {rateMode === 'local' ? (
            localMarketSypRate
              ? `السعر المحلي${selectedProvince ? ` · ${selectedProvince}` : ''}${localRateSourceCount > 0 ? ` · ${localRateSourceCount} ${localRateSourceCount === 1 ? 'صرّاف' : 'صرّافين'}` : ''}`
              : 'السعر المحلي (سعر API)'
          ) : 'التحويل بالسعر العالمي'}
        </span>
        <button
          onClick={() => setShowModeModal(true)}
          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-foreground/70"
        >
          تغيير
        </button>
      </div>

      {/* Province selector — local mode only */}
      {rateMode === 'local' && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar" dir="rtl">
          {['', 'دمشق', 'ريف دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 'درعا', 'السويداء', 'الحسكة', 'دير الزور', 'الرقة', 'إدلب'].map(p => (
            <button
              key={p || 'all'}
              onClick={() => setSelectedProvince(p)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                selectedProvince === p
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-secondary/70 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {p || 'الكل'}
            </button>
          ))}
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{t('convertCurrencies')}</h2>
          <LiveBadge />
        </div>

        <div className="flex gap-2 mb-3">
          {(['buy', 'sell'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setBuySellMode(mode)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${buySellMode === mode ? 'bg-primary text-primary-foreground border-primary shadow' : 'bg-background border-border text-foreground/70 dark:text-white'}`}
            >
              {t(mode)}
            </button>
          ))}
        </div>

        <Card className="border-border shadow-sm">
          <CardContent className="p-4 flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-foreground/70 dark:text-white mb-1 block">{t('amount')}</label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="text-lg font-bold h-12"
                dir="ltr"
              />
            </div>

            <div className="flex items-end gap-2">
              <CurrencyPicker value={fromCurrency} onChange={setFromCurrency} currencies={currencies} label={t('from')} />
              <div className="pb-0.5">
                <motion.div animate={{ rotate: isSwapping ? 180 : 0 }} transition={{ duration: 0.3 }}>
                  <button
                    onClick={handleSwap}
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border shadow-sm hover:border-primary/40"
                  >
                    <ArrowUpDown className="w-4 h-4 text-primary" />
                  </button>
                </motion.div>
              </div>
              <CurrencyPicker value={toCurrency} onChange={setToCurrency} currencies={currencies} label={t('to')} />
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 flex flex-col items-center min-h-[90px] justify-center">
              {loadingRates ? (
                <Skeleton className="h-10 w-40" />
              ) : (rateMode === 'local' && localCurrencyFetched && !localMarketSypRate) ? (
                <div className="text-center">
                  <span className="text-base font-bold text-muted-foreground">لم يتم تحديد السعر بعد</span>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">لا توجد أسعار محلية مدخلة من التجار في هذه المنطقة</p>
                </div>
              ) : rawResult > 0 ? (
                <div className="text-center">
                  <span className="text-3xl font-bold text-primary dark:text-white">
                    {formatNum(result, { decimals: toCurrency === 'SYP' ? 0 : 2 })}
                  </span>
                  <span className="text-lg ml-1 font-medium" dir="ltr">{toCurrency}</span>
                  <p className="text-xs text-foreground/60 dark:text-white/70 mt-1 flex items-center justify-center gap-1.5" dir="ltr">
                    1 {fromCurrency} = {formatNum(displayRate, { decimals: toCurrency === 'SYP' ? 0 : 4 })} {toCurrency}
                    {isManualRate && <ManualBadge updatedAt={ratesData?.manual_updated_at ?? undefined} />}
                  </p>
                  <p className="text-[10px] text-accent font-semibold mt-0.5">
                    {language === 'ar' ? `سعر ${buySellMode === 'buy' ? t('buy') : t('sell')}` : `${buySellMode === 'buy' ? t('buy') : t('sell')} rate`}
                  </p>
                </div>
              ) : (
                <span className="text-foreground/70 dark:text-white text-sm">{t('enterAmount')}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Gold Calculator */}
      <section className="mb-4">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-accent" /> {t('goldCalculator')}
        </h2>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 flex flex-col gap-4">
            {/* Weight input */}
            <div>
              <label className="text-xs font-medium text-foreground/70 dark:text-white mb-1.5 block">
                {t('weight')} ({language === 'ar' ? 'غرام' : 'gram'})
              </label>
              <Input
                type="number"
                value={goldWeight}
                onChange={e => setGoldWeight(e.target.value)}
                className="h-12 text-lg font-bold"
                dir="ltr"
              />
            </div>

            {/* Karat pill buttons */}
            <div>
              <label className="text-xs font-medium text-foreground/70 dark:text-white mb-1.5 block">{t('karat')}</label>
              <div className="flex gap-1.5">
                {[14, 18, 21, 22, 24].map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSelectedKarat(k.toString())}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                      selectedKarat === k.toString()
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background border-border text-foreground/70 dark:text-white hover:border-primary/40'
                    }`}
                    dir="ltr"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Gold Buy/Sell toggle */}
            <div className="flex gap-2">
              {(['buy', 'sell'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setGoldBuySellMode(mode)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    goldBuySellMode === mode
                      ? 'bg-primary text-primary-foreground border-primary shadow'
                      : 'bg-background border-border text-foreground/70 dark:text-white hover:border-primary/40'
                  }`}
                >
                  {t(mode)}
                </button>
              ))}
            </div>

            {/* Currency display toggle (SYP/USD) */}
            <div className="flex gap-2">
              {(['SYP', 'USD'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setGoldDisplay(c)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    goldDisplay === c
                      ? 'bg-accent text-white border-accent shadow'
                      : 'bg-background border-border text-foreground/70 dark:text-white hover:border-accent/40'
                  }`}
                >
                  {c === 'SYP'
                    ? (language === 'ar' ? 'ليرة سورية' : 'Syrian Pound')
                    : (language === 'ar' ? 'دولار أمريكي' : 'US Dollar')}
                </button>
              ))}
            </div>

            {/* Result */}
            <div className="bg-secondary/50 rounded-xl p-4 flex flex-col items-center min-h-[90px] justify-center">
              {loadingGold ? (
                <Skeleton className="h-12 w-40" />
              ) : (rateMode === 'local' && localGoldFetched && !localGoldPricePerGram) ? (
                <div className="text-center">
                  <span className="text-base font-bold text-muted-foreground">لم يتم تحديد السعر بعد</span>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">لا توجد أسعار ذهب محلية مدخلة من التجار في هذه المنطقة</p>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-3xl font-bold text-primary dark:text-white">
                    {goldDisplay === 'SYP'
                      ? `${formatNum(goldValue.syp, { decimals: 0 })} ل.س`
                      : `$${formatNum(goldValue.usd, { decimals: 2 })}`}
                  </span>
                  <p className="text-xs text-foreground/60 dark:text-white/70 mt-1">
                    {goldDisplay === 'SYP'
                      ? `≈ $${formatNum(goldValue.usd, { decimals: 2 })}`
                      : `≈ ${formatNum(goldValue.syp, { decimals: 0 })} ل.س`}
                  </p>
                  <p className="text-[10px] text-accent font-semibold mt-0.5">
                    {language === 'ar'
                      ? `سعر ${goldBuySellMode === 'buy' ? 'الشراء' : 'البيع'} — عيار ${selectedKarat}`
                      : `${goldBuySellMode === 'buy' ? 'Buy' : 'Sell'} price — Karat ${selectedKarat}`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </motion.div>
    </>
  );
}
