import { useRef, useState } from 'react';
import { Upload, Loader2, X, Plus, Check, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Drawer from '../../components/Drawer';
import { inp, ta, Lbl } from '../../components/shared';
import { BUCKET, MAX_BYTES, Doc, DocCat, DocsApi, ACCESS_META, font, detectType, humanSize, typeMeta } from './shared';
import type { AccessLevel } from './shared';

interface Props {
  initial: Partial<Doc>;
  cats: DocCat[];
  addCategory: DocsApi['addCategory'];
  onClose: () => void;
  onSaved: (message: string) => void;
  /** Extra columns saved with the document, e.g. the Home Care family or worker it belongs to. */
  extra?: Record<string, unknown>;
}

const BLANK: Partial<Doc> = {
  title: '', description: '', category_id: null, file_url: '', storage_path: null,
  file_name: null, file_type: 'other', file_size: '', access_level: 'internal',
};

export default function DocumentForm({ initial, cats, addCategory, onClose, onSaved, extra }: Props) {
  const [d, setD] = useState<Partial<Doc>>({ ...BLANK, ...initial });
  const originalPath = initial.storage_path ?? null;
  const isEdit = !!initial.id;

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showLink, setShowLink] = useState(!!initial.file_url);
  const fileRef = useRef<HTMLInputElement>(null);

  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBusy, setNewCatBusy] = useState(false);

  const patch = (p: Partial<Doc>) => setD(cur => ({ ...cur, ...p }));

  // A file uploaded in a form that is then abandoned would be orphaned in storage; remove it quietly.
  const close = async () => {
    if (d.storage_path && d.storage_path !== originalPath) {
      await supabase.storage.from(BUCKET).remove([d.storage_path]);
    }
    onClose();
  };

  const upload = async (file: File) => {
    setUploadError('');
    if (file.size === 0) { setUploadError('That file is empty.'); return; }
    if (file.size > MAX_BYTES) { setUploadError(`That file is ${humanSize(file.size)}. The limit is 50 MB.`); return; }
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
    setUploading(false);
    if (upErr) { setUploadError(`Upload failed: ${upErr.message}`); return; }
    // Drop a previous upload from this same form session so it is not left behind.
    if (d.storage_path && d.storage_path !== originalPath) await supabase.storage.from(BUCKET).remove([d.storage_path]);
    patch({ storage_path: path, file_name: file.name, file_url: '', file_type: detectType(file.name), file_size: humanSize(file.size),
      title: d.title?.trim() ? d.title : file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') });
    setShowLink(false);
  };

  const createCategory = async () => {
    setNewCatBusy(true);
    const { row, error: err } = await addCategory(newCatName, '#0A6070');
    setNewCatBusy(false);
    if (err || !row) { setError(err ?? 'Could not create the category.'); return; }
    setError('');
    patch({ category_id: row.id });
    setNewCatName(''); setNewCatOpen(false);
  };

  const save = async () => {
    setError('');
    const title = d.title?.trim() ?? '';
    const link = d.file_url?.trim() ?? '';
    if (!title) { setError('Please give the document a title.'); return; }
    if (!d.storage_path && !link) { setError('Please choose a file from your computer, or paste a link.'); return; }

    setSaving(true);
    const row = {
      title,
      description: d.description?.trim() ?? '',
      category_id: d.category_id || null,
      storage_path: d.storage_path || null,
      file_name: d.storage_path ? d.file_name : null,
      file_url: d.storage_path ? '' : link,
      file_type: d.storage_path ? (d.file_type ?? 'other') : detectType(link),
      file_size: d.storage_path ? (d.file_size ?? '') : '',
      access_level: d.access_level ?? 'internal',
      updated_at: new Date().toISOString(),
      ...(extra ?? {}),
    };
    const { error: dbErr } = isEdit
      ? await supabase.from('documents').update(row).eq('id', initial.id!)
      : await supabase.from('documents').insert(row);
    setSaving(false);
    if (dbErr) { setError(`Could not save the document: ${dbErr.message}`); return; }

    // The previous file is no longer referenced once replaced or removed.
    if (originalPath && originalPath !== d.storage_path) {
      await supabase.storage.from(BUCKET).remove([originalPath]);
    }
    onSaved(isEdit ? 'Document updated.' : 'Document added.');
  };

  const hasFile = !!d.storage_path;
  const tm = typeMeta(d.file_type);

  return (
    <Drawer
      title={isEdit ? 'Edit document' : 'Add document'}
      subtitle={isEdit ? undefined : 'Upload a file and file it under a category'}
      onClose={close}
      width="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-red-600 font-medium min-w-0" style={font}>{error}</p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={close} disabled={saving} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-semibold hover:bg-slate-200 disabled:opacity-60" style={font}>Cancel</button>
            <button onClick={save} disabled={saving || uploading} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-semibold disabled:opacity-60" style={font}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add document'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* File first: it is the main thing, and it can fill in the title */}
        <div>
          <Lbl t="File" />
          {hasFile ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tm.bg, color: tm.fg }}><tm.icon className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#1e293b] truncate" style={font}>{d.file_name}</p>
                  <p className="text-[10px] text-[#64748B]" style={font}>{d.file_size} · {tm.label} · uploaded</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-2.5 py-1.5 rounded-lg bg-white text-slate-600 text-[11px] font-semibold hover:bg-slate-50 disabled:opacity-50" style={font}>
                  {uploading ? 'Uploading…' : 'Replace'}
                </button>
                <button type="button" onClick={() => patch({ storage_path: null, file_name: null, file_type: 'other', file_size: '' })} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500" title="Remove file"><X className="w-4 h-4" /></button>
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
              className={`w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-9 transition-colors ${dragging ? 'border-[#0A6070] bg-[#0A6070]/5' : 'border-slate-200 hover:border-[#0A6070]/50 bg-slate-50/50'}`}
            >
              <div className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                {uploading ? <Loader2 className="w-5 h-5 text-[#0A6070] animate-spin" /> : <Upload className="w-5 h-5 text-[#0A6070]" />}
              </div>
              <span className="text-[13px] font-semibold text-[#1e293b]" style={font}>{uploading ? 'Uploading…' : 'Choose a file from your computer'}</span>
              <span className="text-[11px] text-[#94A3B8]" style={font}>or drag and drop it here · any file type · up to 50 MB</span>
            </button>
          )}
          {uploadError && <p className="text-[11px] text-red-600 mt-1.5" style={font}>{uploadError}</p>}
          <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
          {!hasFile && (showLink ? (
            <div className="mt-3">
              <Lbl t="Or paste a link to a file hosted elsewhere" />
              <input value={d.file_url ?? ''} onChange={e => patch({ file_url: e.target.value })} placeholder="https://…" className={inp} />
            </div>
          ) : (
            <button type="button" onClick={() => setShowLink(true)} className="mt-2 text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}>Or paste a link instead</button>
          ))}
        </div>

        <div>
          <Lbl t="Title" />
          <input value={d.title ?? ''} onChange={e => patch({ title: e.target.value })} placeholder="e.g. Nurse contract, Amina K." className={inp} />
        </div>

        <div>
          <Lbl t="Category" />
          <select value={d.category_id ?? ''} onChange={e => patch({ category_id: e.target.value || null })} className={inp}>
            <option value="">Uncategorized</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {newCatOpen ? (
            <div className="flex gap-1.5 mt-2">
              <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createCategory(); } }} placeholder="New category name" className={inp} />
              <button type="button" onClick={createCategory} disabled={newCatBusy || !newCatName.trim()} className="px-3 rounded-xl bg-[#0A6070] text-white disabled:opacity-50" title="Create category">{newCatBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}</button>
              <button type="button" onClick={() => { setNewCatOpen(false); setNewCatName(''); }} className="px-3 rounded-xl bg-slate-100 text-slate-500" title="Cancel"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setNewCatOpen(true)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}><Plus className="w-3 h-3" /> New category</button>
          )}
        </div>

        <div>
          <Lbl t="Who can see it" />
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ACCESS_META) as AccessLevel[]).map(level => {
              const m = ACCESS_META[level];
              const active = d.access_level === level;
              return (
                <button key={level} type="button" onClick={() => patch({ access_level: level })}
                  className={`text-left rounded-xl border-2 px-3 py-2.5 transition-all ${active ? 'border-[#0A6070] bg-[#0A6070]/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <m.icon className={`w-4 h-4 mb-1.5 ${active ? 'text-[#0A6070]' : 'text-slate-400'}`} />
                  <span className="block text-[12px] font-bold text-[#1e293b]" style={font}>{m.label}</span>
                  <span className="block text-[10px] text-[#94A3B8] leading-snug" style={font}>{m.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Lbl t="Description (optional)" />
          <textarea value={d.description ?? ''} onChange={e => patch({ description: e.target.value })} placeholder="What is this document, and who is it about?" className={ta} />
        </div>

        {!hasFile && !d.file_url && <p className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]" style={font}><FileText className="w-3 h-3" /> A document needs either an uploaded file or a link.</p>}
      </div>
    </Drawer>
  );
}
