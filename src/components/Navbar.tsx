import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, Globe, Heart, Users, ArrowRight, HeartHandshake, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { Language } from '../translations';
import JoinModal from './JoinModal';

const langOptions: { code: Language; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'kw', label: 'Ikinyarwanda', short: 'KW' },
];

interface DropdownChild {
  label: string;
  path: string;
  hash: string;
  desc?: string;
}

interface NavItemDef {
  label: string;
  path: string;
  children?: DropdownChild[];
  dropdownHeader?: string;
  dropdownDesc?: string;
  dropdownIcon?: React.ComponentType<{ className?: string }>;
  dropdownColor?: string;
}

const getNavItems = (t: (k: string) => string): NavItemDef[] => [
  { label: t('nav.home'), path: '/' },
  {
    label: t('nav.about'),
    path: '/about',
    dropdownHeader: t('nav.about.header'),
    dropdownDesc: t('nav.about.headerdesc'),
    dropdownIcon: Users,
    dropdownColor: 'from-teal-50 to-cyan-50',
    children: [
      { label: t('nav.about.story'), path: '/about', hash: 'story', desc: t('nav.about.story.desc') },
      { label: t('nav.about.mission'), path: '/about', hash: 'mission', desc: t('nav.about.mission.desc') },
      { label: t('nav.about.team'), path: '/about', hash: 'team', desc: t('nav.about.team.desc') },
      { label: t('nav.about.partners'), path: '/about', hash: 'partners', desc: t('nav.about.partners.desc') },
    ],
  },
  {
    label: t('nav.support'),
    path: '/support',
    dropdownHeader: t('nav.support.header'),
    dropdownDesc: t('nav.support.headerdesc'),
    dropdownIcon: Heart,
    dropdownColor: 'from-rose-50 to-pink-50',
    children: [
      { label: t('nav.support.parents'), path: '/support', hash: 'parents', desc: t('nav.support.parents.desc') },
      { label: t('nav.support.fathers'), path: '/support', hash: 'fathers', desc: t('nav.support.fathers.desc') },
      { label: t('nav.support.peer'), path: '/support', hash: 'peer', desc: t('nav.support.peer.desc') },
      { label: t('nav.support.bereavement'), path: '/support', hash: 'bereavement', desc: t('nav.support.bereavement.desc') },
      { label: t('nav.support.request'), path: '/support', hash: 'request', desc: t('nav.support.request.desc') },
    ],
  },
  { label: t('nav.programs'), path: '/programs' },
  { label: t('nav.education'), path: '/prematurity' },
  {
    label: t('nav.involved'),
    path: '/get-involved',
    dropdownHeader: t('nav.involved.header'),
    dropdownDesc: t('nav.involved.headerdesc'),
    dropdownIcon: HeartHandshake,
    dropdownColor: 'from-emerald-50 to-teal-50',
    children: [
      { label: t('nav.involved.volunteer'), path: '/get-involved', hash: 'volunteer', desc: t('nav.involved.volunteer.desc') },
      { label: t('nav.involved.fundraise'), path: '/get-involved', hash: 'fundraise', desc: t('nav.involved.fundraise.desc') },
      { label: t('nav.involved.partner'), path: '/get-involved', hash: 'partner', desc: t('nav.involved.partner.desc') },
    ],
  },
  { label: t('nav.news'), path: '/publications' },
  { label: t('nav.contact'), path: '/contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearch, setMobileSearch] = useState('');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { settings } = useSiteSettings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeAll = useCallback(() => {
    setActiveDropdown(null);
    setLangOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeAll]);

  useEffect(() => {
    setIsOpen(false);
    setActiveDropdown(null);
    setMobileExpanded(null);
  }, [location.pathname]);

  const toggleDropdown = (name: string) => {
    setLangOpen(false);
    setActiveDropdown(prev => prev === name ? null : name);
  };

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  }

  function handleMobileSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mobileSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(mobileSearch.trim())}`);
      setMobileSearch('');
      setIsOpen(false);
    }
  }

  const handleNavChildClick = (child: DropdownChild) => {
    setActiveDropdown(null);
    setIsOpen(false);
    if (location.pathname === child.path) {
      const el = document.getElementById(child.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(child.path);
      setTimeout(() => {
        const el = document.getElementById(child.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  };

  const navItems = getNavItems((k: string) => t(k as any));
  if (settings.careers_page_enabled) {
    navItems.splice(navItems.length - 1, 0, { label: t('nav.careers'), path: '/careers' });
  }
  const currentLang = langOptions.find(l => l.code === language)!;

  return (
    <>
      <div ref={navRef} className="fixed top-0 left-0 right-0 z-50">

        {/* ── Top Bar ─────────────────────────────────────────────────────── */}
        <div className={`bg-white border-b border-[#E8EFF2] transition-all duration-300 overflow-hidden ${scrolled ? 'max-h-0 border-transparent' : 'max-h-[80px]'}`}>
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-[68px] gap-4">

              {/* Logo */}
              <Link
                to="/"
                className="flex-shrink-0"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <img
                  src="https://res.cloudinary.com/dyqitacqz/image/upload/v1779117338/Horizontal_Voice_Of_Preemies_svmz0n.png"
                  alt="Voice of Preemies Rwanda"
                  className="h-10 w-auto"
                />
              </Link>

              {/* Search bar — desktop */}
              <form
                onSubmit={handleSearchSubmit}
                className="hidden xl:flex flex-1 max-w-md relative"
              >
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0B4BC] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search programs, support, resources…"
                  className="w-full pl-10 pr-24 py-2.5 rounded-full border border-[#E0E9ED] bg-[#F5F8FA] text-sm text-[#1A2B35] placeholder:text-[#A0B4BC] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 focus:bg-white transition-all"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                />
                {searchQuery && (
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#0A6070] text-white text-[11px] font-bold rounded-full hover:bg-[#084F5C] transition-colors"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    Search
                  </button>
                )}
              </form>

              {/* Join Peer Support Network — desktop */}
              <button
                onClick={() => setJoinModalOpen(true)}
                className="hidden xl:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0A6070] text-white text-[13px] font-bold hover:bg-[#084F5C] transition-all duration-200 shadow-sm whitespace-nowrap flex-shrink-0"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                <Users className="w-3.5 h-3.5" />
                Join Voice of Preemies
              </button>

              {/* Mobile: Join button + hamburger */}
              <div className="xl:hidden flex items-center gap-2">
                <button
                  onClick={() => setJoinModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#0A6070] text-white text-[12px] font-bold whitespace-nowrap hover:bg-[#084F5C] transition-colors"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Join Voice of Preemies</span>
                  <span className="sm:hidden">Join</span>
                </button>
                <button
                  onClick={() => setIsOpen(p => !p)}
                  className="p-2 rounded-lg text-[#1A2B35] hover:bg-[#F5F8FA] transition-colors"
                  aria-label="Toggle menu"
                >
                  {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile / Tablet sticky Join bar (always visible on scroll) ── */}
        <div className={`xl:hidden bg-[#0A6070] transition-all duration-300 overflow-hidden ${scrolled ? 'max-h-[52px]' : 'max-h-0'}`}>
          <div className="px-4 sm:px-6 flex items-center justify-between h-[52px] gap-3">
            <Link
              to="/"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex-shrink-0"
            >
              <img
                src="https://res.cloudinary.com/dyqitacqz/image/upload/v1779117338/Horizontal_Voice_Of_Preemies_svmz0n.png"
                alt="Voice of Preemies"
                className="h-7 w-auto brightness-0 invert"
              />
            </Link>
            <button
              onClick={() => { setJoinModalOpen(true); setIsOpen(false); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#0A6070] text-[12px] font-bold whitespace-nowrap hover:bg-[#EDF5F7] transition-colors flex-shrink-0"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              <Users className="w-3.5 h-3.5" />
              Join Voice of Preemies
            </button>
            <button
              onClick={() => setIsOpen(p => !p)}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Main Nav Bar ──────────────────────────────────────────────── */}
        <div className="hidden xl:block bg-[#F5F8FA] border-b border-[#DDE8EC] shadow-[0_2px_8px_rgba(10,96,112,0.06)]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-12">

              {/* Nav links */}
              <div className="flex items-center gap-0.5">
                {navItems.map((item) => (
                  <div key={item.path + item.label} className="relative">
                    {item.children ? (
                      <button
                        onClick={() => toggleDropdown(item.label)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-medium tracking-tight transition-colors duration-150 whitespace-nowrap ${
                          activeDropdown === item.label
                            ? 'text-[#0A6070] bg-[#0A6070]/8'
                            : location.pathname === item.path
                              ? 'text-[#0A6070]'
                              : 'text-[#1A2B35] hover:text-[#0A6070] hover:bg-[#0A6070]/5'
                        }`}
                        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                      >
                        {item.label}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === item.label ? 'rotate-180' : ''}`} />
                      </button>
                    ) : (
                      <Link
                        to={item.path}
                        onClick={() => { setActiveDropdown(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`flex items-center px-3 py-2 rounded-lg text-[13px] font-medium tracking-tight transition-colors duration-150 whitespace-nowrap ${
                          location.pathname === item.path
                            ? 'text-[#0A6070]'
                            : 'text-[#1A2B35] hover:text-[#0A6070] hover:bg-[#0A6070]/5'
                        }`}
                        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                      >
                        {item.label}
                      </Link>
                    )}

                    {/* Rich Dropdown Panel */}
                    {item.children && (
                      <div
                        className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 transition-all duration-200 origin-top ${
                          activeDropdown === item.label
                            ? 'opacity-100 scale-100 pointer-events-auto'
                            : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                        style={{ width: item.children.length > 4 ? '480px' : '380px' }}
                      >
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100/80 rotate-45 z-10" />
                        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100/80 overflow-hidden">
                          <div className={`bg-gradient-to-br ${item.dropdownColor ?? 'from-gray-50 to-slate-50'} px-5 py-4 border-b border-gray-100/60`}>
                            <div className="flex items-center gap-3">
                              {item.dropdownIcon && (
                                <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                                  <item.dropdownIcon className="w-4.5 h-4.5 text-[#0A6070]" />
                                </div>
                              )}
                              <div>
                                <p className="text-[13px] font-bold text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.dropdownHeader}</p>
                                <p className="text-[11px] text-[#5A7280] mt-0.5 leading-snug" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.dropdownDesc}</p>
                              </div>
                            </div>
                          </div>
                          <div className={`p-2 ${item.children.length > 4 ? 'grid grid-cols-2 gap-0.5' : ''}`}>
                            {item.children.map((child) => (
                              <button
                                key={child.hash}
                                onClick={() => handleNavChildClick(child)}
                                className="group w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#0A6070]/5 transition-all duration-150 flex items-start gap-3"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-[#0A6070]/30 mt-[7px] flex-shrink-0 group-hover:bg-[#0A6070] transition-colors" />
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-[#1A2B35] group-hover:text-[#0A6070] transition-colors leading-snug" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{child.label}</p>
                                  {child.desc && <p className="text-[11px] text-[#5A7280] mt-0.5 leading-snug" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{child.desc}</p>}
                                </div>
                              </button>
                            ))}
                          </div>
                          <div className="px-4 py-3 border-t border-gray-100/60 bg-gray-50/50">
                            <Link
                              to={item.path}
                              onClick={() => { setActiveDropdown(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0A6070] hover:gap-2.5 transition-all"
                              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                            >
                              {t('nav.viewfull')}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Right: language + donate */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => { setActiveDropdown(null); setLangOpen(p => !p); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors border ${
                      langOpen
                        ? 'border-[#0A6070] text-[#0A6070] bg-[#0A6070]/5'
                        : 'border-[#D8E4E8] text-[#5A7280] hover:border-[#0A6070] hover:text-[#0A6070]'
                    }`}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {currentLang.short}
                    <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`absolute top-full right-0 mt-2 transition-all duration-200 origin-top-right ${langOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 min-w-[160px] overflow-hidden">
                      {langOptions.map((opt) => (
                        <button
                          key={opt.code}
                          onClick={() => { setLanguage(opt.code); setLangOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center justify-between ${
                            language === opt.code
                              ? 'text-[#0A6070] bg-[#0A6070]/8 font-semibold'
                              : 'text-[#1A2B35] hover:text-[#0A6070] hover:bg-[#0A6070]/5'
                          }`}
                          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                        >
                          {opt.label}
                          <span className="text-[11px] opacity-60 font-normal">{opt.short}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  to="/donate#choose"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-bold bg-[#0A6070] text-white hover:bg-[#084F5C] shadow-sm transition-all duration-200"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  {t('nav.donate')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile Menu ───────────────────────────────────────────────── */}
        <div className={`xl:hidden bg-white border-t border-[#E8EFF2] overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[92vh] overflow-y-auto' : 'max-h-0'}`}>
          <div className="px-4 pt-4 pb-2">
            {/* Mobile search */}
            <form onSubmit={handleMobileSearchSubmit} className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0B4BC] pointer-events-none" />
              <input
                type="text"
                value={mobileSearch}
                onChange={e => setMobileSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[#E0E9ED] bg-[#F5F8FA] text-sm text-[#1A2B35] placeholder:text-[#A0B4BC] focus:outline-none focus:border-[#0A6070] focus:bg-white transition-all"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              />
            </form>
            {/* Join peer support */}
            <button
              onClick={() => { setJoinModalOpen(true); setIsOpen(false); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 rounded-full bg-[#0A6070] text-white text-sm font-bold hover:bg-[#084F5C] transition-colors"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              <Users className="w-4 h-4" />
              Join Voice of Preemies
            </button>
          </div>

          <div className="px-4 pb-4 space-y-0.5">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => setMobileExpanded(p => p === item.label ? null : item.label)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-[#1A2B35] hover:text-[#0A6070] hover:bg-[#0A6070]/5 rounded-xl transition-colors"
                      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                      {item.label}
                      <ChevronDown className={`w-4 h-4 text-[#A0B4BC] transition-transform ${mobileExpanded === item.label ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-200 ${mobileExpanded === item.label ? 'max-h-96' : 'max-h-0'}`}>
                      <div className="ml-3 mt-0.5 mb-1 pl-3 border-l-2 border-[#0A6070]/20 space-y-0.5">
                        {item.children.map((child) => (
                          <button
                            key={child.hash}
                            onClick={() => handleNavChildClick(child)}
                            className="w-full text-left px-3 py-2 text-[13px] text-[#5A7280] hover:text-[#0A6070] hover:bg-[#0A6070]/5 rounded-lg transition-colors"
                            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                          >
                            {child.label}
                          </button>
                        ))}
                        <Link
                          to={item.path}
                          onClick={() => { setIsOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#0A6070] hover:bg-[#0A6070]/5 rounded-lg transition-colors"
                          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                        >
                          {t('nav.viewfull')} <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </>
                ) : (
                  <Link
                    to={item.path}
                    onClick={() => { setIsOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`block px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                      location.pathname === item.path
                        ? 'text-[#0A6070] bg-[#0A6070]/8'
                        : 'text-[#1A2B35] hover:text-[#0A6070] hover:bg-[#0A6070]/5'
                    }`}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}

            <div className="pt-3 border-t border-gray-100 mt-2">
              <p className="text-[11px] font-bold text-[#A0B4BC] uppercase tracking-widest px-3 mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Language</p>
              <div className="flex gap-2 px-3">
                {langOptions.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => setLanguage(opt.code)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors ${
                      language === opt.code
                        ? 'bg-[#0A6070] text-white border-[#0A6070]'
                        : 'border-[#D8E4E8] text-[#5A7280] hover:border-[#0A6070] hover:text-[#0A6070]'
                    }`}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 mt-2">
              <Link
                to="/donate#choose"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center py-3 bg-[#0A6070] text-white rounded-full text-sm font-bold hover:bg-[#084F5C] transition-colors"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {t('nav.donate')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <JoinModal open={joinModalOpen} onClose={() => setJoinModalOpen(false)} />
    </>
  );
}
