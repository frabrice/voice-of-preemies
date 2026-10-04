import { useState } from 'react';
import { CalendarCheck, Stethoscope, Clock, Tag, ExternalLink } from 'lucide-react';
import TabBar from '../components/TabBar';
import ConsultBookingsTab from './ConsultBookingsTab';
import { ProvidersTab, ScheduleTab, SpecialtiesTab } from './ConsultSetupTabs';

export default function ConsultationsPage() {
  const [active, setActive] = useState('bookings');
  const [pending, setPending] = useState(0);

  const tabs = [
    { id: 'bookings', label: 'Bookings', icon: CalendarCheck, badge: pending },
    { id: 'providers', label: 'Providers', icon: Stethoscope },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'specialties', label: 'Specialties', icon: Tag },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Consultations</h1>
          <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Online bookings with doctors and nurses. Verify the MoMo payment, then confirm.</p>
        </div>
        <a href="/book" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0A6070] hover:underline flex-shrink-0" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          View booking page <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4">
        {active === 'bookings' && <ConsultBookingsTab onPendingCount={setPending} />}
        {active === 'providers' && <ProvidersTab />}
        {active === 'schedule' && <ScheduleTab />}
        {active === 'specialties' && <SpecialtiesTab />}
      </div>
    </div>
  );
}
