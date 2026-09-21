import { useState } from 'react';
import { Smartphone, CheckCircle2, User, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

type RegType = 'individual' | 'couple';

const PRICE: Record<RegType, number> = { individual: 20000, couple: 40000 };

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };
const inp = 'w-full px-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white placeholder:text-[#A0B4BC]';

export default function TrainingRegister() {
  const [type, setType] = useState<RegType>('individual');
  const [primaryName, setPrimaryName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [payerName, setPayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const amount = PRICE[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!primaryName.trim() || !phone.trim() || !email.trim() || !payerName.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (type === 'couple' && !partnerName.trim()) {
      setError('Please enter your partner\'s name.');
      return;
    }

    setSubmitting(true);
    const { error: dbErr } = await supabase.from('training_registrations').insert({
      registration_type: type,
      primary_name: primaryName.trim(),
      partner_name: type === 'couple' ? partnerName.trim() : null,
      phone: phone.trim(),
      email: email.trim(),
      payer_name: payerName.trim(),
      amount,
    });
    setSubmitting(false);

    if (dbErr) {
      setError('Something went wrong submitting your registration. Please try again.');
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="page-enter min-h-screen flex items-center justify-center bg-[#FBF8F3] px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#0A6070] mx-auto mb-4" />
          <h1 className="text-2xl font-light text-[#1A2B35] mb-3" style={serif}>Registration Received</h1>
          <p className="text-sm text-[#5A7280] leading-relaxed" style={font}>
            Thank you, {primaryName}. Once we've confirmed your payment, you'll receive a confirmation email at <span className="font-semibold text-[#1A2B35]">{email}</span> with your spot reserved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <section className="relative pt-28 pb-0 hero-gradient overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#F0A500] mb-2" style={font}>Journée Porte Ouverte</p>
          <h1 className="text-3xl md:text-5xl font-light text-white leading-tight" style={serif}>Mental Health Open Day</h1>
          <p className="text-sm text-white/70 max-w-lg mx-auto mt-3" style={font}>
            Sunday, 27 September 2026 · 1:00 PM – 5:00 PM · Beau Séjour Hotel, Kigali
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none">
            <path d="M0 40L1440 40L1440 10C1200 35 960 0 720 12C480 24 240 38 0 10L0 40Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      <section className="bg-[#FBF8F3] py-12">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
            {/* Registration type */}
            <div>
              <label className="block text-xs font-bold text-[#5A7280] uppercase tracking-wider mb-2" style={font}>Registration Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('individual')}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${type === 'individual' ? 'border-[#0A6070] bg-[#0A6070]/5' : 'border-[#D8E4E8] bg-white'}`}
                >
                  <User className={`w-5 h-5 ${type === 'individual' ? 'text-[#0A6070]' : 'text-[#A0B4BC]'}`} />
                  <span className="text-sm font-semibold text-[#1A2B35]" style={font}>Individual</span>
                  <span className="text-xs text-[#5A7280]" style={font}>20,000 RWF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('couple')}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${type === 'couple' ? 'border-[#0A6070] bg-[#0A6070]/5' : 'border-[#D8E4E8] bg-white'}`}
                >
                  <Users className={`w-5 h-5 ${type === 'couple' ? 'text-[#0A6070]' : 'text-[#A0B4BC]'}`} />
                  <span className="text-sm font-semibold text-[#1A2B35]" style={font}>Couple</span>
                  <span className="text-xs text-[#5A7280]" style={font}>40,000 RWF</span>
                </button>
              </div>
            </div>

            {/* Names */}
            <div>
              <label className="block text-xs font-bold text-[#5A7280] uppercase tracking-wider mb-1.5" style={font}>{type === 'couple' ? 'Your Name' : 'Full Name'}</label>
              <input value={primaryName} onChange={e => setPrimaryName(e.target.value)} placeholder="e.g. Uwase Diane" className={inp} required />
            </div>
            {type === 'couple' && (
              <div>
                <label className="block text-xs font-bold text-[#5A7280] uppercase tracking-wider mb-1.5" style={font}>Partner's Name</label>
                <input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="e.g. Mugisha Eric" className={inp} required />
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#5A7280] uppercase tracking-wider mb-1.5" style={font}>Phone Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="078X XXX XXX" className={inp} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5A7280] uppercase tracking-wider mb-1.5" style={font}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inp} required />
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-xl bg-[#FFF8EC] border border-[#F0A500]/20 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0A500]/15 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-[#F0A500]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A2B35]" style={font}>Pay via MoMo</p>
                  <p className="text-xs text-[#5A7280]" style={font}>Dial the code below to pay {amount.toLocaleString()} RWF</p>
                </div>
              </div>
              <a
                href="tel:*182*8*1*55699#"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-white font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#F0A500,#E8644A)', ...font }}
              >
                <Smartphone className="w-4 h-4" /> Dial *182*8*1*55699#
              </a>
              <p className="text-[11px] text-[#A0B4BC] mt-2" style={font}>MTN and Airtel Mobile Money accepted.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A7280] uppercase tracking-wider mb-1.5" style={font}>Name on the MoMo Payment</label>
              <input value={payerName} onChange={e => setPayerName(e.target.value)} placeholder="Whose name does the payment show under?" className={inp} required />
              <p className="text-[11px] text-[#A0B4BC] mt-1.5" style={font}>We'll match this against our MoMo transactions to confirm your spot.</p>
            </div>

            {error && <p className="text-sm text-red-600" style={font}>{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3.5 bg-[#0A6070] text-white text-sm font-bold rounded-xl hover:bg-[#084F5C] transition-colors disabled:opacity-60"
              style={font}
            >
              {submitting ? 'Submitting...' : `Register — ${amount.toLocaleString()} RWF`}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
