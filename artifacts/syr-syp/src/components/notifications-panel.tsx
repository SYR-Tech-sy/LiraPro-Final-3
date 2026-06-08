import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, BellOff, Info, AlertTriangle, CheckCircle, TrendingUp, ShieldCheck, Trash2 } from 'lucide-react';
import { AdminBadge, RainbowBadge } from './golden-badge';
import { useCheckAlerts } from '@workspace/api-client-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth, useUser } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { playAlertChime } from '@/hooks/use-alert-sound';

interface Notification {
  id: number;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'price';
  icon: string;
  createdAt: string;
  sender?: string;
}

const TYPE_STYLE: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  info:    { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-800',   icon: <Info className="w-4 h-4 text-blue-500" /> },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
  success: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
  price:   { bg: 'bg-primary/5',                      border: 'border-primary/20',                       icon: <TrendingUp className="w-4 h-4 text-primary" /> },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.floor(h / 24)} ي`;
}

const READ_KEY = 'syp-notifications-read';
const LOCAL_KEY = 'syp-local-notifications-v2';
const WELCOME_KEY = 'syp-welcome-notif-v4';
const DISMISSED_KEY = 'syp-notifications-dismissed-v1';

function getReadIds(): Set<number> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function markRead(ids: number[]): void {
  const existing = getReadIds();
  ids.forEach(id => existing.add(id));
  localStorage.setItem(READ_KEY, JSON.stringify([...existing]));
}

function getDismissedIds(): Set<number> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function addDismissedIds(ids: number[]): void {
  const existing = getDismissedIds();
  ids.forEach(id => existing.add(id));
  const arr = [...existing].slice(-300);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
}

function getLocalNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addLocalNotification(n: Notification) {
  const existing = getLocalNotifications();
  if (existing.some(e => e.id === n.id)) return;
  existing.unshift(n);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(existing.slice(0, 30)));
}

function getOrCreateWelcomeNotification(): Notification[] {
  if (localStorage.getItem(WELCOME_KEY)) return [];
  const welcome: Notification = {
    id: 1000000004,
    title: '🎉 مرحباً بك في LiraPro',
    body: 'منصتك الشاملة لأسعار الصرف والذهب والمعادن الثمينة. أضف تنبيهات أسعار من تفاصيل أي عملة أو معدن وسيصلك إشعار فوري عند تحقق السعر.',
    type: 'success',
    icon: 'welcome',
    sender: 'LiraPro',
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(WELCOME_KEY, '1');
  return [welcome];
}

// Call this hook from any page that has live exchange rates to auto-check user alerts
export function useAlertChecker(rates: Record<string, number> | undefined) {
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();
  const { mutateAsync: checkAlerts } = useCheckAlerts();
  const lastCheckedRef = useRef<number>(0);

  useEffect(() => {
    if (!isSignedIn || !rates || Object.keys(rates).length === 0) return;
    const now = Date.now();
    if (now - lastCheckedRef.current < 5 * 60 * 1000) return;
    lastCheckedRef.current = now;

    checkAlerts({ data: { rates } })
      .then(triggered => {
        if (triggered.length === 0) return;
        queryClient.invalidateQueries({ queryKey: ['getAlerts'] });
        for (const alert of triggered) {
          playAlertChime();
          const direction = alert.type === 'buy' ? '🔽' : '🔼';
          const title = `${direction} تنبيه سعر: ${alert.code}`;
          const body = `وصل سعر ${alert.nameAr ?? alert.code} إلى ${alert.targetPrice.toLocaleString('ar-SY')} ل.س — السعر المستهدف تحقّق!`;
          addLocalNotification({
            id: Date.now() + alert.id,
            title,
            body,
            type: 'price',
            icon: 'trending',
            createdAt: new Date().toISOString(),
          });
          document.dispatchEvent(new CustomEvent('syp-notification', { detail: { title, body, type: 'price' } }));
        }
      })
      .catch(() => {});
  }, [rates, isSignedIn, checkAlerts, queryClient]);
}

function SenderBadge({ sender }: { sender: string }) {
  const isLira = sender === 'LiraPro';
  const isTeam = sender === 'فريق LiraPro';
  const isAdminSender = isLira || isTeam;

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      {isAdminSender ? (
        <div className="flex-shrink-0">
          {isLira ? <RainbowBadge size={16} /> : <AdminBadge size={16} />}
        </div>
      ) : (
        <ShieldCheck className="w-3.5 h-3.5 text-[#003C32] flex-shrink-0" />
      )}
      <span className="text-[11px] font-black text-[#003C32] dark:text-emerald-400 leading-none">{sender}</span>
    </div>
  );
}

async function fetchNotificationsData(userId?: string, token?: string): Promise<Notification[]> {
  const walletId = userId ?? localStorage.getItem('syp-wallet-id') ?? undefined;
  const adminMsgs: Notification[] = (() => {
    try {
      if (!walletId) return [];
      const raw = localStorage.getItem(`syp-admin-messages-${walletId}`);
      if (!raw) return [];
      const msgs = JSON.parse(raw) as Array<{ id: number; title: string; body: string; type: string; createdAt: string }>;
      return msgs.map(m => ({
        id: m.id, title: m.title, body: m.body,
        type: (m.type ?? 'info') as Notification['type'],
        icon: 'admin', createdAt: m.createdAt, sender: 'LiraPro',
      }));
    } catch { return []; }
  })();
  let serverUserMsgs: Notification[] = [];
  if (walletId && token) {
    try {
      const userRes = await fetch(`/api/notifications/user?walletId=${encodeURIComponent(walletId)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (userRes.ok) serverUserMsgs = await userRes.json() as Notification[];
    } catch { /* ignore */ }
  }
  try {
    const res = await fetch('/api/notifications');
    if (!res.ok) return [...serverUserMsgs, ...getOrCreateWelcomeNotification(), ...getLocalNotifications(), ...adminMsgs];
    const remote: Notification[] = await res.json();
    const welcome = getOrCreateWelcomeNotification();
    const local = getLocalNotifications();
    const remoteIds = new Set(remote.map(n => n.id));
    const seen = new Set<number>();
    const extras = [...serverUserMsgs, ...welcome, ...local, ...adminMsgs].filter(w => {
      if (remoteIds.has(w.id) || seen.has(w.id)) return false;
      seen.add(w.id); return true;
    });
    const dismissed = getDismissedIds();
    return [...extras, ...remote]
      .filter(n => !dismissed.has(n.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
  } catch {
    return [...serverUserMsgs, ...getOrCreateWelcomeNotification(), ...getLocalNotifications(), ...adminMsgs];
  }
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(getReadIds);
  const panelRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      try { localStorage.setItem('syp-wallet-id', user.id); } catch { /**/ }
    }
  }, [user?.id]);

  const { data: notifications = getOrCreateWelcomeNotification() } = useQuery({
    queryKey: ['user-notifications', user?.id],
    queryFn: async () => {
      const token = user?.id ? await getToken().catch(() => undefined) : undefined;
      return fetchNotificationsData(user?.id, token ?? undefined);
    },
    refetchInterval: 8_000,
    staleTime: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const local = getLocalNotifications();
      if (local.length > 0) {
        void queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] });
      }
    }, 8_000);
    return () => clearInterval(interval);
  }, [queryClient, user?.id]);

  useEffect(() => {
    function handleSseNotification(e: Event) {
      const detail = (e as CustomEvent<{ title?: string; body?: string; type?: string }>).detail;
      void queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] });
      if (detail?.title) {
        toast({
          title: detail.title,
          description: detail.body ?? undefined,
          duration: 5000,
        });
      }
    }
    document.addEventListener('syp-notification', handleSseNotification);
    return () => document.removeEventListener('syp-notification', handleSseNotification);
  }, [queryClient, user?.id, toast]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const prevUnreadRef = useRef(0);
  const [badgePulse, setBadgePulse] = useState(false);
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBadgePulse(true);
      const t = setTimeout(() => setBadgePulse(false), 800);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unreadCount;
    return undefined;
  }, [unreadCount]);

  function handleOpen() {
    setOpen(o => !o);
    if (!open && unreadCount > 0) {
      const allIds = notifications.map(n => n.id);
      markRead(allIds);
      setReadIds(new Set(allIds));
      void queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] });
      const walletId = user?.id ?? localStorage.getItem('syp-wallet-id');
      if (walletId) {
        // Mark each unread notification as viewed — include auth token for ownership verification
        getToken().then(tok => {
          for (const n of notifications) {
            if (!readIds.has(n.id)) {
              fetch(`/api/notifications/${n.id}/view`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
                },
                body: JSON.stringify({ walletId }),
              }).catch(() => {});
            }
          }
        }).catch(() => {});
      }
    }
  }

  async function handleClearAll() {
    const allIds = notifications.map(n => n.id);
    addDismissedIds(allIds);
    markRead(allIds);
    localStorage.removeItem(LOCAL_KEY);
    setReadIds(new Set(allIds));
    queryClient.setQueryData<Notification[]>(['user-notifications', user?.id], []);
    const walletId = user?.id ?? localStorage.getItem('syp-wallet-id');
    if (walletId) {
      try {
        const tok = await getToken();
        await fetch(`/api/notifications/user/${encodeURIComponent(walletId)}/all`, {
          method: 'DELETE',
          headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        });
      } catch { /* ignore */ }
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-full hover:bg-secondary transition-colors"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5 text-foreground" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={badgePulse ? { scale: [1, 1.5, 1], transition: { duration: 0.4 } } : { scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 rounded-full bg-[#D20073] text-white text-[9px] font-bold flex items-center justify-center px-1 shadow"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="absolute right-0 top-9 w-[340px] max-w-[calc(100vw-1rem)] bg-card border border-border rounded-2xl shadow-2xl z-[200] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">الإشعارات</h3>
                {unreadCount > 0 && (
                  <span className="text-[9px] bg-[#D20073] text-white rounded-full px-1.5 py-0.5 font-bold">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="مسح جميع الإشعارات"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    مسح الكل
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-secondary">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                  <BellOff className="w-10 h-10 opacity-20" />
                  <p className="text-sm">لا توجد إشعارات</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {notifications.map(n => {
                    const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.info;
                    const isRead = readIds.has(n.id);
                    return (
                      <div key={n.id} className={`px-4 py-3.5 flex gap-3 transition-colors ${!isRead ? 'bg-accent/5' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${style.bg} border ${style.border}`}>
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <p className={`text-sm font-bold leading-tight ${!isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {n.title}
                            </p>
                            {!isRead && <span className="w-2 h-2 rounded-full bg-[#D20073] flex-shrink-0 mt-1.5" />}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                          {n.sender && <SenderBadge sender={n.sender} />}
                          <p className="text-[10px] text-muted-foreground/60 mt-1.5">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Legacy hook for backward compatibility
export function useAutoNotifications(usdToSyp: number) {
  const prevRef = useRef<number | null>(null);
  useEffect(() => {
    if (!usdToSyp || usdToSyp === 0) return;
    const prev = prevRef.current;
    if (prev !== null && Math.abs(usdToSyp - prev) / prev > 0.005) {
      const direction = usdToSyp > prev ? '🔼' : '🔽';
      addLocalNotification({
        id: Date.now(),
        title: `${direction} تحديث سعر الصرف`,
        body: `الدولار الآن: ${usdToSyp.toLocaleString('ar-SY')} ل.س (${usdToSyp > prev ? '+' : ''}${((usdToSyp - prev) / prev * 100).toFixed(2)}%)`,
        type: 'price',
        icon: 'trending',
        createdAt: new Date().toISOString(),
      });
    }
    prevRef.current = usdToSyp;
  }, [usdToSyp]);
}
