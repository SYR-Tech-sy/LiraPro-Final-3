import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { useLocation } from 'wouter';
import { ChevronLeft, MapPin, Phone, Store, Shield, Loader2, Building2, Edit3, CheckCircle, Camera, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { GoldenBadge } from '@/components/golden-badge';
import { useApp } from '@/context/app-context';

function TrustMeter({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">نسبة الموثوقية</span>
        <span className="font-black" style={{ color }}>{score}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

interface VendorProfile {
  id: number;
  businessName: string;
  category: string;
  governorate: string;
  city: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  description?: string;
}

interface VendorStats {
  trustScore: number;
  totalPrices: number;
  activePrices: number;
  totalViews: number;
}

const CATEGORIES: Record<string, string> = {
  currency: 'صرافة', gold: 'ذهب', metals: 'معادن',
  commodities: 'بضائع', fuel: 'وقود', real_estate: 'عقارات',
  electronics: 'إلكترونيات', food: 'مواد غذائية', other: 'أخرى',
};

export default function BusinessProfilePage() {
  const { getToken } = useAuth();
  const [, navigate] = useLocation();
  const { formatNum } = useApp();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [editData, setEditData] = useState({ businessName: '', phone: '', address: '', description: '', governorate: '', city: '', logoUrl: '' });
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const GOVERNORATES = ['إدلب','دمشق','ريف دمشق','حلب','حمص','حماة','اللاذقية','طرطوس','دير الزور','الرقة','الحسكة','درعا','السويداء','القنيطرة'];
  const [govOpen, setGovOpen] = useState(false);

  const { data: vendorData, isLoading: loading, refetch: loadData } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: async () => {
      const token = await getToken();
      const h = { Authorization: `Bearer ${token}` };
      const [profileRes, statsRes] = await Promise.all([
        fetch('/api/vendor/profile', { headers: h }),
        fetch('/api/vendor/stats', { headers: h }),
      ]);
      if (profileRes.status === 403) return { notVendor: true as const, profile: null as VendorProfile | null, stats: null as VendorStats | null };
      const profile = profileRes.ok ? await profileRes.json() as VendorProfile : null;
      const stats   = statsRes.ok   ? await statsRes.json() as VendorStats   : null;
      return { notVendor: false as const, profile, stats };
    },
    staleTime: 30_000,
  });

  const profile  = vendorData?.profile  ?? null;
  const stats    = vendorData?.stats    ?? null;
  const notVendor = vendorData?.notVendor ?? false;

  const [prevEditProfile, setPrevEditProfile] = useState<VendorProfile | null>(null);
  if (profile !== prevEditProfile) {
    setPrevEditProfile(profile);
    if (profile && !editing) {
      setEditData({ businessName: profile.businessName || '', phone: profile.phone || '', address: profile.address || '', description: profile.description || '', governorate: profile.governorate || '', city: profile.city || '', logoUrl: profile.logoUrl || '' });
    }
  }

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = async ev => {
        const dataUrl = ev.target?.result as string;
        try {
          const token = await getToken();
          const res = await fetch('/api/profile/avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ dataUrl }),
          });
          if (res.ok) {
            const { url } = await res.json() as { url: string };
            setEditData(d => ({ ...d, logoUrl: url }));
            setEditing(true);
            toast.success('تم رفع الصورة');
          } else {
            const err = await res.json().catch(() => ({})) as { error?: string };
            toast.error(err.error ?? 'فشل رفع الصورة');
          }
        } catch {
          toast.error('خطأ في رفع الصورة');
        }
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('خطأ في قراءة الصورة');
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        toast.success('تم تحديث الملف الشخصي');
        setEditing(false);
        void loadData();
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? 'فشل الحفظ');
      }
    } catch { toast.error('خطأ في الاتصال'); }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" dir="rtl">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">جاري التحميل...</p>
    </div>
  );

  if (notVendor) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center" dir="rtl">
      <Shield className="w-12 h-12 text-amber-500" />
      <h2 className="font-black text-lg">غير مصرح لك بالوصول</h2>
      <Button onClick={() => navigate('/app/membership')} className="rounded-2xl font-bold">اطلب العضوية</Button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 pb-10" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate('/app/vendor')} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black">الملف الشخصي للنشاط</h1>
      </div>

      {/* Logo + name banner */}
      <Card className="border-none shadow-sm">
        <div className="h-20 bg-gradient-to-br from-primary to-primary/70 overflow-hidden" />
        <CardContent className="p-4 flex flex-col gap-3 relative">
          <div className="absolute -top-10 right-4">
            <div className="relative">
              {(editData.logoUrl || profile?.logoUrl) ? (
                <img src={editData.logoUrl || profile?.logoUrl} alt="Logo"
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-card shadow-lg" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border-4 border-card shadow-lg flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-primary" />
                </div>
              )}
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-white dark:bg-card flex items-center justify-center shadow-md border border-border hover:bg-secondary transition-colors disabled:opacity-60"
                title="تغيير الشعار"
              >
                {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Camera className="w-3.5 h-3.5 text-foreground/70" />}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void handleLogoUpload(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          <div className="pt-10 flex items-start justify-between" dir="rtl">
            <div>
              <div className="flex items-center gap-2" dir="rtl">
                <h2 className="font-black text-base">{profile?.businessName}</h2>
                <GoldenBadge size={20} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {CATEGORIES[profile?.category ?? ''] ?? profile?.category}
              </p>
            </div>
          </div>

          <TrustMeter score={stats?.trustScore ?? 50} />
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'الأسعار', value: formatNum(stats?.totalPrices ?? 0, { decimals: 0 }), color: '#003C32' },
          { label: 'المشاهدات', value: formatNum(stats?.totalViews ?? 0, { decimals: 0 }), color: '#0284c7' },
          { label: 'الموثوقية', value: `${stats?.trustScore ?? 50}%`, color: '#f59e0b' },
        ].map(s => (
          <Card key={s.label} className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Business info */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">معلومات النشاط</h3>
            <button
              onClick={() => setEditing(v => !v)}
              className="flex items-center gap-1 text-xs text-primary font-bold hover:opacity-80 transition-opacity"
            >
              <Edit3 className="w-3.5 h-3.5" /> تعديل
            </button>
          </div>

          {editing ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">اسم النشاط التجاري</label>
                <Input
                  value={editData.businessName}
                  onChange={e => setEditData(d => ({ ...d, businessName: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">رقم الهاتف</label>
                <Input
                  value={editData.phone}
                  onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))}
                  className="h-10" dir="ltr" placeholder="+963..."
                />
              </div>
              <div className="relative">
                <label className="text-[10px] text-muted-foreground mb-1 block">المحافظة</label>
                <button
                  type="button"
                  onClick={() => setGovOpen(v => !v)}
                  className="w-full flex items-center justify-between border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-right"
                >
                  <span className={editData.governorate ? 'text-foreground' : 'text-muted-foreground'}>
                    {editData.governorate || 'اختر المحافظة'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${govOpen ? 'rotate-180' : ''}`} />
                </button>
                {govOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                    <div className="max-h-40 overflow-y-auto py-1">
                      {GOVERNORATES.map(g => (
                        <button key={g} type="button"
                          onClick={() => { setEditData(d => ({ ...d, governorate: g })); setGovOpen(false); }}
                          className={`w-full text-right px-4 py-2 text-sm transition-colors hover:bg-secondary ${editData.governorate === g ? 'bg-primary/10 text-primary font-bold' : ''}`}
                        >{g}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">المدينة / الحي</label>
                <Input
                  value={editData.city}
                  onChange={e => setEditData(d => ({ ...d, city: e.target.value }))}
                  className="h-10" placeholder="مثال: دمشق — المزة"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">العنوان التفصيلي</label>
                <Input
                  value={editData.address}
                  onChange={e => setEditData(d => ({ ...d, address: e.target.value }))}
                  className="h-10" placeholder="الحي، الشارع، رقم المحل..."
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">وصف النشاط</label>
                <Input
                  value={editData.description}
                  onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                  className="h-10" placeholder="وصف مختصر عن نشاطك..."
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">إلغاء</Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                  {saving
                    ? <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    : <CheckCircle className="w-4 h-4 ml-2" />}
                  حفظ
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>{profile?.governorate}{profile?.city ? ` — ${profile.city}` : ''}</span>
              </div>
              {profile?.address && (
                <div className="flex items-center gap-2 text-sm">
                  <Store className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{profile.address}</span>
                </div>
              )}
              {profile?.phone && (
                <a href={`tel:${profile.phone}`} className="flex items-center gap-2 text-sm text-primary">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span dir="ltr">{profile.phone}</span>
                </a>
              )}
              {profile?.description && (
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{profile.description}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trust tips */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" /> كيف تزيد موثوقيتك؟
          </h3>
          <div className="flex flex-col gap-2">
            {[
              'حدّث أسعارك يومياً لتبقى دقيقة وموثوقة',
              'أضف سعر الشراء والبيع لمزيد من الدقة',
              'أضف ملاحظات توضيحية للمنتجات',
              'أضف 5 أسعار أو أكثر لرفع درجة الموثوقية',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-black flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {tip}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </motion.div>
  );
}
