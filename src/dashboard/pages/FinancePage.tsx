import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Wallet, TrendingUp, TrendingDown, Tags, FolderKanban, Pencil, Trash2, Download, BarChart3, DollarSign } from 'lucide-react';
import TabBar from '../components/TabBar';
import { useCrud, EmptyState, SearchInput, fmtDate, fmtMoney, inp, ta, Lbl, AddButton, SummaryCard, StatusBadge } from '../components/shared';

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'transactions', label: 'Transactions', icon: Wallet },
  { id: 'income', label: 'Income', icon: TrendingUp },
  { id: 'expenses', label: 'Expenses', icon: TrendingDown },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
];

interface Tx { id: string; type: string; amount: number; currency: string; category_id: string; category_name: string; date: string; description: string; project_id: string; donor_id: string; vendor: string; status: string; reference: string; }
interface Cat { id: string; name: string; type: string; color: string; sort_order: number; }
interface Project { id: string; name: string; description: string; budget: number; currency: string; start_date: string; end_date: string; status: string; }

function OverviewTab() {
  const [txns, setTxns] = useState<Tx[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('finance_transactions').select('*').is('deleted_at', null).order('date', { ascending: false }),
      supabase.from('projects').select('*').is('deleted_at', null),
    ]).then(([txRes, pjRes]) => {
      setTxns(txRes.data ?? []);
      setProjects(pjRes.data ?? []);
      setLoading(false);
    });
  }, []);

  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expenses;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={DollarSign} label="Total Income" value={fmtMoney(income)} gradient="from-emerald-500 to-green-400" />
        <SummaryCard icon={TrendingDown} label="Total Expenses" value={fmtMoney(expenses)} gradient="from-red-500 to-rose-400" />
        <SummaryCard icon={Wallet} label="Net Balance" value={fmtMoney(balance)} gradient="from-blue-500 to-sky-400" />
        <SummaryCard icon={FolderKanban} label="Active Projects" value={String(projects.filter(p => p.status === 'active').length)} gradient="from-violet-500 to-purple-400" />
      </div>

      <div>
        <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Recent Transactions</h3>
        {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-4">Loading...</p> : txns.length === 0 ? <EmptyState icon={Wallet} message="No transactions yet." /> : (
          <div className="space-y-2">
            {txns.slice(0, 8).map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {t.type === 'income' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-red-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t.description || t.category_name || 'Transaction'}</p>
                    <p className="text-[10px] text-[#94A3B8]">{fmtDate(t.date)} · {t.category_name ?? 'Uncategorized'}</p>
                  </div>
                </div>
                <p className={`text-[13px] font-bold flex-shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`} style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {t.type === 'income' ? '+' : '-'}{fmtMoney(t.amount, t.currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Project Budgets</h3>
        {projects.length === 0 ? <p className="text-[12px] text-[#94A3B8] text-center py-4">No projects yet.</p> : (
          <div className="space-y-2">
            {projects.map(p => {
              const spent = txns.filter(t => t.project_id === p.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
              const pct = p.budget > 0 ? Math.min(100, (spent / Number(p.budget)) * 100) : 0;
              return (
                <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-[12px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.name}</p>
                      <p className="text-[10px] text-[#94A3B8]">{fmtMoney(spent, p.currency)} / {fmtMoney(p.budget, p.currency)}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionTab({ type }: { type: 'income' | 'expense' }) {
  const { items, loading, create, update, softDelete } = useCrud<any>('finance_transactions');
  const [categories, setCategories] = useState<Cat[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [donors, setDonors] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    supabase.from('finance_categories').select('*').is('deleted_at', null).eq('type', type).order('sort_order').then(({ data }) => setCategories(data ?? []));
    supabase.from('projects').select('*').is('deleted_at', null).then(({ data }) => setProjects(data ?? []));
    supabase.from('donors').select('id, name').is('deleted_at', null).then(({ data }) => setDonors(data ?? []));
  }, [type]);

  const filtered = items.filter((t: Tx) => t.type === type && (t.description?.toLowerCase().includes(search.toLowerCase()) || t.category_name?.toLowerCase().includes(search.toLowerCase())));
  const total = filtered.reduce((s: number, t: Tx) => s + Number(t.amount), 0);

  const blank = { type, amount: 0, currency: 'USD', category_id: '', category_name: '', date: new Date().toISOString().split('T')[0], description: '', project_id: '', donor_id: '', vendor: '', status: 'completed', reference: '' };

  const save = async () => {
    const cat = categories.find(c => c.id === editing.category_id);
    const row = { ...editing, category_name: cat?.name ?? '' };
    if (editing.id) await update(editing.id, row);
    else await create(row);
    setEditing(null); setShowForm(false);
  };

  const exportCsv = () => {
    const rows = [['Date', 'Description', 'Category', 'Amount', 'Currency', 'Project', 'Status']];
    filtered.forEach((t: Tx) => rows.push([t.date, t.description, t.category_name, String(t.amount), t.currency, '', t.status]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${type}-transactions.csv`; a.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
          <span className="text-[12px] font-bold text-[#1e293b]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Total: {fmtMoney(total)}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold hover:bg-slate-200"><Download className="w-3 h-3" /> Export CSV</button>
          <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label={`Add ${type === 'income' ? 'Income' : 'Expense'}`} />
        </div>
      </div>
      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Lbl t="Amount" /><input type="number" value={editing.amount ?? 0} onChange={e => setEditing({ ...editing, amount: +e.target.value })} className={inp} /></div>
            <div><Lbl t="Currency" /><select value={editing.currency ?? 'USD'} onChange={e => setEditing({ ...editing, currency: e.target.value })} className={inp}><option>USD</option><option>RWF</option><option>EUR</option><option>GBP</option></select></div>
            <div><Lbl t="Date" /><input type="date" value={editing.date ?? ''} onChange={e => setEditing({ ...editing, date: e.target.value })} className={inp} /></div>
            <div><Lbl t="Category" /><select value={editing.category_id ?? ''} onChange={e => setEditing({ ...editing, category_id: e.target.value })} className={inp}><option value="">Uncategorized</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><Lbl t="Project" /><select value={editing.project_id ?? ''} onChange={e => setEditing({ ...editing, project_id: e.target.value || null })} className={inp}><option value="">None</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            {type === 'income' && <div><Lbl t="Donor" /><select value={editing.donor_id ?? ''} onChange={e => setEditing({ ...editing, donor_id: e.target.value || null })} className={inp}><option value="">None</option>{donors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>}
            {type === 'expense' && <div><Lbl t="Vendor" /><input value={editing.vendor ?? ''} onChange={e => setEditing({ ...editing, vendor: e.target.value })} className={inp} /></div>}
            <div><Lbl t="Status" /><select value={editing.status ?? 'completed'} onChange={e => setEditing({ ...editing, status: e.target.value })} className={inp}><option value="completed">Completed</option><option value="pending">Pending</option><option value="reconciled">Reconciled</option></select></div>
            <div><Lbl t="Reference" /><input value={editing.reference ?? ''} onChange={e => setEditing({ ...editing, reference: e.target.value })} className={inp} /></div>
          </div>
          <div><Lbl t="Description" /><textarea value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className={ta} /></div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={type === 'income' ? TrendingUp : TrendingDown} message={`No ${type} records yet.`} /> : (
        <div className="space-y-2">
          {filtered.map((t: Tx) => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t.description || t.category_name || 'Transaction'}</p>
                <p className="text-[10px] text-[#94A3B8]">{fmtDate(t.date)} · {t.category_name} {t.reference ? `· Ref: ${t.reference}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="text-[13px] font-bold text-[#1e293b]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{fmtMoney(t.amount, t.currency)}</p>
                <StatusBadge status={t.status} />
                <button onClick={() => { setEditing({ ...t }); setShowForm(true); }} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => softDelete(t.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoriesTab() {
  const { items, loading, create, softDelete } = useCrud<any>('finance_categories');
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const blank = { name: '', type: 'expense', color: '#0A6070', sort_order: 0 };
  const save = async () => {
    if (editing.id) await supabase.from('finance_categories').update(editing).eq('id', editing.id);
    else await create(editing);
    setEditing(null); setShowForm(false);
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Category" />
      </div>
      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div><Lbl t="Name" /><input value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} className={inp} /></div>
            <div><Lbl t="Type" /><select value={editing.type ?? 'expense'} onChange={e => setEditing({ ...editing, type: e.target.value })} className={inp}><option value="income">Income</option><option value="expense">Expense</option></select></div>
            <div><Lbl t="Color" /><input type="color" value={editing.color ?? '#0A6070'} onChange={e => setEditing({ ...editing, color: e.target.value })} className={inp} /></div>
            <div><Lbl t="Sort Order" /><input type="number" value={editing.sort_order ?? 0} onChange={e => setEditing({ ...editing, sort_order: +e.target.value })} className={inp} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : items.length === 0 ? <EmptyState icon={Tags} message="No categories yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                <div>
                  <p className="text-[12px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.name}</p>
                  <p className="text-[10px] text-[#94A3B8] capitalize">{c.type}</p>
                </div>
              </div>
              <button onClick={() => softDelete(c.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectsTab() {
  const { items, loading, create, softDelete } = useCrud<any>('projects');
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const blank = { name: '', description: '', budget: 0, currency: 'USD', start_date: '', end_date: '', status: 'active' };
  const save = async () => {
    if (editing.id) await supabase.from('projects').update(editing).eq('id', editing.id);
    else await create(editing);
    setEditing(null); setShowForm(false);
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Project" />
      </div>
      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Lbl t="Name" /><input value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} className={inp} /></div>
            <div><Lbl t="Budget" /><input type="number" value={editing.budget ?? 0} onChange={e => setEditing({ ...editing, budget: +e.target.value })} className={inp} /></div>
            <div><Lbl t="Currency" /><select value={editing.currency ?? 'USD'} onChange={e => setEditing({ ...editing, currency: e.target.value })} className={inp}><option>USD</option><option>RWF</option><option>EUR</option><option>GBP</option></select></div>
            <div><Lbl t="Start Date" /><input type="date" value={editing.start_date ?? ''} onChange={e => setEditing({ ...editing, start_date: e.target.value })} className={inp} /></div>
            <div><Lbl t="End Date" /><input type="date" value={editing.end_date ?? ''} onChange={e => setEditing({ ...editing, end_date: e.target.value })} className={inp} /></div>
            <div><Lbl t="Status" /><select value={editing.status ?? 'active'} onChange={e => setEditing({ ...editing, status: e.target.value })} className={inp}><option value="active">Active</option><option value="completed">Completed</option><option value="on_hold">On Hold</option></select></div>
          </div>
          <div><Lbl t="Description" /><textarea value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className={ta} /></div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : items.length === 0 ? <EmptyState icon={FolderKanban} message="No projects yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-1.5">
                <p className="text-[13px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.name}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-[10px] text-[#64748B] line-clamp-2 mb-1.5">{p.description}</p>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-[#0A6070]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{fmtMoney(p.budget, p.currency)}</p>
                <button onClick={() => softDelete(p.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FinancePage() {
  const [active, setActive] = useState('overview');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Finance</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Track income, expenses, categories, and project-based budgets.</p>
      </div>
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4">
        {active === 'overview' && <OverviewTab />}
        {active === 'transactions' && <TransactionTab type="income" />}
        {active === 'income' && <TransactionTab type="income" />}
        {active === 'expenses' && <TransactionTab type="expense" />}
        {active === 'categories' && <CategoriesTab />}
        {active === 'projects' && <ProjectsTab />}
      </div>
    </div>
  );
}
