import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  ClipboardList, Plus, Trash2, Download, Lock, Unlock, ChevronUp, ChevronDown, ExternalLink, X,
} from 'lucide-react';
import SubPage from '../components/SubPage';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageHeader, AddButton, StatusBadge, EmptyState, SearchInput, fmtDate, fmtDateTime, inp, ta, Lbl } from '../components/shared';

type QuestionType = 'short_text' | 'phone' | 'multiple_choice';
interface Option { en: string; rw: string; }
interface FormRow { id: string; slug: string; title_en: string; title_rw: string; description_en: string; description_rw: string; status: 'open' | 'closed'; created_at: string; }
interface QuestionRow { id: string; form_id: string; position: number; label_en: string; label_rw: string; type: QuestionType; options: Option[] | null; allow_other: boolean; required: boolean; }
interface ResponseRow { id: string; form_id: string; answers: Record<string, string>; created_at: string; }
interface DraftQuestion { label_en: string; label_rw: string; type: QuestionType; required: boolean; allow_other: boolean; options: Option[]; }

const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const BLANK_QUESTION = (): DraftQuestion => ({ label_en: '', label_rw: '', type: 'short_text', required: true, allow_other: false, options: [{ en: '', rw: '' }, { en: '', rw: '' }] });

// ── Question editor row (used inside the New Form builder) ──────────────────
function QuestionEditor({
  q, index, total, onChange, onRemove, onMove,
}: {
  q: DraftQuestion; index: number; total: number;
  onChange: (patch: Partial<DraftQuestion>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const setOption = (i: number, patch: Partial<Option>) => onChange({ options: q.options.map((o, idx) => idx === i ? { ...o, ...patch } : o) });
  const addOption = () => onChange({ options: [...q.options, { en: '', rw: '' }] });
  const removeOption = (i: number) => onChange({ options: q.options.filter((_, idx) => idx !== i) });

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest" style={font}>Question {index + 1}</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-white disabled:opacity-30 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-white disabled:opacity-30 transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={onRemove} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-white transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div><Lbl t="Label (English)" /><input value={q.label_en} onChange={e => onChange({ label_en: e.target.value })} placeholder="e.g. Full Name" className={inp} style={font} /></div>
        <div><Lbl t="Label (Kinyarwanda)" /><input value={q.label_rw} onChange={e => onChange({ label_rw: e.target.value })} placeholder="e.g. Amazina yombi" className={inp} style={font} /></div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 items-end">
        <div>
          <Lbl t="Answer Type" />
          <select
            value={q.type}
            onChange={e => onChange({ type: e.target.value as QuestionType, options: e.target.value === 'multiple_choice' && q.options.length === 0 ? [{ en: '', rw: '' }, { en: '', rw: '' }] : q.options })}
            className={inp}
            style={font}
          >
            <option value="short_text">Short Text</option>
            <option value="phone">Phone</option>
            <option value="multiple_choice">Multiple Choice</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer pb-2.5">
          <input type="checkbox" checked={q.required} onChange={e => onChange({ required: e.target.checked })} className="w-4 h-4 rounded accent-[#0A6070]" />
          <span className="text-[12px] text-[#334155]" style={font}>Required</span>
        </label>
      </div>

      {q.type === 'multiple_choice' && (
        <div className="space-y-2 pt-1">
          <Lbl t="Options" />
          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={opt.en} onChange={e => setOption(i, { en: e.target.value })} placeholder="Option (English)" className={inp} style={font} />
                <input value={opt.rw} onChange={e => setOption(i, { rw: e.target.value })} placeholder="Option (Kinyarwanda)" className={inp} style={font} />
                <button type="button" onClick={() => removeOption(i)} disabled={q.options.length <= 1} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-white disabled:opacity-30 transition-colors flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} className="flex items-center gap-1 text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}><Plus className="w-3 h-3" /> Add option</button>
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input type="checkbox" checked={q.allow_other} onChange={e => onChange({ allow_other: e.target.checked })} className="w-4 h-4 rounded accent-[#0A6070]" />
            <span className="text-[12px] text-[#334155]" style={font}>Allow an "Other" free-text option</span>
          </label>
        </div>
      )}
    </div>
  );
}

