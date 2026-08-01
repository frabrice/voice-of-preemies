import { useState, useEffect } from 'react';
import { Download, Play, BookOpen, FileText, Film, Search, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  file_url: string;
  published: boolean;
  sort_order: number;
  file_size?: string;
  duration?: string;
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Video: Film,
  PDF: FileText,
  Book: BookOpen,
  Article: FileText,
  Link: FileText,
  Tool: FileText,
};

const ALL_FILTERS = ['All', 'Guides & Handbooks', 'Medical Info', 'Mental Health', 'Support Groups', 'Financial Aid', 'Nutrition', 'Education', 'Legal & Rights'];

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('resources')
      .select('id, title, description, category, type, file_url, published, sort_order, file_size, duration')
      .eq('published', true)
      .is('deleted_at', null)
      .order('sort_order')
      .then(({ data }) => { setResources(data ?? []); setLoading(false); });
  }, []);

  const filtered = resources.filter(r => {
    const matchFilter = activeFilter === 'All' || r.category === activeFilter;
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="pt-36 pb-20 hero-gradient relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label !text-[#F0A500] mb-4">Knowledge Hub</p>
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Resources Library
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Free, trusted resources for families and healthcare professionals — guides, videos,
            checklists, and more, in English, French, and Kinyarwanda.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 60 0 20L0 60Z" fill="#FBF8F3" />
          </svg>
        </div>
      </section>

      {/* Filters & search */}
      <section className="py-10 bg-[#FBF8F3] border-b border-[#D8E4E8] sticky top-16 lg:top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A7280]" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search resources..."
                className="w-full pl-10 pr-4 py-2.5 border border-[#D8E4E8] rounded-full text-sm bg-white focus:outline-none focus:border-[#0A6070] transition-colors"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {ALL_FILTERS.map(f => (
                <button
                  key={f} onClick={() => setActiveFilter(f)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeFilter === f ? 'bg-[#0A6070] text-white' : 'bg-white border border-[#D8E4E8] text-[#5A7280] hover:border-[#0A6070] hover:text-[#0A6070]'}`}
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Resources grid */}
      <section className="py-16 bg-[#FBF8F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#0A6070] animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-12 h-12 text-[#D8E4E8] mx-auto mb-4" />
              <p className="text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {resources.length === 0 ? 'No resources available yet.' : 'No resources match your search or filter.'}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(resource => {
                const Icon = TYPE_ICON[resource.type] ?? FileText;
                const isVideo = resource.type === 'Video';
                return (
                  <div key={resource.id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#0A6070]/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#0A6070]" />
                      </div>
                      <span className="px-2 py-0.5 bg-[#EDF5F7] text-[#0A6070] text-xs rounded-full" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {resource.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-[#1A2B35] mb-2 leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      {resource.title}
                    </h3>
                    <p className="text-xs text-[#5A7280] mb-4 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {resource.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {resource.type}
                        {resource.file_size ? ` · ${resource.file_size}` : ''}
                        {resource.duration ? ` · ${resource.duration}` : ''}
                      </div>
                      {(resource.file_url || (resource as any).url) ? (
                        <a
                          href={resource.file_url || (resource as any).url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${isVideo ? 'text-[#E8644A] hover:text-[#C94C33]' : 'text-[#0A6070] hover:text-[#064B58]'}`}
                          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                        >
                          {isVideo ? <><Play className="w-3.5 h-3.5" /> Watch</> : <><Download className="w-3.5 h-3.5" /> Download</>}
                        </a>
                      ) : (
                        <button
                          className={`flex items-center gap-1.5 text-xs font-semibold opacity-40 cursor-not-allowed ${isVideo ? 'text-[#E8644A]' : 'text-[#0A6070]'}`}
                          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                          disabled
                        >
                          {isVideo ? <><Play className="w-3.5 h-3.5" /> Watch</> : <><Download className="w-3.5 h-3.5" /> Download</>}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
