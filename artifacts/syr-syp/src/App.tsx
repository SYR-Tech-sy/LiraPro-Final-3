import React, { lazy, Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, Link } from 'wouter';
import { QueryClientProvider, QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Moon, Sun, Menu, User, ArrowLeftRight, Home as HomeIcon, Gem, Coins, Settings, Shield, Info, LogOut, BarChart2, Bell, Wallet, Bitcoin, RefreshCw, CreditCard, Building2, Landmark, Store, ShieldX, Clock, Trash2, HelpCircle, MessageSquare } from 'lucide-react';
import { LandingSimCard } from '@/components/landing-sim-card';
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "next-themes";
import { AppProvider, useApp } from '@/context/app-context';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth, useUser } from '@/context/auth-context';
import { setAuthTokenGetter, useGetExchangeRates } from '@workspace/api-client-react';
import { GuestModal } from '@/components/guest-modal';
import { NotificationsPanel } from '@/components/notifications-panel';
import { AnimatedLogo } from '@/components/animated-logo';
import { OfflineBar } from '@/components/offline-bar';
import { FloatingAiButton } from '@/components/floating-ai-button';
import { saveQueryToCache, loadCachedQueries } from '@/lib/offline-cache';

const ANIM_DONE = 1.0;

// Seed QueryClient with cached data for instant offline display
const cachedEntries = loadCachedQueries();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
      // On slow/offline connections: show cached data, retry in background
      retry: (failureCount, _error) => {
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      // Show stale cached data while revalidating
      placeholderData: (prev: unknown) => prev,
    },
  },
});

// Pre-populate cache with offline data
cachedEntries.forEach(({ queryKey, data }) => {
  queryClient.setQueryData(queryKey, data);
});

// Persist successful query results to localStorage for offline use
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.query.state.status === 'success') {
    saveQueryToCache(event.query.queryKey as unknown[], event.query.state.data);
  }
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const PageLoader = () => (
  <div className="flex flex-col gap-4 p-4">
    <Skeleton className="h-24 w-full rounded-xl" />
    <Skeleton className="h-20 w-full rounded-xl" />
    <Skeleton className="h-20 w-full rounded-xl" />
  </div>
);

const HomePage = lazy(() => import('./pages/home'));
const ConverterPage = lazy(() => import('./pages/converter'));
const MetalsPage = lazy(() => import('./pages/metals'));
const CurrenciesPage = lazy(() => import('./pages/currencies'));
const ProfilePage = lazy(() => import('./pages/profile'));
const CurrencyDetailPage = lazy(() => import('./pages/currency-detail'));
const GoldDetailPage = lazy(() => import('./pages/gold-detail'));
const MetalDetailPage = lazy(() => import('./pages/metal-detail'));
const SettingsPage = lazy(() => import('./pages/settings'));
const WalletPage = lazy(() => import('./pages/wallet'));
const MarketPage = lazy(() => import('./pages/market'));
const AlertsPage = lazy(() => import('./pages/alerts'));
const CryptoPage = lazy(() => import('./pages/crypto'));
const PrivacyPage = lazy(() => import('./pages/privacy'));
const AboutPage = lazy(() => import('./pages/about'));
const AdminPage = lazy(() => import('./pages/admin'));
const ServicesOnboardingPage = lazy(() => import('./pages/services-onboarding'));
const MarketEconomyPage = lazy(() => import('./pages/market-economy'));
const MembershipPage = lazy(() => import('./pages/membership'));
const SupportPage = lazy(() => import('./pages/support'));
const VendorDashboardPage = lazy(() => import('./pages/vendor-dashboard'));
const BusinessProfilePage = lazy(() => import('./pages/business-profile'));
const MarketPriceDetailPage = lazy(() => import('./pages/market-price-detail'));
const SignInPageLazy = lazy(() => import('./pages/sign-in'));
const SignUpPageLazy = lazy(() => import('./pages/sign-up'));
const ForgotPasswordPageLazy = lazy(() => import('./pages/forgot-password'));
const FaqPage = lazy(() => import('./pages/faq'));

function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      dir="ltr"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center flex-shrink-0 ${isDark ? 'bg-primary' : 'bg-gray-200'}`}
    >
      <span className={`absolute flex items-center justify-center w-5 h-5 rounded-full shadow-md bg-white transition-all duration-300 ${isDark ? 'translate-x-[26px]' : 'translate-x-[2px]'}`}>
        {isDark ? <Moon className="w-3 h-3 text-primary" /> : <Sun className="w-3 h-3 text-yellow-500" />}
      </span>
    </button>
  );
}

function NumberFormatToggle() {
  const { numberFormat, setNumberFormat } = useApp();
  const isArabic = numberFormat === 'arabic';
  return (
    <button
      dir="ltr"
      onClick={() => setNumberFormat(isArabic ? 'english' : 'arabic')}
      className={`relative w-14 h-6 rounded-full transition-colors duration-300 flex items-center flex-shrink-0 ${isArabic ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
      title={isArabic ? 'تحويل للأرقام الإنجليزية' : 'تحويل للأرقام العربية'}
    >
      <span className={`absolute text-[8px] font-bold leading-none pointer-events-none select-none transition-all duration-300 ${isArabic ? 'left-1.5 text-white/70' : 'right-1.5 text-gray-400 dark:text-gray-500'}`}>
        {isArabic ? '١٢٣' : '123'}
      </span>
      <span className={`absolute flex items-center justify-center w-5 h-5 rounded-full shadow-md bg-white transition-all duration-300 text-[9px] font-black select-none ${isArabic ? 'translate-x-[34px] text-primary' : 'translate-x-[2px] text-gray-400 dark:text-gray-500'}`}>
        {isArabic ? '١' : '1'}
      </span>
    </button>
  );
}

