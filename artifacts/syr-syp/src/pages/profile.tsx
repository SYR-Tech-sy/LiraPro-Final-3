import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser, useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, User, Loader2, Wallet, Shield, ChevronLeft, Edit3, X, CheckCircle, Trash2, AlertCircle, Clock, Info, Camera, XCircle, Smartphone, Monitor, Tablet, QrCode, ScanLine, Home } from "lucide-react";
import { BlueBadge } from '@/components/golden-badge';
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useApp } from '@/context/app-context';

// ─── Sessions Helpers ────────────────────────────────────────────────────────

function parseDevice(ua: string): { type: string; name: string; icon: 'phone' | 'tablet' | 'desktop' } {
  const isTablet = /ipad|tablet|kindle/i.test(ua);
  const isPhone = /iphone|android.*mobile|blackberry|windows phone/i.test(ua);
  if (isTablet) return { type: 'جهاز لوحي', name: detectBrowser(ua) + ' — Tablet', icon: 'tablet' };
  if (isPhone) return { type: 'هاتف', name: detectBrowser(ua) + ' — Mobile', icon: 'phone' };
  return { type: 'حاسوب', name: detectBrowser(ua) + ' — Desktop', icon: 'desktop' };
}
function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Browser';
}
interface StoredSession { id: string; deviceName: string; deviceType: string; deviceIcon: 'phone'|'tablet'|'desktop'; startedAt: string; isCurrent?: boolean; }
const SESSIONS_KEY_PREFIX = 'syp-sessions-';
function getSessions(userId: string): StoredSession[] {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY_PREFIX + userId) ?? '[]'); } catch { return []; }
}
function saveSessions(userId: string, sessions: StoredSession[]) {
  try { localStorage.setItem(SESSIONS_KEY_PREFIX + userId, JSON.stringify(sessions.slice(0, 10))); } catch { /**/ }
}
function ensureCurrentSession(userId: string): StoredSession[] {
  const existing = getSessions(userId);
  const currentId = 'sess-current-' + userId;
  const { type, name, icon } = parseDevice(navigator.userAgent);
  const hasCurrentSession = existing.some(s => s.id === currentId);
  if (!hasCurrentSession) {
    const session: StoredSession = { id: currentId, deviceName: name, deviceType: type, deviceIcon: icon, startedAt: new Date().toISOString(), isCurrent: true };
    const updated = [session, ...existing.filter(s => s.id !== currentId)];
    saveSessions(userId, updated);
    return updated;
  }
  return existing.map(s => s.id === currentId ? { ...s, isCurrent: true } : s);
}

export function VerifiedBadge({ size = 20, className = '' }: { size?: number; className?: string }) {
  const id = React.useId().replace(/:/g, 'x');
  /* cycle = shine(1.1s) + delay(1.4s) = 2.5s
     pop fires right after shine ends → times[2] ≈ 1.1/2.5 = 0.44 */
  return (
    <motion.span
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      animate={{
        filter: ['none', 'none',
                 'drop-shadow(0 0 5px rgba(251,191,36,0.7))',
                 'drop-shadow(0 0 2px rgba(251,191,36,0.2))',
                 'none'],
      }}
      transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.42, 0.47, 0.58, 1], ease: 'easeOut' }}
    >
      <svg width={size} height={size} viewBox="0 0 20 20" style={{ overflow: 'hidden' }}>
        <defs>
          <linearGradient id={`vs${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"  stopColor="white" stopOpacity="0" />
            <stop offset="40%" stopColor="white" stopOpacity="0.72" />
            <stop offset="60%" stopColor="white" stopOpacity="0.72" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`vc${id}`}><circle cx="10" cy="10" r="10" /></clipPath>
        </defs>
        <circle cx="10" cy="10" r="10" fill="#3B82F6" />
        <polyline points="5.5 10.5 8.5 13.5 14.5 7.5"
          fill="none" stroke="white" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" />
        <g clipPath={`url(#vc${id})`}>
          <motion.rect
            x={-8} y={0} width={9} height={20}
            fill={`url(#vs${id})`}
            animate={{ x: [-8, 28] }}
            transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.4 }}
          />
        </g>
      </svg>
    </motion.span>
  );
}

