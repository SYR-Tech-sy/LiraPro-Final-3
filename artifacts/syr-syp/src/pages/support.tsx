/// <reference lib="dom" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── SpeechRecognition type shim ──────────────────────────────────────────────
interface ISpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type ISpeechRecognitionCtor = new () => ISpeechRecognition;
import {
  Send, Mic, Image as ImageIcon, Paperclip, Bot, User,
  CheckCheck, Trash2, X, Square, PhoneOff, Play, Pause, TicketCheck,
  LogIn, UserPlus, Info, ChevronRight, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { Link } from 'wouter';
import { useUser } from '@/context/auth-context';
import { useGetProfile } from '@workspace/api-client-react';
import { addLocalNotification } from '@/components/notifications-panel';
import { BlueBadge, ChatBadge } from '@/components/golden-badge';

// ─── Voice Player ─────────────────────────────────────────────────────────────

function VoicePlayer({ src, duration, isUser }: { src: string; duration?: number; isUser: boolean }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [audioDuration, setAudioDuration] = React.useState(0);

  const fmtSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play().catch(() => null); }
  };

  React.useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0); if (a) a.currentTime = 0; };
    const onTime = () => { setCurrentTime(a.currentTime); setAudioDuration(a.duration ?? 0); setProgress(a.duration ? a.currentTime / a.duration : 0); };
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    a.addEventListener('timeupdate', onTime);
    return () => { a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); a.removeEventListener('ended', onEnded); a.removeEventListener('timeupdate', onTime); };
  }, []);

  const totalDur = audioDuration || duration || 0;
  const BARS = 22;
  const barHeights = React.useMemo(
    () => Array.from({ length: BARS }, (_, i) => 4 + Math.abs(Math.sin(i * 1.3 + 0.5)) * 18 + Math.abs(Math.cos(i * 0.8)) * 8),
    []
  );

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 min-w-[160px] max-w-[200px] ${isUser ? 'bg-primary/20' : 'bg-secondary/60'}`}
      dir="ltr">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${isUser ? 'bg-white/20 hover:bg-white/30 text-primary-foreground' : 'bg-primary/10 hover:bg-primary/20 text-primary'}`}
      >
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 translate-x-px" />}
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-px h-4">
          {barHeights.map((h, i) => {
            const pct = i / BARS;
            const played = pct <= progress;
            return (
              <div
                key={i}
                className={`w-px rounded-full flex-shrink-0 transition-colors ${played ? (isUser ? 'bg-primary-foreground/80' : 'bg-primary') : (isUser ? 'bg-primary-foreground/30' : 'bg-foreground/20')}`}
                style={{ height: Math.min(h * 0.72, 14) }}
              />
            );
          })}
        </div>
        <span className={`text-[8px] font-medium leading-none ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {playing ? fmtSecs(currentTime) : fmtSecs(totalDur)}
        </span>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupportMsg {
  id: string;
  role: 'user' | 'bot' | 'admin';
  text: string;
  timestamp: number;
  read?: boolean;
  attachment?: { type: 'image' | 'file' | 'voice'; name: string; duration?: number; audioUrl?: string };
  agentName?: string;
  agentBadge?: 'cyberpunk' | 'legendary';
  isTicketNotice?: boolean;
  isGuestLimit?: boolean;
  rating?: 'up' | 'down';
}

interface SupportConv {
  userId: string;
  userName: string;
  msgs: SupportMsg[];
  closedAt?: number;
  lastUpdated: number;
}

// ─── Ticket types ─────────────────────────────────────────────────────────────

interface _SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  createdAt: number;
  status: 'open' | 'closed';
}

async function createTicketBackend(userId: string, userName: string, subject: string, userEmail?: string): Promise<{ success: boolean; ticketId?: string; alreadyOpen?: boolean }> {
  try {
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName, userEmail, subject: subject.slice(0, 200), firstMessage: subject }),
    });
    if (res.status === 409) return { success: false, alreadyOpen: true };
    if (!res.ok) return { success: false };
    const data = await res.json() as { id: string };
    return { success: true, ticketId: data.id };
  } catch {
    return { success: false };
  }
}

const TICKET_REQUEST_RE = /موظف|دعم.بشري|شخص.حقيق|تذكرة.دعم|تصعيد|مشكلة.معقد|اتصل.بنا|تحدث.مع.شخص|ابلغ.مشكل|تواصل.مع.فريق/i;

// ─── Storage helpers ──────────────────────────────────────────────────────────

function getConvKey(userId: string) {
  return `syp-conv-${userId}`;
}

function loadConv(userId: string): SupportConv | null {
  try {
    const raw = localStorage.getItem(getConvKey(userId));
    return raw ? (JSON.parse(raw) as SupportConv) : null;
  } catch { return null; }
}

function saveConv(conv: SupportConv) {
  try {
    localStorage.setItem(getConvKey(conv.userId), JSON.stringify(conv));
    const idx: string[] = JSON.parse(localStorage.getItem('syp-support-user-ids') ?? '[]');
    if (!idx.includes(conv.userId)) {
      idx.unshift(conv.userId);
      localStorage.setItem('syp-support-user-ids', JSON.stringify(idx.slice(0, 200)));
    }
  } catch {}
}

function getOrCreateSessionId(): string {
  let id = localStorage.getItem('syp-guest-session-id');
  if (!id) {
    id = 'guest-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('syp-guest-session-id', id);
  }
  return id;
}

// ─── Smart Bot ────────────────────────────────────────────────────────────────

const BOT_PATTERNS: [RegExp, string][] = [
  [/مرحب|السلام|هلا|أهل|هاي|hi\b|hello/i,
    'أهلاً وسهلاً! أنا مساعد LiraPro الذكي. يمكنني الإجابة على أسئلتك حول أسعار الصرف والذهب والخدمات والحساب. كيف يمكنني مساعدتك؟'],
  [/صباح|مساء/i, 'أهلاً بك! يسعدني خدمتك في أي وقت. ما الذي تودّ الاستفسار عنه؟'],
  [/سعر.*دولار|دولار.*سعر|كم.*دولار|دولار.*اليوم/i,
    'سعر الدولار الأمريكي مقابل الليرة السورية يُعرض في الصفحة الرئيسية ويُحدَّث تلقائياً. يمكنك أيضاً ضبط تنبيه سعر بضغطة واحدة من تفاصيل العملة.'],
  [/سعر|صرف|عملة|ليرة|دولار|يورو|تركي|درهم|ريال|جنيه|عراقي|كويتي|قطري/i,
    'أسعار الصرف الحية متاحة في الصفحة الرئيسية لجميع العملات الرئيسية مقابل الليرة السورية. يُحدَّث السعر كل دقيقة من مصادر موثوقة.'],
  [/ذهب.*عيار|عيار|٢١|٢٤|٢٢|١٨|١٤/i,
    'يمكنك متابعة أسعار الذهب بجميع العيارات (24، 22، 21، 18، 14 قيراط) في تبويب "المعادن". الأسعار تُحدَّث كل 8 ساعات.'],
  [/ذهب|فضة|بلاتين|معدن|مجوهرات|نحاس/i,
    'تبويب "المعادن" يتضمن أسعار الذهب بكل العيارات والفضة والبلاتين والمعادن الصناعية.'],
  [/حوّل|محوّل|تحويل|احسب|كم.*بالليرة|كم.*بالدولار/i,
    'محوّل العملات متاح في تبويب "تحويل" بالشريط السفلي. أدخل المبلغ واختر العملة المصدر والهدف وستحصل على السعر الدقيق فوراً.'],
  [/انضمام.*مورد|عضوية.*مورد|كيف.*انضم|تسجيل.*شركة|مزود.*سعر|سعر.*مورد/i,
    'للانضمام كمزود أسعار:\n١- اذهب لصفحة "العضوية" من القائمة\n٢- أدخل بيانات شركتك\n٣- أرفق الوثائق المطلوبة\n٤- انتظر الموافقة خلال 24-48 ساعة'],
  [/عضوية|مزود|مورد|شركة|تاجر|انضم|بيزنس/i,
    'يمكنك التقدم لعضوية مزود الأسعار من صفحة "العضوية" في القائمة. ستحصل على شارة ذهبية مميزة وستُعرض أسعارك للمستخدمين.'],
  [/محفظة|ممتلكات|رصيد.*ذهب|كم.*ذهب.*عندي/i,
    'ميزة المحفظة الشخصية قيد التطوير وستكون متاحة قريباً.'],
  [/تنبيه|إشعار|نبّه|ابلغني|أعلمني/i,
    'لإعداد تنبيه سعر:\n١- افتح تفاصيل أي عملة أو معدن\n٢- اضغط على زر "إضافة تنبيه"\n٣- حدد السعر الهدف\n\nسيصلك إشعار فوري عند وصول السعر لهدفك!'],
  [/كلمة.*مرور|نسيت.*مرور|تغيير.*مرور|reset.*password/i,
    'لتغيير أو إعادة تعيين كلمة المرور:\n١- اذهب إلى الإعدادات\n٢- اختر "تغيير كلمة المرور"\n٣- ستصلك رسالة بريد إلكتروني برابط التعيين'],
  [/حذف.*حساب|إلغاء.*حساب|مسح.*حساب/i,
    'لطلب حذف الحساب اذهب إلى صفحة الملف الشخصي واضغط "طلب حذف الحساب". سيراجع الفريق طلبك خلال 72 ساعة.'],
  [/صورة.*شخصية|صورة.*حساب|بدّل.*صورة|تغيير.*صورة/i,
    'لتغيير صورتك الشخصية اذهب إلى الملف الشخصي واضغط على صورتك الحالية.'],
  [/سعر.*محلي|سوق.*محلي|تاجر.*سعر|أسعار.*تجار|موردين|محلية/i,
    'أسعار السوق المحلية تظهر في الصفحة الرئيسية من التجار الموثّقين. يمكنك التصفية حسب الفئة والمحافظة.'],
  [/كريبتو|بيتكوين|إيثيريوم|عملة.*رقمية|crypto|bitcoin/i,
    'يمكنك متابعة أسعار العملات الرقمية (بيتكوين، إيثيريوم وغيرها) مقابل الليرة السورية من الصفحة الرئيسية في قسم الكريبتو.'],
  [/وضع.*ليلي|dark mode|تغيير.*ألوان|ألوان.*تطبيق/i,
    'يمكنك تفعيل الوضع الليلي من زر القمر/الشمس في أعلى الشاشة.'],
  [/لغة|عربي|إنجليزي|language|اللغة/i,
    'LiraPro يدعم اللغتين العربية والإنجليزية. يمكنك تغيير اللغة من زر "١" في رأس الصفحة.'],
  [/أرقام|هندي|عربي.*رقم/i,
    'يمكنك اختيار عرض الأرقام بالنظام العربي (١٢٣) أو الغربي (123) من الإعدادات.'],
  [/شارة|توثيق|verified|بادج|تحقق/i,
    'LiraPro يوفر عدة أنواع من شارات التحقق:\n• الشارة الذهبية: للشركات ومزودي الأسعار\n• الشارة الزرقاء: للمستخدمين الموثّقين\n• شارة الإدارة: لفريق الدعم'],
  [/خطأ|مشكلة|لا يعمل|error|بطيء|crash|توقف/i,
    'يؤسفني سماع ذلك! جرّب:\n١- أغلق التطبيق وأعد فتحه\n٢- تحقق من اتصال الإنترنت\n٣- امسح ذاكرة التخزين المؤقت\n\nإذا استمرت المشكلة، يمكنني فتح تذكرة دعم لك.'],
  [/تسجيل.*دخول|لا أستطيع.*دخول|تأكيد.*بريد/i,
    'للمشاكل في تسجيل الدخول:\n١- تحقق من البريد الإلكتروني وكلمة المرور\n٢- تأكد من تفعيل الحساب عبر البريد الإلكتروني\n٣- استخدم "نسيت كلمة المرور"'],
  [/ميزات|خصائص|ماذا.*تعمل|ايش.*فيه/i,
    'LiraPro يوفر:\n• أسعار الصرف الحية\n• أسعار الذهب والمعادن\n• أسعار السوق المحلية\n• محوّل العملات الفوري\n• تنبيهات الأسعار المخصصة\n• شارات التحقق للشركات'],
  [/تواصل.*موظف|دعم.بشري|شخص.حقيق|تذكرة|اتصل.*بنا|تحدث.*شخص/i,
    'بالطبع! سأفتح لك تذكرة دعم وتُرسل فوراً لفريق الدعم البشري للرد عليك قريباً.'],
  [/شكر|شكرا|ممتاز|رائع|أحسنت|thank|thanks|perfect/i,
    'بكل سرور! يسعدني خدمتك دائماً. هل تحتاج شيئاً آخر؟'],
  [/وداع|باي|bye|إلى اللقاء|مع السلامة/i,
    'إلى اللقاء! نتمنى أن تكون تجربتك مع LiraPro ممتازة.'],
];

const ABUSE_RE = /يلعن|شرموط|عاهر|قحبة|كلب\s|حيوان\s|ابن.*زنا|نيك|fuck\b|shit\b|bitch\b|asshole\b|bastard/i;

const FALLBACK = [
  'شكراً لتواصلك معنا. سؤالك مثير للاهتمام! دعني أنقله لفريق الدعم البشري للحصول على إجابة دقيقة.',
  'فهمت ما تقوله. هذا الاستفسار سيُحال لفريق متخصص. عادةً نرد خلال ساعات قليلة.',
  'أعتذر، لم أتمكن من فهم سؤالك بشكل كامل. هل يمكنك إعادة صياغته؟',
  'لا أملك إجابة محددة لهذا السؤال حالياً. سأنقله لفريق الدعم البشري الذي سيرد عليك قريباً.',
];

function getBotResponse(text: string): string {
  for (const [pattern, response] of BOT_PATTERNS) {
    if (pattern.test(text)) return response;
  }
  return FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
}

// ─── Welcome message ──────────────────────────────────────────────────────────

const WELCOME_MSG: SupportMsg = {
  id: 'welcome-v3',
  role: 'bot',
  text: 'أهلاً بك في مركز دعم LiraPro!\n\nأنا مساعد ذكي يمكنني:\n• الإجابة على أسئلتك حول المنصة\n• تحليل الصور التي ترسلها\n• الاستماع لرسائلك الصوتية وتحويلها لنص\n• فتح تذكرة دعم للتواصل مع فريقنا البشري\n\nكيف يمكنني مساعدتك؟',
  timestamp: Date.now() - 1000,
  read: true,
};

// ─── Image Lightbox (must live outside SupportPage to obey Rules of Hooks) ───

function ImageLightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const clamp = (z: number) => Math.min(4, Math.max(1, z));

  // Reset zoom/pan when src changes to null (adjust-state-during-render)
  const [prevSrc, setPrevSrc] = useState<string | null>(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    if (!src) { setZoom(1); setPan({ x: 0, y: 0 }); }
  }

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
    dragging.current = true;
    setIsDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPan({ x: dragStart.current.px + e.clientX - dragStart.current.mx, y: dragStart.current.py + e.clientY - dragStart.current.my });
  };
  const onMouseUp = () => { dragging.current = false; setIsDragging(false); };
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/88 backdrop-blur-sm" onClick={onClose}>
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
          style={{ maxWidth: '88vw', maxHeight: '78vh', cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
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
              transition: isDragging ? 'none' : 'transform 0.12s ease',
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function SupportPage() {
  const { user, isSignedIn } = useUser();
  const { data: profileRaw } = useGetProfile();
  const profile = profileRaw as { firstName?: string; lastName?: string } | undefined;

  const userId = isSignedIn && user?.id ? user.id : getOrCreateSessionId();
  const userName = isSignedIn
    ? (profile?.firstName || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'أنت')
    : 'زائر';

  const convKey = getConvKey(userId);

  const [msgs, setMsgs] = useState<SupportMsg[]>(() => {
    const existing = loadConv(userId);
    return existing?.msgs.length ? existing.msgs : [WELCOME_MSG];
  });
  const [ticketClosed, setTicketClosed] = useState(() => !!loadConv(userId)?.closedAt);
  const [ticketCreated, setTicketCreated] = useState(() => {
    const existing = loadConv(userId);
    return existing?.msgs.some(m => m.isTicketNotice) ?? false;
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [botEnabled, setBotEnabled] = useState(true);
  const [showAIBanner, setShowAIBanner] = useState(() => {
    try { return localStorage.getItem('syp-ai-banner-dismissed') !== 'true'; } catch { return true; }
  });
  const [_guestMsgCount, setGuestMsgCount] = useState(() => {
    if (isSignedIn) return 0;
    try { return parseInt(localStorage.getItem('syp-guest-msg-count') ?? '0', 10); } catch { return 0; }
  });

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [recordingBarHeights] = useState(() => [1, 2, 3, 4, 5, 6, 7, 8].map(() => Math.random() * 16 + 4));
  const [micError, setMicError] = useState('');
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice-to-text (Speech Recognition)
  const [sttActive, setSttActive] = useState(false);
  const sttRef = useRef<ISpeechRecognition | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => {
    const conv: SupportConv = { userId, userName, msgs, lastUpdated: Date.now() };
    saveConv(conv);
  }, [msgs, userId, userName]);

  // Reload conversation when userId changes (e.g., after auth finishes loading)
  const prevUserIdRef = useRef<string>(userId);
  useEffect(() => {
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;
    const existing = loadConv(userId);
    setMsgs(existing?.msgs.length ? existing.msgs : [WELCOME_MSG]);
    setTicketClosed(!!existing?.closedAt);
    setTicketCreated(existing?.msgs.some(m => m.isTicketNotice) ?? false);
    setGuestMsgCount(
      !isSignedIn ? parseInt(localStorage.getItem('syp-guest-msg-count') ?? '0', 10) : 0
    );
  }, [userId, isSignedIn]);

  // Poll for admin replies + closed ticket (localStorage + backend)
  useEffect(() => {
    const poll = () => {
      // localStorage poll for conversation replies (AdminSupportPanel writes here)
      const raw = localStorage.getItem(convKey);
      if (raw) {
        try {
          const conv: SupportConv = JSON.parse(raw);
          if (conv.closedAt && !ticketClosed) {
            setTicketClosed(true);
            addLocalNotification({
              id: Date.now() + 1,
              title: 'تذكرة الدعم مغلقة',
              body: 'تم إغلاق تذكرة دعمك من قبل فريق LiraPro. يمكنك فتح تذكرة جديدة إذا لزم.',
              type: 'info',
              icon: 'support',
              sender: 'فريق LiraPro',
              createdAt: new Date().toISOString(),
            });
          }
          setMsgs(prev => {
            const prevIds = new Set(prev.map(m => m.id));
            const newAdminMsgs = conv.msgs.filter(m => !prevIds.has(m.id) && m.role === 'admin');
            if (newAdminMsgs.length === 0) return prev;
            newAdminMsgs.forEach(m => {
              addLocalNotification({
                id: parseInt(m.id.replace(/\D/g, '').slice(0, 10) || '0') || Date.now(),
                title: `رد من ${m.agentName || 'فريق دعم LiraPro'}`,
                body: m.text.slice(0, 100),
                type: 'success',
                icon: 'support',
                sender: m.agentName || 'فريق LiraPro',
                createdAt: new Date(m.timestamp).toISOString(),
              });
            });
            return conv.msgs;
          });
        } catch {}
      }
    };

    // Backend poll: check ticket status from server (catches admin ticket-panel closures)
    const pollBackend = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`/api/support/my-ticket?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const data = await res.json() as { ticket: { status: string; closedAt?: string }; messages: Array<{ id: string; role: string; text: string; agentName?: string; createdAt: string }> } | null;
        if (!data) return;
        const { ticket, messages: backendMsgs } = data;

        // Ticket closed from backend
        if ((ticket.status === 'closed') && !ticketClosed) {
          setTicketClosed(true);
          addLocalNotification({
            id: Date.now() + 2,
            title: 'تذكرة الدعم مغلقة',
            body: 'تم إغلاق تذكرة دعمك من قبل فريق LiraPro. يمكنك فتح تذكرة جديدة إذا لزم.',
            type: 'info',
            icon: 'support',
            sender: 'فريق LiraPro',
            createdAt: ticket.closedAt ?? new Date().toISOString(),
          });
        }

        // New admin messages from backend
        setMsgs(prev => {
          const prevIds = new Set(prev.map(m => m.id));
          const newAdminMsgs = backendMsgs.filter(m => !prevIds.has(m.id) && m.role === 'admin');
          if (newAdminMsgs.length === 0) return prev;
          newAdminMsgs.forEach(m => {
            addLocalNotification({
              id: parseInt(m.id.replace(/\D/g, '').slice(0, 10) || '0') || Date.now(),
              title: `رد من ${m.agentName || 'فريق دعم LiraPro'}`,
              body: m.text.slice(0, 100),
              type: 'success',
              icon: 'support',
              sender: m.agentName || 'فريق LiraPro',
              createdAt: m.createdAt,
            });
          });
          const newMsgs: SupportMsg[] = newAdminMsgs.map(m => ({
            id: m.id,
            role: 'admin' as const,
            text: m.text,
            timestamp: new Date(m.createdAt).getTime(),
            read: true,
            agentName: m.agentName,
            agentBadge: 'cyberpunk' as const,
            isTicketNotice: false,
          }));
          return [...prev, ...newMsgs];
        });
      } catch {}
    };

    const interval = setInterval(poll, 3000);
    const backendInterval = setInterval(() => void pollBackend(), 8000);
    return () => { clearInterval(interval); clearInterval(backendInterval); };
  }, [convKey, ticketClosed, userId]);

  // ─── Send message ────────────────────────────────────────────────────────

  const sendMessage = useCallback((text: string, attachment?: SupportMsg['attachment']) => {
    if (!text.trim() && !attachment) return;
    if (ticketClosed) return;

    // Guest 3-message limit
    if (!isSignedIn) {
      const currentCount = parseInt(localStorage.getItem('syp-guest-msg-count') ?? '0', 10);
      if (currentCount >= 3) {
        const limitMsg: SupportMsg = {
          id: `guest-limit-${Date.now()}`,
          role: 'bot',
          text: 'لقد وصلت إلى الحد الأقصى للمساعد في وضع الضيف (3 رسائل). يرجى تسجيل الدخول أو إنشاء حساب للاستمرار.',
          timestamp: Date.now(),
          read: true,
          isGuestLimit: true,
        };
        setMsgs(prev => {
          const hasLimit = prev.some(m => m.isGuestLimit);
          return hasLimit ? prev : [...prev, limitMsg];
        });
        return;
      }
      const newCount = currentCount + 1;
      localStorage.setItem('syp-guest-msg-count', String(newCount));
      setGuestMsgCount(newCount);
    }

    setSending(true);

    const userMsg: SupportMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
      ...(attachment ? { attachment } : {}),
    };

    setMsgs(prev => [...prev, userMsg]);
    setInput('');

    // Abuse detection
    if (text && ABUSE_RE.test(text)) {
      setTimeout(() => {
        const abuseMsg: SupportMsg = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          text: 'تم رصد كلام غير لائق في رسالتك. تم إغلاق هذه المحادثة تلقائياً. يمكنك مسح المحادثة وإعادة المحاولة بأسلوب محترم.',
          timestamp: Date.now() + 1,
          read: true,
        };
        setMsgs(prev => {
          const updated = [...prev, abuseMsg];
          saveConv({ userId, userName, msgs: updated, closedAt: Date.now(), lastUpdated: Date.now() });
          return updated;
        });
        setTicketClosed(true);
        setSending(false);
      }, 500);
      return;
    }

    // Ticket auto-creation
    if (text && TICKET_REQUEST_RE.test(text) && !ticketCreated) {
      (async () => {
        const userEmail = isSignedIn ? user?.email ?? undefined : undefined;
        const result = await createTicketBackend(userId, userName, text.slice(0, 200), userEmail);
        if (result.success || result.alreadyOpen) {
          setTicketCreated(true);
          const ticketNum = (result.ticketId ?? Date.now().toString()).slice(-6);
          const ticketMsg: SupportMsg = {
            id: `ticket-notice-${Date.now()}`,
            role: 'bot',
            text: result.alreadyOpen
              ? 'لديك تذكرة دعم مفتوحة بالفعل. سيتواصل معك فريقنا قريباً.'
              : `تم فتح تذكرة دعم برقم #${ticketNum} وأُرسلت لفريق الدعم البشري. سيتواصل معك أحد موظفينا قريباً.`,
            timestamp: Date.now() + 2,
            read: true,
            isTicketNotice: true,
          };
          setMsgs(prev => [...prev, ticketMsg]);
          setSending(false);
        }
      })();
      return;
    }

    if (attachment?.type !== 'voice' && botEnabled) {
      const history = msgs.filter(m => m.role === 'user' || m.role === 'bot').slice(-9).map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text,
      }));
      history.push({ role: 'user', content: text });

      (async () => {
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const resp = await fetch('/api/support/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({ messages: history }),
          });
          if (!resp.ok) throw new Error('api error');
          const { text: botText } = await resp.json() as { text: string };
          setMsgs(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            text: botText || getBotResponse(text),
            timestamp: Date.now() + 1,
            read: true,
          }]);
        } catch {
          setMsgs(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            text: getBotResponse(text),
            timestamp: Date.now() + 1,
            read: true,
          }]);
        } finally {
          setSending(false);
        }
      })();
    } else {
      setSending(false);
    }
  }, [ticketClosed, botEnabled, userId, userName, msgs, ticketCreated, isSignedIn, user?.email]);

  const handleSend = () => { if (input.trim()) sendMessage(input); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── Image upload + AI analysis ─────────────────────────────────────────

  const handleImageAnalysis = useCallback((file: File) => {
    // Guest limit check
    if (!isSignedIn) {
      const currentCount = parseInt(localStorage.getItem('syp-guest-msg-count') ?? '0', 10);
      if (currentCount >= 3) {
        setMsgs(prev => {
          const hasLimit = prev.some(m => m.isGuestLimit);
          if (hasLimit) return prev;
          return [...prev, {
            id: `guest-limit-${Date.now()}`,
            role: 'bot' as const,
            text: 'لقد وصلت إلى الحد الأقصى للمساعد في وضع الضيف (3 رسائل). يرجى تسجيل الدخول أو إنشاء حساب للاستمرار.',
            timestamp: Date.now(),
            read: true,
            isGuestLimit: true,
          }];
        });
        return;
      }
      const newCount = currentCount + 1;
      localStorage.setItem('syp-guest-msg-count', String(newCount));
      setGuestMsgCount(newCount);
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      const mimeType = (file.type || 'image/jpeg') as string;

      const userMsg: SupportMsg = {
        id: Date.now().toString(),
        role: 'user',
        text: '',
        timestamp: Date.now(),
        attachment: { type: 'image', name: file.name, audioUrl: dataUrl },
      };
      setMsgs(prev => [...prev, userMsg]);
      setSending(true);

      (async () => {
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const history = msgs.filter(m => m.role === 'user' || m.role === 'bot').slice(-4).map(m => ({
            role: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: m.text,
          }));

          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const resp = await fetch('/api/support/chat-image', {
            method: 'POST',
            headers,
            body: JSON.stringify({ imageBase64: base64, mediaType: mimeType, messages: history }),
          });
          if (!resp.ok) throw new Error('api error');
          const { text: botText } = await resp.json() as { text: string };
          setMsgs(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            text: botText || 'وصلتني الصورة! يمكنك شرح ما تودّ الاستفسار عنه.',
            timestamp: Date.now() + 1,
            read: true,
          }]);
        } catch {
          setMsgs(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            text: 'وصلتني صورتك! لكن واجهت مشكلة في التحليل حالياً. صف لي ما في الصورة وسأساعدك.',
            timestamp: Date.now() + 1,
            read: true,
          }]);
        } finally {
          setSending(false);
        }
      })();
    };
    reader.readAsDataURL(file);
  }, [msgs, isSignedIn]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (isImage) {
      handleImageAnalysis(file);
    } else {
      sendMessage(`[ملف: ${file.name}]`, { type: 'file', name: file.name });
    }
  };

  // ─── Voice-to-text (STT) ─────────────────────────────────────────────────

  const startVoiceInput = () => {
    setMicError('');
    const w = window as Window & {
      SpeechRecognition?: ISpeechRecognitionCtor;
      webkitSpeechRecognition?: ISpeechRecognitionCtor;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      startRecording();
      return;
    }
    const rec = new SR();
    sttRef.current = rec;
    rec.lang = 'ar';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: ISpeechRecognitionEvent) => {
      const text = e.results[0]?.[0]?.transcript ?? '';
      if (text) {
        setInput(prev => (prev ? prev + ' ' + text : text).trim());
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    rec.onend = () => setSttActive(false);
    rec.onerror = () => { setSttActive(false); };
    rec.start();
    setSttActive(true);
  };

  const stopVoiceInput = () => {
    sttRef.current?.stop();
    setSttActive(false);
  };

  // ─── Audio recording ─────────────────────────────────────────────────────

  const startRecording = async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const secs = recordSecs;
        const _mm = Math.floor(secs / 60).toString().padStart(2, '0');
        const _ss = (secs % 60).toString().padStart(2, '0');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          sendMessage('', {
            type: 'voice',
            name: `voice_${Date.now()}.webm`,
            duration: secs,
            audioUrl: reader.result as string,
          });
        };
        reader.readAsDataURL(blob);
        setRecordSecs(0);
      };
      mr.start();
      setIsRecording(true);
      recTimerRef.current = setInterval(() => setRecordSecs(s => s + 1), 1000);
    } catch {
      setMicError('لم يتم منح إذن الميكروفون. يرجى السماح بالوصول إلى الميكروفون.');
    }
  };

  const stopRecording = (send = true) => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (mediaRecRef.current?.state === 'recording') {
      if (!send) {
        mediaRecRef.current.ondataavailable = null;
        mediaRecRef.current.onstop = null;
        mediaRecRef.current.stream?.getTracks().forEach(t => t.stop());
        mediaRecRef.current.stop();
      } else {
        mediaRecRef.current.stop();
      }
    }
    setIsRecording(false);
    setRecordSecs(0);
  };

  const clearChat = () => {
    const reset = [WELCOME_MSG];
    setMsgs(reset);
    setTicketClosed(false);
    setTicketCreated(false);
    const conv: SupportConv = { userId, userName, msgs: reset, lastUpdated: Date.now() };
    saveConv(conv);
  };

  const rateMsg = useCallback((msgId: string, rating: 'up' | 'down') => {
    setMsgs(prev => prev.map(m => m.id === msgId ? { ...m, rating: m.rating === rating ? undefined : rating } : m));
  }, []);

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
  }

  const fmtSecs = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] max-h-[700px]" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-card rounded-t-2xl flex-shrink-0">
        <button
          onClick={() => window.history.back()}
          className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          title="رجوع"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">دعم LiraPro</p>
          <p className={`text-[10px] font-medium ${botEnabled ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {botEnabled ? 'مساعد ذكي · يرد فوراً' : 'وضع الدعم البشري · قيد الانتظار'}
          </p>
        </div>
        <button
          onClick={() => setBotEnabled(b => !b)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            botEnabled
              ? 'bg-secondary/50 text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
          }`}
          title={botEnabled ? 'تحويل للدعم البشري' : 'تفعيل المساعد الذكي'}
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={clearChat}
          className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="مسح المحادثة"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* AI info banner — dismissible */}
      {showAIBanner && (
        <div className="flex-shrink-0 mx-3 mt-2 rounded-xl border border-blue-200 dark:border-blue-800/50 px-3 py-2.5 flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20">
          <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed flex-1">
            يمكنك تعطيل المساعد الذكي بالضغط على زر <PhoneOff className="w-2.5 h-2.5 inline mb-0.5" /> لإرسال رسائلك مباشرةً لفريق الدعم البشري.
          </p>
          <button
            onClick={() => { setShowAIBanner(false); try { localStorage.setItem('syp-ai-banner-dismissed', 'true'); } catch {} }}
            className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Guest mode banner */}
      {!isSignedIn && (
        <div className="flex-shrink-0 mx-3 mt-2 rounded-xl border border-primary/25 px-3 py-3 flex flex-col gap-2.5"
          style={{ background: 'linear-gradient(135deg, hsl(162,100%,12%,0.06), hsl(162,75%,46%,0.04))' }}>
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
            <p className="text-xs font-bold text-primary">إمكانية المساعد في وضع الضيف محدودة (3 رسائل)</p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            يرجى التسجيل أو تسجيل الدخول للحصول على تجربة كاملة وحفظ سجل المحادثة.
          </p>
          <div className="flex gap-2">
            <Link href="/sign-in" className="flex-1 h-8 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
              <LogIn className="w-3 h-3" />
              تسجيل الدخول
            </Link>
            <Link href="/sign-up" className="flex-1 h-8 border border-primary text-primary text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-primary/5 transition-colors">
              <UserPlus className="w-3 h-3" />
              إنشاء حساب
            </Link>
          </div>
        </div>
      )}

      {/* Human support mode banner */}
      {!botEnabled && !ticketClosed && (
        <div className="flex-shrink-0 mx-3 mt-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-3 py-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
          <PhoneOff className="w-3.5 h-3.5 flex-shrink-0" />
          المساعد الذكي معطّل · رسائلك مرسلة لفريق الدعم البشري وستُجاب قريباً
        </div>
      )}

      {/* Ticket created banner */}
      {ticketCreated && !ticketClosed && (
        <div className="flex-shrink-0 mx-3 mt-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 px-3 py-2 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 font-medium">
          <TicketCheck className="w-3.5 h-3.5 flex-shrink-0" />
          تذكرة دعم مفتوحة · فريق الدعم البشري سيتواصل معك
        </div>
      )}

      {/* Ticket closed banner */}
      {ticketClosed && (
        <div className="flex-shrink-0 mx-3 mt-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-3 py-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          تم إغلاق هذه التذكرة · يمكنك مسح المحادثة لفتح تذكرة جديدة
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 bg-secondary/20">
        <AnimatePresence initial={false}>
          {msgs.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              {/* Ticket notice — centered */}
              {msg.isTicketNotice ? (
                <div className="flex justify-center my-1">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold border border-blue-200 dark:border-blue-700/40">
                    <TicketCheck className="w-3 h-3" />
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {msg.role === 'admin' ? (
                    <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 28, height: 28, overflow: 'visible', position: 'relative' }}>
                      <ChatBadge badge={msg.agentBadge ?? 'cyberpunk'} size={22} />
                    </div>
                  ) : (
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                      msg.role === 'bot' ? 'bg-primary/10' : 'bg-secondary'
                    }`}>
                      {msg.role === 'bot'  && <Bot className="w-3.5 h-3.5 text-primary" />}
                      {msg.role === 'user' && <User className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`flex flex-col gap-0.5 max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.role === 'user' && (
                      <div className="flex items-center gap-1 mb-0.5 justify-end">
                        <span className="text-[9px] font-bold text-foreground/50">{userName}</span>
                        {isSignedIn && <BlueBadge size={10} />}
                      </div>
                    )}
                    {msg.role === 'admin' && (
                      <div className="flex items-center gap-1.5 mb-0.5" style={{ overflow: 'visible' }}>
                        <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400">
                          {msg.agentName || 'فريق دعم LiraPro'}
                        </span>
                        <span style={{ overflow: 'visible', display: 'inline-flex' }}>
                          <ChatBadge badge={msg.agentBadge ?? 'cyberpunk'} size={13} />
                        </span>
                      </div>
                    )}
                    {msg.role === 'bot' && (
                      <span className="text-[9px] text-muted-foreground px-1 font-medium">مساعد LiraPro</span>
                    )}

                    {msg.isGuestLimit ? (
                      <div className="flex flex-col gap-2 px-3 py-2.5 rounded-2xl rounded-br-sm bg-card border border-border max-w-[260px]">
                        <p className="text-[11px] text-foreground/70 leading-relaxed">{msg.text}</p>
                        <div className="flex gap-1.5">
                          <Link href="/sign-in" className="flex-1 h-7 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 hover:opacity-90 transition-opacity">
                            <LogIn className="w-2.5 h-2.5" /> تسجيل الدخول
                          </Link>
                          <Link href="/sign-up" className="flex-1 h-7 border border-primary text-primary text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-primary/5 transition-colors">
                            <UserPlus className="w-2.5 h-2.5" /> إنشاء حساب
                          </Link>
                        </div>
                      </div>
                    ) : (
                    <div className={`rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-bl-sm'
                        : msg.role === 'admin'
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-foreground border border-purple-200 dark:border-purple-800/50 rounded-br-sm'
                        : 'bg-card border border-border rounded-br-sm'
                    } ${msg.attachment?.type === 'voice' ? 'overflow-hidden' : 'px-3 py-2 whitespace-pre-wrap'}`}>
                      {msg.attachment && (
                        <>
                          {msg.attachment.type === 'voice' && msg.attachment.audioUrl ? (
                            <VoicePlayer src={msg.attachment.audioUrl} duration={msg.attachment.duration} isUser={msg.role === 'user'} />
                          ) : msg.attachment.type === 'image' && msg.attachment.audioUrl ? (
                            <div className="mb-1">
                              <img
                                src={msg.attachment.audioUrl}
                                alt={msg.attachment.name}
                                className="max-h-44 max-w-[220px] rounded-xl object-cover cursor-pointer border border-border/50 hover:opacity-90 transition-opacity"
                                onClick={() => setLightboxSrc(msg.attachment!.audioUrl!)}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">
                              {msg.attachment.type === 'file' && <Paperclip className="w-3 h-3" />}
                              <span className="truncate max-w-[130px]">{msg.attachment.name}</span>
                            </div>
                          )}
                        </>
                      )}
                      {msg.text && msg.attachment?.type !== 'voice' && msg.text}
                    </div>
                    )}

                    <div className="flex items-center gap-1 px-1">
                      <span className="text-[9px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                      {msg.role === 'user' && <CheckCheck className="w-3 h-3 text-primary/60" />}
                      {(msg.role === 'bot' || msg.role === 'admin') && !msg.isTicketNotice && !msg.isGuestLimit && (
                        <div className="flex items-center gap-0.5 mr-1">
                          <button
                            onClick={() => rateMsg(msg.id, 'up')}
                            title="رد مفيد"
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                              msg.rating === 'up'
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                                : 'text-muted-foreground/40 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                          >
                            <ThumbsUp className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => rateMsg(msg.id, 'down')}
                            title="رد غير مفيد"
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                              msg.rating === 'down'
                                ? 'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400'
                                : 'text-muted-foreground/40 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                          >
                            <ThumbsDown className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bot typing */}
        {sending && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="px-3 py-2.5 rounded-2xl rounded-br-sm bg-card border border-border">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary/60"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-border bg-card p-2 rounded-b-2xl">

        {micError && (
          <div className="text-[10px] text-red-500 px-2 mb-1.5 flex items-center gap-1">
            <X className="w-3 h-3 flex-shrink-0" />
            {micError}
          </div>
        )}

        {/* STT active indicator */}
        {sttActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800/50"
          >
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span className="text-xs font-bold text-green-600 dark:text-green-400 flex-1">جارٍ الاستماع... تحدث الآن</span>
            <button onClick={stopVoiceInput} className="text-muted-foreground hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/50"
          >
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <div className="flex gap-0.5 items-center flex-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <motion.div
                  key={i}
                  className="w-0.5 rounded-full bg-red-500"
                  animate={{ height: [4, recordingBarHeights[i - 1], 4] }}
                  transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.05, ease: 'easeInOut' }}
                />
              ))}
            </div>
            <span className="text-xs font-black text-red-600 tabular-nums">{fmtSecs(recordSecs)}</span>
            <button onClick={() => stopRecording(false)} className="text-muted-foreground hover:text-red-500 transition-colors" title="إلغاء">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        <div className="flex items-end gap-1.5">
          {/* Attachment buttons */}
          {!isRecording && !sttActive && !ticketClosed && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => imageRef.current?.click()}
                className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="إرسال صورة للتحليل"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="إرفاق ملف"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Text input */}
          {!isRecording && !sttActive && (
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={ticketClosed ? 'التذكرة مغلقة · امسح المحادثة لفتح جديدة' : !botEnabled ? 'اكتب رسالتك للدعم البشري...' : 'اكتب رسالتك...'}
                disabled={ticketClosed}
                rows={1}
                className="w-full resize-none rounded-2xl border border-border bg-secondary/40 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary max-h-28 overflow-y-auto disabled:opacity-50"
                style={{ minHeight: 36 }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 112) + 'px';
                }}
              />
            </div>
          )}

          {/* Send / voice */}
          {!ticketClosed && (
            isRecording ? (
              <button
                onClick={() => stopRecording(true)}
                className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0 active:scale-95 transition-transform"
                title="إرسال الرسالة الصوتية"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : sttActive ? (
              <button
                onClick={stopVoiceInput}
                className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center text-white flex-shrink-0 active:scale-95 transition-transform"
                title="إيقاف الاستماع"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : input.trim() ? (
              <button
                onClick={handleSend}
                disabled={sending}
                className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0 active:scale-95 transition-transform"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={startVoiceInput}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors bg-secondary/60 text-muted-foreground hover:text-primary hover:bg-primary/10"
                title="تسجيل رسالة صوتية"
              >
                <Mic className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, true)} />
      <input ref={fileRef} type="file" accept="*/*" className="hidden" onChange={e => handleFile(e, false)} />

      {/* Image Lightbox */}
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
