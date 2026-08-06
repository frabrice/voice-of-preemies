import { useState } from 'react';
import { MessageCircle, Newspaper, BookOpen, HeartHandshake, FileText, Handshake, BarChart3, CalendarHeart } from 'lucide-react';
import TabBar from '../components/TabBar';
import NewsManager from './NewsManager';
import StoriesManager from './StoriesManager';
import ProgramsManager from './ProgramsManager';
import ResourcesManager from './ResourcesManager';
import PartnersManager from './PartnersManager';
import StatsManager from './StatsManager';
import PublicationsManager from './PublicationsManager';
import UpcomingManager from './UpcomingManager';

const tabs = [
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'stories', label: 'Stories', icon: BookOpen },
  { id: 'programs', label: 'Programs', icon: HeartHandshake },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarHeart },
  { id: 'publications', label: 'Feedback', icon: MessageCircle },
  { id: 'resources', label: 'Resources', icon: FileText },
  { id: 'partners', label: 'Partners', icon: Handshake },
  { id: 'stats', label: 'Site Stats', icon: BarChart3 },
];

export default function WebsitePage() {
  const [active, setActive] = useState('news');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Website Content</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Manage all public-facing website content in one place.</p>
      </div>
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4">
        {active === 'news' && <NewsManager />}
        {active === 'stories' && <StoriesManager />}
        {active === 'programs' && <ProgramsManager />}
        {active === 'upcoming' && <UpcomingManager />}
        {active === 'publications' && <PublicationsManager />}
        {active === 'resources' && <ResourcesManager />}
        {active === 'partners' && <PartnersManager />}
        {active === 'stats' && <StatsManager />}
      </div>
    </div>
  );
}
