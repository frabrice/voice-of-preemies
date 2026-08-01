import { useState, useRef, useCallback } from 'react';
import { Camera, CheckCircle, Loader2, ChevronDown, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Country data ───────────────────────────────────────────────────────────────
const COUNTRIES: { name: string; code: string; dial: string; flag: string }[] = [
  { name: 'Afghanistan', code: 'AF', dial: '+93', flag: '🇦🇫' },
  { name: 'Albania', code: 'AL', dial: '+355', flag: '🇦🇱' },
  { name: 'Algeria', code: 'DZ', dial: '+213', flag: '🇩🇿' },
  { name: 'Angola', code: 'AO', dial: '+244', flag: '🇦🇴' },
  { name: 'Argentina', code: 'AR', dial: '+54', flag: '🇦🇷' },
  { name: 'Australia', code: 'AU', dial: '+61', flag: '🇦🇺' },
  { name: 'Austria', code: 'AT', dial: '+43', flag: '🇦🇹' },
  { name: 'Bangladesh', code: 'BD', dial: '+880', flag: '🇧🇩' },
  { name: 'Belgium', code: 'BE', dial: '+32', flag: '🇧🇪' },
  { name: 'Benin', code: 'BJ', dial: '+229', flag: '🇧🇯' },
  { name: 'Bolivia', code: 'BO', dial: '+591', flag: '🇧🇴' },
  { name: 'Brazil', code: 'BR', dial: '+55', flag: '🇧🇷' },
  { name: 'Burkina Faso', code: 'BF', dial: '+226', flag: '🇧🇫' },
  { name: 'Burundi', code: 'BI', dial: '+257', flag: '🇧🇮' },
  { name: 'Cameroon', code: 'CM', dial: '+237', flag: '🇨🇲' },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'Central African Republic', code: 'CF', dial: '+236', flag: '🇨🇫' },
  { name: 'Chad', code: 'TD', dial: '+235', flag: '🇹🇩' },
  { name: 'Chile', code: 'CL', dial: '+56', flag: '🇨🇱' },
  { name: 'China', code: 'CN', dial: '+86', flag: '🇨🇳' },
  { name: 'Colombia', code: 'CO', dial: '+57', flag: '🇨🇴' },
  { name: 'Congo (Brazzaville)', code: 'CG', dial: '+242', flag: '🇨🇬' },
  { name: 'Congo (Kinshasa)', code: 'CD', dial: '+243', flag: '🇨🇩' },
  { name: 'Côte d\'Ivoire', code: 'CI', dial: '+225', flag: '🇨🇮' },
  { name: 'Croatia', code: 'HR', dial: '+385', flag: '🇭🇷' },
  { name: 'Cuba', code: 'CU', dial: '+53', flag: '🇨🇺' },
  { name: 'Czech Republic', code: 'CZ', dial: '+420', flag: '🇨🇿' },
  { name: 'Denmark', code: 'DK', dial: '+45', flag: '🇩🇰' },
  { name: 'Djibouti', code: 'DJ', dial: '+253', flag: '🇩🇯' },
  { name: 'Ecuador', code: 'EC', dial: '+593', flag: '🇪🇨' },
  { name: 'Egypt', code: 'EG', dial: '+20', flag: '🇪🇬' },
  { name: 'Eritrea', code: 'ER', dial: '+291', flag: '🇪🇷' },
  { name: 'Ethiopia', code: 'ET', dial: '+251', flag: '🇪🇹' },
  { name: 'Finland', code: 'FI', dial: '+358', flag: '🇫🇮' },
  { name: 'France', code: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'Gabon', code: 'GA', dial: '+241', flag: '🇬🇦' },
  { name: 'Gambia', code: 'GM', dial: '+220', flag: '🇬🇲' },
  { name: 'Germany', code: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'Ghana', code: 'GH', dial: '+233', flag: '🇬🇭' },
  { name: 'Greece', code: 'GR', dial: '+30', flag: '🇬🇷' },
  { name: 'Guinea', code: 'GN', dial: '+224', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', code: 'GW', dial: '+245', flag: '🇬🇼' },
  { name: 'Haiti', code: 'HT', dial: '+509', flag: '🇭🇹' },
  { name: 'Hungary', code: 'HU', dial: '+36', flag: '🇭🇺' },
  { name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳' },
  { name: 'Indonesia', code: 'ID', dial: '+62', flag: '🇮🇩' },
  { name: 'Iran', code: 'IR', dial: '+98', flag: '🇮🇷' },
  { name: 'Iraq', code: 'IQ', dial: '+964', flag: '🇮🇶' },
  { name: 'Ireland', code: 'IE', dial: '+353', flag: '🇮🇪' },
  { name: 'Israel', code: 'IL', dial: '+972', flag: '🇮🇱' },
  { name: 'Italy', code: 'IT', dial: '+39', flag: '🇮🇹' },
  { name: 'Japan', code: 'JP', dial: '+81', flag: '🇯🇵' },
  { name: 'Jordan', code: 'JO', dial: '+962', flag: '🇯🇴' },
  { name: 'Kenya', code: 'KE', dial: '+254', flag: '🇰🇪' },
  { name: 'Lebanon', code: 'LB', dial: '+961', flag: '🇱🇧' },
  { name: 'Lesotho', code: 'LS', dial: '+266', flag: '🇱🇸' },
  { name: 'Liberia', code: 'LR', dial: '+231', flag: '🇱🇷' },
  { name: 'Libya', code: 'LY', dial: '+218', flag: '🇱🇾' },
  { name: 'Madagascar', code: 'MG', dial: '+261', flag: '🇲🇬' },
  { name: 'Malawi', code: 'MW', dial: '+265', flag: '🇲🇼' },
  { name: 'Malaysia', code: 'MY', dial: '+60', flag: '🇲🇾' },
  { name: 'Mali', code: 'ML', dial: '+223', flag: '🇲🇱' },
  { name: 'Mauritania', code: 'MR', dial: '+222', flag: '🇲🇷' },
  { name: 'Mauritius', code: 'MU', dial: '+230', flag: '🇲🇺' },
  { name: 'Mexico', code: 'MX', dial: '+52', flag: '🇲🇽' },
  { name: 'Morocco', code: 'MA', dial: '+212', flag: '🇲🇦' },
  { name: 'Mozambique', code: 'MZ', dial: '+258', flag: '🇲🇿' },
  { name: 'Namibia', code: 'NA', dial: '+264', flag: '🇳🇦' },
  { name: 'Netherlands', code: 'NL', dial: '+31', flag: '🇳🇱' },
  { name: 'New Zealand', code: 'NZ', dial: '+64', flag: '🇳🇿' },
  { name: 'Niger', code: 'NE', dial: '+227', flag: '🇳🇪' },
  { name: 'Nigeria', code: 'NG', dial: '+234', flag: '🇳🇬' },
  { name: 'Norway', code: 'NO', dial: '+47', flag: '🇳🇴' },
  { name: 'Pakistan', code: 'PK', dial: '+92', flag: '🇵🇰' },
  { name: 'Palestine', code: 'PS', dial: '+970', flag: '🇵🇸' },
  { name: 'Peru', code: 'PE', dial: '+51', flag: '🇵🇪' },
  { name: 'Philippines', code: 'PH', dial: '+63', flag: '🇵🇭' },
  { name: 'Poland', code: 'PL', dial: '+48', flag: '🇵🇱' },
  { name: 'Portugal', code: 'PT', dial: '+351', flag: '🇵🇹' },
  { name: 'Romania', code: 'RO', dial: '+40', flag: '🇷🇴' },
  { name: 'Russia', code: 'RU', dial: '+7', flag: '🇷🇺' },
  { name: 'Rwanda', code: 'RW', dial: '+250', flag: '🇷🇼' },
  { name: 'Saudi Arabia', code: 'SA', dial: '+966', flag: '🇸🇦' },
  { name: 'Senegal', code: 'SN', dial: '+221', flag: '🇸🇳' },
  { name: 'Sierra Leone', code: 'SL', dial: '+232', flag: '🇸🇱' },
  { name: 'Somalia', code: 'SO', dial: '+252', flag: '🇸🇴' },
  { name: 'South Africa', code: 'ZA', dial: '+27', flag: '🇿🇦' },
  { name: 'South Korea', code: 'KR', dial: '+82', flag: '🇰🇷' },
  { name: 'South Sudan', code: 'SS', dial: '+211', flag: '🇸🇸' },
  { name: 'Spain', code: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'Sri Lanka', code: 'LK', dial: '+94', flag: '🇱🇰' },
  { name: 'Sudan', code: 'SD', dial: '+249', flag: '🇸🇩' },
  { name: 'Sweden', code: 'SE', dial: '+46', flag: '🇸🇪' },
  { name: 'Switzerland', code: 'CH', dial: '+41', flag: '🇨🇭' },
  { name: 'Syria', code: 'SY', dial: '+963', flag: '🇸🇾' },
  { name: 'Tanzania', code: 'TZ', dial: '+255', flag: '🇹🇿' },
  { name: 'Thailand', code: 'TH', dial: '+66', flag: '🇹🇭' },
  { name: 'Togo', code: 'TG', dial: '+228', flag: '🇹🇬' },
  { name: 'Tunisia', code: 'TN', dial: '+216', flag: '🇹🇳' },
  { name: 'Turkey', code: 'TR', dial: '+90', flag: '🇹🇷' },
  { name: 'Uganda', code: 'UG', dial: '+256', flag: '🇺🇬' },
  { name: 'Ukraine', code: 'UA', dial: '+380', flag: '🇺🇦' },
  { name: 'United Arab Emirates', code: 'AE', dial: '+971', flag: '🇦🇪' },
  { name: 'United Kingdom', code: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'United States', code: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'Uruguay', code: 'UY', dial: '+598', flag: '🇺🇾' },
  { name: 'Venezuela', code: 'VE', dial: '+58', flag: '🇻🇪' },
  { name: 'Vietnam', code: 'VN', dial: '+84', flag: '🇻🇳' },
  { name: 'Yemen', code: 'YE', dial: '+967', flag: '🇾🇪' },
  { name: 'Zambia', code: 'ZM', dial: '+260', flag: '🇿🇲' },
  { name: 'Zimbabwe', code: 'ZW', dial: '+263', flag: '🇿🇼' },
].sort((a, b) => a.name.localeCompare(b.name));

const TITLES = ['Dr.', 'Prof.', 'Mr.', 'Mrs.', 'Ms.', 'Rev.'];

// ── Validators ────────────────────────────────────────────────────────────────
function validateName(v: string) {
  if (!v.trim()) return 'Full name is required.';
  if (!/^[a-zA-ZÀ-ÖØ-öø-ÿ\s'-]+$/.test(v.trim())) return 'Name should only contain letters, hyphens, and apostrophes.';
  const parts = v.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return 'Please enter at least a first and last name.';
  if (v.length > 80) return 'Name must be under 80 characters.';
  return '';
}

function validateEmail(v: string) {
  if (!v.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Please enter a valid email address.';
  return '';
}

function validatePhone(v: string, dial: string) {
  if (!v.trim()) return 'Phone number is required.';
  const digits = v.replace(/\D/g, '');
  if (digits.length < 6) return 'Phone number is too short.';
  if (digits.length > 15) return 'Phone number is too long.';
  if (!dial) return 'Please select a country first.';
  return '';
}

function validateBio(v: string) {
  if (v.length > 500) return 'Bio must be under 500 characters.';
  return '';
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[15px] font-semibold text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        {label}{required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
          <p className="text-[13px] text-rose-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{error}</p>
        </div>
      )}
    </div>
  );
}

const inputClass = 'w-full px-4 py-4 text-[16px] border border-[#D8E4E8] rounded-2xl text-[#1A2B35] focus:outline-none focus:border-[#0A6070] focus:ring-2 focus:ring-[#0A6070]/10 transition-all bg-white placeholder:text-[#A0B4BC]';

// ── Country picker ─────────────────────────────────────────────────────────────
function CountryPicker({ value, onChange, error }: { value: string; onChange: (c: typeof COUNTRIES[0]) => void; error?: string }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find(c => c.code === value);
  const filtered = search.trim()
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : COUNTRIES;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[15px] font-semibold text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Country <span className="text-rose-500">*</span>
      </label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between px-4 py-4 border rounded-2xl text-[16px] transition-all bg-white ${
          error ? 'border-rose-400' : value ? 'border-[#0A6070]' : 'border-[#D8E4E8]'
        } focus:outline-none`}
      >
        {selected ? (
          <span className="flex items-center gap-3 text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <span className="text-xl">{selected.flag}</span>
            <span>{selected.name}</span>
            <span className="text-[#5A7280] text-sm">({selected.dial})</span>
          </span>
        ) : (
          <span className="text-[#A0B4BC]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Select your country…</span>
        )}
        <ChevronDown className="w-5 h-5 text-[#A0B4BC]" />
      </button>
      {error && (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
          <p className="text-[13px] text-rose-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{error}</p>
        </div>
      )}

      {/* Full-screen picker on mobile */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E8EFF2]">
            <button type="button" onClick={() => setOpen(false)} className="p-2 -ml-2 rounded-xl text-[#5A7280]">
              <X className="w-5 h-5" />
            </button>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search countries…"
              className="flex-1 text-[16px] text-[#1A2B35] placeholder:text-[#A0B4BC] focus:outline-none"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            />
            {search && <button type="button" onClick={() => setSearch('')}><X className="w-4 h-4 text-[#A0B4BC]" /></button>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onChange(c); setOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-4 px-5 py-4 border-b border-[#F5F8FA] text-left active:bg-[#F0F8FA] transition-colors ${
                  c.code === value ? 'bg-[#F0F8FA]' : ''
                }`}
              >
                <span className="text-2xl">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-medium text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.name}</p>
                </div>
                <span className="text-[14px] text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.dial}</span>
                {c.code === value && <div className="w-2.5 h-2.5 rounded-full bg-[#0A6070]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Photo uploader ────────────────────────────────────────────────────────────
function PhotoUploader({ preview, onFile, error }: { preview: string; onFile: (f: File) => void; error?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onFile(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[15px] font-semibold text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Profile Photo <span className="text-rose-500">*</span>
      </label>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={`w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98] ${
          error ? 'border-rose-400 bg-rose-50/30' : preview ? 'border-[#0A6070] bg-[#F0F8FA]' : 'border-[#D8E4E8] bg-[#F5F8FA]'
        }`}
      >
        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <img src={preview} alt="Profile preview" className="w-24 h-24 rounded-full object-cover ring-4 ring-[#0A6070]/20" />
            <p className="text-[14px] font-medium text-[#0A6070]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Tap to change photo</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-[#0A6070]/10 flex items-center justify-center">
              <Camera className="w-7 h-7 text-[#0A6070]" />
            </div>
            <div className="text-center">
              <p className="text-[16px] font-semibold text-[#1A2B35]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Tap to choose a photo</p>
              <p className="text-[13px] text-[#5A7280] mt-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>JPG, PNG or WebP · Max 5MB</p>
            </div>
          </>
        )}
      </button>
      {error && (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
          <p className="text-[13px] text-rose-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{error}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function JoinOurTeam() {
  const [form, setForm] = useState({
    title: '',
    full_name: '',
    country: '',
    countryDial: '',
    phone: '',
    email: '',
    bio: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));
  const touch = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const errors = {
    title: touched.title && !form.title ? 'Please select a title.' : '',
    full_name: touched.full_name ? validateName(form.full_name) : '',
    country: touched.country && !form.country ? 'Please select your country.' : '',
    phone: touched.phone ? validatePhone(form.phone, form.countryDial) : '',
    email: touched.email ? validateEmail(form.email) : '',
    photo: touched.photo && !photoFile ? 'Please choose a profile photo.' : '',
    bio: validateBio(form.bio),
  };

  const photoError = (() => {
    if (!touched.photo) return '';
    if (!photoFile) return 'Please choose a profile photo.';
    if (photoFile.size > 5 * 1024 * 1024) return 'Photo must be under 5MB.';
    return '';
  })();

  const isValid =
    form.title &&
    !validateName(form.full_name) &&
    form.country &&
    !validatePhone(form.phone, form.countryDial) &&
    !validateEmail(form.email) &&
    photoFile &&
    photoFile.size <= 5 * 1024 * 1024 &&
    !validateBio(form.bio);

  const handlePhotoFile = useCallback((file: File) => {
    setPhotoFile(file);
    setTouched(prev => ({ ...prev, photo: true }));
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }, []);

  const handleCountryChange = (c: typeof COUNTRIES[0]) => {
    setForm(prev => ({ ...prev, country: c.code, countryDial: c.dial }));
    setTouched(prev => ({ ...prev, country: true }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Touch all fields to show any remaining errors
    setTouched({ title: true, full_name: true, country: true, phone: true, email: true, photo: true, bio: true });
    if (!isValid) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      // Upload photo to Supabase Storage
      const ext = photoFile!.name.split('.').pop() ?? 'jpg';
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('team-applications')
        .upload(fileName, photoFile!, { contentType: photoFile!.type, upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('team-applications').getPublicUrl(fileName);
      const photoUrl = urlData.publicUrl;

      // Insert into team_applications
      const country = COUNTRIES.find(c => c.code === form.country);
      const applicantPhone = `${form.countryDial} ${form.phone.trim()}`;
      const applicantEmail = form.email.trim().toLowerCase();
      const { error: insertErr } = await supabase.from('team_applications').insert({
        title: form.title,
        full_name: form.full_name.trim(),
        country: country?.name ?? form.country,
        phone: applicantPhone,
        email: applicantEmail,
        profile_picture_url: photoUrl,
        bio: form.bio.trim(),
      });
      if (insertErr) throw insertErr;

      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-join-notification`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            email: applicantEmail,
            phone: applicantPhone,
            role: form.title,
            organization: country?.name ?? form.country,
            motivation: form.bio.trim(),
          }),
        });
      } catch { /* email is best-effort; don't block the user */ }

      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCountry = COUNTRIES.find(c => c.code === form.country);

  return (
    <div className="min-h-screen bg-[#F5F8FA] flex flex-col">
      {/* ── Header ── */}
      <header className="bg-white border-b border-[#E8EFF2] px-5 py-4 flex items-center gap-3">
        <img
          src="https://res.cloudinary.com/dyqitacqz/image/upload/v1779117338/Horizontal_Voice_Of_Preemies_svmz0n.png"
          alt="Voice of Preemies Rwanda"
          className="h-8 w-auto"
        />
      </header>

      {/* ── Content ── */}
      <div className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">

        {submitted ? (
          /* ── Success screen ── */
          <div className="flex flex-col items-center text-center py-12 animate-[fadeIn_0.4s_ease]">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h1
              className="text-[28px] font-light text-[#1A2B35] mb-3 leading-tight"
              style={{ fontFamily: 'Cormorant Garamond, serif' }}
            >
              Application Submitted!
            </h1>
            <p
              className="text-[16px] text-[#5A7280] leading-relaxed max-w-xs"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Thank you, <strong className="text-[#1A2B35]">{form.title} {form.full_name.split(' ')[0]}</strong>. We've received your application and our team will be in touch soon.
            </p>
            <div className="mt-8 p-5 bg-[#F0F8FA] rounded-2xl border border-[#D0E8EE] w-full max-w-xs text-left">
              <p className="text-[13px] text-[#0A6070] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                We review applications regularly. Thank you for your interest in joining the Voice of Preemies Rwanda family.
              </p>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <div className="mb-8">
              <h1
                className="text-[30px] font-light text-[#1A2B35] leading-tight mb-2"
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
              >
                Join Our Team
              </h1>
              <p
                className="text-[15px] text-[#5A7280] leading-relaxed"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                We'd love to have you on board. Fill in the form below and we'll be in touch.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 pb-10">

              {/* Title */}
              <Field label="Title" required error={errors.title}>
                <div className="relative">
                  <select
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    onBlur={() => touch('title')}
                    className={`${inputClass} appearance-none pr-12 ${errors.title ? 'border-rose-400' : ''}`}
                  >
                    <option value="">Select title…</option>
                    {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0B4BC] pointer-events-none" />
                </div>
              </Field>

              {/* Full name */}
              <Field label="Full Name" required error={errors.full_name}>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  onBlur={() => touch('full_name')}
                  placeholder="First and last name"
                  autoComplete="name"
                  className={`${inputClass} ${errors.full_name ? 'border-rose-400' : ''}`}
                />
              </Field>

              {/* Country */}
              <CountryPicker
                value={form.country}
                onChange={handleCountryChange}
                error={touched.country && !form.country ? 'Please select your country.' : ''}
              />

              {/* Phone */}
              <Field label="Phone Number" required error={errors.phone}>
                <div className={`flex items-center border rounded-2xl overflow-hidden transition-all ${
                  errors.phone ? 'border-rose-400' : 'border-[#D8E4E8] focus-within:border-[#0A6070] focus-within:ring-2 focus-within:ring-[#0A6070]/10'
                } bg-white`}>
                  {selectedCountry ? (
                    <div className="flex items-center gap-2 px-4 py-4 border-r border-[#E8EFF2] bg-[#F5F8FA] whitespace-nowrap select-none">
                      <span className="text-lg">{selectedCountry.flag}</span>
                      <span className="text-[16px] text-[#1A2B35] font-medium" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selectedCountry.dial}</span>
                    </div>
                  ) : (
                    <div className="px-4 py-4 border-r border-[#E8EFF2] bg-[#F5F8FA] text-[#A0B4BC] text-[16px] whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      +_
                    </div>
                  )}
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value.replace(/[^\d\s\-()]/g, ''))}
                    onBlur={() => touch('phone')}
                    placeholder="7XX XXX XXX"
                    inputMode="tel"
                    className="flex-1 px-4 py-4 text-[16px] text-[#1A2B35] focus:outline-none placeholder:text-[#A0B4BC] bg-transparent"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  />
                </div>
              </Field>

              {/* Email */}
              <Field label="Email Address" required error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  onBlur={() => touch('email')}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  className={`${inputClass} ${errors.email ? 'border-rose-400' : ''}`}
                />
              </Field>

              {/* Profile photo */}
              <PhotoUploader
                preview={photoPreview}
                onFile={handlePhotoFile}
                error={photoError}
              />

              {/* Bio */}
              <Field label="Short Bio" error={errors.bio}>
                <div className="relative">
                  <textarea
                    value={form.bio}
                    onChange={e => set('bio', e.target.value)}
                    onBlur={() => touch('bio')}
                    rows={4}
                    placeholder="Tell us a little about your background and why you'd like to join (2–3 sentences, optional)"
                    className={`${inputClass} resize-none ${errors.bio ? 'border-rose-400' : ''}`}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  />
                  <p className={`absolute bottom-3 right-4 text-[12px] ${form.bio.length > 450 ? form.bio.length > 500 ? 'text-rose-500' : 'text-amber-500' : 'text-[#A0B4BC]'}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {form.bio.length}/500
                  </p>
                </div>
                <p className="text-[13px] text-[#5A7280]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Optional</p>
              </Field>

              {submitError && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                  <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[14px] text-rose-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{submitError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 flex items-center justify-center gap-2.5 bg-[#0A6070] text-white text-[17px] font-bold rounded-2xl hover:bg-[#084F5C] active:scale-[0.98] transition-all disabled:opacity-60 mt-2 shadow-md shadow-[#0A6070]/20"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</>
                ) : (
                  'Submit Application'
                )}
              </button>
            </form>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="px-5 py-5 text-center border-t border-[#E8EFF2] bg-white">
        <p className="text-[12px] text-[#A0B4BC]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          © {new Date().getFullYear()} Voice of Preemies Rwanda · All rights reserved
        </p>
      </footer>
    </div>
  );
}
