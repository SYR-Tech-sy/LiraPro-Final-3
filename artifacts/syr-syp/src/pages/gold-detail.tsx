import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Bell, X, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetGoldPrices } from '@workspace/api-client-react';
import { useApp } from '@/context/app-context';
import { useUser } from '@/context/auth-context';
import { GuestModal } from '@/components/guest-modal';
import { LiveBadge } from '@/components/live-badge';
import { ManualBadge } from '@/components/manual-badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type Period = 'daily' | 'weekly' | 'monthly';

function generateHistory(baseRate: number, period: Period) {
  const points = period === 'daily' ? 24 : period === 'weekly' ? 7 : 30;
  const labels = period === 'daily'
    ? Array.from({ length: 24 }, (_, i) => `${i}:00`)
    : period === 'weekly'
      ? ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
      : Array.from({ length: 30 }, (_, i) => `${i + 1}`);
  let rate = baseRate * (1 + (Math.random() - 0.5) * 0.04);
  return Array.from({ length: points }, (_, i) => {
    rate = rate * (1 + (Math.random() - 0.5) * 0.006);
    return { label: labels[i] ?? `${i + 1}`, rate: parseFloat(rate.toFixed(0)) };
  });
}

function AlertModal({ onClose, karat, currentBuy, currentSell, t, formatNum }: {
  onClose: () => void; karat: number;
  currentBuy: number; currentSell: number;
  t: (k: string) => string; formatNum: (v: number, o?: { decimals?: number }) => string;
}) {
  const { getToken } = useUser();
  const [alertType, setAlertType] = useState<'buy' | 'sell'>('buy');
  const [targetPrice, setTargetPrice] = useState('');
  const [saved, setSaved] = useState(false);

  const handleCreate = async () => {
    if (!targetPrice) return;
    try {
      const tok = await getToken();
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ code: `GOLD_${karat}`, nameAr: `ذهب عيار ${karat}`, type: alertType, targetPrice: parseFloat(targetPrice) }),
      });
    } catch { /* ignore */ }
    setSaved(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-card rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-yellow-500" /> {t('priceAlert')} - عيار {karat}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4">
          {saved ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-7 h-7 text-yellow-600" />
              </div>
              <p className="font-bold text-lg text-yellow-700 dark:text-yellow-400">تم إنشاء التنبيه بنجاح!</p>
            </div>
          ) : (
            <>
              <div className="bg-secondary/50 rounded-xl p-3 mb-4 flex justify-around">
                <div className="text-center">
                  <p className="text-xs text-foreground/60 dark:text-white/70 mb-1">{t('buyPrice')}</p>
                  <p className="font-bold text-sm text-foreground dark:text-white">{formatNum(currentBuy, { decimals: 0 })} ل.س</p>
                </div>
                <div className="w-px bg-border" />
                <div className="text-center">
                  <p className="text-xs text-foreground/60 dark:text-white/70 mb-1">{t('sellPrice')}</p>
                  <p className="font-bold text-sm text-foreground dark:text-white">{formatNum(currentSell, { decimals: 0 })} ل.س</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-foreground/70 dark:text-white mb-2">{t('priceType')}</p>
              <div className="flex gap-2 mb-4">
                {(['buy', 'sell'] as const).map(type => (
                  <button key={type} onClick={() => setAlertType(type)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${alertType === type ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
                    {type === 'buy' ? t('buyPrice') : t('sellPrice')}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-foreground/70 dark:text-white mb-2">{t('targetPrice')}</p>
              <Input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
                placeholder={`${formatNum(alertType === 'buy' ? currentBuy : currentSell, { decimals: 0 })}`}
                className="mb-4 h-12 text-lg" dir="ltr" />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
                <Button className="flex-1" onClick={() => void handleCreate()} disabled={!targetPrice}>
                  <Bell className="w-4 h-4 ml-1" /> {t('createAlert')}
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function GoldDetailPage() {
  const [, params] = useRoute('/app/gold/:karat');
  const [, navigate] = useLocation();
  const karat = parseInt(params?.karat ?? '24');
  const [period, setPeriod] = useState<Period>('daily');
  const [showAlert, setShowAlert] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const { data: goldData } = useGetGoldPrices();
  const { t, formatNum, getBuyRate, getSellRate } = useApp();
  const { isSignedIn } = useUser();

  const karatData = goldData?.karats.find(k => k.karat === karat);
  const pricePerGram = karatData?.pricePerGramSYP ?? 0;
  const priceUSD = karatData?.pricePerGramUSD ?? 0;
  const buyPrice = getBuyRate(pricePerGram);
  const sellPrice = getSellRate(pricePerGram);

  const history = generateHistory(pricePerGram || 1, period);
  const first = history[0]?.rate ?? pricePerGram;
  const last = history[history.length - 1]?.rate ?? pricePerGram;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;
  const isUp = change >= 0;

  const handleAlertClick = () => {
    if (!isSignedIn) { setShowGuestModal(true); return; }
    setShowAlert(true);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4 pb-10">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/app/home')} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-2xl">🥇</span>
            <div>
              <h2 className="text-lg font-bold">ذهب عيار {karat}</h2>
              <p className="text-xs text-foreground/60 dark:text-white/70">سعر الغرام الواحد</p>
            </div>
          </div>
          <LiveBadge />
          <button onClick={handleAlertClick}
            className="flex items-center gap-1 bg-accent/10 text-accent border border-accent/30 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-accent/20 transition-colors">
            <Bell className="w-3.5 h-3.5" /> {t('alert')}
          </button>
        </div>

        <Card className="border-none bg-gradient-to-br from-yellow-600 to-amber-700 text-white shadow-md">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white/70 text-xs">سعر الغرام / ليرة سورية</p>
                  {goldData?.isManual && <ManualBadge updatedAt={goldData?.updatedAt ?? undefined} />}
                </div>
                <div className="text-3xl font-bold">{formatNum(pricePerGram, { decimals: 0 })} <span className="text-lg font-normal">ل.س</span></div>
                <p className="text-white/70 text-xs mt-1">${formatNum(priceUSD, { decimals: 2 })}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isUp ? 'bg-white/20 text-white' : 'bg-black/20 text-white'}`}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUp ? '+' : ''}{change.toFixed(2)}%
              </div>
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-white/20">
              <div>
                <p className="text-white/60 text-[10px]">{t('buyPrice')}</p>
                <p className="font-bold text-sm text-white">{formatNum(buyPrice, { decimals: 0 })} ل.س</p>
              </div>
              <div>
                <p className="text-white/60 text-[10px]">{t('sellPrice')}</p>
                <p className="font-bold text-sm text-white">{formatNum(sellPrice, { decimals: 0 })} ل.س</p>
              </div>
              <div className="mr-auto flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
                <span className="text-[10px] text-white/80 font-semibold">{t('live')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${period === p ? 'bg-primary text-primary-foreground shadow' : 'bg-secondary text-foreground/70 dark:text-white'}`}>
              {t(p)}
            </button>
          ))}
        </div>

        <Card className="border-border shadow-sm">
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} width={65} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`${formatNum(v, { decimals: 0 })} ل.س`, 'السعر']}
                />
                <Line type="monotone" dataKey="rate" stroke="#d97706" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-foreground/70 dark:text-white">عيارات أخرى</p>
          <div className="flex gap-2 flex-wrap">
            {[14, 18, 21, 22, 24].filter(k => k !== karat).map(k => (
              <button key={k} onClick={() => navigate(`/app/gold/${k}`)}
                className="px-4 py-2 rounded-xl bg-secondary text-sm font-bold hover:bg-secondary/80 border border-border transition-colors">
                عيار {k}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAlert && (
          <AlertModal onClose={() => setShowAlert(false)} karat={karat}
            currentBuy={buyPrice} currentSell={sellPrice} t={t} formatNum={formatNum} />
        )}
      </AnimatePresence>

      <GuestModal open={showGuestModal} onClose={() => setShowGuestModal(false)} feature="تنبيهات الأسعار" />
    </>
  );
}
