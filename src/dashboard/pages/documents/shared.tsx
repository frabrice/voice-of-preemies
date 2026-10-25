import type { ComponentType } from 'react';
import { FileText, FileSpreadsheet, FileImage, FileVideo, File as FileIcon, Presentation, Globe, Users, Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export const BUCKET = 'documents';
export const MAX_BYTES = 50 * 1024 * 1024;
export const UNCATEGORIZED = 'none';

export const font = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
export const serif = { fontFamily: 'Cormorant Garamond, serif' };

export type AccessLevel = 'public' | 'internal' | 'confidential';

export interface Doc {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  file_url: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: string | null;
  tags: string[];
  access_level: AccessLevel;
  created_at: string;
}

export interface DocCat {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
}

/** Everything the three tabs need, owned by the page so counts and lists never disagree. */
export interface DocsApi {
  docs: Doc[];
  cats: DocCat[];
  loading: boolean;
  openForm: (initial?: Partial<Doc>) => void;
  askDelete: (d: Doc) => void;
  openFile: (d: Doc, download?: boolean) => Promise<void>;
  addCategory: (name: string, color: string) => Promise<{ row?: DocCat; error?: string }>;
  updateCategory: (id: string, name: string, color: string) => Promise<string | null>;
  deleteCategory: (c: DocCat) => Promise<void>;
  flash: (kind: 'ok' | 'error', text: string) => void;
}

export const CATEGORY_COLORS = ['#0A6070', '#1AADA0', '#2563EB', '#7C3AED', '#D327C5', '#E8644A', '#E8A020', '#16A34A', '#64748B'];

export const TYPE_META: Record<string, { label: string; icon: ComponentType<{ className?: string }>; bg: string; fg: string }> = {
  pdf: { label: 'PDF', icon: FileText, bg: '#FEE2E2', fg: '#DC2626' },
  docx: { label: 'Word', icon: FileText, bg: '#DBEAFE', fg: '#2563EB' },
  spreadsheet: { label: 'Spreadsheet', icon: FileSpreadsheet, bg: '#DCFCE7', fg: '#16A34A' },
  presentation: { label: 'Slides', icon: Presentation, bg: '#FFEDD5', fg: '#EA580C' },
  image: { label: 'Image', icon: FileImage, bg: '#F3E8FF', fg: '#9333EA' },
  video: { label: 'Video', icon: FileVideo, bg: '#FCE7F3', fg: '#DB2777' },
  other: { label: 'Other', icon: FileIcon, bg: '#F1F5F9', fg: '#64748B' },
};
export const TYPE_ORDER = ['pdf', 'docx', 'spreadsheet', 'presentation', 'image', 'video', 'other'];
export const typeMeta = (t?: string | null) => TYPE_META[t ?? 'other'] ?? TYPE_META.other;

export const ACCESS_META: Record<AccessLevel, { label: string; hint: string; icon: ComponentType<{ className?: string }>; pill: string }> = {
  public: { label: 'Public', hint: 'Safe to share openly', icon: Globe, pill: 'bg-emerald-50 text-emerald-700' },
  internal: { label: 'Internal', hint: 'Team members only', icon: Users, pill: 'bg-slate-100 text-slate-600' },
  confidential: { label: 'Confidential', hint: 'Super admins only', icon: Lock, pill: 'bg-red-50 text-red-600' },
};

export function detectType(name: string): string {
  const ext = name.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
  if (['ppt', 'pptx'].includes(ext)) return 'presentation';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  return 'other';
}

export function humanSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

/** Opens or downloads a document. Stored files are private, so a short-lived signed link is made per click. */
export async function openDocument(doc: Pick<Doc, 'storage_path' | 'file_url' | 'file_name'>, download = false): Promise<string | null> {
  if (doc.storage_path) {
    // Open the tab inside the click so pop-up blockers allow it, then point it at the link.
    const popup = download ? null : window.open('', '_blank');
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300, download ? { download: doc.file_name || true } : undefined);
    if (error || !data) {
      popup?.close();
      return 'Could not open this file. It may have been removed from storage.';
    }
    if (download) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if (popup) {
      popup.location.href = data.signedUrl;
    } else {
      window.open(data.signedUrl, '_blank');
    }
    return null;
  }
  if (doc.file_url) {
    window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    return null;
  }
  return 'This document has no file attached.';
}

export interface Filters {
  q: string;
  category: string; // 'all' | UNCATEGORIZED | category id
  type: string; // 'all' | file type
  access: string; // 'all' | access level
  range: string; // 'any' | '7' | '30' | '365'
}
export const DEFAULT_FILTERS: Filters = { q: '', category: 'all', type: 'all', access: 'all', range: 'any' };

export type SortKey = 'new' | 'old' | 'az' | 'za';
export const SORT_LABELS: Record<SortKey, string> = { new: 'Newest first', old: 'Oldest first', az: 'Title A to Z', za: 'Title Z to A' };

export function applyFilters(docs: Doc[], f: Filters, cats: DocCat[], skip?: keyof Filters): Doc[] {
  const tokens = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const catName = (id: string | null) => cats.find(c => c.id === id)?.name ?? '';
  const cutoff = f.range === 'any' ? 0 : Date.now() - Number(f.range) * 86400000;
  return docs.filter(d => {
    if (skip !== 'q' && tokens.length) {
      const hay = [d.title, d.description, d.file_name, catName(d.category_id), typeMeta(d.file_type).label].join(' ').toLowerCase();
      if (!tokens.every(t => hay.includes(t))) return false;
    }
    if (skip !== 'category' && f.category !== 'all') {
      if (f.category === UNCATEGORIZED ? !!d.category_id : d.category_id !== f.category) return false;
    }
    if (skip !== 'type' && f.type !== 'all' && (d.file_type ?? 'other') !== f.type) return false;
    if (skip !== 'access' && f.access !== 'all' && d.access_level !== f.access) return false;
    if (skip !== 'range' && cutoff && Date.parse(d.created_at) < cutoff) return false;
    return true;
  });
}

export function sortDocs(docs: Doc[], key: SortKey): Doc[] {
  const list = [...docs];
  if (key === 'new') return list.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  if (key === 'old') return list.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const cmp = (a: Doc, b: Doc) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  return key === 'az' ? list.sort(cmp) : list.sort((a, b) => cmp(b, a));
}

/** Remembers a preference (e.g. grid vs list) between visits. Storage can be blocked, so it never throws. */
export function loadPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch { return fallback; }
}
export function savePref(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
