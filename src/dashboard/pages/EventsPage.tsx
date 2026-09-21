import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CalendarDays, List, UserCheck, Pencil, Trash2, ChevronLeft, ChevronRight, Star, ExternalLink, CreditCard, CheckCircle2 } from 'lucide-react';
import TabBar from '../components/TabBar';
import { useCrud, StatusBadge, EmptyState, SearchInput, fmtDate, fmtDateTime, inp, ta, Lbl, AddButton, notifyPublication, notifyRegistrationConfirmed } from '../components/shared';
import { ImageUploadField, MultiImageUploadField } from '../components/UploadField';

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const tabs = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'all', label: 'All Events', icon: List },
  { id: 'registrations', label: 'Registrations', icon: UserCheck },
  { id: 'training', label: 'Training Registrations', icon: CreditCard },
];

function CalendarTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    supabase.from('events').select('*').is('deleted_at', null).then(({ data }) => setEvents(data ?? []));
  }, []);

  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const monthName = month.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const eventsByDate = events.reduce<Record<string, any[]>>((acc, e) => {
    const d = e.date?.split('T')[0];
    if (d) { (acc[d] ??= []).push(e); }
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{monthName}</h3>
        <div className="flex gap-1">
          <button onClick={() => setMonth(new Date(year, m - 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4 text-[#64748B]" /></button>
          <button onClick={() => setMonth(new Date(year, m + 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4 text-[#64748B]" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[9px] font-bold text-[#94A3B8] uppercase py-1">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = eventsByDate[dateStr] ?? [];
          return (
            <div key={day} className="min-h-[60px] rounded-lg border border-slate-100 bg-white/50 p-1">
              <p className="text-[10px] font-bold text-[#94A3B8]">{day}</p>
              {dayEvents.map(e => (
                <div key={e.id} className="text-[9px] bg-[#0A6070]/10 text-[#0A6070] rounded px-1 py-0.5 mt-0.5 truncate font-medium">{e.title}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AllEventsTab() {
  const { items, loading, create, update, softDelete } = useCrud<any>('events');
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = items.filter(e => e.title?.toLowerCase().includes(search.toLowerCase()));
  const blank = { slug: '', title: '', date: '', end_date: '', location: '', type: 'workshop', description: '', registration_url: '', published: false, capacity: 0, organizer: '', budget_estimate: 0, actual_cost: 0, image_url: '', gallery_urls: [] as string[], featured: false };

  const save = async () => {
    const wasPublished = editing.id ? items.find(i => i.id === editing.id)?.published : false;
    const slug = (editing.slug || '').trim() || toSlug(editing.title || '');
    const payload = { ...editing, slug };
    if (editing.id) await update(editing.id, payload);
    else await create(payload);
    if (payload.published && !wasPublished) {
      notifyPublication({ type: 'event', title: payload.title, excerpt: payload.description, path: `/events/${slug}` });
    }
    setEditing(null); setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search events..." />
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Event" />
      </div>
      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Lbl t="Title" /><input value={editing.title ?? ''} onChange={e => { setEditing({ ...editing, title: e.target.value }); if (!editing.id) setEditing((cur: any) => ({ ...cur, slug: toSlug(e.target.value) })); }} className={inp} /></div>
            <div><Lbl t="Slug" /><input value={editing.slug ?? ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="auto-generated-from-title" className={inp + ' font-mono'} /></div>
            <div><Lbl t="Start Date" /><input type="date" value={editing.date ?? ''} onChange={e => setEditing({ ...editing, date: e.target.value })} className={inp} /></div>
            <div><Lbl t="End Date" /><input type="date" value={editing.end_date ?? ''} onChange={e => setEditing({ ...editing, end_date: e.target.value })} className={inp} /></div>
            <div><Lbl t="Location" /><input value={editing.location ?? ''} onChange={e => setEditing({ ...editing, location: e.target.value })} className={inp} /></div>
            <div><Lbl t="Type" /><select value={editing.type ?? 'workshop'} onChange={e => setEditing({ ...editing, type: e.target.value })} className={inp}><option value="workshop">Workshop</option><option value="conference">Conference</option><option value="fundraiser">Fundraiser</option><option value="meeting">Meeting</option><option value="training">Training</option></select></div>
            <div><Lbl t="Capacity" /><input type="number" value={editing.capacity ?? 0} onChange={e => setEditing({ ...editing, capacity: +e.target.value })} className={inp} /></div>
            <div><Lbl t="Organizer" /><input value={editing.organizer ?? ''} onChange={e => setEditing({ ...editing, organizer: e.target.value })} className={inp} /></div>
            <div><Lbl t="Budget Estimate" /><input type="number" value={editing.budget_estimate ?? 0} onChange={e => setEditing({ ...editing, budget_estimate: +e.target.value })} className={inp} /></div>
            <div><Lbl t="Actual Cost" /><input type="number" value={editing.actual_cost ?? 0} onChange={e => setEditing({ ...editing, actual_cost: +e.target.value })} className={inp} /></div>
            <div><Lbl t="Registration URL" /><input value={editing.registration_url ?? ''} onChange={e => setEditing({ ...editing, registration_url: e.target.value })} className={inp} /></div>
            <ImageUploadField label="Image" value={editing.image_url ?? ''} onChange={url => setEditing({ ...editing, image_url: url })} folder="voice-of-preemies/events" />
            <div><Lbl t="Published" /><select value={editing.published ? 'yes' : 'no'} onChange={e => setEditing({ ...editing, published: e.target.value === 'yes' })} className={inp}><option value="no">No</option><option value="yes">Yes</option></select></div>
          </div>
          <MultiImageUploadField label="Gallery (optional extra photos)" values={editing.gallery_urls ?? []} onChange={urls => setEditing({ ...editing, gallery_urls: urls })} folder="voice-of-preemies/events" />
          <div><Lbl t="Description" /><textarea value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className={ta} /></div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={CalendarDays} message="No events yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-1.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{e.title}</p>
                  <p className="text-[10px] text-[#94A3B8]">{fmtDate(e.date)} · {e.location}</p>
                </div>
                {e.featured && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
              </div>
              <p className="text-[10px] text-[#0A6070] font-semibold capitalize">{e.type}</p>
              {e.capacity > 0 && <p className="text-[10px] text-[#94A3B8] mt-0.5">Capacity: {e.capacity}</p>}
              <div className="flex items-center justify-between mt-2">
                <StatusBadge status={e.published ? 'published' : 'draft'} />
                <div className="flex gap-1">
                  {e.published && <a href={`/events/${e.slug}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><ExternalLink className="w-3 h-3" /></a>}
                  <button onClick={() => { setEditing({ ...e }); setShowForm(true); }} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => softDelete(e.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrainingRegistrationsTab() {
  const { items, loading, update } = useCrud<any>('training_registrations');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const markPaid = async (r: any) => {
    setConfirmingId(r.id);
    const ok = await update(r.id, { payment_status: 'confirmed', confirmed_at: new Date().toISOString() });
    if (ok) {
      await notifyRegistrationConfirmed({
        email: r.email,
        primaryName: r.primary_name,
        partnerName: r.partner_name,
        registrationType: r.registration_type,
        amount: r.amount,
      });
    }
    setConfirmingId(null);
  };

  const filtered = items
    .filter(r => filter === 'all' || r.payment_status === filter)
    .filter(r =>
      r.primary_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.partner_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.payer_name?.toLowerCase().includes(search.toLowerCase())
    );

  const pendingCount = items.filter(r => r.payment_status === 'pending').length;
  const totalConfirmed = items.filter(r => r.payment_status === 'confirmed').reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-3">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Total Registrations</p>
          <p className="text-xl font-bold text-[#1e293b]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{items.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-3">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Awaiting Payment Check</p>
          <p className="text-xl font-bold text-amber-600" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-3">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Confirmed Revenue</p>
          <p className="text-xl font-bold text-emerald-600" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{totalConfirmed.toLocaleString()} RWF</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, payer..." />
        <div className="flex gap-1">
          {(['all', 'pending', 'confirmed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-colors ${filter === f ? 'bg-[#0A6070] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CreditCard} message="No registrations yet." />
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13px] font-bold text-[#1e293b]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    {r.primary_name}{r.registration_type === 'couple' && r.partner_name ? ` & ${r.partner_name}` : ''}
                  </p>
                  <StatusBadge status={r.payment_status} />
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold capitalize">{r.registration_type}</span>
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">
                  {r.email} · {r.phone} · {fmtDateTime(r.created_at)}
                </p>
                <p className="text-[10px] text-[#64748B] mt-0.5">
                  Paid by <span className="font-semibold">{r.payer_name}</span> · <span className="font-semibold">{r.amount?.toLocaleString()} RWF</span>
                </p>
              </div>
              <div className="flex-shrink-0">
                {r.payment_status === 'confirmed' ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                  </span>
                ) : (
                  <button
                    onClick={() => markPaid(r)}
                    disabled={confirmingId === r.id}
                    className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold disabled:opacity-60"
                  >
                    {confirmingId === r.id ? 'Confirming...' : 'Mark as Paid'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RegistrationsTab() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('event_registrations').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('events').select('id, title').is('deleted_at', null),
    ]).then(([regRes, evtRes]) => {
      setRegistrations(regRes.data ?? []);
      setEvents(evtRes.data ?? []);
      setLoading(false);
    });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('event_registrations').update({ status }).eq('id', id);
    setRegistrations(r => r.map(x => x.id === id ? { ...x, status } : x));
  };

  const eventMap = events.reduce<Record<string, string>>((acc, e) => { acc[e.id] = e.title; return acc; }, {});
  const filtered = registrations.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Search registrations..." />
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={UserCheck} message="No registrations yet." /> : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r.name}</p>
                <p className="text-[10px] text-[#94A3B8]">{r.email} · {eventMap[r.event_id] ?? 'Unknown event'} · {fmtDate(r.created_at)}</p>
              </div>
              <select value={r.status ?? 'pending'} onChange={e => updateStatus(r.id, e.target.value)} className="text-[10px] font-bold rounded-lg border border-slate-200 px-2 py-1 flex-shrink-0">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="attended">Attended</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  const [active, setActive] = useState('calendar');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Events</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Manage events, view calendar, and track registrations.</p>
      </div>
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4">
        {active === 'calendar' && <CalendarTab />}
        {active === 'all' && <AllEventsTab />}
        {active === 'registrations' && <RegistrationsTab />}
        {active === 'training' && <TrainingRegistrationsTab />}
      </div>
    </div>
  );
}
