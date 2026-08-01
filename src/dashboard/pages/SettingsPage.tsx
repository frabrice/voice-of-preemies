import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminAuth, Permission } from '../../contexts/AdminAuthContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { Settings as SettingsIcon, Building2, Globe, ShieldCheck, Share2, Check, AlertCircle } from 'lucide-react';
import { PageHeader, Lbl, inp } from '../components/shared';

export default function SettingsPage() {
  const { adminEmail, adminRole, displayName, can } = useAdminAuth();
  const { settings, refresh } = useSiteSettings();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { setForm(settings); }, [settings]);

  const allPerms: Permission[] = ['website', 'database', 'contact', 'donations', 'events', 'documents', 'finance', 'users', 'settings', 'trash', 'subscribers'];

  const save = async () => {
    if (!settings.id) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('site_settings')
      .update({
        org_name: form.org_name,
        org_email: form.org_email,
        org_phone: form.org_phone,
        org_address: form.org_address,
        facebook_url: form.facebook_url,
        instagram_url: form.instagram_url,
        twitter_url: form.twitter_url,
        youtube_url: form.youtube_url,
        default_currency: form.default_currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);
    setSaving(false);
    if (error) {
      setMsg({ type: 'error', text: error.message });
      return;
    }
    await refresh();
    setMsg({ type: 'success', text: 'Settings saved — changes are now live on the website.' });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Organization profile and dashboard preferences" />

      {msg && (
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {msg.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {msg.text}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white/80 rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-[14px] font-bold text-[#0f172a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Organization Profile</h3>
          </div>
          <p className="text-[10px] text-[#94A3B8] mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Shown across the public website — footer, contact page, and the emergency support banner.</p>
          <div className="space-y-3">
            <div><Lbl t="Organization Name" /><input value={form.org_name} onChange={e => setForm({ ...form, org_name: e.target.value })} className={inp} /></div>
            <div><Lbl t="Email" /><input value={form.org_email} onChange={e => setForm({ ...form, org_email: e.target.value })} className={inp} /></div>
            <div><Lbl t="Phone" /><input value={form.org_phone} onChange={e => setForm({ ...form, org_phone: e.target.value })} placeholder="+250799534956" className={inp} /></div>
            <div><Lbl t="Address" /><input value={form.org_address} onChange={e => setForm({ ...form, org_address: e.target.value })} className={inp} /></div>
          </div>
        </div>

        <div className="bg-white/80 rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-400 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-[14px] font-bold text-[#0f172a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Social Media</h3>
          </div>
          <p className="text-[10px] text-[#94A3B8] mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>An icon only appears in the website footer once its link is set here.</p>
          <div className="space-y-3">
            <div><Lbl t="Facebook URL" /><input value={form.facebook_url} onChange={e => setForm({ ...form, facebook_url: e.target.value })} placeholder="https://facebook.com/..." className={inp} /></div>
            <div><Lbl t="Instagram URL" /><input value={form.instagram_url} onChange={e => setForm({ ...form, instagram_url: e.target.value })} placeholder="https://instagram.com/..." className={inp} /></div>
            <div><Lbl t="Twitter / X URL" /><input value={form.twitter_url} onChange={e => setForm({ ...form, twitter_url: e.target.value })} placeholder="https://x.com/..." className={inp} /></div>
            <div><Lbl t="YouTube URL" /><input value={form.youtube_url} onChange={e => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://youtube.com/..." className={inp} /></div>
          </div>
        </div>

        <div className="bg-white/80 rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-[14px] font-bold text-[#0f172a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Your Account</h3>
          </div>
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest">Display Name</p>
              <p className="text-[13px] text-[#1e293b] font-medium">{displayName}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest">Email</p>
              <p className="text-[13px] text-[#1e293b] font-medium">{adminEmail}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest">Role</p>
              <p className="text-[13px] text-[#1e293b] font-medium capitalize">{adminRole.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-[14px] font-bold text-[#0f172a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Preferences</h3>
          </div>
          <div className="space-y-3">
            <div><Lbl t="Default Currency" /><select value={form.default_currency} onChange={e => setForm({ ...form, default_currency: e.target.value })} className={inp}><option>USD</option><option>RWF</option><option>EUR</option><option>GBP</option></select></div>
          </div>
        </div>

        <div className="bg-white/80 rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-[14px] font-bold text-[#0f172a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Your Permissions</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allPerms.map(p => (
              <span key={p} className={`text-[10px] px-2 py-1 rounded-full font-bold ${can(p) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !settings.id}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-bold disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
