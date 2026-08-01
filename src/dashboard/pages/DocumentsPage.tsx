import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { FileText, FolderOpen, Clock, Pencil, Trash2, ExternalLink, Lock } from 'lucide-react';
import TabBar from '../components/TabBar';
import { useCrud, EmptyState, SearchInput, fmtDate, fmtDateTime, inp, ta, Lbl, AddButton } from '../components/shared';
import { FileUploadField } from '../components/UploadField';

const tabs = [
  { id: 'all', label: 'All Documents', icon: FileText },
  { id: 'categories', label: 'Categories', icon: FolderOpen },
  { id: 'recent', label: 'Recent', icon: Clock },
];

interface Doc { id: string; title: string; description: string; category_id: string; file_url: string; file_type: string; file_size: string; tags: string[]; access_level: string; created_at: string; }
interface DocCat { id: string; name: string; color: string; icon: string; sort_order: number; }

function DocCard({ doc, categories, onEdit, onDelete }: { doc: Doc; categories: DocCat[]; onEdit: () => void; onDelete: () => void }) {
  const { adminRole } = useAdminAuth();
  if (doc.access_level === 'confidential' && adminRole !== 'super_admin') return null;
  const cat = categories.find(c => c.id === doc.category_id);

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-bold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{doc.title}</p>
            {doc.access_level === 'confidential' && <Lock className="w-3 h-3 text-red-400 flex-shrink-0" />}
          </div>
          <p className="text-[10px] text-[#94A3B8]">{cat?.name ?? 'Uncategorized'} · {fmtDate(doc.created_at)}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><ExternalLink className="w-3 h-3" /></a>}
          <button onClick={onEdit} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3 h-3" /></button>
          <button onClick={onDelete} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
      {doc.description && <p className="text-[10px] text-[#64748B] line-clamp-2 mb-1.5">{doc.description}</p>}
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${doc.access_level === 'public' ? 'bg-emerald-100 text-emerald-700' : doc.access_level === 'confidential' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{doc.access_level}</span>
        {doc.file_type && <span className="text-[9px] text-[#94A3B8] uppercase">{doc.file_type}</span>}
      </div>
    </div>
  );
}

function AllDocsTab() {
  const { items, loading, softDelete } = useCrud<any>('documents');
  const [categories, setCategories] = useState<DocCat[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    supabase.from('document_categories').select('*').is('deleted_at', null).order('sort_order').then(({ data }) => setCategories(data ?? []));
  }, []);

  const { adminRole } = useAdminAuth();
  const visible = adminRole === 'super_admin' ? items : items.filter((d: Doc) => d.access_level !== 'confidential');
  const filtered = visible.filter((d: Doc) => d.title?.toLowerCase().includes(search.toLowerCase()) && (filterCat === 'all' || d.category_id === filterCat));
  const blank: Omit<Doc, 'id'> = { title: '', description: '', category_id: '', file_url: '', file_type: 'other', file_size: '', tags: [], access_level: 'internal', created_at: '' };

  const save = async () => {
    if (editing.id) await supabase.from('documents').update({ ...editing, created_at: undefined }).eq('id', editing.id);
    else await supabase.from('documents').insert({ ...editing, created_at: new Date().toISOString() });
    setEditing(null); setShowForm(false);
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Search documents..." />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[12px]">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Document" />
      </div>
      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Lbl t="Title" /><input value={editing.title ?? ''} onChange={e => setEditing({ ...editing, title: e.target.value })} className={inp} /></div>
            <div><Lbl t="Category" /><select value={editing.category_id ?? ''} onChange={e => setEditing({ ...editing, category_id: e.target.value })} className={inp}><option value="">Uncategorized</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><Lbl t="Access Level" /><select value={editing.access_level ?? 'internal'} onChange={e => setEditing({ ...editing, access_level: e.target.value })} className={inp}><option value="public">Public</option><option value="internal">Internal</option><option value="confidential">Confidential</option></select></div>
            <FileUploadField label="File" value={editing.file_url ?? ''} onChange={url => setEditing({ ...editing, file_url: url })} folder="voice-of-preemies/documents" />
            <div><Lbl t="File Type" /><select value={editing.file_type ?? 'other'} onChange={e => setEditing({ ...editing, file_type: e.target.value })} className={inp}><option value="pdf">PDF</option><option value="docx">DOCX</option><option value="image">Image</option><option value="video">Video</option><option value="spreadsheet">Spreadsheet</option><option value="other">Other</option></select></div>
            <div><Lbl t="File Size" /><input value={editing.file_size ?? ''} onChange={e => setEditing({ ...editing, file_size: e.target.value })} className={inp} /></div>
          </div>
          <div><Lbl t="Description" /><textarea value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className={ta} /></div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={FileText} message="No documents yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((d: Doc) => <DocCard key={d.id} doc={d} categories={categories} onEdit={() => { setEditing({ ...d }); setShowForm(true); }} onDelete={() => softDelete(d.id)} />)}
        </div>
      )}
    </div>
  );
}

function CategoriesTab() {
  const { items, loading, create, softDelete } = useCrud<any>('document_categories');
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const blank = { name: '', color: '#0A6070', icon: 'FileText', sort_order: 0 };
  const save = async () => {
    if (editing.id) await supabase.from('document_categories').update(editing).eq('id', editing.id);
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Lbl t="Name" /><input value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} className={inp} /></div>
            <div><Lbl t="Color" /><input type="color" value={editing.color ?? '#0A6070'} onChange={e => setEditing({ ...editing, color: e.target.value })} className={inp} /></div>
            <div><Lbl t="Sort Order" /><input type="number" value={editing.sort_order ?? 0} onChange={e => setEditing({ ...editing, sort_order: +e.target.value })} className={inp} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : items.length === 0 ? <EmptyState icon={FolderOpen} message="No categories yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.color + '20' }}>
                  <FolderOpen className="w-4 h-4" style={{ color: c.color }} />
                </div>
                <p className="text-[12px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.name}</p>
              </div>
              <button onClick={() => softDelete(c.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentTab() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const { adminRole } = useAdminAuth();

  useEffect(() => {
    supabase.from('documents').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(12).then(({ data }) => {
      setDocs((data ?? []) as unknown as Doc[]);
      setLoading(false);
    });
  }, []);

  const visible = adminRole === 'super_admin' ? docs : docs.filter(d => d.access_level !== 'confidential');

  return (
    <div className="space-y-3">
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : visible.length === 0 ? <EmptyState icon={Clock} message="No recent documents." /> : (
        <div className="space-y-2">
          {visible.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-[#64748B]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.title}</p>
                  <p className="text-[10px] text-[#94A3B8]">{fmtDateTime(d.created_at)}</p>
                </div>
              </div>
              {d.file_url && <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50 flex-shrink-0"><ExternalLink className="w-3.5 h-3.5" /></a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const [active, setActive] = useState('all');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Documents</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Centralized document storage with access-level controls.</p>
      </div>
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4">
        {active === 'all' && <AllDocsTab />}
        {active === 'categories' && <CategoriesTab />}
        {active === 'recent' && <RecentTab />}
      </div>
    </div>
  );
}
