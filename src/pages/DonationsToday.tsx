import { useState } from 'react';
import { Smartphone, Building2, Package, CalendarHeart, CheckCircle, ChevronDown, MapPin, Truck, AlertCircle, Phone, Mail, StickyNote } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Config ─────────────────────────────────────────────────────────────────────
const EVENT_LABEL = 'Fundraising Drive — 20 June 2026';
const EVENT_DATE = '20 June 2026';
const COMMITMENT_DATE = '2026-06-20';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ── Bank details (update as needed) ────────────────────────────────────────────
const BANK = {
  name: 'Equity Bank',
  accountName: 'Voice of Preemies',
  accountNumber: '400 220 139 5363',
  swift: ' EQBLRWRW',
  branch: 'Kigali Branch',
  currency: 'RWF / USD',
};

// ── Shared input style ──────────────────────────────────────────────────────────
const inp = 'w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white placeholder:text-[#A0B4BC]';

// ── Types ──────────────────────────────────────────────────────────────────────
type CardId = 'momo' | 'bank' | 'materials' | 'commitment';
type LogisticsMode = 'dropoff' | 'pickup';

// ── MoMo Card ──────────────────────────────────────────────────────────────────
function MoMoCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Card
      id="momo"
      open={open}
      onToggle={onToggle}
      icon={<Smartphone className="w-6 h-6 text-[#F0A500]" />}
      iconBg="bg-[#FFF8EC]"
      title="Donate on MoMo"
      subtitle="Quick mobile money transfer"
      accentColor="#F0A500"
    >
      <div className="text-center py-4">
        <p className="text-sm text-[#5A7280] mb-5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Tap the button below. Your phone will open the MoMo dialer with our number pre-loaded.
        </p>
        <a
          href="tel:*182*8*1*55699#"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-base shadow-md transition-all hover:shadow-lg active:scale-95"
          style={{ background: 'linear-gradient(135deg,#F0A500,#E8644A)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          <Smartphone className="w-5 h-5" />
          Dial *182*8*1*55699#
        </a>
        <p className="text-xs text-[#A0B4BC] mt-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Works on all Rwandan mobile networks
        </p>
      </div>
    </Card>
  );
}

