import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
}

export default function Drawer({ title, subtitle, onClose, children, width = 'md', footer }: DrawerProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', h);
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const widthClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' }[width];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel — slides in from right */}
      <div className={`absolute right-0 top-0 bottom-0 w-full ${widthClass} bg-white shadow-2xl flex flex-col`}
        style={{ animation: 'slideInRight 0.22s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-[#0f172a] leading-tight truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</h2>
            {subtitle && <p className="text-[11px] text-[#94A3B8] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-xl hover:bg-slate-100 text-[#64748B] transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
