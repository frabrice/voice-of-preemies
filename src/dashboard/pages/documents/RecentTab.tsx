import { useMemo } from 'react';
import { Clock, Plus } from 'lucide-react';
import { Doc, DocsApi, font, serif } from './shared';
import { DocList, EmptyBlock, PrimaryButton } from './DocumentItems';

const LIMIT = 20;

function groupLabel(iso: string, startOfToday: number): string {
  const days = Math.floor((startOfToday - new Date(new Date(iso).setHours(0, 0, 0, 0)).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'Earlier this week';
  if (days < 31) return 'Earlier this month';
  return 'Older';
}

export default function RecentTab({ api }: { api: DocsApi }) {
  const groups = useMemo(() => {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const latest = [...api.docs].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, LIMIT);
    const out: { label: string; docs: Doc[] }[] = [];
    latest.forEach(d => {
      const label = groupLabel(d.created_at, startOfToday);
      const last = out[out.length - 1];
      if (last && last.label === label) last.docs.push(d);
      else out.push({ label, docs: [d] });
    });
    return out;
  }, [api.docs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a] leading-tight" style={serif}>Recently added</h2>
          <p className="text-[12px] text-[#64748B]" style={font}>The last {LIMIT} documents, newest first.</p>
        </div>
        <PrimaryButton icon={Plus} onClick={() => api.openForm()}>Add document</PrimaryButton>
      </div>

      {api.loading ? (
        <p className="text-[12px] text-[#94A3B8] text-center py-10">Loading…</p>
      ) : groups.length === 0 ? (
        <EmptyBlock icon={Clock} title="Nothing here yet" hint="Documents you add will show up here, newest first." />
      ) : (
        <div className="space-y-5">
          {groups.map(g => (
            <section key={g.label}>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider" style={font}>{g.label}</p>
                <div className="h-px flex-1 bg-slate-200/70" />
                <span className="text-[10px] text-[#94A3B8]" style={font}>{g.docs.length}</span>
              </div>
              <DocList docs={g.docs} view="list" api={api} showHeader={false} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
