import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

export default function SubPage({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-[11px] font-semibold text-[#0A6070] hover:gap-1.5 transition-all"
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>
      <h2 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{title}</h2>
      {children}
    </div>
  );
}
