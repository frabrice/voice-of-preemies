import { AlertTriangle } from 'lucide-react';

interface Props { message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; danger?: boolean; }

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Delete', danger = true }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
          <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
        </div>
        <p className="text-[#1A2B35] font-medium mb-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-[#D8E4E8] text-sm font-semibold text-[#5A7280] hover:bg-[#F2EDE4]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#0A6070] hover:bg-[#084F5C]'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
