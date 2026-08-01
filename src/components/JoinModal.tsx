import { useState, useEffect } from 'react';
import {
  X, ArrowLeft, Heart, Stethoscope, Lightbulb, HandHeart, Users,
  CheckCircle, Loader2, Building2, Briefcase,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Role =
  | 'Parent / Family'
  | 'Healthcare Professional'
  | 'Advisor / Expert'
  | 'Volunteer'
  | 'Other Supporter';

interface RoleDef {
  id: Role;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  accent: string;
}

const ROLES: RoleDef[] = [
  {
    id: 'Parent / Family',
    label: 'Parent / Family',
    desc: 'A NICU parent or family member seeking support',
    icon: Heart,
    color: 'bg-rose-50 border-rose-200 hover:border-rose-300',
    accent: '#E8644A',
  },
  {
    id: 'Healthcare Professional',
    label: 'Healthcare Professional',
    desc: 'Doctor, nurse, or neonatal care specialist',
    icon: Stethoscope,
    color: 'bg-teal-50 border-teal-200 hover:border-teal-300',
    accent: '#0A6070',
  },
  {
    id: 'Advisor / Expert',
    label: 'Advisor / Expert',
    desc: 'Consultant, researcher, or domain expert',
    icon: Lightbulb,
    color: 'bg-amber-50 border-amber-200 hover:border-amber-300',
    accent: '#C68A1D',
  },
  {
    id: 'Volunteer',
    label: 'Volunteer',
    desc: 'Give your time and skills to our mission',
    icon: HandHeart,
    color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300',
    accent: '#2D8A5F',
  },
  {
    id: 'Other Supporter',
    label: 'Other Supporter',
    desc: 'Partner, donor, advocate, or ally',
    icon: Users,
    color: 'bg-sky-50 border-sky-200 hover:border-sky-300',
    accent: '#2572A8',
  },
];

const MOTIVATION_LABELS: Record<Role, string> = {
  'Parent / Family': 'How can we support you?',
  'Healthcare Professional': 'How would you like to contribute?',
  'Advisor / Expert': 'What expertise do you bring?',
  'Volunteer': 'What motivates you to volunteer?',
  'Other Supporter': 'How would you like to help?',
};

const HOW_HEARD_OPTIONS = [
  'Social media',
  'Hospital / healthcare provider',
  'Friend or family',
  'Internet search',
  'Community event',
  'News / media',
  'Other',
];

const inp =
  'w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white placeholder:text-[#A0B4BC]';
const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };

