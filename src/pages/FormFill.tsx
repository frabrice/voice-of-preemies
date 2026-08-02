import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

type QuestionType = 'short_text' | 'phone' | 'multiple_choice';
interface Option { en: string; rw: string; }
interface FormRow { id: string; slug: string; title_en: string; title_rw: string; description_en: string; description_rw: string; status: 'open' | 'closed'; }
interface QuestionRow { id: string; position: number; label_en: string; label_rw: string; type: QuestionType; options: Option[] | null; allow_other: boolean; required: boolean; }

const OTHER_VALUE = '__other__';
const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const serif = { fontFamily: 'Cormorant Garamond, serif' };
const inputClass = 'w-full px-4 py-4 text-[16px] border border-[#D8E4E8] rounded-2xl text-[#1A2B35] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white placeholder:text-[#A0B4BC]';

function bilingual(en: string, rw: string) {
  return rw && rw.trim() && rw.trim() !== en.trim() ? `${en} (${rw})` : en;
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[15px] font-semibold text-[#1A2B35]" style={font}>
        {label}{required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
          <p className="text-[13px] text-rose-600" style={font}>{error}</p>
        </div>
      )}
    </div>
  );
}

export default function FormFill() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!slug) return;
    window.scrollTo(0, 0);

    supabase
      .from('forms')
      .select('id, slug, title_en, title_rw, description_en, description_rw, status')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          navigate('/forms', { replace: true });
          return;
        }
        setForm(data);
        if (data.status === 'open') {
          supabase
            .from('form_questions')
            .select('id, position, label_en, label_rw, type, options, allow_other, required')
            .eq('form_id', data.id)
            .order('position')
            .then(({ data: qs }) => {
              setQuestions(qs ?? []);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
  }, [slug, navigate]);

  const errorFor = (q: QuestionRow): string => {
    if (!q.required || !touched[q.id]) return '';
    const value = answers[q.id];
    if (!value) return 'This field is required.';
    if (value === OTHER_VALUE && !otherText[q.id]?.trim()) return 'Please specify.';
    return '';
  };

  const isAnswered = (q: QuestionRow) => {
    if (!q.required) return true;
    const value = answers[q.id];
    if (!value) return false;
    if (value === OTHER_VALUE) return !!otherText[q.id]?.trim();
    return true;
  };

  const isValid = questions.every(isAnswered);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(Object.fromEntries(questions.map(q => [q.id, true])));
    if (!isValid || !form) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const finalAnswers: Record<string, string> = {};
      questions.forEach(q => {
        const value = answers[q.id];
        if (!value) return;
        finalAnswers[q.id] = value === OTHER_VALUE ? (otherText[q.id]?.trim() ?? '') : value;
      });

      const { error } = await supabase.from('form_responses').insert({ form_id: form.id, answers: finalAnswers });
      if (error) throw error;

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FBF8F3' }}>
        <Loader2 className="w-8 h-8 text-[#0A6070] animate-spin" />
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="min-h-screen bg-[#F5F8FA] flex flex-col">
      <header className="bg-white border-b border-[#E8EFF2] px-5 py-4 flex items-center gap-3">
        <Link to="/">
          <img
            src="https://res.cloudinary.com/dyqitacqz/image/upload/v1779117338/Horizontal_Voice_Of_Preemies_svmz0n.png"
            alt="Voice of Preemies Rwanda"
            className="h-8 w-auto"
          />
        </Link>
      </header>

      <div className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">
        {form.status === 'closed' ? (
          <div className="flex flex-col items-center text-center py-16">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
              <Lock className="w-10 h-10 text-[#94A3B8]" />
            </div>
            <h1 className="text-[28px] font-light text-[#1A2B35] mb-3 leading-tight" style={serif}>{form.title_en}</h1>
            <p className="text-[16px] text-[#5A7280] leading-relaxed max-w-xs" style={font}>
              This form is currently closed and no longer accepting responses. Please check back later.
            </p>
            <Link to="/forms" className="mt-8 text-sm font-semibold text-[#0A6070] hover:underline" style={font}>See other open forms</Link>
          </div>
        ) : submitted ? (
          <div className="flex flex-col items-center text-center py-12 animate-[fadeIn_0.4s_ease]">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-[28px] font-light text-[#1A2B35] mb-3 leading-tight" style={serif}>Thank you!</h1>
            <p className="text-[16px] text-[#5A7280] leading-relaxed max-w-xs" style={font}>
              Your response has been submitted. We appreciate you taking the time to fill this out.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-[30px] font-light text-[#1A2B35] leading-tight mb-2" style={serif}>{bilingual(form.title_en, form.title_rw)}</h1>
              {form.description_en && (
                <p className="text-[15px] text-[#5A7280] leading-relaxed" style={font}>{bilingual(form.description_en, form.description_rw)}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 pb-10">
              {questions.map(q => {
                const label = bilingual(q.label_en, q.label_rw);
                const error = errorFor(q);
                const value = answers[q.id] ?? '';

                if (q.type === 'multiple_choice') {
                  return (
                    <Field key={q.id} label={label} required={q.required} error={error}>
                      <div className="flex flex-col gap-2">
                        {(q.options ?? []).map((opt, i) => {
                          const active = value === opt.en;
                          return (
                            <label
                              key={i}
                              className={`flex items-center gap-3 px-4 py-3.5 border rounded-2xl cursor-pointer transition-all ${active ? 'border-[#0A6070] bg-[#F0F8FA]' : 'border-[#D8E4E8] bg-white hover:border-[#0A6070]/40'}`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                checked={active}
                                onChange={() => { setAnswers(a => ({ ...a, [q.id]: opt.en })); setTouched(t => ({ ...t, [q.id]: true })); }}
                                className="w-4 h-4 accent-[#0A6070] flex-shrink-0"
                              />
                              <span className="text-[15px] text-[#1A2B35]" style={font}>{bilingual(opt.en, opt.rw)}</span>
                            </label>
                          );
                        })}
                        {q.allow_other && (
                          <label className={`flex items-center gap-3 px-4 py-3.5 border rounded-2xl cursor-pointer transition-all ${value === OTHER_VALUE ? 'border-[#0A6070] bg-[#F0F8FA]' : 'border-[#D8E4E8] bg-white hover:border-[#0A6070]/40'}`}>
                            <input
                              type="radio"
                              name={q.id}
                              checked={value === OTHER_VALUE}
                              onChange={() => { setAnswers(a => ({ ...a, [q.id]: OTHER_VALUE })); setTouched(t => ({ ...t, [q.id]: true })); }}
                              className="w-4 h-4 accent-[#0A6070] flex-shrink-0"
                            />
                            <span className="text-[15px] text-[#1A2B35]" style={font}>Other (Ahandi)</span>
                          </label>
                        )}
                        {value === OTHER_VALUE && (
                          <input
                            type="text"
                            value={otherText[q.id] ?? ''}
                            onChange={e => setOtherText(t => ({ ...t, [q.id]: e.target.value }))}
                            onBlur={() => setTouched(t => ({ ...t, [q.id]: true }))}
                            placeholder="Please specify…"
                            className={inputClass}
                          />
                        )}
                      </div>
                    </Field>
                  );
                }

                return (
                  <Field key={q.id} label={label} required={q.required} error={error}>
                    <input
                      type={q.type === 'phone' ? 'tel' : 'text'}
                      inputMode={q.type === 'phone' ? 'tel' : undefined}
                      value={value}
                      onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                      onBlur={() => setTouched(t => ({ ...t, [q.id]: true }))}
                      placeholder={q.type === 'phone' ? 'e.g. 07XX XXX XXX' : undefined}
                      className={`${inputClass} ${error ? 'border-rose-400' : ''}`}
                    />
                  </Field>
                );
              })}

              {submitError && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                  <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[14px] text-rose-700" style={font}>{submitError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 flex items-center justify-center gap-2.5 bg-[#0A6070] text-white text-[17px] font-bold rounded-2xl hover:bg-[#084F5C] active:scale-[0.98] transition-all disabled:opacity-60 mt-2 shadow-md shadow-[#0A6070]/20"
                style={font}
              >
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</> : 'Submit'}
              </button>
            </form>
          </>
        )}
      </div>

      <footer className="px-5 py-5 text-center border-t border-[#E8EFF2] bg-white">
        <p className="text-[12px] text-[#A0B4BC]" style={font}>
          © {new Date().getFullYear()} Voice of Preemies Rwanda · All rights reserved
        </p>
      </footer>
    </div>
  );
}
