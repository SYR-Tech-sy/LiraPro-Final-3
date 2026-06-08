import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCw, Search, Bell, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/app-context';
import { useGetExchangeRates } from '@workspace/api-client-react';
import { LiveBadge } from '@/components/live-badge';
import { useUser } from '@/context/auth-context';

import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from 'recharts';

const CRYPTO_IDS = [
  'bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana',
  'ripple', 'usd-coin', 'cardano', 'dogecoin', 'tron',
  'polkadot', 'chainlink', 'litecoin', 'bitcoin-cash', 'stellar',
  'avalanche-2', 'shiba-inu', 'near', 'polygon', 'cosmos',
].join(',');

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  image: string;
  sparkline_in_7d?: { price: number[] };
}

const CRYPTO_NAMES_AR: Record<string, string> = {
  bitcoin: 'بيتكوين', ethereum: 'إيثيريوم', tether: 'تيثر',
  binancecoin: 'باينانس', solana: 'سولانا', ripple: 'ريبل',
  'usd-coin': 'يو إس دي كوين', cardano: 'كاردانو', dogecoin: 'دوجكوين',
  tron: 'ترون', polkadot: 'بولكادوت', chainlink: 'تشينلينك',
  litecoin: 'لايتكوين', 'bitcoin-cash': 'بيتكوين كاش', stellar: 'ستيلر',
  'avalanche-2': 'أفالانش', 'shiba-inu': 'شيبا إينو', near: 'نير بروتوكول',
  polygon: 'بوليغون', cosmos: 'كوزموس',
};

