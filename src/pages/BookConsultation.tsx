import { useEffect, useMemo, useState } from 'react';
import { Stethoscope, Calendar, Clock, Phone, Building2, CheckCircle2, Smartphone, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import {
  ConsultMode, PublicProvider, MODE_LABEL,
  providerLabel, initials, fmtRwf,
  kigaliDayKey, addDaysToKey, dayKeyParts,
  fmtKigaliTime, fmtKigaliDateLong, fmtKigaliDateShort,
} from '../lib/consult';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const MOMO_DIAL = '*182*8*1*55699#';

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };
const inp = 'w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white placeholder:text-[#A0B4BC]';
const lbl = 'block text-xs font-bold text-[#5A7280] uppercase tracking-wider mb-1.5';

function Avatar({ p, size = 56 }: { p: PublicProvider; size?: number }) {
  return p.photo_url ? (
    <img src={p.photo_url} alt={providerLabel(p)} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-gradient-to-br from-[#0A6070] to-[#1AADA0] text-white flex items-center justify-center font-bold flex-shrink-0" style={{ width: size, height: size, fontSize: size * 0.34, ...font }}>
      {initials(p.full_name)}
    </div>
  );
}

function StepHeading({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-[#0A6070] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={font}>{n}</div>
      <div>
        <h2 className="text-xl font-light text-[#1A2B35] leading-tight" style={serif}>{title}</h2>
        {hint && <p className="text-xs text-[#5A7280] mt-0.5" style={font}>{hint}</p>}
      </div>
    </div>
  );
}

export default function BookConsultation() {
  const { settings } = useSiteSettings();

  const [providers, setProviders] = useState<PublicProvider[]>([]);
  const [slots, setSlots] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [specialty, setSpecialty] = useState('all');
  const [providerId, setProviderId] = useState('');
  const [dayKey, setDayKey] = useState('');
  const [slot, setSlot] = useState('');
  const [mode, setMode] = useState<ConsultMode>('call');

  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [babyAge, setBabyAge] = useState('');
  const [topic, setTopic] = useState('');
  const [payerName, setPayerName] = useState('');
  const [website, setWebsite] = useState(''); // honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ reference: string; providerName: string; startsAt: string; parentEmailSent: boolean } | null>(null);

  const fetchSlots = async (id: string) => {
    const { data } = await supabase.rpc('consult_available_slots', { p_provider: id, p_from: null, p_to: null });
    return (data ?? []) as string[];
  };

  const loadAll = async () => {
    setLoading(true);
    setLoadError('');
    const { data, error: err } = await supabase.from('consult_providers_public').select('*').order('position');
    if (err) {
      setLoadError('We could not load the available doctors. Please refresh the page.');
      setLoading(false);
      return;
    }
    const list = (data ?? []) as PublicProvider[];
    setProviders(list);
    const entries = await Promise.all(list.map(async p => [p.id, await fetchSlots(p.id)] as const));
    setSlots(Object.fromEntries(entries));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const specialties = useMemo(() => {
    const map = new Map<string, string>();
    providers.forEach(p => { if (p.specialty_id && p.specialty_name) map.set(p.specialty_id, p.specialty_name); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [providers]);

  const visibleProviders = providers.filter(p => specialty === 'all' || p.specialty_id === specialty);
  const provider = providers.find(p => p.id === providerId);
  const providerSlots = slots[providerId] ?? [];

  const slotsByDay = useMemo(() => {
    const m: Record<string, string[]> = {};
    providerSlots.forEach(s => { (m[kigaliDayKey(s)] ??= []).push(s); });
    return m;
  }, [providerSlots]);

  const days = useMemo(() => {
    const today = kigaliDayKey(new Date());
    return Array.from({ length: 15 }, (_, i) => addDaysToKey(today, i));
  }, []);

  const chooseProvider = (p: PublicProvider) => {
    setProviderId(p.id);
    setSlot('');
    const firstDay = (slots[p.id] ?? [])[0];
    setDayKey(firstDay ? kigaliDayKey(firstDay) : '');
  };

  const nextAvailable = (id: string) => {
    const first = (slots[id] ?? [])[0];
    return first ? `${fmtKigaliDateShort(first)}, ${fmtKigaliTime(first)}` : null;
  };

  const balance = provider ? Math.max(provider.full_fee - provider.booking_fee, 0) : 0;
  const feeRef = provider ?? providers[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!provider || !slot) { setError('Please choose a doctor and a time first.'); return; }
    if (!parentName.trim() || !phone.trim() || !email.trim() || !payerName.trim()) {
      setError('Please fill in your name, phone, email, and the name on the MoMo payment.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-consult-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          providerId: provider.id, startsAt: slot, mode,
          parentName, phone, email, babyAge, topic, payerName, website,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.success) {
        setDone({ reference: body.reference, providerName: body.providerName, startsAt: body.startsAt, parentEmailSent: !!body.parentEmailSent });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (body.error === 'slot_unavailable') {
        setError('Sorry, that time was just taken. Please choose another time.');
        setSlot('');
        const fresh = await fetchSlots(provider.id);
        setSlots(s => ({ ...s, [provider.id]: fresh }));
      } else if (body.error === 'too_many_pending') {
        setError('You already have two bookings waiting for payment verification. Please wait for those to be confirmed, or contact us.');
      } else if (body.error === 'invalid_phone') {
        setError('Please enter a valid phone number, for example 0788 123 456.');
      } else if (body.error === 'invalid_email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Something went wrong while booking. Please try again, or contact us.');
      }
    } catch {
      setError('We could not reach the server. Please check your connection and try again.');
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="page-enter min-h-screen flex items-center justify-center bg-[#FBF8F3] px-4 pt-28 pb-16">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#0A6070]/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-9 h-9 text-[#0A6070]" />
          </div>
          <h1 className="text-2xl font-light text-[#1A2B35] mb-2" style={serif}>Booking received</h1>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]" style={font}>Reference</p>
          <p className="text-2xl font-bold text-[#0A6070] mb-4 tracking-wide" style={font}>{done.reference}</p>
          <div className="bg-[#F6F8FA] rounded-xl p-4 text-left space-y-1.5 mb-5">
            <p className="text-sm text-[#1A2B35]" style={font}><span className="font-semibold">{done.providerName}</span></p>
            <p className="text-sm text-[#5A7280]" style={font}>{fmtKigaliDateLong(done.startsAt)} at {fmtKigaliTime(done.startsAt)} (Kigali time)</p>
          </div>
          <p className="text-sm text-[#5A7280] leading-relaxed" style={font}>
            We will verify your MoMo payment and email you at <span className="font-semibold text-[#1A2B35]">{email}</span> once your consultation is confirmed. Your time slot is held for 24 hours.
            {!done.parentEmailSent && ' (We could not send the receipt email just now — please keep your reference number.)'}
          </p>
          <p className="text-xs text-[#94A3B8] mt-4 leading-relaxed" style={font}>
            To cancel, reschedule, or request a refund, call {settings.org_phone} or email {settings.org_email}.
          </p>
          <a href="/" className="inline-block mt-6 text-sm font-semibold text-[#0A6070] hover:underline" style={font}>Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <section className="relative pt-28 pb-0 hero-gradient overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#F0A500] mb-2" style={font}>One-on-one consultation</p>
          <h1 className="text-3xl md:text-5xl font-light text-white leading-tight" style={serif}>Book a Doctor</h1>
          <p className="text-sm text-white/75 max-w-lg mx-auto mt-3" style={font}>
            Talk to a health professional about your baby or your own wellbeing, by phone or in person at our Kigali office.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none">
            <path d="M0 40L1440 40L1440 10C1200 35 960 0 720 12C480 24 240 38 0 10L0 40Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      <section className="bg-[#FBF8F3] py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-10">
            {/* Booking journey */}
            <div className="lg:col-span-3 min-w-0">
              {loading ? (
                <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm p-12 flex justify-center">
                  <Loader2 className="w-6 h-6 text-[#0A6070] animate-spin" />
                </div>
              ) : loadError ? (
                <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm p-8 text-sm text-red-600" style={font}>{loadError}</div>
              ) : providers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm p-10 text-center">
                  <Stethoscope className="w-10 h-10 text-[#D8E4E8] mx-auto mb-3" />
                  <p className="text-sm text-[#5A7280]" style={font}>Online booking is not open yet. Please check back soon, or contact us.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Step 1 */}
                  <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm p-6 sm:p-8">
                    <StepHeading n={1} title="Choose who you'd like to see" />
                    {specialties.length > 1 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {[{ id: 'all', name: 'All' }, ...specialties].map(s => (
                          <button key={s.id} type="button" onClick={() => setSpecialty(s.id)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${specialty === s.id ? 'bg-[#0A6070] text-white' : 'bg-[#F2F6F7] text-[#5A7280] hover:bg-[#E8F0F2]'}`} style={font}>
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {visibleProviders.map(p => {
                        const next = nextAvailable(p.id);
                        const selected = p.id === providerId;
                        return (
                          <button key={p.id} type="button" disabled={!next} onClick={() => chooseProvider(p)}
                            className={`text-left rounded-xl border-2 p-4 transition-all ${selected ? 'border-[#0A6070] bg-[#0A6070]/5' : 'border-[#D8E4E8] bg-white hover:border-[#0A6070]/40'} ${!next ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            <div className="flex items-center gap-3">
                              <Avatar p={p} />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#1A2B35] leading-tight" style={font}>{providerLabel(p)}</p>
                                <p className="text-xs text-[#5A7280] mt-0.5" style={font}>{p.headline || p.specialty_name}</p>
                              </div>
                            </div>
                            {p.bio && <p className="text-xs text-[#5A7280] leading-relaxed mt-3 line-clamp-3" style={font}>{p.bio}</p>}
                            <p className={`text-[11px] font-semibold mt-3 flex items-center gap-1.5 ${next ? 'text-[#0A6070]' : 'text-[#94A3B8]'}`} style={font}>
                              <Clock className="w-3 h-3" />
                              {next ? `Next available: ${next}` : 'No times available right now'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2 */}
                  {provider && (
                    <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm p-6 sm:p-8">
                      <StepHeading n={2} title="Pick a day and time" hint={`${provider.slot_minutes}-minute consultation · times shown in Kigali time`} />
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                        {days.map(k => {
                          const count = (slotsByDay[k] ?? []).length;
                          const pt = dayKeyParts(k);
                          const active = k === dayKey;
                          return (
                            <button key={k} type="button" disabled={count === 0}
                              onClick={() => { setDayKey(k); setSlot(''); }}
                              className={`flex-shrink-0 w-16 rounded-xl border-2 py-2.5 text-center transition-all ${active ? 'border-[#0A6070] bg-[#0A6070] text-white' : count ? 'border-[#D8E4E8] bg-white hover:border-[#0A6070]/50 text-[#1A2B35]' : 'border-transparent bg-[#F6F8FA] text-[#C0CDD3] cursor-not-allowed'}`}>
                              <span className="block text-[10px] font-bold uppercase tracking-wide" style={font}>{pt.weekday}</span>
                              <span className="block text-lg font-semibold leading-tight" style={serif}>{pt.day}</span>
                              <span className="block text-[10px]" style={font}>{pt.month}</span>
                            </button>
                          );
                        })}
                      </div>
                      {dayKey && (slotsByDay[dayKey] ?? []).length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                          {(slotsByDay[dayKey] ?? []).map(s => (
                            <button key={s} type="button" onClick={() => setSlot(s)}
                              className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${slot === s ? 'border-[#0A6070] bg-[#0A6070] text-white' : 'border-[#D8E4E8] bg-white text-[#1A2B35] hover:border-[#0A6070]/50'}`} style={font}>
                              {fmtKigaliTime(s)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#94A3B8] mt-4" style={font}>Select a day to see the available times.</p>
                      )}
                    </div>
                  )}

                  {/* Step 3 */}
                  {provider && slot && (
                    <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm p-6 sm:p-8 space-y-5">
                      <StepHeading n={3} title="Your details" />
                      <div>
                        <label className={lbl} style={font}>How would you like the consultation?</label>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {([['call', Phone, 'Phone / online call', 'We call you at your number'], ['in_person', Building2, 'In person', 'At the Voice of Preemies office']] as const).map(([val, Icon, title, sub]) => (
                            <button key={val} type="button" onClick={() => setMode(val)}
                              className={`flex items-center gap-3 text-left rounded-xl border-2 p-3.5 transition-all ${mode === val ? 'border-[#0A6070] bg-[#0A6070]/5' : 'border-[#D8E4E8] bg-white hover:border-[#0A6070]/40'}`}>
                              <Icon className={`w-5 h-5 flex-shrink-0 ${mode === val ? 'text-[#0A6070]' : 'text-[#A0B4BC]'}`} />
                              <span>
                                <span className="block text-sm font-semibold text-[#1A2B35]" style={font}>{title}</span>
                                <span className="block text-xs text-[#5A7280]" style={font}>{sub}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={lbl} style={font}>Your name</label>
                          <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="e.g. Uwase Diane" className={inp} required maxLength={100} />
                        </div>
                        <div>
                          <label className={lbl} style={font}>Phone number</label>
                          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="078X XXX XXX" className={inp} required inputMode="tel" maxLength={30} />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={lbl} style={font}>Email</label>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inp} required maxLength={150} />
                        </div>
                        <div>
                          <label className={lbl} style={font}>Baby's age <span className="normal-case font-medium text-[#A0B4BC]">(optional)</span></label>
                          <input value={babyAge} onChange={e => setBabyAge(e.target.value)} placeholder="e.g. 3 weeks, born at 32 weeks" className={inp} maxLength={60} />
                        </div>
                      </div>
                      <div>
                        <label className={lbl} style={font}>What would you like to talk about? <span className="normal-case font-medium text-[#A0B4BC]">(optional)</span></label>
                        <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} placeholder="A short note helps the doctor prepare." className={inp + ' resize-y'} maxLength={600} />
                      </div>
                      <input type="text" name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                    </div>
                  )}

                  {/* Step 4 */}
                  {provider && slot && (
                    <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm p-6 sm:p-8 space-y-5">
                      <StepHeading n={4} title="Pay the booking fee" hint="Your time is held for 24 hours while we verify the payment." />

                      <div className="rounded-xl bg-[#F6F8FA] p-4 space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm" style={font}>
                          <span className="text-[#5A7280]">With</span>
                          <span className="font-semibold text-[#1A2B35] text-right">{providerLabel(provider)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm" style={font}>
                          <span className="text-[#5A7280]">When</span>
                          <span className="font-semibold text-[#1A2B35] text-right">{fmtKigaliDateLong(slot)}, {fmtKigaliTime(slot)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm" style={font}>
                          <span className="text-[#5A7280]">How</span>
                          <span className="font-semibold text-[#1A2B35] text-right">{MODE_LABEL[mode]}</span>
                        </div>
                        <div className="border-t border-[#E3EAEE] pt-2 mt-2 flex items-center justify-between gap-3 text-sm" style={font}>
                          <span className="text-[#5A7280]">Pay now (booking fee)</span>
                          <span className="font-bold text-[#0A6070]">{fmtRwf(provider.booking_fee)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs text-[#5A7280]" style={font}>
                          <span>Balance after the consultation (full fee {fmtRwf(provider.full_fee)})</span>
                          <span className="font-semibold">{fmtRwf(balance)}</span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#FFF8EC] border border-[#F0A500]/20 p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-[#F0A500]/15 flex items-center justify-center flex-shrink-0">
                            <Smartphone className="w-5 h-5 text-[#F0A500]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1A2B35]" style={font}>Pay via MoMo</p>
                            <p className="text-xs text-[#5A7280]" style={font}>Dial the code below to pay {fmtRwf(provider.booking_fee)}</p>
                          </div>
                        </div>
                        <a href={`tel:${MOMO_DIAL}`}
                          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-white font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
                          style={{ background: 'linear-gradient(135deg,#F0A500,#E8644A)', ...font }}>
                          <Smartphone className="w-4 h-4" /> Dial {MOMO_DIAL}
                        </a>
                        <p className="text-[11px] text-[#A0B4BC] mt-2" style={font}>MTN and Airtel Mobile Money accepted.</p>
                      </div>

                      <div>
                        <label className={lbl} style={font}>Name on the MoMo payment</label>
                        <input value={payerName} onChange={e => setPayerName(e.target.value)} placeholder="Whose name does the payment show under?" className={inp} required maxLength={100} />
                        <p className="text-[11px] text-[#A0B4BC] mt-1.5" style={font}>We match this against our MoMo transactions to confirm your booking.</p>
                      </div>

                      {error && <p className="text-sm text-red-600" style={font}>{error}</p>}

                      <button type="submit" disabled={submitting}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0A6070] text-white text-sm font-bold rounded-xl hover:bg-[#084F5C] transition-colors disabled:opacity-60" style={font}>
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Booking...</> : <>Book consultation <ArrowRight className="w-4 h-4" /></>}
                      </button>
                    </div>
                  )}

                  {!(provider && slot) && error && <p className="text-sm text-red-600" style={font}>{error}</p>}
                </form>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 min-w-0">
              <div className="lg:sticky lg:top-28 space-y-6">
                <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E8F0F2] bg-[#0A6070]/8 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#0A6070]" />
                    <h3 className="text-sm font-bold text-[#0A6070]" style={font}>How it works</h3>
                  </div>
                  <ol className="p-6 space-y-4">
                    {[
                      'Choose a doctor and a time that suits you.',
                      `Pay the ${feeRef ? fmtRwf(feeRef.booking_fee) + ' ' : ''}booking fee through MoMo.`,
                      'We verify your payment and email you a confirmation.',
                      feeRef
                        ? `Have your consultation. The balance of the ${fmtRwf(feeRef.full_fee)} full fee is paid afterwards.`
                        : 'Have your consultation. The balance of the full fee is paid afterwards.',
                    ].map((t, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#0A6070]/10 text-[#0A6070] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={font}>{i + 1}</span>
                        <span className="text-sm text-[#5A7280] leading-relaxed" style={font}>{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-[#FFF4F1] rounded-2xl border border-[#E8644A]/20 p-5 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-[#E8644A] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#1A2B35]" style={font}>Not for emergencies</p>
                    <p className="text-xs text-[#5A7280] leading-relaxed mt-1" style={font}>
                      If your baby is in danger or needs urgent care, go to the nearest hospital immediately instead of booking here.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm p-6 flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={font}>Cancel, reschedule or refund</p>
                    <p className="text-sm text-[#1A2B35] font-semibold" style={font}>{settings.org_phone}</p>
                    <p className="text-xs text-[#5A7280] mt-0.5" style={font}>or email {settings.org_email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
