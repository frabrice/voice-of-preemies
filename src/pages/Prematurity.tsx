import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, BookOpen, Heart, ArrowRight, HelpCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { TranslationKey } from '../translations';

interface QAItem {
  q: TranslationKey;
  a: TranslationKey;
}

interface Category {
  id: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  accent: string;
  items: QAItem[];
}

const categories: Category[] = [
  {
    id: 'what',
    labelKey: 'prem.qa.cat1',
    icon: HelpCircle,
    color: 'from-rose-50 to-red-50',
    accent: '#E8644A',
    items: [
      { q: 'prem.qa.c1q1', a: 'prem.qa.c1a1' },
      { q: 'prem.qa.c1q2', a: 'prem.qa.c1a2' },
      { q: 'prem.qa.c1q3', a: 'prem.qa.c1a3' },
      { q: 'prem.qa.c1q4', a: 'prem.qa.c1a4' },
    ],
  },
  {
    id: 'causes',
    labelKey: 'prem.qa.cat2',
    icon: BookOpen,
    color: 'from-amber-50 to-yellow-50',
    accent: '#E8A020',
    items: [
      { q: 'prem.qa.c2q1', a: 'prem.qa.c2a1' },
      { q: 'prem.qa.c2q2', a: 'prem.qa.c2a2' },
      { q: 'prem.qa.c2q3', a: 'prem.qa.c2a3' },
    ],
  },
  {
    id: 'nicu',
    labelKey: 'prem.qa.cat3',
    icon: Heart,
    color: 'from-teal-50 to-cyan-50',
    accent: '#0A6070',
    items: [
      { q: 'prem.qa.c3q1', a: 'prem.qa.c3a1' },
      { q: 'prem.qa.c3q2', a: 'prem.qa.c3a2' },
      { q: 'prem.qa.c3q3', a: 'prem.qa.c3a3' },
    ],
  },
  {
    id: 'kmc',
    labelKey: 'prem.qa.cat4',
    icon: Heart,
    color: 'from-emerald-50 to-green-50',
    accent: '#2D8A5F',
    items: [
      { q: 'prem.qa.c4q1', a: 'prem.qa.c4a1' },
      { q: 'prem.qa.c4q2', a: 'prem.qa.c4a2' },
      { q: 'prem.qa.c4q3', a: 'prem.qa.c4a3' },
    ],
  },
  {
    id: 'development',
    labelKey: 'prem.qa.cat5',
    icon: BookOpen,
    color: 'from-sky-50 to-blue-50',
    accent: '#1E6FA8',
    items: [
      { q: 'prem.qa.c5q1', a: 'prem.qa.c5a1' },
      { q: 'prem.qa.c5q2', a: 'prem.qa.c5a2' },
      { q: 'prem.qa.c5q3', a: 'prem.qa.c5a3' },
    ],
  },
  {
    id: 'help',
    labelKey: 'prem.qa.cat6',
    icon: Heart,
    color: 'from-teal-50 to-cyan-50',
    accent: '#0A6070',
    items: [
      { q: 'prem.qa.c6q1', a: 'prem.qa.c6a1' },
      { q: 'prem.qa.c6q2', a: 'prem.qa.c6a2' },
      { q: 'prem.qa.c6q3', a: 'prem.qa.c6a3' },
    ],
  },
];

function AccordionItem({ q, a, accent }: { q: string; a: string; accent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#D8E4E8] rounded-2xl overflow-hidden transition-all duration-200 hover:border-[#A0B4BC]">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-start justify-between gap-4 px-6 py-5 text-left bg-white hover:bg-[#FBF8F3] transition-colors"
      >
        <span className="text-[15px] font-semibold text-[#1A2B35] leading-snug" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {q}
        </span>
        <ChevronDown
          className="w-5 h-5 flex-shrink-0 mt-0.5 transition-transform duration-300"
          style={{ color: accent, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open ? '800px' : '0px' }}>
        <div className="px-6 pb-6 text-[14px] text-[#5A7280] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', borderTop: `3px solid ${accent}20` }}>
          <div className="pt-4">{a}</div>
        </div>
      </div>
    </div>
  );
}

export default function Prematurity() {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('what');

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    setTimeout(() => {
      const el = document.getElementById(`cat-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="pt-36 pb-20 hero-gradient relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label !text-[#F0A500] mb-4">{t('prematurity.label')}</p>
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('prem.qa.title')}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('prem.qa.sub')}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 60 0 20L0 60Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      {/* Category nav pills */}
      <section className="sticky top-16 z-30 bg-white border-b border-[#D8E4E8] shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            {categories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-200"
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  background: activeCategory === cat.id ? cat.accent : 'transparent',
                  color: activeCategory === cat.id ? 'white' : '#5A7280',
                  border: `1.5px solid ${activeCategory === cat.id ? cat.accent : '#D8E4E8'}`,
                }}
              >
                <span className="text-[10px] font-bold opacity-60">0{i + 1}</span>
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Q&A sections */}
      <div>
        {categories.map((cat, i) => (
          <section
            key={cat.id}
            id={`cat-${cat.id}`}
            className="py-16 scroll-mt-32"
            style={{ background: i % 2 === 0 ? '#FBF8F3' : 'white' }}
          >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${cat.accent}15` }}>
                  <cat.icon className="w-6 h-6" style={{ color: cat.accent }} />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest mb-1 block" style={{ color: cat.accent, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    0{i + 1}
                  </span>
                  <h2 className="text-3xl font-light text-[#1A2B35]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    {t(cat.labelKey)}
                  </h2>
                </div>
              </div>
              <div className="space-y-3">
                {cat.items.map((item, j) => (
                  <AccordionItem key={j} q={t(item.q)} a={t(item.a)} accent={cat.accent} />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-3xl p-10 text-white" style={{ background: 'linear-gradient(135deg, #0A6070 0%, #1AADA0 100%)' }}>
              <Heart className="w-8 h-8 mb-4 opacity-80" />
              <h3 className="text-2xl font-semibold mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {t('prematurity.cta.support.title')}
              </h3>
              <p className="text-white/80 text-sm mb-6 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {t('prematurity.cta.support.sub')}
              </p>
              <Link
                to="/support"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0A6070] rounded-full text-sm font-bold hover:bg-white/95 transition-colors"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {t('btn.getSupport')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="rounded-3xl p-10" style={{ background: 'linear-gradient(135deg, #FBF8F3 0%, #F2EDE4 100%)', border: '2px solid #D8E4E8' }}>
              <BookOpen className="w-8 h-8 mb-4 text-[#E8A020]" />
              <h3 className="text-2xl font-semibold mb-3 text-[#1A2B35]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {t('prematurity.cta.guide.title')}
              </h3>
              <p className="text-[#5A7280] text-sm mb-6 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {t('prematurity.cta.guide.sub')}
              </p>
              <Link
                to="/resources"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#E8A020] text-white rounded-full text-sm font-bold hover:bg-[#D08A10] transition-colors"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {t('prematurity.cta.guide.btn')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
