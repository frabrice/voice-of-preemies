
export interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: number;
}

export default function TabBar({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-4 scrollbar-thin">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-gradient-to-r from-[#0A6070] to-[#1AADA0] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#1e293b] hover:bg-white/60'
            }`}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            <tab.icon className={isActive ? 'text-white' : 'text-[#94A3B8]'} style={{ width: 13, height: 13 }} />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
