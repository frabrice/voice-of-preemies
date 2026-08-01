import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ArrowLeft, Heart, Stethoscope, HandHeart, Users,
  ArrowRight, CheckCircle, Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type SupportRole = 'parent' | 'healthcare' | 'donor' | 'supporter';

interface Props {
  open: boolean;
  initialRole?: SupportRole;
  onClose: () => void;
}

// ── Role definitions ──────────────────────────────────────────────────────────
const ROLES: { id: SupportRole; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; accent: string }[] = [
  { id: 'parent',     label: 'Parent / Family Member',    icon: Heart,       color: 'bg-rose-50 border-rose-200',    accent: '#E8644A' },
  { id: 'healthcare', label: 'Healthcare Professional',   icon: Stethoscope, color: 'bg-teal-50 border-teal-200',    accent: '#0A6070' },
  { id: 'donor',      label: 'Donor',                     icon: HandHeart,   color: 'bg-amber-50 border-amber-200',  accent: '#E8A020' },
  { id: 'supporter',  label: 'Supporter / Volunteer',     icon: Users,       color: 'bg-emerald-50 border-emerald-200', accent: '#2D8A5F' },
];

// ── Step 2 options per role ───────────────────────────────────────────────────
const SUPPORT_OPTIONS: Record<SupportRole, string[]> = {
  parent: [
    'Emotional support',
    'NICU guidance',
    'Peer connection',
    'Bereavement support',
    'General information',
  ],
  healthcare: [
    'Training & education',
    'Collaboration / referral',
    'Access to resources',
    'Attend an event',
  ],
  donor: [
    'One-time donation',
    'Monthly giving',
    'In-kind donation',
    'Corporate partnership',
  ],
  supporter: [
    'Volunteering',
    'Advocacy & awareness',
    'Peer support mentor',
    'Social media ambassador',
  ],
};

const REDIRECT_ROLES: SupportRole[] = ['donor', 'supporter'];

const REDIRECT_TARGET: Record<string, string> = {
  donor: '/donate',
  supporter: '/get-involved',
};

const REDIRECT_LABEL: Record<string, string> = {
  donor: 'Go to Donate Page',
  supporter: 'Go to Get Involved',
};

// ── Input style ───────────────────────────────────────────────────────────────
const inp = 'w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white placeholder:text-[#A0B4BC]';

// ── Total steps: parent/healthcare = 4 (role, type, info, confirm), donor/supporter = 2 (role, type+redirect)
function totalSteps(role: SupportRole | null) {
  if (!role) return 3;
  if (REDIRECT_ROLES.includes(role)) return 2;
  return 3;
}

