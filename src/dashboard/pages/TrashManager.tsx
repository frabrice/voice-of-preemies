import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import ConfirmDialog from '../components/ConfirmDialog';
import { Trash2, RotateCcw, Search, AlertTriangle } from 'lucide-react';

interface TrashedItem {
  id: string;
  label: string;
  sublabel: string;
  table: string;
  deleted_at: string;
}

const SOURCES: { table: string; label: string; labelKey: string; sublabelFn?: (r: Record<string, unknown>) => string }[] = [
  { table: 'news_articles', label: 'Article', labelKey: 'title', sublabelFn: r => String(r.tag ?? '') },
  { table: 'stories', label: 'Story', labelKey: 'name', sublabelFn: r => `${r.tag ?? ''} · ${r.year ?? ''}` },
  { table: 'programs', label: 'Program', labelKey: 'title', sublabelFn: r => String(r.tag ?? '') },
  { table: 'team_members', label: 'Team Member', labelKey: 'name', sublabelFn: r => String(r.role ?? '') },
  { table: 'partners', label: 'Partner', labelKey: 'name', sublabelFn: r => String(r.category ?? '') },
  { table: 'events', label: 'Event', labelKey: 'title', sublabelFn: r => String(r.type ?? '') },
  { table: 'resources', label: 'Resource', labelKey: 'title', sublabelFn: r => String(r.category ?? '') },
  { table: 'volunteers', label: 'Volunteer', labelKey: 'name', sublabelFn: r => String(r.email ?? '') },
  { table: 'contact_submissions', label: 'Message', labelKey: 'name', sublabelFn: r => String(r.subject ?? '') },
  { table: 'donation_records', label: 'Donation', labelKey: 'donor_name', sublabelFn: r => `${r.currency ?? ''} ${r.amount ?? ''}` },
  { table: 'site_stats', label: 'Stat', labelKey: 'label', sublabelFn: r => String(r.value ?? '') },
];

const TYPE_CLR: Record<string, string> = {
  Article: 'bg-blue-100 text-blue-700',
  Story: 'bg-amber-100 text-amber-700',
  Program: 'bg-rose-100 text-rose-700',
  'Team Member': 'bg-violet-100 text-violet-700',
  Partner: 'bg-orange-100 text-orange-700',
  Event: 'bg-cyan-100 text-cyan-700',
  Resource: 'bg-lime-100 text-lime-700',
  Volunteer: 'bg-emerald-100 text-emerald-700',
  Message: 'bg-sky-100 text-sky-700',
  Donation: 'bg-red-100 text-red-700',
  Stat: 'bg-fuchsia-100 text-fuchsia-700',
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function TrashManager() {
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [restoreId, setRestoreId] = useState<TrashedItem | null>(null);
  const [deleteId, setDeleteId] = useState<TrashedItem | null>(null);
  const [emptyConfirm, setEmptyConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    const results = await Promise.all(
      SOURCES.map(async src => {
        const { data } = await supabase
          .from(src.table)
          .select('*')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false });
        return (data ?? []).map((r: Record<string, unknown>) => ({
          id: String(r.id),
          label: String(r[src.labelKey] ?? '—'),
          sublabel: src.sublabelFn ? src.sublabelFn(r) : '',
          table: src.table,
          type: src.label,
          deleted_at: String(r.deleted_at),
        }));
      })
    );
    const flat = results.flat().sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
    setItems(flat as TrashedItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const doRestore = async () => {
    if (!restoreId) return;
    await supabase.from(restoreId.table).update({ deleted_at: null }).eq('id', restoreId.id);
    setRestoreId(null);
    load();
  };

  const doDelete = async () => {
    if (!deleteId) return;
    await supabase.from(deleteId.table).delete().eq('id', deleteId.id);
    setDeleteId(null);
    load();
  };

  const doEmptyTrash = async () => {
    await Promise.all(
      SOURCES.map(src =>
        supabase.from(src.table).delete().not('deleted_at', 'is', null)
      )
    );
    setEmptyConfirm(false);
    load();
  };

  const types = Array.from(new Set(items.map((i: TrashedItem & { type?: string }) => (i as { type: string }).type)));
  const filtered = items.filter((i: TrashedItem & { type?: string }) => {
    const matchSearch = i.label.toLowerCase().includes(search.toLowerCase()) || i.sublabel.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || (i as { type: string }).type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Trash</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {items.length} deleted item{items.length !== 1 ? 's' : ''} — restore or permanently delete
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => setEmptyConfirm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-[12px] font-bold hover:bg-red-50 transition-all"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Empty Trash
          </button>
        )}
      </div>

      {items.length === 0 && !loading ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-[#94A3B8]" />
          </div>
          <p className="text-[14px] font-semibold text-[#1e293b] mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Trash is empty</p>
          <p className="text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Deleted items will appear here. You can restore or permanently delete them.</p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search trash…"
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              />
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-[#0A6070] bg-white"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              <option value="all">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/60">
                  {['Item', 'Type', 'Details', 'Deleted On', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((item: TrashedItem & { type?: string }) => (
                  <tr key={`${item.table}-${item.id}`} className="hover:bg-red-50/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </div>
                        <span className="text-[12px] font-semibold text-[#475569] line-clamp-1 max-w-[180px]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TYPE_CLR[(item as { type: string }).type] ?? 'bg-slate-100 text-slate-600'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {(item as { type: string }).type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#94A3B8] max-w-[160px] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.sublabel || '—'}</td>
                    <td className="px-4 py-3 text-[11px] text-[#94A3B8] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(item.deleted_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setRestoreId(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                        >
                          <RotateCcw className="w-3 h-3" /> Restore
                        </button>
                        <button
                          onClick={() => setDeleteId(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100 text-[11px] font-bold text-red-600 hover:bg-red-100 transition-colors"
                          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      No items match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {items.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-50 flex items-center gap-2 bg-amber-50/40">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <p className="text-[11px] text-amber-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Permanently deleted items cannot be recovered. Restore items you still need before emptying the trash.
              </p>
            </div>
          )}
        </div>
      )}

      {restoreId && (
        <ConfirmDialog
          message={`Restore "${restoreId.label}"? It will return to its original section.`}
          onConfirm={doRestore}
          onCancel={() => setRestoreId(null)}
          confirmLabel="Restore"
          danger={false}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          message={`Permanently delete "${deleteId.label}"? This cannot be undone.`}
          onConfirm={doDelete}
          onCancel={() => setDeleteId(null)}
          confirmLabel="Delete Forever"
        />
      )}

      {emptyConfirm && (
        <ConfirmDialog
          message={`Permanently delete all ${items.length} items in trash? This cannot be undone.`}
          onConfirm={doEmptyTrash}
          onCancel={() => setEmptyConfirm(false)}
          confirmLabel="Empty Trash"
        />
      )}
    </div>
  );
}
