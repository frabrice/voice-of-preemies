import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, ArrowRight, BookOpen, Heart, Users, Building2, Globe, FileText, Headphones } from 'lucide-react';

interface SearchItem {
  title: string;
  description: string;
  path: string;
  hash?: string;
  category: string;
  categoryColor: string;
  categoryIcon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

const ALL_ITEMS: SearchItem[] = [
  // Programs
  { title: 'Family Support Program', description: 'Emotional and practical support for families of premature babies throughout the NICU journey and beyond.', path: '/programs', hash: 'family-support', category: 'Programs', categoryColor: 'bg-rose-50 text-rose-700', categoryIcon: Heart, keywords: ['family', 'support', 'emotional', 'practical', 'nicu', 'parents'] },
  { title: 'Education & Awareness', description: 'Evidence-based information and workshops on prematurity, neonatal care, and infant development.', path: '/programs', hash: 'education', category: 'Programs', categoryColor: 'bg-teal-50 text-teal-700', categoryIcon: BookOpen, keywords: ['education', 'awareness', 'workshops', 'learning', 'prematurity', 'neonatal', 'development'] },
  { title: 'Peer Support Network', description: 'Connect with trained peer parent mentors who have been through the preterm birth journey.', path: '/programs', hash: 'peer-network', category: 'Programs', categoryColor: 'bg-emerald-50 text-emerald-700', categoryIcon: Users, keywords: ['peer', 'support', 'network', 'mentors', 'connect', 'parents', 'community'] },
  { title: 'Hospital Partnerships', description: 'Working alongside NICUs and maternity hospitals to strengthen family-centered neonatal care in Rwanda.', path: '/programs', hash: 'hospitals', category: 'Programs', categoryColor: 'bg-amber-50 text-amber-700', categoryIcon: Building2, keywords: ['hospital', 'nicu', 'partnership', 'maternity', 'rwanda', 'neonatal'] },
  { title: 'Advocacy & Campaigns', description: 'Raising awareness about preterm birth rates in Rwanda and advocating for improved maternal health policies.', path: '/programs', hash: 'advocacy', category: 'Programs', categoryColor: 'bg-blue-50 text-blue-700', categoryIcon: Globe, keywords: ['advocacy', 'campaign', 'awareness', 'policy', 'maternal', 'health'] },

  // Support
  { title: 'Support for Parents', description: 'Comprehensive emotional, psychological, and practical support for mothers and fathers of premature babies.', path: '/support', hash: 'parents', category: 'Support', categoryColor: 'bg-rose-50 text-rose-700', categoryIcon: Heart, keywords: ['support', 'parents', 'mothers', 'fathers', 'emotional', 'psychological'] },
  { title: 'Support for Fathers', description: 'Dedicated resources and support groups for fathers navigating the unique challenges of preterm parenthood.', path: '/support', hash: 'fathers', category: 'Support', categoryColor: 'bg-blue-50 text-blue-700', categoryIcon: Users, keywords: ['fathers', 'dads', 'support', 'men', 'paternal', 'preterm'] },
  { title: 'Peer Support Groups', description: 'Online and in-person groups where parents share experiences, find community, and heal together.', path: '/support', hash: 'peer', category: 'Support', categoryColor: 'bg-teal-50 text-teal-700', categoryIcon: Users, keywords: ['peer', 'group', 'community', 'healing', 'online', 'in-person', 'meetup'] },
  { title: 'Bereavement Support', description: 'Compassionate support for families who have experienced the loss of a premature baby.', path: '/support', hash: 'bereavement', category: 'Support', categoryColor: 'bg-gray-50 text-gray-700', categoryIcon: Heart, keywords: ['bereavement', 'grief', 'loss', 'baby', 'death', 'mourning', 'compassion'] },
  { title: 'Request Support', description: 'Submit a support request and our team will connect you with the right resources within 48 hours.', path: '/support', hash: 'request', category: 'Support', categoryColor: 'bg-orange-50 text-orange-700', categoryIcon: Headphones, keywords: ['request', 'help', 'contact', 'get support', 'connect'] },

  // About
  { title: 'Our Story', description: 'Founded in 2020 by Dr. Claudine Uwimana — a neonatologist and mother of a preemie — to fill the support gap in Rwanda\'s NICUs.', path: '/about', hash: 'story', category: 'About', categoryColor: 'bg-teal-50 text-teal-700', categoryIcon: BookOpen, keywords: ['story', 'founded', 'history', 'claudine', 'origin', 'neonatologist', '2020'] },
  { title: 'Mission & Vision', description: 'Our mission is to provide compassionate support, education, and community for families of premature babies in Rwanda.', path: '/about', hash: 'mission', category: 'About', categoryColor: 'bg-cyan-50 text-cyan-700', categoryIcon: Globe, keywords: ['mission', 'vision', 'values', 'compassion', 'community', 'purpose'] },
  { title: 'Our Team', description: 'Meet the dedicated team behind Voice of Preemies — healthcare professionals, social workers, and parent advocates.', path: '/about', hash: 'team', category: 'About', categoryColor: 'bg-emerald-50 text-emerald-700', categoryIcon: Users, keywords: ['team', 'staff', 'people', 'leadership', 'board', 'volunteers'] },
  { title: 'Partners & Supporters', description: 'We work with Rwanda\'s leading hospitals, NGOs, and international organizations to scale our impact.', path: '/about', hash: 'partners', category: 'About', categoryColor: 'bg-amber-50 text-amber-700', categoryIcon: Building2, keywords: ['partners', 'supporters', 'donors', 'hospitals', 'ngos', 'collaboration'] },

  // Publications & Resources
  { title: 'News & Events', description: 'Latest news, upcoming events, workshops, and campaign updates from Voice of Preemies Rwanda.', path: '/publications', category: 'Publications', categoryColor: 'bg-blue-50 text-blue-700', categoryIcon: FileText, keywords: ['news', 'events', 'updates', 'workshops', 'campaigns', 'publications', 'announcements'] },
  { title: 'Resources Library', description: 'Downloadable guides, videos, and educational materials for parents, healthcare professionals, and the community.', path: '/resources', category: 'Resources', categoryColor: 'bg-green-50 text-green-700', categoryIcon: BookOpen, keywords: ['resources', 'library', 'guides', 'videos', 'materials', 'download', 'education'] },

  // Prematurity info
  { title: 'What is Prematurity?', description: 'Understand what it means to have a premature baby — statistics, definitions, and what to expect.', path: '/prematurity', hash: 'what', category: 'Learn', categoryColor: 'bg-teal-50 text-teal-700', categoryIcon: BookOpen, keywords: ['prematurity', 'preterm', 'premature', 'what', 'definition', 'statistics'] },
  { title: 'NICU Journey', description: 'A guide to navigating the Neonatal Intensive Care Unit — what to expect and how to cope.', path: '/prematurity', hash: 'nicu', category: 'Learn', categoryColor: 'bg-rose-50 text-rose-700', categoryIcon: Heart, keywords: ['nicu', 'neonatal', 'intensive', 'care', 'unit', 'guide', 'hospital'] },
  { title: 'Kangaroo Mother Care', description: 'How skin-to-skin contact (KMC) improves outcomes for preterm babies and supports bonding.', path: '/prematurity', hash: 'kmc', category: 'Learn', categoryColor: 'bg-amber-50 text-amber-700', categoryIcon: Heart, keywords: ['kangaroo', 'mother', 'care', 'kmc', 'skin-to-skin', 'bonding', 'contact'] },
  { title: 'Grief & Loss', description: 'Resources and compassionate support for families who experience loss during the preterm journey.', path: '/prematurity', hash: 'grief', category: 'Learn', categoryColor: 'bg-gray-50 text-gray-700', categoryIcon: Heart, keywords: ['grief', 'loss', 'death', 'bereavement', 'mourning', 'support'] },

  // Get Involved
  { title: 'Volunteer', description: 'Join our team of dedicated volunteers — from peer mentors to event organizers and community ambassadors.', path: '/get-involved', hash: 'volunteer', category: 'Get Involved', categoryColor: 'bg-emerald-50 text-emerald-700', categoryIcon: Users, keywords: ['volunteer', 'help', 'give back', 'mentor', 'ambassador', 'community'] },
  { title: 'Fundraise for Us', description: 'Organize a fundraising campaign to support premature babies and their families in Rwanda.', path: '/get-involved', hash: 'fundraise', category: 'Get Involved', categoryColor: 'bg-amber-50 text-amber-700', categoryIcon: Heart, keywords: ['fundraise', 'fundraising', 'campaign', 'raise', 'money', 'charity'] },
  { title: 'Become a Partner', description: 'Corporate and institutional partners help us scale our programs and reach more families across Rwanda.', path: '/get-involved', hash: 'partner', category: 'Get Involved', categoryColor: 'bg-blue-50 text-blue-700', categoryIcon: Building2, keywords: ['partner', 'corporate', 'institutional', 'partnership', 'sponsor'] },

  // Contact & Donate
  { title: 'Donate', description: 'Support premature babies and their families in Rwanda with a one-time or monthly donation.', path: '/donate', category: 'Donate', categoryColor: 'bg-rose-50 text-rose-700', categoryIcon: Heart, keywords: ['donate', 'donation', 'give', 'money', 'fund', 'support', 'monthly', 'one-time'] },
  { title: 'Contact Us', description: 'Get in touch with the Voice of Preemies Rwanda team — we\'re happy to answer your questions.', path: '/contact', category: 'Contact', categoryColor: 'bg-teal-50 text-teal-700', categoryIcon: Headphones, keywords: ['contact', 'email', 'phone', 'reach', 'address', 'location', 'kigali'] },
  { title: 'For Healthcare Professionals', description: 'Resources, training, and collaboration opportunities for neonatologists, nurses, and maternity healthcare workers.', path: '/healthcare', category: 'Healthcare', categoryColor: 'bg-cyan-50 text-cyan-700', categoryIcon: Building2, keywords: ['healthcare', 'professionals', 'doctors', 'nurses', 'neonatologists', 'training', 'clinical'] },
];

function scoreItem(item: SearchItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const terms = q.split(/\s+/);
  let score = 0;
  for (const term of terms) {
    if (item.title.toLowerCase().includes(term)) score += 10;
    if (item.description.toLowerCase().includes(term)) score += 5;
    if (item.category.toLowerCase().includes(term)) score += 4;
    if (item.keywords.some(k => k.toLowerCase().includes(term))) score += 3;
  }
  return score;
}

const CATEGORIES_ORDER = ['Programs', 'Support', 'Learn', 'Get Involved', 'Resources', 'Publications', 'About', 'Donate', 'Healthcare', 'Contact'];

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputVal, setInputVal] = useState(searchParams.get('q') ?? '');
  const query = searchParams.get('q') ?? '';

  useEffect(() => {
    setInputVal(query);
  }, [query]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return ALL_ITEMS
      .map(item => ({ item, score: scoreItem(item, query) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.item);
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchItem[]>();
    for (const item of results) {
      const g = map.get(item.category) ?? [];
      g.push(item);
      map.set(item.category, g);
    }
    return CATEGORIES_ORDER.flatMap(cat => {
      const items = map.get(cat);
      if (!items) return [];
      return [{ category: cat, items }];
    });
  }, [results]);

  const SUGGESTIONS = ['peer support', 'NICU', 'bereavement', 'volunteer', 'donate', 'kangaroo care', 'resources'];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (inputVal.trim()) setSearchParams({ q: inputVal.trim() });
  }

  const headerHeight = 'pt-[120px]';

  return (
    <div className={`min-h-screen bg-[#F5F8FA] ${headerHeight}`}>
      {/* Search header */}
      <div className="bg-white border-b border-[#E8EFF2]">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1
            className="text-[28px] sm:text-[36px] font-light text-[#1A2B35] mb-1 leading-tight"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            {query ? <>Search results for <em className="font-semibold italic">"{query}"</em></> : 'Search'}
          </h1>
          {results.length > 0 && (
            <p className="text-sm text-[#5A7280] mb-5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </p>
          )}
          <form onSubmit={handleSearch} className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A7280]" />
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Search for support, programs, resources…"
              className="w-full pl-11 pr-14 py-3.5 border border-[#D8E4E8] rounded-xl text-sm text-[#1A2B35] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white placeholder:text-[#A0B4BC]"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#0A6070] text-white text-[12px] font-bold rounded-lg hover:bg-[#084F5C] transition-colors"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!query.trim() && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#0A6070]/10 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-[#0A6070]" />
            </div>
            <h2 className="text-[22px] font-semibold text-[#1A2B35] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              What are you looking for?
            </h2>
            <p className="text-sm text-[#5A7280] mb-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Try searching for support programs, resources, or information about prematurity.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setSearchParams({ q: s })}
                  className="px-3.5 py-1.5 rounded-full border border-[#D8E4E8] text-sm text-[#5A7280] hover:border-[#0A6070] hover:text-[#0A6070] hover:bg-[#0A6070]/5 transition-colors"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-[#A0B4BC]" />
            </div>
            <h2 className="text-[22px] font-semibold text-[#1A2B35] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              No results for "{query}"
            </h2>
            <p className="text-sm text-[#5A7280] mb-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Try different keywords, or explore one of these popular topics:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setSearchParams({ q: s })}
                  className="px-3.5 py-1.5 rounded-full border border-[#D8E4E8] text-sm text-[#5A7280] hover:border-[#0A6070] hover:text-[#0A6070] hover:bg-[#0A6070]/5 transition-colors"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {grouped.length > 0 && (
          <div className="space-y-10">
            {grouped.map(({ category, items }) => (
              <div key={category}>
                <h2
                  className="text-[13px] font-bold text-[#5A7280] uppercase tracking-widest mb-4 flex items-center gap-2"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  <span className="flex-1 h-px bg-[#E8EFF2]" />
                  {category}
                  <span className="flex-1 h-px bg-[#E8EFF2]" />
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {items.map(item => {
                    const Icon = item.categoryIcon;
                    const href = item.hash ? `${item.path}#${item.hash}` : item.path;
                    return (
                      <Link
                        key={item.title}
                        to={href}
                        className="group flex items-start gap-4 p-4 bg-white rounded-xl border border-[#E8EFF2] hover:border-[#0A6070]/30 hover:shadow-md transition-all duration-200"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.categoryColor.split(' ')[0]}`}>
                          <Icon className={`w-4 h-4 ${item.categoryColor.split(' ')[1]}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className="text-[14px] font-bold text-[#1A2B35] group-hover:text-[#0A6070] transition-colors leading-snug"
                              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                            >
                              {item.title}
                            </p>
                            <ArrowRight className="w-3.5 h-3.5 text-[#A0B4BC] group-hover:text-[#0A6070] flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <p
                            className="text-[12px] text-[#5A7280] mt-0.5 leading-relaxed line-clamp-2"
                            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                          >
                            {item.description}
                          </p>
                          <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${item.categoryColor}`}>
                            {item.category}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
