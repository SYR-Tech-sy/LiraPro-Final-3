import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Send, Bell, Trash2, RefreshCw, LogIn, Edit3, X, Users,
  AlertTriangle, TrendingUp, Settings, Eye, EyeOff, DollarSign, Star,
  Check, UserCheck, FileX, Building2, User, CheckCircle2, XCircle, Plus, Loader2,
  Phone, Mail, MapPin, Ban, Search, Activity, Globe, Database, Save,
  LayoutDashboard, MessageSquare, Clock, BarChart2, ChevronDown, ChevronRight,
  ChevronUp, Unlock, CalendarDays, Hash, Info, Wifi, BadgeCheck,
  ShieldCheck, MessageCircle, AlertOctagon, Coins as CoinsIcon, Tag, Timer, Mic,
  Image as ImageIcon, Paperclip, LifeBuoy, TicketCheck, Flag,
  ThumbsUp, ThumbsDown, Sparkles, UserX, Smartphone,
  PersonStanding, Store, Inbox, ClipboardList, ClipboardCheck,
  Megaphone, Radio,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetExchangeRates, useGetGoldPrices } from '@workspace/api-client-react';
import { AdminBadge, RainbowBadge, GoldenBadge, BlueBadge, ChatBadge } from '@/components/golden-badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_TOKEN_KEY = 'syp-admin-token';
const DEFAULT_TOKEN = 'SYRSYP2026ADMIN';
const MAIN_CURRENCIES = ['USD', 'EUR', 'TRY', 'GBP', 'SAR', 'AED', 'EGP', 'IQD', 'KWD', 'QAR', 'JOD', 'LBP'];
const CURRENCY_NAMES: Record<string, string> = {
  USD: 'دولار أمريكي', EUR: 'يورو', TRY: 'ليرة تركية', GBP: 'جنيه إسترليني',
  SAR: 'ريال سعودي', AED: 'درهم إماراتي', EGP: 'جنيه مصري', IQD: 'دينار عراقي',
  KWD: 'دينار كويتي', QAR: 'ريال قطري', JOD: 'دينار أردني', LBP: 'ليرة لبنانية',
};

const TABS = [
  { id: 'dashboard', label: 'لوحة', icon: LayoutDashboard },
  { id: 'analytics', label: 'التحليلات', icon: BarChart2 },
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'vendors', label: 'التجار', icon: Building2 },
  { id: 'categories', label: 'الفئات', icon: Tag },
  { id: 'applications', label: 'الطلبات', icon: FileX },
  { id: 'requests', label: 'الحذف/التوثيق', icon: Trash2 },
  { id: 'support', label: 'الدعم', icon: MessageCircle },
  { id: 'tickets', label: 'التذاكر', icon: LifeBuoy },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'messages', label: 'الرسائل', icon: MessageSquare },
  { id: 'system', label: 'النظام', icon: Settings },
  { id: 'suspicious', label: 'مشبوه', icon: AlertTriangle },
];

const VENDOR_CATEGORIES_AR: Record<string, string> = {
  currency: 'العملات والصرافة', gold: 'الذهب والمجوهرات', fuel: 'المحروقات',
  construction: 'مواد البناء', agriculture: 'المحاصيل الزراعية', vegetables: 'الخضار والفواكه',
  food: 'المواد الغذائية', feed: 'الأعلاف والثروة الحيوانية', meat: 'اللحوم',
  oils: 'الزيوت', metals: 'المعادن', transport: 'النقل والشحن',
  electronics: 'الأجهزة والإلكترونيات',
  local_market: 'الأسواق المحلية', crypto: 'الكريبتو والعملات الرقمية',
};

const APP_CATEGORIES = [
  { id: 'currency', label: 'العملات والصرافة' }, { id: 'gold', label: 'الذهب والمجوهرات' },
  { id: 'fuel', label: 'المحروقات' }, { id: 'construction', label: 'مواد البناء' },
  { id: 'agriculture', label: 'المحاصيل الزراعية' }, { id: 'vegetables', label: 'الخضار والفواكه' },
  { id: 'food', label: 'المواد الغذائية' }, { id: 'feed', label: 'الأعلاف والثروة الحيوانية' },
  { id: 'meat', label: 'اللحوم' }, { id: 'oils', label: 'الزيوت' },
  { id: 'metals', label: 'المعادن' },
  { id: 'transport', label: 'النقل والشحن' }, { id: 'electronics', label: 'الأجهزة والإلكترونيات' },
  { id: 'local_market', label: 'الأسواق المحلية' }, { id: 'crypto', label: 'الكريبتو والعملات الرقمية' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  privateUsers: number;
  providers: number;
  bannedUsers: number;
  activeUsers: number;
  pendingRequests: number;
  handledRequests: number;
  totalVisits: number;
  todayVisits: number;
}

interface RegisteredUser {
  id: string;
  walletId: string;
  supabaseId?: string;
  accountType: 'private' | 'provider';
  ispType?: string;
  fullName?: string;
  businessName?: string;
  fatherName?: string;
  gender?: string;
  address?: string;
  phone?: string;
  email?: string;
  dob?: string;
  province?: string;
  city?: string;
  coverageAreas?: string[];
  registeredAt: string;
  lastSeen?: string;
  hasPIN?: boolean;
  banned?: boolean;
  banReason?: string;
  bannedAt?: string;
  restricted?: boolean;
  restrictedUntil?: string;
  softDeleted?: boolean;
  profilePhoto?: string | null;
  lastIp?: string | null;
  lastDevice?: string | null;
  lastSeenVia?: string | null;
}

interface DeletionRequest {
  id: string;
  walletId?: string;
  fullName?: string;
  email?: string;
  accountType?: string;
  reason?: string;
  status: 'pending' | 'handled' | 'rejected';
  requestedAt: string;
  handledAt?: string;
}

interface BuySellOverride {
  code: string;
  buyPrice?: number;
  sellPrice?: number;
  updatedAt?: string;
}

interface SypNotification {
  id: number;
  title: string;
  body: string;
  type: string;
  sender?: string;
  recipient?: 'all' | 'specific';
  targetName?: string;
  targetWalletId?: string;
  createdAt: string;
}

interface VerifyRequest {
  id: string;
  supabaseId: string;
  lphId: string;
  fullName: string;
  email: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
}

const GOVERNORATES = ['إدلب','دمشق','ريف دمشق','حلب','حمص','حماة','اللاذقية','طرطوس','دير الزور','الرقة','الحسكة','درعا','السويداء','القنيطرة'];

// ─── AdminSelect ──────────────────────────────────────────────────────────────

function AdminSelect({ value, onChange, options, placeholder, className }: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className ?? ''}`} style={{ isolation: 'isolate' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all hover:bg-secondary/30"
      >
        <span className={selected ? 'text-foreground font-medium' : 'text-muted-foreground text-sm'}>
          {selected ? selected.label : (placeholder ?? 'اختر...')}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-1 w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{ zIndex: 9999 }}
          >
            <div className="max-h-64 overflow-y-auto py-1">
              {options.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full text-right px-4 py-2.5 text-sm transition-colors hover:bg-secondary/60 ${
                    value === o.value ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

function StatCard({ label, value, icon: Icon, color, sub, onClick }: { label: string; value: string | number; icon: React.ElementType; color: string; sub?: string; onClick?: () => void }) {
  return (
    <Card
      className={`border-none shadow-md overflow-hidden ${onClick ? 'cursor-pointer transition-transform active:scale-95 hover:shadow-lg' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="p-4 flex flex-col gap-1" style={{ background: color + '12' }}>
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
              <Icon className="w-4.5 h-4.5" style={{ color, width: 18, height: 18 }} />
            </div>
            <span className="text-[10px] text-foreground/50 dark:text-white/50">{label}</span>
          </div>
          <p className="text-2xl font-black mt-1" style={{ color }}>{value}</p>
          {sub && <p className="text-[10px] text-foreground/50 dark:text-white/50">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Login Gate ───────────────────────────────────────────────────────────────

function LoginGate({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!token.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'X-Admin-Token': token.trim() },
      });
      if (res.ok) {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
        onLogin(token.trim());
      } else {
        setError('كلمة السر غير صحيحة');
      }
    } catch {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary to-primary/80" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">لوحة التحكم</h1>
          <p className="text-white/60 text-sm mt-1">LiraPro Admin Panel</p>
        </div>
        <Card className="border-none shadow-2xl">
          <CardContent className="p-6 flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-foreground/60 mb-2 block">كلمة سر المدير</label>
              <div className="relative">
                <Input type={show ? 'text' : 'password'} value={token}
                  onChange={e => setToken(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleLogin()}
                  placeholder="أدخل كلمة السر..."
                  className="h-12 text-center text-lg font-bold tracking-widest" />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-xs text-destructive mt-1 font-medium">{error}</motion.p>
                )}
              </AnimatePresence>
            </div>
            <Button onClick={() => void handleLogin()} disabled={loading || !token.trim()} className="h-12 font-bold text-base gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="w-5 h-5" />}
              {loading ? 'جاري التحقق...' : 'دخول'}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              للحصول على كلمة السر تواصل مع مسؤول النظام
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ─── Support Ticket Types + Helpers ───────────────────────────────────────────

interface SupportTicketAdmin {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  subject: string;
  createdAt: string | number;
  updatedAt?: string;
  status: 'open' | 'in_progress' | 'closed';
  closedAt?: string | number;
  closedNote?: string;
  closedBy?: string;
  lastMessageAt?: string;
  messageCount?: number;
  unreadAdmin?: number;
  priority?: 'low' | 'normal' | 'high';
}

function getAdminToken(): string {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
}

async function fetchAdminTickets(): Promise<SupportTicketAdmin[]> {
  try {
    const res = await fetch('/api/support/tickets', {
      headers: { 'X-Admin-Token': getAdminToken() },
    });
    if (!res.ok) return [];
    return (await res.json()) as SupportTicketAdmin[];
  } catch { return []; }
}

async function closeAdminTicket(id: string, note?: string): Promise<void> {
  try {
    await fetch(`/api/support/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': getAdminToken() },
      body: JSON.stringify({ status: 'closed', closedNote: note, closedBy: 'فريق دعم LiraPro' }),
    });
  } catch {}
}

async function deleteAdminTicket(id: string): Promise<void> {
  try {
    await fetch(`/api/support/tickets/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Token': getAdminToken() },
    });
  } catch {}
}

async function bulkDeleteAdminTickets(ids: string[]): Promise<void> {
  try {
    await fetch('/api/support/tickets/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': getAdminToken() },
      body: JSON.stringify({ ids }),
    });
  } catch {}
}

// ─── Admin Tickets Panel ───────────────────────────────────────────────────────

