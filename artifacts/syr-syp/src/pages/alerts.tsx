import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash2, Edit3, X, Check, Plus, Lock, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/app-context';
import { Link } from 'wouter';
import { useUser } from '@/context/auth-context';
import {
  useGetAlerts,
  useDeleteAlert,
  useUpdateAlert,
} from '@workspace/api-client-react';
import type { PriceAlert, UpdateAlertBody } from '@workspace/api-client-react';

const CODE_DISPLAY: Record<string, string> = {
  USD: 'دولار أمريكي', EUR: 'يورو', TRY: 'ليرة تركية', GBP: 'جنيه إسترليني',
  SYP: 'الليرة السورية', AED: 'درهم إماراتي', SAR: 'ريال سعودي',
  GOLD_24: 'ذهب عيار 24', GOLD_22: 'ذهب عيار 22', GOLD_21: 'ذهب عيار 21',
  GOLD_18: 'ذهب عيار 18', GOLD_14: 'ذهب عيار 14',
  XAU: 'الذهب', XAG: 'الفضة', XPT: 'البلاتين', XPD: 'البلاديوم',
};

function getCodeIcon(code: string): string {
  if (code.startsWith('GOLD_')) return '🥇';
  if (code === 'XAU') return '🥇';
  if (code === 'XAG') return '🥈';
  if (code === 'XPT') return '💎';
  if (code === 'XPD') return '✨';
  if (code === 'SYP') return '🇸🇾';
  const cc = code.substring(0, 2).toUpperCase();
  try { return String.fromCodePoint(...cc.split('').map(c => 127397 + c.charCodeAt(0))); }
  catch { return '💱'; }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

interface EditModalProps {
  alert: PriceAlert;
  onSave: (id: number, data: UpdateAlertBody) => void;
  onClose: () => void;
  formatNum: (v: number, o?: { decimals?: number }) => string;
  t: (k: string) => string;
  loading: boolean;
}

function EditAlertModal({ alert, onSave, onClose, formatNum: _formatNum, t, loading }: EditModalProps) {
  const [target, setTarget] = useState(alert.targetPrice.toString());
  const [type, setType] = useState<'buy' | 'sell'>(alert.type as 'buy' | 'sell');

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-sm bg-card rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-primary" /> تعديل التنبيه
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3">
            <span className="text-2xl">{getCodeIcon(alert.code)}</span>
            <div>
              <p className="font-bold">{CODE_DISPLAY[alert.code] ?? alert.nameAr ?? alert.code}</p>
              <p className="text-xs text-muted-foreground">تنبيه سعر</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">{t('priceType')}</p>
            <div className="flex gap-2">
              {(['buy', 'sell'] as const).map(tp => (
                <button key={tp} onClick={() => setType(tp)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${type === tp ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
                  {tp === 'buy' ? t('buyPrice') : t('sellPrice')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">{t('targetPrice')} (ل.س)</p>
            <Input type="number" value={target} onChange={e => setTarget(e.target.value)} className="h-12 text-lg" dir="ltr" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>إلغاء</Button>
            <Button
              className="flex-1"
              disabled={!target || loading}
              onClick={() => {
                if (!target) return;
                onSave(alert.id, { type, targetPrice: parseFloat(target) });
              }}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 ml-1" />}
              حفظ
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AlertsPage() {
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const { formatNum, t } = useApp();
  const { isSignedIn } = useUser();

  const { data: alertsRaw, isLoading, refetch } = useGetAlerts({ query: { staleTime: 0, refetchOnMount: true } });
  const alerts: PriceAlert[] = (alertsRaw as PriceAlert[] | undefined) ?? [];

  const deleteMutation = useDeleteAlert({
    mutation: { onSuccess: () => refetch() },
  });

  const updateMutation = useUpdateAlert({
    mutation: {
      onSuccess: () => {
        setEditingAlert(null);
        refetch();
      },
    },
  });

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">تسجيل الدخول مطلوب</h2>
        <p className="text-sm text-muted-foreground mb-6">سجّل دخولك للوصول إلى ميزة التنبيهات وحفظ تنبيهاتك</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/sign-in"><Button className="w-full h-11" size="lg">تسجيل الدخول</Button></Link>
          <Link href="/sign-up"><Button variant="outline" className="w-full h-11" size="lg">إنشاء حساب جديد</Button></Link>
        </div>
      </div>
    );
  }

  const pendingAlerts = alerts.filter(a => !a.isTriggered);
  const triggeredAlerts = alerts.filter(a => a.isTriggered);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-bold">إدارة التنبيهات</h2>
          </div>
          <button onClick={() => refetch()} className="p-1.5 rounded-full hover:bg-secondary transition-colors" title="تحديث">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <Bell className="w-10 h-10 opacity-30" />
            </div>
            <div>
              <p className="font-medium text-base">لا توجد تنبيهات بعد</p>
              <p className="text-xs mt-1">انتقل إلى تفاصيل أي عملة أو معدن أو فئة لإضافة تنبيه</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Link href="/app/currencies"><Button variant="outline" className="w-full gap-2"><Plus className="w-4 h-4" /> تنبيه على عملة</Button></Link>
              <Link href="/app/metals"><Button variant="outline" className="w-full gap-2"><Plus className="w-4 h-4" /> تنبيه على معدن</Button></Link>
              <Link href="/app/home?highlight=cats"><Button variant="outline" className="w-full gap-2"><Plus className="w-4 h-4" /> تنبيه على فئة</Button></Link>
            </div>
          </div>
        ) : (
          <>
            {/* Triggered alerts */}
            {triggeredAlerts.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-green-600 px-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {triggeredAlerts.length} تنبيه تحقّق!
                </p>
                <AnimatePresence mode="popLayout">
                  {triggeredAlerts.map(alert => (
                    <motion.div key={alert.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, height: 0 }}>
                      <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 shadow-sm">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-lg flex-shrink-0">
                            {getCodeIcon(alert.code)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="font-bold text-sm truncate">{CODE_DISPLAY[alert.code] ?? alert.nameAr ?? alert.code}</p>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                                ✓ تحقّق
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              السعر المستهدف: <span className="font-bold text-foreground">{formatNum(alert.targetPrice, { decimals: 0 })} ل.س</span>
                            </p>
                            {alert.triggeredAt && (
                              <p className="text-[9px] text-green-600 mt-0.5">تحقّق في: {formatDate(alert.triggeredAt)}</p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteMutation.mutate({ id: alert.id })}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Pending alerts */}
            {pendingAlerts.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground px-1">{pendingAlerts.length} تنبيه نشط</p>
                <AnimatePresence mode="popLayout">
                  {pendingAlerts.map(alert => (
                    <motion.div key={alert.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, height: 0 }}>
                      <Card className="border-border shadow-sm">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-lg flex-shrink-0">
                            {getCodeIcon(alert.code)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="font-bold text-sm truncate">{CODE_DISPLAY[alert.code] ?? alert.nameAr ?? alert.code}</p>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${alert.type === 'buy' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                {alert.type === 'buy' ? 'شراء' : 'بيع'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              السعر المستهدف: <span className="font-bold text-foreground">{formatNum(alert.targetPrice, { decimals: 0 })} ل.س</span>
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{formatDate(alert.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => setEditingAlert(alert)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                              <Edit3 className="w-4 h-4 text-primary" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate({ id: alert.id })}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Add alert links */}
        {alerts.length > 0 && (
          <div className="flex gap-2 mt-2">
            <Link href="/app/currencies" className="flex-1">
              <Button variant="outline" className="w-full gap-2 text-xs"><Plus className="w-3.5 h-3.5" /> عملة</Button>
            </Link>
            <Link href="/app/metals" className="flex-1">
              <Button variant="outline" className="w-full gap-2 text-xs"><Plus className="w-3.5 h-3.5" /> معدن</Button>
            </Link>
            <Link href="/app/home?highlight=cats" className="flex-1">
              <Button variant="outline" className="w-full gap-2 text-xs"><Plus className="w-3.5 h-3.5" /> فئة</Button>
            </Link>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {editingAlert && (
          <EditAlertModal
            alert={editingAlert}
            onSave={(id, data) => updateMutation.mutate({ id, data })}
            onClose={() => setEditingAlert(null)}
            formatNum={formatNum}
            t={t}
            loading={updateMutation.isPending}
          />
        )}
      </AnimatePresence>
    </>
  );
}