function GreetingBar() {
  const { language } = useApp();
  const { user, isSignedIn, getToken } = useUser();
  const ar = language === 'ar';
  const h = new Date().getHours();
  const { data: profileData } = useQuery({
    queryKey: ['greeting-profile', user?.id],
    queryFn: async () => {
      const tok = await getToken();
      if (!tok) return null;
      const res = await fetch('/api/v2/profile', { headers: { Authorization: `Bearer ${tok}` } });
      if (!res.ok) return null;
      return res.json() as Promise<{ firstName?: string }>;
    },
    enabled: !!isSignedIn,
    staleTime: 0,
  });
  const profileFirstName = profileData?.firstName ?? '';

  const greeting = (() => {
    if (ar) {
      if (h >= 5 && h < 12) return 'صباح الخير';
      if (h >= 12 && h < 17) return 'طاب يومك';
      if (h >= 17 && h < 22) return 'مساء الخير';
      return 'طابت ليلتك';
    }
    if (h >= 5 && h < 12) return 'Good Morning';
    if (h >= 12 && h < 17) return 'Good Afternoon';
    if (h >= 17 && h < 22) return 'Good Evening';
    return 'Good Night';
  })();

  const isDay = h >= 5 && h < 17;
  const isEvening = h >= 17 && h < 22;
  const iconColor = isDay ? '#EAB308' : isEvening ? '#f59e0b' : '#818cf8';
  const WeatherIcon = isDay ? Sun : Moon;

  const firstName = isSignedIn
    ? ((user?.user_metadata?.first_name as string | undefined)
        || (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
        || profileFirstName
        || '')
    : '';

  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={isDay ? { rotate: [0, 8, -8, 0] } : { scale: [1, 1.12, 1] }}
        transition={{ duration: isDay ? 5 : 3, repeat: Infinity, ease: 'easeInOut' }}
        className="flex-shrink-0"
      >
        <WeatherIcon className="w-5 h-5" style={{ color: iconColor }} />
      </motion.div>
      <div className="flex flex-col items-center leading-none gap-0.5">
        <span className="text-sm font-bold text-foreground">{greeting}</span>
        {firstName && (
          <span className="text-xs font-bold truncate max-w-[90px]" style={{ color: '#D20073' }} dir="rtl">
            {firstName}
          </span>
        )}
      </div>
    </div>
  );
}

function useVendorInfo() {
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();

  const { data: vendorData } = useQuery({
    queryKey: ['vendor-status', isSignedIn],
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        localStorage.removeItem('syp-vendor-biz');
        return { isVendor: false, businessName: '' };
      }
      try {
        const res = await fetch('/api/vendor/profile', {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json() as { businessName: string };
          const biz = data.businessName ?? '';
          localStorage.setItem('syp-vendor-biz', biz);
          return { isVendor: true, businessName: biz };
        } else if (res.status === 404) {
          // Try to recover via email-based linking
          try {
            const linkRes = await fetch('/api/vendor/link-by-email', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            if (linkRes.ok) {
              const linked = await linkRes.json() as { businessName?: string };
              const biz = linked.businessName ?? '';
              localStorage.setItem('syp-vendor-biz', biz);
              return { isVendor: true, businessName: biz };
            }
          } catch { /* link failed */ }
          localStorage.removeItem('syp-vendor-biz');
          return { isVendor: false, businessName: '' };
        } else {
          localStorage.removeItem('syp-vendor-biz');
          return { isVendor: false, businessName: '' };
        }
      } catch {
        const cached = localStorage.getItem('syp-vendor-biz');
        return cached != null ? { isVendor: true, businessName: cached } : { isVendor: false, businessName: '' };
      }
    },
    enabled: !!isSignedIn,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev: { isVendor: boolean; businessName: string } | undefined) => prev,
  });

  useEffect(() => {
    const onApproved = () => {
      void queryClient.invalidateQueries({ queryKey: ['vendor-status'] });
    };
    document.addEventListener('syp-vendor-approved', onApproved);
    return () => document.removeEventListener('syp-vendor-approved', onApproved);
  }, [queryClient]);

  const isVendor = isSignedIn ? (vendorData?.isVendor ?? !!localStorage.getItem('syp-vendor-biz')) : false;
  const businessName = isSignedIn ? (vendorData?.businessName ?? localStorage.getItem('syp-vendor-biz') ?? '') : '';

  return { isVendor, businessName };
}

