import { useState } from 'react';
import { X, Eye, EyeOff, Check, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { inp, Lbl } from './shared';

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };

/** Lets any signed-in dashboard user change their own password. */
export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { adminEmail } = useAdminAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError('');
    if (next.length < 8) { setError('The new password must be at least 8 characters.'); return; }
    if (next !== again) { setError('The two new passwords do not match.'); return; }
    if (next === current) { setError('Please choose a password different from the current one.'); return; }
    setBusy(true);
    // Confirm the current password first, so a borrowed open session cannot silently change it.
    const check = await supabase.auth.signInWithPassword({ email: adminEmail, password: current });
    if (check.error) { setBusy(false); setError('The current password is not correct.'); return; }
    const { error: err } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <button onClick={onClose} className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="w-4 h-4" /></button>
        <div className="w-11 h-11 rounded-2xl bg-[#0A6070]/10 flex items-center justify-center mb-3"><KeyRound className="w-5 h-5 text-[#0A6070]" /></div>
        <h2 className="text-[16px] font-bold text-[#0f172a]" style={font}>Change your password</h2>
        <p className="text-[11px] text-[#64748B] mt-0.5 mb-4" style={font}>{adminEmail}</p>

        {done ? (
          <div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-[12px] font-semibold" style={font}><Check className="w-4 h-4" /> Your password has been changed.</div>
            <button onClick={onClose} className="mt-4 w-full px-3 py-2.5 rounded-xl bg-[#0A6070] text-white text-[12px] font-semibold" style={font}>Done</button>
          </div>
        ) : (
          <div className="space-y-3">
            {error && <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-[11px] font-semibold" style={font}><AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {error}</div>}
            <div><Lbl t="Current password" /><input type={show ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)} className={inp} autoComplete="current-password" /></div>
            <div><Lbl t="New password" /><input type={show ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)} className={inp} autoComplete="new-password" placeholder="At least 8 characters" /></div>
            <div><Lbl t="New password again" /><input type={show ? 'text' : 'password'} value={again} onChange={e => setAgain(e.target.value)} className={inp} autoComplete="new-password" /></div>
            <button type="button" onClick={() => setShow(s => !s)} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748B] hover:text-[#0A6070]" style={font}>
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {show ? 'Hide' : 'Show'} passwords
            </button>
            <button onClick={submit} disabled={busy || !current || !next || !again} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold disabled:opacity-50" style={font}>
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {busy ? 'Saving…' : 'Change password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
