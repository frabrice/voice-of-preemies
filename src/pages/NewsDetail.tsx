import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Calendar, Heart, Tag as TagIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tag: string;
  date: string;
  image_url: string;
  gallery_urls: string[];
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  Event: { bg: 'bg-[#0A6070]/10', text: 'text-[#0A6070]' },
  Partnership: { bg: 'bg-[#2D8A5F]/10', text: 'text-[#2D8A5F]' },
  Story: { bg: 'bg-[#E8A020]/10', text: 'text-[#E8A020]' },
  Research: { bg: 'bg-[#5A7280]/10', text: 'text-[#5A7280]' },
  Education: { bg: 'bg-[#1AADA0]/10', text: 'text-[#1AADA0]' },
  Advocacy: { bg: 'bg-[#E8644A]/10', text: 'text-[#E8644A]' },
};
const DEFAULT_TAG = { bg: 'bg-[#5A7280]/10', text: 'text-[#5A7280]' };

export default function NewsDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    window.scrollTo(0, 0);

    supabase
      .from('news_articles')
      .select('id, slug, title, excerpt, content, tag, date, image_url, gallery_urls')
      .eq('slug', slug)
      .eq('published', true)
      .is('deleted_at', null)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          navigate('/publications', { replace: true });
          return;
        }
        setArticle(data);
        setLoading(false);

        supabase
          .from('news_articles')
          .select('id, slug, title, excerpt, content, tag, date, image_url, gallery_urls')
          .eq('published', true)
          .is('deleted_at', null)
          .neq('slug', slug)
          .order('date', { ascending: false })
          .limit(3)
          .then(({ data: rel }) => setRelated(rel ?? []));
      });
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="page-enter min-h-screen flex items-center justify-center bg-[#FBF8F3]">
        <Loader2 className="w-8 h-8 text-[#0A6070] animate-spin" />
      </div>
    );
  }

  if (!article) return null;

  const tc = TAG_COLORS[article.tag] ?? DEFAULT_TAG;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="page-enter">
      {/* Hero with Image */}
      <section className="relative h-[380px] md:h-[440px] overflow-hidden">
        {article.image_url ? (
          <img src={article.image_url} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 hero-gradient" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        <div className="relative h-full flex flex-col justify-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <Link
            to="/publications"
            className="absolute top-28 left-4 sm:left-6 lg:left-8 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-md text-white text-xs font-semibold rounded-lg hover:bg-white/25 transition-colors"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t('pub.title')}
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 backdrop-blur-sm text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {article.tag}
            </span>
            <span className="flex items-center gap-1.5 text-white/80 text-xs" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <Calendar className="w-3.5 h-3.5" /> {fmtDate(article.date)}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-3 max-w-4xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {article.title}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="bg-[#FBF8F3] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              {article.excerpt && (
                <p className="text-xl text-[#1A2B35] leading-relaxed mb-8 italic" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {article.excerpt}
                </p>
              )}
              <div className="mb-10">
                <p className="text-[#1A2B35] text-base leading-[1.8] whitespace-pre-line" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {article.content}
                </p>
              </div>

              {article.gallery_urls?.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-lg font-semibold text-[#1A2B35] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Gallery</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {article.gallery_urls.map((url, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden">
                        <img src={url} alt={`${article.title} — photo ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                <div className="bg-white rounded-2xl border border-[#E8F0F2] shadow-sm overflow-hidden">
                  <div className={`px-6 py-4 border-b border-[#E8F0F2] ${tc.bg}`}>
                    <div className="flex items-center gap-2">
                      <TagIcon className={`w-5 h-5 ${tc.text}`} />
                      <h3 className={`text-sm font-bold ${tc.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Article Info</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Published</p>
                        <p className="text-xs text-[#1A2B35] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fmtDate(article.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <TagIcon className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Category</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${tc.bg} ${tc.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{article.tag}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FBF8F3] rounded-2xl border border-[#E8F0F2] p-6 text-center">
                  <Heart className="w-8 h-8 text-[#E8644A] mx-auto mb-3" />
                  <p className="text-xs text-[#5A7280] mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Questions about this story?</p>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A6070] text-white text-xs font-bold rounded-xl hover:bg-[#084F5C] transition-colors w-full justify-center"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    Get in Touch <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related News */}
      {related.length > 0 && (
        <section className="py-16 bg-white border-t border-[#E8F0F2]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold text-[#1A2B35] mb-8" style={{ fontFamily: 'Cormorant Garamond, serif' }}>More News</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map((rel) => {
                const rtc = TAG_COLORS[rel.tag] ?? DEFAULT_TAG;
                return (
                  <Link
                    key={rel.id}
                    to={`/news/${rel.slug}`}
                    className="group bg-[#FBF8F3] rounded-2xl overflow-hidden border border-[#E8F0F2] hover:shadow-lg transition-all duration-300"
                  >
                    <div className="relative h-44 overflow-hidden">
                      {rel.image_url ? (
                        <img src={rel.image_url} alt={rel.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-[#D8E4E8]/40 flex items-center justify-center">
                          <TagIcon className="w-10 h-10 text-[#D8E4E8]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold ${rtc.text}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{rel.tag}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-[#1A2B35] mb-1 group-hover:text-[#0A6070] transition-colors" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{rel.title}</h3>
                      <p className="text-xs text-[#5A7280] line-clamp-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{rel.excerpt}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
