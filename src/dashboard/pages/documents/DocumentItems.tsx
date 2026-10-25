import { useState, type ComponentType, type ReactNode } from 'react';
import { ExternalLink, Download, Pencil, Trash2, Loader2, Search, X, LayoutGrid, List } from 'lucide-react';
import { fmtDate } from '../../components/shared';
import { Doc, DocCat, DocsApi, ACCESS_META, font, typeMeta } from './shared';

/* ───────────── small building blocks ───────────── */

export function FileBadge({ type, size = 40 }: { type?: string | null; size?: number }) {
  const m = typeMeta(type);
  return (
    <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, background: m.bg, color: m.fg }} title={m.label}>
      <m.icon className="w-[45%] h-[45%]" />
    </div>
  );
}

export function AccessPill({ level }: { level: Doc['access_level'] }) {
  const m = ACCESS_META[level] ?? ACCESS_META.internal;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${m.pill}`} style={font}>
      <m.icon className="w-2.5 h-2.5" /> {m.label}
    </span>
  );
}

export function CategoryPill({ cat }: { cat?: DocCat }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#64748B] max-w-full" style={font}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cat?.color ?? '#CBD5E1' }} />
      <span className="truncate">{cat?.name ?? 'Uncategorized'}</span>
    </span>
  );
}

const iconBtn = 'p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-100 transition-colors disabled:opacity-60';

function ActionBtn({ title, onClick, icon: Icon, danger }: { title: string; onClick: () => void | Promise<void>; icon: ComponentType<{ className?: string }>; danger?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      title={title}
      aria-label={title}
      disabled={busy}
      onClick={async e => { e.stopPropagation(); setBusy(true); try { await onClick(); } finally { setBusy(false); } }}
      className={danger ? 'p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-colors' : iconBtn}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
    </button>
  );
}

export function DocActions({ doc, api }: { doc: Doc; api: DocsApi }) {
  const hasFile = !!(doc.storage_path || doc.file_url);
  return (
    <div className="flex items-center">
      {hasFile && <ActionBtn title="Open" icon={ExternalLink} onClick={() => api.openFile(doc)} />}
      {doc.storage_path && <ActionBtn title="Download" icon={Download} onClick={() => api.openFile(doc, true)} />}
      <ActionBtn title="Edit" icon={Pencil} onClick={() => api.openForm({ ...doc })} />
      <ActionBtn title="Delete" icon={Trash2} danger onClick={() => api.askDelete(doc)} />
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  return (
    <div className="relative flex-1 min-w-[220px]">
      <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] text-[#1e293b] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0A6070]/20 focus:border-[#0A6070]/40 transition-all"
        style={font}
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#94A3B8] hover:text-[#1e293b] hover:bg-slate-100" aria-label="Clear search">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function ViewToggle({ view, onChange }: { view: 'grid' | 'list'; onChange: (v: 'grid' | 'list') => void }) {
  const btn = (v: 'grid' | 'list', Icon: ComponentType<{ className?: string }>, label: string) => (
    <button
      onClick={() => onChange(v)}
      title={label}
      aria-label={label}
      aria-pressed={view === v}
      className={`p-2 rounded-lg transition-colors ${view === v ? 'bg-white text-[#0A6070] shadow-sm' : 'text-[#94A3B8] hover:text-[#1e293b]'}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
  return <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100">{btn('grid', LayoutGrid, 'Grid view')}{btn('list', List, 'List view')}</div>;
}

export function EmptyBlock({ icon: Icon, title, hint, action }: { icon: ComponentType<{ className?: string }>; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 px-6 py-12">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><Icon className="w-5 h-5 text-slate-400" /></div>
      <p className="text-[14px] font-bold text-[#1e293b]" style={font}>{title}</p>
      {hint && <p className="text-[12px] text-[#64748B] mt-1 max-w-sm" style={font}>{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PrimaryButton({ onClick, children, icon: Icon }: { onClick: () => void; children: ReactNode; icon?: ComponentType<{ className?: string }> }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold shadow-sm hover:shadow-md transition-all whitespace-nowrap"
      style={font}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />} {children}
    </button>
  );
}

/* ───────────── document views ───────────── */

function DocCard({ doc, api }: { doc: Doc; api: DocsApi }) {
  const cat = api.cats.find(c => c.id === doc.category_id);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all flex flex-col">
      <div className="flex items-start gap-3">
        <FileBadge type={doc.file_type} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[#0f172a] leading-snug line-clamp-2" style={font} title={doc.title}>{doc.title}</p>
          <div className="mt-1"><CategoryPill cat={cat} /></div>
        </div>
      </div>
      {doc.description && <p className="text-[11px] text-[#64748B] leading-relaxed line-clamp-2 mt-3" style={font}>{doc.description}</p>}
      <div className="mt-auto pt-3">
        <p className="text-[10px] text-[#94A3B8] truncate" style={font}>{doc.file_name || (doc.file_url ? 'External link' : 'No file')}{doc.file_size ? ` · ${doc.file_size}` : ''}</p>
        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-slate-50">
          <div className="flex items-center gap-2 min-w-0">
            <AccessPill level={doc.access_level} />
            <span className="text-[10px] text-[#94A3B8] truncate" style={font}>{fmtDate(doc.created_at)}</span>
          </div>
          <DocActions doc={doc} api={api} />
        </div>
      </div>
    </div>
  );
}

const ROW_GRID = 'md:grid-cols-[minmax(0,2.6fr)_minmax(0,1.3fr)_84px_104px_112px_auto]';

function DocRow({ doc, api }: { doc: Doc; api: DocsApi }) {
  const cat = api.cats.find(c => c.id === doc.category_id);
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] ${ROW_GRID} items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50/70 transition-colors`}>
      <div className="flex items-center gap-3 min-w-0">
        <FileBadge type={doc.file_type} size={36} />
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#0f172a] truncate" style={font} title={doc.title}>{doc.title}</p>
          <p className="text-[10px] text-[#94A3B8] truncate" style={font}>{doc.file_name || (doc.file_url ? 'External link' : 'No file')}</p>
          <p className="md:hidden text-[10px] text-[#64748B] truncate mt-0.5" style={font}>{cat?.name ?? 'Uncategorized'} · {fmtDate(doc.created_at)}{doc.file_size ? ` · ${doc.file_size}` : ''}</p>
        </div>
      </div>
      <div className="hidden md:block min-w-0"><CategoryPill cat={cat} /></div>
      <p className="hidden md:block text-[11px] text-[#64748B]" style={font}>{doc.file_size || '-'}</p>
      <p className="hidden md:block text-[11px] text-[#64748B]" style={font}>{fmtDate(doc.created_at)}</p>
      <div className="hidden md:block"><AccessPill level={doc.access_level} /></div>
      <div className="justify-self-end"><DocActions doc={doc} api={api} /></div>
    </div>
  );
}

export function DocList({ docs, view, api, showHeader = true }: { docs: Doc[]; view: 'grid' | 'list'; api: DocsApi; showHeader?: boolean }) {
  if (view === 'grid') {
    return (
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {docs.map(d => <DocCard key={d.id} doc={d} api={api} />)}
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {showHeader && (
        <div className={`hidden md:grid ${ROW_GRID} gap-x-4 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider`} style={font}>
          <span>Document</span><span>Category</span><span>Size</span><span>Added</span><span>Access</span><span className="w-[116px]" />
        </div>
      )}
      <div className="divide-y divide-slate-50">
        {docs.map(d => <DocRow key={d.id} doc={d} api={api} />)}
      </div>
    </div>
  );
}
