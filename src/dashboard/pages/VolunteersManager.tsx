import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Search, Trash2, Mail, Phone, UserCheck } from 'lucide-react';

interface Volunteer { id: string; name: string; email: string; phone: string; skills: string; availability: string; motivation: string; status: string; created_at: string; }

const STATUSES = ['pending', 'contacted', 'active', 'inactive'];
const STATUS_CLR: Record<string, string> = { pending: 'bg-amber-100 text-amber-700', contacted: 'bg-blue-100 text-blue-700', active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-slate-100 text-slate-500' };

export default function VolunteersManager() {
  const [items, setItems] = useState<Volunteer[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Volunteer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const load = async () => { const { data } = await supabase.from('volunteers').select('*').is('deleted_at', null).order('created_at', { ascending: false }); setItems(data ?? []); };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('volunteers').update({ status }).eq('id', id);
    load();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const doDelete = async () => { if (!deleteId) return; await supabase.from('volunteers').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId); setDeleteId(null); setSelected(null); load(); };

  const filtered = items.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.email.toLowerCase().includes(search.toLowerCase()) || (v.skills ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const activeCount = items.filter(v => v.status === 'active').length;
  const pendingCount = items.filter(v => v.status === 'pending').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Volunteers</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {items.length} total
            {activeCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{activeCount} active</span>}
            {pendingCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{pendingCount} pending</span>}
            <span>— click a row to view</span>
          </p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search volunteers…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50 bg-slate-50/60">
              {['Name', 'Skills', 'Availability', 'Applied', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => setSelected(v)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{v.name.charAt(0)}</div>
                      <div>
                        <p className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{v.name}</p>
                        <p className="text-[10px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{v.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] max-w-[140px] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{v.skills || '—'}</td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{v.availability || '—'}</td>
                  <td className="px-4 py-3 text-[11px] text-[#64748B] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(v.created_at)}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_CLR[v.status] ?? 'bg-slate-100 text-slate-500'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{v.status.charAt(0).toUpperCase() + v.status.slice(1)}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setDeleteId(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No volunteers found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Drawer title={selected.name} subtitle={`Applied ${fmtDate(selected.created_at)}`} onClose={() => setSelected(null)} width="md"
          footer={<div className="flex items-center justify-between">
            <button onClick={() => setDeleteId(selected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${STATUS_CLR[selected.status] ?? 'bg-slate-100 text-slate-500'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}</span>
          </div>}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#0f172a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.name}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selected.email && <a href={`mailto:${selected.email}`} className="flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Mail className="w-3 h-3" />{selected.email}</a>}
                  {selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Phone className="w-3 h-3" />{selected.phone}</a>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Skills</p>
                <p className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.skills || '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Availability</p>
                <p className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.availability || '—'}</p>
              </div>
            </div>

            {selected.motivation && (
              <div>
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Motivation</p>
                <p className="text-[13px] text-[#334155] leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.motivation}</p>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Update Status</p>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${selected.status === s ? 'bg-[#0A6070] text-white' : 'border border-slate-200 text-[#64748B] hover:bg-slate-50'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {deleteId && <ConfirmDialog message="Move this volunteer to Trash? You can restore them later." onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </div>
  );
}