// ── New Form builder ──────────────────────────────────────────────────────────
function NewFormBuilder({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [titleEn, setTitleEn] = useState('');
  const [titleRw, setTitleRw] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [descEn, setDescEn] = useState('');
  const [descRw, setDescRw] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([BLANK_QUESTION()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateQuestion = (i: number, patch: Partial<DraftQuestion>) => setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  const removeQuestion = (i: number) => setQuestions(qs => qs.filter((_, idx) => idx !== i));
  const addQuestion = () => setQuestions(qs => [...qs, BLANK_QUESTION()]);
  const moveQuestion = (i: number, dir: -1 | 1) => setQuestions(qs => {
    const j = i + dir;
    if (j < 0 || j >= qs.length) return qs;
    const next = [...qs];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const isValid = titleEn.trim() && titleRw.trim() && slug.trim() && questions.length > 0 &&
    questions.every(q => q.label_en.trim() && q.label_rw.trim() && (q.type !== 'multiple_choice' || q.options.filter(o => o.en.trim()).length >= 2));

  const save = async () => {
    if (!isValid) return;
    setSaving(true);
    setError('');
    try {
      const { data: form, error: formErr } = await supabase
        .from('forms')
        .insert({ slug: slug.trim(), title_en: titleEn.trim(), title_rw: titleRw.trim(), description_en: descEn.trim(), description_rw: descRw.trim(), status: 'open' })
        .select()
        .single();
      if (formErr) throw formErr;

      const rows = questions.map((q, i) => ({
        form_id: form.id,
        position: i + 1,
        label_en: q.label_en.trim(),
        label_rw: q.label_rw.trim(),
        type: q.type,
        required: q.required,
        allow_other: q.type === 'multiple_choice' ? q.allow_other : false,
        options: q.type === 'multiple_choice' ? q.options.filter(o => o.en.trim()).map(o => ({ en: o.en.trim(), rw: o.rw.trim() || o.en.trim() })) : null,
      }));
      const { error: qErr } = await supabase.from('form_questions').insert(rows);
      if (qErr) throw qErr;

      onCreated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create form.';
      setError(msg.includes('duplicate') || msg.includes('unique') ? `A form with slug "${slug}" already exists. Try a different title or slug.` : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 mb-4">
      <div>
        <h2 className="text-lg font-bold text-[#0f172a] mb-3" style={serif}>New Form</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl t="Title (English)" />
            <input
              value={titleEn}
              onChange={e => { setTitleEn(e.target.value); if (!slugTouched) setSlug(toSlug(e.target.value)); }}
              placeholder="e.g. Expert Preterm Parent Training — Application"
              className={inp}
              style={font}
            />
          </div>
          <div><Lbl t="Title (Kinyarwanda)" /><input value={titleRw} onChange={e => setTitleRw(e.target.value)} className={inp} style={font} /></div>
        </div>
        <div className="mt-3"><Lbl t="Slug" /><input value={slug} onChange={e => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="auto-generated-from-title" className={inp + ' font-mono'} style={font} /><p className="text-[10px] text-[#94A3B8] mt-1" style={font}>Public URL: /forms/{slug || '...'}</p></div>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div><Lbl t="Description (English)" /><textarea rows={2} value={descEn} onChange={e => setDescEn(e.target.value)} className={ta} style={font} /></div>
          <div><Lbl t="Description (Kinyarwanda)" /><textarea rows={2} value={descRw} onChange={e => setDescRw(e.target.value)} className={ta} style={font} /></div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-[#0f172a]" style={font}>Questions</h3>
          <button type="button" onClick={addQuestion} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold hover:bg-slate-200 transition-colors" style={font}><Plus className="w-3.5 h-3.5" /> Add Question</button>
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionEditor
              key={i}
              q={q}
              index={i}
              total={questions.length}
              onChange={patch => updateQuestion(i, patch)}
              onRemove={() => removeQuestion(i)}
              onMove={dir => moveQuestion(i, dir)}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-[12px] text-red-500" style={font}>{error}</p>}

      <div className="flex gap-2 justify-end pt-1 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-[#64748B] hover:bg-slate-50 transition-colors" style={font}>Cancel</button>
        <button type="button" onClick={save} disabled={saving || !isValid} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white text-[12px] font-bold disabled:opacity-50 shadow-sm hover:shadow-md transition-all" style={font}>{saving ? 'Creating…' : 'Create Form'}</button>
      </div>
    </div>
  );
}

// ── Form detail (responses) ──────────────────────────────────────────────────
function FormDetail({ form, onBack }: { form: FormRow; onBack: () => void }) {
  const [currentForm, setCurrentForm] = useState(form);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: qData }, { data: rData }] = await Promise.all([
      supabase.from('form_questions').select('*').eq('form_id', currentForm.id).order('position'),
      supabase.from('form_responses').select('*').eq('form_id', currentForm.id).is('deleted_at', null).order('created_at', { ascending: false }),
    ]);
    setQuestions(qData ?? []);
    setResponses(rData ?? []);
    setLoading(false);
  }, [currentForm.id]);
  useEffect(() => { load(); }, [load]);

  const toggleStatus = async () => {
    setToggling(true);
    const next = currentForm.status === 'open' ? 'closed' : 'open';
    const { error } = await supabase.from('forms').update({ status: next }).eq('id', currentForm.id);
    if (!error) setCurrentForm(f => ({ ...f, status: next }));
    setToggling(false);
  };

  const doDelete = async () => {
    if (!deleteId) return;
    await supabase.from('form_responses').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
    setDeleteId(null);
    load();
  };

  const filtered = responses.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return Object.values(r.answers).some(v => String(v ?? '').toLowerCase().includes(q));
  });

  const exportCsv = () => {
    const header = ['Submitted At', ...questions.map(q => q.label_en)];
    const rows = [header, ...filtered.map(r => [fmtDateTime(r.created_at), ...questions.map(q => r.answers[q.id] ?? '')])];
    const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentForm.slug}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SubPage title={currentForm.title_en} onBack={onBack}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={currentForm.status} />
          <span className="text-[11px] text-[#64748B]" style={font}>{responses.length} response{responses.length === 1 ? '' : 's'}</span>
          <a href={`/forms/${currentForm.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-semibold text-[#0A6070] hover:underline" style={font}><ExternalLink className="w-3 h-3" /> View live form</a>
        </div>
        <button
          onClick={toggleStatus}
          disabled={toggling}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors disabled:opacity-50 ${currentForm.status === 'open' ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
          style={font}
        >
          {currentForm.status === 'open' ? <><Lock className="w-3.5 h-3.5" /> Close form</> : <><Unlock className="w-3.5 h-3.5" /> Reopen form</>}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search responses..." />
        <button onClick={exportCsv} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors" style={font}><Download className="w-3.5 h-3.5" /> Export CSV</button>
      </div>

      {loading ? (
        <p className="text-[12px] text-[#94A3B8] text-center py-8" style={font}>Loading...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} message={responses.length === 0 ? 'No responses yet.' : 'No responses match your search.'} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/60">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest whitespace-nowrap" style={font}>Submitted</th>
                {questions.map(q => (
                  <th key={q.id} className="text-left px-4 py-2.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest whitespace-nowrap" style={font}>{q.label_en}</th>
                ))}
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-4 py-3 text-[11px] text-[#64748B] whitespace-nowrap" style={font}>{fmtDateTime(r.created_at)}</td>
                  {questions.map(q => (
                    <td key={q.id} className="px-4 py-3 text-[12px] text-[#1e293b] max-w-[220px] truncate" style={font}>{r.answers[q.id] ?? '—'}</td>
                  ))}
                  <td className="px-4 py-3">
                    <button onClick={() => setDeleteId(r.id)} title="Delete response" className="flex items-center gap-1 px-2 py-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteId && <ConfirmDialog message="Move this response to Trash? You can restore it later." onConfirm={doDelete} onCancel={() => setDeleteId(null)} confirmLabel="Move to Trash" />}
    </SubPage>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export default function FormsManager() {
  const [forms, setForms] = useState<FormRow[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<FormRow | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('forms').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    setForms(data ?? []);
    const { data: respData } = await supabase.from('form_responses').select('form_id').is('deleted_at', null);
    const counts: Record<string, number> = {};
    (respData ?? []).forEach((r: { form_id: string }) => { counts[r.form_id] = (counts[r.form_id] ?? 0) + 1; });
    setResponseCounts(counts);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (selectedForm) {
    return <FormDetail form={selectedForm} onBack={() => { setSelectedForm(null); load(); }} />;
  }

  return (
    <div>
      <PageHeader
        title="Forms"
        subtitle="Create and manage custom public forms, and view submitted responses."
        action={!showBuilder && <AddButton onClick={() => setShowBuilder(true)} label="New Form" />}
      />

      {showBuilder && <NewFormBuilder onCancel={() => setShowBuilder(false)} onCreated={() => { setShowBuilder(false); load(); }} />}

      {!showBuilder && (
        loading ? (
          <p className="text-[12px] text-[#94A3B8] text-center py-8" style={font}>Loading...</p>
        ) : forms.length === 0 ? (
          <EmptyState icon={ClipboardList} message="No forms yet. Create your first one above." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {forms.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedForm(f)}
                className="text-left bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-[14px] font-bold text-[#1e293b] leading-snug" style={serif}>{f.title_en}</h3>
                  <StatusBadge status={f.status} />
                </div>
                <p className="text-[11px] text-[#64748B]" style={font}>
                  {responseCounts[f.id] ?? 0} response{(responseCounts[f.id] ?? 0) === 1 ? '' : 's'} · Created {fmtDate(f.created_at)}
                </p>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
