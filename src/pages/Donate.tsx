import { useState } from 'react';
import {
  Heart, Shield, Users, BookOpen, ArrowRight,
  Package, MapPin, Truck, Phone, Mail,
  AlertCircle, Smartphone, Building2, ChevronDown,
  CalendarHeart, CheckCircle, StickyNote,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import type { TranslationKey } from '../translations';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ─── Bank details ────────────────────────────────────────────────────────────
const BANK = {
  name: 'Equity Bank',
  accountName: 'Voice of Preemies',
  accountNumber: '400 220 139 5363',
  swift: 'EQBLRWRW',
  branch: 'Kigali Branch',
  currency: 'RWF / USD',
};

// ─── Types ───────────────────────────────────────────────────────────────────
type CardId = 'momo' | 'bank' | 'materials' | 'commitment';
type LogisticsMode = 'dropoff' | 'pickup';

// ─── Impact & other ways data ────────────────────────────────────────────────
type ImpactDef = { icon: typeof BookOpen; amount: string; impactKey: TranslationKey };
const impactDefs: ImpactDef[] = [
  { icon: BookOpen, amount: '$10', impactKey: 'donate.i1' },
  { icon: Heart,    amount: '$25', impactKey: 'donate.i2' },
  { icon: Users,    amount: '$50', impactKey: 'donate.i3' },
  { icon: Shield,   amount: '$100', impactKey: 'donate.i4' },
];

type OtherWayDef = { titleKey: TranslationKey; descKey: TranslationKey; ctaKey: TranslationKey };
const otherWayDefs: OtherWayDef[] = [
  { titleKey: 'donate.o1.title', descKey: 'donate.o1.desc', ctaKey: 'btn.enquire' },
  { titleKey: 'donate.o2.title', descKey: 'donate.o2.desc', ctaKey: 'btn.partnerWithUs' },
  { titleKey: 'donate.o3.title', descKey: 'donate.o3.desc', ctaKey: 'btn.learnMore' },
];

// ─── Shared input style ──────────────────────────────────────────────────────
const inp = 'w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#E8644A] focus:ring-2 focus:ring-[#E8644A]/10 transition-all bg-white placeholder:text-[#A0B4BC]';
const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };

// ─── Shared Card wrapper ─────────────────────────────────────────────────────
function Card({
  open, onToggle, icon, iconBg, title, subtitle, accentColor, children,
}: {
  id: CardId;
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border-2 bg-white transition-all duration-200 overflow-hidden ${open ? 'shadow-md' : 'shadow-sm hover:shadow-md'}`}
      style={{ borderColor: open ? accentColor : '#D8E4E8' }}
    >
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-4 p-5 text-left">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#1A2B35] text-base leading-tight" style={{ ...serif, fontSize: '1.15rem' }}>{title}</p>
          <p className="text-xs text-[#5A7280] mt-0.5" style={font}>{subtitle}</p>
        </div>
        <ChevronDown className={`w-5 h-5 text-[#5A7280] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-[#F0F4F6]">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

// ─── MoMo Card ───────────────────────────────────────────────────────────────
function MoMoCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useLanguage();
  return (
    <Card id="momo" open={open} onToggle={onToggle}
      icon={<Smartphone className="w-6 h-6 text-[#F0A500]" />} iconBg="bg-[#FFF8EC]"
      title={t('donate.card.momo.title')} subtitle={t('donate.card.momo.sub')} accentColor="#F0A500"
    >
      <div className="text-center py-4">
        <p className="text-sm text-[#5A7280] mb-5" style={font}>
          {t('donate.card.momo.desc')}
        </p>
        <a href="tel:*182*8*1*55699#"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-base shadow-md transition-all hover:shadow-lg active:scale-95"
          style={{ background: 'linear-gradient(135deg,#F0A500,#E8644A)', ...font }}
        >
          <Smartphone className="w-5 h-5" />
          {t('donate.card.momo.dial')} *182*8*1*55699#
        </a>
        <p className="text-xs text-[#A0B4BC] mt-4" style={font}>{t('donate.card.momo.networks')}</p>
      </div>
    </Card>
  );
}

// ─── Bank Card ───────────────────────────────────────────────────────────────
function BankCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  const rows: [string, string, string][] = [
    [t('donate.card.bank.row.bank'), BANK.name, 'bank'],
    [t('donate.card.bank.row.accountName'), BANK.accountName, 'name'],
    [t('donate.card.bank.row.accountNumber'), BANK.accountNumber, 'number'],
    [t('donate.card.bank.row.swift'), BANK.swift, 'swift'],
    [t('donate.card.bank.row.branch'), BANK.branch, 'branch'],
    [t('donate.card.bank.row.currency'), BANK.currency, 'currency'],
  ];
  return (
    <Card id="bank" open={open} onToggle={onToggle}
      icon={<Building2 className="w-6 h-6 text-[#0A6070]" />} iconBg="bg-[#EDF5F7]"
      title={t('donate.card.bank.title')} subtitle={t('donate.card.bank.sub')} accentColor="#0A6070"
    >
      <div className="space-y-2">
        <p className="text-sm text-[#5A7280] mb-4" style={font}>
          {t('donate.card.bank.desc')}
        </p>
        {rows.map(([label, value, key]) => (
          <button key={key} type="button" onClick={() => copy(value, key)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#F7FBFC] border border-[#D8E4E8] hover:border-[#0A6070] hover:bg-[#EDF5F7] transition-all text-left group"
          >
            <div>
              <p className="text-[10px] font-bold text-[#5A7280] uppercase tracking-widest mb-0.5" style={font}>{label}</p>
              <p className="text-sm font-semibold text-[#1A2B35]" style={font}>{value}</p>
            </div>
            <span className={`text-[11px] font-bold transition-colors px-2 py-1 rounded-lg ${copied === key ? 'text-[#2D8A5F] bg-[#EFF8F4]' : 'text-[#0A6070] bg-[#EDF5F7] group-hover:bg-white'}`} style={font}>
              {copied === key ? t('donate.card.bank.copied') : t('donate.card.bank.copy')}
            </span>
          </button>
        ))}
        <p className="text-xs text-[#A0B4BC] pt-2 text-center" style={font}>
          {t('donate.card.bank.ref')}
        </p>
      </div>
    </Card>
  );
}

// ─── Materials Card ──────────────────────────────────────────────────────────
function MaterialsCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    description: '', quantity: '', notes: '', logistics: 'dropoff' as LogisticsMode,
    pickup_address: '', pickup_availability: '', donor_name: '', donor_email: '', donor_phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = form.description.trim().length >= 3 && form.donor_phone.trim().length >= 7 &&
    (form.logistics === 'dropoff' || (form.pickup_address.trim().length >= 5 && form.pickup_availability.trim().length >= 2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    const fullDescription = form.quantity.trim()
      ? `${form.description.trim()} (qty: ${form.quantity.trim()})`
      : form.description.trim();
    const payload = {
      donor_name: form.donor_name.trim() || 'Anonymous',
      donor_email: form.donor_email.trim() || '',
      donor_phone: form.donor_phone.trim(),
      items_description: fullDescription,
      logistics_mode: form.logistics,
      dropoff_location: form.logistics === 'dropoff' ? 'King Faisal Hospital, KG 544 St, Kigali' : null,
      pickup_address: form.logistics === 'pickup' ? form.pickup_address.trim() : null,
      pickup_availability: form.logistics === 'pickup' ? form.pickup_availability.trim() : null,
      notes: form.notes.trim() || null,
      anonymous: !form.donor_name.trim(),
      status: 'pending',
    };
    const { error: dbErr } = await supabase.from('in_kind_donations').insert(payload);
    if (dbErr) { setError(t('donate.card.mat.error')); setSubmitting(false); return; }
    fetch(`${SUPABASE_URL}/functions/v1/send-donation-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        type: 'inkind', donor_name: payload.donor_name, donor_email: payload.donor_email || null,
        donor_phone: payload.donor_phone, items_description: payload.items_description,
        logistics_mode: payload.logistics_mode, pickup_address: payload.pickup_address,
        notes: payload.notes, anonymous: payload.anonymous,
      }),
    }).catch(() => {});
    setSubmitting(false);
    setDone(true);
  };

  return (
    <Card id="materials" open={open} onToggle={onToggle}
      icon={<Package className="w-6 h-6 text-[#E8644A]" />} iconBg="bg-[#FFF0ED]"
      title={t('donate.card.mat.title')} subtitle={t('donate.card.mat.sub')} accentColor="#E8644A"
    >
      {done ? (
        <div className="text-center py-4">
          <CheckCircle className="w-10 h-10 text-[#2D8A5F] mx-auto mb-3" />
          <p className="font-semibold text-[#1A2B35] mb-1" style={{ ...serif, fontSize: '1.2rem' }}>{t('donate.card.mat.thanks')}</p>
          <p className="text-sm text-[#5A7280]" style={font}>{t('donate.card.mat.thanksDesc')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>{t('donate.card.mat.descLabel')}</label>
            <input type="text" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('donate.card.mat.descPh')} className={inp} style={font} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>{t('donate.card.mat.qtyLabel')}</label>
            <input type="text" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder={t('donate.card.mat.qtyPh')} className={inp} style={font} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>{t('donate.card.mat.notesLabel')}</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('donate.card.mat.notesPh')} className={inp + ' resize-none'} style={font} />
          </div>

          {/* Logistics */}
          <div>
            <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-2" style={font}>{t('donate.card.mat.delivery')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm(f => ({ ...f, logistics: 'dropoff' }))}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form.logistics === 'dropoff' ? 'border-[#0A6070] bg-[#EDF5F7] text-[#0A6070]' : 'border-[#D8E4E8] text-[#5A7280] hover:border-[#0A6070]/40'}`}
                style={font}>
                <MapPin className="w-4 h-4 flex-shrink-0" /> {t('donate.card.mat.dropoff')}
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, logistics: 'pickup' }))}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form.logistics === 'pickup' ? 'border-[#E8A020] bg-[#FFF8EC] text-[#E8A020]' : 'border-[#D8E4E8] text-[#5A7280] hover:border-[#E8A020]/40'}`}
                style={font}>
                <Truck className="w-4 h-4 flex-shrink-0" /> {t('donate.card.mat.pickup')}
              </button>
            </div>
          </div>

          {form.logistics === 'dropoff' && (
            <div className="flex items-start gap-2.5 p-3 bg-[#EDF5F7] rounded-xl text-sm text-[#0A6070]" style={font}>
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{t('donate.card.mat.dropoffInfo')}</span>
            </div>
          )}

          {form.logistics === 'pickup' && (
            <div className="space-y-3 p-3 bg-[#FFF8EC] rounded-xl border border-[#E8A020]/20">
              <div>
                <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>{t('donate.card.mat.addrLabel')}</label>
                <textarea rows={2} required value={form.pickup_address} onChange={e => setForm(f => ({ ...f, pickup_address: e.target.value }))} placeholder={t('donate.card.mat.addrPh')} className={inp + ' resize-none'} style={font} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>{t('donate.card.mat.timeLabel')}</label>
                <input type="text" required value={form.pickup_availability} onChange={e => setForm(f => ({ ...f, pickup_availability: e.target.value }))} placeholder={t('donate.card.mat.timePh')} className={inp} style={font} />
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="pt-1 border-t border-[#D8E4E8]">
            <p className="text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-2" style={font}>{t('donate.card.mat.contact')}</p>
            <div className="space-y-3">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0B4BC]" />
                <input type="tel" required value={form.donor_phone} onChange={e => setForm(f => ({ ...f, donor_phone: e.target.value }))} placeholder={t('donate.card.mat.phonePh')} className={inp + ' pl-10'} style={font} />
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0B4BC]" />
                <input type="email" value={form.donor_email} onChange={e => setForm(f => ({ ...f, donor_email: e.target.value }))} placeholder={t('donate.card.mat.emailPh')} className={inp + ' pl-10'} style={font} />
              </div>
              <input type="text" value={form.donor_name} onChange={e => setForm(f => ({ ...f, donor_name: e.target.value }))} placeholder={t('donate.card.mat.namePh')} className={inp} style={font} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600" style={font}>{error}</p>
            </div>
          )}
          <button type="submit" disabled={submitting || !canSubmit}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#E8644A,#c94f33)', ...font }}>
            {submitting ? t('donate.card.mat.submitting') : t('donate.card.mat.submit')}
          </button>
        </form>
      )}
    </Card>
  );
}

// ─── Commitment Card ─────────────────────────────────────────────────────────
function CommitmentCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ phone: '', email: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim()) return;
    setSubmitting(true);
    setError('');
    const { error: dbErr } = await supabase.from('donation_commitments').insert({
      event_label: 'Website Pledge',
      commitment_date: new Date().toISOString().slice(0, 10),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    });
    if (dbErr) { setError(t('donate.card.commit.error')); setSubmitting(false); return; }

    fetch(`${SUPABASE_URL}/functions/v1/send-donation-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        type: 'commitment',
        donor_name: 'Website visitor',
        donor_email: form.email.trim() || null,
        donor_phone: form.phone.trim(),
        notes: form.notes.trim() || null,
        anonymous: true,
      }),
    }).catch(() => {});

    setSubmitting(false);
    setDone(true);
  };

  return (
    <Card id="commitment" open={open} onToggle={onToggle}
      icon={<CalendarHeart className="w-6 h-6 text-[#2D8A5F]" />} iconBg="bg-[#EFF8F4]"
      title={t('donate.card.commit.title')} subtitle={t('donate.card.commit.sub')} accentColor="#2D8A5F"
    >
      {done ? (
        <div className="text-center py-4">
          <CheckCircle className="w-10 h-10 text-[#2D8A5F] mx-auto mb-3" />
          <p className="font-semibold text-[#1A2B35] mb-1" style={{ ...serif, fontSize: '1.2rem' }}>{t('donate.card.commit.thanks')}</p>
          <p className="text-sm text-[#5A7280]" style={font}>{t('donate.card.commit.thanksDesc')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-[#5A7280]" style={font}>
            {t('donate.card.commit.desc')}
          </p>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0B4BC]" />
            <input type="tel" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder={t('donate.card.mat.phonePh')} className={inp + ' pl-10'} style={font} />
          </div>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0B4BC]" />
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder={t('donate.card.mat.emailPh')} className={inp + ' pl-10'} style={font} />
          </div>
          <div className="relative">
            <StickyNote className="absolute left-3.5 top-3.5 w-4 h-4 text-[#A0B4BC]" />
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('donate.card.commit.notesPh')} className={inp + ' pl-10 resize-none'} style={font} />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600" style={font}>{error}</p>
            </div>
          )}
          <button type="submit" disabled={submitting || !form.phone.trim()}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#2D8A5F,#0A6070)', ...font }}>
            {submitting ? t('donate.card.commit.saving') : t('donate.card.commit.confirm')}
          </button>
        </form>
      )}
    </Card>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function Donate() {
  const { t } = useLanguage();
  const [openCard, setOpenCard] = useState<CardId | null>(null);
  const toggle = (id: CardId) => setOpenCard(prev => prev === id ? null : id);

  return (
    <div className="page-enter">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-0 hero-gradient relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#F0A500] mb-2" style={font}>
              {t('donate.label')}
            </p>
            <h1 className="text-3xl md:text-4xl font-light text-white leading-tight" style={serif}>
              {t('donate.title').split(t('donate.title.em'))[0]}
              <em className="font-semibold text-[#F0A500] not-italic">{t('donate.title.em')}</em>
            </h1>
          </div>
          <p className="text-sm text-white/70 max-w-sm sm:text-right" style={font}>
            {t('donate.sub')}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none">
            <path d="M0 40L1440 40L1440 10C1200 35 960 0 720 12C480 24 240 38 0 10L0 40Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      {/* ── Impact stats ──────────────────────────────────────────────────── */}
      <section className="py-14 bg-[#FBF8F3]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold text-[#5A7280] uppercase tracking-widest mb-8" style={font}>
            {t('donate.impact.label')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {impactDefs.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 text-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#0A6070]/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-[#0A6070]" />
                </div>
                <p className="text-2xl font-semibold text-[#0A6070] mb-1" style={serif}>{item.amount}</p>
                <p className="text-xs text-[#5A7280] leading-snug" style={font}>{t(item.impactKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Donation options (accordion cards) ────────────────────────────── */}
      <section id="choose" className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-semibold text-[#1A2B35] mb-3" style={serif}>
              {t('donate.choose.title')}
            </h2>
            <p className="text-sm text-[#5A7280] max-w-xl mx-auto" style={font}>
              {t('donate.choose.sub')}
            </p>
          </div>

          <div className="space-y-3">
            <MoMoCard open={openCard === 'momo'} onToggle={() => toggle('momo')} />
            <BankCard open={openCard === 'bank'} onToggle={() => toggle('bank')} />
            <MaterialsCard open={openCard === 'materials'} onToggle={() => toggle('materials')} />
            <CommitmentCard open={openCard === 'commitment'} onToggle={() => toggle('commitment')} />
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-[#5A7280] mt-8" style={font}>
            <Shield className="w-3.5 h-3.5" />
            {t('donate.secure')}
          </div>
        </div>
      </section>

      {/* ── Other ways to give ────────────────────────────────────────────── */}
      <section className="py-16 bg-[#FBF8F3] border-t border-[#D8E4E8]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold text-[#1A2B35] mb-8 text-center" style={serif}>
            {t('donate.other.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {otherWayDefs.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 shadow-sm">
                <h3 className="text-xl font-semibold text-[#1A2B35] mb-3" style={serif}>
                  {t(item.titleKey)}
                </h3>
                <p className="text-sm text-[#5A7280] mb-5 leading-relaxed" style={font}>
                  {t(item.descKey)}
                </p>
                <button className="text-sm font-semibold text-[#E8644A] flex items-center gap-1 hover:gap-2 transition-all" style={font}>
                  {t(item.ctaKey)} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