function SparklineChart({ prices, isUp }: { prices: number[]; isUp: boolean }) {
  const data = prices.map((p, i) => ({ i, p }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line type="monotone" dataKey="p" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth={1.5} dot={false} />
        <Tooltip contentStyle={{ display: 'none' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function formatMarketCap(val: number): string {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toFixed(0)}`;
}

function generateSimulatedHistory(basePrice: number, points = 30) {
  const labels = Array.from({ length: points }, (_, i) => `${i + 1}`);
  let price = basePrice * (1 + (Math.random() - 0.5) * 0.1);
  return Array.from({ length: points }, (_, i) => {
    price = price * (1 + (Math.random() - 0.5) * 0.025);
    return { label: labels[i], price: parseFloat(price.toFixed(4)) };
  });
}

function CryptoDetailModal({
  coin,
  usdToSyp,
  onClose,
}: {
  coin: CryptoData;
  usdToSyp: number;
  onClose: () => void;
}) {
  const { formatNum, getBuyRate, getSellRate, t, language } = useApp();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [alertTarget, setAlertTarget] = useState('');
  const [alertType, setAlertType] = useState<'buy' | 'sell'>('buy');
  const [alertSaved, setAlertSaved] = useState(false);

  const chartData = generateSimulatedHistory(
    coin.current_price,
    period === 'daily' ? 24 : period === 'weekly' ? 7 : 30
  );

  const isUp = coin.price_change_percentage_24h >= 0;
  const priceSYP = coin.current_price * usdToSyp;
  const buyPrice = getBuyRate(priceSYP);
  const sellPrice = getSellRate(priceSYP);
  const nameAr = CRYPTO_NAMES_AR[coin.id] ?? coin.name;

  const { getToken } = useUser();

  const handleSaveAlert = async () => {
    if (!alertTarget) return;
    try {
      const tok = await getToken();
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ code: coin.id, nameAr, type: alertType, targetPrice: parseFloat(alertTarget) }),
      });
    } catch { /* ignore */ }
    setAlertSaved(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-md bg-card rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-primary/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full" />
            <div>
              <h3 className="font-bold text-sm">{nameAr}</h3>
              <p className="text-[10px] text-muted-foreground uppercase">{coin.symbol}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-4">
          {/* Price header */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-primary dark:text-white" dir="ltr">
                ${coin.current_price >= 1
                  ? coin.current_price.toLocaleString('en', { maximumFractionDigits: 2 })
                  : coin.current_price.toFixed(5)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatNum(priceSYP, { decimals: 0 })} ل.س</p>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isUp ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-500'}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isUp ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
            </div>
          </div>

          {/* Buy / Sell */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-green-600 font-semibold">{t('buyPrice')}</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-400">{formatNum(buyPrice, { decimals: 0 })}</p>
                <p className="text-[9px] text-green-600/60">ل.س</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-red-500 font-semibold">{t('sellPrice')}</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatNum(sellPrice, { decimals: 0 })}</p>
                <p className="text-[9px] text-red-500/60">ل.س</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart period selector */}
          <div>
            <div className="flex gap-2 mb-2">
              {(['daily', 'weekly', 'monthly'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${period === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                  {t(p)}
                </button>
              ))}
            </div>
            <div className="bg-secondary/30 rounded-xl p-2">
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 8 }} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => [`$${Number(v).toFixed(4)}`, language === 'ar' ? 'السعر' : 'Price']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10 }}
                  />
                  <Line type="monotone" dataKey="price" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Market cap */}
          <div className="flex gap-2 text-xs">
            <div className="flex-1 bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-muted-foreground text-[10px]">{language === 'ar' ? 'القيمة السوقية' : 'Market Cap'}</p>
              <p className="font-bold mt-0.5">{formatMarketCap(coin.market_cap)}</p>
            </div>
            <div className="flex-1 bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-muted-foreground text-[10px]">{language === 'ar' ? 'الحجم 24س' : '24h Volume'}</p>
              <p className="font-bold mt-0.5">{formatMarketCap(coin.total_volume)}</p>
            </div>
          </div>

          {/* Alert section */}
          <div className="border border-border rounded-xl p-3">
            <h4 className="font-bold text-xs flex items-center gap-1.5 mb-3">
              <Bell className="w-3.5 h-3.5 text-accent" /> {t('priceAlert')}
            </h4>
            {alertSaved ? (
              <div className="text-center py-4">
                <Bell className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-bold text-primary text-sm">{t('alertCreated')}</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  {(['buy', 'sell'] as const).map(type => (
                    <button key={type} onClick={() => setAlertType(type)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${alertType === type ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                      {t(type)}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder={`${t('targetPrice')} ($)`}
                  value={alertTarget}
                  onChange={e => setAlertTarget(e.target.value)}
                  className="h-10 mb-3"
                  dir="ltr"
                />
                <button
                  onClick={handleSaveAlert}
                  disabled={!alertTarget}
                  className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {t('createAlert')}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function CryptoPage() {
  const [search, setSearch] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<CryptoData | null>(null);
  const { formatNum, t, language } = useApp();
  const { data: ratesData } = useGetExchangeRates();
  const usdToSyp = ratesData?.usd_to_syp ?? 13500;

  const { data: cryptos = [], isFetching: loading, isError, dataUpdatedAt, refetch } = useQuery<CryptoData[]>({
    queryKey: ['cryptos'],
    queryFn: async () => {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${CRYPTO_IDS}&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=24h`
      );
      if (!res.ok) throw new Error('API error');
      return res.json() as Promise<CryptoData[]>;
    },
    staleTime: 60_000,
  });

  const error = isError ? (language === 'ar' ? 'تعذّر تحميل البيانات. يرجى المحاولة لاحقاً.' : 'Failed to load data. Please try again.') : '';
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const filtered = cryptos.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.symbol.toLowerCase().includes(search.toLowerCase()) ||
    (CRYPTO_NAMES_AR[c.id] ?? '').includes(search)
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('cryptoCurrencies')}</h2>
          {lastUpdated && (
            <p className="text-[10px] text-muted-foreground">
              {t('lastUpdated')}: {lastUpdated.toLocaleTimeString('ar-SY')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge variant="crypto" />
          <button onClick={() => void refetch()} disabled={loading}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'ar' ? 'ابحث عن عملة...' : 'Search currency...'}
          className="pr-9 h-10" />
      </div>

      {error && (
        <div className="text-center text-destructive text-sm p-4 bg-destructive/10 rounded-xl">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-secondary/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((coin, idx) => {
            const isUp = coin.price_change_percentage_24h >= 0;
            const priceSYP = coin.current_price * usdToSyp;
            const sparkPrices = coin.sparkline_in_7d?.price ?? [];
            const displaySpark = sparkPrices.filter((_, i) => i % 8 === 0).slice(-24);

            return (
              <motion.div key={coin.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}>
                <button
                  className="w-full text-right"
                  onClick={() => setSelectedCoin(coin)}
                >
                  <Card className="border-border shadow-sm hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98]">
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Rank + icon */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-10">
                        <span className="text-[9px] text-muted-foreground font-bold">#{idx + 1}</span>
                        <img src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full" />
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm leading-none">{CRYPTO_NAMES_AR[coin.id] ?? coin.name}</p>
                          <span className="text-[9px] uppercase font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                            {coin.symbol}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatMarketCap(coin.market_cap)}</p>
                        <p className="text-[10px] text-primary font-medium">{formatNum(priceSYP, { decimals: 0 })} ل.س</p>
                      </div>

                      {/* Sparkline */}
                      {displaySpark.length > 4 && (
                        <div className="w-16 flex-shrink-0">
                          <SparklineChart prices={displaySpark} isUp={isUp} />
                        </div>
                      )}

                      {/* Price + change */}
                      <div className="text-left flex-shrink-0 min-w-[70px]">
                        <p className="font-bold text-sm" dir="ltr">
                          ${coin.current_price >= 1
                            ? coin.current_price.toLocaleString('en', { maximumFractionDigits: 2 })
                            : coin.current_price.toFixed(5)}
                        </p>
                        <div className={`flex items-center justify-end gap-0.5 mt-0.5 ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span className="text-xs font-bold">
                            {isUp ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selectedCoin && (
          <CryptoDetailModal
            coin={selectedCoin}
            usdToSyp={usdToSyp}
            onClose={() => setSelectedCoin(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