const profileSchema = z.object({
  firstName: z.string().min(2, "الاسم الأول مطلوب"),
  fatherName: z.string().min(2, "اسم الأب مطلوب"),
  lastName: z.string().min(2, "اللقب مطلوب"),
  phone: z.string().min(9, "رقم الهاتف مطلوب"),
  birthDate: z.string().min(8, "تاريخ الميلاد مطلوب"),
  gender: z.string().min(1, "الجنس مطلوب"),
  governorate: z.string().min(1, "المحافظة مطلوبة"),
  city: z.string().min(1, "المدينة مطلوبة"),
  address: z.string().min(1, "العنوان مطلوب"),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

function getOrCreateLphId(userId: string): string {
  const key = `syp-lph-${userId}`;
  let id = localStorage.getItem(key);
  if (!id) {
    const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
    id = `LP${digits}`;
    localStorage.setItem(key, id);
  } else if (id.startsWith('LPH')) {
    id = 'LP' + id.slice(3);
    localStorage.setItem(key, id);
  }
  return id;
}

export default function ProfilePage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut, getToken } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useApp();
  // cardMode: closed = collapsed button only, view = read-only data, edit = form
  const [cardMode, setCardMode] = useState<'closed' | 'view' | 'edit'>('closed');
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [showDeleteDetails, setShowDeleteDetails] = useState(false);

  const [deleteRequest, setDeleteRequest] = useState<{ timestamp: string } | null>(null);
  const [prevDeleteUserId, setPrevDeleteUserId] = useState<string | undefined>(undefined);
  if (user?.id !== prevDeleteUserId) {
    setPrevDeleteUserId(user?.id);
    if (user?.id) {
      try {
        const s = localStorage.getItem(`syp-delete-request-${user.id}`);
        setDeleteRequest(s ? JSON.parse(s) as { timestamp: string } : null);
      } catch { setDeleteRequest(null); }
    }
  }

  // Check deletion request status from server — clear localStorage if rejected/handled/cancelled
  useEffect(() => {
    if (!isSignedIn || !user?.id) return;
    const checkStatus = async () => {
      try {
        const tok = await getToken();
        const res = await fetch('/api/user/deletion-request', { headers: { Authorization: `Bearer ${tok}` } });
        if (res.ok) {
          const data = await res.json() as { status: string | null };
          if (data.status !== 'pending') {
            localStorage.removeItem(`syp-delete-request-${user.id}`);
            setDeleteRequest(null);
          }
        }
      } catch {}
    };
    void checkStatus();
  }, [isSignedIn, user?.id, getToken]);

  interface _VerifyReqItem {
    id: string; supabaseId: string; lphId: string;
    fullName: string; email: string;
    requestedAt: string; status: 'pending' | 'approved' | 'rejected';
  }

  const lphId = useMemo(() => user?.id ? getOrCreateLphId(user.id) : '', [user?.id]);

  const verifyKey = user?.id ? `syp-verify-status-${user.id}` : '';
  const [verifyStatus, setVerifyStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>(() => {
    try {
      const s = verifyKey ? localStorage.getItem(verifyKey) : null;
      return (s as 'none' | 'pending' | 'approved' | 'rejected') ?? 'none';
    } catch { return 'none'; }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Sessions & Devices state ───────────────────────────────────────────────
  const queryClient = useQueryClient();
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: () => user?.id ? ensureCurrentSession(user.id) : [],
    enabled: !!user?.id,
    staleTime: 0,
  });
  const [showSessions, setShowSessions] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const qrData = qrToken ? encodeURIComponent(qrToken) : '';
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [qrConfirmData, setQrConfirmData] = useState<{ scannedId: string } | null>(null);
  const scanVideoRef = useRef<HTMLVideoElement>(null);
  const scanStreamRef = useRef<MediaStream | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const removeSession = useCallback((sessionId: string) => {
    if (!user?.id) return;
    const updated = getSessions(user.id).filter(s => s.id !== sessionId);
    saveSessions(user.id, updated);
    queryClient.setQueryData<StoredSession[]>(['sessions', user.id],
      updated.map(s => s.id === 'sess-current-' + user.id ? { ...s, isCurrent: true } : s));
  }, [user?.id, queryClient]);

  const stopScanner = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (scanStreamRef.current) { scanStreamRef.current.getTracks().forEach(t => t.stop()); scanStreamRef.current = null; }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setScanMsg('');
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      scanStreamRef.current = stream;
      if (scanVideoRef.current) {
        scanVideoRef.current.srcObject = stream;
        await scanVideoRef.current.play();
      }
      const jsQR = (await import('jsqr')).default;
      scanIntervalRef.current = setInterval(() => {
        const video = scanVideoRef.current;
        const canvas = scanCanvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          stopScanner();
          if (user?.id && code.data.startsWith('lph-qrlogin:')) {
            const parts = code.data.split(':');
            const scannedId = parts[1];
            if (scannedId) {
              setScanMsg('');
              setQrConfirmData({ scannedId });
            } else {
              setScanMsg('❌ رمز QR غير صالح');
            }
          } else {
            setScanMsg(`✅ تم الكشف: ${code.data.slice(0, 40)}...`);
          }
        }
      }, 300);
    } catch {
      setScanMsg('تعذّر الوصول إلى الكاميرا');
      setScanning(false);
    }
  }, [stopScanner, user?.id]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';

    const maxSizeMB = 2;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`حجم الصورة يتجاوز ${maxSizeMB} ميجابايت`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('الملف المحدد ليس صورة');
      return;
    }

    setUploadingAvatar(true);
    try {
      // Convert to data URL and send via API
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('غير مسجّل الدخول');

      const resp = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dataUrl }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? 'فشل رفع الصورة');
      }

      const { url } = await resp.json() as { url: string };
      updateProfile.mutate(
        { data: { profilePhoto: url } },
        {
          onSuccess: () => {
            toast.success('تم تحديث الصورة الشخصية');
            void refetch();
          },
          onError: () => { toast.error('فشل حفظ رابط الصورة'); },
        }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleVerifyRequest = () => {
    if (!verifyKey || !user?.id) return;
    const fullName = `${profile?.firstName || user?.user_metadata?.first_name || ''} ${profile?.lastName || user?.user_metadata?.last_name || ''}`.trim();
    const email = profile?.email || user?.email || '';
    fetch('/api/admin/verify-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabaseId: user.id, lphId: lphId || '', fullName, email }),
    }).catch(() => {});
    localStorage.setItem(verifyKey, 'pending');
    setVerifyStatus('pending');
    toast.success('تم تقديم طلب التوثيق بنجاح');
  };

  const handleDeleteAccount = () => {
    if (deleteInput !== 'حذف') {
      setDeleteMsg('يرجى كتابة كلمة "حذف" للتأكيد');
      return;
    }
    const req = { timestamp: new Date().toISOString() };
    const deleteKey = user?.id ? `syp-delete-request-${user.id}` : 'syp-delete-request';
    localStorage.setItem(deleteKey, JSON.stringify(req));
    setDeleteRequest(req);
    setDeleteSuccess(true);
    try {
      const walletId = user?.id ?? '';
      const pData = profile as { firstName?: string; lastName?: string } | undefined;
      const fullName = [pData?.firstName, pData?.lastName].filter(Boolean).join(' ') || user?.user_metadata?.full_name || undefined;
      const email = user?.email ?? undefined;
      const reason = 'طلب المستخدم حذف حسابه من صفحة الملف الشخصي';
      fetch('/api/admin/deletion-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId, fullName, email, reason }),
      }).catch(() => {});
    } catch {}
    setTimeout(() => {
      setDeleteModal(false);
      setDeleteInput('');
      setDeleteMsg('');
      setDeleteSuccess(false);
    }, 2000);
  };

  const { data: profile, isLoading: loadingProfile, refetch } = useGetProfile({
    query: { enabled: !!isSignedIn, queryKey: ['profile', user?.id] as readonly unknown[] }
  });
  const updateProfile = useUpdateProfile();

  // Trust backend's profileCompleted flag (computed from all 9 required fields)
  const isProfileComplete = !!profile?.profileCompleted;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", birthDate: "", gender: "", fatherName: "", governorate: "", city: "", address: "" }
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        birthDate: profile.birthDate || "",
        gender: profile.gender || "",
        fatherName: profile.fatherName || "",
        governorate: profile.governorate || "",
        city: profile.city || "",
        address: profile.address || "",
      });
    } else if (user) {
      form.reset({ firstName: user.user_metadata?.first_name || "", lastName: user.user_metadata?.last_name || "" });
    }
  }, [profile, user, form]);

  /* Force completion modal if profile is incomplete (cannot be dismissed) */
  const forceComplete = !loadingProfile && isSignedIn && !!profile && !profile.profileCompleted;

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate({ data }, {
      onSuccess: () => {
        toast.success("تم حفظ بياناتك بنجاح");
        refetch();
        void queryClient.invalidateQueries({ queryKey: ['greeting-profile'] });
        setCardMode('view');
      },
      onError: () => { toast.error("حدث خطأ أثناء حفظ البيانات، حاول مرة أخرى"); }
    });
  };

  if (!isLoaded) {
    return <div className="p-4"><Skeleton className="h-64 w-full rounded-xl" /></div>;
  }

  if (!isSignedIn) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center gap-6"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <User className="w-12 h-12 text-primary/60" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">تسجيل الدخول لعرض الملف الشخصي</h2>
          <p className="text-sm text-foreground/70 dark:text-white max-w-[260px] mx-auto leading-relaxed">
            قم بتسجيل الدخول للوصول إلى بياناتك الشخصية وحفظ إعداداتك المفضلة
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-[260px]">
          <Link href="/sign-in" className="w-full">
            <Button className="w-full" size="lg">{t('signIn')}</Button>
          </Link>
          <Link href="/sign-up" className="w-full">
            <Button className="w-full" variant="outline" size="lg">{t('signUp')}</Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4 pb-10">

      {/* Profile Header Card */}
      <Card className="border-none bg-primary text-primary-foreground shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <CardContent className="p-5 flex items-center gap-4 relative z-10">
          {/* Avatar with camera upload + click-to-expand */}
          <div className="relative flex-shrink-0">
            <div
              className={`w-16 h-16 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center text-xl font-bold overflow-hidden ${profile?.profilePhoto ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
              onClick={() => profile?.profilePhoto && setShowFullPhoto(true)}
              title={profile?.profilePhoto ? 'انقر لعرض الصورة' : undefined}
            >
              {profile?.profilePhoto ? (
                <img src={profile.profilePhoto} alt="صورة الملف الشخصي" className="w-full h-full object-cover" />
              ) : (
                <span>{profile?.firstName?.charAt(0) || user?.user_metadata?.first_name?.charAt(0) || '؟'}</span>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md border border-gray-100 hover:bg-gray-50 transition-colors disabled:opacity-60"
              title="تغيير الصورة"
            >
              {uploadingAvatar
                ? <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />
                : <Camera className="w-3 h-3 text-gray-600" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />
          </div>
          {/* Name, email, LPH, verify status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-0.5 flex-wrap mb-0.5">
              <h2 className="text-lg font-bold truncate">
                {profile?.firstName || user?.user_metadata?.first_name} {profile?.lastName || user?.user_metadata?.last_name}
              </h2>
              {verifyStatus === 'approved' && (
                <BlueBadge size={20} />
              )}
            </div>
            <p className="text-primary-foreground/70 text-sm truncate" dir="ltr">
              {profile?.email || user?.email}
            </p>
            {lphId && (
              <p className="text-white/50 text-[10px] font-mono mt-0.5" dir="ltr">{lphId}</p>
            )}
            {verifyStatus === 'pending' && (
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-amber-300" />
                <span className="text-xs text-amber-300">طلب التوثيق قيد المراجعة</span>
              </div>
            )}
            {verifyStatus === 'approved' && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="w-3.5 h-3.5 text-green-300" />
                <span className="text-xs text-green-300">حساب موثّق</span>
              </div>
            )}
            {verifyStatus !== 'approved' && verifyStatus !== 'pending' && profile?.profileCompleted && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="w-3.5 h-3.5 text-green-300" />
                <span className="text-xs text-green-300">ملف مكتمل</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verification Request Card */}
      {(verifyStatus === 'none' || verifyStatus === 'rejected') && (
        <Card className={`border shadow-sm ${verifyStatus === 'rejected' ? 'border-red-200 dark:border-red-900/40' : 'border-border'}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${verifyStatus === 'rejected' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
              {verifyStatus === 'rejected'
                ? <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                : <BlueBadge size={20} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${verifyStatus === 'rejected' ? 'text-red-700 dark:text-red-400' : 'text-foreground'}`}>
                {verifyStatus === 'rejected' ? 'تم رفض طلب التوثيق' : 'طلب توثيق الحساب'}
              </p>
              <p className="text-xs text-muted-foreground">
                {verifyStatus === 'rejected'
                  ? 'يمكنك إعادة التقديم بعد تحديث بياناتك'
                  : isProfileComplete
                    ? 'سيتم مراجعة طلبك خلال 24-48 ساعة'
                    : 'أكمل ملفك الشخصي أولاً لتفعيل التوثيق'}
              </p>
            </div>
            <Button
              size="sm"
              disabled={!isProfileComplete}
              onClick={handleVerifyRequest}
              variant={verifyStatus === 'rejected' ? 'outline' : 'default'}
              className={`h-8 text-xs font-bold flex-shrink-0 ${verifyStatus === 'rejected' ? 'border-red-300 text-red-600' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {verifyStatus === 'rejected' ? 'إعادة تقديم' : 'طلب توثيق'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Wallet Button */}
      <button onClick={() => navigate('/app/wallet')} className="w-full">
        <Card className="border-border shadow-sm hover:border-primary/30 transition-colors cursor-pointer active:scale-[0.98]">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm">{t('wallet')}</p>
                <p className="text-xs text-foreground/70 dark:text-white">تتبع ممتلكاتك وأصولك</p>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-foreground/70 dark:text-white" />
          </CardContent>
        </Card>
      </button>

      {/* Personal Data Toggle — opens VIEW mode first (data is read-only by default) */}
      <button
        onClick={() => setCardMode(cardMode === 'closed' ? 'view' : 'closed')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold ${cardMode !== 'closed' ? 'border-primary/50 bg-primary/5 text-primary' : 'border-border bg-card text-foreground hover:border-primary/30'}`}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          {cardMode !== 'closed' ? <X className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-primary" />}
        </div>
        {cardMode !== 'closed' ? 'إخفاء البيانات الشخصية' : 'البيانات الشخصية'}
        <ChevronLeft className={`w-4 h-4 text-foreground/70 dark:text-white mr-auto transition-transform ${cardMode !== 'closed' ? 'rotate-90' : ''}`} />
      </button>

      {/* VIEW Mode — read-only display, click "تعديل" to enter edit mode */}
      <AnimatePresence initial={false}>
        {cardMode === 'view' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">البيانات الشخصية</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setCardMode('edit')} className="h-8 text-xs font-bold">
                  <Edit3 className="w-3.5 h-3.5 ml-1.5" />
                  تعديل
                </Button>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  { label: 'الاسم الأول', value: profile?.firstName },
                  { label: 'اسم الأب', value: profile?.fatherName },
                  { label: 'اللقب', value: profile?.lastName },
                  { label: 'البريد الإلكتروني', value: profile?.email || user?.email, ltr: true },
                  { label: 'رقم الهاتف', value: profile?.phone, ltr: true },
                  { label: 'الجنس', value: profile?.gender === 'male' ? 'ذكر' : profile?.gender === 'female' ? 'أنثى' : '' },
                  { label: 'تاريخ الميلاد', value: profile?.birthDate, ltr: true },
                  { label: 'المحافظة', value: profile?.governorate },
                  { label: 'المدينة / الحي', value: profile?.city },
                  { label: 'العنوان', value: profile?.address },
                ].map((f, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-0">
                    <span className="text-xs text-muted-foreground flex-shrink-0">{f.label}</span>
                    <span className={`text-sm font-medium text-right ${f.value ? 'text-foreground' : 'text-muted-foreground/50'}`} dir={f.ltr ? 'ltr' : 'rtl'}>
                      {f.value || 'غير محدد'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT Mode — full form, only when user clicks "تعديل" */}
      <AnimatePresence initial={false}>
        {cardMode === 'edit' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {profile?.profileCompleted ? 'تعديل البيانات الشخصية' : 'إكمال الملف الشخصي'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">الاسم الأول <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input {...field} className="h-10" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="fatherName" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">اسم الأب <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input {...field} className="h-10" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">اللقب <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input {...field} className="h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">رقم الهاتف <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input {...field} dir="ltr" className="h-10" placeholder="+963..." /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="birthDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">تاريخ الميلاد <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              inputMode="numeric"
                              placeholder="سنة/شهر/يوم"
                              className="h-10"
                              dir="ltr"
                              maxLength={10}
                              value={field.value ?? ''}
                              onChange={e => {
                                const raw = e.target.value;
                                const digits = raw.replace(/\D/g, '').slice(0, 8);
                                let formatted = digits;
                                if (digits.length > 4) formatted = digits.slice(0, 4) + '/' + digits.slice(4);
                                if (digits.length > 6) formatted = digits.slice(0, 4) + '/' + digits.slice(4, 6) + '/' + digits.slice(6);
                                field.onChange(formatted);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">الجنس <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10"><SelectValue placeholder="اختر" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">ذكر</SelectItem>
                              <SelectItem value="female">أنثى</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="governorate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">المحافظة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                              <SelectTrigger className="h-10"><SelectValue placeholder="اختر" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {['إدلب','دمشق','ريف دمشق','حلب','حمص','حماة','اللاذقية','طرطوس','دير الزور','الرقة','الحسكة','درعا','السويداء','القنيطرة'].map(g => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">المدينة / الحي</FormLabel>
                          <FormControl><Input {...field} className="h-10" placeholder="أدخل المدينة أو الحي" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">العنوان</FormLabel>
                        <FormControl><Input {...field} className="h-10" placeholder="أدخل عنوانك التفصيلي" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setCardMode('view')}>
                        إلغاء
                      </Button>
                      <Button type="submit" className="flex-1" disabled={updateProfile.isPending}>
                        {updateProfile.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                        {profile?.profileCompleted ? 'حفظ التعديلات' : 'إكمال التسجيل'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions & Devices Card */}
      <Card className="border-border shadow-sm">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-t-xl hover:bg-secondary/40 transition-colors"
          onClick={() => setShowSessions(v => !v)}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-bold text-foreground">الجلسات والأجهزة</p>
            <p className="text-[10px] text-muted-foreground">{sessions.length} جهاز نشط</p>
          </div>
          <ChevronLeft className={`w-4 h-4 text-muted-foreground transition-transform ${showSessions ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {showSessions && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <CardContent className="p-4 pt-0 flex flex-col gap-3">
                {/* QR Login */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (user?.id && !showQr) setQrToken(`lph-qrlogin:${user.id}:${Date.now()}`);
                      setShowQr(v => !v);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${showQr ? 'bg-primary text-white' : 'bg-secondary text-foreground'}`}
                  >
                    <QrCode className="w-4 h-4" />
                    رمز QR للدخول
                  </button>
                  <button
                    onClick={scanning ? stopScanner : startScanner}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${scanning ? 'bg-red-100 text-red-600' : 'bg-secondary text-foreground'}`}
                  >
                    <ScanLine className="w-4 h-4" />
                    {scanning ? 'إيقاف الكاميرا' : 'مسح رمز QR'}
                  </button>
                </div>

                {/* QR Code Display */}
                <AnimatePresence>
                  {showQr && qrData && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center gap-2 p-3 bg-secondary/40 rounded-xl">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}&bgcolor=ffffff&color=003C32`}
                        alt="QR Login"
                        className="w-44 h-44 rounded-xl border border-border"
                      />
                      <p className="text-[10px] text-muted-foreground text-center">امسح هذا الرمز من جهاز آخر لتسجيل الدخول</p>
                      <p className="text-[9px] text-muted-foreground/60">يتجدد الرمز عند كل زيارة</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* QR Scanner */}
                <AnimatePresence>
                  {scanning && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-2">
                      <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-[4/3]">
                        <video ref={scanVideoRef} className="w-full h-full object-cover" muted playsInline />
                        <canvas ref={scanCanvasRef} className="hidden" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-36 h-36 border-2 border-primary/60 rounded-xl" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">وجّه الكاميرا نحو رمز QR</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {scanMsg && (
                  <p className="text-xs font-bold text-center text-green-600 dark:text-green-400">{scanMsg}</p>
                )}

                {/* QR Confirmation Modal */}
                <AnimatePresence>
                  {qrConfirmData && createPortal(
                    <motion.div
                      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setQrConfirmData(null)}
                    >
                      <motion.div
                        className="bg-card rounded-3xl p-6 w-full max-w-xs shadow-2xl flex flex-col gap-4"
                        dir="rtl"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <QrCode className="w-7 h-7 text-primary" />
                          </div>
                          <h3 className="text-base font-black text-center">تأكيد تسجيل الجهاز</h3>
                          <p className="text-xs text-muted-foreground text-center leading-relaxed">
                            تم كشف رمز QR. هل تريد تسجيل هذا الجهاز للدخول بهذا الحساب؟
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg" dir="ltr">
                            {qrConfirmData.scannedId.slice(0, 20)}...
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 h-10 text-xs"
                            onClick={() => { setQrConfirmData(null); setScanMsg(''); }}>
                            إلغاء
                          </Button>
                          <Button className="flex-1 h-10 text-xs"
                            onClick={() => {
                              if (user?.id) {
                                const { name, icon, type } = parseDevice(navigator.userAgent);
                                const newSess: StoredSession = {
                                  id: 'sess-qr-' + Date.now(),
                                  deviceName: name + ' (QR)',
                                  deviceType: type,
                                  deviceIcon: icon,
                                  startedAt: new Date().toISOString(),
                                };
                                const existing = getSessions(user.id);
                                saveSessions(user.id, [newSess, ...existing]);
                                void queryClient.invalidateQueries({ queryKey: ['sessions', user.id] });
                              }
                              setQrConfirmData(null);
                              setScanMsg('✅ تم تسجيل الجهاز بنجاح');
                            }}>
                            تأكيد
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>,
                    document.body
                  )}
                </AnimatePresence>

                {/* Sessions List */}
                <div className="flex flex-col gap-2">
                  {sessions.map(s => {
                    const DevIcon = s.deviceIcon === 'phone' ? Smartphone : s.deviceIcon === 'tablet' ? Tablet : Monitor;
                    return (
                      <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${s.isCurrent ? 'bg-primary/5 border-primary/20' : 'bg-secondary/30 border-border'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.isCurrent ? 'bg-primary/15' : 'bg-secondary'}`}>
                          <DevIcon className={`w-4 h-4 ${s.isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{s.deviceName}</p>
                          <p className="text-[9px] text-muted-foreground">{s.isCurrent ? '● هذا الجهاز · ' : ''}{new Date(s.startedAt).toLocaleDateString('ar-SY')}</p>
                        </div>
                        {!s.isCurrent && (
                          <button onClick={() => removeSession(s.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Logout all other sessions */}
                {(() => {
                  const otherSessions = sessions.filter(s => !s.isCurrent);
                  const hasOthers = otherSessions.length > 0;
                  return (
                    <button
                      onClick={() => {
                        if (!user?.id || !hasOthers) return;
                        otherSessions.forEach(s => removeSession(s.id));
                      }}
                      disabled={!hasOthers}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                        hasOthers
                          ? 'border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10'
                          : 'border-border bg-secondary/40 text-muted-foreground cursor-default'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {hasOthers
                        ? `تسجيل الخروج من جميع الأجهزة الأخرى (${otherSessions.length})`
                        : 'لا توجد جلسات أخرى نشطة'}
                    </button>
                  );
                })()}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Settings & Logout */}
      <div className="flex flex-col gap-2">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors text-sm text-foreground dark:text-white"
          onClick={() => navigate('/app/settings')}
        >
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          الإعدادات والخصوصية
          <ChevronLeft className="w-4 h-4 mr-auto" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (!deleteRequest) { setDeleteModal(true); setDeleteInput(''); setDeleteMsg(''); setDeleteSuccess(false); } }}
            disabled={!!deleteRequest}
            className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-sm ${deleteRequest ? 'border-border bg-secondary/50 text-muted-foreground cursor-not-allowed opacity-60' : 'border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive/80'}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${deleteRequest ? 'bg-secondary' : 'bg-destructive/10'}`}>
              <Trash2 className="w-4 h-4" />
            </div>
            {deleteRequest ? 'طلب الحذف قيد الانتظار' : 'طلب حذف الحساب'}
          </button>
          {deleteRequest && (
            <button
              onClick={() => setShowDeleteDetails(true)}
              className="w-10 h-10 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex-shrink-0"
              title="عرض تفاصيل الطلب"
            >
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>
          )}
        </div>

        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors text-sm text-destructive"
        >
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-4 h-4" />
          </div>
          تسجيل الخروج
        </button>
      </div>

      {/* Delete Account Modal */}
      {createPortal(
      <AnimatePresence>
        {deleteModal && (
          <div className="fixed inset-0 z-[999] bg-black/50 flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-card w-full rounded-t-3xl p-6 pb-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <button onClick={() => setDeleteModal(false)}><X className="w-5 h-5 text-foreground" /></button>
                <h3 className="font-bold text-destructive flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  طلب حذف الحساب
                </h3>
                <div className="w-5" />
              </div>

              {deleteSuccess ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="font-bold text-foreground text-center">تم تقديم طلب حذف الحساب</p>
                  <p className="text-sm text-foreground/70 dark:text-white text-center leading-relaxed px-4">
                    سيتم حذف حسابك نهائياً بعد 30 يوماً. يمكنك الاستمرار في استخدام التطبيق بشكل طبيعي.
                  </p>
                  <button
                    onClick={() => { setDeleteModal(false); navigate('/app/support'); }}
                    className="text-xs text-primary font-bold underline underline-offset-2"
                  >
                    التواصل مع الدعم لإلغاء الطلب
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-destructive">يرجى قراءة هذا بعناية قبل المتابعة:</p>
                    </div>
                    <ul className="flex flex-col gap-2 text-xs text-foreground/70 dark:text-white leading-relaxed">
                      <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span>سيتم حذف حسابك نهائياً بعد مرور 30 يوم من تقديم الطلب.</li>
                      <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span>يمكنك الاستمرار في استخدام التطبيق بشكل طبيعي طوال فترة الـ 30 يوم.</li>
                      <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span>ستتلقى إشعاراً قبل 3 أيام من موعد الحذف النهائي.</li>
                      <li className="flex items-start gap-1.5"><span className="text-destructive mt-0.5">•</span>لا يمكن استعادة الحساب أو بياناتك بعد الحذف النهائي.</li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold text-foreground text-center">اكتب كلمة "حذف" للتأكيد:</p>
                    <input
                      value={deleteInput}
                      onChange={e => setDeleteInput(e.target.value)}
                      placeholder="اكتب هنا..."
                      className="w-full h-12 text-center font-bold text-lg rounded-xl border-2 border-border bg-background text-foreground px-3 focus:outline-none focus:border-destructive/50"
                    />
                  </div>

                  {deleteMsg && (
                    <p className="text-xs text-center text-destructive font-medium">{deleteMsg}</p>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setDeleteModal(false)}
                      className="flex-1 h-12 rounded-xl border-2 border-border font-bold text-sm text-foreground hover:bg-secondary transition-colors">
                      إلغاء
                    </button>
                    <button onClick={handleDeleteAccount}
                      className="flex-1 h-12 rounded-xl bg-destructive font-bold text-sm text-white hover:bg-destructive/90 transition-colors">
                      تأكيد الطلب
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      , document.body)}

      {/* Delete Request Details Modal */}
      {createPortal(
      <AnimatePresence>
        {showDeleteDetails && deleteRequest && (
          <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <button onClick={() => setShowDeleteDetails(false)}><X className="w-5 h-5 text-foreground" /></button>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  تفاصيل طلب الحذف
                </h3>
                <div className="w-5" />
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">الحالة</p>
                    <p className="text-sm font-black text-amber-800 dark:text-amber-300">قيد الانتظار · 30 يوماً</p>
                  </div>
                </div>

                <div className="border-t border-amber-200 dark:border-amber-700/40 pt-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-foreground/70 dark:text-white">تاريخ تقديم الطلب</span>
                    <span className="text-xs font-bold text-foreground dark:text-white" dir="ltr">
                      {new Date(deleteRequest.timestamp).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-foreground/70 dark:text-white">وقت تقديم الطلب</span>
                    <span className="text-xs font-bold text-foreground dark:text-white" dir="ltr">
                      {new Date(deleteRequest.timestamp).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-foreground/70 dark:text-white">موعد الحذف النهائي</span>
                    <span className="text-xs font-bold text-destructive" dir="ltr">
                      {new Date(new Date(deleteRequest.timestamp).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-foreground/70 dark:text-white text-center leading-relaxed">
                يمكنك الاستمرار في استخدام التطبيق بشكل طبيعي حتى موعد الحذف النهائي.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const walletId = user?.id ?? '';
                    if (walletId) {
                      fetch(`/api/admin/deletion-requests/cancel/${walletId}`, { method: 'DELETE' }).catch(() => {});
                      localStorage.removeItem(`syp-delete-request-${walletId}`);
                    }
                    setDeleteRequest(null);
                    setShowDeleteDetails(false);
                  }}
                  className="flex-1 h-11 rounded-xl border-2 border-border font-bold text-xs text-foreground dark:text-white hover:bg-secondary transition-colors"
                >
                  إلغاء طلب الحذف
                </button>
                <button
                  onClick={() => setShowDeleteDetails(false)}
                  className="flex-1 h-11 rounded-xl bg-primary font-bold text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  حسناً
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      , document.body)}

      {/* ─── Full-size photo viewer ─── */}
      {createPortal(
        <AnimatePresence>
          {showFullPhoto && profile?.profilePhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[10000] flex items-center justify-center p-6"
              onClick={() => setShowFullPhoto(false)}
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative max-w-xs w-full flex flex-col gap-3"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative">
                  <img
                    src={profile.profilePhoto}
                    alt="صورة الملف الشخصي"
                    className="w-full aspect-square object-cover rounded-3xl shadow-2xl border-2 border-white/20"
                  />
                  <button
                    onClick={() => setShowFullPhoto(false)}
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-800 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Photo action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowFullPhoto(false); fileInputRef.current?.click(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold transition-colors backdrop-blur-sm"
                  >
                    <Camera className="w-4 h-4" />
                    تغيير الصورة
                  </button>
                  <button
                    onClick={() => {
                      setShowFullPhoto(false);
                      updateProfile.mutate(
                        { data: { profilePhoto: '' } },
                        {
                          onSuccess: () => { toast.success('تم حذف الصورة الشخصية'); refetch(); },
                          onError: () => toast.error('فشل حذف الصورة'),
                        }
                      );
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-red-500/70 hover:bg-red-500/90 text-white text-sm font-bold transition-colors backdrop-blur-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف الصورة
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── FORCED Profile Completion Modal — cannot be dismissed ─── */}
      {createPortal(
        <AnimatePresence>
          {forceComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0.93, opacity: 0, y: 28 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 16 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
                className="bg-card border-2 border-primary/30 rounded-2xl shadow-2xl w-full max-w-sm my-4 overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Welcome banner */}
                <div className="bg-gradient-to-br from-primary via-primary to-primary/80 p-4 text-primary-foreground relative overflow-hidden">
                  {/* Decorative blobs */}
                  <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -ml-14 -mt-14 pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-2xl -mr-8 -mb-8 pointer-events-none" />
                  {/* Home button — top right */}
                  <button
                    type="button"
                    onClick={() => { navigate('/'); }}
                    className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-white/80 hover:text-white text-xs font-bold"
                    title="الصفحة الرئيسية"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>لاحقاً</span>
                  </button>
                  {/* Illustration + logo */}
                  <div className="relative z-10 text-center pt-1">
                    {/* User icon illustration */}
                    <div className="mx-auto mb-2.5 w-14 h-14 flex items-center justify-center rounded-full bg-white/20 border-2 border-white/40">
                      <User className="w-7 h-7 text-white" />
                    </div>
                    {/* LiraPro in Orbitron */}
                    <div className="flex items-center justify-center gap-1 mb-1" dir="ltr">
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '1.25rem', color: 'white', letterSpacing: '0.02em' }}>
                        Lira
                      </span>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '1.25rem', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.02em' }}>
                        Pro
                      </span>
                    </div>
                    <p className="text-xs text-primary-foreground/85 leading-relaxed">
                      خطوة واحدة لإكمال ملفك الشخصي
                    </p>
                  </div>
                </div>

                {/* Form */}
                <div className="p-5">
                  <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      هذه البيانات ضرورية لتفعيل جميع ميزات المنصة. يمكنك إكمالها لاحقاً من إعدادات ملفك الشخصي.
                    </p>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name="firstName" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">الاسم الأول <span className="text-destructive">*</span></FormLabel>
                            <FormControl><Input {...field} className="h-10" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="fatherName" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">اسم الأب <span className="text-destructive">*</span></FormLabel>
                            <FormControl><Input {...field} className="h-10" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">اللقب <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input {...field} className="h-10" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">رقم الهاتف <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input {...field} dir="ltr" className="h-10" placeholder="+963..." /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name="birthDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">تاريخ الميلاد <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="text"
                                inputMode="numeric"
                                placeholder="سنة/شهر/يوم"
                                className="h-10"
                                dir="ltr"
                                maxLength={10}
                                value={field.value ?? ''}
                                onChange={e => {
                                  const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                                  let formatted = digits;
                                  if (digits.length > 4) formatted = digits.slice(0, 4) + '/' + digits.slice(4);
                                  if (digits.length > 6) formatted = digits.slice(0, 4) + '/' + digits.slice(4, 6) + '/' + digits.slice(6);
                                  field.onChange(formatted);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="gender" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">الجنس <span className="text-destructive">*</span></FormLabel>
                            <Select value={field.value ?? ''} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-10 text-sm">
                                  <SelectValue placeholder="اختر" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">ذكر</SelectItem>
                                <SelectItem value="female">أنثى</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name="governorate" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">المحافظة <span className="text-destructive">*</span></FormLabel>
                            <Select value={field.value ?? ''} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-10 text-sm">
                                  <SelectValue placeholder="اختر" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {['إدلب','دمشق','ريف دمشق','حلب','حمص','حماة','اللاذقية','طرطوس','دير الزور','الرقة','الحسكة','درعا','السويداء','القنيطرة'].map(g => (
                                  <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="city" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">المدينة / الحي <span className="text-destructive">*</span></FormLabel>
                            <FormControl><Input {...field} className="h-10" placeholder="المدينة" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">العنوان <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input {...field} className="h-10" placeholder="عنوانك التفصيلي" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full mt-2 font-bold"
                        disabled={updateProfile.isPending}
                      >
                        {updateProfile.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-2" />}
                        إكمال التسجيل وحفظ البيانات
                      </Button>
                    </form>
                  </Form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      , document.body)}
    </motion.div>
  );
}
