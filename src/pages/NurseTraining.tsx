import { FormEvent, useState } from 'react';
import { Calendar, Clock, MapPin, UserRound, Phone, Mail, CheckCircle2, Loader2, CalendarX } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { CARE_PHONE, CARE_PHONE_TEL } from '../lib/care';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Registration closes when the training ends: 6:00 PM Kigali (UTC+2) on 8 November 2026.
const CLOSES_AT = Date.parse('2026-11-08T16:00:00Z');
const ORG_EMAIL = 'voiceofpreemies@gmail.com';

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };
const inp = 'w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white placeholder:text-[#A0B4BC]';
const lbl = 'block text-xs font-bold text-[#5A7280] uppercase tracking-wider mb-1.5';

function Detail({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={font}>{label}</p>
        <div className="text-sm text-[#1A2B35] font-semibold leading-snug" style={serif}>{children}</div>
      </div>
    </div>
  );
}

export default function NurseTraining() {
  const { t } = useLanguage();
  const closed = Date.now() > CLOSES_AT;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [years, setYears] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!fullName.trim() || !cleanPhone || !email.trim() || years.trim() === '' || !workplace.trim()) { setError(t('nt.err.missing')); return; }
    if (!/^\+?\d{9,15}$/.test(cleanPhone)) { setError(t('nt.err.phone')); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setError(t('nt.err.email')); return; }
    const n = Number(years);
    if (!Number.isInteger(n) || n < 0 || n > 60) { setError(t('nt.err.years')); return; }

    setSending(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-nurse-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ fullName, phone: cleanPhone, email, yearsExperience: n, workplace, website }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.success) setDone(true);
      else if (body.error === 'already_registered') setError(t('nt.err.already'));
      else if (body.error === 'invalid_phone') setError(t('nt.err.phone'));
      else if (body.error === 'invalid_email') setError(t('nt.err.email'));
      else if (body.error === 'invalid_years') setError(t('nt.err.years'));
      else if (body.error === 'closed') setError(t('nt.closed.title'));
      else setError(t('nt.err.generic'));
    } catch {
      setError(t('nt.err.generic'));
    }
    setSending(false);
  };

  return (
    <div className="page-enter">
      <section className="relative pt-28 pb-0 hero-gradient overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#F0A500] mb-2" style={font}>{t('nt.hero.label')}</p>
          <h1 className="text-3xl md:text-5xl font-light text-white leading-tight" style={serif}>{t('nt.hero.title')}</h1>
          <p className="text-sm md:text-base text-white/80 max-w-xl mx-auto mt-4 leading-relaxed" style={font}>{t('nt.hero.desc')}</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none"><path d="M0 40L1440 40L1440 10C1200 35 960 0 720 12C480 24 240 38 0 10L0 40Z" fill="#FBF8F3" /></svg>
        </div>
      </section>

      <section className="bg-[#FBF8F3] py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-5 gap-10">
          {/* Details */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-28 bg-white rounded-2xl border border-[#E8F0F2] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E8F0F2] bg-[#0A6070]/[0.08] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0A6070]" />
                <h2 className="text-sm font-bold text-[#0A6070]" style={font}>{t('nt.details')}</h2>
              </div>
              <div className="p-6 space-y-5">
                <Detail icon={Calendar} label={t('nt.date')}>{t('nt.dateValue')}</Detail>
                <Detail icon={Clock} label={t('nt.time')}>3:30 PM – 6:00 PM</Detail>
                <Detail icon={MapPin} label={t('nt.venue')}>Solace Ministries Conference Centre<br /><span className="font-normal text-[#5A7280]">KG 563 St, Kigali</span></Detail>
                <Detail icon={UserRound} label={t('nt.facilitator')}>{t('nt.facilitatorValue')}</Detail>
                <p className="text-xs font-semibold text-[#0A6070] bg-[#0A6070]/[0.08] rounded-xl px-4 py-3" style={font}>{t('nt.free')}</p>
                <div className="pt-4 border-t border-[#E8F0F2] space-y-2 text-sm text-[#334155]" style={font}>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{t('nt.enquiries')}</p>
                  <a href={`tel:${CARE_PHONE_TEL}`} className="flex items-center gap-2 hover:text-[#0A6070]"><Phone className="w-4 h-4 text-[#94A3B8]" /> {CARE_PHONE}</a>
                  <a href={`mailto:${ORG_EMAIL}`} className="flex items-center gap-2 hover:text-[#0A6070] break-all"><Mail className="w-4 h-4 text-[#94A3B8]" /> {ORG_EMAIL}</a>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3 min-w-0">
            {closed ? (
              <div className="bg-white rounded-3xl border border-[#E8F0F2] shadow-sm p-10 text-center">
                <CalendarX className="w-12 h-12 text-[#D8E4E8] mx-auto mb-4" />
                <h2 className="text-2xl font-light text-[#1A2B35] mb-2" style={serif}>{t('nt.closed.title')}</h2>
                <p className="text-sm text-[#5A7280]" style={font}>{t('nt.closed.desc')}</p>
              </div>
            ) : done ? (
              <div className="bg-white rounded-3xl border border-[#E8F0F2] shadow-sm p-10 text-center">
                <CheckCircle2 className="w-14 h-14 text-[#1AADA0] mx-auto mb-4" />
                <h2 className="text-2xl font-light text-[#1A2B35] mb-2" style={serif}>{t('nt.done.title')}</h2>
                <p className="text-sm text-[#5A7280] leading-relaxed" style={font}>{t('nt.done.desc')} <b className="text-[#1A2B35]">{email}</b>.</p>
                <p className="text-xs text-[#94A3B8] mt-3" style={font}>{t('nt.done.note')}</p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="bg-white rounded-3xl border border-[#E8F0F2] shadow-sm p-6 sm:p-9 space-y-5">
                <div>
                  <h2 className="text-2xl font-light text-[#1A2B35]" style={serif}>{t('nt.form.title')}</h2>
                  <p className="text-sm text-[#5A7280] mt-1" style={font}>{t('nt.form.sub')}</p>
                </div>

                {/* Hidden from people; bots tend to fill it. */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                  <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
                </div>

                <div><label className={lbl} style={font}>{t('nt.form.name')}</label><input className={inp} value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" /></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className={lbl} style={font}>{t('nt.form.phone')}</label><input className={inp} value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="07…" /></div>
                  <div><label className={lbl} style={font}>{t('nt.form.email')}</label><input type="email" className={inp} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div><label className={lbl} style={font}>{t('nt.form.years')}</label><input type="number" min={0} max={60} inputMode="numeric" className={inp} value={years} onChange={e => setYears(e.target.value)} /></div>
                  <div className="sm:col-span-2"><label className={lbl} style={font}>{t('nt.form.workplace')}</label><input className={inp} value={workplace} onChange={e => setWorkplace(e.target.value)} /></div>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3" style={font} role="alert">{error}</p>}

                <button type="submit" disabled={sending} className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm text-white disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg, #0A6070 0%, #1AADA0 100%)', ...font }}>
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />} {sending ? t('nt.form.sending') : t('nt.form.submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