export default function JoinModal({ open, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    organization: '',
    expertise: '',
    motivation: '',
    how_heard: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setStep(1);
      setRole(null);
      setForm({ full_name: '', email: '', phone: '', organization: '', expertise: '', motivation: '', how_heard: '' });
      setSubmitting(false);
      setSubmitted(false);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const currentRole = ROLES.find(r => r.id === role);
  const showOrgFields = role === 'Healthcare Professional' || role === 'Advisor / Expert';
  const progress = submitted ? 100 : Math.round((step / 2) * 100);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const isParent = role === 'Parent / Family';
  const emailRequired = !isParent;
  const isStep2Valid = form.full_name.trim() && form.phone.trim() && (!emailRequired || form.email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep2Valid || !role) return;
    setSubmitting(true);
    setError('');

    const payload = {
      role,
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim(),
      organization: form.organization.trim() || null,
      expertise: form.expertise.trim() || null,
      motivation: form.motivation.trim() || null,
      how_heard: form.how_heard || null,
    };

    const { error: dbErr } = await supabase.from('join_requests').insert(payload);
    if (dbErr) {
      setSubmitting(false);
      setError('Something went wrong. Please try again.');
      return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-join-notification`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // Email is best-effort; don't block the user
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-[fadeIn_200ms_ease]" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-[slideUp_300ms_ease]"
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress */}
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
              <button onClick={() => setStep(1)} className="p-1.5 rounded-lg text-[#5A7280] hover:bg-[#F0F4F6] hover:text-[#1A2B35] transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {!submitted && (
              <span className="text-[11px] font-bold text-[#A0B4BC] uppercase tracking-widest" style={font}>
                Step {step} of 2
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#5A7280] hover:bg-[#F0F4F6] hover:text-[#1A2B35] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">

          {/* Confirmation */}
          {submitted && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#EFF8F4] flex items-center justify-center mb-5">
                <CheckCircle className="w-8 h-8 text-[#2D8A5F]" />
              </div>
              <h2 className="text-2xl font-light text-[#1A2B35] mb-2" style={serif}>
                Welcome, {form.full_name.split(' ')[0]}!
              </h2>
              <p className="text-sm text-[#5A7280] mb-1 leading-relaxed" style={font}>
                Thank you for joining Voice of Preemies as <strong className="text-[#1A2B35]">{role}</strong>.
              </p>
              <p className="text-sm text-[#5A7280] mb-6 leading-relaxed" style={font}>
                Our team will review your request and reach out shortly.
              </p>
              <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-xl px-5 py-4 mb-8 text-left">
                <p className="text-[13px] text-[#0F766E] leading-relaxed" style={font}>
                  {form.email.trim()
                    ? <>A confirmation email has been sent to <strong>{form.email}</strong>. If you don't see it, check your spam folder.</>
                    : <>Our team will reach out to you on the phone number you provided. We look forward to connecting with you!</>
                  }
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-sm font-bold shadow-sm hover:shadow-md transition-all"
                style={font}
              >
                Close
              </button>
            </div>
          )}

          {/* Step 1: Role selection */}
          {!submitted && step === 1 && (
            <div className="pt-4">
              <h2 className="text-2xl font-light text-[#1A2B35] mb-1" style={serif}>
                Join Voice of Preemies
              </h2>
              <p className="text-sm text-[#5A7280] mb-6" style={font}>
                Tell us who you are so we can welcome you the right way.
              </p>
              <div className="space-y-2.5">
                {ROLES.map(r => {
                  const selected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => { setRole(r.id); setStep(2); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-150 hover:shadow-sm active:scale-[0.99] ${
                        selected ? 'border-[#0A6070] bg-[#EDF5F7] shadow-sm' : r.color
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/80 shadow-sm flex-shrink-0">
                        <r.icon className="w-5 h-5" style={{ color: r.accent }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#1A2B35] leading-snug" style={font}>{r.label}</p>
                        <p className="text-[12px] text-[#5A7280] mt-0.5 leading-snug" style={font}>{r.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Contact details */}
          {!submitted && step === 2 && role && (
            <div className="pt-4">
              {currentRole && (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                  style={{ background: `${currentRole.accent}15`, border: `1px solid ${currentRole.accent}30` }}
                >
                  <currentRole.icon className="w-3.5 h-3.5" style={{ color: currentRole.accent }} />
                  <span className="text-[12px] font-bold" style={{ color: currentRole.accent, ...font }}>{currentRole.label}</span>
                </div>
              )}

              <h2 className="text-2xl font-light text-[#1A2B35] mb-1" style={serif}>
                Tell us about yourself
              </h2>
              <p className="text-sm text-[#5A7280] mb-6" style={font}>
                We'll use this to welcome you and stay connected.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>
                    Full Name *
                  </label>
                  <input type="text" required value={form.full_name} onChange={set('full_name')} placeholder="Your full name" className={inp} style={font} />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>
                    Email Address {emailRequired ? '*' : <span className="text-[#A0B4BC] normal-case font-normal">(optional)</span>}
                  </label>
                  <input type="email" required={emailRequired} value={form.email} onChange={set('email')} placeholder="your@email.com" className={inp} style={font} />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>
                    Phone Number *
                  </label>
                  <input type="tel" required value={form.phone} onChange={set('phone')} placeholder="+250 7XX XXX XXX" className={inp} style={font} />
                </div>

                {/* Conditional: Organization + Expertise */}
                {showOrgFields && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>
                        <Building2 className="w-3 h-3 inline mr-1 -mt-0.5" />
                        Organization <span className="text-[#A0B4BC] normal-case font-normal">(optional)</span>
                      </label>
                      <input type="text" value={form.organization} onChange={set('organization')} placeholder="Hospital, university, company…" className={inp} style={font} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>
                        <Briefcase className="w-3 h-3 inline mr-1 -mt-0.5" />
                        Area of Expertise <span className="text-[#A0B4BC] normal-case font-normal">(optional)</span>
                      </label>
                      <input type="text" value={form.expertise} onChange={set('expertise')} placeholder="Neonatology, public health, nutrition…" className={inp} style={font} />
                    </div>
                  </>
                )}

                {/* Motivation textarea (role-specific label) */}
                <div>
                  <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>
                    {MOTIVATION_LABELS[role]} <span className="text-[#A0B4BC] normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.motivation}
                    onChange={set('motivation')}
                    placeholder="Share a few words…"
                    className={inp + ' resize-none'}
                    style={font}
                  />
                </div>

                {/* How heard */}
                <div>
                  <label className="block text-[11px] font-bold text-[#1A2B35] uppercase tracking-widest mb-1.5" style={font}>
                    How did you hear about us? <span className="text-[#A0B4BC] normal-case font-normal">(optional)</span>
                  </label>
                  <select value={form.how_heard} onChange={set('how_heard')} className={inp} style={font}>
                    <option value="">Select…</option>
                    {HOW_HEARD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                {error && (
                  <p className="text-sm text-red-600 text-center" style={font}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !isStep2Valid}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-sm font-bold shadow-sm hover:shadow-md disabled:opacity-60 transition-all mt-2"
                  style={font}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                  {submitting ? 'Joining…' : 'Join Voice of Preemies'}
                </button>

                <p className="text-[11px] text-[#A0B4BC] text-center" style={font}>
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