function Header() {
  const { signOut } = useAuth();
  const { t } = useApp();
  const [location, navigate] = useLocation();
  const strippedLoc = stripBase(location);
  const { isSignedIn } = useUser();
  const { isVendor, businessName } = useVendorInfo();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestFeature, setGuestFeature] = useState('');

  function guardedNavigate(path: string, feature: string) {
    if (!isSignedIn) {
      setGuestFeature(feature);
      setShowGuestModal(true);
    } else {
      navigate(path);
    }
  }

  function isActivePath(path: string) {
    return strippedLoc === path || strippedLoc.startsWith(path + '/');
  }

  function menuItemClass(path: string) {
    const active = isActivePath(path);
    return `flex items-center gap-2 ${active ? 'text-[#D20073] font-bold bg-[#D20073]/8' : ''}`;
  }

  return (
    <>
      <header
        dir="ltr"
        className="fixed top-0 left-0 right-0 h-14 bg-card border-b z-50 px-3 flex items-center justify-between"
      >
        <div className="flex items-center flex-shrink-0">
          <DarkModeToggle />
        </div>

        <div className="flex-1 flex justify-center">
          <GreetingBar />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <NumberFormatToggle />
          <NotificationsPanel />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 flex-shrink-0">
                <Menu className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className={menuItemClass('/app/market')} onClick={() => navigate('/app/market')}>
                <BarChart2 className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{t('marketDashboard')}</span>
                {isActivePath('/app/market') && <span className="w-1.5 h-1.5 rounded-full bg-[#D20073] flex-shrink-0" />}
              </DropdownMenuItem>
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground cursor-default select-none">
                <Landmark className="w-4 h-4 flex-shrink-0" />
                <span>الأسواق والاقتصاد</span>
                <span className="mr-auto text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">قريباً</span>
              </div>
              {isVendor && (
                <DropdownMenuItem className={menuItemClass('/app/vendor')} onClick={() => navigate('/app/vendor')}>
                  <Store className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-normal leading-tight flex-1">لوحة تحكم / {businessName}</span>
                  {isActivePath('/app/vendor') && <span className="w-1.5 h-1.5 rounded-full bg-[#D20073] flex-shrink-0" />}
                </DropdownMenuItem>
              )}
              {!isVendor && (
                <DropdownMenuItem className={menuItemClass('/app/membership')} onClick={() => guardedNavigate('/app/membership', 'طلب عضوية الإعلان عن الأسعار')}>
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">طلب عضوية الإعلان عن الأسعار</span>
                  {isActivePath('/app/membership') && <span className="w-1.5 h-1.5 rounded-full bg-[#D20073] flex-shrink-0" />}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className={menuItemClass('/app/crypto')} onClick={() => navigate('/app/crypto')}>
                <Bitcoin className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{t('cryptoCurrencies')}</span>
                {isActivePath('/app/crypto') && <span className="w-1.5 h-1.5 rounded-full bg-[#D20073] flex-shrink-0" />}
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClass('/app/alerts')} onClick={() => guardedNavigate('/app/alerts', t('priceAlerts'))}>
                <Bell className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{t('priceAlerts')}</span>
                {isActivePath('/app/alerts') && <span className="w-1.5 h-1.5 rounded-full bg-[#D20073] flex-shrink-0" />}
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClass('/app/wallet')} onClick={() => guardedNavigate('/app/wallet', t('wallet'))}>
                <Wallet className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{t('wallet')}</span>
                {isActivePath('/app/wallet') && <span className="w-1.5 h-1.5 rounded-full bg-[#D20073] flex-shrink-0" />}
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClass('/app/settings')} onClick={() => navigate('/app/settings')}>
                <Settings className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{t('settings')}</span>
                {isActivePath('/app/settings') && <span className="w-1.5 h-1.5 rounded-full bg-[#D20073] flex-shrink-0" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={menuItemClass('/app/privacy')} onClick={() => navigate('/app/privacy')}>
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{t('privacy')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClass('/app/faq')} onClick={() => navigate('/app/faq')}>
                <HelpCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">الأسئلة الشائعة</span>
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClass('/app/support')} onClick={() => navigate('/app/support')}>
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">مركز الدعم</span>
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClass('/app/about')} onClick={() => navigate('/app/about')}>
                <Info className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{t('about')}</span>
              </DropdownMenuItem>
              {isSignedIn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2 text-destructive" onClick={() => signOut()}>
                    <LogOut className="w-4 h-4" /> {t('signOut')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <GuestModal open={showGuestModal} onClose={() => setShowGuestModal(false)} feature={guestFeature} />
    </>
  );
}

