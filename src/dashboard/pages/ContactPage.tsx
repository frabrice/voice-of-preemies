import { useState } from 'react';
import { Mail, LifeBuoy, Users, UserPlus, Briefcase, Trash2, Eye, X } from 'lucide-react';
import TabBar from '../components/TabBar';
import { useCrud, StatusBadge, EmptyState, SearchInput, fmtDate, inp, Lbl } from '../components/shared';

const tabs = [
  { id: 'messages', label: 'Messages', icon: Mail },
  { id: 'support', label: 'Support Requests', icon: LifeBuoy },
  { id: 'peer', label: 'Peer Support', icon: Users },
  { id: 'join', label: 'Join Requests', icon: UserPlus },
  { id: 'team', label: 'Team Applications', icon: Briefcase },
];

function DetailDrawer({ row, onClose, onUpdate }: { row: any; onClose: () => void; onUpdate: (status: string) => void }) {
  if (!row) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Details</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-[#94A3B8]" /></button>
        </div>
        <div className="space-y-2">
          {Object.entries(row).filter(([k]) => !['id', 'deleted_at'].includes(k)).map(([k, v]) => (
            <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">{k.replace(/_/g, ' ')}</p>
              <p className="text-[12px] text-[#1e293b] mt-0.5">{v === null ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</p>
            </div>
          ))}
        </div>
        <div>
          <Lbl t="Status" />
          <select value={row.status ?? 'pending'} onChange={e => onUpdate(e.target.value)} className={inp}>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="replied">Replied</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function GenericTab({ table, searchField, icon: Icon, hasDeletedAt = true }: { table: string; searchField: string; icon: any; hasDeletedAt?: boolean }) {
  const { items, loading, update, softDelete } = useCrud<any>(table, hasDeletedAt);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  const filtered = items.filter(i => String(i[searchField] ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={Icon} message="No records found." /> : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md transition-shadow flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[12px] font-bold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r[searchField] ?? r.name ?? r.full_name ?? 'Unknown'}</p>
                  <StatusBadge status={r.status ?? 'pending'} />
                </div>
                <p className="text-[10px] text-[#94A3B8] truncate">{r.subject ?? r.support_type ?? r.role ?? r.expertise ?? ''} · {fmtDate(r.created_at)}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setSelected(r)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Eye className="w-3.5 h-3.5" /></button>
                <button onClick={() => softDelete(r.id)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {selected && <DetailDrawer row={selected} onClose={() => setSelected(null)} onUpdate={async (status) => { await update(selected.id, { status }); setSelected({ ...selected, status }); }} />}
    </div>
  );
}

export default function ContactPage() {
  const [active, setActive] = useState('messages');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Contact & Support</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>All incoming messages, support requests, and applications.</p>
      </div>
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4">
        {active === 'messages' && <GenericTab table="contact_submissions" searchField="name" icon={Mail} />}
        {active === 'support' && <GenericTab table="support_requests" searchField="name" icon={LifeBuoy} />}
        {active === 'peer' && <GenericTab table="peer_support_signups" searchField="full_name" icon={Users} hasDeletedAt={false} />}
        {active === 'join' && <GenericTab table="join_requests" searchField="full_name" icon={UserPlus} />}
        {active === 'team' && <GenericTab table="team_applications" searchField="full_name" icon={Briefcase} hasDeletedAt={false} />}
      </div>
    </div>
  );
}
