import { useEffect, useMemo, useState } from 'react';
import { Plus, X, FileText, FileSearch, FolderOpen, CalendarPlus, Lock } from 'lucide-react';
import {
  Filters, DEFAULT_FILTERS, DocsApi, SORT_LABELS, SortKey, TYPE_META, TYPE_ORDER, ACCESS_META, UNCATEGORIZED,
  applyFilters, sortDocs, font, serif, loadPref, savePref,
} from './shared';
import type { AccessLevel } from './shared';
import { DocList, EmptyBlock, PrimaryButton, SearchBox, ViewToggle } from './DocumentItems';

const VIEW_KEY = 'vop-docs-view';
const PAGE = 24;

const RANGE_LABELS: Record<string, string> = { any: 'Any time', '7': 'Last 7 days', '30': 'Last 30 days', '365': 'Last year' };

const selectCls = 'px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#0A6070]/20 focus:border-[#0A6070]/40';

function Stat({ icon: Icon, label, value, tint }: { icon: typeof FileText; label: string; value: number; tint: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tint + '1A', color: tint }}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-[22px] font-bold text-[#0f172a] leading-none" style={font}>{value}</p>
        <p className="text-[11px] text-[#64748B] mt-1" style={font}>{label}</p>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors whitespace-nowrap ${active ? 'bg-[#0A6070] border-[#0A6070] text-white' : 'bg-white border-slate-200 text-[#64748B] hover:border-slate-300 hover:text-[#1e293b]'}`}
      style={font}
    >
      {children}
    </button>
  );
}

export default function AllDocumentsTab({ api }: { api: DocsApi }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>('new');
  const [view, setView] = useState<'grid' | 'list'>(() => loadPref(VIEW_KEY, 'list', ['grid', 'list'] as const));
  const [limit, setLimit] = useState(PAGE);

  const set = (p: Partial<Filters>) => setFilters(f => ({ ...f, ...p }));
  const changeView = (v: 'grid' | 'list') => { setView(v); savePref(VIEW_KEY, v); };
  useEffect(() => { setLimit(PAGE); }, [filters, sort]);

  const results = useMemo(() => sortDocs(applyFilters(api.docs, filters, api.cats), sort), [api.docs, api.cats, filters, sort]);

  // Facet counts: each chip shows how many documents it would give with the OTHER filters applied.
  const typeCounts = useMemo(() => {
    const base = applyFilters(api.docs, filters, api.cats, 'type');
    const c: Record<string, number> = {};
    base.forEach(d => { const k = d.file_type ?? 'other'; c[k] = (c[k] ?? 0) + 1; });
    return { total: base.length, byType: c };
  }, [api.docs, api.cats, filters]);
  const accessCounts = useMemo(() => {
    const base = applyFilters(api.docs, filters, api.cats, 'access');
    const c: Record<string, number> = {};
    base.forEach(d => { c[d.access_level] = (c[d.access_level] ?? 0) + 1; });
    return { total: base.length, byAccess: c };
  }, [api.docs, api.cats, filters]);

  const last30 = api.docs.filter(d => Date.now() - Date.parse(d.created_at) < 30 * 86400000).length;
  const confidential = api.docs.filter(d => d.access_level === 'confidential').length;

  const activeChips: { key: keyof Filters; label: string }[] = [];
  if (filters.category !== 'all') activeChips.push({ key: 'category', label: filters.category === UNCATEGORIZED ? 'Uncategorized' : api.cats.find(c => c.id === filters.category)?.name ?? 'Category' });
  if (filters.type !== 'all') activeChips.push({ key: 'type', label: TYPE_META[filters.type]?.label ?? filters.type });
  if (filters.access !== 'all') activeChips.push({ key: 'access', label: ACCESS_META[filters.access as AccessLevel]?.label ?? filters.access });
  if (filters.range !== 'any') activeChips.push({ key: 'range', label: RANGE_LABELS[filters.range] });
  const anyFilter = activeChips.length > 0 || filters.q.trim() !== '';

  const visible = results.slice(0, limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a] leading-tight" style={serif}>All documents</h2>
          <p className="text-[12px] text-[#64748B]" style={font}>Search, filter and sort everything in one place.</p>
        </div>
        <PrimaryButton icon={Plus} onClick={() => api.openForm()}>Add document</PrimaryButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={FileText} label="Documents" value={api.docs.length} tint="#0A6070" />
        <Stat icon={FolderOpen} label="Categories" value={api.cats.length} tint="#7C3AED" />
        <Stat icon={CalendarPlus} label="Added in the last 30 days" value={last30} tint="#16A34A" />
        <Stat icon={Lock} label="Confidential" value={confidential} tint="#DC2626" />
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={filters.q} onChange={q => set({ q })} placeholder="Search by title, description, file name or category…" />
          <ViewToggle view={view} onChange={changeView} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={filters.category} onChange={e => set({ category: e.target.value })} className={selectCls} style={font} aria-label="Filter by category">
            <option value="all">All categories</option>
            <option value={UNCATEGORIZED}>Uncategorized</option>
            {api.cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.range} onChange={e => set({ range: e.target.value })} className={selectCls} style={font} aria-label="Filter by date added">
            {Object.entries(RANGE_LABELS).map(([k, v]) => <option key={k} value={k}>{k === 'any' ? 'Added: any time' : `Added: ${v.toLowerCase()}`}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className={selectCls} style={font} aria-label="Sort documents">
            {(Object.keys(SORT_LABELS) as SortKey[]).map(k => <option key={k} value={k}>{SORT_LABELS[k]}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider w-14 flex-shrink-0" style={font}>Type</span>
            <Chip active={filters.type === 'all'} onClick={() => set({ type: 'all' })}>All <span className="opacity-60">{typeCounts.total}</span></Chip>
            {TYPE_ORDER.filter(t => (typeCounts.byType[t] ?? 0) > 0 || filters.type === t).map(t => {
              const m = TYPE_META[t];
              return (
                <Chip key={t} active={filters.type === t} onClick={() => set({ type: filters.type === t ? 'all' : t })}>
                  <m.icon className="w-3 h-3" /> {m.label} <span className="opacity-60">{typeCounts.byType[t] ?? 0}</span>
                </Chip>
              );
            })}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider w-14 flex-shrink-0" style={font}>Access</span>
            <Chip active={filters.access === 'all'} onClick={() => set({ access: 'all' })}>All <span className="opacity-60">{accessCounts.total}</span></Chip>
            {(Object.keys(ACCESS_META) as AccessLevel[]).map(a => {
              const m = ACCESS_META[a];
              return (
                <Chip key={a} active={filters.access === a} onClick={() => set({ access: filters.access === a ? 'all' : a })}>
                  <m.icon className="w-3 h-3" /> {m.label} <span className="opacity-60">{accessCounts.byAccess[a] ?? 0}</span>
                </Chip>
              );
            })}
          </div>
        </div>
      </div>

      {/* Result summary */}
      {api.docs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
          <p className="text-[12px] text-[#64748B] mr-1" style={font}>
            Showing <span className="font-bold text-[#0f172a]">{Math.min(visible.length, results.length)}</span> of <span className="font-bold text-[#0f172a]">{results.length}</span>
            {anyFilter && results.length !== api.docs.length ? ` (${api.docs.length} in total)` : ''}
          </p>
          {activeChips.map(c => (
            <button key={c.key} onClick={() => set({ [c.key]: DEFAULT_FILTERS[c.key] } as Partial<Filters>)} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-[#0A6070]/10 text-[#0A6070] text-[11px] font-semibold hover:bg-[#0A6070]/20" style={font}>
              {c.label} <X className="w-3 h-3" />
            </button>
          ))}
          {anyFilter && <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-[11px] font-semibold text-[#64748B] hover:text-[#0A6070] underline underline-offset-2" style={font}>Clear all</button>}
        </div>
      )}

      {api.loading ? (
        <p className="text-[12px] text-[#94A3B8] text-center py-10">Loading…</p>
      ) : api.docs.length === 0 ? (
        <EmptyBlock icon={FileText} title="No documents yet" hint="Upload your first document. You can file it under a category as you add it." action={<PrimaryButton icon={Plus} onClick={() => api.openForm()}>Add document</PrimaryButton>} />
      ) : results.length === 0 ? (
        <EmptyBlock icon={FileSearch} title="No documents match" hint="Try a different search, or remove some filters." action={<button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-[12px] font-semibold text-[#0A6070] hover:underline" style={font}>Clear all filters</button>} />
      ) : (
        <>
          <DocList docs={visible} view={view} api={api} />
          {results.length > visible.length && (
            <div className="text-center pt-1">
              <button onClick={() => setLimit(l => l + PAGE)} className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-[12px] font-semibold text-[#0A6070] hover:bg-slate-50" style={font}>
                Show more ({results.length - visible.length} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