function BottomNav() {
  const [location] = useLocation();
  const strippedLoc = stripBase(location);
  const { t } = useApp();

  const navItems = [
    { path: '/app/profile', icon: User, label: t('profile') },
    { path: '/app/converter', icon: ArrowLeftRight, label: t('converter') },
    { path: '/app/home', icon: HomeIcon, label: t('home'), isMain: true },
    { path: '/app/metals', icon: Gem, label: t('metals') },
    { path: '/app/currencies', icon: Coins, label: t('currencies') },
  ];

  const isActiveNav = (path: string) =>
    strippedLoc === path || strippedLoc.startsWith(path + '/');

  const isInAppSection = strippedLoc.startsWith('/app/');
  if (!isInAppSection) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/60"
      style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.07)' }}
    >
      <div className="flex items-end h-16 max-w-md mx-auto px-1">
        {navItems.map((item) => {
          const isActive = isActiveNav(item.path);
          const Icon = item.icon;

          if (item.isMain) {
            return (
              <Link
                key={item.path}
                href={item.path}
                className="flex-1 flex flex-col items-center justify-end pb-2"
              >
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  className="w-12 h-12 -mt-4 rounded-2xl flex items-center justify-center bg-primary"
                  style={{ boxShadow: '0 6px 20px rgba(0,60,50,0.45)' }}
                >
                  <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </motion.div>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex-1 flex flex-col items-center justify-end pb-1.5 gap-1"
            >
              <motion.div
                className="relative flex items-center justify-center rounded-xl transition-all duration-200"
                style={{
                  width: 42,
                  height: 34,
                  background: isActive ? 'rgba(210,0,115,0.11)' : 'transparent',
                }}
                whileTap={{ scale: 0.82 }}
              >
                <Icon
                  style={{
                    width: 20,
                    height: 20,
                    color: isActive ? '#D20073' : 'hsl(var(--muted-foreground))',
                    strokeWidth: isActive ? 2.5 : 1.8,
                  }}
                />
                {isActive && (
                  <motion.div
                    layoutId="nav-pill-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2"
                    style={{ width: 18, height: 3, borderRadius: 2, background: '#D20073' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </motion.div>
              <span
                className="text-[10px] leading-none font-semibold"
                style={{ color: isActive ? '#D20073' : 'hsl(var(--muted-foreground))' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-16 pt-14">
      <Header />
      <OfflineBar />
      <main className="p-4 max-w-md mx-auto w-full">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </main>
      <BottomNav />
    </div>
  );
}

/* ── Live exchange-rate ticker ────────────────────────────────────── */
const TICKER_FALLBACK = [
  { code: 'USD', flag: '🇺🇸', rate: 13500, change:  0.00 },
  { code: 'EUR', flag: '🇪🇺', rate: 14800, change:  0.00 },
  { code: 'TRY', flag: '🇹🇷', rate:   355, change:  0.00 },
  { code: 'GBP', flag: '🇬🇧', rate: 17100, change:  0.00 },
  { code: 'AED', flag: '🇦🇪', rate:  3675, change:  0.00 },
];

interface TickerRow { code: string; flag: string; rate: number; change: number }

function CurrencyTickerBoard() {
  const { data: ratesData } = useGetExchangeRates();

  const baseRows = useMemo<TickerRow[]>(() => {
    const api = ratesData as unknown as { rates?: Record<string, number>; usd_to_syp?: number; try_to_syp?: number } | undefined;
    const usd = api?.usd_to_syp;
    const fx  = api?.rates;
    if (!usd || !fx) return TICKER_FALLBACK.map(r => ({ ...r }));
    return [
      { code: 'USD', flag: '🇺🇸', rate: Math.round(usd),                                                    change: 0 },
      { code: 'EUR', flag: '🇪🇺', rate: Math.round(fx['EUR'] ? usd / fx['EUR'] : 14800),                    change: 0 },
      { code: 'TRY', flag: '🇹🇷', rate: Math.round(api?.try_to_syp ?? (fx['TRY'] ? usd / fx['TRY'] : 355)), change: 0 },
      { code: 'GBP', flag: '🇬🇧', rate: Math.round(fx['GBP'] ? usd / fx['GBP'] : 17100),                    change: 0 },
      { code: 'AED', flag: '🇦🇪', rate: Math.round(fx['AED'] ? usd / fx['AED'] : 3675),                     change: 0 },
    ];
  }, [ratesData]);

  const [perturbations, setPerturbations] = useState<number[]>(() => TICKER_FALLBACK.map(() => 0));
  const [flash, setFlash] = useState<{ idx: number; dir: 'up' | 'down' } | null>(null);

  const rows = useMemo<TickerRow[]>(() =>
    baseRows.map((row, i) => ({
      ...row,
      rate: Math.round(row.rate * (1 + (perturbations[i] ?? 0))),
      change: parseFloat((row.change + (perturbations[i] ?? 0) * 100).toFixed(2)),
    })),
    [baseRows, perturbations]
  );

  useEffect(() => {
    const iv = setInterval(() => {
      const i = Math.floor(Math.random() * TICKER_FALLBACK.length);
      const factor = (Math.random() - 0.47) * 0.003;
      setPerturbations(prev => prev.map((p, idx) => idx !== i ? p : p + factor));
      setFlash({ idx: i, dir: factor >= 0 ? 'up' : 'down' });
      setTimeout(() => setFlash(null), 650);
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  return (
    <motion.div
      className="w-full max-w-xs rounded-2xl overflow-hidden shadow-lg border border-gray-100"
      style={{ background: '#ffffff' }}
      initial={{ opacity: 0, y: 24, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-primary">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
        <span className="text-xs font-bold text-white tracking-wide">أسعار الصرف · LiraPro</span>
        <div className="flex items-center gap-1 mr-auto">
          <span className="text-[10px] text-white/50">ل.س</span>
          <RefreshCw className="w-3 h-3 text-white/40" style={{ animation: 'spin 4s linear infinite' }} />
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {rows.map((row, i) => {
          const isFlashing = flash?.idx === i;
          const isUp = row.change >= 0;
          return (
            <motion.div
              key={row.code}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.09, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-300"
              style={{
                background: isFlashing
                  ? flash?.dir === 'up' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.07)'
                  : 'transparent',
              }}
            >
              <span className="text-base flex-shrink-0">{row.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-800" dir="ltr">{row.code}/SYP</p>
              </div>
              <motion.span
                key={row.rate}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="font-bold text-sm tabular-nums text-primary"
                dir="ltr"
              >
                {row.rate.toLocaleString()}
              </motion.span>
              <div
                className="flex items-center gap-0.5 text-[11px] font-bold w-14 justify-end flex-shrink-0"
                style={{ color: isUp ? '#16a34a' : '#ef4444' }}
              >
                <motion.span
                  animate={{ y: isUp ? [-1.5, 1.5] : [1.5, -1.5] }}
                  transition={{ duration: 0.9, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                >
                  {isUp ? '▲' : '▼'}
                </motion.span>
                <span dir="ltr">{Math.abs(row.change).toFixed(2)}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="px-4 py-2 flex items-center gap-1.5" style={{ background: '#f9fafb' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] text-gray-400 font-medium">محاكاة العرض الفعلي</span>
      </div>
    </motion.div>
  );
}

/* ── Services Feature Card ──────────────────────────────────────── */
const SERVICES_FEATURES_AR = [
  'حجز المواعيد في العيادات والمشافي',
  'التسوق الإلكتروني ودفع الفواتير',
  'عرض الخدمات المحلية المتاحة قريباً منك',
  'الدفع الإلكتروني الآمن والسريع',
  'إدارة رصيدك بكل مرونة وسهولة',
];

function ServicesFeatureCard() {
  return (
    <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-lg relative" style={{ border: '1px solid rgba(210,0,115,0.25)', background: '#fff' }}>

      <div className="relative z-10 flex items-center gap-2 px-4 py-3" style={{ background: '#D20073' }}>
        <CreditCard className="w-4 h-4 text-white" />
        <span className="text-xs font-bold text-white tracking-wide">الخدمات والرصيد</span>
        <span className="mr-auto text-[10px] text-white/70 font-semibold">قريباً</span>
      </div>
      <div className="relative z-10 p-4 flex flex-col gap-2.5">
        {SERVICES_FEATURES_AR.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 + i * 0.08 }}
            className="flex items-start gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#D20073' }} />
            <span className="text-xs leading-snug" style={{ color: '#444' }}>{f}</span>
          </motion.div>
        ))}
      </div>
      <div className="relative z-10 px-4 py-2.5" style={{ background: 'rgba(210,0,115,0.06)' }}>
        <p className="text-[10px] font-bold text-center" style={{ color: '#D20073' }}>
          اضغط "الخدمات والرصيد" في الصفحة الرئيسية لمزيد من التفاصيل
        </p>
      </div>
    </div>
  );
}

/* ── ISP Feature Card ────────────────────────────────────────────── */
const ISP_FEATURES_AR = [
  'إنشاء حساب مزود خدمة احترافي',
  'إدارة قائمة عملائك ومتابعتهم',
  'تلقّي إشعارات الحجز والطلبات فورياً',
  'متابعة الإيرادات والمعاملات المالية',
  'لوحة تحكم متكاملة لإدارة أعمالك',
];

function ISPFeatureCard() {
  return (
    <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-lg border border-primary/25 bg-background">
      <div className="flex items-center gap-2 px-4 py-3 bg-primary">
        <Building2 className="w-4 h-4 text-white" />
        <span className="text-xs font-bold text-white tracking-wide">مزودو الخدمات والأعمال</span>
        <span className="mr-auto text-[10px] text-white/60">قريباً ✨</span>
      </div>
      <div className="p-4 flex flex-col gap-2.5">
        {ISP_FEATURES_AR.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 + i * 0.08 }}
            className="flex items-start gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-primary" />
            <span className="text-xs leading-snug text-foreground/70">{f}</span>
          </motion.div>
        ))}
      </div>
      <div className="px-4 py-2.5 bg-primary/6">
        <p className="text-[10px] font-bold text-center text-primary">
          قريباً — ترقّب الإطلاق!
        </p>
      </div>
    </div>
  );
}

/* ── Welcome Screen ──────────────────────────────────────────────── */
function Welcome() {
  const { t, language } = useApp();
  const [cardIdx, setCardIdx] = useState(0);
  const isFirstRef = React.useRef(true);

  useEffect(() => {
    const delay = isFirstRef.current ? 5000 : 4000;
    const timer = setTimeout(() => {
      isFirstRef.current = false;
      setCardIdx(prev => (prev + 1) % 4);
    }, delay);
    return () => clearTimeout(timer);
  }, [cardIdx]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#fff' }} dir="rtl">

      {/* Brand heading */}
      <motion.div
        className="mb-5 flex justify-center"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="rounded-2xl px-5 py-3 flex flex-col items-center border border-gray-100 dark:border-primary/40 shadow-sm bg-white dark:bg-card">
          <AnimatedLogo fontSize="clamp(1.2rem, 5vw, 1.6rem)" />
        </div>
      </motion.div>

      {/* Card carousel */}
      <div className="w-full flex flex-col items-center gap-3 mb-5">
        <div style={{ height: '290px' }} className="w-full flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={cardIdx}
              initial={{ rotateY: -90, opacity: 0, x: -20 }}
              animate={{ rotateY: 0, opacity: 1, x: 0 }}
              exit={{ rotateY: 90, opacity: 0, x: 20 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="w-full flex justify-center"
              style={{ perspective: '1000px' }}
            >
              {cardIdx === 0 && <LandingSimCard />}
              {cardIdx === 1 && <CurrencyTickerBoard />}
              {cardIdx === 2 && <ServicesFeatureCard />}
              {cardIdx === 3 && <ISPFeatureCard />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex items-center gap-2 mt-1">
          {[0, 1, 2, 3].map(i => (
            <motion.button
              key={i}
              onClick={() => setCardIdx(i)}
              animate={{ width: i === cardIdx ? 22 : 8 }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full cursor-pointer"
              style={{
                background: i === cardIdx ? 'hsl(var(--primary))' : '#D20073',
                opacity: i === cardIdx ? 1 : 0.35,
              }}
            />
          ))}
        </div>
      </div>

      {/* Welcome text — pink */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: ANIM_DONE }}
        className="text-lg font-black mb-1 text-center"
        style={{ color: '#D20073' }}
      >
        {language === 'ar' ? (
          <>أهلاً بك في <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '1.05em', letterSpacing: '0.03em' }}>LiraPro</span></>
        ) : (
          <>Welcome to <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '1.05em' }}>LiraPro</span></>
        )}
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: ANIM_DONE + 0.12 }}
        className="text-sm font-semibold mb-1 text-center leading-relaxed px-4"
        style={{ color: 'rgba(210,0,115,0.85)' }}
      >
        {t('welcomeSubtitle')}
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: ANIM_DONE + 0.22 }}
        className="text-sm font-semibold mb-5 text-center leading-relaxed px-4"
        style={{ color: 'rgba(210,0,115,0.65)' }}
      >
        {t('welcomeSubtitle2')}
      </motion.p>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: ANIM_DONE + 0.15 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <Link href="/sign-in" className="w-full">
          <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90" size="lg">{t('signIn')}</Button>
        </Link>
        <Link href="/sign-up" className="w-full">
          <Button className="w-full h-12 border-primary text-primary hover:bg-primary/5" variant="outline" size="lg">{t('signUp')}</Button>
        </Link>
        <Link href="/app/home" className="w-full mt-1">
          <Button className="w-full" variant="ghost" style={{ color: '#888' }}>{t('guestMode')}</Button>
        </Link>
      </motion.div>
    </div>
  );
}

function VendorAwareRedirect() {
  const { getToken } = useAuth();
  const [, navigate] = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/vendor/profile', { headers, credentials: 'include' });
        if (!cancelled && res.ok) {
          navigate('/app/vendor');
          setChecked(true);
          return;
        }

        const linkRes = await fetch('/api/vendor/link-by-email', {
          method: 'POST',
          headers,
          credentials: 'include',
        });
        if (!cancelled) {
          navigate(linkRes.ok ? '/app/vendor' : '/app/home');
        }
      } catch {
        if (!cancelled) navigate('/app/home');
      }
      if (!cancelled) setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [getToken, navigate]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  return null;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useUser();
  // Show Welcome immediately while Supabase loads — safe since it only has sign-in/sign-up links.
  // This eliminates the blank screen on slow connections.
  if (!isLoaded) return <Welcome />;
  if (isSignedIn) return <VendorAwareRedirect />;
  return <Welcome />;
}

type AccountStatus = {
  banned: boolean; banReason?: string | null; bannedAt?: string | null;
  restricted: boolean; restrictedUntil?: string | null; restrictReason?: string | null;
  softDeleted: boolean; deletedAt?: string | null; deleteReason?: string | null;
};

function AccountBlockedScreen({ type, reason, date, until, onClear }: {
  type: 'ban' | 'restrict' | 'delete';
  reason?: string | null;
  date?: string | null;
  until?: string | null;
  onClear?: () => void;
}) {
  const { signOut } = useAuth();
  const [, navigate] = useLocation();

  const config = {
    ban: {
      icon: <ShieldX className="w-9 h-9 text-red-500" />,
      bg: 'bg-red-100 dark:bg-red-900/30',
      title: 'تم حظر الحساب',
      desc: 'تم حظر حسابك على منصة LiraPro. لا يمكنك الوصول إلى المنصة في الوقت الحالي.',
      reasonLabel: 'سبب الحظر:',
      color: '#dc2626',
    },
    restrict: {
      icon: <Clock className="w-9 h-9 text-amber-500" />,
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      title: 'تم تقييد الحساب مؤقتاً',
      desc: 'تم تقييد حسابك على منصة LiraPro بشكل مؤقت. سيُرفع التقييد تلقائياً عند انتهاء المدة.',
      reasonLabel: 'سبب التقييد:',
      color: '#d97706',
    },
    delete: {
      icon: <Trash2 className="w-9 h-9 text-gray-500" />,
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      title: 'تم حذف الحساب',
      desc: 'تم حذف حسابك من منصة LiraPro. تواصل مع الدعم لاسترجاع حسابك أو للاستفسار.',
      reasonLabel: 'سبب الحذف:',
      color: '#6b7280',
    },
  }[type];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background" dir="rtl">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <div className={`w-20 h-20 rounded-3xl ${config.bg} flex items-center justify-center`}>
          {config.icon}
        </div>

        <div className="text-center w-full">
          <h2 className="text-2xl font-black text-foreground mb-2">{config.title}</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{config.desc}</p>

          {reason && (
            <div className="bg-secondary rounded-2xl p-3.5 text-right mb-3 w-full">
              <p className="text-[10px] font-bold text-muted-foreground mb-1">{config.reasonLabel}</p>
              <p className="text-sm text-foreground font-medium">{reason}</p>
            </div>
          )}

          {type === 'restrict' && until && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-3 text-right mb-3 w-full border border-amber-200 dark:border-amber-800">
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mb-1">ينتهي التقييد في:</p>
              <p className="text-sm font-black text-amber-800 dark:text-amber-300">
                {new Date(until).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}

          {(type === 'ban' || type === 'delete') && date && (
            <p className="text-[10px] text-muted-foreground mb-3">
              {new Date(date).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>

        <Button
          className="w-full h-12 text-white font-bold rounded-2xl"
          style={{ background: config.color }}
          onClick={() => navigate('/app/support')}
        >
          التواصل مع الدعم
        </Button>
        {onClear && (
          <Button variant="outline" className="w-full h-11 rounded-2xl text-xs gap-1.5 border-border"
            onClick={() => { onClear(); signOut(); }}>
            تحقق مجدداً / تسجيل الدخول بحساب آخر
          </Button>
        )}
        <Button variant="ghost" className="w-full h-11 text-muted-foreground rounded-2xl" onClick={() => signOut()}>
          تسجيل الخروج من الحساب
        </Button>
      </div>
    </div>
  );
}

const BAN_STORAGE_KEY = 'syp-blocked';

function BanGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useAuth();

  const [status, setStatus] = useState<AccountStatus | null>(() => {
    try {
      const stored = localStorage.getItem(BAN_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as AccountStatus) : null;
    } catch { return null; }
  });
  const [_checking, setChecking] = useState(false);
  const signedOutRef = React.useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    signedOutRef.current = false;

    let mounted = true;
    const check = async () => {
      if (!mounted) return;
      setChecking(true);
      try {
        const d = await fetch(`/api/users/ban-status/${user.id}`).then(r => r.json()) as AccountStatus;
        if (!mounted) return;
        setStatus(d);
        if (d.banned || d.restricted || d.softDeleted) {
          localStorage.setItem(BAN_STORAGE_KEY, JSON.stringify(d));
          if (!signedOutRef.current) {
            signedOutRef.current = true;
            if (d.banned) {
              fetch('/api/admin/ban-attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, email: user.email, userAgent: navigator.userAgent, reason: d.banReason, bannedAt: d.bannedAt }),
              }).catch(() => {});
            }
            signOut();
          }
        } else {
          localStorage.removeItem(BAN_STORAGE_KEY);
        }
      } catch {
        if (mounted) setStatus(prev => prev ?? { banned: false, restricted: false, softDeleted: false });
      }
      if (mounted) setChecking(false);
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [isLoaded, isSignedIn, user, user?.id, signOut]);

  const clearBlockedStatus = React.useCallback(() => {
    localStorage.removeItem(BAN_STORAGE_KEY);
    setStatus(null);
    signedOutRef.current = false;
  }, []);

  useEffect(() => {
    if (status?.restricted && status.restrictedUntil && new Date(status.restrictedUntil) <= new Date()) {
      localStorage.removeItem(BAN_STORAGE_KEY);
      signedOutRef.current = false;
    }
  }, [status?.restricted, status?.restrictedUntil]);

  // Only block rendering if we have a confirmed bad status from cache
  // This prevents a blank spinner on every page load for normal users
  const hasCachedBadStatus = status && (status.banned || status.restricted || status.softDeleted);
  if (!isLoaded && hasCachedBadStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const onSupportPage = location.startsWith('/app/support');

  if (status?.softDeleted && !onSupportPage) {
    return <AccountBlockedScreen type="delete" reason={status.deleteReason} date={status.deletedAt} onClear={clearBlockedStatus} />;
  }
  if (status?.banned && !onSupportPage) {
    return <AccountBlockedScreen type="ban" reason={status.banReason} date={status.bannedAt} onClear={clearBlockedStatus} />;
  }
  if (status?.restricted && !onSupportPage) {
    if (status.restrictedUntil && new Date(status.restrictedUntil) <= new Date()) {
      return <>{children}</>;
    }
    return <AccountBlockedScreen type="restrict" reason={status.restrictReason} until={status.restrictedUntil} onClear={clearBlockedStatus} />;
  }
  return <>{children}</>;
}

function AuthSetup() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      setAuthTokenGetter(null);
      return;
    }
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
    return () => setAuthTokenGetter(null);
  }, [isSignedIn, getToken]);

  return null;
}

function AuthCacheClearer() {
  const { user } = useUser();
  const prevIdRef = useRef<string | null>(null);
  useEffect(() => {
    const id = user?.id ?? null;
    if (prevIdRef.current !== null && prevIdRef.current !== id) {
      queryClient.clear();
    }
    prevIdRef.current = id;
  }, [user?.id]);
  return null;
}

function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSetup />
      <AuthCacheClearer />
      <BanGuard>
        <Switch>
          <Route path="/" component={HomeRedirect} />

          <Route path="/sign-in">
            <Suspense fallback={<PageLoader />}><SignInPageLazy /></Suspense>
          </Route>
          <Route path="/sign-up">
            <Suspense fallback={<PageLoader />}><SignUpPageLazy /></Suspense>
          </Route>
          <Route path="/forgot-password">
            <Suspense fallback={<PageLoader />}><ForgotPasswordPageLazy /></Suspense>
          </Route>

          <Route path="/admin">
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><PageLoader /></div>}>
              <AdminPage />
            </Suspense>
          </Route>

          <Route path="/app/*?">
            <AppShell>
              <Switch>
                <Route path="/app/home" component={HomePage} />
                <Route path="/app/converter" component={ConverterPage} />
                <Route path="/app/metals" component={MetalsPage} />
                <Route path="/app/currencies" component={CurrenciesPage} />
                <Route path="/app/profile" component={ProfilePage} />
                <Route path="/app/currency/:code" component={CurrencyDetailPage} />
                <Route path="/app/gold/:karat" component={GoldDetailPage} />
                <Route path="/app/metal/:symbol" component={MetalDetailPage} />
                <Route path="/app/settings" component={SettingsPage} />
                <Route path="/app/wallet" component={WalletPage} />
                <Route path="/app/market" component={MarketPage} />
                <Route path="/app/market-economy" component={MarketEconomyPage} />
                <Route path="/app/market-price/:category/:product" component={MarketPriceDetailPage} />
                <Route path="/app/alerts" component={AlertsPage} />
                <Route path="/app/crypto" component={CryptoPage} />
                <Route path="/app/privacy" component={PrivacyPage} />
                <Route path="/app/about" component={AboutPage} />
                <Route path="/app/services/onboarding" component={ServicesOnboardingPage} />
                <Route path="/app/membership" component={MembershipPage} />
                <Route path="/app/vendor" component={VendorDashboardPage} />
                <Route path="/app/vendor/profile" component={BusinessProfilePage} />
                <Route path="/app/faq" component={FaqPage} />
                <Route path="/app/support" component={SupportPage} />
                <Route><Redirect to="/app/home" /></Route>
              </Switch>
            </AppShell>
          </Route>

          <Route><Redirect to="/" /></Route>
        </Switch>
      </BanGuard>
    </QueryClientProvider>
  );
}

function usePushSubscription() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        // Fetch public VAPID key
        const keyRes = await fetch('/api/push/vapid-public-key');
        if (!keyRes.ok) return;
        const { publicKey } = await keyRes.json() as { publicKey: string };
        // Check existing subscription
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          // Subscribe
          const keyBytes = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes,
          });
        }
        // Register with our server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch { /* silent — notifications not supported or denied */ }
    })();
  }, []);
}

function App() {
  usePushSubscription();

  useEffect(() => {
    fetch('/api/visit', { method: 'POST' }).catch(() => {});
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AppProvider>
        <AuthProvider>
          <WouterRouter base={basePath}>
            <TooltipProvider>
              <AppRoutes />
              <FloatingAiButton />
              <Toaster />
            </TooltipProvider>
          </WouterRouter>
        </AuthProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
