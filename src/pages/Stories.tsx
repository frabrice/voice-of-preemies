import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Quote, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { TranslationKey } from '../translations';
import { supabase } from '../lib/supabase';

type QuoteDef = { quoteKey: TranslationKey; authorKey: TranslationKey };
const quoteDefs: QuoteDef[] = [
  { quoteKey: 'stories.q1', authorKey: 'stories.q1.author' },
  { quoteKey: 'stories.q2', authorKey: 'stories.q2.author' },
  { quoteKey: 'stories.q3', authorKey: 'stories.q3.author' },
];

interface Story {
  id: string;
  name: string;
  baby_info: string;
  tag: string;
  location: string;
  year: number;
  excerpt: string;
  full_story: string;
  image_url: string;
  published: boolean;
  featured: boolean;
}

const TAG_COLORS: Record<string, string> = {
  'Parent Story':     'bg-[#E8644A]/10 text-[#E8644A]',
  'Family Story':     'bg-[#0A6070]/10 text-[#0A6070]',
  "Father's Story":   'bg-[#E8A020]/10 text-[#E8A020]',
  'Healthcare Story': 'bg-[#2D8A5F]/10 text-[#2D8A5F]',
  'Grief Story':      'bg-[#5A7280]/10 text-[#5A7280]',
};
const DEFAULT_TAG_COLOR = 'bg-[#5A7280]/10 text-[#5A7280]';

export default function Stories() {
  const { t } = useLanguage();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('stories')
        .select('id, name, baby_info, tag, location, year, excerpt, full_story, image_url, published, featured')
        .eq('published', true)
        .is('deleted_at', null)
        .order('featured', { ascending: false })
        .order('year', { ascending: false });
      setStories(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="pt-36 pb-20 hero-gradient relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label !text-[#F0A500] mb-4">{t('stories.label')}</p>
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('stories.title')}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('stories.sub')}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 60 0 20L0 60Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      {/* Pull quotes */}
      <section className="py-12 bg-white border-b border-[#D8E4E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {quoteDefs.map((q, i) => (
              <div key={i} className="flex gap-4 p-6 bg-[#FBF8F3] rounded-2xl">
                <Quote className="w-8 h-8 text-[#E8644A] opacity-40 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-light text-[#1A2B35] mb-3 leading-relaxed" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    "{t(q.quoteKey)}"
                  </p>
                  <p className="text-xs text-[#5A7280] font-semibold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    — {t(q.authorKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stories */}
      <section className="py-20 bg-[#FBF8F3]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#0A6070] animate-spin" />
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="w-12 h-12 text-[#D8E4E8] mx-auto mb-4" />
              <p className="text-[#5A7280] text-lg" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No stories published yet.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {stories.map((story, i) => (
                <article key={story.id} className="bg-white rounded-3xl overflow-hidden shadow-sm">
                  <div className={`grid md:grid-cols-5 ${i % 2 !== 0 ? 'md:grid-flow-dense' : ''}`}>
                    <div className={`md:col-span-2 h-72 md:h-auto ${i % 2 !== 0 ? 'md:col-start-4' : ''}`}>
                      {story.image_url ? (
                        <img src={story.image_url} alt={story.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#D8E4E8]/40 flex items-center justify-center">
                          <Heart className="w-12 h-12 text-[#D8E4E8]" />
                        </div>
                      )}
                    </div>
                    <div className={`md:col-span-3 p-8 md:p-10 ${i % 2 !== 0 ? 'md:col-start-1 md:row-start-1' : ''}`}>
                      <div className="flex items-center gap-3 mb-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${TAG_COLORS[story.tag] ?? DEFAULT_TAG_COLOR}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {story.tag}
                        </span>
                        <span className="text-xs text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {story.location} · {story.year}
                        </span>
                      </div>
                      <h2 className="text-2xl font-semibold text-[#1A2B35] mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                        {story.name}
                      </h2>
                      {story.baby_info && (
                        <p className="text-sm text-[#E8644A] font-medium mb-5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {story.baby_info}
                        </p>
                      )}
                      {story.excerpt && (
                        <div className="relative mb-5">
                          <div className="quote-mark absolute -left-2 -top-4 text-[3rem]">"</div>
                          <p className="text-[#5A7280] text-sm leading-relaxed pl-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            {story.excerpt}
                          </p>
                        </div>
                      )}
                      {story.full_story && (
                        <div className="text-sm text-[#5A7280] leading-relaxed space-y-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {story.full_story.split('\n\n').map((para, j) => (
                            <p key={j}>{para}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Share your story CTA */}
      <section className="py-16 bg-[#0A6070]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Heart className="w-10 h-10 text-white/60 mx-auto mb-5 fill-white/20" />
          <h2 className="text-3xl font-light text-white mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {t('stories.share.title')}
          </h2>
          <p className="text-white/70 mb-8" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {t('stories.share.sub')}
          </p>
          <Link to="/contact" className="btn-white">
            {t('stories.share.cta')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
