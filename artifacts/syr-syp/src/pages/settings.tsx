import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/app-context';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Hash, Moon, Sun, Lock, X, Eye, EyeOff, Bell, TrendingUp, MessageCircle, CheckCircle, MapPin, Store, Newspaper, Volume2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUser, useAuth } from '@/context/auth-context';
import { getAlertSoundEnabled, setAlertSoundEnabled } from '@/hooks/use-alert-sound';

const NOTIF_PREFS_LIST = [
  { id: 'prices',       labelAr: 'تنبيهات الأسعار',            Icon: TrendingUp },
  { id: 'support',      labelAr: 'ردود الدعم الفني',            Icon: MessageCircle },
  { id: 'general',      labelAr: 'الإشعارات العامة والإعلانات', Icon: Bell },
  { id: 'news',         labelAr: 'تحديثات وأخبار المنصة',       Icon: Newspaper },
  { id: 'requests',     labelAr: 'قبول ورفض الطلبات',           Icon: CheckCircle },
  { id: 'account',      labelAr: 'أمان الحساب',                 Icon: Lock },
  { id: 'location',     labelAr: 'نشاطات حسب الموقع',           Icon: MapPin },
  { id: 'vendors',      labelAr: 'تحديثات المزودين',            Icon: Store },
];

export default function SettingsPage() {
  const { language, setLanguage, numberFormat, setNumberFormat, t } = useApp();
  const { theme, setTheme } = useTheme();
  const { user, isSignedIn } = useUser();
  const { resetPassword } = useAuth();
  const ar = language === 'ar';

  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('syp-notif-prefs') ?? '{}') as Record<string, boolean>; } catch { return {}; }
  });
  const toggleNotifPref = (id: string) => {
    const next = { ...notifPrefs, [id]: notifPrefs[id] === false ? true : !(notifPrefs[id] ?? true) };
    setNotifPrefs(next);
    localStorage.setItem('syp-notif-prefs', JSON.stringify(next));
  };

  const [soundEnabled, setSoundEnabled] = useState(() => getAlertSoundEnabled());
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setAlertSoundEnabled(next);
  };

  const [pwModal, setPwModal] = useState(false);
  const [pwStep, setPwStep] = useState<'request' | 'verify' | 'change'>('request');
  const [pwCode, setPwCode] = useState('');
  const [_pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwSent, setPwSent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  const userEmail = user?.email ?? '';
  const isPasswordUser = isSignedIn && !user?.app_metadata?.provider?.includes('oauth');

  const resetPwModal = () => {
    setPwModal(false); setPwStep('request'); setPwCode('');
    setPwCurrent(''); setPwNew(''); setPwConfirm(''); setPwMsg(''); setPwSent(false);
  };

  const handleSendPwCode = async () => {
    if (!userEmail) return;
    setPwSent(true);
    setPwMsg('');
    const { error } = await resetPassword(userEmail);
    if (error) {
      setPwSent(false);
      const errMsg = error.message.toLowerCase();
      const arabicMsg = errMsg.includes('rate limit') || errMsg.includes('email rate')
        ? 'تم تجاوز الحد المسموح لإرسال البريد الإلكتروني، يرجى الانتظار قليلاً والمحاولة مجدداً'
        : errMsg.includes('user not found')
        ? 'البريد الإلكتروني غير مسجّل'
        : errMsg.includes('invalid email')
        ? 'البريد الإلكتروني غير صحيح'
        : 'حدث خطأ، يرجى المحاولة مجدداً';
      setPwMsg(ar ? arabicMsg : error.message);
    } else {
      setPwMsg(ar
        ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني ✓'
        : 'Password reset link sent to your email ✓');
      setTimeout(resetPwModal, 4000);
    }
  };

  const handleVerifyPwCode = () => {
    if (pwCode.length < 4) { setPwMsg(ar ? 'أدخل الرمز' : 'Enter the code'); return; }
    setPwStep('change'); setPwMsg('');
  };

  const handleSaveNewPassword = () => {
    if (pwNew.length < 8) { setPwMsg(ar ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters'); return; }
    if (pwNew !== pwConfirm) { setPwMsg(ar ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'); return; }
    setPwMsg(ar ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
    setTimeout(resetPwModal, 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 pb-10"
    >
      <h2 className="text-xl font-bold">{t('settings')}</h2>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {t('language')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => setLanguage('ar')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                language === 'ar'
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-background text-foreground border-border hover:border-primary/50'
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                language === 'en'
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-background text-foreground border-border hover:border-primary/50'
              }`}
            >
              English
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" />
            {t('numberFormat')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => setNumberFormat('arabic')}
              className={`flex-1 py-3 px-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                numberFormat === 'arabic'
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-background text-foreground border-border hover:border-primary/50'
              }`}
            >
              <span className="text-xl font-black tracking-widest leading-none">٣٢١</span>
              <span className="text-[10px] font-bold opacity-80">{t('arabicNums')}</span>
            </button>
            <button
              onClick={() => setNumberFormat('english')}
              className={`flex-1 py-3 px-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                numberFormat === 'english'
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-background text-foreground border-border hover:border-primary/50'
              }`}
            >
              <span className="text-xl font-black tracking-widest leading-none">321</span>
              <span className="text-[10px] font-bold opacity-80">{t('englishNums')}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            {theme === 'dark' ? t('darkMode') : t('lightMode')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                theme === 'light'
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-background text-foreground border-border hover:border-primary/50'
              }`}
            >
              <Sun className="w-4 h-4" /> {t('lightMode')}
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                theme === 'dark'
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-background text-foreground border-border hover:border-primary/50'
              }`}
            >
              <Moon className="w-4 h-4" /> {t('darkMode')}
            </button>
          </div>
        </CardContent>
      </Card>

      {isPasswordUser && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              {ar ? 'كلمة المرور' : 'Password'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-foreground/70 dark:text-white mb-3" dir="ltr">{userEmail}</p>
            <Button
              variant="outline"
              className="w-full border-2 border-primary text-primary dark:border-primary/60 dark:text-foreground hover:bg-primary/5 dark:hover:bg-primary/10 font-bold"
              onClick={() => { setPwModal(true); setPwStep('request'); setPwSent(false); }}
            >
              {ar ? 'تغيير كلمة المرور' : 'Change Password'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {ar ? 'إعدادات الإشعارات' : 'Notification Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0 px-4 pb-2">
          {NOTIF_PREFS_LIST.map((pref) => {
            const isOn = notifPrefs[pref.id] !== false;
            return (
              <div
                key={pref.id}
                className="flex items-center justify-between py-3 border-b border-border/50"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <pref.Icon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{pref.labelAr}</span>
                </div>
                <button
                  onClick={() => toggleNotifPref(pref.id)}
                  className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 ${isOn ? 'bg-primary' : 'bg-border'}`}
                >
                  <motion.div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                    animate={{ left: isOn ? '1.375rem' : '0.125rem' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                </button>
              </div>
            );
          })}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Volume2 className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                {ar ? 'صوت تنبيهات الأسعار' : 'Price alert sound'}
              </span>
            </div>
            <button
              onClick={toggleSound}
              className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 ${soundEnabled ? 'bg-primary' : 'bg-border'}`}
            >
              <motion.div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                animate={{ left: soundEnabled ? '1.375rem' : '0.125rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-foreground/60 dark:text-white/60 mt-2">LiraPro v1.0.0</p>

      {/* Password Change Modal */}
      {createPortal(
      <AnimatePresence>
        {pwModal && (
          <>
            <motion.div key="pw-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] bg-black/50" onClick={resetPwModal} />
            <motion.div key="pw-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[1000] bg-background dark:bg-card border-t border-border rounded-t-3xl overflow-y-auto"
              style={{ maxHeight: 'calc(100dvh - 32px)', overscrollBehavior: 'contain' }}>
              <div className="p-6 pb-16 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <button onClick={resetPwModal} className="p-1 rounded-full hover:bg-secondary transition-colors">
                    <X className="w-5 h-5 text-foreground" />
                  </button>
                  <h3 className="font-bold text-foreground text-base">{ar ? 'تغيير كلمة المرور' : 'Change Password'}</h3>
                  <div className="w-7" />
                </div>
                {pwStep === 'request' && (
                  <>
                    <p className="text-sm text-foreground/70 text-center">
                      {ar ? 'سيتم إرسال رابط إعادة تعيين كلمة المرور إلى:' : 'A password reset link will be sent to:'}
                    </p>
                    <p className="text-sm font-bold text-center text-foreground bg-secondary rounded-xl py-2 px-3" dir="ltr">{userEmail}</p>
                    {pwMsg && <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium">{pwMsg}</p>}
                    <Button onClick={handleSendPwCode} disabled={pwSent} className="h-12 font-bold">
                      {ar ? 'إرسال الرابط' : 'Send Link'}
                    </Button>
                  </>
                )}

                {pwStep === 'verify' && (
                  <>
                    <p className="text-sm text-foreground/70 text-center">
                      {ar ? 'أدخل رمز التحقق المرسل إلى بريدك' : 'Enter the code sent to your email'}
                    </p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={pwCode}
                      onChange={e => setPwCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={ar ? 'رمز التحقق' : 'Verification code'}
                      dir="ltr"
                      className="h-12 text-center text-2xl tracking-[0.4em] text-foreground bg-background border-border" />
                    {pwMsg && <p className="text-xs text-center text-destructive font-medium">{pwMsg}</p>}
                    <Button onClick={handleVerifyPwCode} className="h-12 font-bold">{ar ? 'تأكيد الرمز' : 'Verify Code'}</Button>
                  </>
                )}

                {pwStep === 'change' && (
                  <>
                    <p className="text-sm text-foreground/70 text-center">
                      {ar ? 'أدخل كلمة المرور الجديدة' : 'Enter your new password'}
                    </p>
                    <div className="relative">
                      <Input
                        type={showPwNew ? 'text' : 'password'}
                        value={pwNew}
                        onChange={e => setPwNew(e.target.value)}
                        placeholder={ar ? 'كلمة المرور الجديدة (8+ أحرف)' : 'New password (8+ chars)'}
                        dir="ltr"
                        className="h-12 pr-10 text-foreground bg-background border-border" />
                      <button type="button" onClick={() => setShowPwNew(s => !s)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors">
                        {showPwNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showPwConfirm ? 'text' : 'password'}
                        value={pwConfirm}
                        onChange={e => setPwConfirm(e.target.value)}
                        placeholder={ar ? 'تأكيد كلمة المرور' : 'Confirm password'}
                        dir="ltr"
                        className="h-12 pr-10 text-foreground bg-background border-border" />
                      <button type="button" onClick={() => setShowPwConfirm(s => !s)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors">
                        {showPwConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwMsg && (
                      <p className={`text-xs text-center font-medium ${pwMsg.includes('نجاح') || pwMsg.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                        {pwMsg}
                      </p>
                    )}
                    <Button onClick={handleSaveNewPassword} className="h-12 font-bold">
                      {ar ? 'تأكيد التغيير' : 'Confirm Change'}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body)}
    </motion.div>
  );
}
