import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) navigate('/dashboard');
    else setError('Invalid credentials. Please try again.');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #1A2B35 100%)' }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/3 -left-20 w-96 h-96 rounded-full bg-[#0A6070]/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full bg-[#1AADA0]/15 blur-3xl" />
        <div className="relative z-10">
          <img src="/Voice_Of_Preemies_Logo.png" alt="Voice of Preemies" className="h-14 w-auto brightness-0 invert" />
        </div>
        <div className="relative z-10">
          <p className="text-[#1AADA0] text-xs uppercase tracking-widest font-semibold mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Admin Dashboard</p>
          <h1 className="text-4xl xl:text-5xl font-light text-white mb-6 leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Manage content,<br /><span className="font-semibold italic text-[#1AADA0]">empower families.</span>
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Full control over your organization's content, stories, programs, and community data — all in one place.
          </p>
        </div>
        <div className="relative z-10 flex gap-8">
          {[['1,200+', 'Families Supported'], ['14', 'Hospital Partners'], ['3,800+', 'Support Sessions']].map(([val, label]) => (
            <div key={label}>
              <p className="text-2xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{val}</p>
              <p className="text-xs text-white/40 mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10 flex justify-center">
            <img src="/Voice_Of_Preemies_Logo.png" alt="Voice of Preemies" className="h-12 w-auto brightness-0 invert" />
          </div>
          <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#0A6070]/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-[#0A6070]" />
              </div>
              <h2 className="text-2xl font-semibold text-[#1A2B35]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Admin Sign In</h2>
              <p className="text-sm text-[#5A7280] mt-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Sign in with your admin credentials</p>
            </div>
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl mb-6">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#1A2B35] uppercase tracking-wider mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A7280]" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@voiceofpreemies.org" className="w-full pl-10 pr-4 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] placeholder-[#A0B4BC] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1A2B35] uppercase tracking-wider mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A7280]" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="w-full pl-10 pr-11 py-3 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] placeholder-[#A0B4BC] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5A7280] hover:text-[#1A2B35] transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #0A6070 0%, #1AADA0 100%)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {loading ? 'Signing in...' : 'Sign In to Dashboard'}
              </button>
            </form>
            <p className="text-center text-xs text-[#A0B4BC] mt-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Voice of Preemies Rwanda — Admin Portal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