// ── Bank Card ──────────────────────────────────────────────────────────────────
function BankCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const rows: [string, string, string][] = [
    ['Bank', BANK.name, 'bank'],
    ['Account Name', BANK.accountName, 'name'],
    ['Account Number', BANK.accountNumber, 'number'],
    ['SWIFT / BIC', BANK.swift, 'swift'],
    ['Branch', BANK.branch, 'branch'],
    ['Currency', BANK.currency, 'currency'],
  ];

  return (
    <Card
      id="bank"
      open={open}
      onToggle={onToggle}
      icon={<Building2 className="w-6 h-6 text-[#0A6070]" />}
      iconBg="bg-[#EDF5F7]"
      title="Donate via Bank"
      subtitle="Direct bank transfer"
      accentColor="#0A6070"
    >
      <div className="space-y-2">
        <p className="text-sm text-[#5A7280] mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Use the details below to make a bank transfer. Tap any value to copy it.
        </p>
        {rows.map(([label, value, key]) => (
          <button
            key={key}
            type="button"
            onClick={() => copy(value, key)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#F7FBFC] border border-[#D8E4E8] hover:border-[#0A6070] hover:bg-[#EDF5F7] transition-all text-left group"
          >
            <div>
              <p className="text-[10px] font-bold text-[#5A7280] uppercase tracking-widest mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{label}</p>
              <p className="text-sm font-semibold text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{value}</p>
            </div>
            <span className={`text-[11px] font-bold transition-colors px-2 py-1 rounded-lg ${copied === key ? 'text-[#2D8A5F] bg-[#EFF8F4]' : 'text-[#0A6070] bg-[#EDF5F7] group-hover:bg-white'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {copied === key ? 'Copied!' : 'Copy'}
            </span>
          </button>
        ))}
        <p className="text-xs text-[#A0B4BC] pt-2 text-center" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Please use your name as payment reference so we can identify your donation.
        </p>
      </div>
    </Card>
  );
}

// ── Materials Card ─────────────────────────────────────────────────────────────
function MaterialsCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [form, setForm] = useState({ description: '', quantity: '', notes: '', logistics: 'dropoff' as LogisticsMode, pickup_address: '', pickup_availability: '', donor_name: '', donor_email: '', donor_phone: '' });
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

    const fullDescription = form.quantity.trim() ? `${form.description.trim()} (qty: ${form.quantity.trim()})` : form.description.trim();

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
    if (dbErr) { setError('Something went wrong. Please try again.'); setSubmitting(false); return; }

    fetch(`${SUPABASE_URL}/functions/v1/send-donation-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ type: 'inkind', donor_name: payload.donor_name, donor_email: payload.donor_email || null, donor_phone: payload.donor_phone, items_description: payload.items_description, logistics_mode: payload.logistics_mode, pickup_address: payload.pickup_address, notes: payload.notes, anonymous: payload.anonymous }),
    }).catch(() => {});

    setSubmitting(false);
    setDone(true);
  };

  return (
    <Card
      id="materials"
      open={open}
      onToggle={onToggle}
      icon={<Package className="w-6 h-6 text-[#E8644A]" />}
      iconBg="bg-[#FFF0ED]"
      title="Donate Materials"
      subtitle="Items, supplies & in-kind gifts"
      accentColor="#E8644A"
    >
      {done ? (
        <div className="text-center py-4">
          <CheckCircle className="w-10 h-10 text-[#2D8A5F] mx-auto mb-3" />
          <p className="font-semibold text-[#1A2B35] mb-1" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem' }}>Thank you!</p>
          <p className="text-sm text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>We've received your donation details and will be in touch to coordinate.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>What are you donating? *</label>
            <input type="text" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Baby clothes, formula, blankets…" className={inp} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Quantity / Amount</label>
            <input type="text" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 10 items, 2 bags…" className={inp} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Additional notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Condition, special handling, etc." className={inp + ' resize-none'} />
          </div>

          {/* Logistics */}
          <div>
            <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Delivery method</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm(f => ({ ...f, logistics: 'dropoff' }))}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form.logistics === 'dropoff' ? 'border-[#0A6070] bg-[#EDF5F7] text-[#0A6070]' : 'border-[#D8E4E8] text-[#5A7280] hover:border-[#0A6070]/40'}`}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                <MapPin className="w-4 h-4 flex-shrink-0" /> Drop off
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, logistics: 'pickup' }))}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form.logistics === 'pickup' ? 'border-[#E8A020] bg-[#FFF8EC] text-[#E8A020]' : 'border-[#D8E4E8] text-[#5A7280] hover:border-[#E8A020]/40'}`}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                <Truck className="w-4 h-4 flex-shrink-0" /> Pick up
              </button>
            </div>
          </div>

          {form.logistics === 'dropoff' && (
            <div className="flex items-start gap-2.5 p-3 bg-[#EDF5F7] rounded-xl text-sm text-[#0A6070]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><strong>King Faisal Hospital</strong>, KG 544 St, Kigali — mention "Voice of Preemies" at reception.</span>
            </div>
          )}

          {form.logistics === 'pickup' && (
            <div className="space-y-3 p-3 bg-[#FFF8EC] rounded-xl border border-[#E8A020]/20">
              <div>
                <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Your address *</label>
                <textarea rows={2} required value={form.pickup_address} onChange={e => setForm(f => ({ ...f, pickup_address: e.target.value }))} placeholder="Street, district, Kigali" className={inp + ' resize-none'} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Best time for pickup *</label>
                <input type="text" required value={form.pickup_availability} onChange={e => setForm(f => ({ ...f, pickup_availability: e.target.value }))} placeholder="e.g. Weekday mornings, after 4 pm…" className={inp} />
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="pt-1 border-t border-[#D8E4E8]">
            <p className="text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Your contact</p>
            <div className="space-y-3">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0B4BC]" />
                <input type="tel" required value={form.donor_phone} onChange={e => setForm(f => ({ ...f, donor_phone: e.target.value }))} placeholder="Phone number *" className={inp + ' pl-10'} />
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0B4BC]" />
                <input type="email" value={form.donor_email} onChange={e => setForm(f => ({ ...f, donor_email: e.target.value }))} placeholder="Email (optional)" className={inp + ' pl-10'} />
              </div>
              <input type="text" value={form.donor_name} onChange={e => setForm(f => ({ ...f, donor_name: e.target.value }))} placeholder="Your name (optional)" className={inp} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{error}</p>
            </div>
          )}
          <button type="submit" disabled={submitting || !canSubmit}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#E8644A,#c94f33)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {submitting ? 'Submitting…' : 'Submit Donation'}
          </button>
        </form>
      )}
    </Card>
  );
}