export default function SupportModal({ open, initialRole, onClose }: Props) {
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(initialRole ? 2 : 1);
  const [role, setRole] = useState<SupportRole | null>(initialRole ?? null);
  const [supportType, setSupportType] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Reset when modal opens/closes or initialRole changes
  useEffect(() => {
    if (open) {
      setStep(initialRole ? 2 : 1);
      setRole(initialRole ?? null);
      setSupportType('');
      setForm({ name: '', phone: '', email: '', note: '' });
      setSubmitting(false);
      setSubmitted(false);
      setError('');
    }
  }, [open, initialRole]);

  if (!open) return null;

  const currentRole = ROLES.find(r => r.id === role);
  const isRedirectRole = role ? REDIRECT_ROLES.includes(role) : false;
  const steps = role ? totalSteps(role) : 3;

  const progress = submitted ? 100 : Math.round((step / steps) * 100);

  const handleSelectRole = (r: SupportRole) => {
    setRole(r);
    setStep(2);
  };

  const handleSelectType = (type: string) => {
    setSupportType(type);
    if (!REDIRECT_ROLES.includes(role!)) {
      setStep(3);
    }
  };

  const handleRedirect = () => {
    onClose();
    navigate(REDIRECT_TARGET[role!]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.from('support_requests').insert({
      role: role,
      support_type: supportType,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      note: form.note.trim() || null,
    });
    setSubmitting(false);
    if (err) {
      setError('Something went wrong. Please try again.');
    } else {
      fetch(`${SUPABASE_URL}/functions/v1/send-support-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          role: role,
          support_type: supportType,
          note: form.note.trim() || null,
        }),
      }).catch(() => {});
      setSubmitted(true);
    }
  };

  const handleBack = () => {
    if (step === 2) { setStep(1); setRole(initialRole ?? null); setSupportType(''); }
    if (step === 3) { setStep(2); setSupportType(''); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[460px] bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-[#D8E4E8] flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-[#0A6070] to-[#1AADA0] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && !submitted && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-lg text-[#5A7280] hover:bg-[#F0F4F6] hover:text-[#1A2B35] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {!submitted && (
              <span className="text-[11px] font-bold text-[#A0B4BC] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Step {step} of {steps}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5A7280] hover:bg-[#F0F4F6] hover:text-[#1A2B35] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">

          {/* ── Confirmation ─────────────────────────────────────────────────── */}
          {submitted && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#EFF8F4] flex items-center justify-center mb-5">
                <CheckCircle className="w-8 h-8 text-[#2D8A5F]" />
              </div>
              <h2 className="text-2xl font-light text-[#1A2B35] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Thank you, {form.name.split(' ')[0]}!
              </h2>
              <p className="text-sm text-[#5A7280] mb-1 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                We've received your request for <strong className="text-[#1A2B35]">{supportType}</strong>.
              </p>
              <p className="text-sm text-[#5A7280] mb-8 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                We'll be in touch within 24 hours.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-sm font-bold shadow-sm hover:shadow-md transition-all"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Close
              </button>
            </div>
          )}

          {/* ── Step 1 — Role selection ────────────────────────────────────────── */}
          {!submitted && step === 1 && (
            <div className="pt-4">
              <h2 className="text-2xl font-light text-[#1A2B35] mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Who are you?
              </h2>
              <p className="text-sm text-[#5A7280] mb-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Select the option that best describes you.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRole(r.id)}
                    className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 text-center transition-all duration-150 hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] ${r.color}`}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/70 shadow-sm">
                      <r.icon className="w-5 h-5" style={{ color: r.accent }} />
                    </div>
                    <span className="text-[13px] font-semibold text-[#1A2B35] leading-snug">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2 — Support type ─────────────────────────────────────────── */}
          {!submitted && step === 2 && role && (
            <div className="pt-4">
              {/* Role badge */}
              {currentRole && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4" style={{ background: `${currentRole.accent}15`, border: `1px solid ${currentRole.accent}30` }}>
                  <currentRole.icon className="w-3.5 h-3.5" style={{ color: currentRole.accent }} />
                  <span className="text-[12px] font-bold" style={{ color: currentRole.accent, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{currentRole.label}</span>
                </div>
              )}

              <h2 className="text-2xl font-light text-[#1A2B35] mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {role === 'parent' && 'What support do you need?'}
                {role === 'healthcare' && 'How can we help you?'}
                {role === 'donor' && 'How would you like to give?'}
                {role === 'supporter' && 'How would you like to get involved?'}
              </h2>
              <p className="text-sm text-[#5A7280] mb-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Choose the option that fits best.
              </p>

              <div className="space-y-2.5">
                {SUPPORT_OPTIONS[role].map(option => (
                  <button
                    key={option}
                    onClick={() => handleSelectType(option)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150 hover:shadow-sm ${
                      supportType === option
                        ? 'border-[#0A6070] bg-[#EDF5F7]'
                        : 'border-[#D8E4E8] bg-white hover:border-[#0A6070]/40 hover:bg-[#F7FBFC]'
                    }`}
                  >
                    <span className="text-[13px] font-medium text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{option}</span>
                    <ArrowRight className="w-4 h-4 text-[#A0B4BC] flex-shrink-0" />
                  </button>
                ))}
              </div>

              {/* Redirect CTA for Donor / Supporter */}
              {isRedirectRole && (
                <div className="mt-6 pt-5 border-t border-[#D8E4E8]">
                  <p className="text-[12px] text-[#5A7280] mb-3 text-center" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Ready to take the next step?
                  </p>
                  <button
                    onClick={handleRedirect}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-sm font-bold shadow-sm hover:shadow-md transition-all"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {REDIRECT_LABEL[role]}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3 — Contact information ──────────────────────────────────── */}
          {!submitted && step === 3 && (
            <div className="pt-4">
              {/* Selected type badge */}
              {supportType && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4" style={{ background: '#0A607015', border: '1px solid #0A607030' }}>
                  <span className="text-[12px] font-bold text-[#0A6070]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{supportType}</span>
                </div>
              )}

              <h2 className="text-2xl font-light text-[#1A2B35] mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Your information
              </h2>
              <p className="text-sm text-[#5A7280] mb-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                We'll use this to reach out to you directly.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                    className={inp}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+250 7XX XXX XXX"
                    className={inp}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Email <span className="text-[#A0B4BC] normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                    className={inp}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Note <span className="text-[#A0B4BC] normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="Anything you'd like us to know before we reach out…"
                    className={inp + ' resize-none'}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 text-center" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !form.name.trim() || !form.phone.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-sm font-bold shadow-sm hover:shadow-md disabled:opacity-60 transition-all mt-2"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                  {submitting ? 'Sending…' : 'Send Request'}
                </button>

                <p className="text-[11px] text-[#A0B4BC] text-center" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Your information is kept private and confidential.
                </p>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
