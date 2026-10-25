import { useRef, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { FileText, FolderOpen, Clock, Pencil, Trash2, ExternalLink, Lock, Upload, Loader2, X, Plus, Check } from 'lucide-react';
import TabBar from '../components/TabBar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useCrud, EmptyState, SearchInput, fmtDate, fmtDateTime, inp, ta, Lbl, AddButton } from '../components/shared';

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const BUCKET = 'documents';
const MAX_BYTES = 50 * 1024 * 1024;

const tabs = [
  { id: 'all', label: 'All Documents', icon: FileText },
  { id: 'categories', label: 'Categories', icon: FolderOpen },
  { id: 'recent', label: 'Recent', icon: Clock },
];

interface Doc {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  file_url: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: string | null;
  tags: string[];
  access_level: 'public' | 'internal' | 'confidential';
  created_at: string;
}
interface DocCat { id: string; name: string; color: string | null; icon: string | null; sort_order: number }

type CategoryApi = {
  items: DocCat[];
  loading: boolean;
  reload: () => Promise<void> | void;
  add: (name: string, color?: string) => Promise<{ row?: DocCat; error?: string }>;
  softDelete: (id: string) => Promise<boolean>;
};

/* ───────────── helpers ───────────── */

function detectType(name: string): string {
  const ext = name.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  return 'other';
}

function humanSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Opens a document. Stored files are private, so a short-lived signed link is created for the click. */
async function openDocument(doc: Pick<Doc, 'storage_path' | 'file_url'>): Promise<string | null> {
  if (doc.storage_path) {
    const popup = window.open('', '_blank');
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 300);
    if (error || !data) {
      popup?.close();
      return 'Could not open this file. It may have been removed from storage.';
    }
    if (popup) popup.location.href = data.signedUrl;
    else window.open(data.signedUrl, '_blank');
    return null;
  }
  if (doc.file_url) {
    window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    return null;
  }
  return 'This document has no file attached.';
}

function OpenButton({ doc, onError, size = 'sm' }: { doc: Pick<Doc, 'storage_path' | 'file_url'>; onError: (msg: string) => void; size?: 'sm' | 'md' }) {
  const [busy, setBusy] = useState(false);
  if (!doc.storage_path && !doc.file_url) return null;
  const cls = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';
  return (
    <button
      onClick={async () => { setBusy(true); const err = await openDocument(doc); setBusy(false); if (err) onError(err); }}
      title="Open file"
      className={`${size === 'md' ? 'p-1.5' : 'p-1'} rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50`}
    >
      {busy ? <Loader2 className={`${cls} animate-spin`} /> : <ExternalLink className={cls} />}
    </button>
  );
}

function Notice({ notice }: { notice: { kind: 'ok' | 'error'; text: string } | null }) {
  if (!notice) return null;
  return (
    <div className={`text-[12px] font-medium rounded-xl border px-3 py-2 ${notice.kind === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`} style={font}>
      {notice.text}
    </div>
  );
}

function useNotice() {
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const flash = (kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(n => (n?.text === text ? null : n)), 6000);
  };
  return { notice, flash };
}

/* ───────────── file picker (from the computer) ───────────── */

interface FileValue { storage_path: string | null; file_name: string | null; file_url: string | null; file_type: string | null; file_size: string | null }

