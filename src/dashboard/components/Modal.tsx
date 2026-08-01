import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps { title: string; onClose: () => void; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; }

export default function Modal({ title, onClose, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const sizeClass = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClass} bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8F0F2] flex-shrink-0">
          <h2 className="text-lg font-semibold text-[#1A2B35]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F2EDE4] text-[#5A7280] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