function AdminTicketsPanel({ onOpenConv }: { onOpenConv?: (userId: string) => void }) {
  const { data: tickets = [], isFetching: loading, refetch } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: fetchAdminTickets,
    refetchInterval: 6000,
  });
  const refresh = refetch;
  const [selId, setSelId] = React.useState<string | null>(null);
  const [closeNote, setCloseNote] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'open' | 'in_progress' | 'closed'>('all');
  const [selectedTicketIds, setSelectedTicketIds] = React.useState<Set<string>>(new Set());
  const [ticketSelectMode, setTicketSelectMode] = React.useState(false);

  const _selTicket = selId ? tickets.find(t => t.id === selId) ?? null : null;

  const filtered = tickets.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'open') return t.status === 'open' || t.status === 'in_progress';
    return t.status === filter;
  });

  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const unreadCount = tickets.reduce((s, t) => s + (t.unreadAdmin ?? 0), 0);

  const handleClose = async () => {
    if (!selId) return;
    await closeAdminTicket(selId, closeNote.trim() || undefined);
    setCloseNote('');
    setSelId(null);
    void refresh();
  };

  const bulkDeleteTickets = async () => {
    const ids = [...selectedTicketIds];
    await bulkDeleteAdminTickets(ids);
    setSelectedTicketIds(new Set());
    setTicketSelectMode(false);
    setSelId(null);
    void refresh();
  };

  const getStatusLabel = (status: string) => {
    if (status === 'open') return 'مفتوحة';
    if (status === 'in_progress') return 'قيد المعالجة';
    if (status === 'closed') return 'مغلقة';
    return status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'open') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  };

  const getDotColor = (status: string) => {
    if (status === 'open') return 'bg-green-500';
    if (status === 'in_progress') return 'bg-blue-500';
    return 'bg-gray-400';
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <Card className="border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ background: '#0891b210' }}>
          <LifeBuoy className="w-4 h-4 flex-shrink-0" style={{ color: '#0891b2' }} />
          <span className="font-bold text-sm flex-1">تذاكر الدعم</span>
          {loading && <span className="text-[9px] text-muted-foreground">جاري التحميل...</span>}
          {openCount > 0 && !ticketSelectMode && (
            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{openCount} مفتوحة</span>
          )}
          {unreadCount > 0 && !ticketSelectMode && (
            <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unreadCount} غير مقروءة</span>
          )}
          {ticketSelectMode && selectedTicketIds.size > 0 && (
            <button onClick={() => void bulkDeleteTickets()}
              className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-red-500 text-white flex items-center gap-1">
              <Trash2 className="w-2.5 h-2.5" /> حذف ({selectedTicketIds.size})
            </button>
          )}
          <button onClick={() => void refresh()} className="text-[9px] px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground hover:bg-secondary flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => { setTicketSelectMode(v => !v); setSelectedTicketIds(new Set()); setSelId(null); }}
            className={`text-[9px] font-bold px-2.5 py-1 rounded-full transition-colors ${ticketSelectMode ? 'bg-primary text-white' : 'bg-secondary/80 text-muted-foreground hover:bg-secondary'}`}
          >
            {ticketSelectMode ? 'إلغاء' : 'تحديد'}
          </button>
        </div>
        <CardContent className="p-3 flex gap-2">
          {(['all', 'open', 'closed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}
            >
              {f === 'all' ? 'الكل' : f === 'open' ? 'مفتوحة' : 'مغلقة'}
            </button>
          ))}
        </CardContent>
      </Card>

      {tickets.length === 0 && !loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">لا توجد تذاكر</div>
      ) : filtered.length === 0 && !loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">لا توجد تذاكر في هذه الفئة</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(ticket => (
            <Card
              key={ticket.id}
              onClick={() => ticketSelectMode
                ? setSelectedTicketIds(prev => { const next = new Set(prev); if (next.has(ticket.id)) next.delete(ticket.id); else next.add(ticket.id); return next; })
                : setSelId(selId === ticket.id ? null : ticket.id)}
              className={`border-border shadow-sm cursor-pointer transition-all ${
                ticketSelectMode && selectedTicketIds.has(ticket.id) ? 'ring-2 ring-primary bg-primary/5' : selId === ticket.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {ticketSelectMode
                    ? <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 transition-colors ${selectedTicketIds.has(ticket.id) ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`} />
                    : <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getDotColor(ticket.status)}`} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-black truncate">{ticket.userName}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {(ticket.unreadAdmin ?? 0) > 0 && (
                          <span className="bg-red-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full">{ticket.unreadAdmin}</span>
                        )}
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(ticket.createdAt).toLocaleDateString('ar-SY')}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{ticket.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                      <span className="text-[9px] text-muted-foreground">#{ticket.id.slice(-8)}</span>
                      {(ticket.messageCount ?? 0) > 0 && (
                        <span className="text-[9px] text-muted-foreground">{ticket.messageCount} رسالة</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded actions */}
                <AnimatePresence>
                  {selId === ticket.id && ticket.status !== 'closed' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                        <input
                          value={closeNote}
                          onChange={e => setCloseNote(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          placeholder="ملاحظة الإغلاق (اختياري)"
                          className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
                        />
                        {onOpenConv && (
                          <Button
                            size="sm"
                            onClick={e => { e.stopPropagation(); onOpenConv(ticket.userId); }}
                            className="w-full h-9 text-xs font-bold"
                            variant="outline"
                          >
                            <MessageCircle className="w-3.5 h-3.5 ml-1.5" />
                            فتح المحادثة
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={e => { e.stopPropagation(); void handleClose(); }}
                          className="w-full h-9 text-xs font-bold"
                          variant="destructive"
                        >
                          <TicketCheck className="w-3.5 h-3.5 ml-1.5" />
                          إغلاق التذكرة
                        </Button>
                      </div>
                    </motion.div>
                  )}
                  {selId === ticket.id && ticket.status === 'closed' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                        {ticket.closedNote && (
                          <p className="text-[11px] text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                            ملاحظة الإغلاق: {ticket.closedNote}
                          </p>
                        )}
                        {ticket.closedBy && (
                          <p className="text-[10px] text-muted-foreground">أُغلق بواسطة: {ticket.closedBy}</p>
                        )}
                        {onOpenConv && (
                          <Button
                            size="sm"
                            onClick={e => { e.stopPropagation(); onOpenConv(ticket.userId); }}
                            className="w-full h-9 text-xs font-bold"
                            variant="outline"
                          >
                            <MessageCircle className="w-3.5 h-3.5 ml-1.5" />
                            عرض المحادثة
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={async e => { e.stopPropagation(); await deleteAdminTicket(ticket.id); setSelId(null); void refresh(); }}
                          className="w-full h-9 text-xs font-bold"
                          variant="ghost"
                        >
                          <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                          حذف التذكرة
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin Support Panel Types + Helpers ─────────────────────────────────────

interface SupportMsgAdmin {
  id: string;
  role: 'user' | 'bot' | 'admin';
  text: string;
  timestamp: number;
  read?: boolean;
  attachment?: { type: 'image' | 'file' | 'voice'; name: string; duration?: number; audioUrl?: string; imageUrl?: string };
  agentName?: string;
  agentBadge?: 'cyberpunk' | 'legendary';
}

interface SupportConvAdmin {
  userId: string;
  userName: string;
  msgs: SupportMsgAdmin[];
  closedAt?: number;
  lastUpdated: number;
}

interface SupportAgent {
  id: string;
  name: string;
  badge: 'cyberpunk' | 'legendary';
}

const DEFAULT_AGENT: SupportAgent = { id: 'default', name: 'فريق دعم LiraPro', badge: 'cyberpunk' };
const AGENTS_KEY = 'syp-support-agents';
const ACTIVE_AGENT_KEY = 'syp-support-active-agent';

function getAgents(): SupportAgent[] {
  try { return [DEFAULT_AGENT, ...JSON.parse(localStorage.getItem(AGENTS_KEY) ?? '[]')]; }
  catch { return [DEFAULT_AGENT]; }
}
function saveAgentsData(agents: SupportAgent[]) {
  localStorage.setItem(AGENTS_KEY, JSON.stringify(agents.filter(a => a.id !== 'default')));
}
function getAllConvs(): SupportConvAdmin[] {
  const convs: SupportConvAdmin[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('syp-conv-')) {
      try { convs.push(JSON.parse(localStorage.getItem(key)!) as SupportConvAdmin); } catch {}
    }
  }
  return convs.sort((a, b) => b.lastUpdated - a.lastUpdated);
}

function AgentBadgePill({ agent }: { agent: SupportAgent }) {
  return (
    <span className="flex items-center gap-1">
      {agent.badge === 'legendary' ? <RainbowBadge size={12} /> : <AdminBadge size={12} />}
      <span className="text-[10px] font-bold">{agent.name}</span>
    </span>
  );
}

function AdminSupportPanel({ initUserId, onImageClick, openConfirm }: { initUserId?: string | null; onImageClick?: (src: string) => void; openConfirm: (opts: { title: string; body: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; alertOnly?: boolean; onConfirm?: () => void | Promise<void> }) => void }) {
  const [selUserId, setSelUserId] = React.useState<string | null>(initUserId ?? null);
  const [replyText, setReplyText] = React.useState('');
  const [agents, setAgents] = React.useState<SupportAgent[]>(getAgents);
  const [activeAgentId, setActiveAgentId] = React.useState<string>(
    () => localStorage.getItem(ACTIVE_AGENT_KEY) ?? 'default'
  );
  const [showAddAgent, setShowAddAgent] = React.useState(false);
  const [selectedConvIds, setSelectedConvIds] = React.useState<Set<string>>(new Set());
  const [convSelectMode, setConvSelectMode] = React.useState(false);
  const [newAgentName, setNewAgentName] = React.useState('');
  const [newAgentBadge, setNewAgentBadge] = React.useState<'cyberpunk' | 'legendary'>('cyberpunk');
  const adminFileRef = React.useRef<HTMLInputElement>(null);
  const adminImgRef = React.useRef<HTMLInputElement>(null);
  const adminMrRef = React.useRef<MediaRecorder | null>(null);
  const [adminRec, setAdminRec] = React.useState(false);
  const [adminRecSecs, setAdminRecSecs] = React.useState(0);
  const adminTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const qcConvs = useQueryClient();
  const { data: convs = [] } = useQuery({
    queryKey: ['admin-support-convs'],
    queryFn: getAllConvs,
    refetchInterval: 3000,
  });
  const loadConvs = React.useCallback(
    () => void qcConvs.invalidateQueries({ queryKey: ['admin-support-convs'] }),
    [qcConvs],
  );

  React.useEffect(() => {
    if (selUserId) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [selUserId, convs.length]);

  const activeAgent = agents.find(a => a.id === activeAgentId) ?? DEFAULT_AGENT;
  const selConv = selUserId ? convs.find(c => c.userId === selUserId) ?? null : null;
  const unreadTotal = convs.reduce((s, c) => s + c.msgs.filter(m => m.role === 'user' && !m.read).length, 0);

  const markRead = React.useCallback((userId: string) => {
    const key = `syp-conv-${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const conv: SupportConvAdmin = JSON.parse(raw);
    conv.msgs = conv.msgs.map(m => ({ ...m, read: true }));
    localStorage.setItem(key, JSON.stringify(conv));
    loadConvs();
  }, [loadConvs]);

  const openConv = (userId: string) => { setSelUserId(userId); markRead(userId); };

  const sendReply = React.useCallback((text?: string, attach?: SupportMsgAdmin['attachment']) => {
    if (!selUserId) return;
    const content = (text ?? replyText).trim();
    if (!content && !attach) return;
    const key = `syp-conv-${selUserId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const conv: SupportConvAdmin = JSON.parse(raw);
    conv.msgs = [...conv.msgs, {
      id: Date.now().toString(),
      role: 'admin',
      text: content,
      timestamp: Date.now(),
      read: true,
      agentName: activeAgent.name,
      agentBadge: activeAgent.badge,
      ...(attach ? { attachment: attach } : {}),
    }];
    conv.lastUpdated = Date.now();
    localStorage.setItem(key, JSON.stringify(conv));
    setReplyText('');
    loadConvs();
  }, [selUserId, replyText, activeAgent, loadConvs]);

  const closeTicket = () => {
    if (!selUserId || selConv?.closedAt) return;
    const key = `syp-conv-${selUserId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const conv: SupportConvAdmin = JSON.parse(raw);
    conv.closedAt = Date.now();
    conv.msgs = [...conv.msgs, {
      id: Date.now().toString() + 'c',
      role: 'admin',
      text: 'تم إغلاق تذكرة الدعم. شكراً لتواصلك مع فريق LiraPro.',
      timestamp: Date.now(),
      read: true,
      agentName: activeAgent.name,
      agentBadge: activeAgent.badge,
    }];
    conv.lastUpdated = Date.now();
    localStorage.setItem(key, JSON.stringify(conv));
    loadConvs();
  };

  const addAgent = () => {
    if (!newAgentName.trim()) return;
    const ag: SupportAgent = { id: Date.now().toString(), name: newAgentName.trim(), badge: newAgentBadge };
    const updated = [...agents.filter(a => a.id !== 'default'), ag];
    saveAgentsData(updated);
    setAgents([DEFAULT_AGENT, ...updated]);
    setNewAgentName(''); setShowAddAgent(false);
  };

  const startAdminRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      adminMrRef.current = mr;
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const secs = adminRecSecs;
        const _mm = Math.floor(secs / 60).toString().padStart(2, '0');
        const _ss = (secs % 60).toString().padStart(2, '0');
        sendReply('', { type: 'voice', name: `voice_${Date.now()}.webm`, duration: secs });
        setAdminRecSecs(0);
      };
      mr.start(); setAdminRec(true);
      adminTimerRef.current = setInterval(() => setAdminRecSecs(s => s + 1), 1000);
    } catch { /* permission denied */ }
  };

  const stopAdminRec = (send = true) => {
    if (adminTimerRef.current) { clearInterval(adminTimerRef.current); adminTimerRef.current = null; }
    if (adminMrRef.current?.state === 'recording') {
      if (!send) { adminMrRef.current.ondataavailable = null; adminMrRef.current.onstop = null; }
      adminMrRef.current.stream?.getTracks().forEach(t => t.stop());
      adminMrRef.current.stop();
    }
    setAdminRec(false); setAdminRecSecs(0);
  };

  const handleAdminFile = (e: React.ChangeEvent<HTMLInputElement>, isImg: boolean) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = '';
    sendReply(isImg ? `[صورة: ${f.name}]` : `[ملف: ${f.name}]`, { type: isImg ? 'image' : 'file', name: f.name });
  };

  const fmtTime = (ts: number) => new Date(ts).toLocaleString('ar-SY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const fmtSecs = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2 bg-primary/5 border-b border-border flex-wrap gap-y-2">
          <MessageCircle className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-bold text-sm flex-1">محادثات الدعم</span>
          {unreadTotal > 0 && !convSelectMode && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500 text-white font-black">{unreadTotal} جديد</span>}
          {selUserId && (
            <button onClick={() => setSelUserId(null)} className="text-[10px] px-2 py-1 rounded-lg bg-secondary/60 text-muted-foreground hover:text-primary flex items-center gap-1">
              <X className="w-3 h-3" /> رجوع
            </button>
          )}
          {selUserId && !selConv?.closedAt && (
            <button onClick={closeTicket} className="text-[10px] px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> إغلاق التذكرة
            </button>
          )}
          {!selUserId && (
            <>
              {convSelectMode && selectedConvIds.size > 0 && (
                <button
                  onClick={() => { selectedConvIds.forEach(uid => localStorage.removeItem(`syp-conv-${uid}`)); setSelectedConvIds(new Set()); setConvSelectMode(false); loadConvs(); }}
                  className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-red-500 text-white flex items-center gap-1">
                  <Trash2 className="w-2.5 h-2.5" /> حذف ({selectedConvIds.size})
                </button>
              )}
              <button
                onClick={() => { setConvSelectMode(v => !v); setSelectedConvIds(new Set()); }}
                className={`text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 transition-colors ${convSelectMode ? 'bg-primary text-white' : 'bg-secondary/60 text-muted-foreground'}`}
              >
                {convSelectMode ? <><X className="w-3 h-3" /> إلغاء</> : 'تحديد'}
              </button>
              <button onClick={() => setShowAddAgent(v => !v)} className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary flex items-center gap-1">
                <Plus className="w-3 h-3" /> موظف دعم
              </button>
            </>
          )}
        </div>

        {/* Add agent form */}
        {showAddAgent && (
          <div className="px-4 py-3 border-b border-border bg-secondary/20 flex flex-col gap-2">
            <p className="text-xs font-bold text-foreground/60">إضافة موظف دعم جديد</p>
            <div className="flex gap-2 flex-wrap">
              <input
                value={newAgentName}
                onChange={e => setNewAgentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAgent()}
                placeholder="اسم الموظف..."
                className="flex-1 h-8 px-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-[120px]"
              />
              <div className="flex gap-1">
                {(['cyberpunk', 'legendary'] as const).map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setNewAgentBadge(b)}
                    className={`h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
                      newAgentBadge === b
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:bg-secondary'
                    }`}
                  >
                    {b === 'legendary' ? <RainbowBadge size={11} /> : <AdminBadge size={11} />}
                    {b === 'cyberpunk' ? 'Cyberpunk' : 'Legendary'}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={addAgent} disabled={!newAgentName.trim()} className="h-8 px-3 text-xs">إضافة</Button>
            </div>
          </div>
        )}

        {/* Agent selector */}
        <div className="px-4 py-2 border-b border-border bg-secondary/10 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">الرد بوصفك:</span>
          <div className="flex gap-1.5 flex-wrap">
            {agents.map(ag => (
              <button
                key={ag.id}
                onClick={() => { setActiveAgentId(ag.id); localStorage.setItem(ACTIVE_AGENT_KEY, ag.id); }}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-colors ${
                  activeAgentId === ag.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/60 border-border text-foreground hover:bg-primary/10'
                }`}
              >
                {ag.badge === 'legendary' ? <RainbowBadge size={11} /> : <AdminBadge size={11} />}
                {ag.name}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          {!selUserId ? (
            convs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">لا توجد محادثات دعم حالياً</p>
                <p className="text-xs mt-1 opacity-60">ستظهر هنا رسائل المستخدمين</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {convs.map(conv => {
                  const unread = conv.msgs.filter(m => m.role === 'user' && !m.read).length;
                  const last = conv.msgs[conv.msgs.length - 1];
                  const isSelected = selectedConvIds.has(conv.userId);
                  return (
                    <button
                      key={conv.userId}
                      onClick={() => convSelectMode
                        ? setSelectedConvIds(prev => { const next = new Set(prev); if (next.has(conv.userId)) next.delete(conv.userId); else next.add(conv.userId); return next; })
                        : openConv(conv.userId)}
                      className={`flex items-center gap-3 px-4 py-3 text-right hover:bg-secondary/30 transition-colors w-full ${convSelectMode && isSelected ? 'bg-primary/5' : ''}`}
                    >
                      {convSelectMode
                        ? <div className={`w-5 h-5 rounded border-2 flex-shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`} />
                        : <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${unread > 0 ? 'bg-primary/10' : 'bg-secondary'}`}>
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>}
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold truncate">{conv.userName}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {conv.closedAt && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">مغلقة</span>}
                            {unread > 0 && <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1">{unread}</span>}
                          </div>
                        </div>
                        {last && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {last.attachment?.type === 'voice'
                              ? `🎤 رسالة صوتية${last.attachment.duration != null ? ` · ${Math.floor(last.attachment.duration/60).toString().padStart(2,'0')}:${String(last.attachment.duration%60).padStart(2,'0')}` : ''}`
                              : last.attachment?.type === 'image' ? `📷 ${last.attachment.name}`
                              : last.text.slice(0, 55)}
                          </p>
                        )}
                        <p className="text-[9px] text-muted-foreground/60 mt-0.5 font-mono" dir="ltr">{conv.userId.startsWith('guest-') ? `زائر · ${conv.userId.slice(-6)}` : `مسجّل · ${conv.userId.slice(-8)}`}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="flex flex-col">
              {/* Conv title */}
              <div className="px-4 py-2 bg-secondary/20 border-b border-border flex items-center justify-between">
                <p className="text-xs font-bold">{selConv?.userName ?? '...'}</p>
                <div className="flex items-center gap-1.5">
                  {selConv?.closedAt && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">مغلقة</span>}
                  <button onClick={() => openConfirm({
                    title: 'حذف المحادثة',
                    body: `هل أنت متأكد من حذف محادثة ${selConv?.userName ?? ''}؟`,
                    destructive: true,
                    confirmLabel: 'حذف',
                    onConfirm: () => {
                      localStorage.removeItem(`syp-conv-${selUserId}`);
                      setSelUserId(null);
                      loadConvs();
                    },
                  })} className="text-[9px] px-1.5 py-0.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-0.5 transition-colors">
                    <Trash2 className="w-2.5 h-2.5" /> حذف
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex flex-col divide-y divide-border max-h-72 overflow-y-auto">
                {(selConv?.msgs ?? []).map(msg => (
                  <div key={msg.id} className={`flex items-start gap-2.5 px-4 py-2.5 ${msg.role === 'user' && !msg.read ? 'bg-primary/5' : ''}`} style={{ overflow: 'visible' }}>
                    {msg.role === 'admin' ? (
                      <div className="flex-shrink-0 flex items-center justify-center mt-0.5" style={{ width: 24, height: 24, overflow: 'visible' }}>
                        <ChatBadge badge={msg.agentBadge === 'legendary' ? 'legendary' : 'cyberpunk'} size={20} />
                      </div>
                    ) : (
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                        msg.role === 'bot' ? 'bg-primary/10' : 'bg-secondary'
                      }`}>
                        {msg.role === 'bot' && <span className="text-[7px] font-black text-primary">Bot</span>}
                        {msg.role === 'user' && <User className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-[10px] font-bold">
                          {msg.role === 'bot' ? 'مساعد التطبيق' : msg.role === 'admin' ? (msg.agentName ?? 'الإدارة') : (selConv?.userName ?? 'المستخدم')}
                        </span>
                        {msg.role === 'admin' && msg.agentBadge && (
                          <span style={{ overflow: 'visible', display: 'inline-flex' }}>
                            <ChatBadge badge={msg.agentBadge === 'legendary' ? 'legendary' : 'cyberpunk'} size={12} />
                          </span>
                        )}
                        {msg.role === 'user' && !msg.read && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                        <span className="text-[9px] text-muted-foreground mr-auto">{fmtTime(msg.timestamp)}</span>
                      </div>
                      {msg.attachment && (
                        <div className="mb-1">
                          {msg.attachment.type === 'voice' && msg.attachment.audioUrl ? (
                            <audio
                              src={msg.attachment.audioUrl}
                              controls
                              className="h-8 w-full max-w-[220px] rounded-lg"
                              style={{ accentColor: 'hsl(var(--primary))' }}
                            />
                          ) : msg.attachment.type === 'image' && (msg.attachment.imageUrl ?? msg.attachment.audioUrl) ? (
                            <img
                              src={msg.attachment.imageUrl ?? msg.attachment.audioUrl}
                              alt={msg.attachment.name}
                              className="max-h-32 max-w-[180px] rounded-xl object-cover border border-border cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => { const s = msg.attachment!.imageUrl ?? msg.attachment!.audioUrl; if (s) onImageClick?.(s); }}
                            />
                          ) : (
                            <div className={`text-[10px] flex items-center gap-1 ${msg.attachment.type === 'voice' ? 'text-primary' : msg.attachment.type === 'image' ? 'text-blue-500' : 'text-muted-foreground'}`}>
                              {msg.attachment.type === 'voice' ? <Mic className="w-3 h-3 flex-shrink-0" /> : msg.attachment.type === 'image' ? <ImageIcon className="w-3 h-3 flex-shrink-0" /> : <Paperclip className="w-3 h-3 flex-shrink-0" />}
                              <span className="truncate max-w-[160px]">{msg.attachment.name}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Admin reply */}
              {!selConv?.closedAt ? (
                <div className="flex flex-col gap-2 px-4 py-3 border-t border-border bg-secondary/10">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>ترد بوصفك:</span>
                    <AgentBadgePill agent={activeAgent} />
                  </div>
                  {adminRec && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/50">
                      <motion.div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" animate={{ opacity: [1,0.3,1] }} transition={{ duration:0.8, repeat: Infinity }} />
                      <span className="text-xs font-bold text-red-600 flex-1">جارٍ التسجيل... {fmtSecs(adminRecSecs)}</span>
                      <button onClick={() => stopAdminRec(false)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex gap-1">
                      <button onClick={() => adminImgRef.current?.click()} className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary" title="صورة"><ImageIcon className="w-3.5 h-3.5" /></button>
                      <button onClick={() => adminFileRef.current?.click()} className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary" title="ملف"><Paperclip className="w-3.5 h-3.5" /></button>
                      {!adminRec ? (
                        <button onClick={startAdminRec} className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="تسجيل صوتي">
                          <Mic className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => stopAdminRec(true)} className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      placeholder="اكتب رداً..."
                      className="flex-1 h-9 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button size="sm" onClick={() => sendReply()} disabled={!replyText.trim()} className="h-9 px-3">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2 text-center text-xs text-amber-600 dark:text-amber-400 border-t border-border bg-amber-50 dark:bg-amber-900/10">
                  التذكرة مغلقة · لا يمكن الرد
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <input ref={adminImgRef} type="file" accept="image/*" className="hidden" onChange={e => handleAdminFile(e, true)} />
      <input ref={adminFileRef} type="file" accept="*/*" className="hidden" onChange={e => handleAdminFile(e, false)} />
    </div>
  );
}


// ─── Image Lightbox (standalone — must live outside AdminPage to obey Rules of Hooks) ───

function AdminImageLightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const clamp = (z: number) => Math.min(4, Math.max(1, z));

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); }
      else if (e.key === '+' || e.key === '=') setZoom(z => clamp(z + 0.3));
      else if (e.key === '-') setZoom(z => clamp(z - 0.3));
      else if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, onClose]);

  if (!src) return null;

  const onWheel = (e: React.WheelEvent) => { e.preventDefault(); setZoom(z => clamp(z - e.deltaY * 0.002)); };
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: dragStart.current.px + e.clientX - dragStart.current.mx, y: dragStart.current.py + e.clientY - dragStart.current.my });
  };
  const onMouseUp = () => { setDragging(false); };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), zoom };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setZoom(clamp(pinchRef.current.zoom * (Math.hypot(dx, dy) / pinchRef.current.dist)));
    }
  };
  const onTouchEnd = () => { pinchRef.current = null; };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/88 backdrop-blur-sm" onClick={onClose}>
      <div className="relative flex flex-col items-center gap-3" style={{ maxWidth: '92vw', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        {/* Close */}
        <button onClick={onClose} className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur text-white flex items-center justify-center transition-colors">
          <X className="w-4 h-4" />
        </button>
        {/* Zoom bar */}
        <div className="absolute -top-3 left-0 z-20 flex items-center gap-1 bg-black/55 backdrop-blur rounded-full px-2 py-1">
          <button onClick={() => setZoom(z => clamp(z - 0.3))} className="w-6 h-6 rounded-full text-white/80 hover:text-white flex items-center justify-center text-sm font-black">−</button>
          <span className="text-[10px] text-white/70 font-mono w-8 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => clamp(z + 0.3))} className="w-6 h-6 rounded-full text-white/80 hover:text-white flex items-center justify-center text-sm font-black">+</button>
          {zoom !== 1 && (
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-5 h-5 rounded-full text-white/60 hover:text-white flex items-center justify-center transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        {/* Image viewport */}
        <div
          className="overflow-hidden rounded-2xl shadow-2xl"
          style={{ maxWidth: '88vw', maxHeight: '78vh', cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in' }}
          onWheel={onWheel}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        >
          <img
            src={src} alt="عرض الصورة" draggable={false}
            className="object-contain select-none"
            style={{
              maxWidth: '88vw', maxHeight: '78vh',
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transition: dragging ? 'none' : 'transform 0.12s ease',
              userSelect: 'none', WebkitUserSelect: 'none',
            }}
          />
        </div>
        {/* Footer */}
        <div className="flex items-center gap-3">
          <a href={src} download onClick={e => e.stopPropagation()} className="text-[10px] text-white/60 hover:text-white underline transition-colors">تحميل الصورة</a>
          <span className="text-white/30 text-[10px]">·</span>
          <span className="text-[9px] text-white/40">Esc للإغلاق · عجلة الماوس للتكبير · اسحب للتحريك</span>
        </div>
      </div>
    </div>
  );
}

// ─── Shared interfaces (used by module-level fetch functions) ─────────────────

interface VendorProfileAdmin {
  id: number; supabaseId: string; businessName: string; fullName: string;
  email: string; phone: string; governorate: string; city: string;
  address?: string; category: string; trustScore: number; isActive: boolean;
  logoUrl?: string; createdAt: string;
}
interface VendorApplication {
  id: number; businessName: string; fullName: string; email: string;
  phone: string; governorate: string; city: string; address: string;
  category: string; status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string; createdAt: string;
}
interface AdminMessage { id: number; user_id: string; title: string; body: string; type: string; read: boolean; created_at: string; }
interface BroadcastData { text: string; textColor?: string; speed?: string; countdownSecs?: number; countdownColor?: string; startedAt: string; endsAt?: string; }

// ─── Module-level fetch functions ─────────────────────────────────────────────

async function adminFetchStats(token: string) {
  const res = await fetch('/api/admin/stats', { headers: { 'X-Admin-Token': token } });
  if (!res.ok) return null;
  return res.json() as Promise<AdminStats>;
}
async function adminFetchUsers(token: string) {
  const res = await fetch('/api/admin/users', { headers: { 'X-Admin-Token': token } });
  if (!res.ok) return [] as RegisteredUser[];
  return res.json() as Promise<RegisteredUser[]>;
}
async function adminFetchDeletionRequests(token: string) {
  const res = await fetch('/api/admin/deletion-requests', { headers: { 'X-Admin-Token': token } });
  if (!res.ok) return [] as DeletionRequest[];
  return res.json() as Promise<DeletionRequest[]>;
}
async function adminFetchBuySellOverrides() {
  const res = await fetch('/api/admin/rate-overrides');
  if (!res.ok) return {} as Record<string, BuySellOverride>;
  return res.json() as Promise<Record<string, BuySellOverride>>;
}
async function adminFetchNotifications() {
  const res = await fetch('/api/notifications');
  if (!res.ok) return [] as SypNotification[];
  return res.json() as Promise<SypNotification[]>;
}
async function adminFetchBroadcast() {
  const res = await fetch('/api/broadcast');
  if (!res.ok) return null;
  return res.json() as Promise<BroadcastData | null>;
}
async function adminFetchSypRate() {
  const res = await fetch('/api/settings/syp-rate');
  if (!res.ok) return null;
  return res.json() as Promise<{ rate: number; isManual: boolean; updatedAt: string } | null>;
}
async function adminFetchGoldOverride() {
  const res = await fetch('/api/settings/gold-rate');
  if (!res.ok) return null;
  return res.json() as Promise<{ isManual: boolean; override?: { pricePerGramSYP: number; updatedAt: string } } | null>;
}
async function adminFetchMetalRates() {
  const res = await fetch('/api/settings/metal-rates');
  if (!res.ok) return {} as Record<string, { priceSYP: number; updatedAt: string; isManual: boolean }>;
  return res.json() as Promise<Record<string, { priceSYP: number; updatedAt: string; isManual: boolean }>>;
}
async function adminFetchVendors(token: string): Promise<VendorProfileAdmin[]> {
  try {
    const res = await fetch('/api/admin/vendors', { headers: { 'X-Admin-Token': token } });
    if (!res.ok) return [];
    const raw = await res.json() as Record<string, unknown>[];
    return raw.map(v => ({
      id: v.id as number,
      supabaseId: (v.user_id ?? v.supabaseId ?? v.id) as string,
      businessName: (v.business_name ?? v.businessName) as string,
      fullName: (v.owner_name ?? v.fullName ?? '') as string,
      email: (v.email ?? (v.profiles as Record<string, unknown> | undefined)?.email ?? '') as string,
      phone: (v.phone ?? (v.profiles as Record<string, unknown> | undefined)?.phone ?? '') as string,
      governorate: (v.governorate ?? '') as string,
      city: (v.city ?? '') as string,
      address: v.address as string | undefined,
      category: (Array.isArray(v.category_ids) ? (v.category_ids as string[])[0] : (v.category ?? '')) as string,
      trustScore: ((v.trust_score ?? v.trustScore ?? 5) as number) * (typeof v.trust_score === 'number' && v.trust_score <= 10 ? 10 : 1),
      isActive: (v.is_active ?? v.isActive ?? true) as boolean,
      logoUrl: (v.logo_url ?? v.logoUrl) as string | undefined,
      createdAt: (v.created_at ?? v.createdAt) as string,
    }));
  } catch { return []; }
}
async function adminFetchVendorApplications(token: string): Promise<VendorApplication[]> {
  try {
    const res = await fetch('/api/admin/vendor-applications', { headers: { 'X-Admin-Token': token } });
    if (!res.ok) return [];
    const raw = await res.json() as Record<string, unknown>[];
    return raw.map(a => ({
      id: a.id as number,
      businessName: (a.business_name ?? a.businessName) as string,
      fullName: (a.owner_name ?? a.fullName ?? '') as string,
      email: (a.email ?? (a.profiles as Record<string, unknown> | undefined)?.email ?? '') as string,
      phone: (a.phone ?? '') as string,
      governorate: (a.governorate ?? '') as string,
      city: (a.city ?? '') as string,
      address: (a.address ?? '') as string,
      category: (a.category ?? '') as string,
      status: (a.status ?? 'pending') as 'pending' | 'approved' | 'rejected',
      adminNotes: (a.reject_reason ?? a.adminNotes) as string | undefined,
      createdAt: (a.created_at ?? a.createdAt) as string,
    }));
  } catch { return []; }
}
async function adminFetchAdminMessages(token: string) {
  const res = await fetch('/api/admin/messages', { headers: { 'X-Admin-Token': token } });
  if (!res.ok) return [] as AdminMessage[];
  return res.json() as Promise<AdminMessage[]>;
}
async function adminFetchVerifyRequests(token: string) {
  try {
    const res = await fetch('/api/admin/verify-requests', { headers: { 'X-Admin-Token': token } });
    if (!res.ok) return [] as VerifyRequest[];
    const all = await res.json() as VerifyRequest[];
    return all.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  } catch { return [] as VerifyRequest[]; }
}
async function adminFetchVendorPrices(supabaseId: string, token: string) {
  const res = await fetch(`/api/admin/vendors/${supabaseId}/prices`, { headers: { 'X-Admin-Token': token } });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d as Array<{id:number;product:string;category:string;price:number|null;priceBuy:number|null;priceSell:number|null;unit:string|null;isActive:boolean;updatedAt:string}> : [];
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(ADMIN_TOKEN_KEY));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [supportInitUserId, setSupportInitUserId] = useState<string | null>(null);

  // Data (React Query)
  const queryClient = useQueryClient();
  const { data: stats } = useQuery({ queryKey: ['admin-stats', token], queryFn: () => adminFetchStats(token!), enabled: !!token });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users', token], queryFn: () => adminFetchUsers(token!), enabled: !!token });
  const { data: deletionRequests = [] } = useQuery({ queryKey: ['admin-deletion-reqs', token], queryFn: () => adminFetchDeletionRequests(token!), enabled: !!token });
  const { data: buySellOverrides = {} } = useQuery({ queryKey: ['admin-buy-sell-overrides'], queryFn: adminFetchBuySellOverrides, enabled: !!token });
  const { data: notifications = [] } = useQuery({ queryKey: ['admin-notifications'], queryFn: adminFetchNotifications, enabled: !!token });
  const { data: broadcastData } = useQuery({ queryKey: ['admin-broadcast'], queryFn: adminFetchBroadcast, enabled: !!token, refetchInterval: 60_000 });
  const broadcastActive = broadcastData ?? null;

  // Real-time new-events counters (polls /api/admin/new-events every 30s)
  const [newEvents, setNewEvents] = useState({ users: 0, applications: 0 });
  const newEventsCheckRef = useRef(new Date().toISOString());

  // Users tab state
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banningUser, setBanningUser] = useState<string | null>(null);
  const [restrictingUser, setRestrictingUser] = useState<string | null>(null);
  const [restrictReason, setRestrictReason] = useState('');
  const [restrictDays, setRestrictDays] = useState('');
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Vendor management state (React Query)
  const { data: vendors = [] } = useQuery({ queryKey: ['admin-vendors', token], queryFn: () => adminFetchVendors(token!), enabled: !!token, refetchInterval: 30000 });
  const { data: vendorApplications = [] } = useQuery({ queryKey: ['admin-vendor-apps', token], queryFn: () => adminFetchVendorApplications(token!), enabled: !!token, refetchInterval: 10000, refetchOnMount: true, staleTime: 0 });
  // adminFetchAdminMessages kept for future use; messages now stored in localStorage via localSentMsgs
  void adminFetchAdminMessages;
  const { data: verifyRequests = [] } = useQuery({ queryKey: ['admin-verify-reqs', token], queryFn: () => adminFetchVerifyRequests(token!), enabled: !!token });
  const [vendorAppFilter, setVendorAppFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [createVendorOpen, setCreateVendorOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState({ supabaseId: '', businessName: '', fullName: '', email: '', phone: '', governorate: '', city: '', address: '', category: '', trustScore: '50', logoUrl: '' });
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorMsg, setVendorMsg] = useState('');
  const [notifyApp, setNotifyApp] = useState<VendorApplication | null>(null);
  const [sendingAppNotif, setSendingAppNotif] = useState(false);

  // Badge assignments: LiraPro → Legendary (rainbow), فريق LiraPro → Cyberpunk (admin)
  const badgeLira = 'rainbow' as const;
  const badgeTeam = 'admin' as const;

  // Gold/Metals override state (React Query)
  const [goldOverrideEdit, setGoldOverrideEdit] = useState<string | null>(null);
  const [goldOverrideMsg, setGoldOverrideMsg] = useState('');
  const { data: goldOverrideData } = useQuery({ queryKey: ['admin-gold-override'], queryFn: adminFetchGoldOverride, enabled: !!token });
  const goldOverrideActive = goldOverrideData?.isManual ?? false;
  const goldOverrideInput = goldOverrideEdit ?? goldOverrideData?.override?.pricePerGramSYP.toString() ?? '';
  const goldOverrideUpdatedAt = goldOverrideData?.override?.updatedAt ?? null;
  const { data: metalRatesRaw = {} } = useQuery({ queryKey: ['admin-metal-rates'], queryFn: adminFetchMetalRates, enabled: !!token });
  const metalOverrides = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(metalRatesRaw).forEach(([sym, v]) => { if (v.isManual) map[sym] = v.priceSYP; });
    return map;
  }, [metalRatesRaw]);
  const metalOverridesDetail = metalRatesRaw;
  const [editMetal, setEditMetal] = useState<string | null>(null);
  const [editMetalVal, setEditMetalVal] = useState('');
  const [metalMsg, setMetalMsg] = useState('');

  // Override history state
  interface OverrideHistoryEntry { id: number; priceType: string; key: string; action: string; priceSYP: number | null; changedBy: string | null; changedAt: string; }
  const [overrideHistory, setOverrideHistory] = useState<OverrideHistoryEntry[]>([]);
  const [overrideHistoryOpen, setOverrideHistoryOpen] = useState(false);
  const [overrideHistoryLoading, setOverrideHistoryLoading] = useState(false);
  const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [clearHistoryDays, setClearHistoryDays] = useState<'all' | '30' | '90'>('all');
  const [clearHistoryLoading, setClearHistoryLoading] = useState(false);

  // Rates tab state (React Query)
  const { data: sypRateData } = useQuery({ queryKey: ['admin-syp-rate'], queryFn: adminFetchSypRate, enabled: !!token });
  const [sypRateEdit, setSypRateEdit] = useState<string | null>(null);
  const sypRateCurrent = sypRateData?.rate ?? 13500;
  const sypRateIsManual = sypRateData?.isManual ?? false;
  const sypRateInput = sypRateEdit ?? sypRateData?.rate.toString() ?? '13500';
  const sypRateUpdatedAt = sypRateData?.updatedAt ?? null;
  const [sypRateSaving, setSypRateSaving] = useState(false);
  const [sypRateMsg, setSypRateMsg] = useState('');
  const [editCurrency, setEditCurrency] = useState<string | null>(null);
  const [editBuyVal, setEditBuyVal] = useState('');
  const [editSellVal, setEditSellVal] = useState('');
  const [rateMsg, setRateMsg] = useState('');

  // Notifications tab state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');
  const [notifTarget, setNotifTarget] = useState<'all' | 'specific'>('all');
  const [notifUserSearch, setNotifUserSearch] = useState('');
  const [notifSelectedWallet, setNotifSelectedWallet] = useState<string | null>(null);
  const [notifSelectedName, setNotifSelectedName] = useState('');
  const [notifSender, setNotifSender] = useState<'فريق LiraPro' | 'LiraPro'>('LiraPro');

  // Vendor detail drawer state
  const [vendorDetail, setVendorDetail] = useState<VendorProfileAdmin | null>(null);
  const [vendorDetailEdit, setVendorDetailEdit] = useState<VendorProfileAdmin | null>(null);
  const [vendorDetailSaving, setVendorDetailSaving] = useState(false);
  const [vendorDetailMsg, setVendorDetailMsg] = useState('');
  const [vendorDeleteConfirm, setVendorDeleteConfirm] = useState(false);
  const [vendorBanConfirm, setVendorBanConfirm] = useState(false);
  const [vendorPersonalDataOpen, setVendorPersonalDataOpen] = useState(false);
  const [vendorPersonalDataEditing, setVendorPersonalDataEditing] = useState(false);
  const [vendorRestrictDays, setVendorRestrictDays] = useState('');
  const [vendorRestrictMsg, setVendorRestrictMsg] = useState('');
  const [adminLightboxSrc, setAdminLightboxSrc] = useState<string | null>(null);
  const { data: vendorDetailPrices = [], isFetching: vendorPricesLoading } = useQuery({
    queryKey: ['admin-vendor-prices', vendorDetail?.supabaseId, token],
    queryFn: () => adminFetchVendorPrices(vendorDetail!.supabaseId, token!),
    enabled: !!vendorDetail?.supabaseId && !!token,
    staleTime: 0,
  });

  // Legendary glow vendors (localStorage)
  const [legendaryVendors, setLegendaryVendors] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('syp-legendary-vendors') ?? '[]') as number[]); } catch { return new Set(); }
  });
  const toggleLegendaryVendor = (id: number) => {
    setLegendaryVendors(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('syp-legendary-vendors', JSON.stringify([...next])); } catch { /**/ }
      return next;
    });
  };

  const [verifiedVendors, setVerifiedVendors] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('syp-verified-vendors') ?? '[]') as number[]); } catch { return new Set(); }
  });
  const toggleVerifiedVendor = (id: number) => {
    setVerifiedVendors(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('syp-verified-vendors', JSON.stringify([...next])); } catch { /**/ }
      return next;
    });
  };

  interface VendorRating { id: string; vendorId: number; userName: string; rating: number; comment: string; createdAt: string; }
  const [vendorRatings, setVendorRatings] = useState<Record<number, VendorRating[]>>(() => {
    try { return JSON.parse(localStorage.getItem('syp-vendor-ratings') ?? '{}') as Record<number, VendorRating[]>; } catch { return {}; }
  });
  const [vendorReports, setVendorReports] = useState<Record<number, Array<{id:string;reporter:string;reason:string;createdAt:string}>>>(() => {
    try { return JSON.parse(localStorage.getItem('syp-vendor-reports') ?? '{}') as Record<number, Array<{id:string;reporter:string;reason:string;createdAt:string}>>; } catch { return {}; }
  });
  const [vendorDrawerPanel, setVendorDrawerPanel] = useState<'edit' | 'ratings' | 'reports'>('edit');
  const [newRatingStars, setNewRatingStars] = useState(5);
  const [newRatingComment, setNewRatingComment] = useState('');
  const [newRatingName, setNewRatingName] = useState('');

  // Notification bulk selection
  const [selectedNotifIds, setSelectedNotifIds] = useState<Set<number>>(new Set());
  const toggleNotifSelect = (id: number) => {
    setSelectedNotifIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  // Suspicious prices tab state
  const [suspiciousPrices, setSuspiciousPrices] = useState<Array<{id:number;vendorId:number;vendorName:string;product:string;category:string;price:number;refPrice:number;deviation:number;pct:number}>>([]);
  const [suspiciousLoading, setSuspiciousLoading] = useState(false);
  const [suspiciousReviewed, setSuspiciousReviewed] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('syp-suspicious-reviewed') ?? '[]') as number[]); } catch { return new Set(); }
  });

  // Expandable request states
  const [expandedDelReqId, setExpandedDelReqId] = useState<string | null>(null);
  const [expandedVerifyReqId, setExpandedVerifyReqId] = useState<string | null>(null);

  // Categories tab state
  const [catView, setCatView] = useState<'categories' | 'vendors'>('categories');
  const [catSelectedId, setCatSelectedId] = useState<string | null>(null);
  const [vendorSearch, setVendorSearch] = useState('');

  // Direct messaging state
  const [msgUserSearch, setMsgUserSearch] = useState('');
  const [msgSelectedUser, setMsgSelectedUser] = useState<RegisteredUser | null>(null);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState('');

  // Local sent messages (stored in localStorage since no backend endpoint)
  const [localSentMsgs, setLocalSentMsgs] = useState<AdminMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem('admin-sent-msgs') || '[]') as AdminMessage[]; } catch { return []; }
  });
  const deleteSentMsg = (id: number) => {
    setLocalSentMsgs(prev => {
      const next = prev.filter(m => m.id !== id);
      try { localStorage.setItem('admin-sent-msgs', JSON.stringify(next)); } catch { /**/ }
      return next;
    });
  };

  // Action notification modal (shared for ban / delete / restrict / requests)
  interface ActionNotifState {
    visible: boolean; walletId?: string; targetName?: string;
    title: string; body: string; type: 'info' | 'success' | 'warning';
    sender: 'LiraPro' | 'فريق LiraPro';
    sending: boolean; msg: string;
  }
  const [actionNotif, setActionNotif] = useState<ActionNotifState | null>(null);

  // Custom confirm/alert modal (replaces window.confirm and window.alert)
  interface ConfirmModalOpts {
    title: string; body: string;
    confirmLabel?: string; cancelLabel?: string;
    destructive?: boolean; alertOnly?: boolean;
    onConfirm?: () => void | Promise<void>;
  }
  const [confirmModal, setConfirmModal] = useState<(ConfirmModalOpts & { open: boolean }) | null>(null);
  const openConfirm = useCallback((opts: ConfirmModalOpts) => setConfirmModal({ ...opts, open: true }), []);
  const closeConfirm = useCallback(() => setConfirmModal(m => m ? { ...m, open: false } : null), []);

  // Badge sender assignment (system tab)
  const [badgeAssignedSender, setBadgeAssignedSender] = useState<string>(() => {
    try { return localStorage.getItem('admin-badge-sender') ?? 'LiraPro'; } catch { return 'LiraPro'; }
  });
  const _changeBadgeSender = (name: string) => {
    setBadgeAssignedSender(name);
    try { localStorage.setItem('admin-badge-sender', name); } catch { /**/ }
  };

  // Verification requests state (via useQuery above)
  const [verifySubTab, setVerifySubTab] = useState<'deletion' | 'verification'>('deletion');

  // User LPH / verify maps (derived via useMemo — see below)

  // Accept application panel
  const [acceptingApp, setAcceptingApp] = useState<VendorApplication | null>(null);
  const [acceptUserId, setAcceptUserId] = useState('');
  const [acceptTrustScore, setAcceptTrustScore] = useState('50');
  const [_acceptLphId, setAcceptLphId] = useState('');
  const [acceptNotifTitle, setAcceptNotifTitle] = useState('');
  const [acceptNotifBody, setAcceptNotifBody] = useState('');
  const [acceptSaving, setAcceptSaving] = useState(false);
  const [acceptMsg, setAcceptMsg] = useState('');

  // Reject application panel
  const [rejectingApp, setRejectingApp] = useState<VendorApplication | null>(null);
  const [rejectNotifTitle, setRejectNotifTitle] = useState('');
  const [rejectNotifBody, setRejectNotifBody] = useState('');
  const [rejectUserId, setRejectUserId] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectMsg, setRejectMsg] = useState('');

  // Karat gold overrides (derived from metalRatesRaw)
  const karatOverrides = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(metalRatesRaw).forEach(([sym, v]) => { if (sym.startsWith('GOLD_') && v.isManual) map[sym] = v.priceSYP; });
    return map;
  }, [metalRatesRaw]);
  const karatOverridesDetail = useMemo(() => {
    const detail: Record<string, { priceSYP: number; updatedAt: string; isManual: boolean }> = {};
    Object.entries(metalRatesRaw).forEach(([sym, v]) => { if (sym.startsWith('GOLD_')) detail[sym] = v; });
    return detail;
  }, [metalRatesRaw]);
  const [editKarat, setEditKarat] = useState<string | null>(null);
  const [editKaratVal, setEditKaratVal] = useState('');
  const [karatMsg, setKaratMsg] = useState('');

  // System info editing
  const [sysInfoEditing, setSysInfoEditing] = useState(false);
  const [sysInfoPassword, setSysInfoPassword] = useState('');
  const [sysInfoEdits, setSysInfoEdits] = useState({ appName: 'LiraPro', version: 'v3.0 Pro', currencies: '150+', pricesProvider: 'MetalPriceAPI', cacheInterval: '8 ساعات' });
  const [sysInfoMsg, setSysInfoMsg] = useState('');

  // Expanded notification in history
  const [expandedNotifId, setExpandedNotifId] = useState<number | null>(null);

  // Live Broadcast state
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastTextColor, setBroadcastTextColor] = useState('#ffffff');
  const [broadcastCountdownEnabled, setBroadcastCountdownEnabled] = useState(false);
  const [broadcastCountdownSecs, setBroadcastCountdownSecs] = useState('60');
  const [broadcastCountdownColor, setBroadcastCountdownColor] = useState('#ff4444');
  const [broadcastSpeed, setBroadcastSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [broadcastElapsed, setBroadcastElapsed] = useState(0);
  const [broadcastRemaining, setBroadcastRemaining] = useState(0);
  const [broadcastStarting, setBroadcastStarting] = useState(false);
  const [viewedNotifId, setViewedNotifId] = useState<number | null>(null);
  const [notifViewers, setNotifViewers] = useState<{ count: number; viewers: { walletId: string; viewedAt: string }[] } | null>(null);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const fetchNotifViewers = useCallback(async (id: number) => {
    setLoadingViewers(true);
    setNotifViewers(null);
    try {
      const res = await fetch(`/api/notifications/${id}/viewers`, { headers: { 'X-Admin-Token': token ?? '' } });
      if (res.ok) setNotifViewers(await res.json() as { count: number; viewers: { walletId: string; viewedAt: string }[] });
    } catch {}
    setLoadingViewers(false);
  }, [token]);
  // Notification inline editing
  const [editingNotifId, setEditingNotifId] = useState<number | null>(null);
  const [editNotifTitle, setEditNotifTitle] = useState('');
  const [editNotifBody, setEditNotifBody] = useState('');
  const [savingNotif, setSavingNotif] = useState(false);

  // Expanded application cards (for approved/rejected)
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  // User inline editing
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [userEditForm, setUserEditForm] = useState({ fullName: '', phone: '', email: '', fatherName: '', gender: '', address: '', province: '', city: '', dob: '' });
  const [userEditSaving, setUserEditSaving] = useState(false);
  const [userEditResult, setUserEditResult] = useState<'ok' | 'err' | null>(null);

  // API data
  const { data: ratesData, refetch: refetchRates } = useGetExchangeRates();
  const { data: goldData, refetch: refetchGold } = useGetGoldPrices();
  const rates = ratesData?.rates ?? {};
  const usdToSyp = sypRateIsManual ? sypRateCurrent : (ratesData?.usd_to_syp ?? 13500);
  const goldKarat24 = goldData?.karats.find(k => k.karat === 24);
  const tabRef = useRef<HTMLDivElement>(null);

  // ── Action handlers ─────────────────────────────────────────────────────────

  const sendDirectMessage = async () => {
    if (!msgSelectedUser || !msgTitle.trim() || !msgBody.trim() || !token) return;
    const walletId = msgSelectedUser.walletId ?? msgSelectedUser.supabaseId ?? (msgSelectedUser as { id?: string }).id;
    if (!walletId) { setMsgSent('خطأ: المستخدم لا يملك معرّف صالح'); setTimeout(() => setMsgSent(''), 4000); return; }
    setMsgSending(true);
    try {
      const res = await fetch('/api/notifications/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({
          walletId,
          title: msgTitle,
          body: msgBody,
          type: 'admin_message',
          sender: badgeAssignedSender || 'LiraPro',
        }),
      });
      if (res.ok) {
        const newMsg: AdminMessage = {
          id: Date.now(),
          user_id: walletId as string,
          title: msgTitle,
          body: msgBody,
          type: 'admin_message',
          read: false,
          created_at: new Date().toISOString(),
        };
        setLocalSentMsgs(prev => {
          const next = [newMsg, ...prev].slice(0, 100);
          try { localStorage.setItem('admin-sent-msgs', JSON.stringify(next)); } catch { /**/ }
          return next;
        });
        setMsgTitle(''); setMsgBody(''); setMsgSelectedUser(null); setMsgUserSearch('');
        setMsgSent('تم إرسال الرسالة بنجاح ✓');
        setTimeout(() => setMsgSent(''), 4000);
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setMsgSent(`خطأ: ${err.error ?? res.statusText}`);
        setTimeout(() => setMsgSent(''), 5000);
      }
    } catch { setMsgSent('خطأ في الاتصال'); setTimeout(() => setMsgSent(''), 5000); } finally { setMsgSending(false); }
  };


  const startBroadcast = async () => {
    if (!broadcastText.trim() || !token) return;
    setBroadcastStarting(true);
    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({
          text: broadcastText,
          textColor: broadcastTextColor,
          speed: broadcastSpeed,
          ...(broadcastCountdownEnabled && parseInt(broadcastCountdownSecs) > 0 ? {
            countdown: parseInt(broadcastCountdownSecs),
            countdownColor: broadcastCountdownColor,
          } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json() as BroadcastData;
        queryClient.setQueryData<BroadcastData | null>(['admin-broadcast'], data);
        setBroadcastElapsed(0);
        if (data.endsAt) setBroadcastRemaining(Math.max(0, Math.floor((new Date(data.endsAt).getTime() - Date.now()) / 1000)));
        setBroadcastText('');
      }
    } catch {} finally { setBroadcastStarting(false); }
  };

  const stopBroadcast = async () => {
    if (!token) return;
    await fetch('/api/broadcast', { method: 'DELETE', headers: { 'X-Admin-Token': token } });
    queryClient.setQueryData<BroadcastData | null>(['admin-broadcast'], null);
    setBroadcastElapsed(0);
    setBroadcastRemaining(0);
  };




  const saveVendor = async () => {
    if (!vendorForm.businessName || !vendorForm.category) {
      setVendorMsg('اسم النشاط والفئة مطلوبان'); return;
    }
    setVendorSaving(true);
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({
          user_id: vendorForm.supabaseId || null,
          business_name: vendorForm.businessName,
          owner_name: vendorForm.fullName || '',
          email: vendorForm.email || '',
          phone: vendorForm.phone || '',
          governorate: vendorForm.governorate || '',
          city: vendorForm.city || '',
          address: vendorForm.address || '',
          category_ids: vendorForm.category ? [vendorForm.category] : [],
          trust_score: Math.min(10, Math.max(1, Math.round(Number(vendorForm.trustScore) / 10))),
        }),
      });
      if (res.ok) {
        setVendorMsg('تم إنشاء حساب التاجر بنجاح');
        setCreateVendorOpen(false);
        setVendorForm({ supabaseId: '', businessName: '', fullName: '', email: '', phone: '', governorate: '', city: '', address: '', category: '', trustScore: '50', logoUrl: '' });
        void queryClient.invalidateQueries({ queryKey: ['admin-vendors', token] });
        setTimeout(() => setVendorMsg(''), 4000);
      } else { const d = await res.json() as { error?: string }; setVendorMsg(`${d.error ?? 'فشل الإنشاء'}`); }
    } catch { setVendorMsg('خطأ في الاتصال'); }
    setVendorSaving(false);
  };

  const updateAppStatus = async (id: number, status: 'approved' | 'rejected', adminNotes?: string) => {
    if (status === 'approved') {
      const app = vendorApplications.find(a => a.id === id);
      if (app) {
        setAcceptingApp(app);
        setAcceptUserId('');
        setAcceptTrustScore('50');
        setAcceptLphId('');
        setAcceptNotifTitle('تم قبول طلبك');
        setAcceptNotifBody(`مرحباً ${app.fullName}! تم قبول طلب عضوية "${app.businessName}" في منصة LiraPro. يمكنك الآن الدخول كتاجر معتمد وإدارة أسعارك من لوحة التحكم.`);
        setAcceptMsg('');
        return;
      }
    }
    await fetch(`/api/admin/vendor-applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
      body: JSON.stringify({ status, reject_reason: adminNotes }),
    });
    void queryClient.invalidateQueries({ queryKey: ['admin-vendor-apps', token] });
  };

  const confirmAcceptApp = async () => {
    if (!acceptingApp) return;
    if (!acceptUserId.trim()) { setAcceptMsg('يرجى إدخال Supabase ID'); return; }
    setAcceptSaving(true);
    try {
      await fetch(`/api/admin/vendor-applications/${acceptingApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({ status: 'approved' }),
      });
      await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({
          user_id: acceptUserId.trim() || null,
          business_name: acceptingApp.businessName,
          owner_name: acceptingApp.fullName,
          email: acceptingApp.email,
          phone: acceptingApp.phone,
          governorate: acceptingApp.governorate,
          city: acceptingApp.city,
          address: acceptingApp.address,
          category_ids: acceptingApp.category ? [acceptingApp.category] : [],
          trust_score: Math.min(10, Math.max(1, Math.round(Number(acceptTrustScore) / 10))),
        }),
      });
      if (acceptNotifTitle && acceptNotifBody) {
        const targetUser = users.find(u => u.supabaseId === acceptUserId.trim());
        const targetWalletId = targetUser?.walletId;
        if (targetWalletId) {
          await fetch('/api/notifications/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
            body: JSON.stringify({
              walletId: targetWalletId,
              title: acceptNotifTitle,
              body: acceptNotifBody,
              type: 'success',
            }),
          });
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-vendor-apps', token] });
      void queryClient.invalidateQueries({ queryKey: ['admin-vendors', token] });
      setNotifyApp(acceptingApp);
      setAcceptingApp(null);
      document.dispatchEvent(new CustomEvent('syp-vendor-approved'));
    } catch { setAcceptMsg('خطأ في الاتصال'); }
    setAcceptSaving(false);
  };

  const confirmRejectApp = async () => {
    if (!rejectingApp) return;
    setRejectSaving(true);
    try {
      await fetch(`/api/admin/vendor-applications/${rejectingApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (rejectNotifTitle) {
        const targetUser = users.find(u =>
          u.supabaseId === rejectUserId.trim() ||
          u.email?.toLowerCase() === rejectingApp.email?.toLowerCase()
        );
        const targetWalletId = targetUser?.walletId;
        if (targetWalletId) {
          await fetch('/api/notifications/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
            body: JSON.stringify({
              walletId: targetWalletId,
              title: rejectNotifTitle,
              body: rejectNotifBody,
              type: 'warning',
            }),
          });
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-vendor-apps', token] });
      setRejectingApp(null);
    } catch { setRejectMsg('خطأ في الاتصال'); }
    setRejectSaving(false);
  };

  const sendAppNotification = async (app: VendorApplication) => {
    setSendingAppNotif(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({
          title: 'طلب عضوية مقبول',
          body: `تم قبول طلب عضوية ${app.businessName} — ${app.fullName} في المنصة.`,
          type: 'success',
        }),
      });
      if (res.ok) {
        setNotifyApp(null);
        void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      }
    } catch {}
    setSendingAppNotif(false);
  };

  const _deleteVendor = (id: number) => {
    openConfirm({
      title: 'حذف التاجر',
      body: 'هل أنت متأكد من حذف هذا التاجر؟ سيتم إعادة دوره لمستخدم عادي.',
      destructive: true,
      confirmLabel: 'حذف',
      onConfirm: async () => {
        await fetch(`/api/admin/vendors/${id}`, { method: 'DELETE', headers: { 'X-Admin-Token': token ?? '' } });
        void queryClient.invalidateQueries({ queryKey: ['admin-vendors', token] });
      },
    });
  };

  const fetchOverrideHistory = useCallback(async () => {
    setOverrideHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/override-history?limit=50', {
        headers: { 'X-Admin-Token': token ?? '' },
      });
      if (res.ok) {
        const data = await res.json() as OverrideHistoryEntry[];
        setOverrideHistory(data);
      }
    } catch {} finally {
      setOverrideHistoryLoading(false);
    }
  }, [token]);

  const handleClearHistory = useCallback(async () => {
    setClearHistoryLoading(true);
    try {
      const url = clearHistoryDays === 'all'
        ? '/api/admin/override-history'
        : `/api/admin/override-history?olderThanDays=${clearHistoryDays}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': token ?? '' },
      });
      if (res.ok) {
        setClearHistoryDialogOpen(false);
        setOverrideHistory([]);
        await fetchOverrideHistory();
      }
    } catch {} finally {
      setClearHistoryLoading(false);
    }
  }, [token, clearHistoryDays, fetchOverrideHistory]);



  const saveGoldOverride = async () => {
    const price = parseFloat(goldOverrideInput.replace(/,/g, ''));
    if (isNaN(price) || price <= 0) { setGoldOverrideMsg('يرجى إدخال رقم صحيح'); return; }
    try {
      const sbToken = await getSupabaseToken();
      const res = await fetch('/api/settings/gold-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '', ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) },
        body: JSON.stringify({ pricePerGramSYP: price }),
      });
      if (res.ok) {
        void queryClient.invalidateQueries({ queryKey: ['admin-gold-override'] });
        setGoldOverrideEdit(null);
        setGoldOverrideMsg('تم حفظ سعر الذهب اليدوي');
        refetchGold();
        setTimeout(() => setGoldOverrideMsg(''), 3000);
      }
    } catch { setGoldOverrideMsg('فشل الحفظ'); }
  };

  const clearGoldOvr = async () => {
    try {
      const sbToken = await getSupabaseToken();
      await fetch('/api/settings/gold-rate', { method: 'DELETE', headers: { 'X-Admin-Token': token ?? '', ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) } });
      void queryClient.invalidateQueries({ queryKey: ['admin-gold-override'] });
      setGoldOverrideMsg('تم إلغاء التجاوز، سيعود للسعر التلقائي');
      refetchGold();
      setTimeout(() => setGoldOverrideMsg(''), 3000);
    } catch {}
  };

  const reactivateMetalOvr = async (symbol: string) => {
    const detail = metalOverridesDetail[symbol];
    if (!detail) return;
    try {
      const sbToken = await getSupabaseToken();
      const res = await fetch(`/api/settings/metal-rates/${symbol}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '', ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) },
        body: JSON.stringify({ priceSYP: detail.priceSYP }),
      });
      if (res.ok) {
        setMetalMsg('تم تفعيل السعر المحفوظ');
        void queryClient.invalidateQueries({ queryKey: ['admin-metal-rates'] });
        setTimeout(() => setMetalMsg(''), 3000);
      }
    } catch {}
  };

  const saveMetalOverride = async (symbol: string) => {
    const price = parseFloat(editMetalVal.replace(/,/g, ''));
    if (isNaN(price) || price <= 0) { setMetalMsg('يرجى إدخال رقم صحيح'); return; }
    try {
      const sbToken = await getSupabaseToken();
      const res = await fetch(`/api/settings/metal-rates/${symbol}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '', ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) },
        body: JSON.stringify({ priceSYP: price }),
      });
      if (res.ok) {
        setEditMetal(null);
        setEditMetalVal('');
        setMetalMsg('تم حفظ السعر');
        void queryClient.invalidateQueries({ queryKey: ['admin-metal-rates'] });
        setTimeout(() => setMetalMsg(''), 3000);
      }
    } catch { setMetalMsg('فشل الحفظ'); }
  };

  const clearMetalOvr = async (symbol: string) => {
    try {
      const sbToken = await getSupabaseToken();
      await fetch(`/api/settings/metal-rates/${symbol}`, { method: 'DELETE', headers: { 'X-Admin-Token': token ?? '', ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) } });
      void queryClient.invalidateQueries({ queryKey: ['admin-metal-rates'] });
    } catch {}
  };



  /** Returns the current Supabase access token to send as Authorization header. */
  const getSupabaseToken = useCallback(async (): Promise<string> => {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? '';
    } catch {
      return '';
    }
  }, []);

  // Poll for new user registrations and vendor applications every 30s
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/new-events?since=${encodeURIComponent(newEventsCheckRef.current)}`, {
          headers: { 'X-Admin-Token': token },
        });
        if (res.ok && alive) {
          const data = await res.json() as { newUsers: number; newApplications: number; checkedAt: string };
          newEventsCheckRef.current = data.checkedAt;
          setNewEvents({ users: data.newUsers, applications: data.newApplications });
        }
      } catch { /* silent */ }
    };
    void poll();
    const id = setInterval(() => void poll(), 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [token]);

  // Broadcast: live elapsed + countdown timers
  useEffect(() => {
    if (!broadcastActive) return;
    const interval = setInterval(() => {
      setBroadcastElapsed(Math.floor((Date.now() - new Date(broadcastActive.startedAt).getTime()) / 1000));
      if (broadcastActive.endsAt) {
        const rem = Math.max(0, Math.floor((new Date(broadcastActive.endsAt).getTime() - Date.now()) / 1000));
        setBroadcastRemaining(rem);
        if (rem === 0) {
          queryClient.setQueryData<BroadcastData | null>(['admin-broadcast'], null);
          clearInterval(interval);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [broadcastActive, queryClient]);

  // Compute AI rating stats from all stored conversations
  const aiRatingStats = useMemo(() => {
    const dailyMap: Record<string, { up: number; down: number }> = {};
    let totalUp = 0, totalDown = 0;
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('syp-conv-')) continue;
      try {
        const conv = JSON.parse(localStorage.getItem(key) ?? '');
        for (const msg of (conv?.msgs ?? [])) {
          if (!msg.rating) continue;
          const day = new Date(msg.timestamp).toISOString().slice(0, 10);
          if (!dailyMap[day]) dailyMap[day] = { up: 0, down: 0 };
          if (msg.rating === 'up') { totalUp++; dailyMap[day].up++; }
          else if (msg.rating === 'down') { totalDown++; dailyMap[day].down++; }
        }
      } catch {}
    }
    const daily = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, counts]) => ({ date, ...counts }));
    return { totalUp, totalDown, daily };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Supabase Real-Time Subscriptions ──────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
        void queryClient.invalidateQueries({ queryKey: ['admin-stats', token] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_applications' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-vendor-apps', token] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-vendors', token] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bans' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
        void queryClient.invalidateQueries({ queryKey: ['admin-stats', token] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delete_requests' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-deletion-reqs', token] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token, queryClient]);


  const userLphIds = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => { if (u.supabaseId) { const lph = localStorage.getItem(`syp-lph-${u.supabaseId}`); if (lph) map[u.supabaseId] = lph; } });
    return map;
  }, [users]);
  const [verifyStatusOverride, setVerifyStatusOverride] = useState<Record<string, string>>({});
  const userVerifyStatus = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => { if (u.supabaseId) { const v = localStorage.getItem(`syp-verify-status-${u.supabaseId}`); if (v) map[u.supabaseId] = v; } });
    return { ...map, ...verifyStatusOverride };
  }, [users, verifyStatusOverride]);

  // ── Action handlers ────────────────────────────────────────────────────────

  const handleBanUser = async (walletId: string) => {
    const u = users.find(u => u.walletId === walletId);
    const reason = banReason;
    try {
      await fetch(`/api/admin/users/${walletId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({ reason: reason || 'تم الحظر من قبل المدير' }),
      });
      queryClient.setQueryData<RegisteredUser[]>(['admin-users', token], prev => prev?.map(u2 => u2.walletId === walletId ? { ...u2, banned: true, banReason: reason || 'تم الحظر من قبل المدير' } : u2) ?? []);
      setBanReason('');
      setBanningUser(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
      await queryClient.invalidateQueries({ queryKey: ['admin-stats', token] });
      setActionNotif({
        visible: true, walletId, targetName: u?.fullName || u?.businessName || walletId,
        title: 'تم تقييد حسابك',
        body: `تم تقييد حسابك على منصة LiraPro${reason ? ` بسبب: ${reason}` : ''}. للاستفسار تواصل مع الدعم.`,
        type: 'warning', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
        sending: false, msg: '',
      });
    } catch {}
  };

  const handleUnbanUser = async (walletId: string) => {
    const u = users.find(u => u.walletId === walletId);
    try {
      const res = await fetch(`/api/admin/users/${walletId}/unban`, {
        method: 'POST',
        headers: { 'X-Admin-Token': token ?? '' },
      });
      const data = await res.json().catch(() => ({})) as { success?: boolean; error?: string };
      if (!res.ok || data.success === false) {
        toast.error(data.error ?? 'فشل رفع الحظر: المستخدم غير موجود في قاعدة البيانات');
        return;
      }
      queryClient.setQueryData<RegisteredUser[]>(['admin-users', token], prev => prev?.map(u2 => u2.walletId === walletId ? { ...u2, banned: false, banReason: '' } : u2) ?? []);
      await queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
      await queryClient.invalidateQueries({ queryKey: ['admin-stats', token] });
      setActionNotif({
        visible: true, walletId, targetName: u?.fullName || u?.businessName || walletId,
        title: 'تم رفع الحظر عن حسابك',
        body: `تم رفع الحظر عن حسابك على منصة LiraPro. يمكنك الآن استخدام جميع مزايا المنصة بشكل طبيعي.`,
        type: 'success', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
        sending: false, msg: '',
      });
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleRestrictUser = async (walletId: string) => {
    const u = users.find(u => u.walletId === walletId);
    const days = parseInt(restrictDays);
    if (!days || days < 1) return;
    try {
      await fetch(`/api/admin/users/${walletId}/restrict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({ reason: restrictReason || 'تم التقييد من قبل المدير', days }),
      });
      setRestrictReason('');
      setRestrictDays('');
      setRestrictingUser(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
      setActionNotif({
        visible: true, walletId, targetName: u?.fullName || u?.businessName || walletId,
        title: `تم تقييد حسابك لمدة ${days} يوم`,
        body: restrictReason || `تم تقييد حسابك على منصة LiraPro مؤقتاً لمدة ${days} يوماً.`,
        type: 'warning', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
        sending: false, msg: '',
      });
    } catch {}
  };

  const handleUnrestrictUser = async (walletId: string) => {
    const u = users.find(u => u.walletId === walletId);
    try {
      await fetch(`/api/admin/users/${walletId}/unrestrict`, {
        method: 'POST',
        headers: { 'X-Admin-Token': token ?? '' },
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
      setActionNotif({
        visible: true, walletId, targetName: u?.fullName || u?.businessName || walletId,
        title: 'تم رفع التقييد عن حسابك',
        body: 'تم رفع التقييد عن حسابك على منصة LiraPro. يمكنك الآن استخدام جميع مزايا المنصة.',
        type: 'success', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
        sending: false, msg: '',
      });
    } catch {}
  };

  const handleSoftDeleteUser = async (walletId: string) => {
    const u = users.find(u => u.walletId === walletId);
    try {
      await fetch(`/api/admin/users/${walletId}/soft-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({ reason: deleteReason || 'تم حذف الحساب من قبل المدير' }),
      });
      setDeleteReason('');
      setDeletingUser(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
      setActionNotif({
        visible: true, walletId, targetName: u?.fullName || u?.businessName || walletId,
        title: 'تم حذف حسابك',
        body: deleteReason || 'تم حذف حسابك من منصة LiraPro. تواصل مع الدعم للاستفسار.',
        type: 'warning', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
        sending: false, msg: '',
      });
    } catch {}
  };

  const handleUndeleteUser = async (walletId: string) => {
    const u = users.find(u => u.walletId === walletId);
    try {
      const res = await fetch(`/api/admin/users/${walletId}/undelete`, {
        method: 'POST',
        headers: { 'X-Admin-Token': token ?? '' },
      });
      if (!res.ok) return;
      setDeletingUser(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
      setActionNotif({
        visible: true, walletId, targetName: u?.fullName || u?.businessName || walletId,
        title: 'تم استرجاع حسابك',
        body: 'تم استرجاع حسابك على منصة LiraPro بنجاح. يمكنك الآن تسجيل الدخول واستخدام خدمات المنصة.',
        type: 'success', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
        sending: false, msg: '',
      });
    } catch {}
  };

  const handleDeleteUser = (walletId: string) => {
    const u = users.find(u => u.walletId === walletId);
    openConfirm({
      title: 'حذف المستخدم نهائياً',
      body: `هل أنت متأكد من حذف ${u?.fullName || u?.email || walletId}؟ سيُحذف من قاعدة البيانات وحساب Supabase بشكل دائم لا يمكن التراجع عنه.`,
      destructive: true,
      confirmLabel: 'حذف نهائياً',
      onConfirm: async () => {
        try {
          await fetch(`/api/admin/users/${walletId}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Token': token ?? '' },
          });
          setExpandedUser(null);
          await queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
          await queryClient.invalidateQueries({ queryKey: ['admin-stats', token] });
        } catch {}
      },
    });
  };

  const handleDeletionRequest = async (id: string, req: DeletionRequest) => {
    try {
      await fetch(`/api/admin/deletion-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({ status: 'handled' }),
      });
      // Hard delete the user from DB and Supabase auth
      if (req.walletId) {
        await fetch(`/api/admin/users/${req.walletId}`, {
          method: 'DELETE',
          headers: { 'X-Admin-Token': token ?? '' },
        }).catch(() => {});
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-deletion-reqs', token] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
      await queryClient.invalidateQueries({ queryKey: ['admin-stats', token] });
      setActionNotif({
        visible: true, walletId: req.walletId, targetName: req.fullName,
        title: 'تم قبول طلب الحذف ومعالجته',
        body: `تم حذف حساب ${req.fullName ?? ''} نهائياً من المنصة.`,
        type: 'info', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
        sending: false, msg: '',
      });
    } catch {}
  };

  const handleDeletionReject = async (id: string, req: DeletionRequest) => {
    try {
      await fetch(`/api/admin/deletion-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-deletion-reqs', token] });
      await queryClient.invalidateQueries({ queryKey: ['admin-stats', token] });
      setActionNotif({
        visible: true, walletId: req.walletId, targetName: req.fullName,
        title: 'تم رفض طلب حذف حسابك',
        body: `تم مراجعة طلب حذف حساب ${req.fullName ?? ''} ورفضه. حسابك لا يزال نشطاً. للاستفسار تواصل معنا.`,
        type: 'warning', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
        sending: false, msg: '',
      });
    } catch {}
  };

  const saveBuySellOverride = async (code: string) => {
    const buyPrice = editBuyVal ? parseFloat(editBuyVal) : undefined;
    const sellPrice = editSellVal ? parseFloat(editSellVal) : undefined;
    try {
      const sbToken = await getSupabaseToken();
      const res = await fetch('/api/admin/rate-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '', ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) },
        body: JSON.stringify({ code, buyPrice, sellPrice }),
      });
      if (res.ok) {
        setRateMsg('تم حفظ السعر بنجاح');
        setEditCurrency(null);
        setEditBuyVal('');
        setEditSellVal('');
        await queryClient.invalidateQueries({ queryKey: ['admin-buy-sell-overrides'] });
        setTimeout(() => setRateMsg(''), 3000);
      }
    } catch {}
  };

  const deleteBuySellOverride = async (code: string) => {
    try {
      const sbToken = await getSupabaseToken();
      await fetch(`/api/admin/rate-overrides/${code}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': token ?? '', ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) },
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-buy-sell-overrides'] });
    } catch {}
  };

  const saveSypRate = async (newIsManual: boolean) => {
    if (!token) return;
    setSypRateSaving(true);
    const rate = parseFloat(sypRateInput.replace(/,/g, ''));
    if (isNaN(rate) || rate <= 0) { setSypRateMsg('يرجى إدخال رقم صحيح'); setSypRateSaving(false); return; }
    try {
      const sbToken = await getSupabaseToken();
      const res = await fetch('/api/settings/syp-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token, ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) },
        body: JSON.stringify({ rate, isManual: newIsManual }),
      });
      if (res.ok) {
        const data = await res.json() as { rate: number; isManual: boolean; updatedAt: string };
        void queryClient.invalidateQueries({ queryKey: ['admin-syp-rate'] });
        setSypRateEdit(null);
        setSypRateMsg(data.isManual ? 'تم تفعيل السعر اليدوي بنجاح' : 'تم الرجوع للسعر التلقائي بنجاح');
        refetchRates(); refetchGold();
        setTimeout(() => setSypRateMsg(''), 4000);
      } else {
        setSypRateMsg('فشل الحفظ، حاول مجدداً');
      }
    } catch { setSypRateMsg('خطأ في الاتصال'); }
    setSypRateSaving(false);
  };

  const sendNotification = async () => {
    if (!notifTitle || !notifBody || !token) return;
    if (notifTarget === 'specific' && !notifSelectedWallet) {
      setNotifMsg('يرجى اختيار مستخدم محدد');
      return;
    }
    setSendingNotif(true);
    try {
      if (notifTarget === 'specific' && notifSelectedWallet) {
        const res = await fetch('/api/notifications/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
          body: JSON.stringify({
            walletId: notifSelectedWallet,
            title: notifTitle, body: notifBody, type: notifType,
            ...(notifSender ? { sender: notifSender } : {}),
            ...(notifSelectedName ? { targetName: notifSelectedName } : {}),
          }),
        });
        if (res.ok) {
          setNotifMsg('تم إرسال الإشعار الشخصي بنجاح');
          setNotifTitle(''); setNotifBody('');
          setNotifSelectedWallet(null); setNotifSelectedName(''); setNotifUserSearch('');
          setTimeout(() => setNotifMsg(''), 3000);
        } else { setNotifMsg('فشل إرسال الإشعار الشخصي'); }
      } else {
        const res = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
          body: JSON.stringify({
            title: notifTitle, body: notifBody, type: notifType,
            ...(notifSender ? { sender: notifSender } : {}),
          }),
        });
        if (res.ok) {
          setNotifMsg('تم الإرسال لجميع المستخدمين بنجاح');
          setNotifTitle(''); setNotifBody('');
          await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
          await queryClient.invalidateQueries({ queryKey: ['admin-stats', token] });
          setTimeout(() => setNotifMsg(''), 3000);
        } else { setNotifMsg('فشل الإرسال، حاول مجدداً'); }
      }
    } catch { setNotifMsg('خطأ في الاتصال، حاول مجدداً'); }
    setSendingNotif(false);
  };

  const saveVendorDetail = async () => {
    if (!vendorDetailEdit || !token) return;
    setVendorDetailSaving(true);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorDetailEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({
          businessName: vendorDetailEdit.businessName,
          fullName: vendorDetailEdit.fullName,
          email: vendorDetailEdit.email,
          phone: vendorDetailEdit.phone,
          governorate: vendorDetailEdit.governorate,
          city: vendorDetailEdit.city,
          category: vendorDetailEdit.category,
          trustScore: vendorDetailEdit.trustScore,
        }),
      });
      if (res.ok) {
        const updated = await res.json() as VendorProfileAdmin;
        setVendorDetail(updated);
        setVendorDetailEdit(updated);
        queryClient.setQueryData<VendorProfileAdmin[]>(['admin-vendors', token], v => v?.map(x => x.id === updated.id ? updated : x) ?? []);
        setVendorDetailMsg('تم الحفظ بنجاح');
        setTimeout(() => setVendorDetailMsg(''), 3000);
      } else { setVendorDetailMsg('فشل الحفظ'); }
    } catch { setVendorDetailMsg('خطأ في الاتصال'); }
    setVendorDetailSaving(false);
  };

  const toggleVendorBan = async () => {
    if (!vendorDetailEdit || !token) return;
    const newIsActive = !vendorDetailEdit.isActive;
    try {
      const res = await fetch(`/api/admin/vendors/${vendorDetailEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ isActive: newIsActive }),
      });
      if (res.ok) {
        const updated = await res.json() as VendorProfileAdmin;
        setVendorDetail(updated);
        setVendorDetailEdit(updated);
        queryClient.setQueryData<VendorProfileAdmin[]>(['admin-vendors', token], v => v?.map(x => x.id === updated.id ? updated : x) ?? []);
        if (!newIsActive) {
          const walletId = users.find(u => u.supabaseId === updated.supabaseId)?.walletId;
          setActionNotif({
            visible: true, walletId, targetName: updated.businessName,
            title: 'تم إيقاف حسابك مؤقتاً',
            body: `تم إيقاف حساب ${updated.businessName} من قِبَل إدارة المنصة. للاستفسار تواصل معنا.`,
            type: 'warning', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
            sending: false, msg: '',
          });
        }
      }
    } catch { /**/ }
  };

  const deleteVendorFromDetail = () => {
    if (!vendorDetail) return;
    setVendorDeleteConfirm(true);
  };

  const confirmDeleteVendor = async () => {
    if (!vendorDetail || !token) return;
    setVendorDeleteConfirm(false);
    try {
      await fetch(`/api/admin/vendors/${vendorDetail.id}`, {
        method: 'DELETE', headers: { 'X-Admin-Token': token },
      });
      const walletId = users.find(u => u.supabaseId === vendorDetail.supabaseId)?.walletId;
      queryClient.setQueryData<VendorProfileAdmin[]>(['admin-vendors', token], v => v?.filter(x => x.id !== vendorDetail.id) ?? []);
      setVendorDetail(null);
      setVendorDetailEdit(null);
      if (walletId) {
        setActionNotif({
          visible: true, walletId, targetName: vendorDetail.businessName,
          title: 'تم حذف حسابك',
          body: `تم حذف حساب ${vendorDetail.businessName} نهائياً من المنصة.`,
          type: 'warning', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
          sending: false, msg: '',
        });
      }
    } catch { /**/ }
  };

  const deleteNotification = async (id: number) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: { 'X-Admin-Token': token ?? '' } });
    setSelectedNotifIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
  };

  const bulkDeleteNotifications = async () => {
    if (selectedNotifIds.size === 0) return;
    await Promise.all([...selectedNotifIds].map(id =>
      fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: { 'X-Admin-Token': token ?? '' } })
    ));
    setSelectedNotifIds(new Set());
    await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
  };

  const editNotification = async (id: number) => {
    setSavingNotif(true);
    await fetch(`/api/notifications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
      body: JSON.stringify({ title: editNotifTitle, body: editNotifBody }),
    });
    setSavingNotif(false);
    setEditingNotifId(null);
    await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
  };

  const saveKaratOverride = async (karatKey: string) => {
    const price = parseFloat(editKaratVal.replace(/,/g, ''));
    if (isNaN(price) || price <= 0) { setKaratMsg('يرجى إدخال رقم صحيح'); return; }
    try {
      const sbToken = await getSupabaseToken();
      const res = await fetch(`/api/settings/metal-rates/${karatKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '', ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) },
        body: JSON.stringify({ priceSYP: price }),
      });
      if (res.ok) {
        setEditKarat(null);
        setEditKaratVal('');
        setKaratMsg('تم حفظ سعر القيراط');
        void queryClient.invalidateQueries({ queryKey: ['admin-metal-rates'] });
        setTimeout(() => setKaratMsg(''), 3000);
      }
    } catch { setKaratMsg('فشل الحفظ'); }
  };

  const clearKaratOvr = async (karatKey: string) => {
    try {
      const sbToken = await getSupabaseToken();
      await fetch(`/api/settings/metal-rates/${karatKey}`, { method: 'DELETE', headers: { 'X-Admin-Token': token ?? '', ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) } });
      void queryClient.invalidateQueries({ queryKey: ['admin-metal-rates'] });
    } catch {}
  };

  const reactivateKaratOvr = async (karatKey: string) => {
    const detail = karatOverridesDetail[karatKey];
    if (!detail) return;
    try {
      const sbToken = await getSupabaseToken();
      const res = await fetch(`/api/settings/metal-rates/${karatKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '', ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) },
        body: JSON.stringify({ priceSYP: detail.priceSYP }),
      });
      if (res.ok) {
        setKaratMsg('تم تفعيل السعر المحفوظ');
        void queryClient.invalidateQueries({ queryKey: ['admin-metal-rates'] });
        setTimeout(() => setKaratMsg(''), 3000);
      }
    } catch {}
  };

  const toggleUserVerify = (userId: string) => {
    const current = userVerifyStatus[userId];
    const next = current === 'approved' ? 'rejected' : 'approved';
    localStorage.setItem(`syp-verify-status-${userId}`, next);
    setVerifyStatusOverride(prev => ({ ...prev, [userId]: next }));
    if (next === 'approved') {
      localStorage.setItem(`syp-user-badge-${userId}`, 'golden');
    } else {
      localStorage.removeItem(`syp-user-badge-${userId}`);
    }
    const u = users.find(u => u.supabaseId === userId);
    setActionNotif({
      visible: true, walletId: u?.walletId, targetName: u?.fullName || u?.businessName || userId,
      title: next === 'approved' ? 'تم توثيق حسابك ✓' : 'تم إلغاء توثيق حسابك',
      body: next === 'approved'
        ? `تهانينا! تم توثيق حسابك. ستظهر علامة التوثيق بجانب اسمك الآن.`
        : `تم إلغاء توثيق حسابك. للاستفسار تواصل مع فريق الدعم.`,
      type: next === 'approved' ? 'success' : 'info',
      sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
      sending: false, msg: '',
    });
  };

  const saveUserEdit = async (walletId: string) => {
    setUserEditSaving(true);
    setUserEditResult(null);
    try {
      const res = await fetch(`/api/admin/users/${walletId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify(userEditForm),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
        setUserEditResult('ok');
        setTimeout(() => { setEditingUser(null); setUserEditResult(null); }, 1200);
      } else {
        setUserEditResult('err');
      }
    } catch { setUserEditResult('err'); }
    setUserEditSaving(false);
  };


  const handleVerifyApprove = (req: VerifyRequest) => {
    try {
      fetch(`/api/admin/verify-requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({ action: 'approved' }),
      }).then(() => void queryClient.invalidateQueries({ queryKey: ['admin-verify-reqs', token] })).catch(() => {});
      localStorage.setItem(`syp-verify-status-${req.supabaseId}`, 'approved');
      void queryClient.invalidateQueries({ queryKey: ['admin-verify-reqs', token] });
      const walletId = users.find(u => u.supabaseId === req.supabaseId)?.walletId;
      setActionNotif({
        visible: true, walletId, targetName: req.fullName,
        title: 'تم قبول طلب التوثيق ✓',
        body: `تهانينا ${req.fullName}! تم قبول طلب توثيق حسابك. ستظهر علامة التوثيق بجانب اسمك الآن.`,
        type: 'success', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
        sending: false, msg: '',
      });
    } catch {}
  };

  const handleVerifyReject = (req: VerifyRequest) => {
    try {
      fetch(`/api/admin/verify-requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
        body: JSON.stringify({ action: 'rejected' }),
      }).then(() => void queryClient.invalidateQueries({ queryKey: ['admin-verify-reqs', token] })).catch(() => {});
      localStorage.setItem(`syp-verify-status-${req.supabaseId}`, 'rejected');
      void queryClient.invalidateQueries({ queryKey: ['admin-verify-reqs', token] });
      const walletId = users.find(u => u.supabaseId === req.supabaseId)?.walletId;
      setActionNotif({
        visible: true, walletId, targetName: req.fullName,
        title: 'تم رفض طلب التوثيق',
        body: `${req.fullName}، تم مراجعة طلب التوثيق الخاص بك ورفضه في هذه المرحلة. يمكنك إعادة التقديم لاحقاً.`,
        type: 'warning', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
        sending: false, msg: '',
      });
    } catch {}
  };

  const sendActionNotification = async () => {
    if (!actionNotif || !actionNotif.title || !actionNotif.body || !token) return;
    setActionNotif(s => s ? { ...s, sending: true } : s);
    try {
      // walletId maps to supabaseId for notification targeting
      const targetUser = actionNotif.walletId ? users.find(u => u.walletId === actionNotif.walletId) : null;
      const targetId = targetUser?.supabaseId ?? actionNotif.walletId;
      const endpoint = targetId ? '/api/notifications/user' : '/api/notifications';
      const body = targetId
        ? { walletId: targetId, title: actionNotif.title, body: actionNotif.body, type: actionNotif.type, ...(actionNotif.sender ? { sender: actionNotif.sender } : {}) }
        : { title: actionNotif.title, body: actionNotif.body, type: actionNotif.type, ...(actionNotif.sender ? { sender: actionNotif.sender } : {}) };
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setActionNotif(s => s ? { ...s, sending: false, msg: 'تم إرسال الإشعار بنجاح ✓' } : s);
        setTimeout(() => setActionNotif(null), 2000);
      } else {
        setActionNotif(s => s ? { ...s, sending: false, msg: 'فشل الإرسال' } : s);
      }
    } catch {
      setActionNotif(s => s ? { ...s, sending: false, msg: 'خطأ في الاتصال' } : s);
    }
  };

  // ── Filtered users ─────────────────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
        if (userFilter === 'private') return u.accountType === 'private' && !u.banned && !u.softDeleted;
        if (userFilter === 'provider') return u.accountType === 'provider' && !u.banned && !u.softDeleted;
        if (userFilter === 'banned') return !!u.banned;
        if (userFilter === 'deleted') return !!u.softDeleted;
        if (userFilter === 'restricted') return !!u.restricted;
        return true;
      })
      .filter(u => {
        if (!userSearch) return true;
        const q = userSearch.toLowerCase();
        return (u.fullName ?? '').toLowerCase().includes(q)
          || (u.businessName ?? '').toLowerCase().includes(q)
          || (u.walletId ?? '').toLowerCase().includes(q)
          || (u.phone ?? '').includes(q)
          || (u.email ?? '').toLowerCase().includes(q)
          || (u.province ?? '').includes(q);
      });
  }, [users, userFilter, userSearch]);

  // ── Gate ───────────────────────────────────────────────────────────────────

  if (!token) return <LoginGate onLogin={setToken} />;

  // ── Tab fade variant ───────────────────────────────────────────────────────

  const tabVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
  };

  const pendingReqs = deletionRequests.filter(r => r.status === 'pending').length;
  const pendingApps = vendorApplications.filter(a => a.status === 'pending').length;
  const pendingSupportMsgs = (() => {
    try {
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('syp-conv-')) {
          const conv = JSON.parse(localStorage.getItem(key) ?? '{}');
          count += ((conv.msgs ?? []) as Array<{ role: string; read?: boolean }>)
            .filter(m => m.role === 'user' && !m.read).length;
        }
      }
      return count;
    } catch { return 0; }
  })();

  const pendingTickets = (() => {
    try {
      const tickets: Array<{ status: string }> = JSON.parse(localStorage.getItem('syp-tickets') ?? '[]');
      return tickets.filter(t => t.status === 'open').length;
    } catch { return 0; }
  })();

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-background" dir="rtl">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 shadow-md bg-gradient-to-l from-primary to-primary/70">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm leading-none">لوحة التحكم</p>
              <p className="text-white/50 text-[9px] leading-none mt-0.5">LiraPro Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { void queryClient.invalidateQueries({ queryKey: ['admin-stats', token] }); void queryClient.invalidateQueries({ queryKey: ['admin-users', token] }); void queryClient.invalidateQueries({ queryKey: ['admin-vendors', token] }); void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] }); }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => { sessionStorage.removeItem(ADMIN_TOKEN_KEY); setToken(null); }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-bold">
              خروج
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div ref={tabRef} className="flex overflow-x-auto scrollbar-hide border-t border-white/10">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const pendingVerify = verifyRequests.filter(r => r.status === 'pending').length;
            const totalRequestsBadge = pendingReqs + pendingVerify;
            const hasBadge = (tab.id === 'requests' && totalRequestsBadge > 0) || (tab.id === 'applications' && (pendingApps > 0 || newEvents.applications > 0)) || (tab.id === 'support' && pendingSupportMsgs > 0) || (tab.id === 'tickets' && pendingTickets > 0) || (tab.id === 'users' && newEvents.users > 0);
            const badgeCount = tab.id === 'requests' ? totalRequestsBadge : tab.id === 'applications' ? (pendingApps + newEvents.applications) : tab.id === 'support' ? pendingSupportMsgs : tab.id === 'tickets' ? pendingTickets : tab.id === 'users' ? newEvents.users : 0;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'users') setNewEvents(e => ({ ...e, users: 0 }));
                  if (tab.id === 'applications') setNewEvents(e => ({ ...e, applications: 0 }));
                }}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 text-[10px] font-bold transition-all relative ${
                  isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center">
                      {badgeCount}
                    </span>
                  )}
                </div>
                {tab.label}
                {isActive && (
                  <motion.div layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto p-4 pb-16">
        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════════════════════
              TAB 1 — DASHBOARD
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-4">

              {/* Main stats 2x2 — clickable */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="إجمالي المستخدمين" value={stats?.totalUsers ?? '—'}
                  icon={Users} color="#003C32" sub="اضغط لعرض المستخدمين"
                  onClick={() => setActiveTab('users')} />
                <StatCard label="نشطون اليوم" value={stats?.activeUsers ?? '—'}
                  icon={Activity} color="#0284c7" sub="اضغط للنظام"
                  onClick={() => setActiveTab('system')} />
                <StatCard label="زيارات اليوم" value={stats?.todayVisits ?? '—'}
                  icon={Globe} color="#D20073" sub={`إجمالي: ${stats?.totalVisits ?? '—'}`}
                  onClick={() => setActiveTab('system')} />
                <StatCard label="طلبات التوثيق / الحذف" value={(pendingReqs + verifyRequests.filter(r => r.status === 'pending').length) || '—'}
                  icon={FileX} color="#ef4444" sub={`الحذف: ${pendingReqs} · التوثيق: ${verifyRequests.filter(r => r.status === 'pending').length}`}
                  onClick={() => setActiveTab('requests')} />
              </div>

              {/* Active users today */}
              {(() => {
                const now = Date.now();
                const activeToday = users.filter(u =>
                  u.lastSeen && (now - new Date(u.lastSeen).getTime()) < 24 * 60 * 60 * 1000 && !u.softDeleted
                );
                if (activeToday.length === 0) return null;
                return (
                  <Card className="border-border shadow-sm overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-border" style={{ background: '#0284c710' }}>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" style={{ color: '#0284c7' }} />
                        <span className="font-bold text-sm">نشطون اليوم</span>
                        <span className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded">{activeToday.length}</span>
                      </div>
                      <button onClick={() => setActiveTab('users')} className="text-[11px] text-primary font-bold hover:underline">عرض الكل</button>
                    </div>
                    <CardContent className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {activeToday.slice(0, 16).map(u => (
                          <button key={u.id}
                            onClick={() => { setActiveTab('users'); setExpandedUser(u.id); }}
                            className="flex flex-col items-center gap-0.5 hover:scale-110 transition-transform active:scale-95"
                            title={u.fullName || u.businessName || '—'}>
                            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center font-black text-sm flex-shrink-0"
                              style={{ background: u.accountType === 'provider' ? '#D2007320' : '#003C3220', color: u.accountType === 'provider' ? '#D20073' : '#003C32' }}>
                              {u.profilePhoto
                                ? <img src={u.profilePhoto} alt="" className="w-full h-full object-cover" />
                                : <span>{(u.fullName || u.businessName || '؟').charAt(0).toUpperCase()}</span>
                              }
                            </div>
                            <span className="text-[9px] text-muted-foreground max-w-[36px] truncate leading-tight">
                              {(u.fullName || u.businessName || '؟').split(' ')[0]}
                            </span>
                          </button>
                        ))}
                        {activeToday.length > 16 && (
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold bg-secondary text-muted-foreground">
                            +{activeToday.length - 16}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Mini stats row — clickable */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'شخصي', val: stats?.privateUsers ?? 0, color: '#003C32', tab: 'users' },
                  { label: 'مزودون', val: stats?.providers ?? 0, color: '#D20073', tab: 'users' },
                  { label: 'محظورون', val: stats?.bannedUsers ?? 0, color: '#ef4444', tab: 'users' },
                  { label: 'إشعارات', val: notifications.length, color: '#0284c7', tab: 'notifications' },
                ].map(s => (
                  <button key={s.label}
                    onClick={() => setActiveTab(s.tab)}
                    className="bg-card border border-border shadow-sm rounded-xl active:scale-95 transition-transform hover:shadow-md">
                    <div className="p-2.5 text-center">
                      <p className="font-black text-lg" style={{ color: s.color }}>{s.val}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Recent users */}
              <Card className="border-border shadow-sm">
                <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm">آخر التسجيلات</span>
                  </div>
                  <button onClick={() => setActiveTab('users')}
                    className="text-[11px] text-primary font-bold hover:underline">عرض الكل</button>
                </div>
                <CardContent className="p-3 flex flex-col gap-2">
                  {users.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">لا يوجد مستخدمون بعد</p>
                  ) : (
                    users.slice(0, 5).map(u => (
                      <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: u.accountType === 'provider' ? '#D2007315' : '#003C3215' }}>
                          {u.accountType === 'provider'
                            ? <Building2 className="w-4 h-4" style={{ color: '#D20073' }} />
                            : <User className="w-4 h-4" style={{ color: '#003C32' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{u.fullName || u.businessName || 'مجهول'}</p>
                          <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{u.walletId}</p>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex-shrink-0">
                          {u.registeredAt ? timeAgo(u.registeredAt) : ''}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Registrations chart */}
              {(() => {
                const days = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() - (6 - i));
                  const label = d.toLocaleDateString('ar-SY', { weekday: 'short' });
                  const dateStr = d.toISOString().slice(0, 10);
                  const count = users.filter(u => (u.registeredAt ?? '').startsWith(dateStr)).length;
                  return { label, count };
                });
                const maxVal = Math.max(...days.map(d => d.count), 1);
                return (
                  <Card className="border-border shadow-sm">
                    <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
                      <Activity className="w-4 h-4 text-primary" />
                      <span className="font-bold text-sm">التسجيلات — آخر 7 أيام</span>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-end gap-2 h-20">
                        {days.map((d, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] font-bold text-foreground">{d.count || ''}</span>
                            <div className="w-full rounded-t-md transition-all"
                              style={{
                                height: `${Math.max((d.count / maxVal) * 52, d.count > 0 ? 6 : 2)}px`,
                                background: d.count > 0 ? '#003C32' : '#e5e7eb',
                              }} />
                            <span className="text-[8px] text-muted-foreground">{d.label}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* AI Response Rating Stats */}
              <Card className="border-border shadow-sm">
                <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">تقييمات ردود الذكاء الاصطناعي</span>
                  <span className="mr-auto text-[10px] text-muted-foreground">آخر 7 أيام</span>
                </div>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-green-50 dark:bg-green-900/20 col-span-1">
                      <ThumbsUp className="w-4 h-4 text-green-500" />
                      <p className="text-xl font-black text-green-600 dark:text-green-400">{aiRatingStats.totalUp}</p>
                      <p className="text-[9px] text-muted-foreground">إعجاب</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 col-span-1">
                      <ThumbsDown className="w-4 h-4 text-red-500" />
                      <p className="text-xl font-black text-red-600 dark:text-red-400">{aiRatingStats.totalDown}</p>
                      <p className="text-[9px] text-muted-foreground">عدم إعجاب</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-secondary/60 col-span-1">
                      <Activity className="w-4 h-4 text-primary" />
                      <p className="text-xl font-black text-primary">
                        {(aiRatingStats.totalUp + aiRatingStats.totalDown) > 0
                          ? `${Math.round(aiRatingStats.totalUp / (aiRatingStats.totalUp + aiRatingStats.totalDown) * 100)}%`
                          : '—'}
                      </p>
                      <p className="text-[9px] text-muted-foreground">رضا</p>
                    </div>
                  </div>
                  {aiRatingStats.daily.length > 0 ? (
                    <>
                      <div className="flex items-end gap-1.5 h-16">
                        {aiRatingStats.daily.map((d, i) => {
                          const maxVal = Math.max(...aiRatingStats.daily.map(x => x.up + x.down), 1);
                          const total = d.up + d.down;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                              <span className="text-[8px] text-foreground/60">{total || ''}</span>
                              <div className="w-full rounded-t-sm overflow-hidden flex flex-col"
                                style={{ height: `${Math.max((total / maxVal) * 40, total > 0 ? 4 : 2)}px` }}>
                                {d.up > 0 && <div style={{ flex: d.up, background: '#22c55e' }} />}
                                {d.down > 0 && <div style={{ flex: d.down, background: '#ef4444' }} />}
                              </div>
                              <span className="text-[7px] text-muted-foreground">{d.date.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />إعجاب</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />عدم إعجاب</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">لا توجد تقييمات بعد — ابدأ باستخدام المساعد الذكي</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 2 — USERS
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <motion.div key="users" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-3">

              {/* Stats bar */}
              <div className="grid grid-cols-6 gap-2">
                {[
                  { label: 'الكل', val: users.length, filter: 'all', color: '#003C32' },
                  { label: 'شخصي', val: users.filter(u => u.accountType === 'private' && !u.banned && !u.softDeleted).length, filter: 'private', color: '#0284c7' },
                  { label: 'مزود', val: users.filter(u => u.accountType === 'provider' && !u.banned && !u.softDeleted).length, filter: 'provider', color: '#D20073' },
                  { label: 'محظور', val: users.filter(u => !!u.banned).length, filter: 'banned', color: '#ef4444' },
                  { label: 'مقيد', val: users.filter(u => !!u.restricted).length, filter: 'restricted', color: '#f59e0b' },
                  { label: 'محذوف', val: users.filter(u => !!u.softDeleted).length, filter: 'deleted', color: '#6b7280' },
                ].map(s => (
                  <button key={s.filter} onClick={() => setUserFilter(s.filter)}
                    className={`rounded-xl p-2.5 text-center transition-all ${userFilter === s.filter ? 'shadow-md' : 'bg-card border border-border'}`}
                    style={userFilter === s.filter ? { background: s.color, color: 'white' } : {}}>
                    <p className="font-black text-base">{s.val}</p>
                    <p className="text-[9px] opacity-80 mt-0.5">{s.label}</p>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="البحث عن مستخدم..."
                  className="pr-9 h-11 rounded-xl" />
                {userSearch && (
                  <button onClick={() => setUserSearch('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">
                    {users.length === 0 ? 'لا يوجد مستخدمون مسجلون بعد' : 'لا توجد نتائج مطابقة'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {users.length === 0 ? 'سيظهر المستخدمون هنا بعد تسجيل أول حساب' : ''}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground px-1">
                    عرض {filteredUsers.length} من {users.length} مستخدم
                  </p>
                  {filteredUsers.map(u => {
                    const isExpanded = expandedUser === u.id;
                    const isProvider = u.accountType === 'provider';
                    return (
                      <Card key={u.id} className={`border-border shadow-sm overflow-hidden ${u.banned ? 'border-red-200 dark:border-red-900/40' : ''}`}>
                        {/* Collapsed header */}
                        <button className="w-full p-3 flex items-center gap-3 text-right"
                          onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-base overflow-hidden"
                            style={{
                              background: u.softDeleted ? '#6b728020' : u.banned ? '#ef444420' : isProvider ? '#D2007320' : '#003C3220',
                              color: u.softDeleted ? '#6b7280' : u.banned ? '#ef4444' : isProvider ? '#D20073' : '#003C32'
                            }}>
                            {u.softDeleted
                              ? <Trash2 className="w-5 h-5" />
                              : u.banned
                                ? <Ban className="w-5 h-5" />
                                : u.profilePhoto
                                  ? <img src={u.profilePhoto} alt="" className="w-full h-full object-cover" />
                                  : <span>{(u.fullName || u.businessName || '؟').charAt(0).toUpperCase()}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold truncate">
                                {u.fullName || u.businessName || 'مجهول'}
                              </p>
                              {u.supabaseId && userVerifyStatus[u.supabaseId] === 'approved' && (
                                isProvider ? <GoldenBadge size={16} /> : <BlueBadge size={16} />
                              )}
                              {/* Clickable status badge — filters list by this status */}
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setUserFilter(u.softDeleted ? 'deleted' : u.banned ? 'banned' : isProvider ? 'provider' : 'private'); }}
                                className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 cursor-pointer transition-opacity hover:opacity-70 ${
                                  u.softDeleted ? 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400'
                                  : u.banned ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : isProvider ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                                  : 'bg-primary/10 text-primary'
                                }`}>
                                {u.softDeleted ? 'محذوف' : u.banned ? 'محظور' : isProvider ? 'مزود' : 'شخصي'}
                              </button>
                            </div>
                            {u.supabaseId && userLphIds[u.supabaseId] && (
                              <p className="text-[9px] font-mono text-muted-foreground/70" dir="ltr">
                                {userLphIds[u.supabaseId]}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{u.walletId}</p>
                            {u.email && <p className="text-[10px] text-muted-foreground/70 truncate" dir="ltr">{u.email}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {u.lastSeen && (
                              <span className="text-[9px] text-muted-foreground hidden sm:block">{timeAgo(u.lastSeen)}</span>
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {/* Expanded details */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                              className="overflow-hidden">
                              <div className="px-3 pb-3 border-t border-border pt-3 flex flex-col gap-3">

                                {/* Profile photo — always shown */}
                                <div className="flex items-center gap-3 bg-secondary/30 rounded-xl p-2.5">
                                  {!!(u as unknown as Record<string,unknown>).profilePhoto ? (
                                    <img
                                      src={String((u as unknown as Record<string,unknown>).profilePhoto)}
                                      alt="صورة المستخدم"
                                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border-2 border-border"
                                      onError={e => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 border-2 border-border">
                                      <User className="w-5 h-5 text-muted-foreground/50" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-[9px] text-muted-foreground">الصورة الشخصية</p>
                                    <p className="text-xs font-bold">{u.fullName || 'المستخدم'}</p>
                                    <p className="text-[9px] text-muted-foreground mt-0.5">
                                      {!!(u as unknown as Record<string,unknown>).profilePhoto ? 'صورة مرفوعة' : 'لا توجد صورة'}
                                    </p>
                                  </div>
                                </div>

                                {/* Info grid */}
                                <div className="grid grid-cols-2 gap-2">
                                  {u.phone && (
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">الهاتف</p>
                                        <p className="text-xs font-bold truncate" dir="ltr">{u.phone}</p>
                                      </div>
                                    </div>
                                  )}
                                  {u.email && (
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">البريد</p>
                                        <p className="text-xs font-bold truncate" dir="ltr">{u.email}</p>
                                      </div>
                                    </div>
                                  )}
                                  {!!(u as unknown as Record<string,unknown>).fatherName && (
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <User className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">اسم الأب</p>
                                        <p className="text-xs font-bold truncate">{String((u as unknown as Record<string,unknown>).fatherName)}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Gender — always shown */}
                                  <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                    <PersonStanding className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-[9px] text-muted-foreground">الجنس</p>
                                      <p className="text-xs font-bold truncate">
                                        {(u as unknown as Record<string,unknown>).gender === 'male' ? '♂ ذكر'
                                          : (u as unknown as Record<string,unknown>).gender === 'female' ? '♀ أنثى'
                                          : (u as unknown as Record<string,unknown>).gender
                                          ? String((u as unknown as Record<string,unknown>).gender)
                                          : '—'}
                                      </p>
                                    </div>
                                  </div>

                                  {u.dob && (
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <CalendarDays className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">تاريخ الميلاد</p>
                                        <p className="text-xs font-bold truncate">{u.dob}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Province — always shown */}
                                  <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-[9px] text-muted-foreground">المحافظة / المدينة</p>
                                      <p className="text-xs font-bold truncate">
                                        {u.province || u.city
                                          ? `${u.province ?? ''}${u.city ? ` — ${u.city}` : ''}`
                                          : '—'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Address — always shown */}
                                  <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                    <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-[9px] text-muted-foreground">العنوان الكامل</p>
                                      <p className="text-xs font-bold truncate">
                                        {!!(u as unknown as Record<string,unknown>).address
                                          ? String((u as unknown as Record<string,unknown>).address)
                                          : '—'}
                                      </p>
                                    </div>
                                  </div>

                                  {u.ispType && (
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <Wifi className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">نوع الخدمة</p>
                                        <p className="text-xs font-bold truncate">{u.ispType}</p>
                                      </div>
                                    </div>
                                  )}
                                  {!!(u as unknown as Record<string,unknown>).lastSeenAt && (
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <CalendarDays className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">آخر نشاط</p>
                                        <p className="text-xs font-bold truncate">{new Date(String((u as unknown as Record<string,unknown>).lastSeenAt)).toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                      </div>
                                    </div>
                                  )}
                                  {!!(u as unknown as Record<string,unknown>).loginProvider && (
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <Wifi className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">طريقة الدخول</p>
                                        <p className="text-xs font-bold truncate">{String((u as unknown as Record<string,unknown>).loginProvider)}</p>
                                      </div>
                                    </div>
                                  )}
                                  {!!(u as unknown as Record<string,unknown>).registeredAt && (
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <CalendarDays className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">تاريخ التسجيل</p>
                                        <p className="text-xs font-bold truncate">{new Date(String((u as unknown as Record<string,unknown>).registeredAt)).toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                      </div>
                                    </div>
                                  )}
                                  {!!(u as unknown as Record<string,unknown>).latitude && !!(u as unknown as Record<string,unknown>).longitude && (
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">الإحداثيات</p>
                                        <p className="text-[10px] font-mono truncate" dir="ltr">{Number((u as unknown as Record<string,unknown>).latitude).toFixed(4)}, {Number((u as unknown as Record<string,unknown>).longitude).toFixed(4)}</p>
                                      </div>
                                    </div>
                                  )}
                                  {u.supabaseId && (
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2 col-span-2">
                                      <Hash className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">Supabase ID</p>
                                        <p className="text-[10px] font-mono truncate" dir="ltr">{u.supabaseId}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Sessions / Devices */}
                                <div className="flex flex-col gap-2 p-3 rounded-2xl border border-border bg-secondary/20">
                                  <div className="flex items-center gap-2">
                                    <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">الجلسات والأجهزة</p>
                                  </div>
                                  {u.lastDevice || u.lastIp ? (
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center gap-2 bg-background/70 rounded-xl p-2">
                                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                          <Smartphone className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[10px] font-bold">{u.lastDevice ?? 'جهاز غير معروف'}</p>
                                          {u.lastIp && (
                                            <p className="text-[9px] text-muted-foreground font-mono truncate" dir="ltr">IP: {u.lastIp}</p>
                                          )}
                                          {u.lastSeenVia && (
                                            <p className="text-[9px] text-muted-foreground">
                                              آخر نشاط: {new Date(u.lastSeenVia).toLocaleString('ar-SY')}
                                            </p>
                                          )}
                                        </div>
                                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold flex-shrink-0">● نشطة</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-muted-foreground text-center py-1">لا توجد بيانات جلسة بعد</p>
                                  )}
                                </div>

                                {/* Times */}
                                <div className="flex gap-2 text-[10px] text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>سُجِّل: {new Date(u.registeredAt).toLocaleDateString('ar-SY')}</span>
                                  </div>
                                  {u.lastSeen && (
                                    <div className="flex items-center gap-1">
                                      <Activity className="w-3 h-3" />
                                      <span>آخر ظهور: {timeAgo(u.lastSeen)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Ban reason */}
                                {u.banned && u.banReason && (
                                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-xl p-2">
                                    <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                                      سبب الحظر: {u.banReason}
                                    </p>
                                    {u.bannedAt && (
                                      <p className="text-[9px] text-red-500/70 mt-0.5">
                                        تاريخ الحظر: {new Date(u.bannedAt).toLocaleDateString('ar-SY')}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Ban reason input */}
                                {banningUser === u.id && (
                                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col gap-2">
                                    <Input value={banReason} onChange={e => setBanReason(e.target.value)}
                                      placeholder="سبب الحظر (اختياري)..."
                                      className="h-9 text-xs" />
                                    <div className="flex gap-2">
                                      <Button size="sm" className="flex-1 gap-1 h-8 text-xs bg-red-600 hover:bg-red-700"
                                        onClick={() => handleBanUser(u.walletId)}>
                                        <Ban className="w-3 h-3" /> تأكيد الحظر
                                      </Button>
                                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs"
                                        onClick={() => { setBanningUser(null); setBanReason(''); }}>
                                        إلغاء
                                      </Button>
                                    </div>
                                  </motion.div>
                                )}

                                {/* Action buttons */}
                                {banningUser !== u.id && editingUser !== u.id && (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                      {u.supabaseId && (
                                        <Button size="sm" variant="outline"
                                          className={`flex-1 gap-1 h-8 text-xs ${
                                            userVerifyStatus[u.supabaseId] === 'approved'
                                              ? 'border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400'
                                              : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400'
                                          }`}
                                          onClick={() => u.supabaseId && toggleUserVerify(u.supabaseId)}>
                                          <BadgeCheck className="w-3 h-3" />
                                          {userVerifyStatus[u.supabaseId] === 'approved' ? 'إلغاء التوثيق' : 'توثيق'}
                                        </Button>
                                      )}
                                      <Button size="sm" variant="outline"
                                        className="flex-1 gap-1 h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
                                        onClick={() => {
                                          setEditingUser(u.id);
                                          setUserEditForm({ fullName: u.fullName ?? '', phone: u.phone ?? '', email: u.email ?? '', fatherName: u.fatherName ?? '', gender: u.gender ?? '', address: u.address ?? '', province: u.province ?? '', city: u.city ?? '', dob: u.dob ?? '' });
                                        }}>
                                        <Edit3 className="w-3 h-3" /> تعديل
                                      </Button>
                                    </div>
                                    {/* Ban / Unban — both always visible */}
                                    <div className="flex gap-2">
                                      <Button size="sm"
                                        disabled={!u.banned}
                                        className={`flex-1 gap-1 h-8 text-xs ${u.banned ? 'bg-green-600 hover:bg-green-700 text-white' : 'opacity-40 cursor-not-allowed bg-secondary text-muted-foreground'}`}
                                        onClick={() => { if (u.banned) handleUnbanUser(u.walletId); }}>
                                        <Unlock className="w-3 h-3" /> رفع الحظر
                                      </Button>
                                      <Button size="sm" variant="outline"
                                        disabled={!!u.banned}
                                        className={`flex-1 gap-1 h-8 text-xs ${!u.banned ? 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400' : 'opacity-40 cursor-not-allowed'}`}
                                        onClick={() => { if (!u.banned) { setBanningUser(u.id); setRestrictingUser(null); setDeletingUser(null); } }}>
                                        <Ban className="w-3 h-3" /> حظر دائم
                                      </Button>
                                      {/* Restrict / Unrestrict */}
                                      <Button size="sm" variant="outline"
                                        className="flex-1 gap-1 h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                                        onClick={() => { setRestrictingUser(restrictingUser === u.id ? null : u.id); setBanningUser(null); setDeletingUser(null); }}>
                                        <Timer className="w-3 h-3" />
                                        {restrictingUser === u.id ? 'إلغاء' : 'تقييد'}
                                      </Button>
                                    </div>

                                    {/* Restrict inline form */}
                                    {restrictingUser === u.id && (
                                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                        className="flex flex-col gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                                        <p className="text-[10px] font-bold text-amber-700">تقييد الحساب مؤقتاً</p>
                                        <div className="flex gap-2">
                                          <input type="number" min="1" max="365" placeholder="الأيام"
                                            value={restrictDays} onChange={e => setRestrictDays(e.target.value)}
                                            className="w-20 border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" />
                                          <input placeholder="سبب التقييد (اختياري)"
                                            value={restrictReason} onChange={e => setRestrictReason(e.target.value)}
                                            className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="flex-1 h-7 text-xs bg-amber-500 hover:bg-amber-600"
                                            disabled={!restrictDays}
                                            onClick={() => handleRestrictUser(u.walletId)}>
                                            تطبيق التقييد
                                          </Button>
                                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-green-700 border-green-300"
                                            onClick={() => handleUnrestrictUser(u.walletId)}>
                                            رفع التقييد
                                          </Button>
                                        </div>
                                      </motion.div>
                                    )}

                                    {/* Soft delete / undelete */}
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline"
                                        className="flex-1 gap-1 h-8 text-xs border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
                                        onClick={() => { setDeletingUser(deletingUser === u.id ? null : u.id); setBanningUser(null); setRestrictingUser(null); }}>
                                        <Trash2 className="w-3 h-3" />
                                        {deletingUser === u.id ? 'إلغاء' : 'حذف الحساب'}
                                      </Button>
                                      <Button size="sm" variant="outline"
                                        className="flex-1 gap-1 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteUser(u.walletId)}>
                                        <Trash2 className="w-3 h-3" /> حذف نهائي
                                      </Button>
                                    </div>

                                    {/* Soft delete inline form */}
                                    {deletingUser === u.id && (
                                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                        className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-900/20 rounded-xl p-3 border border-gray-200 dark:border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-600">حذف الحساب (قابل للاسترجاع)</p>
                                        <input placeholder="سبب الحذف (اختياري)"
                                          value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                                          className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-gray-400" />
                                        <div className="flex gap-2">
                                          <Button size="sm" className="flex-1 h-7 text-xs bg-gray-600 hover:bg-gray-700"
                                            onClick={() => handleSoftDeleteUser(u.walletId)}>
                                            تأكيد الحذف
                                          </Button>
                                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-blue-700 border-blue-300"
                                            onClick={() => handleUndeleteUser(u.walletId)}>
                                            استرجاع الحساب
                                          </Button>
                                        </div>
                                      </motion.div>
                                    )}
                                  </div>
                                )}
                                {/* Inline edit form */}
                                {editingUser === u.id && (
                                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col gap-2 bg-secondary/40 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-foreground/60">تعديل البيانات</p>
                                    {u.supabaseId && (
                                      <div className="bg-secondary/60 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                                        <span className="text-[9px] text-muted-foreground font-bold">Supabase ID:</span>
                                        <span className="text-[9px] font-mono text-foreground/70 truncate" dir="ltr">{u.supabaseId}</span>
                                      </div>
                                    )}
                                    {[
                                      { label: 'الاسم الكامل', key: 'fullName', dir: 'rtl' as const },
                                      { label: 'اسم الأب', key: 'fatherName', dir: 'rtl' as const },
                                      { label: 'العنوان', key: 'address', dir: 'rtl' as const },
                                      { label: 'الهاتف', key: 'phone', dir: 'ltr' as const },
                                      { label: 'البريد', key: 'email', dir: 'ltr' as const },
                                    ].map(f => (
                                      <div key={f.key}>
                                        <label className="text-[9px] text-muted-foreground">{f.label}</label>
                                        <input
                                          value={userEditForm[f.key as keyof typeof userEditForm]}
                                          onChange={e => setUserEditForm(v => ({ ...v, [f.key]: e.target.value }))}
                                          dir={f.dir}
                                          className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary mt-0.5"
                                        />
                                      </div>
                                    ))}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[9px] text-muted-foreground">الجنس</label>
                                        <select
                                          value={userEditForm.gender}
                                          onChange={e => setUserEditForm(v => ({ ...v, gender: e.target.value }))}
                                          className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary mt-0.5"
                                        >
                                          <option value="">غير محدد</option>
                                          <option value="male">ذكر</option>
                                          <option value="female">أنثى</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[9px] text-muted-foreground">تاريخ الميلاد</label>
                                        <input
                                          value={userEditForm.dob}
                                          onChange={e => setUserEditForm(v => ({ ...v, dob: e.target.value }))}
                                          placeholder="YYYY/MM/DD"
                                          dir="ltr"
                                          className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary mt-0.5"
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[9px] text-muted-foreground">المحافظة</label>
                                        <select
                                          value={userEditForm.province}
                                          onChange={e => setUserEditForm(v => ({ ...v, province: e.target.value }))}
                                          className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary mt-0.5"
                                        >
                                          <option value="">غير محدد</option>
                                          {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[9px] text-muted-foreground">المدينة / الحي</label>
                                        <input
                                          value={userEditForm.city}
                                          onChange={e => setUserEditForm(v => ({ ...v, city: e.target.value }))}
                                          placeholder="المدينة"
                                          className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary mt-0.5"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm"
                                        className={`flex-1 h-8 text-xs gap-1 ${userEditResult === 'ok' ? 'bg-green-600 hover:bg-green-700' : userEditResult === 'err' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'} text-white`}
                                        disabled={userEditSaving} onClick={() => saveUserEdit(u.walletId)}>
                                        {userEditSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : userEditResult === 'ok' ? <Check className="w-3 h-3" /> : userEditResult === 'err' ? <XCircle className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                                        {userEditResult === 'ok' ? 'تم الحفظ' : userEditResult === 'err' ? 'فشل الحفظ' : 'حفظ'}
                                      </Button>
                                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs"
                                        onClick={() => { setEditingUser(null); setUserEditResult(null); }}>إلغاء</Button>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 3 — RATES
          ═══════════════════════════════════════════════════════ */}
          {false && activeTab === 'rates' && (
            <motion.div key="rates" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-4">

              {/* SYP Rate Control */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ background: '#003C3210' }}>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" style={{ color: '#003C32' }} />
                    <span className="font-bold text-sm">سعر الدولار / ليرة سورية</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    sypRateIsManual ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {sypRateIsManual ? '✏ يدوي' : '⚡ تلقائي'}
                  </span>
                </div>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="bg-primary/5 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">السعر المُطبَّق حالياً</p>
                      <p className="text-3xl font-black text-primary">{usdToSyp.toLocaleString('ar-SY')}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">ليرة سورية لكل دولار</p>
                    </div>
                    {sypRateUpdatedAt && (
                      <div className="text-left">
                        <p className="text-[9px] text-muted-foreground">آخر تحديث</p>
                        <p className="text-[10px] font-bold">{new Date(sypRateUpdatedAt!).toLocaleString('ar-SY')}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input type="number" value={sypRateInput} onChange={e => setSypRateEdit(e.target.value)}
                      className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm font-bold bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                      dir="ltr" placeholder="مثال: 13750" min="1" />
                    <button onClick={() => void queryClient.invalidateQueries({ queryKey: ['admin-syp-rate'] })}
                      className="p-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 transition-colors">
                      <RefreshCw className="w-4 h-4 text-foreground/60" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => saveSypRate(true)} disabled={sypRateSaving}
                      className="flex-1 gap-2 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                      <Save className="w-4 h-4" /> {sypRateSaving ? 'جاري...' : 'تفعيل يدوي'}
                    </Button>
                    {sypRateIsManual && (
                      <Button variant="outline" onClick={() => saveSypRate(false)} disabled={sypRateSaving}
                        className="flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
                        <X className="w-4 h-4" /> إلغاء
                      </Button>
                    )}
                  </div>
                  {sypRateMsg && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-center font-bold">{sypRateMsg}
                    </motion.p>
                  )}
                </CardContent>
              </Card>

              {false && /* Currency Buy/Sell Overrides hidden per admin request */
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#D2007310' }}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: '#D20073' }} />
                    <span className="font-bold text-sm">تسعير الشراء والبيع</span>
                  </div>
                  {rateMsg && <span className="text-xs font-bold">{rateMsg}</span>}
                </div>
                <CardContent className="p-3 flex flex-col gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    اترك الحقل فارغاً لتطبيق الهامش التلقائي (1.5%). التعديلات تؤثر فوراً على جميع الصفحات.
                  </p>
                  {MAIN_CURRENCIES.map(code => {
                    const rateVsUsd = rates[code];
                    const mid = rateVsUsd ? Math.round(usdToSyp / rateVsUsd) : null;
                    const ovr = buySellOverrides[code];
                    const isEditing = editCurrency === code;
                    return (
                      <div key={code} className={`rounded-xl border p-3 transition-all ${
                        ovr ? 'border-pink-200 dark:border-pink-900/40 bg-pink-50/50 dark:bg-pink-900/10' : 'border-border'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm" dir="ltr">{code}</span>
                            <span className="text-[9px] text-muted-foreground">{CURRENCY_NAMES[code]}</span>
                            {ovr && (
                              <span className="text-[8px] bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 px-1.5 py-0.5 rounded-full font-bold">
                                مخصص
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!isEditing ? (
                              <>
                                <button onClick={() => {
                                  setEditCurrency(code);
                                  setEditBuyVal(ovr?.buyPrice?.toString() ?? '');
                                  setEditSellVal(ovr?.sellPrice?.toString() ?? '');
                                }} className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors">
                                  <Edit3 className="w-3.5 h-3.5 text-primary" />
                                </button>
                                {ovr && (
                                  <button onClick={() => deleteBuySellOverride(code)}
                                    className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button onClick={() => saveBuySellOverride(code)}
                                  className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                                  <Check className="w-3.5 h-3.5 text-primary" />
                                </button>
                                <button onClick={() => setEditCurrency(null)}
                                  className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-green-600 font-bold block mb-1">سعر الشراء</label>
                              <input type="number" value={editBuyVal} onChange={e => setEditBuyVal(e.target.value)}
                                placeholder={mid ? `تلقائي: ${Math.round(mid * 1.015).toLocaleString()}` : ''}
                                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                dir="ltr" />
                            </div>
                            <div>
                              <label className="text-[9px] text-red-500 font-bold block mb-1">سعر البيع</label>
                              <input type="number" value={editSellVal} onChange={e => setEditSellVal(e.target.value)}
                                placeholder={mid ? `تلقائي: ${Math.round(mid * 0.985).toLocaleString()}` : ''}
                                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                dir="ltr" />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-secondary/60 rounded-lg py-2 text-center">
                              <p className="text-[8px] text-muted-foreground mb-0.5">وسط</p>
                              <p className="text-xs font-black" dir="ltr">{mid ? mid.toLocaleString() : '—'}</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg py-2 text-center">
                              <p className="text-[8px] text-green-600 mb-0.5">شراء</p>
                              <p className="text-xs font-black text-green-700 dark:text-green-300" dir="ltr">
                                {ovr?.buyPrice ? ovr.buyPrice.toLocaleString() : mid ? Math.round(mid * 1.015).toLocaleString() : '—'}
                              </p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg py-2 text-center">
                              <p className="text-[8px] text-red-500 mb-0.5">بيع</p>
                              <p className="text-xs font-black text-red-600 dark:text-red-400" dir="ltr">
                                {ovr?.sellPrice ? ovr.sellPrice.toLocaleString() : mid ? Math.round(mid * 0.985).toLocaleString() : '—'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>}

              {/* Gold Price Override */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ background: '#b4530910' }}>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-sm">سعر الذهب اليدوي (24 قيراط)</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    goldOverrideActive ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {goldOverrideActive ? '✏ يدوي' : '⚡ تلقائي'}
                  </span>
                </div>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">سعر الغرام الحالي (24K)</p>
                      <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
                        {goldKarat24 ? Math.round(goldKarat24?.pricePerGramSYP ?? 0).toLocaleString('ar-SY') : '—'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">ليرة سورية / غرام</p>
                    </div>
                    {goldOverrideActive && <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-1 rounded-lg font-bold">مُعدَّل يدوياً</span>}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={goldOverrideInput}
                      onChange={e => setGoldOverrideEdit(e.target.value)}
                      placeholder="سعر الغرام بالليرة السورية..."
                      className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm font-bold bg-background focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      dir="ltr"
                    />
                    <button onClick={() => void queryClient.invalidateQueries({ queryKey: ['admin-gold-override'] })}
                      className="p-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 transition-colors">
                      <RefreshCw className="w-4 h-4 text-foreground/60" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveGoldOverride}
                      className="flex-1 gap-2 font-bold" style={{ background: '#b45309' }}>
                      <Save className="w-4 h-4" /> تفعيل السعر اليدوي
                    </Button>
                    {goldOverrideActive && (
                      <Button variant="outline" onClick={clearGoldOvr}
                        className="flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
                        <X className="w-4 h-4" /> إلغاء
                      </Button>
                    )}
                  </div>
                  {goldOverrideMsg && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`text-sm text-center font-bold ${!goldOverrideMsg.includes('فشل') && !goldOverrideMsg.includes('خطأ') ? 'text-green-600' : 'text-amber-600'}`}>
                      {goldOverrideMsg}
                    </motion.p>
                  )}
                </CardContent>
              </Card>

              {/* Gold Karat Price Override */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#b4530910' }}>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-sm">تسعير القيراطات يدوياً (14–24)</span>
                  </div>
                  {karatMsg && <span className={`text-xs font-bold ${!karatMsg.includes('فشل') && !karatMsg.includes('خطأ') ? 'text-green-600' : 'text-destructive'}`}>{karatMsg}</span>}
                </div>
                <CardContent className="p-3 flex flex-col gap-2">
                  <p className="text-[11px] text-muted-foreground">اترك فارغاً لحساب السعر تلقائياً من 24 قيراط. التعديلات تؤثر فوراً.</p>
                  {[14, 16, 18, 21, 22, 24].map(k => {
                    const karatKey = `GOLD_${k}`;
                    const isEditing = editKarat === karatKey;
                    const hasOvr = !!karatOverrides[karatKey];
                    const stored = karatOverridesDetail[karatKey];
                    const hasStored = !!stored;
                    const isInactive = hasStored && !stored.isManual;
                    const autoPrice = goldKarat24 ? Math.round(goldKarat24.pricePerGramSYP * k / 24) : null;
                    return (
                      <div key={k} className={`rounded-xl border p-3 transition-all ${hasOvr ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10' : isInactive ? 'border-dashed border-amber-200/60 dark:border-amber-900/30' : 'border-border'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-amber-700 dark:text-amber-400">{k}K</span>
                            <span className="text-[9px] text-muted-foreground">{k} قيراط</span>
                            {hasOvr && <span className="text-[8px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">مخصص</span>}
                            {isInactive && <span className="text-[8px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full font-bold">محفوظ</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            {!isEditing ? (
                              <>
                                {isInactive && (
                                  <button onClick={() => reactivateKaratOvr(karatKey)}
                                    className="text-[9px] font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
                                    تفعيل
                                  </button>
                                )}
                                <button onClick={() => { setEditKarat(karatKey); setEditKaratVal((stored?.priceSYP ?? karatOverrides[karatKey])?.toString() ?? ''); }}
                                  className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors">
                                  <Edit3 className="w-3.5 h-3.5 text-primary" />
                                </button>
                                {hasOvr && (
                                  <button onClick={() => clearKaratOvr(karatKey)}
                                    className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button onClick={() => saveKaratOverride(karatKey)}
                                  className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                                  <Check className="w-3.5 h-3.5 text-primary" />
                                </button>
                                <button onClick={() => { setEditKarat(null); setEditKaratVal(''); }}
                                  className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <input type="number" value={editKaratVal} onChange={e => setEditKaratVal(e.target.value)}
                            placeholder={autoPrice ? `تلقائي: ${autoPrice.toLocaleString()}` : 'السعر بالليرة السورية...'}
                            className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400"
                            dir="ltr" autoFocus />
                        ) : (
                          <div className="flex gap-2">
                            <div className={`flex-1 rounded-lg py-1.5 text-center ${hasOvr ? 'bg-amber-50 dark:bg-amber-900/20' : isInactive ? 'bg-secondary/40' : 'bg-secondary/60'}`}>
                              <p className="text-[8px] text-muted-foreground mb-0.5">
                                {hasOvr ? 'السعر اليدوي (ل.س/غ)' : isInactive ? 'آخر سعر محفوظ (ل.س/غ)' : 'السعر (ل.س/غ)'}
                              </p>
                              <p className={`text-xs font-black ${isInactive ? 'text-muted-foreground' : ''}`} dir="ltr">
                                {hasOvr
                                  ? karatOverrides[karatKey].toLocaleString()
                                  : hasStored
                                    ? stored.priceSYP.toLocaleString()
                                    : autoPrice ? autoPrice.toLocaleString() : '—'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Metals Price Override */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#6d28d910' }}>
                  <div className="flex items-center gap-2">
                    <CoinsIcon className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-sm">تسعير المعادن يدوياً</span>
                  </div>
                  {metalMsg && <span className={`text-xs font-bold ${!metalMsg.includes('فشل') && !metalMsg.includes('خطأ') ? 'text-green-600' : 'text-destructive'}`}>{metalMsg}</span>}
                </div>
                <CardContent className="p-3 flex flex-col gap-2">
                  <p className="text-[11px] text-muted-foreground">اترك الحقل فارغاً لعرض السعر التلقائي. الأسعار بالليرة السورية.</p>
                  {[
                    { symbol: 'XAU', nameAr: 'الذهب', unit: 'أوقية' },
                    { symbol: 'XAG', nameAr: 'الفضة', unit: 'أوقية' },
                    { symbol: 'XPT', nameAr: 'البلاتين', unit: 'أوقية' },
                    { symbol: 'XPD', nameAr: 'البلاديوم', unit: 'أوقية' },
                    { symbol: 'XCU', nameAr: 'النحاس', unit: 'رطل' },
                  ].map(m => {
                    const isEditing = editMetal === m.symbol;
                    const hasOvr = !!metalOverrides[m.symbol];
                    return (
                      <div key={m.symbol} className={`rounded-xl border p-3 transition-all ${
                        hasOvr ? 'border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-900/10' : 'border-border'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm" dir="ltr">{m.symbol}</span>
                            <span className="text-[9px] text-muted-foreground">{m.nameAr}</span>
                            {hasOvr && (
                              <span className="text-[8px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-bold">مخصص</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!isEditing ? (
                              <>
                                <button onClick={() => { setEditMetal(m.symbol); setEditMetalVal(metalOverrides[m.symbol]?.toString() ?? ''); }}
                                  className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors">
                                  <Edit3 className="w-3.5 h-3.5 text-primary" />
                                </button>
                                {hasOvr && (
                                  <button onClick={() => clearMetalOvr(m.symbol)}
                                    className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button onClick={() => saveMetalOverride(m.symbol)}
                                  className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                                  <Check className="w-3.5 h-3.5 text-primary" />
                                </button>
                                <button onClick={() => { setEditMetal(null); setEditMetalVal(''); }}
                                  className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editMetalVal}
                            onChange={e => setEditMetalVal(e.target.value)}
                            placeholder="السعر بالليرة السورية..."
                            className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            dir="ltr"
                            autoFocus
                          />
                        ) : (
                          <div className="flex gap-2">
                            <div className="flex-1 bg-secondary/60 rounded-lg py-1.5 text-center">
                              <p className="text-[8px] text-muted-foreground mb-0.5">السعر (ل.س/{m.unit})</p>
                              <p className="text-xs font-black" dir="ltr">
                                {hasOvr ? metalOverrides[m.symbol].toLocaleString() : '—'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 4 — REQUESTS
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'requests' && (
            <motion.div key="requests" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-3">

              {/* Sub-tabs */}
              <div className="flex gap-2 p-1 bg-secondary rounded-2xl">
                <button
                  onClick={() => setVerifySubTab('deletion')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${verifySubTab === 'deletion' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
                >
                  <FileX className="w-3.5 h-3.5" />
                  طلبات الحذف
                  {pendingReqs > 0 && (
                    <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{pendingReqs}</span>
                  )}
                </button>
                <button
                  onClick={() => setVerifySubTab('verification')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${verifySubTab === 'verification' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  طلبات التوثيق
                  {verifyRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                      {verifyRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>
              </div>

              {/* Requests content - conditional on sub-tab */}
              {verifySubTab === 'deletion' ? (
                deletionRequests.length === 0 ? (
                  <div className="text-center py-16">
                    <FileX className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">لا توجد طلبات حذف</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Bulk delete anonymous entries */}
                    {deletionRequests.some(r => !r.fullName) && (
                      <button
                        onClick={() => {
                          const anon = deletionRequests.filter(r => !r.fullName);
                          openConfirm({
                            title: 'حذف طلبات المجهولين',
                            body: `هل أنت متأكد من حذف ${anon.length} طلب بأسماء مجهولة نهائياً؟`,
                            destructive: true,
                            confirmLabel: 'حذف الكل',
                            onConfirm: async () => {
                              await Promise.all(anon.map(r =>
                                fetch(`/api/admin/deletion-requests/${r.id}`, {
                                  method: 'DELETE',
                                  headers: { 'X-Admin-Token': token ?? '' },
                                }).catch(() => {})
                              ));
                              queryClient.setQueryData<DeletionRequest[]>(['admin-deletion-reqs', token], prev => prev?.filter(r => !!r.fullName) ?? []);
                            },
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/40 self-start transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف جميع طلبات المجهولين ({deletionRequests.filter(r => !r.fullName).length})
                      </button>
                    )}
                    {/* Pending first */}
                    {deletionRequests.filter(r => r.status === 'pending').map(req => (
                      <Card key={req.id} className="border-red-200 dark:border-red-900/40 shadow-sm overflow-hidden">
                        <div className="bg-red-50 dark:bg-red-900/10 p-3 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                <XCircle className="w-4 h-4 text-red-500" />
                              </div>
                              <div>
                                <p className="text-xs font-bold">{req.fullName || 'مجهول'}</p>
                                {req.walletId && (
                                  <p className="text-[10px] font-mono text-muted-foreground" dir="ltr">{req.walletId}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                              معلّق
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                            {req.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{req.email}</span>}
                            {req.accountType && <span className="flex items-center gap-1"><User className="w-3 h-3" />{req.accountType === 'provider' ? 'مزود خدمة' : 'شخصي'}</span>}
                            {(() => { const u = users.find(u => u.walletId === req.walletId); return u?.phone ? <span className="flex items-center gap-1"><Phone className="w-3 h-3" /><span dir="ltr">{u.phone}</span></span> : null; })()}
                            {(() => { const u = users.find(u => u.walletId === req.walletId); return (u?.province || u?.city) ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{u.province}{u.city ? ` — ${u.city}` : ''}</span> : null; })()}
                          </div>
                          {req.reason && (
                            <p className="text-[10px] text-muted-foreground bg-background/60 rounded-lg p-2">{req.reason}</p>
                          )}
                          <p className="text-[9px] text-muted-foreground">{new Date(req.requestedAt).toLocaleString('ar-SY')}</p>
                          <div className="flex gap-2">
                            <Button size="sm"
                              className="flex-1 h-8 text-[10px] gap-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleDeletionRequest(req.id, req)}>
                              <UserCheck className="w-3 h-3" /> تأكيد المعالجة
                            </Button>
                            <Button size="sm" variant="outline"
                              className="flex-1 h-8 text-[10px] gap-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => handleDeletionReject(req.id, req)}>
                              <XCircle className="w-3 h-3" /> رفض الطلب
                            </Button>
                          </div>
                        </div>
                    </Card>
                  ))}
                  {/* Handled / Rejected */}
                  {deletionRequests.filter(r => r.status === 'handled' || r.status === 'rejected').map(req => (
                    <Card key={req.id}
                      className={`border-border shadow-sm cursor-pointer transition-colors ${req.status === 'rejected' ? 'hover:border-orange-300' : 'hover:border-green-300'}`}
                      onClick={() => setExpandedDelReqId(expandedDelReqId === req.id ? null : req.id)}>
                      <CardContent className="p-3 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          {req.status === 'rejected'
                            ? <XCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                            : <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold">{req.fullName || 'مجهول'}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(req.requestedAt).toLocaleDateString('ar-SY')}
                              {req.handledAt ? ` · عولج: ${new Date(req.handledAt).toLocaleDateString('ar-SY')}` : ''}
                            </p>
                          </div>
                          {req.status === 'rejected'
                            ? <span className="text-[9px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded-full font-bold flex-shrink-0">مرفوض</span>
                            : <span className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-bold flex-shrink-0">مُعالَج</span>}
                          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${expandedDelReqId === req.id ? 'rotate-180' : ''}`} />
                        </div>
                        {expandedDelReqId === req.id && (
                          <div className="pt-2 border-t border-border/40 flex flex-col gap-1.5">
                            {req.walletId && <p className="text-[10px] font-mono text-muted-foreground" dir="ltr">{req.walletId}</p>}
                            {req.email && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3 flex-shrink-0" />{req.email}</p>}
                            {req.accountType && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><User className="w-3 h-3 flex-shrink-0" />{req.accountType === 'provider' ? 'مزود خدمة' : 'شخصي'}</p>}
                            {req.reason && <p className="text-[10px] bg-secondary rounded-lg p-2 mt-0.5">{req.reason}</p>}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openConfirm({
                                  title: 'حذف الطلب نهائياً',
                                  body: 'هل أنت متأكد من حذف هذا الطلب؟',
                                  destructive: true,
                                  confirmLabel: 'حذف',
                                  onConfirm: async () => {
                                    await fetch(`/api/admin/deletion-requests/${req.id}`, {
                                      method: 'DELETE',
                                      headers: { 'X-Admin-Token': token ?? '' },
                                    }).catch(() => {});
                                    queryClient.setQueryData<DeletionRequest[]>(['admin-deletion-reqs', token], prev => prev?.filter(r => r.id !== req.id) ?? []);
                                  },
                                });
                              }}
                              className="h-7 px-2 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1 self-start transition-colors">
                              <Trash2 className="w-3 h-3" /> حذف نهائي
                            </button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                )
              ) : verifyRequests.length === 0 ? (
                <div className="text-center py-16">
                  <BadgeCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">لا توجد طلبات توثيق</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {verifyRequests.map(req => {
                    const isProcessed = req.status !== 'pending';
                    const isExpanded = expandedVerifyReqId === req.id;
                    return (
                    <Card key={req.id}
                      className={`border shadow-sm overflow-hidden ${
                        req.status === 'pending' ? 'border-blue-200 dark:border-blue-900/40'
                        : req.status === 'approved' ? 'border-green-200 dark:border-green-900/40'
                        : 'border-red-200 dark:border-red-900/40'
                      } ${isProcessed ? 'cursor-pointer' : ''}`}
                      onClick={isProcessed ? () => setExpandedVerifyReqId(isExpanded ? null : req.id) : undefined}>
                      <CardContent className="p-3 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              req.status === 'pending' ? 'bg-blue-100 dark:bg-blue-900/20'
                              : req.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20'
                              : 'bg-red-100 dark:bg-red-900/20'
                            }`}>
                              <BadgeCheck className={`w-4 h-4 ${req.status === 'pending' ? 'text-blue-500' : req.status === 'approved' ? 'text-green-500' : 'text-red-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{req.fullName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{req.lphId}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                              req.status === 'pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : req.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {req.status === 'pending' ? 'معلّق' : req.status === 'approved' ? 'موثّق' : 'مرفوض'}
                            </span>
                            {isProcessed && (
                              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            )}
                            {isProcessed && (
                              <button
                                onClick={e => { e.stopPropagation(); openConfirm({ title: 'إخفاء الطلب', body: 'إخفاء هذا الطلب من القائمة؟', confirmLabel: 'إخفاء', onConfirm: () => { queryClient.setQueryData<VerifyRequest[]>(['admin-verify-reqs', token], prev => prev?.filter(r => r.id !== req.id) ?? []); } }); }}
                                className="w-5 h-5 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        {(!isProcessed || isExpanded) && (
                          <>
                            {req.email && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3 flex-shrink-0" />{req.email}
                              </p>
                            )}
                            {(() => { const u = users.find(u => u.supabaseId === req.supabaseId); return u?.phone ? (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3 flex-shrink-0" /><span dir="ltr">{u.phone}</span>
                              </p>
                            ) : null; })()}
                            {(() => { const u = users.find(u => u.supabaseId === req.supabaseId); return (u?.province || u?.city) ? (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />{u.province}{u.city ? ` — ${u.city}` : ''}
                              </p>
                            ) : null; })()}
                            <p className="text-[9px] text-muted-foreground/60">{new Date(req.requestedAt).toLocaleString('ar-SY')}</p>
                          </>
                        )}
                        {req.status === 'pending' && (
                          <div className="flex gap-2 mt-1">
                            <Button size="sm" className="flex-1 h-8 text-[10px] gap-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleVerifyApprove(req)}>
                              <ShieldCheck className="w-3 h-3" /> قبول التوثيق
                            </Button>
                            <Button size="sm" variant="outline"
                              className="flex-1 h-8 text-[10px] gap-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => handleVerifyReject(req)}>
                              <XCircle className="w-3 h-3" /> رفض
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB SUPPORT — SUPPORT MESSAGES
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'support' && (
            <motion.div key="support" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-4">
              <AdminSupportPanel initUserId={supportInitUserId} onImageClick={src => setAdminLightboxSrc(src)} openConfirm={openConfirm} />
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB TICKETS — SUPPORT TICKETS
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'tickets' && (
            <motion.div key="tickets" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-4">
              <AdminTicketsPanel onOpenConv={userId => { setSupportInitUserId(userId); setActiveTab('support'); }} />
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 5 — NOTIFICATIONS
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'notifications' && (
            <motion.div key="notifications" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-4">

              {/* Live Broadcast */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#dc262610' }}>
                  <Radio className="w-4 h-4" style={{ color: '#dc2626' }} />
                  <span className="font-bold text-sm">بث إشعار مباشر</span>
                  {broadcastActive && (
                    <span className="mr-auto flex items-center gap-1.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      على الهواء · {Math.floor(broadcastElapsed / 60).toString().padStart(2, '0')}:{(broadcastElapsed % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
                <CardContent className="p-4 flex flex-col gap-3">
                  {broadcastActive ? (
                    <div className="flex flex-col gap-3">
                      <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 p-3 flex flex-col gap-2">
                        <p className="text-xs font-bold text-red-700 dark:text-red-300">النص الحالي:</p>
                        <p className="text-sm" style={{ color: broadcastActive.textColor !== '#ffffff' ? broadcastActive.textColor : undefined }}>{broadcastActive.text}</p>
                        {broadcastActive.endsAt && (
                          <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            متبقي: <span className="font-mono font-black" style={{ color: broadcastActive.countdownColor ?? '#ff4444' }}>
                              {Math.floor(broadcastRemaining / 60).toString().padStart(2, '0')}:{(broadcastRemaining % 60).toString().padStart(2, '0')}
                            </span>
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">بدأ: {new Date(broadcastActive.startedAt).toLocaleTimeString('ar-SY')}</p>
                      </div>
                      <Button onClick={() => void stopBroadcast()} variant="destructive" className="h-10 font-bold gap-2">
                        <Radio className="w-4 h-4" /> إيقاف البث
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1.5 block">نص البث</label>
                        <textarea
                          value={broadcastText}
                          onChange={e => setBroadcastText(e.target.value)}
                          placeholder="اكتب نص البث الذي سيظهر على الصفحة الرئيسية..."
                          className="w-full border border-border rounded-xl p-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 leading-relaxed"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-muted-foreground">لون النص</label>
                        <input type="color" value={broadcastTextColor} onChange={e => setBroadcastTextColor(e.target.value)}
                          className="w-8 h-8 rounded-lg border border-border cursor-pointer" />
                        <span className="text-xs font-mono text-muted-foreground">{broadcastTextColor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-muted-foreground">سرعة العرض</label>
                        <div className="flex gap-1">
                          {(['slow', 'normal', 'fast'] as const).map(s => (
                            <button key={s} type="button"
                              onClick={() => setBroadcastSpeed(s)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${broadcastSpeed === s ? 'bg-red-500 text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                              {s === 'slow' ? 'بطيء' : s === 'normal' ? 'عادي' : 'سريع'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBroadcastCountdownEnabled(v => !v)}
                          className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${broadcastCountdownEnabled ? 'bg-red-500' : 'bg-muted'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${broadcastCountdownEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                        <label className="text-xs font-bold text-muted-foreground cursor-pointer" onClick={() => setBroadcastCountdownEnabled(v => !v)}>
                          عداد تنازلي
                        </label>
                      </div>
                      {broadcastCountdownEnabled && (
                        <div className="flex items-center gap-3 pr-2">
                          <div className="flex items-center gap-2 flex-1">
                            <Timer className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <input type="number" min="1" max="3600" value={broadcastCountdownSecs}
                              onChange={e => setBroadcastCountdownSecs(e.target.value)}
                              className="w-20 border border-border rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-red-400/40 text-center"
                            />
                            <span className="text-xs text-muted-foreground">ثانية</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground">لون العداد</label>
                            <input type="color" value={broadcastCountdownColor} onChange={e => setBroadcastCountdownColor(e.target.value)}
                              className="w-7 h-7 rounded-lg border border-border cursor-pointer" />
                          </div>
                        </div>
                      )}
                      <Button
                        onClick={() => void startBroadcast()}
                        disabled={broadcastStarting || !broadcastText.trim()}
                        className="h-11 font-bold gap-2"
                        style={{ background: '#dc2626' }}
                      >
                        <Megaphone className="w-4 h-4" />
                        {broadcastStarting ? 'جاري البث...' : 'بدء البث'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Send form */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#0284c710' }}>
                  <Send className="w-4 h-4" style={{ color: '#0284c7' }} />
                  <span className="font-bold text-sm">إرسال إشعار للمستخدمين</span>
                </div>
                <CardContent className="p-4 flex flex-col gap-3">
                  {/* Recipient targeting */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2">المستلم</p>
                    <div className="flex gap-2">
                      <button onClick={() => { setNotifTarget('all'); setNotifSelectedWallet(null); setNotifSelectedName(''); setNotifUserSearch(''); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${notifTarget === 'all' ? 'bg-primary text-white shadow-sm' : 'bg-secondary text-muted-foreground'}`}>
                        <Users className="w-3.5 h-3.5" /> جميع المستخدمين
                      </button>
                      <button onClick={() => setNotifTarget('specific')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${notifTarget === 'specific' ? 'bg-[#D20073] text-white shadow-sm' : 'bg-secondary text-muted-foreground'}`}>
                        <User className="w-3.5 h-3.5" /> مستخدم محدد
                      </button>
                    </div>
                  </div>

                  {/* User search (specific mode) */}
                  {notifTarget === 'specific' && (
                    <div className="flex flex-col gap-2">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input value={notifUserSearch} onChange={e => setNotifUserSearch(e.target.value)}
                          placeholder="ابحث عن مستخدم بالاسم أو رقم المحفظة..."
                          className="pr-8 h-10 text-xs rounded-xl" />
                      </div>
                      {notifSelectedWallet ? (
                        <div className="flex items-center gap-2 p-2 bg-[#D20073]/10 border border-[#D20073]/30 rounded-xl">
                          <User className="w-4 h-4 text-[#D20073] flex-shrink-0" />
                          <span className="text-xs font-bold text-[#D20073] flex-1 truncate">{notifSelectedName}</span>
                          <button onClick={() => { setNotifSelectedWallet(null); setNotifSelectedName(''); }}
                            className="text-muted-foreground hover:text-foreground">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : notifUserSearch.trim().length > 0 ? (
                        <div className="border border-border rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                          {filteredUsers.filter(u =>
                            (u.fullName ?? '').toLowerCase().includes(notifUserSearch.toLowerCase()) ||
                            (u.walletId ?? '').toLowerCase().includes(notifUserSearch.toLowerCase())
                          ).slice(0, 8).map(u => (
                            <button key={u.id} onClick={() => { setNotifSelectedWallet(u.walletId); setNotifSelectedName(u.fullName || u.businessName || u.walletId || ''); setNotifUserSearch(''); }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary text-right border-b border-border/40 last:border-0">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <p className="text-xs font-bold truncate">{u.fullName || u.businessName || 'مجهول'}</p>
                                <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{u.walletId}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Type buttons */}
                  <div className="flex gap-2">
                    {[
                      { val: 'info', label: 'معلومة', icon: MessageCircle, bg: 'bg-blue-100 text-blue-700' },
                      { val: 'success', label: 'نجاح', icon: Check, bg: 'bg-green-100 text-green-700' },
                      { val: 'warning', label: 'تحذير', icon: AlertOctagon, bg: 'bg-amber-100 text-amber-700' },
                      { val: 'price', label: 'سعر', icon: CoinsIcon, bg: 'bg-primary/10 text-primary' },
                    ].map(t => {
                      const TIcon = t.icon;
                      return (
                        <button key={t.val} onClick={() => setNotifType(t.val)}
                          className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                            notifType === t.val ? t.bg + ' ring-2 ring-offset-1 ring-primary shadow-sm' : 'bg-secondary text-muted-foreground'
                          }`}>
                          <TIcon style={{ width: 14, height: 14 }} />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sender selection */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2">المُرسِل</p>
                    <div className="flex gap-2">
                      {([
                        { val: 'LiraPro' as const, label: 'LiraPro', btype: badgeLira },
                        { val: 'فريق LiraPro' as const, label: 'فريق LiraPro', btype: badgeTeam },
                      ] as const).map(opt => (
                        <button key={opt.val} type="button"
                          onClick={() => setNotifSender(opt.val)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all ${
                            notifSender === opt.val
                              ? 'bg-[#003C32] text-white shadow-sm'
                              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                          }`}>
                          {opt.btype === 'rainbow' ? <RainbowBadge size={12} /> : <AdminBadge size={12} />}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input value={notifTitle} onChange={e => setNotifTitle(e.target.value)}
                    placeholder="عنوان الإشعار..." className="h-11" />
                  <textarea value={notifBody} onChange={e => setNotifBody(e.target.value)}
                    placeholder="نص الإشعار التفصيلي..."
                    className="w-full border border-border rounded-xl p-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                    rows={3} />
                  {notifMsg && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`text-sm text-center font-bold ${notifMsg.includes('نجاح') || notifMsg.includes('بنجاح') ? 'text-green-600' : 'text-destructive'}`}>
                      {notifMsg}
                    </motion.p>
                  )}
                  <Button onClick={sendNotification} disabled={sendingNotif || !notifTitle || !notifBody || (notifTarget === 'specific' && !notifSelectedWallet)}
                    className="h-12 font-bold gap-2" style={{ background: notifTarget === 'specific' ? '#D20073' : '#0284c7' }}>
                    <Send className="w-4 h-4" />
                    {sendingNotif ? 'جاري الإرسال...' : notifTarget === 'specific' ? `إرسال لـ ${notifSelectedName || '...'}` : 'إرسال لجميع المستخدمين'}
                  </Button>
                </CardContent>
              </Card>

              {/* Notification history */}
              <div className="flex items-center justify-between px-1">
                <span className="font-bold text-sm">سجل الإشعارات ({notifications.length})</span>
                <div className="flex items-center gap-2">
                  {selectedNotifIds.size > 0 && (
                    <button
                      onClick={bulkDeleteNotifications}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 transition-colors">
                      <Trash2 className="w-3 h-3" /> حذف ({selectedNotifIds.size})
                    </button>
                  )}
                  {notifications.length > 0 && selectedNotifIds.size === 0 && (
                    <span className="text-xs text-muted-foreground">اضغط للتوسيع</span>
                  )}
                  {notifications.length > 1 && (
                    <button
                      onClick={() => {
                        if (selectedNotifIds.size === notifications.length) {
                          setSelectedNotifIds(new Set());
                        } else {
                          setSelectedNotifIds(new Set(notifications.map(n => n.id)));
                        }
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                      {selectedNotifIds.size === notifications.length ? 'إلغاء الكل' : 'تحديد الكل'}
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">لم يتم إرسال أي إشعارات بعد</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {notifications.map(n => {
                    const isNotifExpanded = expandedNotifId === n.id;
                    const isSelected = selectedNotifIds.has(n.id);
                    return (
                      <Card key={n.id} className={`border-border shadow-sm overflow-hidden transition-colors ${isSelected ? 'ring-2 ring-red-400 dark:ring-red-600' : ''}`}>
                        <CardContent className="p-0">
                          <div className="flex items-stretch">
                            {/* Checkbox */}
                            <button
                              onClick={e => { e.stopPropagation(); toggleNotifSelect(n.id); }}
                              className={`flex-shrink-0 w-9 flex items-center justify-center border-l border-border/50 transition-colors ${isSelected ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-secondary/50'}`}>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-red-500 border-red-500' : 'border-border'}`}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </button>
                          <button
                            className="flex-1 p-3 flex gap-3 text-right hover:bg-secondary/30 transition-colors min-w-0"
                            onClick={() => setExpandedNotifId(isNotifExpanded ? null : n.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-bold truncate">{n.title}</p>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                                  n.type === 'success' ? 'bg-green-100 text-green-700'
                                  : n.type === 'warning' ? 'bg-amber-100 text-amber-700'
                                  : n.type === 'price' ? 'bg-primary/10 text-primary'
                                  : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {n.type === 'info' ? 'معلومة' : n.type === 'success' ? 'نجاح' : n.type === 'warning' ? 'تحذير' : 'سعر'}
                                </span>
                              </div>
                              <p className={`text-[10px] text-muted-foreground ${isNotifExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>{n.body}</p>
                              {n.sender && (
                                <p className="text-[9px] text-primary/70 mt-0.5 flex items-center gap-0.5">
                                  <BadgeCheck className="w-3 h-3" />{n.sender}
                                </p>
                              )}
                              {n.recipient === 'specific' && n.targetName && (
                                <p className="text-[9px] text-pink-600 dark:text-pink-400 mt-0.5 flex items-center gap-0.5">
                                  <User className="w-2.5 h-2.5" />لـ {n.targetName}
                                </p>
                              )}
                              {(!n.recipient || n.recipient === 'all') && (
                                <p className="text-[9px] text-blue-500 dark:text-blue-400 mt-0.5 flex items-center gap-0.5">
                                  <Users className="w-2.5 h-2.5" />لجميع المستخدمين
                                </p>
                              )}
                              <p className="text-[9px] text-muted-foreground/60 mt-1">
                                {new Date(n.createdAt).toLocaleString('ar-SY')}
                              </p>
                            </div>
                            <div className="flex-shrink-0 self-start pt-0.5">
                              {isNotifExpanded
                                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                            </div>
                          </button>
                          </div>
                          {isNotifExpanded && (
                            <div className="px-3 pb-3 border-t border-border/50 pt-2 flex flex-col gap-2">
                              {editingNotifId === n.id ? (
                                <div className="flex flex-col gap-2">
                                  <input
                                    value={editNotifTitle}
                                    onChange={e => setEditNotifTitle(e.target.value)}
                                    className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="عنوان الإشعار"
                                  />
                                  <textarea
                                    value={editNotifBody}
                                    onChange={e => setEditNotifBody(e.target.value)}
                                    rows={3}
                                    className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                    placeholder="نص الإشعار"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      disabled={savingNotif}
                                      onClick={() => editNotification(n.id)}
                                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50">
                                      {savingNotif ? '...' : <><Save className="w-3 h-3" /> حفظ</>}
                                    </button>
                                    <button onClick={() => setEditingNotifId(null)}
                                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-border hover:bg-secondary transition-colors">
                                      إلغاء
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => { setEditingNotifId(n.id); setEditNotifTitle(n.title); setEditNotifBody(n.body); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors">
                                      <Edit3 className="w-3 h-3" /> تعديل
                                    </button>
                                    <button onClick={() => deleteNotification(n.id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors">
                                      <Trash2 className="w-3 h-3" /> حذف
                                    </button>
                                    {(!n.recipient || n.recipient === 'all') && (
                                      <button
                                        onClick={() => {
                                          if (viewedNotifId === n.id) {
                                            setViewedNotifId(null);
                                            setNotifViewers(null);
                                          } else {
                                            setViewedNotifId(n.id);
                                            void fetchNotifViewers(n.id);
                                          }
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${viewedNotifId === n.id ? 'bg-blue-500 text-white' : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'}`}>
                                        <Eye className="w-3 h-3" /> من شاهده
                                      </button>
                                    )}
                                  </div>
                                  {viewedNotifId === n.id && (
                                    <div className="rounded-xl bg-secondary/60 p-3 flex flex-col gap-2">
                                      <p className="text-[10px] font-bold text-foreground flex items-center gap-1.5">
                                        <Eye className="w-3 h-3 text-blue-500" /> المستخدمون الذين فتحوا الإشعار
                                        {!loadingViewers && notifViewers && (
                                          <span className="mr-auto bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[9px]">
                                            {notifViewers.count} مشاهدة
                                          </span>
                                        )}
                                      </p>
                                      {loadingViewers ? (
                                        <p className="text-[9px] text-muted-foreground">جاري التحميل...</p>
                                      ) : notifViewers && notifViewers.count === 0 ? (
                                        <p className="text-[9px] text-muted-foreground">لا توجد مشاهدات بعد</p>
                                      ) : notifViewers && notifViewers.viewers.length > 0 ? (
                                        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                                          {notifViewers.viewers.map((v, i) => (
                                            <div key={i} className="flex items-center justify-between text-[9px]">
                                              <span className="text-foreground/80 font-mono truncate max-w-[140px]">{v.walletId}</span>
                                              <span className="text-muted-foreground flex-shrink-0 mr-2">
                                                {new Date(v.viewedAt).toLocaleString('ar-SY', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[9px] text-muted-foreground">لا توجد بيانات مشاهدة</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 6 — SYSTEM
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'system' && (
            <motion.div key="system" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-4">

              {/* ── Price Overrides Status ── */}
              {(() => {
                const anyActive = sypRateIsManual || goldOverrideActive || Object.values(metalOverridesDetail).some(d => d.isManual);
                const METAL_NAMES: Record<string, string> = {
                  XAU: 'الذهب (أوقية)', XAG: 'الفضة', XPT: 'البلاتين', XPD: 'البلاديوم', XCU: 'النحاس',
                };
                return (
                  <Card className={`border shadow-md overflow-hidden transition-all ${anyActive ? 'border-amber-300 dark:border-amber-700' : 'border-border'}`}>
                    <div className="px-4 py-3 flex items-center justify-between"
                      style={{ background: anyActive ? '#f59e0b18' : '#6b728010' }}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${anyActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        <span className="font-bold text-sm">حالة تجاوزات الأسعار</span>
                      </div>
                      {anyActive ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse">
                          {[sypRateIsManual, goldOverrideActive, ...Object.values(metalOverridesDetail).map(d => d.isManual)].filter(Boolean).length} نشط
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          ⚡ كل شيء تلقائي
                        </span>
                      )}
                    </div>
                    <CardContent className="p-3 flex flex-col gap-2">
                      {!anyActive && (
                        <p className="text-xs text-muted-foreground text-center py-2">لا توجد تجاوزات يدوية نشطة. جميع الأسعار تُجلب تلقائياً من المصادر الخارجية.</p>
                      )}

                      {/* SYP Rate */}
                      <div className={`rounded-xl border p-3 transition-all ${sypRateIsManual ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-900/15' : 'border-border bg-secondary/20'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <DollarSign className={`w-3.5 h-3.5 flex-shrink-0 ${sypRateIsManual ? 'text-amber-600' : 'text-muted-foreground'}`} />
                            <span className="text-xs font-bold truncate">سعر الدولار / ل.س</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black flex-shrink-0 ${sypRateIsManual ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                              {sypRateIsManual ? '✏ يدوي' : '⚡ تلقائي'}
                            </span>
                          </div>
                          {sypRateIsManual ? (
                            <button
                              onClick={() => void saveSypRate(false)}
                              disabled={sypRateSaving}
                              className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex-shrink-0 ml-2"
                            >
                              <X className="w-2.5 h-2.5" /> إلغاء
                            </button>
                          ) : sypRateUpdatedAt && (
                            <button
                              onClick={() => void saveSypRate(true)}
                              disabled={sypRateSaving}
                              className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex-shrink-0 ml-2"
                            >
                              <Save className="w-2.5 h-2.5" /> تفعيل
                            </button>
                          )}
                        </div>
                        {sypRateUpdatedAt && (
                          <div className="mt-2 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-muted-foreground">{sypRateIsManual ? 'القيمة المُطبَّقة' : 'القيمة المحفوظة'}</p>
                              <p className={`text-base font-black ${sypRateIsManual ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`} dir="ltr">{sypRateCurrent.toLocaleString()} ل.س</p>
                            </div>
                            <div className="text-left">
                              <p className="text-[9px] text-muted-foreground">آخر تعديل</p>
                              <p className="text-[10px] font-bold">{timeAgo(sypRateUpdatedAt)}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Gold */}
                      <div className={`rounded-xl border p-3 transition-all ${goldOverrideActive ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-900/15' : 'border-border bg-secondary/20'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Star className={`w-3.5 h-3.5 flex-shrink-0 ${goldOverrideActive ? 'text-amber-600' : 'text-muted-foreground'}`} />
                            <span className="text-xs font-bold truncate">الذهب 24 قيراط</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black flex-shrink-0 ${goldOverrideActive ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                              {goldOverrideActive ? '✏ يدوي' : '⚡ تلقائي'}
                            </span>
                          </div>
                          {goldOverrideActive ? (
                            <button
                              onClick={() => void clearGoldOvr()}
                              className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex-shrink-0 ml-2"
                            >
                              <X className="w-2.5 h-2.5" /> إلغاء
                            </button>
                          ) : goldOverrideInput && (
                            <button
                              onClick={() => void saveGoldOverride()}
                              className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex-shrink-0 ml-2"
                            >
                              <Save className="w-2.5 h-2.5" /> تفعيل
                            </button>
                          )}
                        </div>
                        {goldOverrideInput && (
                          <div className="mt-2 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-muted-foreground">{goldOverrideActive ? 'سعر الغرام المُطبَّق' : 'القيمة المحفوظة'}</p>
                              <p className={`text-base font-black ${goldOverrideActive ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`} dir="ltr">{parseFloat(goldOverrideInput).toLocaleString()} ل.س</p>
                            </div>
                            {goldOverrideUpdatedAt && (
                              <div className="text-left">
                                <p className="text-[9px] text-muted-foreground">آخر تعديل</p>
                                <p className="text-[10px] font-bold">{timeAgo(goldOverrideUpdatedAt)}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Metal Overrides (active and stored) */}
                      {Object.entries(metalOverridesDetail).map(([sym, detail]) => (
                        <div key={sym} className={`rounded-xl border p-3 transition-all ${detail.isManual ? 'border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-900/10' : 'border-border bg-secondary/20'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <CoinsIcon className={`w-3.5 h-3.5 flex-shrink-0 ${detail.isManual ? 'text-purple-600' : 'text-muted-foreground'}`} />
                              <span className="text-xs font-bold truncate">{METAL_NAMES[sym] ?? sym}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black flex-shrink-0 ${detail.isManual ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                {detail.isManual ? '✏ يدوي' : '⚡ تلقائي'}
                              </span>
                            </div>
                            {detail.isManual ? (
                              <button
                                onClick={() => void clearMetalOvr(sym)}
                                className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex-shrink-0 ml-2"
                              >
                                <X className="w-2.5 h-2.5" /> إلغاء
                              </button>
                            ) : (
                              <button
                                onClick={() => void reactivateMetalOvr(sym)}
                                className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex-shrink-0 ml-2"
                              >
                                <Save className="w-2.5 h-2.5" /> تفعيل
                              </button>
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-muted-foreground">{detail.isManual ? 'السعر المُطبَّق' : 'القيمة المحفوظة'}</p>
                              <p className={`text-base font-black ${detail.isManual ? 'text-purple-700 dark:text-purple-300' : 'text-muted-foreground'}`} dir="ltr">{detail.priceSYP.toLocaleString()} ل.س</p>
                            </div>
                            <div className="text-left">
                              <p className="text-[9px] text-muted-foreground">آخر تعديل</p>
                              <p className="text-[10px] font-bold">{timeAgo(detail.updatedAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Refresh button */}
                      <button
                        onClick={() => { void queryClient.invalidateQueries({ queryKey: ['admin-syp-rate'] }); void queryClient.invalidateQueries({ queryKey: ['admin-gold-override'] }); void queryClient.invalidateQueries({ queryKey: ['admin-metal-rates'] }); }}
                        className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
                      >
                        <RefreshCw className="w-3 h-3" /> تحديث الحالة
                      </button>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Override History */}
              <Card className="border-border shadow-sm overflow-hidden">
                <button
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  style={{ background: '#7C3AED10' }}
                  onClick={() => {
                    const next = !overrideHistoryOpen;
                    setOverrideHistoryOpen(next);
                    if (next && overrideHistory.length === 0) void fetchOverrideHistory();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-500" />
                    <span className="font-bold text-sm">سجل تغييرات الأسعار اليدوية</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {overrideHistory.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                        {overrideHistory.length} سجل
                      </span>
                    )}
                    {overrideHistoryOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
                <AnimatePresence>
                  {overrideHistoryOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <CardContent className="p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">آخر ٥٠ تغيير</span>
                          <button
                            onClick={() => void fetchOverrideHistory()}
                            disabled={overrideHistoryLoading}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <RefreshCw className={`w-3 h-3 ${overrideHistoryLoading ? 'animate-spin' : ''}`} /> تحديث
                          </button>
                        </div>
                        {overrideHistoryLoading && overrideHistory.length === 0 ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : overrideHistory.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">لا توجد سجلات بعد. ستظهر هنا عند إجراء تغييرات على الأسعار.</p>
                        ) : (
                          <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                            {overrideHistory.map(entry => {
                              const isSet = entry.action === 'set';
                              const typeLabel: Record<string, string> = {
                                syp: 'دولار / ل.س', gold: 'الذهب', metal: 'معدن', currency: 'عملة',
                              };
                              const keyLabel = entry.key === 'syp' ? 'USD/SYP'
                                : entry.key === 'gold' ? 'XAU'
                                : entry.key.replace('metal:', '');
                              return (
                                <div key={entry.id} className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs border ${
                                  isSet
                                    ? 'bg-amber-50/60 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40'
                                    : 'bg-secondary/40 border-border'
                                }`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                      isSet
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                        : 'bg-secondary text-muted-foreground'
                                    }`}>
                                      {isSet ? '✏ تعيين' : '✕ مسح'}
                                    </span>
                                    <span className="font-bold truncate">{typeLabel[entry.priceType] ?? entry.priceType}</span>
                                    <span className="text-muted-foreground font-mono text-[10px]" dir="ltr">{keyLabel}</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 ml-2 text-left">
                                    {isSet && entry.priceSYP != null && (
                                      <span className="font-black text-amber-700 dark:text-amber-300" dir="ltr">
                                        {entry.priceSYP.toLocaleString()} ل.س
                                      </span>
                                    )}
                                    {entry.changedBy && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 font-bold flex-shrink-0">
                                        {entry.changedBy}
                                      </span>
                                    )}
                                    <span className="text-[9px] text-muted-foreground">{timeAgo(entry.changedAt)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Clear History Button */}
                        <div className="border-t border-border pt-2 mt-1">
                          <button
                            onClick={() => setClearHistoryDialogOpen(true)}
                            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg py-1.5 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            مسح السجل
                          </button>
                        </div>
                        {/* Clear History Confirmation Dialog */}
                        {clearHistoryDialogOpen && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="bg-background border border-border rounded-2xl shadow-xl p-5 w-80 flex flex-col gap-4" dir="rtl">
                              <div className="flex items-center gap-2 text-red-500">
                                <Trash2 className="w-4 h-4" />
                                <span className="font-bold text-sm">مسح سجل التغييرات</span>
                              </div>
                              <p className="text-xs text-muted-foreground">اختر نطاق الحذف:</p>
                              <div className="flex flex-col gap-2">
                                {([
                                  { value: 'all', label: 'مسح كل السجلات' },
                                  { value: '90', label: 'أقدم من ٩٠ يوماً' },
                                  { value: '30', label: 'أقدم من ٣٠ يوماً' },
                                ] as const).map(opt => (
                                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-xs">
                                    <input
                                      type="radio"
                                      name="clearDays"
                                      value={opt.value}
                                      checked={clearHistoryDays === opt.value}
                                      onChange={() => setClearHistoryDays(opt.value)}
                                      className="accent-red-500"
                                    />
                                    {opt.label}
                                  </label>
                                ))}
                              </div>
                              <div className="flex gap-2 justify-end mt-1">
                                <button
                                  onClick={() => setClearHistoryDialogOpen(false)}
                                  disabled={clearHistoryLoading}
                                  className="px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-secondary transition-colors"
                                >
                                  إلغاء
                                </button>
                                <button
                                  onClick={() => void handleClearHistory()}
                                  disabled={clearHistoryLoading}
                                  className="px-3 py-1.5 rounded-lg text-xs bg-red-500 hover:bg-red-600 text-white font-bold transition-colors flex items-center gap-1.5 disabled:opacity-60"
                                >
                                  {clearHistoryLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                  تأكيد الحذف
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* Badge reference card */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(90deg, #7C3AED18, #003C3218)' }}>
                  <ShieldCheck className="w-4 h-4 text-violet-500" />
                  <span className="font-bold text-sm">نظام شارات التوثيق</span>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { badge: <RainbowBadge size={28} />, label: 'Legendary', desc: 'LiraPro', color: '#FF44CC' },
                      { badge: <AdminBadge size={28} />, label: 'Cyberpunk', desc: 'فريق LiraPro', color: '#7C3AED' },
                      { badge: <GoldenBadge size={28} />, label: 'Golden', desc: 'مزود أسعار موثّق', color: '#D97706' },
                      { badge: <BlueBadge size={28} />, label: 'Blue', desc: 'مستخدم موثّق', color: '#2563EB' },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-secondary/40 border border-border">
                        {item.badge}
                        <span className="text-[10px] font-black" style={{ color: item.color }}>{item.label}</span>
                        <span className="text-[9px] text-muted-foreground text-center">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Visit stats */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#D2007310' }}>
                  <Globe className="w-4 h-4" style={{ color: '#D20073' }} />
                  <span className="font-bold text-sm">إحصائيات الزيارات</span>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-pink-50 dark:bg-pink-900/20 rounded-2xl p-4 text-center">
                      <p className="text-3xl font-black text-pink-600 dark:text-pink-300">{stats?.todayVisits ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">زيارة اليوم</p>
                    </div>
                    <div className="bg-secondary/60 rounded-2xl p-4 text-center">
                      <p className="text-3xl font-black text-foreground">{stats?.totalVisits ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">إجمالي الزيارات</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User stats */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#003C3210' }}>
                  <Users className="w-4 h-4" style={{ color: '#003C32' }} />
                  <span className="font-bold text-sm">إحصائيات المستخدمين</span>
                </div>
                <CardContent className="p-4 flex flex-col gap-2">
                  {[
                    { label: 'إجمالي المستخدمين المسجلين', val: stats?.totalUsers ?? 0, color: '#003C32', onClick: () => setActiveTab('users') },
                    { label: 'الحسابات الشخصية', val: stats?.privateUsers ?? 0, color: '#0284c7', onClick: () => setActiveTab('users') },
                    { label: 'مزودو الخدمة (مستخدمون)', val: stats?.providers ?? 0, color: '#D20073', onClick: () => setActiveTab('users') },
                    { label: 'التجار ومدخلو الأسعار', val: vendors.length, color: '#7C3AED', onClick: () => setActiveTab('vendors') },
                    { label: 'طلبات العضوية المعلقة', val: pendingApps, color: '#f59e0b', onClick: () => setActiveTab('requests') },
                    { label: 'المستخدمون النشطون (آخر ساعة)', val: stats?.activeUsers ?? 0, color: '#059669', onClick: () => setActiveTab('users') },
                    { label: 'المحظورون', val: stats?.bannedUsers ?? 0, color: '#ef4444', onClick: () => setActiveTab('users') },
                  ].map(s => (
                    <button key={s.label} onClick={s.onClick}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0 w-full text-right hover:bg-secondary/50 active:bg-secondary transition-colors rounded-lg px-1.5 -mx-1.5 cursor-pointer">
                      <span className="text-sm text-foreground/80">{s.label}</span>
                      <span className="font-black text-base" style={{ color: s.color }}>{s.val}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Data management */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#03a9f410' }}>
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="font-bold text-sm">إدارة البيانات</span>
                </div>
                <CardContent className="p-4 flex flex-col gap-2">
                  <Button variant="outline" className="w-full gap-2 justify-start h-11"
                    onClick={() => { refetchRates(); refetchGold(); void queryClient.invalidateQueries({ queryKey: ['admin-stats', token] }); }}>
                    <RefreshCw className="w-4 h-4 text-primary" /> تحديث بيانات الأسعار من API
                  </Button>
                  <Button variant="outline" className="w-full gap-2 justify-start h-11"
                    onClick={() => { void queryClient.invalidateQueries({ queryKey: ['admin-users', token] }); void queryClient.invalidateQueries({ queryKey: ['admin-stats', token] }); }}>
                    <Users className="w-4 h-4 text-primary" /> تحديث بيانات المستخدمين
                  </Button>
                  <Button variant="outline" className="w-full gap-2 justify-start h-11 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => openConfirm({
                      title: 'مسح جميع تجاوزات الأسعار',
                      body: 'سيتم حذف جميع تجاوزات أسعار الشراء/البيع. هذا الإجراء لا يمكن التراجع عنه.',
                      destructive: true,
                      confirmLabel: 'مسح الكل',
                      onConfirm: async () => {
                        const sbToken = await getSupabaseToken();
                        await fetch('/api/admin/rate-overrides', { method: 'DELETE', headers: { 'X-Admin-Token': token ?? '', ...(sbToken ? { Authorization: `Bearer ${sbToken}` } : {}) } });
                        await queryClient.invalidateQueries({ queryKey: ['admin-buy-sell-overrides'] });
                      },
                    })}>
                    <X className="w-4 h-4" /> مسح جميع تجاوزات الأسعار
                  </Button>
                </CardContent>
              </Card>

              {/* Clear Test Data */}
              <Card className="border-red-200 dark:border-red-800/40 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#ef444410' }}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span className="font-bold text-sm text-red-700 dark:text-red-400">مسح بيانات الاختبار</span>
                </div>
                <CardContent className="p-4 flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">يمسح جميع بيانات المحادثات والتذاكر والتقييمات المخزنة محلياً. مفيد لبدء اختبار نظيف.</p>
                  <Button variant="outline" className="w-full gap-2 justify-start h-11 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      const keysToDelete: string[] = [];
                      for (const key of Object.keys(localStorage)) {
                        if (
                          key.startsWith('syp-conv-') || key === 'syp-tickets' ||
                          key === 'syp-support-user-ids' || key === 'syp-guest-session-id' ||
                          key === 'syp-guest-msg-count' || key === 'syp-ai-banner-dismissed' ||
                          key.startsWith('syp-lph-') || key.startsWith('syp-verify-') ||
                          key === 'syp-lph-registry' || key === 'syp-vendor-report-list'
                        ) keysToDelete.push(key);
                      }
                      openConfirm({
                        title: 'مسح بيانات الاختبار',
                        body: `سيتم مسح ${keysToDelete.length} سجل (محادثات، تذاكر، بيانات دعم). هذا الإجراء لا يمكن التراجع عنه.`,
                        destructive: true,
                        confirmLabel: 'مسح البيانات',
                        onConfirm: () => {
                          keysToDelete.forEach(k => localStorage.removeItem(k));
                          openConfirm({
                            title: '✓ تم المسح',
                            body: `تم مسح ${keysToDelete.length} سجل. أعد تحميل الصفحة لرؤية التغييرات.`,
                            alertOnly: true,
                            confirmLabel: 'حسناً',
                          });
                        },
                      });
                    }}>
                    <Trash2 className="w-4 h-4" /> مسح بيانات الدعم والمحادثات (محلي)
                  </Button>
                  <Button variant="outline" className="w-full gap-2 justify-start h-11 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    onClick={() => openConfirm({
                      title: 'إعادة تعيين جلسة الضيف',
                      body: 'سيتم إعادة تعيين جلسة الضيف وعداد رسائله. هل تريد المتابعة؟',
                      confirmLabel: 'إعادة التعيين',
                      onConfirm: () => {
                        ['syp-guest-session-id', 'syp-guest-msg-count', 'syp-ai-banner-dismissed'].forEach(k => localStorage.removeItem(k));
                        openConfirm({
                          title: '✓ تم إعادة التعيين',
                          body: 'تم إعادة تعيين جلسة الضيف. أعد تحميل الصفحة.',
                          alertOnly: true,
                          confirmLabel: 'حسناً',
                        });
                      },
                    })}>
                    <RefreshCw className="w-4 h-4" /> إعادة تعيين جلسة الضيف
                  </Button>
                </CardContent>
              </Card>

              {/* System info */}
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold text-sm">معلومات النظام</span>
                  </div>
                  <button
                    onClick={() => { setSysInfoEditing(v => !v); setSysInfoPassword(''); setSysInfoMsg(''); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      sysInfoEditing ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}>
                    {sysInfoEditing ? <><X className="w-3 h-3" /> إلغاء</> : <><Edit3 className="w-3 h-3" /> تعديل</>}
                  </button>
                </div>
                <CardContent className="p-4 flex flex-col gap-3">
                  {!sysInfoEditing ? (
                    <div className="flex flex-col gap-2 text-xs">
                      {[
                        { label: 'اسم التطبيق', val: sysInfoEdits.appName },
                        { label: 'نسخة لوحة التحكم', val: sysInfoEdits.version },
                        { label: 'وقت الخادم', val: new Date().toLocaleString('ar-SY') },
                        { label: 'عدد العملات المدعومة', val: sysInfoEdits.currencies },
                        { label: 'مزود الأسعار الموحد', val: sysInfoEdits.pricesProvider },
                        { label: 'فاصل تحديث الأسعار', val: sysInfoEdits.cacheInterval },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className="font-bold">{r.val}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex flex-col gap-2">
                        <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
                          <Shield className="w-3 h-3" /> تأكيد كلمة سر المدير للتعديل
                        </p>
                        <input
                          type="password"
                          value={sysInfoPassword}
                          onChange={e => setSysInfoPassword(e.target.value)}
                          placeholder="كلمة السر..."
                          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-amber-400/40 text-center tracking-widest"
                        />
                      </div>
                      {sysInfoPassword === DEFAULT_TOKEN && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                          {[
                            { label: 'اسم التطبيق', key: 'appName', dir: 'rtl' as const },
                            { label: 'نسخة لوحة التحكم', key: 'version', dir: 'ltr' as const },
                            { label: 'العملات المدعومة', key: 'currencies', dir: 'ltr' as const },
                          ].map(f => (
                            <div key={f.key}>
                              <label className="text-[10px] text-muted-foreground font-bold">{f.label}</label>
                              <input
                                value={sysInfoEdits[f.key as keyof typeof sysInfoEdits]}
                                onChange={e => setSysInfoEdits(v => ({ ...v, [f.key]: e.target.value }))}
                                dir={f.dir}
                                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 mt-0.5"
                              />
                            </div>
                          ))}
                          <Button className="w-full h-10 font-bold gap-2 rounded-xl mt-1 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => {
                              setSysInfoEditing(false);
                              setSysInfoMsg('تم حفظ معلومات النظام');
                              setTimeout(() => setSysInfoMsg(''), 3000);
                            }}>
                            <Save className="w-4 h-4" /> حفظ التغييرات
                          </Button>
                        </motion.div>
                      )}
                      {sysInfoMsg && (
                        <p className="text-sm font-bold text-center text-green-600">{sysInfoMsg}</p>
                      )}
                    </motion.div>
                  )}
                </CardContent>
              </Card>

            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: VENDORS
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'vendors' && (
            <motion.div key="vendors" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-4">

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm">التجار ومدخلو الأسعار</h3>
                  <p className="text-xs text-muted-foreground">{vendors.length} تاجر مسجل</p>
                </div>
                <Button onClick={() => setCreateVendorOpen(v => !v)}
                  className="gap-1.5 font-bold text-xs h-9 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4" /> إنشاء تاجر
                </Button>
              </div>

              {vendorMsg && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-bold text-center ${!vendorMsg.includes('فشل') && !vendorMsg.includes('خطأ') && !vendorMsg.includes('مطلوبة') ? 'bg-green-50 dark:bg-green-900/20 text-green-700' : 'bg-red-50 dark:bg-red-900/20 text-destructive'}`}>
                  {vendorMsg}
                </motion.div>
              )}

              {/* Create Vendor Form */}
              <AnimatePresence>
                {createVendorOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Card className="border-none shadow-md overflow-visible">
                      <div className="px-4 py-3 border-b border-border flex items-center gap-2 rounded-t-xl"
                        style={{ background: '#003C3210' }}>
                        <Building2 className="w-4 h-4 text-primary" />
                        <span className="font-black text-sm">إنشاء حساب تاجر جديد</span>
                      </div>
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                          <strong>مهم:</strong> أدخل Supabase ID للمستخدم المسجل مسبقاً. يمكن الحصول عليه من تبويب المستخدمين.
                        </div>
                        {[
                          { label: 'Supabase ID للمستخدم *', key: 'supabaseId', ph: 'user_2xxx...', dir: 'ltr' as const },
                          { label: 'اسم النشاط التجاري أو الشركة *', key: 'businessName', ph: 'مثال: صرافة النور' },
                          { label: 'الاسم الثلاثي', key: 'fullName', ph: 'الاسم الكامل' },
                          { label: 'البريد الإلكتروني', key: 'email', ph: 'email@example.com', dir: 'ltr' as const },
                          { label: 'رقم الهاتف', key: 'phone', ph: '+963...', dir: 'ltr' as const },
                        ].map(f => (
                          <div key={f.key} className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-foreground/70">{f.label}</label>
                            <input
                              type="text"
                              value={vendorForm[f.key as keyof typeof vendorForm]}
                              onChange={e => setVendorForm(v => ({ ...v, [f.key]: e.target.value }))}
                              placeholder={f.ph}
                              dir={f.dir ?? 'rtl'}
                              className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                        ))}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-foreground/70">المحافظة</label>
                          <AdminSelect
                            value={vendorForm.governorate}
                            onChange={v => setVendorForm(prev => ({ ...prev, governorate: v }))}
                            placeholder="اختر المحافظة"
                            options={GOVERNORATES.map(g => ({ value: g, label: g }))}
                          />
                        </div>
                        {[
                          { label: 'اسم المدينة', key: 'city', ph: 'مثال: دمشق' },
                          { label: 'العنوان', key: 'address', ph: 'الشارع، رقم البناء' },
                          { label: 'رابط الشعار (اختياري)', key: 'logoUrl', ph: 'https://...', dir: 'ltr' as const },
                        ].map(f => (
                          <div key={f.key} className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-foreground/70">{f.label}</label>
                            <input
                              type="text"
                              value={vendorForm[f.key as keyof typeof vendorForm]}
                              onChange={e => setVendorForm(v => ({ ...v, [f.key]: e.target.value }))}
                              placeholder={f.ph}
                              dir={(f as { dir?: 'ltr' | 'rtl' }).dir ?? 'rtl'}
                              className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                        ))}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-foreground/70">الفئة الرئيسية *</label>
                          <AdminSelect
                            value={vendorForm.category}
                            onChange={v => setVendorForm(prev => ({ ...prev, category: v }))}
                            placeholder="اختر الفئة"
                            options={APP_CATEGORIES.map(c => ({ value: c.id, label: c.label }))}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-foreground/70">نسبة الموثوقية الابتدائية ({vendorForm.trustScore}%)</label>
                          <input type="range" min="10" max="100" step="5"
                            value={vendorForm.trustScore}
                            onChange={e => setVendorForm(v => ({ ...v, trustScore: e.target.value }))}
                            className="w-full accent-primary"
                          />
                        </div>
                        <Button onClick={saveVendor} disabled={vendorSaving}
                          className="w-full h-11 font-black gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
                          {vendorSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</> : <><UserCheck className="w-4 h-4" /> إنشاء حساب التاجر</>}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Vendor Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={vendorSearch}
                  onChange={e => setVendorSearch(e.target.value)}
                  placeholder="بحث بالاسم أو البريد أو الهاتف..."
                  className="w-full pr-9 pl-9 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                  dir="rtl"
                />
                {vendorSearch && (
                  <button onClick={() => setVendorSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Vendors List */}
              {vendors.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Building2 className="w-12 h-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">لا يوجد تجار مسجلون بعد</p>
                  <p className="text-xs text-muted-foreground/60">استخدم زر "إنشاء تاجر" لإضافة أول مورد</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {vendors.filter(v => {
                    if (!vendorSearch.trim()) return true;
                    const q = vendorSearch.toLowerCase();
                    return [(v.businessName ?? ''), (v.fullName ?? ''), (v.email ?? ''), (v.phone ?? '')].join(' ').toLowerCase().includes(q);
                  }).map(v => {
                    const trustColor = v.trustScore >= 80 ? '#16a34a' : v.trustScore >= 55 ? '#d97706' : '#ef4444';
                    const trustBg = v.trustScore >= 80 ? 'linear-gradient(90deg,#16a34a,#22c55e)' : v.trustScore >= 55 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)';
                    const catLabel = VENDOR_CATEGORIES_AR[v.category] ?? v.category;
                    return (
                      <Card key={v.id}
                        onClick={() => { setVendorDetail(v); setVendorDetailEdit({ ...v }); setVendorDetailMsg(''); }}
                        className="border border-border overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all active:scale-[.995] shadow-sm">
                        <CardContent className="p-0">
                          {/* Active/Inactive accent stripe */}
                          <div className={`h-[3px] w-full ${v.isActive ? 'bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400' : 'bg-gradient-to-r from-red-400 to-rose-500'}`} />

                          <div className="p-3.5">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-2.5">
                              {/* Logo or initials */}
                              <div className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm overflow-hidden"
                                style={{ background: v.isActive ? 'linear-gradient(135deg, #003C32, #005a4a)' : 'linear-gradient(135deg, #6b7280, #374151)' }}>
                                {v.logoUrl ? (
                                  <img src={v.logoUrl} alt={v.businessName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-sm font-black text-white">
                                    {(v.businessName ?? '?').charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <p className="font-black text-sm truncate leading-tight">{v.businessName}</p>
                                    {verifiedVendors.has(v.id) && <GoldenBadge size={12} showGlow={false} />}
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <GoldenBadge size={13} showGlow={legendaryVendors.has(v.id)} />
                                    <span className={`text-[8px] px-1.5 py-[2px] rounded-full font-black ${
                                      v.isActive
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                      {v.isActive ? '● نشط' : '○ موقوف'}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">{v.fullName}</p>
                              </div>
                            </div>

                            {/* Category + location + phone */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                              <span className="text-[9px] bg-primary/10 text-primary px-2 py-[3px] rounded-full font-bold">
                                {catLabel}
                              </span>
                              {v.governorate && (
                                <span className="text-[9px] bg-secondary text-muted-foreground px-2 py-[3px] rounded-full flex items-center gap-0.5">
                                  <MapPin style={{ width: 8, height: 8 }} />{v.governorate}
                                  {v.city ? ` · ${v.city}` : ''}
                                </span>
                              )}
                              {v.phone && (
                                <span className="text-[9px] bg-secondary text-muted-foreground px-2 py-[3px] rounded-full flex items-center gap-0.5 font-mono" dir="ltr">
                                  <Phone style={{ width: 8, height: 8 }} />{v.phone}
                                </span>
                              )}
                            </div>

                            {/* Trust score + date */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${v.trustScore}%`, background: trustBg }} />
                                </div>
                                <span className="text-[9px] font-black tabular-nums" style={{ color: trustColor, minWidth: '2.2rem', textAlign: 'left' }}>
                                  {v.trustScore}%
                                </span>
                              </div>
                              {v.createdAt && (
                                <span className="text-[8px] text-muted-foreground/50 flex-shrink-0">
                                  {new Date(v.createdAt).toLocaleDateString('ar-SY', { month: 'short', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: CATEGORIES
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'categories' && (
            <motion.div key="categories" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-4">

              {catView === 'categories' ? (
                <>
                  <div>
                    <h3 className="font-black text-sm">فئات التجار</h3>
                    <p className="text-xs text-muted-foreground">{APP_CATEGORIES.length} فئة مسجلة</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {APP_CATEGORIES.map(cat => {
                      const count = vendors.filter(v => v.category === cat.id).length;
                      return (
                        <Card key={cat.id}
                          onClick={() => { setCatSelectedId(cat.id); setCatView('vendors'); }}
                          className="border-none shadow-sm overflow-hidden cursor-pointer hover:shadow-md active:scale-[.98] transition-all">
                          <CardContent className="p-4 flex flex-col gap-2">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                              style={{ background: '#003C3215' }}>
                              <Tag className="w-5 h-5" style={{ color: '#003C32' }} />
                            </div>
                            <div>
                              <p className="text-xs font-black leading-tight">{cat.label}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{count} تاجر</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setCatView('categories'); setCatSelectedId(null); }}
                      className="p-2 hover:bg-secondary rounded-xl transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="font-black text-sm">
                        {APP_CATEGORIES.find(c => c.id === catSelectedId)?.label ?? ''}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {vendors.filter(v => v.category === catSelectedId).length} تاجر
                      </p>
                    </div>
                  </div>
                  {vendors.filter(v => v.category === catSelectedId).length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <Building2 className="w-12 h-12 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">لا يوجد تجار في هذه الفئة</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {vendors.filter(v => v.category === catSelectedId).map(v => (
                        <Card key={v.id}
                          onClick={() => { setVendorDetail(v); setVendorDetailEdit({ ...v }); setVendorDetailMsg(''); setActiveTab('vendors'); }}
                          className="border-none shadow-sm overflow-hidden cursor-pointer hover:shadow-md active:scale-[.99] transition-all">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: v.isActive ? '#003C3218' : '#ef444418' }}>
                                <Building2 className="w-4 h-4" style={{ color: v.isActive ? '#003C32' : '#ef4444' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{v.businessName}</p>
                                <p className="text-[10px] text-muted-foreground">{v.fullName} · {v.governorate}</p>
                              </div>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${v.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {v.isActive ? 'نشط' : 'موقوف'}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: APPLICATIONS (vendor membership requests)
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'applications' && (
            <motion.div key="applications" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-4">

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm">طلبات العضوية</h3>
                  <p className="text-xs text-muted-foreground">
                    {pendingApps > 0 ? (
                      <span className="text-amber-600 font-bold">{pendingApps} طلب معلق</span>
                    ) : 'لا توجد طلبات معلقة'}
                  </p>
                </div>
                <button onClick={() => void queryClient.invalidateQueries({ queryKey: ['admin-vendor-apps', token] })}
                  className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Notification prompt after approval */}
              <AnimatePresence>
                {notifyApp && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-2xl border border-green-200 dark:border-green-800/40 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #22c55e12, #16a34a10)' }}
                  >
                    <div className="p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <p className="text-xs font-bold text-green-700 dark:text-green-400">
                            تم قبول: {notifyApp.businessName}
                          </p>
                        </div>
                        <button onClick={() => setNotifyApp(null)}
                          className="p-1 hover:bg-black/10 rounded-lg transition-colors">
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">هل تريد إرسال إشعار لجميع المستخدمين بهذا القبول؟</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => sendAppNotification(notifyApp)}
                          disabled={sendingAppNotif}
                          className="flex-1 h-8 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {sendingAppNotif
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري الإرسال</>
                            : <><Bell className="w-3.5 h-3.5" /> إرسال إشعار للجميع</>
                          }
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setNotifyApp(null)}
                          className="h-8 text-xs rounded-xl px-3"
                        >
                          تخطي
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Accept Application Panel */}
              <AnimatePresence>
                {acceptingApp && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl border border-primary/30 overflow-hidden shadow-lg bg-primary/5"
                  >
                    <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-primary/5">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-primary" />
                        <p className="text-sm font-black text-primary">قبول: {acceptingApp.businessName}</p>
                      </div>
                      <button onClick={() => setAcceptingApp(null)}
                        className="p-1.5 hover:bg-black/10 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      {/* Supabase ID */}
                      <div>
                        <label className="text-xs font-bold text-foreground/70 block mb-1">
                          Supabase ID للمستخدم <span className="text-destructive">*</span>
                        </label>
                        <input value={acceptUserId} onChange={e => setAcceptUserId(e.target.value)}
                          placeholder="user_2xxx..."
                          dir="ltr"
                          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      {/* Trust Score */}
                      <div>
                        <label className="text-xs font-bold text-foreground/70 block mb-1">
                          نسبة الموثوقية الابتدائية ({acceptTrustScore}%)
                        </label>
                        <input type="range" min="10" max="100" step="5"
                          value={acceptTrustScore}
                          onChange={e => setAcceptTrustScore(e.target.value)}
                          className="w-full accent-primary" />
                        <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                          <span>10%</span><span>100%</span>
                        </div>
                      </div>
                      {/* Notification */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Bell className="w-3.5 h-3.5 text-blue-600" />
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-400">إشعار شخصي للمستخدم</p>
                        </div>
                        <input value={acceptNotifTitle} onChange={e => setAcceptNotifTitle(e.target.value)}
                          placeholder="عنوان الإشعار..."
                          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
                        <textarea value={acceptNotifBody} onChange={e => setAcceptNotifBody(e.target.value)}
                          placeholder="نص الإشعار..."
                          rows={3}
                          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/30 resize-none" />
                        <p className="text-[10px] text-muted-foreground">
                          سيُرسَل إشعار شخصي من "فريق LiraPro" عند القبول
                        </p>
                      </div>
                      {acceptMsg && (
                        <p className="text-xs font-bold text-center text-destructive">{acceptMsg}</p>
                      )}
                      <div className="flex gap-2">
                        <Button onClick={confirmAcceptApp} disabled={acceptSaving}
                          className="flex-1 h-11 font-black gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
                          {acceptSaving
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري القبول...</>
                            : <><UserCheck className="w-4 h-4" /> تأكيد القبول وإنشاء الحساب</>
                          }
                        </Button>
                        <Button variant="outline" onClick={() => setAcceptingApp(null)}
                          className="h-11 px-4 rounded-2xl">
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reject Application Panel */}
              <AnimatePresence>
                {rejectingApp && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
                    className="bg-card border border-destructive/30 rounded-2xl p-4 flex flex-col gap-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-destructive" />
                        </div>
                        <div>
                          <p className="font-black text-sm">رفض الطلب</p>
                          <p className="text-[10px] text-muted-foreground">{rejectingApp.businessName} — {rejectingApp.fullName}</p>
                        </div>
                      </div>
                      <button onClick={() => setRejectingApp(null)} className="p-1 hover:bg-secondary rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground">Supabase ID للإشعار (اختياري)</label>
                      <input
                        value={rejectUserId}
                        onChange={e => setRejectUserId(e.target.value)}
                        placeholder="user_xxxxxxxx"
                        dir="ltr"
                        className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-destructive/30"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground">عنوان الإشعار</label>
                      <input
                        value={rejectNotifTitle}
                        onChange={e => setRejectNotifTitle(e.target.value)}
                        className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground">نص الإشعار</label>
                      <textarea
                        value={rejectNotifBody}
                        onChange={e => setRejectNotifBody(e.target.value)}
                        rows={3}
                        className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    </div>
                    {rejectMsg && <p className="text-xs text-destructive font-bold text-center">{rejectMsg}</p>}
                    <div className="flex gap-2">
                      <Button
                        onClick={confirmRejectApp}
                        disabled={rejectSaving}
                        className="flex-1 h-11 font-black rounded-2xl gap-2 bg-destructive hover:bg-destructive/90 text-white"
                      >
                        {rejectSaving
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الرفض...</>
                          : <><XCircle className="w-4 h-4" /> تأكيد الرفض</>
                        }
                      </Button>
                      <Button variant="outline" onClick={() => setRejectingApp(null)} className="h-11 px-4 rounded-2xl">
                        إلغاء
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Filter tabs */}
              <div className="flex gap-2 bg-secondary/60 rounded-2xl p-1">
                {[
                  { id: 'pending', label: 'معلقة', color: '#f59e0b' },
                  { id: 'approved', label: 'مقبولة', color: '#22c55e' },
                  { id: 'rejected', label: 'مرفوضة', color: '#ef4444' },
                  { id: 'all', label: 'الكل', color: '#003C32' },
                ].map(f => {
                  const count = f.id === 'all'
                    ? vendorApplications.length
                    : vendorApplications.filter(a => a.status === f.id).length;
                  return (
                    <button key={f.id}
                      onClick={() => setVendorAppFilter(f.id as typeof vendorAppFilter)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                        vendorAppFilter === f.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
                      }`}>
                      <span>{f.label}</span>
                      {count > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                          style={{ background: vendorAppFilter === f.id ? f.color + '20' : 'transparent', color: f.color }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {vendorApplications
                .filter(a => vendorAppFilter === 'all' || a.status === vendorAppFilter)
                .length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <FileX className="w-12 h-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">لا توجد طلبات في هذا القسم</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {vendorApplications
                    .filter(a => vendorAppFilter === 'all' || a.status === vendorAppFilter)
                    .map(app => {
                      const appKey = String(app.id);
                      const isAppExpanded = expandedAppId === appKey;
                      return (
                        <Card key={app.id} className="border-none shadow-sm overflow-hidden">
                          {/* Clickable header */}
                          <button
                            className="w-full p-3 flex items-start gap-2 text-right hover:bg-secondary/20 transition-colors"
                            onClick={() => setExpandedAppId(isAppExpanded ? null : appKey)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-sm truncate">{app.businessName}</p>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                                  app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                  app.status === 'approved' ? 'bg-green-100 text-green-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {app.status === 'pending' ? 'معلق' : app.status === 'approved' ? 'مقبول' : 'مرفوض'}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{app.fullName} · {app.phone}</p>
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                <Clock className="w-2.5 h-2.5 inline ml-0.5" />
                                {new Date(app.createdAt).toLocaleDateString('ar-SY')}
                              </p>
                            </div>
                            <div className="flex-shrink-0 pt-0.5">
                              {isAppExpanded
                                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                            </div>
                          </button>

                          {/* Expanded details */}
                          <AnimatePresence initial={false}>
                            {isAppExpanded && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                className="overflow-hidden">
                                <div className="px-3 pb-3 border-t border-border/50 pt-3 flex flex-col gap-2">
                                  {/* Full applicant data grid */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <User className="w-3 h-3 text-primary flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">مقدّم الطلب</p>
                                        <p className="text-xs font-bold truncate">{app.fullName}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <Phone className="w-3 h-3 text-primary flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">الهاتف</p>
                                        <p className="text-xs font-bold truncate" dir="ltr">{app.phone}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2 col-span-2">
                                      <Mail className="w-3 h-3 text-primary flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">البريد</p>
                                        <p className="text-xs font-bold truncate" dir="ltr">{app.email}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <Building2 className="w-3 h-3 text-primary flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">الفئة</p>
                                        <p className="text-xs font-bold truncate">{VENDOR_CATEGORIES_AR[app.category] ?? app.category}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                                      <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">المنطقة</p>
                                        <p className="text-xs font-bold truncate">{app.governorate}{app.city ? ` · ${app.city}` : ''}</p>
                                      </div>
                                    </div>
                                    {app.address && (
                                      <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2 col-span-2">
                                        <MapPin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-[9px] text-muted-foreground">العنوان التفصيلي</p>
                                          <p className="text-xs font-bold">{app.address}</p>
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2 col-span-2">
                                      <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">تاريخ تقديم الطلب</p>
                                        <p className="text-xs font-bold">{new Date(app.createdAt).toLocaleString('ar-SY')}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Admin notes */}
                                  {app.adminNotes && (
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-2 py-1.5 flex items-start gap-1">
                                      <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />{app.adminNotes}
                                    </p>
                                  )}

                                  {/* Status badge for processed */}
                                  {app.status !== 'pending' && (
                                    <div className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${
                                      app.status === 'approved'
                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40'
                                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40'
                                    }`}>
                                      {app.status === 'approved' ? '✓ تمّت الموافقة على هذا الطلب' : '✕ تمّ رفض هذا الطلب'}
                                    </div>
                                  )}

                                  {/* Action buttons for pending */}
                                  {app.status === 'pending' && (
                                    <div className="flex gap-2 mt-1">
                                      <Button size="sm"
                                        onClick={() => updateAppStatus(app.id, 'approved')}
                                        className="flex-1 h-8 text-xs font-bold gap-1 rounded-xl"
                                        style={{ background: '#22c55e' }}>
                                        <CheckCircle2 className="w-3.5 h-3.5" /> قبول
                                      </Button>
                                      <Button size="sm" variant="outline"
                                        onClick={() => {
                                          setRejectingApp(app);
                                          setRejectUserId('');
                                          setRejectNotifTitle('بشأن طلب عضويتك في LiraPro');
                                          setRejectNotifBody(`نأسف لإعلامك بأن طلب عضوية "${app.businessName}" لم يتم قبوله في الوقت الحالي. يمكنك التواصل معنا لمزيد من المعلومات أو إعادة تقديم الطلب لاحقاً.`);
                                          setRejectMsg('');
                                        }}
                                        className="flex-1 h-8 text-xs font-bold gap-1 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10">
                                        <XCircle className="w-3.5 h-3.5" /> رفض
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      );
                    })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: ANALYTICS
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <motion.div key="analytics" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-4">

              {/* Header */}
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  <BarChart2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-black text-sm">تحليلات المنصة</h3>
                  <p className="text-[10px] text-muted-foreground">نظرة شاملة على أداء LiraPro</p>
                </div>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'إجمالي المستخدمين', value: stats?.totalUsers ?? 0, icon: Users, color: '#003C32', sub: `${stats?.privateUsers ?? 0} شخصي · ${stats?.providers ?? 0} مزود` },
                  { label: 'التجار المسجلون', value: vendors.length, icon: Building2, color: '#7C3AED', sub: `${vendors.filter(v => v.isActive !== false).length} نشط` },
                  { label: 'زيارات اليوم', value: stats?.todayVisits ?? 0, icon: Eye, color: '#D20073', sub: `الإجمالي: ${stats?.totalVisits ?? 0}` },
                  { label: 'محظورون', value: stats?.bannedUsers ?? 0, icon: Ban, color: '#ef4444', sub: `${((stats?.bannedUsers ?? 0) / Math.max(stats?.totalUsers ?? 1, 1) * 100).toFixed(1)}% من الكل` },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl border border-border p-3 bg-card flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-bold">{item.label}</span>
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${item.color}22` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                        </div>
                      </div>
                      <p className="text-2xl font-black" style={{ color: item.color }}>{item.value.toLocaleString('ar-SA')}</p>
                      <p className="text-[9px] text-muted-foreground">{item.sub}</p>
                    </div>
                  );
                })}
              </div>

              {/* Users breakdown donut-like bar */}
              <div className="rounded-2xl border border-border p-4 bg-card flex flex-col gap-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <h4 className="text-xs font-black">توزيع المستخدمين</h4>
                </div>
                {(() => {
                  const total = Math.max(stats?.totalUsers ?? 0, 1);
                  const segments = [
                    { label: 'شخصي', val: stats?.privateUsers ?? 0, color: '#003C32' },
                    { label: 'مزودو خدمات', val: stats?.providers ?? 0, color: '#D20073' },
                    { label: 'محظورون', val: stats?.bannedUsers ?? 0, color: '#ef4444' },
                    { label: 'نشطون اليوم', val: stats?.activeUsers ?? 0, color: '#0284c7' },
                  ];
                  return (
                    <div className="flex flex-col gap-2">
                      {/* Stacked bar */}
                      <div className="flex h-3 rounded-full overflow-hidden gap-px">
                        {segments.map(s => (
                          <div key={s.label} style={{ flex: s.val / total, background: s.color, minWidth: s.val > 0 ? 4 : 0 }} />
                        ))}
                      </div>
                      {/* Legend */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {segments.map(s => (
                          <div key={s.label} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                            <span className="text-[10px] text-muted-foreground">{s.label}</span>
                            <span className="text-[10px] font-black mr-auto">{s.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Vendors by category */}
              <div className="rounded-2xl border border-border p-4 bg-card flex flex-col gap-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <h4 className="text-xs font-black">التجار حسب الفئة</h4>
                  <span className="mr-auto text-[10px] text-muted-foreground">{vendors.length} تاجر</span>
                </div>
                {(() => {
                  const catCounts: Record<string, number> = {};
                  vendors.forEach(v => { catCounts[v.category] = (catCounts[v.category] ?? 0) + 1; });
                  const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
                  const maxVal = Math.max(...sorted.map(s => s[1]), 1);
                  const CAT_COLORS = ['#003C32', '#D20073', '#7C3AED', '#0284c7', '#ea580c', '#ca8a04', '#16a34a', '#dc2626'];
                  return sorted.length === 0
                    ? <p className="text-xs text-muted-foreground text-center py-4">لا يوجد تجار بعد</p>
                    : (
                      <div className="flex flex-col gap-2">
                        {sorted.map(([cat, count], i) => (
                          <div key={cat} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-24 truncate text-right flex-shrink-0">
                              {VENDOR_CATEGORIES_AR[cat] ?? cat}
                            </span>
                            <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxVal) * 100}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} />
                            </div>
                            <span className="text-[10px] font-black w-5 text-left flex-shrink-0">{count}</span>
                          </div>
                        ))}
                      </div>
                    );
                })()}
              </div>

              {/* Trust score distribution */}
              <div className="rounded-2xl border border-border p-4 bg-card flex flex-col gap-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <h4 className="text-xs font-black">توزيع درجة الثقة للتجار</h4>
                </div>
                {(() => {
                  if (vendors.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">لا يوجد تجار بعد</p>;
                  const buckets = [
                    { label: '0-25', min: 0, max: 25, color: '#ef4444' },
                    { label: '26-50', min: 26, max: 50, color: '#f97316' },
                    { label: '51-75', min: 51, max: 75, color: '#eab308' },
                    { label: '76-100', min: 76, max: 100, color: '#22c55e' },
                  ];
                  const counts = buckets.map(b => vendors.filter(v => (v.trustScore ?? 50) >= b.min && (v.trustScore ?? 50) <= b.max).length);
                  const maxC = Math.max(...counts, 1);
                  const avg = vendors.length > 0 ? (vendors.reduce((a, v) => a + (v.trustScore ?? 50), 0) / vendors.length).toFixed(0) : '—';
                  return (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-end gap-2 h-16">
                        {buckets.map((b, i) => (
                          <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] font-black" style={{ color: b.color }}>{counts[i]}</span>
                            <div className="w-full rounded-t-lg transition-all" style={{ height: Math.max(4, (counts[i] / maxC) * 44), background: b.color, opacity: 0.8 }} />
                            <span className="text-[8px] text-muted-foreground">{b.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-1 pt-1 border-t border-border">
                        <Star className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] text-muted-foreground">متوسط الثقة:</span>
                        <span className="text-xs font-black text-amber-500">{avg}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Vendor applications funnel */}
              <div className="rounded-2xl border border-border p-4 bg-card flex flex-col gap-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileX className="w-3.5 h-3.5 text-primary" />
                  <h4 className="text-xs font-black">طلبات الانضمام كتاجر</h4>
                </div>
                {(() => {
                  const total = vendorApplications.length;
                  const pending = vendorApplications.filter(a => a.status === 'pending').length;
                  const approved = vendorApplications.filter(a => a.status === 'approved').length;
                  const rejected = vendorApplications.filter(a => a.status === 'rejected').length;
                  const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(0) : '0';
                  const stages = [
                    { label: 'إجمالي الطلبات', val: total, color: '#0284c7', icon: FileX },
                    { label: 'قيد الانتظار', val: pending, color: '#f59e0b', icon: Clock },
                    { label: 'مقبول', val: approved, color: '#22c55e', icon: CheckCircle2 },
                    { label: 'مرفوض', val: rejected, color: '#ef4444', icon: XCircle },
                  ];
                  return (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-4 gap-2">
                        {stages.map(s => {
                          const Icon = s.icon;
                          return (
                            <div key={s.label} className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: `${s.color}15` }}>
                              <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                              <span className="text-base font-black" style={{ color: s.color }}>{s.val}</span>
                              <span className="text-[8px] text-muted-foreground text-center leading-tight">{s.label}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-center gap-1 pt-1 border-t border-border">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-[10px] text-muted-foreground">معدل القبول:</span>
                        <span className="text-xs font-black text-green-500">{approvalRate}%</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Live Activity Feed */}
              <div className="rounded-2xl border border-border p-4 bg-card flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-green-500" />
                  <h4 className="text-xs font-black">تنبيهات النشاط المباشر</h4>
                  <span className="mr-auto flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] text-green-500 font-bold">مباشر</span>
                  </span>
                </div>
                {(() => {
                  type ActivityEvent = { id: string; type: 'user_reg' | 'vendor_join' | 'app_submit' | 'app_approve' | 'app_reject' | 'ban' | 'price_update'; label: string; sub: string; ts: number; color: string; icon: React.ElementType };
                  const events: ActivityEvent[] = [];
                  const now = Date.now();
                  const DAY7 = 7 * 24 * 3600000;
                  // New user registrations (last 7 days)
                  users.filter(u => now - new Date(u.registeredAt).getTime() < DAY7).forEach(u => {
                    events.push({ id: `reg-${u.id}`, type: 'user_reg', label: 'مستخدم جديد', sub: u.fullName || u.walletId || 'غير معروف', ts: new Date(u.registeredAt).getTime(), color: '#003C32', icon: User });
                  });
                  // Vendor applications (last 30 days)
                  vendorApplications.forEach(a => {
                    const ts = new Date(a.createdAt).getTime();
                    if (now - ts < 30 * 24 * 3600000) {
                      if (a.status === 'pending') events.push({ id: `app-p-${a.id}`, type: 'app_submit', label: 'طلب انضمام جديد', sub: a.businessName || a.fullName, ts, color: '#f59e0b', icon: ClipboardList });
                      else if (a.status === 'approved') events.push({ id: `app-a-${a.id}`, type: 'app_approve', label: 'طلب انضمام مقبول', sub: a.businessName || a.fullName, ts, color: '#22c55e', icon: ClipboardCheck });
                      else if (a.status === 'rejected') events.push({ id: `app-r-${a.id}`, type: 'app_reject', label: 'طلب انضمام مرفوض', sub: a.businessName || a.fullName, ts, color: '#ef4444', icon: XCircle });
                    }
                  });
                  // Vendor joins
                  vendors.filter(v => now - new Date(v.createdAt ?? '').getTime() < DAY7 * 2).forEach(v => {
                    if (!v.createdAt) return;
                    events.push({ id: `vnd-${v.id}`, type: 'vendor_join', label: 'تاجر جديد', sub: v.businessName, ts: new Date(v.createdAt).getTime(), color: '#7C3AED', icon: Store });
                  });
                  // Bans
                  users.filter(u => u.banned && u.bannedAt).forEach(u => {
                    const ts = new Date(u.bannedAt!).getTime();
                    if (now - ts < DAY7 * 4) events.push({ id: `ban-${u.id}`, type: 'ban', label: 'تم حظر مستخدم', sub: u.fullName || u.walletId || '', ts, color: '#ef4444', icon: Ban });
                  });
                  // Sort by newest first, take 20
                  const sorted = events.sort((a, b) => b.ts - a.ts).slice(0, 20);
                  const relTime = (ts: number) => {
                    const diff = now - ts;
                    if (diff < 60000) return 'الآن';
                    if (diff < 3600000) return `${Math.floor(diff / 60000)} د`;
                    if (diff < 86400000) return `${Math.floor(diff / 3600000)} س`;
                    return `${Math.floor(diff / 86400000)} ي`;
                  };
                  if (sorted.length === 0) return (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                        <Inbox className="w-5 h-5 text-muted-foreground opacity-50" />
                      </div>
                      <p className="text-xs text-muted-foreground">لا يوجد نشاط مؤخراً</p>
                    </div>
                  );
                  return (
                    <div className="flex flex-col divide-y divide-border/50">
                      {sorted.map((ev, i) => {
                        const EvIcon = ev.icon;
                        return (
                        <div key={ev.id} className={`flex items-center gap-2.5 py-2 ${i === 0 ? '' : ''}`}>
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${ev.color}18` }}>
                            <EvIcon className="w-3.5 h-3.5" style={{ color: ev.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black leading-tight" style={{ color: ev.color }}>{ev.label}</p>
                            <p className="text-[9px] text-muted-foreground truncate">{ev.sub}</p>
                          </div>
                          <span className="text-[9px] text-muted-foreground flex-shrink-0 font-mono">{relTime(ev.ts)}</span>
                        </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Recent registrations sparkline */}
              <div className="rounded-2xl border border-border p-4 bg-card flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  <h4 className="text-xs font-black">تسجيل المستخدمين — آخر 14 يوم</h4>
                </div>
                {(() => {
                  if (users.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">لا بيانات</p>;
                  const now = Date.now();
                  const DAY = 86400000;
                  const DAYS = 14;
                  const buckets = Array.from({ length: DAYS }, (_, i) => {
                    const dayStart = now - (DAYS - 1 - i) * DAY;
                    const dayEnd = dayStart + DAY;
                    return users.filter(u => {
                      const t = new Date(u.registeredAt).getTime();
                      return t >= dayStart && t < dayEnd;
                    }).length;
                  });
                  const maxVal = Math.max(...buckets, 1);
                  const W = 280; const H = 50; const PAD = 4;
                  const step = (W - PAD * 2) / (DAYS - 1);
                  const pts = buckets.map((v, i) => ({ x: PAD + i * step, y: H - PAD - ((v / maxVal) * (H - PAD * 2)) }));
                  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                  const areaD = `${pathD} L${pts[pts.length-1].x.toFixed(1)},${H} L${PAD},${H} Z`;
                  const totalNew = buckets.reduce((a, b) => a + b, 0);
                  return (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">مستخدم جديد خلال 14 يوم</span>
                        <span className="text-sm font-black text-primary">{totalNew}</span>
                      </div>
                      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 50 }}>
                        <defs>
                          <linearGradient id="reg-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <path d={areaD} fill="url(#reg-grad)" />
                        <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map((p, i) => buckets[i] > 0 && <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--primary)" opacity="0.9" />)}
                      </svg>
                      <div className="flex justify-between text-[8px] text-muted-foreground/60">
                        <span>قبل 14 يوم</span><span>اليوم</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: SUSPICIOUS PRICES
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'suspicious' && (
            <motion.div key="suspicious" variants={tabVariants} initial="hidden" animate="visible" exit="exit"
              className="flex flex-col gap-4">

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    أسعار مشبوهة
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">أسعار تنحرف بشكل كبير عن المتوسط</p>
                </div>
                <button
                  onClick={async () => {
                    setSuspiciousLoading(true);
                    try {
                      const token = sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
                      const res = await fetch('/api/market/prices', { headers: { 'x-admin-token': token } });
                      if (!res.ok) throw new Error('failed');
                      const data: Array<{id:number;vendorId:number;businessName:string;product:string;category:string;price:number|null;priceBuy:number|null;priceSell:number|null}> = await res.json();

                      // Group by product
                      const productMap: Record<string, typeof data> = {};
                      for (const row of data) {
                        const key = `${row.category}::${row.product}`;
                        if (!productMap[key]) productMap[key] = [];
                        productMap[key].push(row);
                      }

                      const suspicious: typeof suspiciousPrices = [];
                      for (const [, rows] of Object.entries(productMap)) {
                        if (rows.length < 3) continue;
                        const prices = rows.map(r => r.priceSell ?? r.price ?? r.priceBuy ?? 0).filter(p => p > 0);
                        if (prices.length < 3) continue;
                        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
                        const std = Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length);
                        if (std === 0) continue;
                        for (const row of rows) {
                          const p = row.priceSell ?? row.price ?? row.priceBuy ?? 0;
                          if (p === 0) continue;
                          const z = Math.abs(p - mean) / std;
                          if (z >= 1.5) {
                            suspicious.push({ id: row.id, vendorId: row.vendorId, vendorName: row.businessName, product: row.product, category: row.category, price: p, refPrice: mean, deviation: p - mean, pct: Math.round((p / mean - 1) * 100) });
                          }
                        }
                      }
                      setSuspiciousPrices(suspicious);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setSuspiciousLoading(false);
                    }
                  }}
                  className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  {suspiciousLoading
                    ? <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                    : <RefreshCw className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>

              {suspiciousPrices.length === 0 && !suspiciousLoading && (
                <Card className="border-border shadow-sm overflow-hidden">
                  <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-amber-400" />
                    </div>
                    <p className="text-sm font-bold text-foreground/70">اضغط على زر التحديث لفحص الأسعار</p>
                    <p className="text-xs text-muted-foreground">سيتم رصد الأسعار التي تنحرف عن المتوسط بأكثر من 1.5 انحراف معياري</p>
                  </CardContent>
                </Card>
              )}

              {suspiciousPrices.filter(p => !suspiciousReviewed.has(p.id)).length === 0 && suspiciousPrices.length > 0 && (
                <Card className="border-green-200 dark:border-green-800/40 shadow-sm overflow-hidden">
                  <CardContent className="p-6 flex flex-col items-center gap-2 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">لا توجد أسعار مشبوهة</p>
                    <p className="text-xs text-muted-foreground">جميع الأسعار المفحوصة ضمن النطاق الطبيعي</p>
                  </CardContent>
                </Card>
              )}

              {/* ── User Reports from Market ── */}
              {(() => {
                try {
                  const reports: Array<{ businessName: string; reason: string; timestamp: number }> =
                    JSON.parse(localStorage.getItem('syp-vendor-report-list') ?? '[]');
                  if (!reports.length) return null;
                  return (
                    <Card className="border-red-200 dark:border-red-800/40 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(90deg,#ef444418,#f8717108)' }}>
                        <Flag className="w-3.5 h-3.5 text-red-500" />
                        <span className="font-bold text-xs text-red-700 dark:text-red-400">بلاغات المستخدمين ({reports.length})</span>
                        <button
                          className="mr-auto text-[9px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 transition-colors"
                          onClick={() => { localStorage.removeItem('syp-vendor-report-list'); }}
                        >مسح الكل</button>
                      </div>
                      <CardContent className="p-0">
                        {[...reports].reverse().map((r, i) => (
                          <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-border/40 last:border-0">
                            <Flag className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{r.businessName}</p>
                              <p className="text-[10px] text-muted-foreground">{r.reason}</p>
                            </div>
                            <span className="text-[9px] text-muted-foreground/60 flex-shrink-0">
                              {new Date(r.timestamp).toLocaleDateString('ar-SY', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                } catch { return null; }
              })()}

              {suspiciousPrices.filter(p => !suspiciousReviewed.has(p.id)).map(sp => (
                <Card key={sp.id} className="border-amber-200 dark:border-amber-800/40 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-2"
                    style={{ background: 'linear-gradient(90deg, #f59e0b18, #fbbf2408)' }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold text-xs text-amber-700 dark:text-amber-400 truncate">{sp.product}</span>
                    <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold mr-auto flex-shrink-0">
                      {sp.pct > 0 ? `+${sp.pct}%` : `${sp.pct}%`}
                    </span>
                  </div>
                  <CardContent className="p-3 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-secondary/40 rounded-xl p-2.5">
                        <p className="text-[9px] text-muted-foreground mb-1">المورّد</p>
                        <p className="font-bold truncate">{sp.vendorName}</p>
                      </div>
                      <div className="bg-secondary/40 rounded-xl p-2.5">
                        <p className="text-[9px] text-muted-foreground mb-1">الفئة</p>
                        <p className="font-bold">{VENDOR_CATEGORIES_AR[sp.category] ?? sp.category}</p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5">
                        <p className="text-[9px] text-muted-foreground mb-1">السعر المرصود</p>
                        <p className="font-black text-amber-600" dir="ltr">{sp.price.toLocaleString()}</p>
                      </div>
                      <div className="bg-secondary/40 rounded-xl p-2.5">
                        <p className="text-[9px] text-muted-foreground mb-1">متوسط السوق</p>
                        <p className="font-black" dir="ltr">{Math.round(sp.refPrice).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Button size="sm" variant="outline"
                        className="flex-1 h-8 text-xs text-green-700 border-green-300 gap-1 hover:bg-green-50"
                        onClick={() => {
                          const next = new Set(suspiciousReviewed);
                          next.add(sp.id);
                          setSuspiciousReviewed(next);
                          localStorage.setItem('syp-suspicious-reviewed', JSON.stringify([...next]));
                        }}>
                        <Check className="w-3 h-3" /> تجاهل
                      </Button>
                      <Button size="sm"
                        className="flex-1 h-8 text-xs gap-1 bg-red-500 hover:bg-red-600 text-white"
                        onClick={async () => {
                          const token = sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
                          await fetch(`/api/admin/prices/${sp.id}`, {
                            method: 'DELETE',
                            headers: { 'x-admin-token': token },
                          });
                          const next = new Set(suspiciousReviewed);
                          next.add(sp.id);
                          setSuspiciousReviewed(next);
                          localStorage.setItem('syp-suspicious-reviewed', JSON.stringify([...next]));
                        }}>
                        <Trash2 className="w-3 h-3" /> حذف السعر
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Send Message Form */}
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    إرسال رسالة مباشرة
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col gap-3">
                  {/* User search */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">البحث عن المستخدم</label>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input type="text" value={msgUserSearch}
                        onChange={e => { setMsgUserSearch(e.target.value); setMsgSelectedUser(null); }}
                        placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                        className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" dir="rtl"
                      />
                    </div>
                    {msgUserSearch.trim() && !msgSelectedUser && (
                      <div className="mt-1 border border-border rounded-lg bg-card max-h-40 overflow-y-auto divide-y divide-border shadow-md z-10 relative">
                        {users.filter(u => [u.fullName ?? '', u.email ?? ''].join(' ').toLowerCase().includes(msgUserSearch.toLowerCase())).slice(0, 8).map(u => (
                          <button key={u.walletId} className="w-full text-right px-3 py-2 hover:bg-accent/30 transition-colors text-sm flex items-center gap-2"
                            onClick={() => { setMsgSelectedUser(u); setMsgUserSearch(u.fullName ?? u.email ?? ''); }}>
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{u.fullName ?? '—'}</span>
                            <span className="text-xs text-muted-foreground mr-auto">{u.email}</span>
                          </button>
                        ))}
                        {users.filter(u => [u.fullName ?? '', u.email ?? ''].join(' ').toLowerCase().includes(msgUserSearch.toLowerCase())).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">لا توجد نتائج</p>
                        )}
                      </div>
                    )}
                    {msgSelectedUser && (
                      <div className="mt-1 flex items-center gap-2 text-xs bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span className="font-medium">{msgSelectedUser.fullName ?? '—'}</span>
                        <span className="text-muted-foreground">{msgSelectedUser.email}</span>
                        <button onClick={() => { setMsgSelectedUser(null); setMsgUserSearch(''); }} className="mr-auto text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Title */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">عنوان الرسالة</label>
                    <input type="text" value={msgTitle} onChange={e => setMsgTitle(e.target.value)}
                      placeholder="عنوان الرسالة..." maxLength={80}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" dir="rtl"
                    />
                  </div>
                  {/* Body */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">نص الرسالة</label>
                    <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)}
                      placeholder="اكتب نص الرسالة هنا..." rows={4} maxLength={500}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none" dir="rtl"
                    />
                  </div>
                  {msgSent && <p className="text-xs text-green-600 dark:text-green-400 font-medium">{msgSent}</p>}
                  <Button onClick={sendDirectMessage} disabled={msgSending || !msgSelectedUser || !msgTitle.trim() || !msgBody.trim()} className="w-full">
                    {msgSending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><Send className="w-4 h-4" /> إرسال</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Sent Messages History */}
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-primary" />
                      الرسائل المُرسلة ({localSentMsgs.length})
                    </CardTitle>
                    {localSentMsgs.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => {
                        if (confirm('هل تريد حذف كل سجل الرسائل؟')) {
                          setLocalSentMsgs([]);
                          try { localStorage.removeItem('admin-sent-msgs'); } catch { /**/ }
                        }
                      }} className="h-7 px-2 text-xs text-destructive hover:text-destructive">
                        <Trash2 className="w-3 h-3 ml-1" /> حذف الكل
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {localSentMsgs.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">لم يتم إرسال أي رسائل بعد</p>
                  ) : (
                    <div className="divide-y divide-border max-h-96 overflow-y-auto">
                      {localSentMsgs.map(m => (
                        <div key={m.id} className="px-4 py-3 flex items-start gap-3 text-sm">
                          <MessageSquare className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{m.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.body}</p>
                            <p className="text-xs text-muted-foreground/50 mt-1">{new Date(m.created_at).toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <button onClick={() => deleteSentMsg(m.id)}
                            className="p-1 hover:bg-destructive/10 rounded-lg transition-colors shrink-0 mt-0.5"
                            title="حذف الرسالة">
                            <Trash2 className="w-3.5 h-3.5 text-destructive/60 hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════
          VENDOR DETAIL DRAWER
      ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {vendorDetail && vendorDetailEdit && (
          <motion.div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setVendorDetail(null)}>
            <motion.div
              className="w-full max-w-md bg-card rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="sticky top-0 bg-card px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: vendorDetailEdit.isActive ? '#003C3218' : '#ef444418' }}>
                    <Building2 className="w-4 h-4" style={{ color: vendorDetailEdit.isActive ? '#003C32' : '#ef4444' }} />
                  </div>
                  <div>
                    <p className="font-black text-sm">{vendorDetail.businessName}</p>
                    <p className="text-[10px] text-muted-foreground">{VENDOR_CATEGORIES_AR[vendorDetail.category] ?? vendorDetail.category}</p>
                  </div>
                </div>
                <button onClick={() => setVendorDetail(null)} className="p-1.5 hover:bg-secondary rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto p-4 flex flex-col gap-3" dir="rtl">

                {/* Super ID / Full Account Info */}
                {(() => {
                  const vUser = users.find(u => u.supabaseId === vendorDetail.supabaseId);
                  const Row = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) =>
                    value ? (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{label}</span>
                        <span className={`text-[10px] font-bold text-right max-w-[55%] break-all leading-snug ${mono ? 'font-mono text-primary text-[9px]' : ''}`} dir={mono ? 'ltr' : undefined}>{value}</span>
                      </div>
                    ) : null;
                  return (
                    <div className="rounded-2xl border border-border bg-secondary/30 overflow-hidden">
                      {/* Super ID header */}
                      <div className="px-3 py-2 bg-primary/8 border-b border-border/50 flex items-center justify-between">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">معلومات الحساب</p>
                        <span className="text-[9px] font-black text-primary px-2 py-0.5 rounded-full bg-primary/10">Super ID</span>
                      </div>
                      <div className="p-3 flex flex-col gap-1.5">
                        {/* Super ID value */}
                        <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-border/40">
                          <span className="text-[10px] text-muted-foreground">Super ID</span>
                          <span className="text-[9px] font-mono font-bold text-primary break-all text-right" dir="ltr">{vUser?.walletId ?? vendorDetail.supabaseId ?? '—'}</span>
                        </div>
                        {/* Vendor / business info */}
                        <Row label="اسم النشاط" value={vendorDetail.businessName} />
                        <Row label="المالك / المسؤول" value={vendorDetail.fullName || vUser?.fullName} />
                        {vUser?.fatherName && <Row label="اسم الأب" value={vUser.fatherName} />}
                        <Row label="الفئة" value={VENDOR_CATEGORIES_AR[vendorDetail.category] ?? vendorDetail.category} />
                        {/* Contact */}
                        <Row label="الهاتف" value={vendorDetail.phone || vUser?.phone} mono />
                        <Row label="البريد" value={vendorDetail.email || vUser?.email} mono />
                        {/* Location */}
                        <Row label="المحافظة" value={vendorDetail.governorate || vUser?.province} />
                        <Row label="المدينة" value={vendorDetail.city || vUser?.city} />
                        {(vendorDetail.address || vUser?.address) && <Row label="العنوان" value={vendorDetail.address || vUser?.address} />}
                        {/* Personal (from linked user profile) */}
                        {vUser?.gender && <Row label="الجنس" value={vUser.gender === 'male' ? 'ذكر' : vUser.gender === 'female' ? 'أنثى' : vUser.gender} />}
                        {vUser?.dob && <Row label="تاريخ الميلاد" value={vUser.dob} mono />}
                        {vUser?.accountType && <Row label="نوع الحساب" value={vUser.accountType === 'private' ? 'شخصي' : 'تجاري'} />}
                        {/* Dates */}
                        <Row label="تاريخ الانضمام" value={new Date(vendorDetail.createdAt).toLocaleDateString('ar-SY')} />
                        {vUser?.lastSeen && <Row label="آخر نشاط" value={new Date(vUser.lastSeen).toLocaleDateString('ar-SY')} />}
                      </div>
                    </div>
                  );
                })()}

                {/* Ban / Unban toggle */}
                <div className={`flex items-center justify-between p-3 rounded-2xl border ${vendorDetailEdit.isActive ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}>
                  <span className={`text-xs font-bold ${vendorDetailEdit.isActive ? 'text-green-700' : 'text-red-600'}`}>
                    {vendorDetailEdit.isActive ? 'الحساب نشط' : 'الحساب موقوف'}
                  </span>
                  <button
                    onClick={() => vendorDetailEdit.isActive ? setVendorBanConfirm(true) : toggleVendorBan()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${vendorDetailEdit.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                    {vendorDetailEdit.isActive
                      ? <><UserX className="w-3.5 h-3.5" /> إيقاف / حظر</>
                      : <><CheckCircle2 className="w-3.5 h-3.5" /> تفعيل الحساب</>}
                  </button>
                </div>

                {/* Legendary Glow Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2">
                    <GoldenBadge size={18} showGlow={legendaryVendors.has(vendorDetail.id)} />
                    <div>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        {legendaryVendors.has(vendorDetail.id) ? 'شارة Legendary مفعّلة ✦' : 'شارة عادية'}
                      </p>
                      <p className="text-[9px] text-amber-600/70 dark:text-amber-500/60">توهج ذهبي نابض</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleLegendaryVendor(vendorDetail.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      legendaryVendors.has(vendorDetail.id)
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    {legendaryVendors.has(vendorDetail.id) ? 'إلغاء Legendary' : 'تفعيل Legendary'}
                  </button>
                </div>

                {/* Golden Verified Badge Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-300 dark:border-amber-600/40 bg-amber-50/80 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2">
                    <GoldenBadge size={18} showGlow={verifiedVendors.has(vendorDetail.id)} />
                    <div>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        {verifiedVendors.has(vendorDetail.id) ? 'شارة التوثيق الذهبية مفعّلة ✓' : 'شارة التوثيق معطّلة'}
                      </p>
                      <p className="text-[9px] text-amber-600/70 dark:text-amber-500/60">تظهر جانب اسم التاجر</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleVerifiedVendor(vendorDetail.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      verifiedVendors.has(vendorDetail.id)
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {verifiedVendors.has(vendorDetail.id) ? 'إزالة التوثيق' : 'إضافة التوثيق'}
                  </button>
                </div>

                {/* البيانات الشخصية للتاجر — card button */}
                <button
                  onClick={() => { setVendorPersonalDataOpen(true); setVendorPersonalDataEditing(false); }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors active:scale-[.99]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black">البيانات الشخصية للتاجر</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{vendorDetailEdit.businessName || '—'} · {vendorDetailEdit.governorate || '—'}</p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground rotate-[-90deg]" />
                </button>

                {/* Trust Score */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-muted-foreground">نسبة الموثوقية</label>
                    <span className="text-xs font-black text-amber-600">{vendorDetailEdit.trustScore}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${vendorDetailEdit.trustScore}%` }} />
                  </div>
                  <input type="range" min="10" max="100" step="5"
                    value={vendorDetailEdit.trustScore}
                    onChange={e => setVendorDetailEdit(ed => ed ? { ...ed, trustScore: Number(e.target.value) } : ed)}
                    className="w-full accent-amber-500" />
                </div>

                {/* Vendor Prices */}
                {(vendorPricesLoading || vendorDetailPrices.length > 0) && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-muted-foreground">الأسعار المرفوعة</p>
                      {vendorPricesLoading && <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                    </div>
                    {vendorDetailPrices.map(p => (
                      <div key={p.id} className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${p.isActive ? 'bg-secondary/60' : 'bg-secondary/30 opacity-60'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{p.product}</p>
                          <p className="text-[9px] text-muted-foreground">{p.category}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {p.priceBuy != null && <span className="text-green-600 font-bold text-[10px]">{p.priceBuy.toLocaleString()}<span className="text-[8px]">ش</span></span>}
                          {p.priceSell != null && <span className="text-red-500 font-bold text-[10px]">{p.priceSell.toLocaleString()}<span className="text-[8px]">ب</span></span>}
                          {p.priceBuy == null && p.priceSell == null && p.price != null && <span className="text-primary font-bold text-[10px]">{p.price.toLocaleString()}</span>}
                          {p.unit && <span className="text-muted-foreground text-[9px]">/{p.unit}</span>}
                          {/* Toggle active */}
                          <button
                            className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${p.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} transition-colors`}
                            title={p.isActive ? 'إخفاء' : 'إظهار'}
                            onClick={async () => {
                              const token = sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
                              await fetch(`/api/admin/prices/${p.id}`, {
                                method: 'PATCH',
                                headers: { 'content-type': 'application/json', 'x-admin-token': token },
                                body: JSON.stringify({ isActive: !p.isActive }),
                              });
                              queryClient.setQueryData<unknown[]>(['admin-vendor-prices', vendorDetail?.supabaseId, token], prev => (prev ?? []).map(x => (x as Record<string, unknown>)['id'] === p.id ? { ...(x as object), isActive: !p.isActive } : x));
                            }}>
                            {p.isActive ? 'نشط' : 'مخفي'}
                          </button>
                          {/* Delete */}
                          <button
                            className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 transition-colors"
                            title="حذف السعر"
                            onClick={() => openConfirm({
                              title: 'حذف السعر',
                              body: 'هل أنت متأكد من حذف هذا السعر؟',
                              destructive: true,
                              confirmLabel: 'حذف',
                              onConfirm: async () => {
                                const tok = sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
                                await fetch(`/api/admin/prices/${p.id}`, {
                                  method: 'DELETE',
                                  headers: { 'x-admin-token': tok },
                                });
                                queryClient.setQueryData<unknown[]>(['admin-vendor-prices', vendorDetail?.supabaseId, token], prev => (prev ?? []).filter(x => (x as Record<string, unknown>)['id'] !== p.id));
                              },
                            })}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Vendor Activity Sparkline */}
                {vendorDetailPrices.length > 0 && (() => {
                  const now = Date.now();
                  const DAY = 86400000;
                  const DAYS = 14;
                  // Count updates per day bucket (last 14 days)
                  const buckets = Array.from({ length: DAYS }, (_, i) => {
                    const dayStart = now - (DAYS - 1 - i) * DAY;
                    const dayEnd = dayStart + DAY;
                    return vendorDetailPrices.filter(p => {
                      const t = new Date(p.updatedAt).getTime();
                      return t >= dayStart && t < dayEnd;
                    }).length;
                  });
                  const maxVal = Math.max(...buckets, 1);
                  const W = 260; const H = 44; const PAD = 4;
                  const step = (W - PAD * 2) / (DAYS - 1);
                  const pts = buckets.map((v, i) => ({
                    x: PAD + i * step,
                    y: H - PAD - ((v / maxVal) * (H - PAD * 2)),
                  }));
                  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                  const areaD = `${pathD} L${pts[pts.length-1].x.toFixed(1)},${H} L${PAD},${H} Z`;
                  const totalUpdates = buckets.reduce((a, b) => a + b, 0);
                  const activeDays = buckets.filter(b => b > 0).length;
                  return (
                    <div className="flex flex-col gap-2 p-3 rounded-2xl border border-border bg-secondary/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-primary" />
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">نشاط التاجر</p>
                        </div>
                        <span className="text-[9px] text-muted-foreground">آخر 14 يوم</span>
                      </div>
                      <div className="flex items-end gap-3">
                        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flex: 1 }}>
                          <defs>
                            <linearGradient id={`act-grad-${vendorDetail.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
                              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                          <path d={areaD} fill={`url(#act-grad-${vendorDetail.id})`} />
                          <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          {pts.map((p, i) => buckets[i] > 0 && (
                            <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--primary)" opacity="0.85" />
                          ))}
                        </svg>
                        <div className="flex flex-col gap-1 text-left flex-shrink-0 pb-1">
                          <div className="text-center">
                            <p className="text-sm font-black text-primary leading-none">{totalUpdates}</p>
                            <p className="text-[8px] text-muted-foreground">تحديث</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-black leading-none">{activeDays}</p>
                            <p className="text-[8px] text-muted-foreground">يوم نشط</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 justify-between">
                        {buckets.map((v, i) => (
                          <div key={i} className="flex flex-col items-center gap-0.5" style={{ flex: 1 }}>
                            <div
                              className="w-full rounded-sm transition-all"
                              style={{
                                height: Math.max(2, (v / maxVal) * 16),
                                background: v > 0 ? 'var(--primary)' : 'var(--border)',
                                opacity: v > 0 ? 0.7 + 0.3 * (v / maxVal) : 0.3,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-[8px] text-muted-foreground/60 px-0.5">
                        <span>قبل 14 يوم</span>
                        <span>اليوم</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Supabase ID (editable) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Supabase ID</label>
                  <input
                    type="text" dir="ltr"
                    value={vendorDetailEdit.supabaseId ?? ''}
                    onChange={e => setVendorDetailEdit(v => v ? {...v, supabaseId: e.target.value } : v)}
                    className="border border-border rounded-xl px-3 py-2 text-xs font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="user_..."
                  />
                </div>

                {/* Restrict section */}
                <div className="flex flex-col gap-2 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400">تقييد الحساب مؤقتاً</span>
                  </div>
                  <div className="flex gap-2">
                    <input type="number" min="1" max="365" placeholder="عدد الأيام"
                      value={vendorRestrictDays}
                      onChange={e => setVendorRestrictDays(e.target.value)}
                      className="flex-1 border border-border rounded-xl px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    />
                  </div>
                  <input type="text" placeholder="سبب التقييد (اختياري)"
                    value={vendorRestrictMsg}
                    onChange={e => setVendorRestrictMsg(e.target.value)}
                    className="border border-border rounded-xl px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                  <button
                    onClick={async () => {
                      const walletId = users.find(u => u.supabaseId === vendorDetailEdit?.supabaseId)?.walletId;
                      const days = parseInt(vendorRestrictDays);
                      if (walletId && days > 0) {
                        await fetch(`/api/admin/users/${walletId}/restrict`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token ?? '' },
                          body: JSON.stringify({ reason: vendorRestrictMsg || `تقييد حساب ${vendorDetailEdit?.businessName}`, days }),
                        }).catch(() => {});
                      }
                      setActionNotif({
                        visible: true, walletId, targetName: vendorDetailEdit?.businessName,
                        title: `تم تقييد حسابك لمدة ${vendorRestrictDays} يوم`,
                        body: vendorRestrictMsg || `تم تقييد حساب ${vendorDetailEdit?.businessName} مؤقتاً لمدة ${vendorRestrictDays} يوماً من قِبَل إدارة المنصة.`,
                        type: 'warning', sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
                        sending: false, msg: '',
                      });
                      setVendorRestrictDays('');
                      setVendorRestrictMsg('');
                    }}
                    disabled={!vendorRestrictDays}
                    className="h-9 rounded-xl bg-amber-500 text-white text-xs font-black disabled:opacity-40 flex items-center justify-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" /> تطبيق التقييد وإرسال إشعار
                  </button>
                </div>

                {/* Send custom notification */}
                <button
                  onClick={() => {
                    const walletId = users.find(u => u.supabaseId === vendorDetailEdit?.supabaseId)?.walletId;
                    setActionNotif({
                      visible: true, walletId, targetName: vendorDetailEdit?.businessName,
                      title: '', body: '', type: 'info',
                      sender: (badgeAssignedSender || 'LiraPro') as 'LiraPro' | 'فريق LiraPro',
                      sending: false, msg: '',
                    });
                  }}
                  className="h-9 rounded-xl border border-primary/30 text-primary text-xs font-black flex items-center justify-center gap-1.5 hover:bg-primary/5">
                  <Bell className="w-3.5 h-3.5" /> إرسال إشعار مخصص
                </button>

                {/* Ratings / Reports buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVendorDrawerPanel(p => p === 'ratings' ? 'edit' : 'ratings')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border text-xs font-bold transition-colors ${vendorDrawerPanel === 'ratings' ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700/50 dark:text-amber-400' : 'border-border text-foreground/70 hover:bg-secondary/60'}`}>
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    التقييمات ({(vendorRatings[vendorDetail.id] ?? []).length})
                  </button>
                  <button
                    onClick={() => setVendorDrawerPanel(p => p === 'reports' ? 'edit' : 'reports')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border text-xs font-bold transition-colors ${vendorDrawerPanel === 'reports' ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700/50 dark:text-red-400' : 'border-border text-foreground/70 hover:bg-secondary/60'}`}>
                    <Flag className="w-3.5 h-3.5 text-red-500" />
                    الإبلاغات ({(vendorReports[vendorDetail.id] ?? []).length})
                  </button>
                </div>

                {/* Ratings panel */}
                {vendorDrawerPanel === 'ratings' && (
                  <div className="flex flex-col gap-2 p-3 rounded-2xl border border-amber-200 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-900/10">
                    <p className="text-[10px] font-black text-amber-700 dark:text-amber-400">تقييمات التاجر</p>
                    {(vendorRatings[vendorDetail.id] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">لا توجد تقييمات حتى الآن</p>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                        {(vendorRatings[vendorDetail.id] ?? []).map(r => (
                          <div key={r.id} className="flex items-start gap-2 bg-background/70 rounded-xl p-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold">{r.userName}</span>
                                <span className="flex">{[1,2,3,4,5].map(s => <span key={s} className={`text-[10px] ${s <= r.rating ? 'text-amber-500' : 'text-muted-foreground/30'}`}>★</span>)}</span>
                                <span className="text-[9px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('ar-SY')}</span>
                              </div>
                              {r.comment && <p className="text-[10px] text-muted-foreground mt-0.5">{r.comment}</p>}
                            </div>
                            <button onClick={() => {
                              const next = { ...vendorRatings, [vendorDetail.id]: (vendorRatings[vendorDetail.id] ?? []).filter(x => x.id !== r.id) };
                              setVendorRatings(next); localStorage.setItem('syp-vendor-ratings', JSON.stringify(next));
                            }} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5 pt-1.5 border-t border-amber-200 dark:border-amber-700/40">
                      <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400">إضافة تقييم</p>
                      <input value={newRatingName} onChange={e => setNewRatingName(e.target.value)} placeholder="اسم المقيّم" className="border border-border rounded-xl px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                      <div className="flex gap-1">{[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setNewRatingStars(s)} className={`text-xl leading-none ${s <= newRatingStars ? 'text-amber-500' : 'text-muted-foreground/30'}`}>★</button>
                      ))}</div>
                      <input value={newRatingComment} onChange={e => setNewRatingComment(e.target.value)} placeholder="تعليق (اختياري)" className="border border-border rounded-xl px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                      <button onClick={() => {
                        if (!newRatingName.trim()) return;
                        const r: VendorRating = { id: Date.now().toString(), vendorId: vendorDetail.id, userName: newRatingName.trim(), rating: newRatingStars, comment: newRatingComment.trim(), createdAt: new Date().toISOString() };
                        const next = { ...vendorRatings, [vendorDetail.id]: [r, ...(vendorRatings[vendorDetail.id] ?? [])] };
                        setVendorRatings(next); localStorage.setItem('syp-vendor-ratings', JSON.stringify(next));
                        setNewRatingName(''); setNewRatingComment(''); setNewRatingStars(5);
                      }} disabled={!newRatingName.trim()} className="h-8 rounded-xl bg-amber-500 text-white text-xs font-bold disabled:opacity-40">إضافة التقييم</button>
                    </div>
                  </div>
                )}

                {/* Reports panel */}
                {vendorDrawerPanel === 'reports' && (
                  <div className="flex flex-col gap-2 p-3 rounded-2xl border border-red-200 dark:border-red-700/40 bg-red-50/60 dark:bg-red-900/10">
                    <p className="text-[10px] font-black text-red-700 dark:text-red-400">بلاغات ضد التاجر</p>
                    {(vendorReports[vendorDetail.id] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">لا توجد بلاغات</p>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                        {(vendorReports[vendorDetail.id] ?? []).map(r => (
                          <div key={r.id} className="flex items-start gap-2 bg-background/70 rounded-xl p-2">
                            <Flag className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold">{r.reporter}</span>
                                <span className="text-[9px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('ar-SY')}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{r.reason}</p>
                            </div>
                            <button onClick={() => {
                              const next = { ...vendorReports, [vendorDetail.id]: (vendorReports[vendorDetail.id] ?? []).filter(x => x.id !== r.id) };
                              setVendorReports(next); localStorage.setItem('syp-vendor-reports', JSON.stringify(next));
                            }} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Message */}
                {vendorDetailMsg && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`text-sm text-center font-bold ${!vendorDetailMsg.includes('فشل') && !vendorDetailMsg.includes('خطأ') ? 'text-green-600' : 'text-destructive'}`}>
                    {vendorDetailMsg}
                  </motion.p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button onClick={saveVendorDetail} disabled={vendorDetailSaving}
                    className="flex-1 h-11 font-black gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
                    {vendorDetailSaving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                      : <><CheckCircle2 className="w-4 h-4" /> حفظ التعديلات</>
                    }
                  </Button>
                  <button onClick={deleteVendorFromDetail}
                    className="h-11 px-4 rounded-2xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors flex items-center gap-1.5 text-sm font-bold">
                    <Trash2 className="w-4 h-4" /> حذف
                  </button>
                </div>

                <div className="pb-6" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ VENDOR BAN CONFIRMATION MODAL ═══ */}
      <AnimatePresence>
        {vendorBanConfirm && vendorDetail && vendorDetailEdit && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[310] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="w-full max-w-sm bg-background rounded-3xl shadow-2xl overflow-hidden" dir="rtl">
              <div className="bg-gradient-to-br from-red-500/10 to-rose-500/10 px-5 pt-5 pb-4 flex flex-col items-center gap-3 text-center border-b border-border">
                <div className="w-14 h-14 rounded-3xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Ban className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <p className="font-black text-base text-red-700 dark:text-red-400">تأكيد إيقاف / حظر التاجر</p>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    هل أنت متأكد من إيقاف حساب
                    <span className="font-black text-foreground"> {vendorDetail.businessName}</span>؟
                    <br />سيُحجب التاجر فوراً عن المنصة ولن يتمكن من رفع الأسعار.
                  </p>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-3 py-2.5 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">يمكن إعادة تفعيل الحساب لاحقاً من نفس هذا القسم.</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setVendorBanConfirm(false); toggleVendorBan(); }}
                    className="flex-1 h-11 rounded-2xl bg-red-600 text-white font-black text-sm flex items-center justify-center gap-1.5 hover:bg-red-700 transition-colors active:scale-[.98]">
                    <UserX className="w-4 h-4" /> تأكيد الإيقاف
                  </button>
                  <button
                    onClick={() => setVendorBanConfirm(false)}
                    className="flex-1 h-11 rounded-2xl border border-border font-black text-sm hover:bg-secondary transition-colors active:scale-[.98]">
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ VENDOR PERSONAL DATA MODAL ═══ */}
      <AnimatePresence>
        {vendorPersonalDataOpen && vendorDetail && vendorDetailEdit && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[305] flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setVendorPersonalDataOpen(false)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="w-full max-w-md bg-card rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col"
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="sticky top-0 bg-card px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0 rounded-t-3xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-sm">البيانات الشخصية للتاجر</p>
                    <p className="text-[10px] text-muted-foreground">{vendorDetail.businessName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVendorPersonalDataEditing(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${vendorPersonalDataEditing ? 'bg-primary/10 text-primary' : 'bg-secondary text-foreground/70 hover:bg-secondary/80'}`}>
                    <Edit3 className="w-3.5 h-3.5" />
                    {vendorPersonalDataEditing ? 'وضع العرض' : 'تعديل'}
                  </button>
                  <button onClick={() => setVendorPersonalDataOpen(false)} className="p-1.5 hover:bg-secondary rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto p-4 flex flex-col gap-3" dir="rtl">

                {vendorPersonalDataEditing ? (
                  <>
                    {/* Edit mode */}
                    {([
                      { label: 'اسم المتجر / الشركة', key: 'businessName' as const },
                      { label: 'الاسم الكامل', key: 'fullName' as const },
                      { label: 'البريد الإلكتروني', key: 'email' as const },
                      { label: 'رقم الهاتف', key: 'phone' as const },
                    ] as { label: string; key: keyof VendorProfileAdmin }[]).map(f => (
                      <div key={String(f.key)} className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-muted-foreground">{f.label}</label>
                        <input
                          type="text"
                          value={String(vendorDetailEdit[f.key] ?? '')}
                          onChange={e => setVendorDetailEdit(v => v ? { ...v, [f.key]: e.target.value } : v)}
                          className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ))}

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground">المحافظة</label>
                      <AdminSelect
                        value={vendorDetailEdit.governorate ?? ''}
                        onChange={v => setVendorDetailEdit(ed => ed ? { ...ed, governorate: v } : ed)}
                        options={GOVERNORATES.map(g => ({ value: g, label: g }))}
                        placeholder="اختر المحافظة"
                      />
                    </div>

                    {([
                      { label: 'المدينة', key: 'city' as const },
                      { label: 'العنوان', key: 'address' as const },
                    ] as { label: string; key: keyof VendorProfileAdmin }[]).map(f => (
                      <div key={String(f.key)} className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-muted-foreground">{f.label}</label>
                        <input
                          type="text"
                          value={String(vendorDetailEdit[f.key] ?? '')}
                          onChange={e => setVendorDetailEdit(v => v ? { ...v, [f.key]: e.target.value } : v)}
                          className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ))}

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground">التصنيف</label>
                      <AdminSelect
                        value={vendorDetailEdit.category}
                        onChange={v => setVendorDetailEdit(ed => ed ? { ...ed, category: v } : ed)}
                        options={Object.entries(VENDOR_CATEGORIES_AR).map(([k, l]) => ({ value: k, label: l }))}
                        placeholder="اختر التصنيف"
                      />
                    </div>

                    <Button
                      onClick={async () => { await saveVendorDetail(); setVendorPersonalDataEditing(false); }}
                      disabled={vendorDetailSaving}
                      className="w-full h-11 font-black gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
                      {vendorDetailSaving
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                        : <><Save className="w-4 h-4" /> حفظ البيانات</>}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* View mode */}
                    {[
                      { label: 'اسم المتجر / الشركة', value: vendorDetail.businessName, icon: Building2 },
                      { label: 'الاسم الكامل', value: vendorDetail.fullName, icon: User },
                      { label: 'البريد الإلكتروني', value: vendorDetail.email, icon: Mail },
                      { label: 'رقم الهاتف', value: vendorDetail.phone, icon: Phone },
                      { label: 'المحافظة', value: vendorDetail.governorate, icon: MapPin },
                      { label: 'المدينة', value: vendorDetail.city, icon: MapPin },
                      { label: 'العنوان', value: vendorDetail.address, icon: MapPin },
                      { label: 'الفئة', value: VENDOR_CATEGORIES_AR[vendorDetail.category] ?? vendorDetail.category, icon: Tag },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30">
                        <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          <row.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-muted-foreground">{row.label}</p>
                          <p className="text-xs font-bold truncate">{row.value || '—'}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div className="pb-4" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ ACTION NOTIFICATION MODAL ═══ */}
      <AnimatePresence>
        {actionNotif?.visible && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setActionNotif(null); }}>
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="w-full max-w-md bg-background rounded-3xl shadow-2xl flex flex-col gap-0 overflow-hidden" dir="rtl">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-sm">إرسال إشعار</p>
                    {actionNotif.targetName && (
                      <p className="text-[10px] text-muted-foreground">إلى: {actionNotif.targetName}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setActionNotif(null)} className="p-1.5 hover:bg-secondary rounded-xl">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground">عنوان الإشعار</label>
                  <input type="text" value={actionNotif.title}
                    onChange={e => setActionNotif(s => s ? { ...s, title: e.target.value } : s)}
                    className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="عنوان الإشعار..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground">نص الإشعار</label>
                  <textarea value={actionNotif.body}
                    onChange={e => setActionNotif(s => s ? { ...s, body: e.target.value } : s)}
                    rows={3}
                    className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    placeholder="نص الرسالة..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground">النوع</label>
                    <select value={actionNotif.type}
                      onChange={e => setActionNotif(s => s ? { ...s, type: e.target.value as 'info' | 'success' | 'warning' } : s)}
                      className="border border-border rounded-xl px-3 py-2 text-xs bg-background focus:outline-none">
                      <option value="info">معلومات</option>
                      <option value="success">نجاح</option>
                      <option value="warning">تحذير</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground">المرسل</label>
                    <select value={actionNotif.sender}
                      onChange={e => setActionNotif(s => s ? { ...s, sender: e.target.value as 'LiraPro' | 'فريق LiraPro' } : s)}
                      className="border border-border rounded-xl px-3 py-2 text-xs bg-background focus:outline-none">
                      <option value="LiraPro">LiraPro</option>
                      <option value="فريق LiraPro">فريق LiraPro</option>
                    </select>
                  </div>
                </div>
                {actionNotif.msg && (
                  <p className={`text-xs font-bold text-center ${actionNotif.msg.includes('نجاح') ? 'text-green-600' : 'text-destructive'}`}>
                    {actionNotif.msg}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button onClick={sendActionNotification} disabled={actionNotif.sending || !actionNotif.title || !actionNotif.body}
                    className="flex-1 h-11 font-black gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
                    {actionNotif.sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><Bell className="w-4 h-4" /> إرسال الإشعار</>}
                  </Button>
                  <button onClick={() => setActionNotif(null)}
                    className="h-11 px-4 rounded-2xl border border-border text-sm font-bold hover:bg-secondary transition-colors">
                    تخطي
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ VENDOR DELETE CONFIRMATION MODAL ═══ */}
      <AnimatePresence>
        {vendorDeleteConfirm && vendorDetail && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="w-full max-w-sm bg-background rounded-3xl shadow-2xl p-6 flex flex-col gap-4" dir="rtl">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-3xl bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-7 h-7 text-destructive" />
                </div>
                <div>
                  <p className="font-black text-base">حذف التاجر نهائياً</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    هل أنت متأكد من حذف <span className="font-bold text-foreground">{vendorDetail.businessName}</span>؟
                    لا يمكن التراجع عن هذا الإجراء.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={confirmDeleteVendor}
                  className="flex-1 h-11 rounded-2xl bg-destructive text-destructive-foreground font-black text-sm flex items-center justify-center gap-1.5 hover:bg-destructive/90 transition-colors">
                  <Trash2 className="w-4 h-4" /> حذف نهائي
                </button>
                <button onClick={() => setVendorDeleteConfirm(false)}
                  className="flex-1 h-11 rounded-2xl border border-border font-black text-sm hover:bg-secondary transition-colors">
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Image Lightbox */}
      <AdminImageLightbox key={adminLightboxSrc ?? ''} src={adminLightboxSrc} onClose={() => setAdminLightboxSrc(null)} />

      {/* ─── Custom Confirm / Alert Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {confirmModal?.open && (
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
            onClick={closeConfirm}>
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-background rounded-3xl shadow-2xl border border-border overflow-hidden"
              dir="rtl">
              <div className="p-6 flex flex-col items-center gap-4 text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${confirmModal.destructive ? 'bg-destructive/10' : confirmModal.alertOnly ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                  {confirmModal.destructive
                    ? <AlertTriangle className="w-7 h-7 text-destructive" />
                    : confirmModal.alertOnly
                    ? <CheckCircle2 className="w-7 h-7 text-green-500" />
                    : <Info className="w-7 h-7 text-primary" />}
                </div>
                <div>
                  <p className="font-black text-base leading-snug">{confirmModal.title}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{confirmModal.body}</p>
                </div>
              </div>
              <div className={`px-6 pb-6 flex gap-2.5 ${confirmModal.alertOnly ? 'justify-center' : ''}`}>
                <button
                  onClick={async () => {
                    closeConfirm();
                    if (confirmModal.onConfirm) await confirmModal.onConfirm();
                  }}
                  className={`flex-1 h-12 rounded-2xl font-black text-sm transition-all active:scale-95 ${confirmModal.alertOnly ? 'max-w-[140px]' : ''} ${confirmModal.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                  {confirmModal.confirmLabel ?? 'تأكيد'}
                </button>
                {!confirmModal.alertOnly && (
                  <button
                    onClick={closeConfirm}
                    className="flex-1 h-12 rounded-2xl border border-border font-black text-sm hover:bg-secondary transition-all active:scale-95">
                    {confirmModal.cancelLabel ?? 'إلغاء'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