function DocumentFileField({ value, onChange }: { value: FileValue; onChange: (v: Partial<FileValue>) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showLink, setShowLink] = useState(!!value.file_url);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError('');
    if (file.size === 0) { setError('That file is empty.'); return; }
    if (file.size > MAX_BYTES) { setError(`That file is ${humanSize(file.size)}. The limit is 50 MB.`); return; }
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
    setUploading(false);
    if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }
    onChange({ storage_path: path, file_name: file.name, file_url: '', file_type: detectType(file.name), file_size: humanSize(file.size) });
    setShowLink(false);
  };

  const hasFile = !!value.storage_path;

  return (
    <div className="space-y-2">
      <Lbl t="File" />
      {hasFile ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 text-emerald-600" /></div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-[#1e293b] truncate" style={font}>{value.file_name}</p>
              <p className="text-[10px] text-[#64748B]" style={font}>{value.file_size} · {(value.file_type ?? 'other').toUpperCase()} · uploaded</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-2.5 py-1.5 rounded-lg bg-white text-slate-600 text-[11px] font-semibold hover:bg-slate-50 disabled:opacity-50" style={font}>
              {uploading ? 'Uploading…' : 'Replace'}
            </button>
            <button type="button" onClick={() => onChange({ storage_path: null, file_name: null, file_type: 'other', file_size: '' })} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500" title="Remove file"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
          disabled={uploading}
          className={`w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${dragging ? 'border-[#0A6070] bg-[#0A6070]/5' : 'border-slate-200 hover:border-[#0A6070]/50 bg-white'}`}
        >
          {uploading ? <Loader2 className="w-5 h-5 text-[#0A6070] animate-spin" /> : <Upload className="w-5 h-5 text-[#0A6070]" />}
          <span className="text-[12px] font-semibold text-[#1e293b]" style={font}>{uploading ? 'Uploading…' : 'Choose a file from your computer'}</span>
          <span className="text-[10px] text-[#94A3B8]" style={font}>or drag and drop it here · any file type · up to 50 MB</span>
        </button>
      )}
      {error && <p className="text-[11px] text-red-600" style={font}>{error}</p>}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
      />
      {!hasFile && (
        showLink ? (
          <div>
            <Lbl t="Or paste a link to a file hosted elsewhere" />
            <input value={value.file_url ?? ''} onChange={e => onChange({ file_url: e.target.value })} placeholder="https://…" className={inp} />
          </div>
        ) : (
          <button type="button" onClick={() => setShowLink(true)} className="text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}>Or paste a link instead</button>
        )
      )}
    </div>
  );
}

/* ───────────── document card ───────────── */

function DocCard({ doc, categories, onEdit, onDelete, onError }: { doc: Doc; categories: DocCat[]; onEdit: () => void; onDelete: () => void; onError: (m: string) => void }) {
  const cat = categories.find(c => c.id === doc.category_id);

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-bold text-[#1e293b] truncate" style={font}>{doc.title}</p>
            {doc.access_level === 'confidential' && <Lock className="w-3 h-3 text-red-400 flex-shrink-0" />}
          </div>
          <p className="text-[10px] text-[#94A3B8] flex items-center gap-1.5">
            {cat ? <><span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: cat.color ?? '#0A6070' }} />{cat.name}</> : 'Uncategorized'} · {fmtDate(doc.created_at)}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <OpenButton doc={doc} onError={onError} />
          <button onClick={onEdit} title="Edit" className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3 h-3" /></button>
          <button onClick={onDelete} title="Delete" className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
      {doc.description && <p className="text-[10px] text-[#64748B] line-clamp-2 mb-1.5">{doc.description}</p>}
      {doc.file_name && <p className="text-[10px] text-[#64748B] truncate mb-1.5">{doc.file_name}</p>}
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${doc.access_level === 'public' ? 'bg-emerald-100 text-emerald-700' : doc.access_level === 'confidential' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{doc.access_level}</span>
        {doc.file_type && <span className="text-[9px] text-[#94A3B8] uppercase">{doc.file_type}</span>}
        {doc.file_size && <span className="text-[9px] text-[#94A3B8]">{doc.file_size}</span>}
      </div>
    </div>
  );
}

/* ───────────── All documents ───────────── */

type DocForm = Partial<Doc>;