// ── Commitment Card ────────────────────────────────────────────────────────────
function CommitmentCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
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
      event_label: EVENT_LABEL,
      commitment_date: COMMITMENT_DATE,
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    });

    if (dbErr) { setError('Something went wrong. Please try again.'); setSubmitting(false); return; }
    setSubmitting(false);
    setDone(true);
  };

  return (
    <Card
      id="commitment"
      open={open}
      onToggle={onToggle}
      icon={<CalendarHeart className="w-6 h-6 text-[#2D8A5F]" />}
      iconBg="bg-[#EFF8F4]"
      title="Commit to Donate"
      subtitle="Reserve your spot for the event"
      accentColor="#2D8A5F"
    >
      {done ? (
        <div className="text-center py-4">
          <CheckCircle className="w-10 h-10 text-[#2D8A5F] mx-auto mb-3" />
          <p className="font-semibold text-[#1A2B35] mb-1" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem' }}>Commitment recorded!</p>
          <p className="text-sm text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>We'll reach out before <strong>{EVENT_DATE}</strong> to confirm your donation.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Leave your number and we'll contact you before <strong className="text-[#1A2B35]">{EVENT_DATE}</strong> to coordinate your donation.
          </p>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0B4BC]" />
            <input type="tel" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number *" className={inp + ' pl-10'} />
          </div>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0B4BC]" />
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email (optional)" className={inp + ' pl-10'} />
          </div>
          <div className="relative">
            <StickyNote className="absolute left-3.5 top-3.5 w-4 h-4 text-[#A0B4BC]" />
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What you plan to donate (optional)" className={inp + ' pl-10 resize-none'} />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{error}</p>
            </div>
          )}
          <button type="submit" disabled={submitting || !form.phone.trim()}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#2D8A5F,#0A6070)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {submitting ? 'Saving…' : 'Confirm Commitment'}
          </button>
        </form>
      )}
    </Card>
  );
}

// ── Shared Card wrapper ────────────────────────────────────────────────────────
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
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#1A2B35] text-base leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem' }}>{title}</p>
          <p className="text-xs text-[#5A7280] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{subtitle}</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-[#5A7280] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-[#F0F4F6]">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DonationsToday() {
  const [openCard, setOpenCard] = useState<CardId | null>(null);

  const toggle = (id: CardId) => setOpenCard(prev => prev === id ? null : id);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-12 bg-[#FBF8F3]">

      {/* Logo */}
      <div className="mb-8">
        <img src="/Voice_Of_Preemies_Logo.png" alt="Voice of Preemies" className="h-12 w-auto object-contain" />
      </div>

      {/* Header */}
      <div className="text-center mb-10 max-w-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#E8644A] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Fundraising Event
        </p>
        <h1 className="text-4xl font-light text-[#1A2B35] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          {EVENT_DATE}
        </h1>
        <p className="text-sm text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Choose how you'd like to give
        </p>
      </div>

      {/* Cards */}
      <div className="w-full max-w-md space-y-3">
        <MoMoCard open={openCard === 'momo'} onToggle={() => toggle('momo')} />
        <BankCard open={openCard === 'bank'} onToggle={() => toggle('bank')} />
        <MaterialsCard open={openCard === 'materials'} onToggle={() => toggle('materials')} />
        <CommitmentCard open={openCard === 'commitment'} onToggle={() => toggle('commitment')} />
      </div>

      {/* Footer */}
      <p className="mt-10 text-xs text-[#A0B4BC] text-center" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Voice of Preemies &mdash; Every baby deserves a fighting chance
      </p>
    </div>
  );
}
