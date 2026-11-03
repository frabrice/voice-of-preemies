import { useMemo, useState } from 'react';
import { GraduationCap, Download, Trash2, ExternalLink } from 'lucide-react';
import { useCrud, EmptyState, SearchInput, fmtDateTime } from '../components/shared';
import ConfirmDialog from '../components/ConfirmDialog';

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };

interface Reg {
  id: string; training_key: string; full_name: string; phone: string; email: string; years_experience: number;
  workplace: string; status: 'registered' | 'attended' | 'cancelled'; created_at: string;
}

const STATUS_STYLE: Record<Reg['status'], string> = {
  registered: 'bg-sky-50 text-sky-700',
  attended: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

/** Nurses who registered on /nurse-training. The public form saves through an edge function, so this list is read and managed only here. */
export default function NurseTrainingTab() {
  const { items, loading, update, softDelete } = useCrud<Reg>('nurse_training_registrations');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | Reg['status']>('all');
  const [deleting, setDeleting] = useState<Reg | null>(null);

  const shown = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter(r => (status === 'all' || r.status === status)
      && tokens.every(t => `${r.full_name} ${r.email} ${r.phone} ${r.workplace}`.toLowerCase().includes(t)));
  }, [items, search, status]);

  const active = items.filter(r => r.status !== 'cancelled');
  const avgYears = active.length ? Math.round((active.reduce((s, r) => s + r.years_experience, 0) / active.length) * 10) / 10 : 0;
  const workplaces = new Set(active.map(r => r.workplace.trim().toLowerCase())).size;

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['Name', 'Phone', 'Email', 'Years of experience', 'Works at', 'Status', 'Registered'],
      ...shown.map(r => [r.full_name, r.phone, r.email, r.years_experience, r.workplace, r.status, r.created_at.slice(0, 16).replace('T', ' ')])];
    const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nurse-training-registrations.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-bold text-[#0f172a]" style={font}>Home &amp; Hospital Newborn Care Training</p>
          <p className="text-[11px] text-[#64748B]" style={font}>Sunday 8 November 2026 · 3:30 PM – 6:00 PM · Solace Ministries Conference Centre</p>
        </div>
        <a href="/nurse-training" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}>Registration page <ExternalLink className="w-3 h-3" /></a>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {([['Registered', String(active.length)], ['Average experience', `${avgYears} yrs`], ['Workplaces', String(workplaces)]] as const).map(([k, v]) => (
          <div key={k} className="bg-white rounded-xl border border-slate-100 p-3">
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase" style={font}>{k}</p>
            <p className="text-xl font-bold text-[#1e293b]" style={serif}>{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, email, hospital…" />
        <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[12px]" style={font} aria-label="Filter by status">
          <option value="all">All statuses</option><option value="registered">Registered</option><option value="attended">Attended</option><option value="cancelled">Cancelled</option>
        </select>
        <button onClick={exportCsv} disabled={!shown.length} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-bold hover:bg-slate-200 disabled:opacity-50" style={font}><Download className="w-3.5 h-3.5" /> Download list</button>
      </div>

      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : shown.length === 0 ? (
        <EmptyState icon={GraduationCap} message={items.length ? 'No one matches.' : 'No nurses have registered yet.'} />
      ) : (
        <div className="space-y-2">
          {shown.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-100 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#1e293b]" style={serif}>{r.full_name}</p>
                <p className="text-[11px] text-[#64748B]" style={font}>{r.workplace} · {r.years_experience} year{r.years_experience === 1 ? '' : 's'} of experience</p>
                <p className="text-[10px] text-[#94A3B8]" style={font}>
                  <a href={`tel:${r.phone}`} className="hover:text-[#0A6070]">{r.phone}</a> · <a href={`mailto:${r.email}`} className="hover:text-[#0A6070]">{r.email}</a> · {fmtDateTime(r.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={r.status}
                  onChange={e => update(r.id, { status: e.target.value })}
                  className={`text-[11px] font-bold rounded-full px-2.5 py-1 border-0 ${STATUS_STYLE[r.status]}`}
                  style={font}
                  aria-label={`Status for ${r.full_name}`}
                >
                  <option value="registered">Registered</option><option value="attended">Attended</option><option value="cancelled">Cancelled</option>
                </select>
                <button onClick={() => setDeleting(r)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Delete the registration of ${deleting.full_name}? The nurse could then register again with the same email.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => { const r = deleting; setDeleting(null); await softDelete(r.id); }}
        />
      )}
    </div>
  );
}
