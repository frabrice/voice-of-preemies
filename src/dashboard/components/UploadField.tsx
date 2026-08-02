import { useState, useRef } from 'react';
import { Upload, Loader2, X, ImageOff, FileText, ExternalLink, Plus } from 'lucide-react';
import { uploadToCloudinary } from '../../lib/cloudinary';

const lbl = 'block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5';
const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#0A6070]/20 focus:border-[#0A6070]/40 transition-all';

/** Image field with thumbnail preview, upload via Cloudinary only — no manual URL entry. */
export function ImageUploadField({ label = 'Image', value, onChange, folder }: { label?: string; value: string; onChange: (url: string) => void; folder?: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const result = await uploadToCloudinary(file, { folder, resourceType: 'image' });
      onChange(result.secureUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
    setUploading(false);
  };

  return (
    <div>
      <label className={lbl} style={font}>{label}</label>
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <ImageOff className="w-5 h-5 text-slate-300" />}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors" style={font}>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'Uploading…' : value ? 'Replace Image' : 'Upload Image'}
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-400 hover:text-red-500 text-[11px] font-semibold transition-colors" style={font}>
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          {error && <p className="text-[10px] text-red-500">{error}</p>}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}

/** Gallery field: upload multiple images via Cloudinary, shown as a removable thumbnail grid. No manual URL entry. */
export function MultiImageUploadField({ label = 'Gallery', values, onChange, folder }: { label?: string; values: string[]; onChange: (urls: string[]) => void; folder?: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    setError('');
    try {
      const uploaded = await Promise.all(Array.from(files).map(f => uploadToCloudinary(f, { folder, resourceType: 'image' })));
      onChange([...values, ...uploaded.map(u => u.secureUrl)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
    setUploading(false);
  };

  const removeAt = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div>
      <label className={lbl} style={font}>{label}</label>
      <div className="flex flex-wrap gap-2">
        {values.map((url, i) => (
          <div key={i} className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => removeAt(i)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#0A6070] hover:border-[#0A6070]/40 disabled:opacity-50 transition-colors flex-shrink-0">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-[10px] text-red-500 mt-1.5">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { const f = e.target.files; if (f && f.length) handleFiles(f); e.target.value = ''; }}
      />
    </div>
  );
}

/** Generic file field (PDF, DOCX, etc.) with the same upload-or-paste-URL pattern, no image preview. */
export function FileUploadField({ label = 'File', value, onChange, folder }: { label?: string; value: string; onChange: (url: string) => void; folder?: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const result = await uploadToCloudinary(file, { folder, resourceType: 'auto' });
      onChange(result.secureUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
    setUploading(false);
  };

  return (
    <div>
      <label className={lbl} style={font}>{label}</label>
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
          {value ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-[#0A6070]"><ExternalLink className="w-5 h-5" /></a>
          ) : (
            <FileText className="w-5 h-5 text-slate-300" />
          )}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <input value={value} onChange={e => onChange(e.target.value)} placeholder="https://… or upload below" className={inp} style={font} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors" style={font}>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'Uploading…' : 'Upload File'}
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-400 hover:text-red-500 text-[11px] font-semibold transition-colors" style={font}>
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          {error && <p className="text-[10px] text-red-500">{error}</p>}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}
