import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, UserRoundCheck, Smartphone } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Drawer from '../../components/Drawer';
import { ImageUploadField } from '../../components/UploadField';
import { SearchInput, inp, ta, Lbl } from '../../components/shared';
import {
  Avatar, Btn, CareGate, Empty, Notice, PageTitle, Pill, SERVICE_SHORT, SERVICE_LABEL, ServiceCode, Staff, StaffTotals, card, fmtRwf, font, friendlyError, selectCls,
} from './shared';

export function StaffForm({ staff, defaultRole, onClose, onSaved }: { staff?: Staff; defaultRole?: ServiceCode; onClose: () => void; onSaved: (id: string) => void }) {
  const [d, setD] = useState<Partial<Staff>>(staff ?? { role: defaultRole ?? 'nurse', status: 'active', full_name: '', phone: '', momo_number: '', momo_name: '', email: '', national_id: '', photo_url: '', qualifications: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (p: Partial<Staff>) => setD(x => ({ ...x, ...p }));

  const save = async () => {
    setError('');
    if (!d.full_name?.trim()) { setError('Please enter the full name.'); return; }
    if (!d.phone?.trim()) { setError('Please enter a phone number.'); return; }
    if (d.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) { setError('That email address does not look right.'); return; }
    setSaving(true);
    const row = {
      role: d.role, full_name: d.full_name.trim(), phone: d.phone.trim(), momo_number: (d.momo_number ?? '').trim(), momo_name: (d.momo_name ?? '').trim(),
      email: (d.email ?? '').trim(), national_id: (d.national_id ?? '').trim(), photo_url: d.photo_url ?? '', qualifications: (d.qualifications ?? '').trim(),
      status: d.status, notes: (d.notes ?? '').trim(), contract_signed_on: d.contract_signed_on || null,
    };
    if (staff) {
      const { error: e } = await supabase.from('care_staff').update(row).eq('id', staff.id);
      setSaving(false);
      if (e) { setError(friendlyError(e.message)); return; }
      onSaved(staff.id);
    } else {
      const { data, error: e } = await supabase.from('care_staff').insert(row).select('id').single();
      setSaving(false);
      if (e || !data) { setError(friendlyError(e?.message ?? 'Could not save.')); return; }
      onSaved(data.id as string);
    }
  };

  return (
    <Drawer title={staff ? `Edit ${staff.full_name}` : 'Add a nurse or caregiver'} onClose={onClose} width="lg" footer={
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-red-600 font-medium min-w-0" style={font}>{error}</p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold" style={font}>Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold disabled:opacity-60" style={font}>{saving ? 'Saving…' : staff ? 'Save changes' : 'Add to the team'}</button>
        </div>
      </div>
    }>
      <div className="space-y-4">
        <ImageUploadField label="Photo" value={d.photo_url ?? ''} onChange={url => set({ photo_url: url })} folder="voice-of-preemies/care-team" />
        <div>
          <Lbl t="Role" />
          <div className="grid grid-cols-2 gap-2">
            {(['nurse', 'caregiver'] as ServiceCode[]).map(r => (
              <button key={r} type="button" disabled={!!staff} onClick={() => set({ role: r })}
                className={`text-left rounded-xl border-2 px-3 py-2.5 transition-all disabled:cursor-not-allowed ${d.role === r ? 'border-[#0A6070] bg-[#0A6070]/5' : 'border-slate-200 hover:border-slate-300 disabled:opacity-50'}`}>
                <span className="block text-[12px] font-bold text-[#1e293b]" style={font}>{SERVICE_LABEL[r]}</span>
              </button>
            ))}
          </div>
          {staff && <p className="text-[10px] text-[#94A3B8] mt-1" style={font}>A person’s role cannot be changed once they exist, because their past shifts and pay depend on it.</p>}
        </div>
        <div><Lbl t="Full name" /><input value={d.full_name ?? ''} onChange={e => set({ full_name: e.target.value })} className={inp} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl t="Phone" /><input value={d.phone ?? ''} onChange={e => set({ phone: e.target.value })} className={inp} placeholder="07…" /></div>
          <div><Lbl t="Email" /><input type="email" value={d.email ?? ''} onChange={e => set({ email: e.target.value })} className={inp} /></div>
          <div><Lbl t="MoMo number (we pay here)" /><input value={d.momo_number ?? ''} onChange={e => set({ momo_number: e.target.value })} className={inp} placeholder="07…" /></div>
          <div><Lbl t="Name on the MoMo account" /><input value={d.momo_name ?? ''} onChange={e => set({ momo_name: e.target.value })} className={inp} /></div>
          <div><Lbl t="National ID or passport" /><input value={d.national_id ?? ''} onChange={e => set({ national_id: e.target.value })} className={inp} /></div>
          <div><Lbl t="Contract signed on" /><input type="date" value={d.contract_signed_on ?? ''} onChange={e => set({ contract_signed_on: e.target.value || null })} className={inp} /></div>
        </div>
        <div><Lbl t="Qualifications and training" /><textarea value={d.qualifications ?? ''} onChange={e => set({ qualifications: e.target.value })} className={`${ta} min-h-[60px]`} placeholder="e.g. A1 nursing diploma, neonatal care course…" /></div>
        <div><Lbl t="Status" />
          <select value={d.status} onChange={e => set({ status: e.target.value as Staff['status'] })} className={inp}>
            <option value="active">Active, can be given shifts</option><option value="paused">Paused, temporarily unavailable</option><option value="ended">Ended, no longer with us</option>
          </select></div>
        <div><Lbl t="Notes (private)" /><textarea value={d.notes ?? ''} onChange={e => set({ notes: e.target.value })} className={ta} /></div>
      </div>
    </Drawer>
  );
}

export default function TeamPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [totals, setTotals] = useState<Map<string, StaffTotals>>(new Map());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<'all' | ServiceCode>('all');
  const [status, setStatus] = useState<'current' | 'all'>('current');
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([
      supabase.from('care_staff').select('*').is('deleted_at', null).order('full_name'),
      supabase.from('care_staff_totals').select('*'),
    ]);
    setStaff((s.data ?? []) as Staff[]);
    setTotals(new Map(((t.data ?? []) as StaffTotals[]).map(x => [x.staff_id, x])));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return staff.filter(s => {
      if (role !== 'all' && s.role !== role) return false;
      if (status === 'current' && s.status === 'ended') return false;
      const hay = `${s.full_name} ${s.phone} ${s.momo_number} ${s.email}`.toLowerCase();
      return tokens.every(t => hay.includes(t));
    });
  }, [staff, q, role, status]);

  const counts = { nurse: staff.filter(s => s.role === 'nurse' && s.status === 'active').length, caregiver: staff.filter(s => s.role === 'caregiver' && s.status === 'active').length };

  return (
    <CareGate>
      <PageTitle
        title="Care Team"
        subtitle={`${counts.nurse} active nurse${counts.nurse === 1 ? '' : 's'} and ${counts.caregiver} active caregiver${counts.caregiver === 1 ? '' : 's'}`}
        action={<Btn icon={Plus} onClick={() => setAdding(true)}>Add nurse or caregiver</Btn>}
      />
      {flash && <div className="mb-3"><Notice kind="ok" onClose={() => setFlash('')}>{flash}</Notice></div>}

      <div className={`${card} p-3 mb-3 flex flex-wrap items-center gap-2`}>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, phone, MoMo or email…" />
        <select value={role} onChange={e => setRole(e.target.value as typeof role)} className={selectCls} style={font} aria-label="Filter by role">
          <option value="all">Nurses and caregivers</option><option value="nurse">Nurses only</option><option value="caregiver">Caregivers only</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={selectCls} style={font} aria-label="Filter by status">
          <option value="current">Current team</option><option value="all">Include people who left</option>
        </select>
      </div>

      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-10" style={font}>Loading…</p> : shown.length === 0 ? (
        <div className={card}><Empty icon={UserRoundCheck} title={staff.length ? 'No one matches' : 'No one on the team yet'} hint={staff.length ? 'Try a different search or filter.' : 'Add your nurses and caregivers with their photo and MoMo number. You can then give them shifts and pay them.'} action={!staff.length ? <Btn icon={Plus} onClick={() => setAdding(true)}>Add the first one</Btn> : undefined} /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {shown.map(s => {
            const t = totals.get(s.id);
            return (
              <Link key={s.id} to={`/dashboard/care/team/${s.id}`} className={`${card} p-4 hover:shadow-md hover:border-slate-200 transition-all block`}>
                <div className="flex items-start gap-3">
                  <Avatar name={s.full_name} url={s.photo_url} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[#0f172a] truncate" style={font}>{s.full_name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Pill tone={s.role === 'nurse' ? 'teal' : 'pink'}>{SERVICE_SHORT[s.role]}</Pill>
                      {s.status !== 'active' && <Pill tone={s.status === 'paused' ? 'amber' : 'slate'}>{s.status === 'paused' ? 'Paused' : 'Left'}</Pill>}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1.5 flex items-center gap-1 truncate" style={font}><Smartphone className="w-3 h-3" /> {s.momo_number || <span className="text-amber-600 font-semibold">No MoMo number</span>}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-50 text-center" style={font}>
                  <div><p className="text-[14px] font-bold text-[#0f172a]">{t?.shifts_upcoming ?? 0}</p><p className="text-[9px] text-[#94A3B8] uppercase font-bold tracking-wider">Upcoming</p></div>
                  <div><p className="text-[14px] font-bold text-[#0f172a]">{t?.shifts_completed ?? 0}</p><p className="text-[9px] text-[#94A3B8] uppercase font-bold tracking-wider">Done</p></div>
                  <div><p className={`text-[14px] font-bold ${Number(t?.due ?? 0) > 0 ? 'text-amber-600' : 'text-[#0f172a]'}`}>{fmtRwf(Number(t?.due ?? 0)).replace(' RWF', '')}</p><p className="text-[9px] text-[#94A3B8] uppercase font-bold tracking-wider">Owed</p></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {adding && <StaffForm onClose={() => setAdding(false)} onSaved={id => { setAdding(false); setFlash('Added to the team.'); void load(); navigate(`/dashboard/care/team/${id}`); }} />}
    </CareGate>
  );
}