function AllDocsTab({ cats }: { cats: CategoryApi }) {
  const { items, loading, load, softDelete } = useCrud<Doc>('documents');
  const { adminRole } = useAdminAuth();
  const { notice, flash } = useNotice();
  const [editing, setEditing] = useState<DocForm | null>(null);
  const [originalPath, setOriginalPath] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Doc | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBusy, setNewCatBusy] = useState(false);

  const visible = adminRole === 'super_admin' ? items : items.filter(d => d.access_level !== 'confidential');
  const q = search.trim().toLowerCase();
  const filtered = visible.filter(d =>
    (!q || d.title?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q) || d.file_name?.toLowerCase().includes(q)) &&
    (filterCat === 'all' || (filterCat === 'none' ? !d.category_id : d.category_id === filterCat)));

  const blank: DocForm = { title: '', description: '', category_id: null, file_url: '', storage_path: null, file_name: null, file_type: 'other', file_size: '', access_level: 'internal' };

  const startForm = (d: DocForm, orig: string | null) => {
    setEditing(d); setOriginalPath(orig); setFormError(''); setNewCatOpen(false); setNewCatName('');
  };

  // Files uploaded in a form that is then cancelled would be orphaned; remove them quietly.
  const closeForm = async () => {
    if (editing?.storage_path && editing.storage_path !== originalPath) {
      await supabase.storage.from(BUCKET).remove([editing.storage_path]);
    }
    setEditing(null);
  };

  const addCategoryInline = async () => {
    setNewCatBusy(true);
    const { row, error } = await cats.add(newCatName);
    setNewCatBusy(false);
    if (error || !row) { setFormError(error ?? 'Could not create the category.'); return; }
    setFormError('');
    setEditing(e => (e ? { ...e, category_id: row.id } : e));
    setNewCatName(''); setNewCatOpen(false);
  };

  const save = async () => {
    if (!editing) return;
    setFormError('');
    const title = editing.title?.trim() ?? '';
    const link = editing.file_url?.trim() ?? '';
    if (!title) { setFormError('Please give the document a title.'); return; }
    if (!editing.storage_path && !link) { setFormError('Please choose a file from your computer, or paste a link.'); return; }

    setSaving(true);
    const row = {
      title,
      description: editing.description?.trim() ?? '',
      category_id: editing.category_id || null,
      storage_path: editing.storage_path || null,
      file_name: editing.storage_path ? editing.file_name : null,
      file_url: editing.storage_path ? '' : link,
      file_type: editing.storage_path ? (editing.file_type ?? 'other') : detectType(link),
      file_size: editing.storage_path ? (editing.file_size ?? '') : '',
      access_level: editing.access_level ?? 'internal',
      updated_at: new Date().toISOString(),
    };
    const { error } = editing.id
      ? await supabase.from('documents').update(row).eq('id', editing.id)
      : await supabase.from('documents').insert(row);
    setSaving(false);
    if (error) { setFormError(`Could not save the document: ${error.message}`); return; }

    // A replaced file is no longer referenced; tidy it away.
    if (originalPath && originalPath !== editing.storage_path) {
      await supabase.storage.from(BUCKET).remove([originalPath]);
    }
    setEditing(null);
    await load();
    flash('ok', editing.id ? 'Document updated.' : 'Document added.');
  };

  const confirmDelete = async (d: Doc) => {
    setDeleting(null);
    const ok = await softDelete(d.id);
    flash(ok ? 'ok' : 'error', ok ? `"${d.title}" was moved to the trash.` : 'Could not delete that document. Please try again.');
  };

  return (
    <div className="space-y-3">
      <Notice notice={notice} />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Search documents..." />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[12px]">
            <option value="all">All Categories</option>
            <option value="none">Uncategorized</option>
            {cats.items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <AddButton onClick={() => startForm({ ...blank }, null)} label="Add Document" />
      </div>

      {editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Lbl t="Title" /><input value={editing.title ?? ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Nurse contract, Amina K." className={inp} /></div>
            <div>
              <Lbl t="Category" />
              <select value={editing.category_id ?? ''} onChange={e => setEditing({ ...editing, category_id: e.target.value || null })} className={inp}>
                <option value="">Uncategorized</option>
                {cats.items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {newCatOpen ? (
                <div className="flex gap-1.5 mt-1.5">
                  <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategoryInline(); } }} placeholder="New category name" className={inp} />
                  <button type="button" onClick={addCategoryInline} disabled={newCatBusy || !newCatName.trim()} className="px-2.5 rounded-xl bg-[#0A6070] text-white disabled:opacity-50" title="Create category">{newCatBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}</button>
                  <button type="button" onClick={() => { setNewCatOpen(false); setNewCatName(''); }} className="px-2.5 rounded-xl bg-slate-100 text-slate-500" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => setNewCatOpen(true)} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}><Plus className="w-3 h-3" /> New category</button>
              )}
            </div>
          </div>
          <DocumentFileField
            value={{ storage_path: editing.storage_path ?? null, file_name: editing.file_name ?? null, file_url: editing.file_url ?? '', file_type: editing.file_type ?? null, file_size: editing.file_size ?? null }}
            onChange={patch => setEditing(e => (e ? { ...e, ...patch } : e))}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl t="Access Level" />
              <select value={editing.access_level ?? 'internal'} onChange={e => setEditing({ ...editing, access_level: e.target.value as Doc['access_level'] })} className={inp}>
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="confidential">Confidential (super admin only)</option>
              </select>
            </div>
          </div>
          <div><Lbl t="Description (optional)" /><textarea value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className={ta} /></div>
          {formError && <p className="text-[12px] font-medium text-red-600" style={font}>{formError}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={closeForm} disabled={saving} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={FileText} message={items.length === 0 ? 'No documents yet. Click "Add Document" to upload your first one.' : 'No documents match your search.'} /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(d => (
            <DocCard key={d.id} doc={d} categories={cats.items}
              onEdit={() => startForm({ ...d }, d.storage_path)}
              onDelete={() => setDeleting(d)}
              onError={m => flash('error', m)} />
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Delete "${deleting.title}"? It will be moved to the trash.`}
          onConfirm={() => confirmDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

/* ───────────── Categories ───────────── */

function CategoriesTab({ cats }: { cats: CategoryApi }) {
  const { notice, flash } = useNotice();
  const [editing, setEditing] = useState<Partial<DocCat> | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<DocCat | null>(null);

  const blank: Partial<DocCat> = { name: '', color: '#0A6070', sort_order: cats.items.length + 1 };

  const save = async () => {
    if (!editing) return;
    setFormError('');
    const name = editing.name?.trim() ?? '';
    if (!name) { setFormError('Please enter a category name.'); return; }
    if (cats.items.some(c => c.id !== editing.id && c.name.trim().toLowerCase() === name.toLowerCase())) {
      setFormError(`A category called "${name}" already exists.`);
      return;
    }
    setSaving(true);
    let error: string | undefined;
    if (editing.id) {
      const res = await supabase.from('document_categories').update({ name, color: editing.color ?? '#0A6070', sort_order: editing.sort_order ?? 0 }).eq('id', editing.id);
      error = res.error?.message;
    } else {
      const res = await cats.add(name, editing.color ?? '#0A6070');
      error = res.error;
    }
    setSaving(false);
    if (error) { setFormError(`Could not save the category: ${error}`); return; }
    const wasEdit = !!editing.id;
    setEditing(null);
    await cats.reload();
    flash('ok', wasEdit ? 'Category updated.' : 'Category created.');
  };

  const confirmDelete = async (c: DocCat) => {
    setDeleting(null);
    const ok = await cats.softDelete(c.id);
    flash(ok ? 'ok' : 'error', ok ? `Category "${c.name}" deleted. Its documents are now uncategorized.` : 'Could not delete that category. Please try again.');
  };

  return (
    <div className="space-y-3">
      <Notice notice={notice} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-[#64748B]" style={font}>Group documents by type, for example Nurse Contracts or Board Minutes.</p>
        <AddButton onClick={() => { setEditing({ ...blank }); setFormError(''); }} label="Add Category" />
      </div>

      {editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2"><Lbl t="Name" /><input autoFocus value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') save(); }} placeholder="e.g. Nurse Contracts" className={inp} /></div>
            <div><Lbl t="Color" /><input type="color" value={editing.color ?? '#0A6070'} onChange={e => setEditing({ ...editing, color: e.target.value })} className={inp + ' h-[34px] p-1'} /></div>
          </div>
          {editing.id && <div className="sm:w-40"><Lbl t="Sort order" /><input type="number" value={editing.sort_order ?? 0} onChange={e => setEditing({ ...editing, sort_order: +e.target.value })} className={inp} /></div>}
          {formError && <p className="text-[12px] font-medium text-red-600" style={font}>{formError}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setEditing(null)} disabled={saving} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {cats.loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : cats.items.length === 0 ? <EmptyState icon={FolderOpen} message="No categories yet. Click &quot;Add Category&quot; to create the first one." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cats.items.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: (c.color ?? '#0A6070') + '20' }}>
                  <FolderOpen className="w-4 h-4" style={{ color: c.color ?? '#0A6070' }} />
                </div>
                <p className="text-[12px] font-bold text-[#1e293b] truncate" style={font}>{c.name}</p>
              </div>
              <div className="flex gap-0.5 flex-shrink-0">
                <button onClick={() => { setEditing({ ...c }); setFormError(''); }} title="Edit" className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => setDeleting(c)} title="Delete" className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Delete the category "${deleting.name}"? Documents in it are kept and become uncategorized.`}
          onConfirm={() => confirmDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

/* ───────────── Recent ───────────── */

function RecentTab() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const { adminRole } = useAdminAuth();
  const { notice, flash } = useNotice();

  useEffect(() => {
    supabase.from('documents').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(12).then(({ data }) => {
      setDocs((data ?? []) as unknown as Doc[]);
      setLoading(false);
    });
  }, []);

  const visible = adminRole === 'super_admin' ? docs : docs.filter(d => d.access_level !== 'confidential');

  return (
    <div className="space-y-3">
      <Notice notice={notice} />
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : visible.length === 0 ? <EmptyState icon={Clock} message="No recent documents." /> : (
        <div className="space-y-2">
          {visible.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-[#64748B]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#1e293b] truncate" style={font}>{d.title}</p>
                  <p className="text-[10px] text-[#94A3B8]">{fmtDateTime(d.created_at)}</p>
                </div>
              </div>
              <OpenButton doc={d} onError={m => flash('error', m)} size="md" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────── Page ───────────── */

export default function DocumentsPage() {
  const [active, setActive] = useState('all');
  const crud = useCrud<DocCat>('document_categories', true, { column: 'sort_order', ascending: true });

  const cats: CategoryApi = {
    items: crud.items,
    loading: crud.loading,
    reload: crud.load,
    softDelete: crud.softDelete,
    add: async (rawName, color = '#0A6070') => {
      const name = rawName.trim();
      if (!name) return { error: 'Please enter a category name.' };
      if (crud.items.some(c => c.name.trim().toLowerCase() === name.toLowerCase())) return { error: `A category called "${name}" already exists.` };
      const next = crud.items.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1;
      const { data, error } = await supabase.from('document_categories').insert({ name, color, icon: 'FileText', sort_order: next }).select().single();
      if (error || !data) return { error: error?.message ?? 'Could not create the category.' };
      await crud.load();
      return { row: data as DocCat };
    },
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Documents</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={font}>Centralized document storage with access-level controls. Uploaded files are private and only open for signed-in team members.</p>
      </div>
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4">
        {active === 'all' && <AllDocsTab cats={cats} />}
        {active === 'categories' && <CategoriesTab cats={cats} />}
        {active === 'recent' && <RecentTab />}
      </div>
    </div>
  );
}
