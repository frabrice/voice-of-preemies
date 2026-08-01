import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, Search, TrendingUp, Mail, Package, MapPin, Phone, Truck, Building2, CheckCircle2, Clock, ChevronDown } from 'lucide-react';

// ─── Cash Donations ────────────────────────────────────────────────────────────
interface Donation { id: string; donor_name: string; email: string; amount: number; currency: string; method: string; reference: string; message: string; anonymous: boolean; date: string; }
type CashForm = Omit<Donation, 'id'>;
type CashMode = 'view' | 'add' | 'edit';

const METHODS = ['Bank Transfer', 'Mobile Money', 'Cash', 'Online', 'Check', 'Other'];
const CURRENCIES = ['USD', 'RWF', 'EUR', 'GBP'];
const EMPTY_CASH: CashForm = { donor_name: '', email: '', amount: 0, currency: 'USD', method: 'Bank Transfer', reference: '', message: '', anonymous: false, date: new Date().toISOString().split('T')[0] };

// ─── In-Kind Donations ─────────────────────────────────────────────────────────
interface InKind {
  id: string;
  donor_name: string;
  donor_email: string;
  donor_phone: string;
  items_description: string;
  items_value_estimate: number | null;
  logistics_mode: 'dropoff' | 'pickup';
  dropoff_location: string;
  pickup_address: string;
  pickup_availability: string;
  notes: string;
  anonymous: boolean;
  status: 'pending' | 'confirmed' | 'received' | 'fulfilled';
  created_at: string;
}
type InKindMode = 'view' | 'edit';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  received: 'bg-teal-100 text-teal-700',
  fulfilled: 'bg-emerald-100 text-emerald-700',
};
const STATUS_ORDER = ['pending', 'confirmed', 'received', 'fulfilled'];

// ─── Shared helpers ────────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-[#0f172a] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white';
const Lbl = ({ t }: { t: string }) => <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t}</label>;

