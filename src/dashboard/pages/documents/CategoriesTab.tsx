import { useMemo, useState } from 'react';
import { FolderOpen, Folder, Plus, Pencil, Trash2, ChevronRight, ArrowLeft, Check, FilePlus2, FileSearch } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { inp, Lbl } from '../../components/shared';
import { DocCat, DocsApi, CATEGORY_COLORS, SORT_LABELS, SortKey, UNCATEGORIZED, applyFilters, sortDocs, font, serif, timeAgo, loadPref, savePref } from './shared';
import { DocList, EmptyBlock, PrimaryButton, SearchBox, ViewToggle } from './DocumentItems';

const VIEW_KEY = 'vop-docs-view';

/* ───────────── create / edit a category ───────────── */

function CategoryEditor({ initial, onSave, onCancel }: {
  initial: { id?: string; name: string; color: string };
  onSave: (name: string, color: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) { setError('Please enter a category name.'); return; }
    setSaving(true);
    const err = await onSave(name, color);
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '1A' }}>
          <FolderOpen className="w-5 h-5" style={{ color }} />
        </div>
        <p className="text-[14px] font-bold text-[#0f172a]" style={font}>{initial.id ? 'Edit category' : 'New category'}</p>
      </div>
      <div>
        <Lbl t="Name" />
        <input autoFocus value={name} onChange={e => { setName(e.target.value); setError(''); }} onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }} placeholder="e.g. Nurse Contracts" className={inp} />
      </div>
      <div>
        <Lbl t="Color" />
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORY_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: c }}>
              {color.toLowerCase() === c.toLowerCase() && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
          <label className="flex items-center gap-1.5 ml-1 text-[11px] font-semibold text-[#64748B] cursor-pointer" style={font}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-7 h-7 rounded-full border-0 p-0 bg-transparent cursor-pointer" /> Custom
          </label>
        </div>
      </div>
      {error && <p className="text-[12px] font-medium text-red-600" style={font}>{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold disabled:opacity-60" style={font}>{saving ? 'Saving…' : 'Save category'}</button>
        <button onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold hover:bg-slate-200" style={font}>Cancel</button>
      </div>
    </div>
  );
}

/* ───────────── one opened category ───────────── */

function CategoryView({ api, cat, onBack, onEdit, onDelete }: {
  api: DocsApi;
  cat: DocCat | null; // null = Uncategorized
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('new');
  const [view, setView] = useState<'grid' | 'list'>(() => loadPref(VIEW_KEY, 'list', ['grid', 'list'] as const));
  const catKey = cat ? cat.id : UNCATEGORIZED;
  const color = cat?.color ?? '#64748B';
  const name = cat?.name ?? 'Uncategorized';

  const inCategory = useMemo(() => api.docs.filter(d => (cat ? d.category_id === cat.id : !d.category_id)), [api.docs, cat]);
  const shown = useMemo(
    () => sortDocs(applyFilters(inCategory, { q, category: catKey, type: 'all', access: 'all', range: 'any' }, api.cats), sort),
    [inCategory, q, catKey, sort, api.cats],
  );

  const changeView = (v: 'grid' | 'list') => { setView(v); savePref(VIEW_KEY, v); };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0A6070] hover:gap-2 transition-all" style={font}>
        <ArrowLeft className="w-3.5 h-3.5" /> All categories
      </button>

      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-5">
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: color + '1A' }}>
              <FolderOpen className="w-7 h-7" style={{ color }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-[#0f172a] leading-tight truncate" style={serif}>{name}</h2>
              <p className="text-[12px] text-[#64748B]" style={font}>
                {inCategory.length} {inCategory.length === 1 ? 'document' : 'documents'}
                {inCategory.length > 0 && ` · latest added ${timeAgo(inCategory.reduce((a, d) => (d.created_at > a ? d.created_at : a), inCategory[0].created_at))}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {cat && (
              <>
                <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold hover:bg-slate-200" style={font}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <button onClick={onDelete} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold hover:bg-red-50 hover:text-red-600" style={font}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </>
            )}
            <PrimaryButton icon={Plus} onClick={() => api.openForm({ category_id: cat?.id ?? null })}>Add document</PrimaryButton>
          </div>
        </div>
      </div>

      {inCategory.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={q} onChange={setQ} placeholder={`Search in ${name}…`} />
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[12px] text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#0A6070]/20" style={font} aria-label="Sort documents">
            {(Object.keys(SORT_LABELS) as SortKey[]).map(k => <option key={k} value={k}>{SORT_LABELS[k]}</option>)}
          </select>
          <ViewToggle view={view} onChange={changeView} />
        </div>
      )}

      {inCategory.length === 0 ? (
        <EmptyBlock
          icon={FilePlus2}
          title={`No documents in ${name} yet`}
          hint="Add the first one and it will show up here."
          action={<PrimaryButton icon={Plus} onClick={() => api.openForm({ category_id: cat?.id ?? null })}>Add document</PrimaryButton>}
        />
      ) : shown.length === 0 ? (
        <EmptyBlock icon={FileSearch} title={`Nothing in ${name} matches "${q}"`} hint="Try a different word, or clear the search." action={<button onClick={() => setQ('')} className="text-[12px] font-semibold text-[#0A6070] hover:underline" style={font}>Clear search</button>} />
      ) : (
        <>
          {q && <p className="text-[11px] text-[#94A3B8]" style={font}>{shown.length} of {inCategory.length} documents match</p>}
          <DocList docs={shown} view={view} api={api} />
        </>
      )}
    </div>
  );
}

/* ───────────── the categories tab ───────────── */

export default function CategoriesTab({ api }: { api: DocsApi }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id?: string; name: string; color: string } | null>(null);
  const [deleting, setDeleting] = useState<DocCat | null>(null);
  const [q, setQ] = useState('');

  const stats = useMemo(() => {
    const m = new Map<string, { count: number; latest: string }>();
    api.docs.forEach(d => {
      const k = d.category_id ?? UNCATEGORIZED;
      const cur = m.get(k);
      m.set(k, { count: (cur?.count ?? 0) + 1, latest: cur && cur.latest > d.created_at ? cur.latest : d.created_at });
    });
    return m;
  }, [api.docs]);

  const uncategorized = stats.get(UNCATEGORIZED);
  const openCat = openKey && openKey !== UNCATEGORIZED ? api.cats.find(c => c.id === openKey) ?? null : null;
  const filtered = api.cats.filter(c => c.name.toLowerCase().includes(q.trim().toLowerCase()));

  const saveEditor = async (name: string, color: string): Promise<string | null> => {
    if (!editor) return null;
    if (editor.id) {
      const err = await api.updateCategory(editor.id, name, color);
      if (!err) { setEditor(null); api.flash('ok', 'Category updated.'); }
      return err;
    }
    const { error } = await api.addCategory(name, color);
    if (!error) { setEditor(null); api.flash('ok', 'Category created.'); }
    return error ?? null;
  };

  const confirmDelete = async (c: DocCat) => {
    setDeleting(null);
    await api.deleteCategory(c);
    setOpenKey(null);
  };

  const deleteDialog = deleting && (
    <ConfirmDialog
      message={`Delete the category "${deleting.name}"? Its documents are kept and become uncategorized.`}
      onConfirm={() => confirmDelete(deleting)}
      onCancel={() => setDeleting(null)}
    />
  );

  // A category was opened
  if (openKey && (openCat || openKey === UNCATEGORIZED)) {
    return (
      <div className="space-y-4">
        {editor && openCat && <CategoryEditor key={editor.id ?? 'new'} initial={editor} onSave={saveEditor} onCancel={() => setEditor(null)} />}
        <CategoryView
          key={openKey}
          api={api}
          cat={openCat}
          onBack={() => { setOpenKey(null); setEditor(null); }}
          onEdit={() => openCat && setEditor({ id: openCat.id, name: openCat.name, color: openCat.color ?? '#0A6070' })}
          onDelete={() => openCat && setDeleting(openCat)}
        />
        {deleteDialog}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-xl font-bold text-[#0f172a] leading-tight" style={serif}>Categories</h2>
          <p className="text-[12px] text-[#64748B]" style={font}>{api.cats.length} {api.cats.length === 1 ? 'category' : 'categories'} · {api.docs.length} {api.docs.length === 1 ? 'document' : 'documents'}. Open one to see everything inside it.</p>
        </div>
        {api.cats.length > 4 && <div className="w-full sm:w-64"><SearchBox value={q} onChange={setQ} placeholder="Find a category…" /></div>}
        <PrimaryButton icon={Plus} onClick={() => setEditor({ name: '', color: CATEGORY_COLORS[0] })}>New category</PrimaryButton>
      </div>

      {editor && !editor.id && <CategoryEditor key="new" initial={editor} onSave={saveEditor} onCancel={() => setEditor(null)} />}
      {editor?.id && <CategoryEditor key={editor.id} initial={editor} onSave={saveEditor} onCancel={() => setEditor(null)} />}

      {api.loading ? (
        <p className="text-[12px] text-[#94A3B8] text-center py-10">Loading…</p>
      ) : api.cats.length === 0 && !uncategorized ? (
        <EmptyBlock icon={Folder} title="No categories yet" hint="Create categories like Nurse Contracts or Board Minutes, then file documents under them." action={<PrimaryButton icon={Plus} onClick={() => setEditor({ name: '', color: CATEGORY_COLORS[0] })}>New category</PrimaryButton>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => {
            const s = stats.get(c.id);
            const color = c.color ?? '#0A6070';
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenKey(c.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenKey(c.id); } }}
                className="group relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-[#0A6070]/30"
              >
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: color + '1A' }}>
                    <FolderOpen className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button title="Edit category" aria-label={`Edit ${c.name}`} onClick={e => { e.stopPropagation(); setEditor({ id: c.id, name: c.name, color }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                    <button title="Delete category" aria-label={`Delete ${c.name}`} onClick={e => { e.stopPropagation(); setDeleting(c); }} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-[16px] font-bold text-[#0f172a] mt-4 truncate" style={serif} title={c.name}>{c.name}</p>
                <p className="text-[12px] text-[#64748B] mt-0.5" style={font}>{s?.count ?? 0} {(s?.count ?? 0) === 1 ? 'document' : 'documents'}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                  <span className="text-[10px] text-[#94A3B8]" style={font}>{s ? `Latest ${timeAgo(s.latest)}` : 'Empty'}</span>
                  <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#0A6070] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}

          {uncategorized && !q && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setOpenKey(UNCATEGORIZED)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenKey(UNCATEGORIZED); } }}
              className="group relative bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200 p-5 cursor-pointer hover:bg-white hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-[#0A6070]/30"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-200/70 flex items-center justify-center"><Folder className="w-6 h-6 text-slate-400" /></div>
              <p className="text-[16px] font-bold text-[#475569] mt-4" style={serif}>Uncategorized</p>
              <p className="text-[12px] text-[#64748B] mt-0.5" style={font}>{uncategorized.count} {uncategorized.count === 1 ? 'document' : 'documents'}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-[#94A3B8]" style={font}>Not filed in a category yet</span>
                <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#0A6070] transition-all" />
              </div>
            </div>
          )}
        </div>
      )}
      {deleteDialog}
    </div>
  );
}
