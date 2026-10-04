// Shared types and Kigali-time helpers for the consultation booking feature.
// Every date shown to users is formatted in Africa/Kigali, never the viewer's
// local time zone, so a booking reads the same wherever it is viewed.

export const KIGALI_TZ = 'Africa/Kigali';

export type ConsultMode = 'call' | 'in_person';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired';

export interface PublicProvider {
  id: string;
  specialty_id: string | null;
  specialty_name: string | null;
  title: string;
  full_name: string;
  headline: string;
  bio: string;
  photo_url: string;
  slot_minutes: number;
  booking_fee: number;
  full_fee: number;
  position: number;
}

export const providerLabel = (p: { title: string; full_name: string }) =>
  `${p.title ? p.title + ' ' : ''}${p.full_name}`.trim();

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

export const fmtRwf = (n: number) => `${n.toLocaleString('en-US')} RWF`;

export const kigaliDayKey = (d: Date | string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: KIGALI_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));

export const fmtKigaliTime = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: KIGALI_TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export const fmtKigaliDateLong = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: KIGALI_TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export const fmtKigaliDateShort = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: KIGALI_TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));

export const fmtKigaliDateTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: KIGALI_TZ, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));

/** Adds whole days to a YYYY-MM-DD key without any time-zone drift. */
export const addDaysToKey = (key: string, days: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const dayKeyParts = (key: string) => {
  const d = new Date(`${key}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short' }).format(d),
    day: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric' }).format(d),
    month: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short' }).format(d),
  };
};

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Dashboard shows Monday first; values match Postgres (0 = Sunday).
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const MODE_LABEL: Record<ConsultMode, string> = {
  call: 'Phone / online call',
  in_person: 'In person at the VoP office',
};
