import { useMemo, useState } from 'react';
import { FileText, FolderOpen, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import TabBar from '../components/TabBar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useCrud } from '../components/shared';
import { Doc, DocCat, DocsApi, font, openDocument } from './documents/shared';
import CategoriesTab from './documents/CategoriesTab';
import AllDocumentsTab from './documents/AllDocumentsTab';
import RecentTab from './documents/RecentTab';
import DocumentForm from './documents/DocumentForm';

export default function DocumentsPage() {
  const { adminRole } = useAdminAuth();
  const [active, setActive] = useState('categories');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState<{ initial: Partial<Doc> } | null>(null);
  const [deleting, setDeleting] = useState<Doc | null>(null);

  const docsCrud = useCrud<Doc>('documents');
  const catsCrud = useCrud<DocCat>('document_categories', true, { column: 'sort_order', ascending: true });

  const flash = (kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(n => (n?.text === text ? null : n)), 6000);
  };

  // Confidential documents are for super admins only. A document whose category was deleted counts as uncategorized.
  const docs = useMemo(() => {
    const known = new Set(catsCrud.items.map(c => c.id));
    return docsCrud.items
      .filter(d => adminRole === 'super_admin' || d.access_level !== 'confidential')
      .map(d => (!catsCrud.loading && d.category_id && !known.has(d.category_id) ? { ...d, category_id: null } : d));
  }, [docsCrud.items, catsCrud.items, catsCrud.loading, adminRole]);

  const nameTaken = (name: string, exceptId?: string) =>
    catsCrud.items.some(c => c.id !== exceptId && c.name.trim().toLowerCase() === name.trim().toLowerCase());

  const api: DocsApi = {
    docs,
    cats: catsCrud.items,
    loading: docsCrud.loading || catsCrud.loading,
    openForm: (initial = {}) => setForm({ initial }),
    askDelete: d => setDeleting(d),
    openFile: async (d, download) => {
      const err = await openDocument(d, download);
      if (err) flash('error', err);
    },
    addCategory: async (rawName, color) => {
      const name = rawName.trim();
      if (!name) return { error: 'Please enter a category name.' };
      if (nameTaken(name)) return { error: `A category called "${name}" already exists.` };
      const next = catsCrud.items.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1;
      const { data, error } = await supabase.from('document_categories').insert({ name, color, icon: 'FileText', sort_order: next }).select().single();
      if (error || !data) return { error: `Could not create the category: ${error?.message ?? 'unknown error'}` };
      await catsCrud.load();
      return { row: data as DocCat };
    },
    updateCategory: async (id, rawName, color) => {
      const name = rawName.trim();
      if (!name) return 'Please enter a category name.';
      if (nameTaken(name, id)) return `A category called "${name}" already exists.`;
      const { error } = await supabase.from('document_categories').update({ name, color }).eq('id', id);
      if (error) return `Could not save the category: ${error.message}`;
      await catsCrud.load();
      return null;
    },
    deleteCategory: async c => {
      // Release its documents first so none are left pointing at a category that no longer exists.
      const released = await supabase.from('documents').update({ category_id: null }).eq('category_id', c.id);
      if (released.error) { flash('error', `Could not delete the category: ${released.error.message}`); return; }
      const ok = await catsCrud.softDelete(c.id);
      await docsCrud.load();
      flash(ok ? 'ok' : 'error', ok ? `Category "${c.name}" deleted. Its documents are now uncategorized.` : 'Could not delete that category. Please try again.');
    },
    flash,
  };

  const confirmDelete = async (d: Doc) => {
    setDeleting(null);
    const ok = await docsCrud.softDelete(d.id);
    flash(ok ? 'ok' : 'error', ok ? `"${d.title}" was moved to the trash.` : 'Could not delete that document. Please try again.');
  };

  const tabs = [
    { id: 'categories', label: 'Categories', icon: FolderOpen, badge: catsCrud.items.length },
    { id: 'all', label: 'All Documents', icon: FileText, badge: docs.length },
    { id: 'recent', label: 'Recent', icon: Clock },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Documents</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={font}>Contracts and records, filed by category. Uploaded files are private and only open for signed-in team members.</p>
      </div>

      {notice && (
        <div className={`mb-3 text-[12px] font-medium rounded-xl border px-3 py-2.5 ${notice.kind === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`} style={font} role="status">
          {notice.text}
        </div>
      )}

      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
        {active === 'categories' && <CategoriesTab api={api} />}
        {active === 'all' && <AllDocumentsTab api={api} />}
        {active === 'recent' && <RecentTab api={api} />}
      </div>

      {form && (
        <DocumentForm
          initial={form.initial}
          cats={catsCrud.items}
          addCategory={api.addCategory}
          onClose={() => setForm(null)}
          onSaved={async msg => { setForm(null); await docsCrud.load(); flash('ok', msg); }}
        />
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
