import { FormEvent, useEffect, useState } from 'react';
import { Phone, Sun, Moon, Check, CheckCircle2, Loader2, Stethoscope, HeartHandshake, ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { fmtRwf } from '../lib/consult';
import { CARE_PHONE, CARE_PHONE_TEL } from '../lib/care';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };
const inp = 'w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white placeholder:text-[#A0B4BC]';
const lbl = 'block text-xs font-bold text-[#5A7280] uppercase tracking-wider mb-1.5';

// Shown if the live prices cannot be loaded.
const FALLBACK = { nurse: 50000, caregiver: 30000 };

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${active ? 'border-[#0A6070] bg-[#0A6070]/5 text-[#0A6070]' : 'border-[#E8F0F2] bg-white text-[#5A7280] hover:border-[#D8E4E8]'}`} style={font}>
      {children}
    </button>
  );
}

export default function HomeCare() {
  const { t } = useLanguage();
  const [prices, setPrices] = useState<Record<string, number>>(FALLBACK);

  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState<'nurse' | 'caregiver' | 'unsure'>('unsure');
  const [shift, setShift] = useState<'day' | 'night' | 'both' | 'unsure'>('unsure');
  const [startDate, setStartDate] = useState('');
  const [durationNote, setDurationNote] = useState('');
  const [locationType, setLocationType] = useState<'home' | 'hospital'>('home');
  const [locationDetail, setLocationDetail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('care_prices_public').select('code, rate_per_shift').then(({ data }) => {
      if (data?.length) setPrices(Object.fromEntries(data.map(r => [r.code as string, r.rate_per_shift as number])));
    });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!parentName.trim() || !cleanPhone) { setError(t('care.form.err.missing')); return; }
    if (!/^\+?\d{9,15}$/.test(cleanPhone)) { setError(t('care.form.err.phone')); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setError(t('care.form.err.email')); return; }
    setSending(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-care-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ parentName, phone: cleanPhone, email, service, shift, startDate, durationNote, locationType, locationDetail, message, website }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.success) setDone(body.reference as string);
      else if (body.error === 'too_many_requests') setError(t('care.form.err.many'));
      else if (body.error === 'invalid_phone') setError(t('care.form.err.phone'));
      else if (body.error === 'invalid_email') setError(t('care.form.err.email'));
      else setError(t('care.form.err.generic'));
    } catch {
      setError(t('care.form.err.generic'));
    }
    setSending(false);
  };

  const scrollToForm = () => document.getElementById('request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const services = [
    { code: 'nurse', name: t('care.nurse.name'), icon: Stethoscope, points: [t('care.nurse.p1'), t('care.nurse.p2'), t('care.nurse.p3')], tint: '#0A6070' },
    { code: 'caregiver', name: t('care.cg.name'), icon: HeartHandshake, points: [t('care.cg.p1'), t('care.cg.p2'), t('care.cg.p3')], tint: '#7C3AED' },
  ] as const;

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="relative pt-28 pb-0 hero-gradient overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#F0A500] mb-2" style={font}>{t('care.hero.label')}</p>
          <h1 className="text-3xl md:text-5xl font-light text-white leading-tight" style={serif}>{t('care.hero.title')}</h1>
          <p className="text-sm md:text-base text-white/80 max-w-xl mx-auto mt-4 leading-relaxed" style={font}>{t('care.hero.desc')}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <button onClick={scrollToForm} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm bg-white text-[#0A6070] hover:bg-white/95 shadow-lg transition-all" style={font}>
              {t('btn.requestNurse')} <ArrowRight className="w-4 h-4" />
            </button>
            <a href={`tel:${CARE_PHONE_TEL}`} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm border-2 border-white/60 text-white hover:bg-white/10 transition-all" style={font}>
              <Phone className="w-4 h-4" /> {CARE_PHONE}
            </a>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none"><path d="M0 40L1440 40L1440 10C1200 35 960 0 720 12C480 24 240 38 0 10L0 40Z" fill="#FBF8F3" /></svg>
        </div>
      </section>

      {/* Services and prices */}
      <section className="bg-[#FBF8F3] py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-light text-[#1A2B35]" style={serif}>{t('care.services.title')}</h2>
            <p className="text-sm text-[#5A7280] mt-2" style={font}>{t('care.services.sub')}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {services.map(s => (
              <div key={s.code} className="bg-white rounded-3xl border border-[#E8F0F2] shadow-sm overflow-hidden flex flex-col">
                <div className="p-7 text-white" style={{ background: `linear-gradient(135deg, ${s.tint} 0%, ${s.code === 'nurse' ? '#1AADA0' : '#C084FC'} 100%)` }}>
                  <s.icon className="w-8 h-8 mb-3 text-white/90" />
                  <h3 className="text-2xl font-light" style={serif}>{s.name}</h3>
                  <p className="mt-3 flex items-baseline gap-2" style={font}>
                    <span className="text-3xl font-bold">{fmtRwf(prices[s.code] ?? FALLBACK[s.code])}</span>
                    <span className="text-sm text-white/80">{t('home.care.perShift')}</span>
                  </p>
                </div>
                <ul className="p-7 space-y-3 flex-1">
                  {s.points.map(p => (
                    <li key={p} className="flex items-start gap-3 text-sm text-[#334155]" style={font}>
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.tint }} /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Shifts */}
          <div className="mt-14 bg-white rounded-3xl border border-[#E8F0F2] shadow-sm p-7 sm:p-9">
            <h3 className="text-2xl font-light text-[#1A2B35] text-center mb-6" style={serif}>{t('care.shift.title')}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm"><Sun className="w-6 h-6 text-amber-500" /></div>
                <div style={font}><p className="text-sm font-bold text-[#1A2B35]">{t('care.shift.day')}</p><p className="text-lg font-semibold text-amber-700">8:00 AM – 8:00 PM</p></div>
              </div>
              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm"><Moon className="w-6 h-6 text-indigo-500" /></div>
                <div style={font}><p className="text-sm font-bold text-[#1A2B35]">{t('care.shift.night')}</p><p className="text-lg font-semibold text-indigo-700">8:00 PM – 8:00 AM</p></div>
              </div>
            </div>
            <p className="text-xs text-[#5A7280] text-center mt-5" style={font}>{t('care.shift.note')}</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-light text-[#1A2B35] text-center mb-10" style={serif}>{t('care.how.title')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {([1, 2, 3] as const).map(n => (
              <div key={n} className="rounded-3xl bg-[#FBF8F3] p-7">
                <div className="w-10 h-10 rounded-full bg-[#0A6070] text-white font-bold flex items-center justify-center mb-4" style={font}>{n}</div>
                <h3 className="text-lg font-bold text-[#1A2B35] mb-2" style={font}>{t(`care.how.${n}.t` as const)}</h3>
                <p className="text-sm text-[#5A7280] leading-relaxed" style={font}>{t(`care.how.${n}.d` as const)}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-3xl border border-[#E8F0F2] p-7 sm:p-8">
            <h3 className="flex items-center gap-2 text-lg font-bold text-[#1A2B35] mb-4" style={font}><ShieldCheck className="w-5 h-5 text-[#0A6070]" /> {t('care.know.title')}</h3>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {(['care.know.1', 'care.know.2', 'care.know.3', 'care.know.4'] as const).map(k => (
                <li key={k} className="flex items-start gap-3 text-sm text-[#334155]" style={font}><CheckCircle2 className="w-4 h-4 mt-0.5 text-[#1AADA0] flex-shrink-0" /> {t(k)}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Request form */}
      <section id="request" className="bg-[#FBF8F3] py-16 scroll-mt-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-light text-[#1A2B35]" style={serif}>{t('care.form.title')}</h2>
            <p className="text-sm text-[#5A7280] mt-2" style={font}>{t('care.form.sub')}</p>
          </div>

          {done ? (
            <div className="bg-white rounded-3xl border border-[#E8F0F2] shadow-sm p-10 text-center">
              <CheckCircle2 className="w-14 h-14 text-[#1AADA0] mx-auto mb-4" />
              <h3 className="text-2xl font-light text-[#1A2B35] mb-2" style={serif}>{t('care.form.done.title')}</h3>
              <p className="text-sm text-[#5A7280]" style={font}>{t('care.form.done.desc')} <b className="text-[#0A6070]">{done}</b>.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="bg-white rounded-3xl border border-[#E8F0F2] shadow-sm p-6 sm:p-9 space-y-5" noValidate>
              {/* Hidden from people; bots tend to fill it. */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={lbl} style={font}>{t('care.form.name')}</label><input className={inp} value={parentName} onChange={e => setParentName(e.target.value)} autoComplete="name" /></div>
                <div><label className={lbl} style={font}>{t('care.form.phone')}</label><input className={inp} value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="07…" /></div>
                <div className="sm:col-span-2"><label className={lbl} style={font}>{t('care.form.email')}</label><input type="email" className={inp} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
              </div>

              <div>
                <label className={lbl} style={font}>{t('care.form.service')}</label>
                <div className="flex flex-wrap gap-2">
                  <Choice active={service === 'nurse'} onClick={() => setService('nurse')}>{t('care.nurse.name')}</Choice>
                  <Choice active={service === 'caregiver'} onClick={() => setService('caregiver')}>{t('care.cg.name')}</Choice>
                  <Choice active={service === 'unsure'} onClick={() => setService('unsure')}>{t('care.form.unsure')}</Choice>
                </div>
              </div>

              <div>
                <label className={lbl} style={font}>{t('care.form.shift')}</label>
                <div className="flex flex-wrap gap-2">
                  <Choice active={shift === 'day'} onClick={() => setShift('day')}>{t('care.shift.day')} · 8–8</Choice>
                  <Choice active={shift === 'night'} onClick={() => setShift('night')}>{t('care.shift.night')} · 8–8</Choice>
                  <Choice active={shift === 'both'} onClick={() => setShift('both')}>{t('care.form.both')}</Choice>
                  <Choice active={shift === 'unsure'} onClick={() => setShift('unsure')}>{t('care.form.unsure')}</Choice>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={lbl} style={font}>{t('care.form.start')}</label><input type="date" className={inp} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                <div><label className={lbl} style={font}>{t('care.form.duration')}</label><input className={inp} value={durationNote} onChange={e => setDurationNote(e.target.value)} placeholder={t('care.form.durationHint')} /></div>
              </div>

              <div>
                <label className={lbl} style={font}>{t('care.form.where')}</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Choice active={locationType === 'home'} onClick={() => setLocationType('home')}>{t('care.form.home')}</Choice>
                  <Choice active={locationType === 'hospital'} onClick={() => setLocationType('hospital')}>{t('care.form.hospital')}</Choice>
                </div>
                <input className={inp} value={locationDetail} onChange={e => setLocationDetail(e.target.value)} placeholder={t('care.form.place')} />
              </div>

              <div><label className={lbl} style={font}>{t('care.form.message')}</label><textarea className={`${inp} min-h-[90px] resize-y`} value={message} onChange={e => setMessage(e.target.value)} maxLength={800} /></div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3" style={font} role="alert">{error}</p>}

              <button type="submit" disabled={sending} className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm text-white disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg, #0A6070 0%, #1AADA0 100%)', ...font }}>
                {sending && <Loader2 className="w-4 h-4 animate-spin" />} {sending ? t('care.form.sending') : t('care.form.submit')}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Call strip */}
      <section className="bg-white py-10">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-sm text-[#5A7280] mb-2" style={font}>{t('care.callstrip')}</p>
          <a href={`tel:${CARE_PHONE_TEL}`} className="inline-flex items-center gap-2 text-2xl font-semibold text-[#0A6070] hover:underline" style={serif}><Phone className="w-5 h-5" /> {CARE_PHONE}</a>
        </div>
      </section>
    </div>
  );
}
