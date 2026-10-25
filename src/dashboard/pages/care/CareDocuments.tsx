import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, Pencil, Trash2, ExternalLink, Download } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { fmtDate } from '../../components/shared';
import ConfirmDialog from '../../components/ConfirmDialog';
import DocumentForm from '../documents/DocumentForm';
import { Doc, DocCat, openDocument } from '../documents/shared';
import { FileBadge } from '../documents/DocumentItems';
import { Btn, Empty, Notice, SectionCard, font } from './shared';

interface Props {
  /** Which record the documents belong to. */
  link: { column: 'care_family_id' | 'care_staff_id' | 'care_contract_id'; id: string };
  /** The category new uploads are filed under by default. */
  categoryName: 'Parent Service Contracts' | 'Nurse/Caregiver Contracts';
  title?: string;
  subtitle?: string;
  uploadLabel?: string;
  /** Called when a document is added or removed so a parent page can refresh. */
  onChanged?: () => void;
}

/** Documents (signed contracts, ID copies) attached to a family or a worker. They are also filed in the main Documents library. */
export default function CareDocuments({ link, categoryName, title = 'Documents', subtitle, uploadLabel = 'Upload a document', onChanged }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [cats, setCats] = useState<DocCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Doc> | null>(null);
  const [deleting, setDeleting] = useState<Doc | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from('documents').select('*').eq(link.column, link.id).is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('document_categories').select('*').is('deleted_at', null).order('sort_order'),
    ]);
    setDocs((d ?? []) as Doc[]);
    setCats((c ?? []) as DocCat[]);
    setLoading(false);
  }, [link.column, link.id]);

  useEffect(() => { load(); }, [load]);

  const defaultCat = cats.find(c => c.name.toLowerCase() === categoryName.toLowerCase())?.id ?? null;

  const addCategory = async (rawName: string, color: string) => {
    const name = rawName.trim();
    if (!name) return { error: 'Please enter a category name.' };
    const { data, error } = await supabase.from('document_categories').insert({ name, color, icon: 'FileText', sort_order: cats.length + 20 }).select().single();
    if (error || !data) return { error: error?.message ?? 'Could not create the category.' };
    await load();
    return { row: data as DocCat };
  };

  const open = async (d: Doc, download = false) => {
    const err = await openDocument(d, download);
    if (err) setMsg({ kind: 'error', text: err });
  };

  const remove = async (d: Doc) => {
    setDeleting(null);
    const { error } = await supabase.from('documents').update({ deleted_at: new Date().toISOString() }).eq('id', d.id);
    if (error) { setMsg({ kind: 'error', text: `Could not remove it: ${error.message}` }); return; }
    setMsg({ kind: 'ok', text: `"${d.title}" was moved to the trash.` });
    await load(); onChanged?.();
  };

  return (
    <SectionCard title={title} subtitle={subtitle} action={<Btn variant="soft" icon={Plus} onClick={() => setForm({ category_id: defaultCat })}>{uploadLabel}</Btn>}>
      {msg && <div className="p-3"><Notice kind={msg.kind} onClose={() => setMsg(null)}>{msg.text}</Notice></div>}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8" style={font}>Loading…</p> : docs.length === 0 ? (
        <Empty icon={FileText} title="No documents yet" hint="Upload the signed contract or an ID copy. It is stored privately and also appears in the Documents library." />
      ) : (
        <div className="divide-y divide-slate-50">
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <FileBadge type={d.file_type} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-[#0f172a] truncate" style={font}>{d.title}</p>
                <p className="text-[10px] text-[#94A3B8] truncate" style={font}>{cats.find(c => c.id === d.category_id)?.name ?? 'Uncategorized'} · {fmtDate(d.created_at)}{d.file_size ? ` · ${d.file_size}` : ''}</p>
              </div>
              <div className="flex items-center">
                <button title="Open" onClick={() => open(d)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-100"><ExternalLink className="w-3.5 h-3.5" /></button>
                {d.storage_path && <button title="Download" onClick={() => open(d, true)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-100"><Download className="w-3.5 h-3.5" /></button>}
                <button title="Edit" onClick={() => setForm({ ...d })} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                <button title="Delete" onClick={() => setDeleting(d)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {form && (
        <DocumentForm
          initial={form}
          cats={cats}
          addCategory={addCategory}
          extra={{ [link.column]: link.id }}
          onClose={() => setForm(null)}
          onSaved={async text => { setForm(null); setMsg({ kind: 'ok', text }); await load(); onChanged?.(); }}
        />
      )}
      {deleting && <ConfirmDialog message={`Delete "${deleting.title}"? It will be moved to the trash.`} onConfirm={() => remove(deleting)} onCancel={() => setDeleting(null)} />}
    </SectionCard>
  );
}