export default function DonationsManager() {
  const [tab, setTab] = useState<'cash' | 'inkind'>('cash');

  // ── Cash state ──
  const [cashItems, setCashItems] = useState<Donation[]>([]);
  const [cashSearch, setCashSearch] = useState('');
  const [cashMode, setCashMode] = useState<CashMode | null>(null);
  const [cashSelected, setCashSelected] = useState<Donation | null>(null);
  const [cashForm, setCashForm] = useState<CashForm>(EMPTY_CASH);
  const [cashDeleteId, setCashDeleteId] = useState<string | null>(null);
  const [cashSaving, setCashSaving] = useState(false);

  // ── In-Kind state ──
  const [inkindItems, setInkindItems] = useState<InKind[]>([]);
  const [inkindSearch, setInkindSearch] = useState('');
  const [inkindMode, setInkindMode] = useState<InKindMode | null>(null);
  const [inkindSelected, setInkindSelected] = useState<InKind | null>(null);
  const [inkindDeleteId, setInkindDeleteId] = useState<string | null>(null);
  const [inkindStatusUpdating, setInkindStatusUpdating] = useState(false);

  const loadCash = async () => {
    const { data } = await supabase.from('donation_records').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    setCashItems(data ?? []);
  };
  const loadInkind = async () => {
    const { data } = await supabase.from('in_kind_donations').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    setInkindItems(data ?? []);
  };

  useEffect(() => { loadCash(); loadInkind(); }, []);

  // ── Cash ops ──
  const openCashView = (d: Donation) => { setCashSelected(d); setCashMode('view'); };
  const openCashAdd = () => { setCashForm(EMPTY_CASH); setCashSelected(null); setCashMode('add'); };
  const openCashEdit = (d: Donation) => { setCashForm({ donor_name: d.donor_name, email: d.email ?? '', amount: d.amount, currency: d.currency, method: d.method, reference: d.reference ?? '', message: d.message ?? '', anonymous: d.anonymous, date: d.date }); setCashSelected(d); setCashMode('edit'); };
  const closeCash = () => { setCashMode(null); setCashSelected(null); };

  const saveCash = async () => {
    if (!cashForm.donor_name.trim() || cashForm.amount <= 0) return;
    setCashSaving(true);
    const payload = { ...cashForm, email: cashForm.email || null, reference: cashForm.reference || null, message: cashForm.message || null };
    if (cashMode === 'edit' && cashSelected) await supabase.from('donation_records').update(payload).eq('id', cashSelected.id);
    else await supabase.from('donation_records').insert(payload);
    setCashSaving(false); closeCash(); loadCash();
  };

  const doDeleteCash = async () => {
    if (!cashDeleteId) return;
    await supabase.from('donation_records').update({ deleted_at: new Date().toISOString() }).eq('id', cashDeleteId);
    setCashDeleteId(null); closeCash(); loadCash();
  };

  // ── In-Kind ops ──
  const openInkindView = (d: InKind) => { setInkindSelected(d); setInkindMode('view'); };
  const closeInkind = () => { setInkindMode(null); setInkindSelected(null); };

  const updateInkindStatus = async (id: string, status: string) => {
    setInkindStatusUpdating(true);
    await supabase.from('in_kind_donations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setInkindStatusUpdating(false);
    setInkindSelected(prev => prev ? { ...prev, status: status as InKind['status'] } : null);
    loadInkind();
  };

  const doDeleteInkind = async () => {
    if (!inkindDeleteId) return;
    await supabase.from('in_kind_donations').update({ deleted_at: new Date().toISOString() }).eq('id', inkindDeleteId);
    setInkindDeleteId(null); closeInkind(); loadInkind();
  };

  // ── Derived ──
  const cashFiltered = cashItems.filter(d => d.donor_name.toLowerCase().includes(cashSearch.toLowerCase()) || (d.reference ?? '').toLowerCase().includes(cashSearch.toLowerCase()) || d.method.toLowerCase().includes(cashSearch.toLowerCase()));
  const cashTotal = cashItems.reduce((s, d) => s + Number(d.amount), 0);

  const inkindFiltered = inkindItems.filter(d => d.donor_name.toLowerCase().includes(inkindSearch.toLowerCase()) || d.items_description.toLowerCase().includes(inkindSearch.toLowerCase()) || d.logistics_mode.toLowerCase().includes(inkindSearch.toLowerCase()) || d.status.toLowerCase().includes(inkindSearch.toLowerCase()));
  const inkindPending = inkindItems.filter(d => d.status === 'pending').length;
  const inkindPickup = inkindItems.filter(d => d.logistics_mode === 'pickup').length;
  const inkindFulfilled = inkindItems.filter(d => d.status === 'fulfilled').length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Donations</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{cashItems.length} cash · {inkindItems.length} in-kind</p>
        </div>
        {tab === 'cash' && (
          <button onClick={openCashAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-400 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <Plus className="w-3.5 h-3.5" /> Record Donation
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5 w-fit">
        <button onClick={() => setTab('cash')} className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${tab === 'cash' ? 'bg-white text-[#0A6070] shadow-sm' : 'text-[#64748B] hover:text-[#0f172a]'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cash Donations</button>
        <button onClick={() => setTab('inkind')} className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 ${tab === 'inkind' ? 'bg-white text-[#0A6070] shadow-sm' : 'text-[#64748B] hover:text-[#0f172a]'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Package className="w-3.5 h-3.5" /> In-Kind Donations
          {inkindPending > 0 && <span className="w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-black flex items-center justify-center">{inkindPending}</span>}
        </button>
      </div>

      {/* ─── CASH TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'cash' && (
        <>
          <div className="relative rounded-2xl overflow-hidden shadow-sm mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A6070] to-[#1AADA0]" />
            <div className="relative px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><TrendingUp className="w-4 h-4 text-white" /></div>
              <div>
                <p className="text-white/70 text-[9px] uppercase tracking-widest font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Total Recorded</p>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>${cashTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                <input value={cashSearch} onChange={e => setCashSearch(e.target.value)} placeholder="Search donations…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-slate-50 bg-slate-50/60">
                  {['Donor', 'Amount', 'Method', 'Reference', 'Date', 'Actions'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {cashFiltered.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => openCashView(d)}>
                      <td className="px-4 py-3">
                        <p className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.anonymous ? 'Anonymous' : d.donor_name}</p>
                        {d.email && !d.anonymous && <p className="text-[10px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.email}</p>}
                      </td>
                      <td className="px-4 py-3"><span className="text-[12px] font-bold text-[#0A6070]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.currency} {Number(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></td>
                      <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.method}</span></td>
                      <td className="px-4 py-3 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.reference || '—'}</td>
                      <td className="px-4 py-3 text-[11px] text-[#64748B] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.date}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openCashEdit(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#0A6070]"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setCashDeleteId(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div></td>
                    </tr>
                  ))}
                  {cashFiltered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No donations found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {cashMode === 'view' && cashSelected && (
            <Drawer title={cashSelected.anonymous ? 'Anonymous Donation' : cashSelected.donor_name} subtitle={`${cashSelected.currency} ${Number(cashSelected.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} · ${cashSelected.date}`} onClose={closeCash} width="md"
              footer={<div className="flex items-center justify-between">
                <button onClick={() => setCashDeleteId(cashSelected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                <button onClick={() => openCashEdit(cashSelected)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-400 text-white text-[12px] font-bold shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
              </div>}
            >
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#0A6070]/8 to-[#1AADA0]/8 border border-[#0A6070]/10 text-center">
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Donation Amount</p>
                  <p className="text-3xl font-bold text-[#0A6070]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{cashSelected.currency} {Number(cashSelected.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl"><p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Method</p><p className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{cashSelected.method}</p></div>
                  <div className="p-3 bg-slate-50 rounded-xl"><p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Date</p><p className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{cashSelected.date}</p></div>
                </div>
                {!cashSelected.anonymous && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Donor</p>
                    <p className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{cashSelected.donor_name}</p>
                    {cashSelected.email && <a href={`mailto:${cashSelected.email}`} className="flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Mail className="w-3 h-3" />{cashSelected.email}</a>}
                  </div>
                )}
                {cashSelected.reference && <div className="p-3 bg-slate-50 rounded-xl"><p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Reference</p><p className="text-[12px] font-mono text-[#1e293b]">{cashSelected.reference}</p></div>}
                {cashSelected.message && <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-[#0A6070]"><p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Message</p><p className="text-[12px] text-[#334155] italic" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{cashSelected.message}</p></div>}
              </div>
            </Drawer>
          )}

          {(cashMode === 'add' || cashMode === 'edit') && (
            <Drawer title={cashMode === 'add' ? 'Record Donation' : 'Edit Donation'} subtitle={cashMode === 'edit' ? cashSelected?.donor_name : 'Log a new donation record'} onClose={closeCash} width="md"
              footer={<div className="flex gap-2 justify-end">
                <button onClick={closeCash} className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-[#64748B] hover:bg-slate-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cancel</button>
                <button onClick={saveCash} disabled={cashSaving || !cashForm.donor_name.trim() || cashForm.amount <= 0} className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-400 text-white text-[12px] font-bold disabled:opacity-50 shadow-sm hover:shadow-md transition-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{cashSaving ? 'Saving…' : cashMode === 'add' ? 'Save Record' : 'Save Changes'}</button>
              </div>}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Lbl t="Donor Name *" /><input value={cashForm.donor_name} onChange={e => setCashForm({ ...cashForm, donor_name: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
                  <div><Lbl t="Email" /><input type="email" value={cashForm.email} onChange={e => setCashForm({ ...cashForm, email: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Lbl t="Amount *" /><input type="number" step="0.01" min="0" value={cashForm.amount || ''} onChange={e => setCashForm({ ...cashForm, amount: Number(e.target.value) })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
                  <div><Lbl t="Currency" /><select value={cashForm.currency} onChange={e => setCashForm({ ...cashForm, currency: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div><Lbl t="Method" /><select value={cashForm.method} onChange={e => setCashForm({ ...cashForm, method: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{METHODS.map(m => <option key={m}>{m}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Lbl t="Reference" /><input value={cashForm.reference} onChange={e => setCashForm({ ...cashForm, reference: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
                  <div><Lbl t="Date" /><input type="date" value={cashForm.date} onChange={e => setCashForm({ ...cashForm, date: e.target.value })} className={inp} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
                </div>
                <div><Lbl t="Message" /><textarea rows={2} value={cashForm.message} onChange={e => setCashForm({ ...cashForm, message: e.target.value })} className={inp + ' resize-none'} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} /></div>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cashForm.anonymous} onChange={e => setCashForm({ ...cashForm, anonymous: e.target.checked })} className="w-4 h-4 rounded accent-[#0A6070]" /><span className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Anonymous donation</span></label>
              </div>
            </Drawer>
          )}

          {cashDeleteId && <ConfirmDialog message="Move this donation record to Trash? You can restore it later." onConfirm={doDeleteCash} onCancel={() => setCashDeleteId(null)} confirmLabel="Move to Trash" />}
        </>
      )}

      {/* ─── IN-KIND TAB ──────────────────────────────────────────────────────── */}
      {tab === 'inkind' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="relative rounded-2xl overflow-hidden shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-400" />
              <div className="relative px-4 py-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-white/70 text-[9px] uppercase tracking-widest font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Pending</p>
                  <p className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{inkindPending}</p>
                </div>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500" />
              <div className="relative px-4 py-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Truck className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-white/70 text-[9px] uppercase tracking-widest font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Pickup Requests</p>
                  <p className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{inkindPickup}</p>
                </div>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="relative px-4 py-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-white/70 text-[9px] uppercase tracking-widest font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Fulfilled</p>
                  <p className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{inkindFulfilled}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                <input value={inkindSearch} onChange={e => setInkindSearch(e.target.value)} placeholder="Search in-kind donations…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-slate-50 bg-slate-50/60">
                  {['Donor', 'Items', 'Logistics', 'Status', 'Date', 'Actions'].map(h => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {inkindFiltered.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer group" onClick={() => openInkindView(d)}>
                      <td className="px-4 py-3">
                        <p className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.anonymous ? 'Anonymous' : d.donor_name}</p>
                        {d.donor_email && !d.anonymous && <p className="text-[10px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.donor_email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-[#334155] line-clamp-2 max-w-[180px]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.items_description}</p>
                        {d.items_value_estimate && <p className="text-[10px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Est. ${Number(d.items_value_estimate).toLocaleString()}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${d.logistics_mode === 'pickup' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {d.logistics_mode === 'pickup' ? <Truck className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                          {d.logistics_mode === 'pickup' ? 'Pickup' : 'Drop-off'}
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${STATUS_COLORS[d.status]}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.status}</span></td>
                      <td className="px-4 py-3 text-[11px] text-[#64748B] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setInkindDeleteId(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div></td>
                    </tr>
                  ))}
                  {inkindFiltered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No in-kind donations found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* In-Kind View Drawer */}
          {inkindMode === 'view' && inkindSelected && (
            <Drawer
              title={inkindSelected.anonymous ? 'Anonymous Donor' : inkindSelected.donor_name}
              subtitle={`In-Kind Donation · ${inkindSelected.logistics_mode === 'pickup' ? 'Pickup Requested' : 'Drop-off'}`}
              onClose={closeInkind}
              width="md"
              footer={<div className="flex items-center justify-between">
                <button onClick={() => setInkindDeleteId(inkindSelected.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Update status:</span>
                  <div className="relative">
                    <select
                      value={inkindSelected.status}
                      onChange={e => updateInkindStatus(inkindSelected.id, e.target.value)}
                      disabled={inkindStatusUpdating}
                      className={`appearance-none pl-3 pr-7 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer focus:outline-none transition-all disabled:opacity-50 ${STATUS_COLORS[inkindSelected.status]} border-current/20`}
                      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                      {STATUS_ORDER.map(s => <option key={s} value={s} className="bg-white text-[#0f172a] capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                  </div>
                </div>
              </div>}
            >
              <div className="space-y-4">
                {/* Items */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-[#0A6070]" />
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Items Description</p>
                  </div>
                  <p className="text-[12px] text-[#334155] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{inkindSelected.items_description}</p>
                  {inkindSelected.items_value_estimate && (
                    <p className="text-[11px] text-[#0A6070] font-semibold mt-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Estimated Value: ${Number(inkindSelected.items_value_estimate).toLocaleString()}</p>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-3 py-1 rounded-full font-bold capitalize ${STATUS_COLORS[inkindSelected.status]}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{inkindSelected.status}</span>
                  <span className="text-[10px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Use the dropdown below to update</span>
                </div>

                {/* Logistics */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2 mb-3">
                    {inkindSelected.logistics_mode === 'pickup' ? <Truck className="w-4 h-4 text-blue-500" /> : <Building2 className="w-4 h-4 text-slate-500" />}
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Logistics — {inkindSelected.logistics_mode === 'pickup' ? 'Pickup' : 'Drop-off'}</p>
                  </div>
                  {inkindSelected.logistics_mode === 'dropoff' ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#0A6070] mt-0.5 flex-shrink-0" />
                      <p className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{inkindSelected.dropoff_location}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Pickup Address</p>
                          <p className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{inkindSelected.pickup_address || '—'}</p>
                        </div>
                      </div>
                      {inkindSelected.pickup_availability && (
                        <div className="flex items-start gap-2">
                          <Clock className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Availability</p>
                            <p className="text-[12px] text-[#334155]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{inkindSelected.pickup_availability}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Donor info */}
                {!inkindSelected.anonymous && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                    <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Donor Contact</p>
                    <p className="text-[12px] font-semibold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{inkindSelected.donor_name}</p>
                    {inkindSelected.donor_email && (
                      <a href={`mailto:${inkindSelected.donor_email}`} className="flex items-center gap-1 text-[11px] text-[#0A6070] hover:underline" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        <Mail className="w-3 h-3" />{inkindSelected.donor_email}
                      </a>
                    )}
                    {inkindSelected.donor_phone && (
                      <div className="flex items-center gap-1 text-[11px] text-[#64748B]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        <Phone className="w-3 h-3" />{inkindSelected.donor_phone}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {inkindSelected.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-[#0A6070]">
                    <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Special Instructions</p>
                    <p className="text-[12px] text-[#334155] italic" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{inkindSelected.notes}</p>
                  </div>
                )}

                <p className="text-[10px] text-[#94A3B8] text-right" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Submitted {new Date(inkindSelected.created_at).toLocaleString()}</p>
              </div>
            </Drawer>
          )}

          {inkindDeleteId && <ConfirmDialog message="Move this in-kind donation to Trash? You can restore it later." onConfirm={doDeleteInkind} onCancel={() => setInkindDeleteId(null)} confirmLabel="Move to Trash" />}
        </>
      )}
    </div>
  );
}
