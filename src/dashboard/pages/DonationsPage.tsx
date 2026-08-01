import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Heart, Package, Users as UsersIcon, CalendarClock, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import TabBar from '../components/TabBar';
import DonationsManager from './DonationsManager';
import { useCrud, StatusBadge, EmptyState, SearchInput, fmtDate, fmtMoney, inp, ta, Lbl, AddButton, SummaryCard } from '../components/shared';

const tabs = [
  { id: 'cash', label: 'Cash Donations', icon: Heart },
  { id: 'inkind', label: 'In-Kind Donations', icon: Package },
  { id: 'donors', label: 'Donors', icon: UsersIcon },
  { id: 'commitments', label: 'Commitments', icon: CalendarClock },
];

function DonorsTab() {
  const { items, loading, create, update, softDelete } = useCrud<any>('donors');
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = items.filter(d => d.name?.toLowerCase().includes(search.toLowerCase()));
  const blank = { name: '', email: '', phone: '', type: 'individual', notes: '' };

  const save = async () => {
    if (editing.id) await update(editing.id, editing);
    else await create(editing);
    setEditing(null); setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search donors..." />
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Donor" />
      </div>
      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Lbl t="Name" /><input value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} className={inp} /></div>
            <div><Lbl t="Email" /><input value={editing.email ?? ''} onChange={e => setEditing({ ...editing, email: e.target.value })} className={inp} /></div>
            <div><Lbl t="Phone" /><input value={editing.phone ?? ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} className={inp} /></div>
            <div><Lbl t="Type" /><select value={editing.type ?? 'individual'} onChange={e => setEditing({ ...editing, type: e.target.value })} className={inp}><option value="individual">Individual</option><option value="organization">Organization</option></select></div>
          </div>
          <div><Lbl t="Notes" /><textarea value={editing.notes ?? ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} className={ta} /></div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={UsersIcon} message="No donors yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.name}</p>
                  <p className="text-[10px] text-[#94A3B8] capitalize">{d.type}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing({ ...d }); setShowForm(true); }} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => softDelete(d.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              {d.email && <p className="text-[10px] text-[#64748B] flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{d.email}</p>}
              {d.phone && <p className="text-[10px] text-[#64748B] flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{d.phone}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommitmentsTab() {
  const { items, loading, softDelete } = useCrud<any>('donation_commitments');
  const [search, setSearch] = useState('');
  const filtered = items.filter(c => c.event_label?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Search commitments..." />
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={CalendarClock} message="No commitments yet." /> : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.event_label ?? 'Commitment'}</p>
                <p className="text-[10px] text-[#94A3B8]">{c.email} · {fmtDate(c.commitment_date)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={c.status ?? 'pending'} />
                <button onClick={() => softDelete(c.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InKindTab() {
  const { items, loading, softDelete } = useCrud<any>('in_kind_donations');
  const [search, setSearch] = useState('');
  const filtered = items.filter(d => d.donor_name?.toLowerCase().includes(search.toLowerCase()) || d.items_description?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Search in-kind donations..." />
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={Package} message="No in-kind donations yet." /> : (
        <div className="space-y-2">
          {filtered.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.anonymous ? 'Anonymous' : d.donor_name}</p>
                <p className="text-[10px] text-[#94A3B8] truncate">{d.items_description} · {fmtDate(d.created_at)}</p>
                {d.items_value_estimate && <p className="text-[10px] text-[#0A6070] font-semibold mt-0.5">Est. value: {fmtMoney(d.items_value_estimate)}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={d.status ?? 'pending'} />
                <button onClick={() => softDelete(d.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DonationsPage() {
  const [active, setActive] = useState('cash');
  const [totalCash, setTotalCash] = useState(0);
  const [inkindCount, setInkindCount] = useState(0);
  const [donorCount, setDonorCount] = useState(0);
  const [commitmentCount, setCommitmentCount] = useState(0);

  useEffect(() => {
    Promise.all([
      supabase.from('donation_records').select('amount').is('deleted_at', null),
      supabase.from('in_kind_donations').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('donors').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('donation_commitments').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    ]).then(([cashRes, inkindRes, donorRes, commitRes]) => {
      setTotalCash((cashRes.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0));
      setInkindCount(inkindRes.count ?? 0);
      setDonorCount(donorRes.count ?? 0);
      setCommitmentCount(commitRes.count ?? 0);
    });
  }, []);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Donations</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Track monetary and material donations, donors, and commitments.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <SummaryCard icon={Heart} label="Total Cash Donations" value={fmtMoney(totalCash)} gradient="from-red-500 to-rose-400" />
        <SummaryCard icon={Package} label="In-Kind Donations" value={String(inkindCount)} gradient="from-orange-500 to-amber-400" />
        <SummaryCard icon={UsersIcon} label="Donors" value={String(donorCount)} gradient="from-blue-500 to-sky-400" />
        <SummaryCard icon={CalendarClock} label="Commitments" value={String(commitmentCount)} gradient="from-violet-500 to-purple-400" />
      </div>
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4">
        {active === 'cash' && <DonationsManager />}
        {active === 'inkind' && <InKindTab />}
        {active === 'donors' && <DonorsTab />}
        {active === 'commitments' && <CommitmentsTab />}
      </div>
    </div>
  );
}
