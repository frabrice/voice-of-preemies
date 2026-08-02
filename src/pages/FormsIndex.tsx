import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FormSummary {
  id: string;
  slug: string;
  title_en: string;
  description_en: string;
}

export default function FormsIndex() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    supabase
      .from('forms')
      .select('id, slug, title_en, description_en')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setForms(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FBF8F3' }}>
      <header className="bg-white border-b border-[#E8EFF2] px-5 py-4 flex items-center gap-3">
        <Link to="/">
          <img
            src="https://res.cloudinary.com/dyqitacqz/image/upload/v1779117338/Horizontal_Voice_Of_Preemies_svmz0n.png"
            alt="Voice of Preemies Rwanda"
            className="h-8 w-auto"
          />
        </Link>
      </header>

      <div className="flex-1 px-4 py-12 max-w-3xl mx-auto w-full">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#1AADA0] mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Open Forms</p>
          <h1 className="text-4xl md:text-5xl font-light text-[#1A2B35]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Forms & Applications</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#0A6070] animate-spin" />
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <ClipboardList className="w-10 h-10 text-[#D8E4E8] mx-auto mb-4" />
            <p className="text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>There are no open forms right now. Please check back later.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {forms.map(f => (
              <Link
                key={f.id}
                to={`/forms/${f.slug}`}
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex flex-col"
              >
                <h2 className="text-xl font-semibold text-[#1A2B35] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{f.title_en}</h2>
                {f.description_en && (
                  <p className="text-sm text-[#5A7280] leading-relaxed mb-4 flex-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{f.description_en}</p>
                )}
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0A6070] mt-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Fill this form <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="px-5 py-5 text-center border-t border-[#E8EFF2] bg-white">
        <p className="text-[12px] text-[#A0B4BC]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          © {new Date().getFullYear()} Voice of Preemies Rwanda · All rights reserved
        </p>
      </footer>
    </div>
  );
}
