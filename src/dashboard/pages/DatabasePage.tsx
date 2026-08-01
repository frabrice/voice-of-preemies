import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  Baby, Users as UsersIcon, Stethoscope, HeartPulse, ShieldAlert, ClipboardList, UserCheck,
  Pencil, Trash2, Phone, Mail, Lock,
} from 'lucide-react';
import TabBar from '../components/TabBar';
import TeamManager from './TeamManager';
import VolunteersManager from './VolunteersManager';
import { inp, ta, Lbl, fmtDate, useCrud, StatusBadge, EmptyState, SearchInput, AddButton } from '../components/shared';
import { ImageUploadField } from '../components/UploadField';

const tabs = [
  { id: 'preemies', label: 'Preemies', icon: Baby },
  { id: 'parents', label: 'Parents', icon: UsersIcon },
  { id: 'team', label: 'Team', icon: UserCheck },
  { id: 'board', label: 'Board', icon: ShieldAlert },
  { id: 'nurses', label: 'Nurses', icon: Stethoscope },
  { id: 'health', label: 'Health Workers', icon: HeartPulse },
  { id: 'volunteers', label: 'Volunteers', icon: ClipboardList },
];

function RestrictedNotice() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
        <Lock className="w-5 h-5 text-red-500" />
      </div>
      <p className="text-[14px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Restricted Access</p>
      <p className="text-[11px] text-[#94A3B8] mt-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>This section contains sensitive medical data. Only Super Admins can access it.</p>
    </div>
  );
}

/* ── Preemies Tab ── */
function PreemiesTab() {
  const { adminRole } = useAdminAuth();
  const { items, loading, create, update, softDelete } = useCrud<any>('preemies');
  const [parents, setParents] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    supabase.from('parents').select('id, full_name').is('deleted_at', null).then(({ data }) => setParents(data ?? []));
    supabase.from('nurses').select('id, full_name').is('deleted_at', null).then(({ data }) => setNurses(data ?? []));
  }, []);

  if (adminRole !== 'super_admin') return <RestrictedNotice />;

  const filtered = items.filter(p => p.first_name?.toLowerCase().includes(search.toLowerCase()) || p.nicu_hospital?.toLowerCase().includes(search.toLowerCase()));
  const blank = { first_name: '', date_of_birth: '', gestational_age_weeks: 0, birth_weight_grams: 0, sex: 'M', nicu_hospital: '', admission_date: '', discharge_date: '', status: 'admitted', parent_id: '', assigned_nurse_id: '', medical_notes: '', photo_url: '' };

  const save = async () => {
    if (editing.id) await update(editing.id, editing);
    else await create(editing);
    setEditing(null); setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search preemies..." />
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Preemie" />
      </div>

      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Lbl t="First Name" /><input value={editing.first_name ?? ''} onChange={e => setEditing({ ...editing, first_name: e.target.value })} className={inp} /></div>
            <div><Lbl t="Date of Birth" /><input type="date" value={editing.date_of_birth ?? ''} onChange={e => setEditing({ ...editing, date_of_birth: e.target.value })} className={inp} /></div>
            <div><Lbl t="Gestational Age (weeks)" /><input type="number" value={editing.gestational_age_weeks ?? 0} onChange={e => setEditing({ ...editing, gestational_age_weeks: +e.target.value })} className={inp} /></div>
            <div><Lbl t="Birth Weight (g)" /><input type="number" value={editing.birth_weight_grams ?? 0} onChange={e => setEditing({ ...editing, birth_weight_grams: +e.target.value })} className={inp} /></div>
            <div><Lbl t="Sex" /><select value={editing.sex ?? 'M'} onChange={e => setEditing({ ...editing, sex: e.target.value })} className={inp}><option value="M">Male</option><option value="F">Female</option></select></div>
            <div><Lbl t="NICU Hospital" /><input value={editing.nicu_hospital ?? ''} onChange={e => setEditing({ ...editing, nicu_hospital: e.target.value })} className={inp} /></div>
            <div><Lbl t="Admission Date" /><input type="date" value={editing.admission_date ?? ''} onChange={e => setEditing({ ...editing, admission_date: e.target.value })} className={inp} /></div>
            <div><Lbl t="Discharge Date" /><input type="date" value={editing.discharge_date ?? ''} onChange={e => setEditing({ ...editing, discharge_date: e.target.value })} className={inp} /></div>
            <div><Lbl t="Status" /><select value={editing.status ?? 'admitted'} onChange={e => setEditing({ ...editing, status: e.target.value })} className={inp}><option value="admitted">Admitted</option><option value="discharged">Discharged</option><option value="deceased">Deceased</option><option value="transferred">Transferred</option></select></div>
            <div><Lbl t="Parent" /><select value={editing.parent_id ?? ''} onChange={e => setEditing({ ...editing, parent_id: e.target.value || null })} className={inp}><option value="">—</option>{parents.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
            <div><Lbl t="Assigned Nurse" /><select value={editing.assigned_nurse_id ?? ''} onChange={e => setEditing({ ...editing, assigned_nurse_id: e.target.value || null })} className={inp}><option value="">—</option>{nurses.map(n => <option key={n.id} value={n.id}>{n.full_name}</option>)}</select></div>
          </div>
          <div><Lbl t="Medical Notes" /><textarea value={editing.medical_notes ?? ''} onChange={e => setEditing({ ...editing, medical_notes: e.target.value })} className={ta} /></div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={Baby} message="No preemies recorded yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.first_name}</p>
                  <p className="text-[10px] text-[#94A3B8]">{fmtDate(p.date_of_birth)} · {p.gestational_age_weeks}w · {p.birth_weight_grams}g</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-[10px] text-[#64748B]">{p.nicu_hospital}</p>
              <div className="flex gap-1 mt-2">
                <button onClick={() => { setEditing({ ...p }); setShowForm(true); }} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => softDelete(p.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Parents Tab ── */
function ParentsTab() {
  const { adminRole } = useAdminAuth();
  const { items, loading, create, update, softDelete } = useCrud<any>('parents');
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  if (adminRole !== 'super_admin') return <RestrictedNotice />;

  const filtered = items.filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase()));
  const blank = { full_name: '', phone: '', email: '', district: '', relationship: 'mother', preferred_language: 'en', number_of_preemies: 1, support_enrolled: false, notes: '' };

  const save = async () => {
    if (editing.id) await update(editing.id, editing);
    else await create(editing);
    setEditing(null); setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search parents..." />
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Parent" />
      </div>
      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Lbl t="Full Name" /><input value={editing.full_name ?? ''} onChange={e => setEditing({ ...editing, full_name: e.target.value })} className={inp} /></div>
            <div><Lbl t="Phone" /><input value={editing.phone ?? ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} className={inp} /></div>
            <div><Lbl t="Email" /><input value={editing.email ?? ''} onChange={e => setEditing({ ...editing, email: e.target.value })} className={inp} /></div>
            <div><Lbl t="District" /><input value={editing.district ?? ''} onChange={e => setEditing({ ...editing, district: e.target.value })} className={inp} /></div>
            <div><Lbl t="Relationship" /><select value={editing.relationship ?? 'mother'} onChange={e => setEditing({ ...editing, relationship: e.target.value })} className={inp}><option value="mother">Mother</option><option value="father">Father</option><option value="guardian">Guardian</option></select></div>
            <div><Lbl t="Preferred Language" /><select value={editing.preferred_language ?? 'en'} onChange={e => setEditing({ ...editing, preferred_language: e.target.value })} className={inp}><option value="en">English</option><option value="rw">Kinyarwanda</option><option value="fr">French</option></select></div>
            <div><Lbl t="Number of Preemies" /><input type="number" value={editing.number_of_preemies ?? 1} onChange={e => setEditing({ ...editing, number_of_preemies: +e.target.value })} className={inp} /></div>
            <div><Lbl t="Support Enrolled" /><select value={editing.support_enrolled ? 'yes' : 'no'} onChange={e => setEditing({ ...editing, support_enrolled: e.target.value === 'yes' })} className={inp}><option value="no">No</option><option value="yes">Yes</option></select></div>
          </div>
          <div><Lbl t="Notes" /><textarea value={editing.notes ?? ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} className={ta} /></div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={UsersIcon} message="No parents recorded yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.full_name}</p>
                  <p className="text-[10px] text-[#94A3B8] capitalize">{p.relationship} · {p.district}</p>
                </div>
                {p.support_enrolled && <StatusBadge status="active" />}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                {p.phone && <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{p.phone}</span>}
                {p.email && <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{p.email}</span>}
              </div>
              <p className="text-[10px] text-[#94A3B8] mt-1">{p.number_of_preemies} preemie(s)</p>
              <div className="flex gap-1 mt-2">
                <button onClick={() => { setEditing({ ...p }); setShowForm(true); }} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => softDelete(p.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Board Tab ── */
function BoardTab() {
  const { items, loading, create, update, softDelete } = useCrud<any>('board_members');
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = items.filter(b => b.full_name?.toLowerCase().includes(search.toLowerCase()));
  const blank = { full_name: '', position: 'member', bio: '', photo_url: '', email: '', phone: '', term_start: '', term_end: '', active: true, sort_order: 0 };

  const save = async () => {
    if (editing.id) await update(editing.id, editing);
    else await create(editing);
    setEditing(null); setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search board members..." />
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Member" />
      </div>
      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Lbl t="Full Name" /><input value={editing.full_name ?? ''} onChange={e => setEditing({ ...editing, full_name: e.target.value })} className={inp} /></div>
            <div><Lbl t="Position" /><input value={editing.position ?? ''} onChange={e => setEditing({ ...editing, position: e.target.value })} className={inp} /></div>
            <ImageUploadField label="Photo" value={editing.photo_url ?? ''} onChange={url => setEditing({ ...editing, photo_url: url })} folder="voice-of-preemies/board" />
            <div><Lbl t="Email" /><input value={editing.email ?? ''} onChange={e => setEditing({ ...editing, email: e.target.value })} className={inp} /></div>
            <div><Lbl t="Phone" /><input value={editing.phone ?? ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} className={inp} /></div>
            <div><Lbl t="Term Start" /><input type="date" value={editing.term_start ?? ''} onChange={e => setEditing({ ...editing, term_start: e.target.value })} className={inp} /></div>
            <div><Lbl t="Term End" /><input type="date" value={editing.term_end ?? ''} onChange={e => setEditing({ ...editing, term_end: e.target.value })} className={inp} /></div>
            <div><Lbl t="Active" /><select value={editing.active ? 'yes' : 'no'} onChange={e => setEditing({ ...editing, active: e.target.value === 'yes' })} className={inp}><option value="yes">Yes</option><option value="no">No</option></select></div>
            <div><Lbl t="Sort Order" /><input type="number" value={editing.sort_order ?? 0} onChange={e => setEditing({ ...editing, sort_order: +e.target.value })} className={inp} /></div>
          </div>
          <div><Lbl t="Bio" /><textarea value={editing.bio ?? ''} onChange={e => setEditing({ ...editing, bio: e.target.value })} className={ta} /></div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={ShieldAlert} message="No board members yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-2.5">
                {b.photo_url ? <img src={b.photo_url} alt={b.full_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-[14px] font-bold text-slate-600 flex-shrink-0">{b.full_name?.charAt(0)}</div>}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{b.full_name}</p>
                  <p className="text-[10px] text-[#0A6070] font-semibold">{b.position}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5 line-clamp-2">{b.bio}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <StatusBadge status={b.active ? 'active' : 'draft'} />
                <div className="flex gap-1">
                  <button onClick={() => { setEditing({ ...b }); setShowForm(true); }} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => softDelete(b.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Nurses Tab ── */
function NursesTab() {
  const { adminRole } = useAdminAuth();
  const { items, loading, create, update, softDelete } = useCrud<any>('nurses');
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  if (adminRole !== 'super_admin') return <RestrictedNotice />;

  const filtered = items.filter(n => n.full_name?.toLowerCase().includes(search.toLowerCase()) || n.hospital?.toLowerCase().includes(search.toLowerCase()));
  const blank = { full_name: '', hospital: '', department: '', phone: '', email: '', certification: '', years_experience: 0, status: 'active', notes: '' };

  const save = async () => {
    if (editing.id) await update(editing.id, editing);
    else await create(editing);
    setEditing(null); setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search nurses..." />
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Nurse" />
      </div>
      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Lbl t="Full Name" /><input value={editing.full_name ?? ''} onChange={e => setEditing({ ...editing, full_name: e.target.value })} className={inp} /></div>
            <div><Lbl t="Hospital" /><input value={editing.hospital ?? ''} onChange={e => setEditing({ ...editing, hospital: e.target.value })} className={inp} /></div>
            <div><Lbl t="Department" /><input value={editing.department ?? ''} onChange={e => setEditing({ ...editing, department: e.target.value })} className={inp} /></div>
            <div><Lbl t="Phone" /><input value={editing.phone ?? ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} className={inp} /></div>
            <div><Lbl t="Email" /><input value={editing.email ?? ''} onChange={e => setEditing({ ...editing, email: e.target.value })} className={inp} /></div>
            <div><Lbl t="Certification" /><input value={editing.certification ?? ''} onChange={e => setEditing({ ...editing, certification: e.target.value })} className={inp} /></div>
            <div><Lbl t="Years of Experience" /><input type="number" value={editing.years_experience ?? 0} onChange={e => setEditing({ ...editing, years_experience: +e.target.value })} className={inp} /></div>
            <div><Lbl t="Status" /><select value={editing.status ?? 'active'} onChange={e => setEditing({ ...editing, status: e.target.value })} className={inp}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
          <div><Lbl t="Notes" /><textarea value={editing.notes ?? ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} className={ta} /></div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={Stethoscope} message="No nurses recorded yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(n => (
            <div key={n.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{n.full_name}</p>
                  <p className="text-[10px] text-[#0A6070] font-semibold">{n.hospital}</p>
                </div>
                <StatusBadge status={n.status} />
              </div>
              <p className="text-[10px] text-[#64748B]">{n.department} · {n.years_experience}y exp</p>
              {n.phone && <p className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-1"><Phone className="w-2.5 h-2.5" />{n.phone}</p>}
              <div className="flex gap-1 mt-2">
                <button onClick={() => { setEditing({ ...n }); setShowForm(true); }} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => softDelete(n.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Health Workers Tab ── */
function HealthWorkersTab() {
  const { adminRole } = useAdminAuth();
  const { items, loading, create, update, softDelete } = useCrud<any>('health_workers');
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  if (adminRole !== 'super_admin') return <RestrictedNotice />;

  const filtered = items.filter(h => h.full_name?.toLowerCase().includes(search.toLowerCase()) || h.organization?.toLowerCase().includes(search.toLowerCase()));
  const blank = { full_name: '', role: '', organization: '', phone: '', email: '', district: '', status: 'active', notes: '' };

  const save = async () => {
    if (editing.id) await update(editing.id, editing);
    else await create(editing);
    setEditing(null); setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search health workers..." />
        <AddButton onClick={() => { setEditing({ ...blank }); setShowForm(true); }} label="Add Worker" />
      </div>
      {showForm && editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Lbl t="Full Name" /><input value={editing.full_name ?? ''} onChange={e => setEditing({ ...editing, full_name: e.target.value })} className={inp} /></div>
            <div><Lbl t="Role" /><input value={editing.role ?? ''} onChange={e => setEditing({ ...editing, role: e.target.value })} className={inp} /></div>
            <div><Lbl t="Organization" /><input value={editing.organization ?? ''} onChange={e => setEditing({ ...editing, organization: e.target.value })} className={inp} /></div>
            <div><Lbl t="Phone" /><input value={editing.phone ?? ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} className={inp} /></div>
            <div><Lbl t="Email" /><input value={editing.email ?? ''} onChange={e => setEditing({ ...editing, email: e.target.value })} className={inp} /></div>
            <div><Lbl t="District" /><input value={editing.district ?? ''} onChange={e => setEditing({ ...editing, district: e.target.value })} className={inp} /></div>
            <div><Lbl t="Status" /><select value={editing.status ?? 'active'} onChange={e => setEditing({ ...editing, status: e.target.value })} className={inp}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
          <div><Lbl t="Notes" /><textarea value={editing.notes ?? ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} className={ta} /></div>
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0A6070] text-white text-[11px] font-semibold">Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-[12px] text-[#94A3B8] text-center py-8">Loading...</p> : filtered.length === 0 ? <EmptyState icon={HeartPulse} message="No health workers recorded yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(h => (
            <div key={h.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <p className="text-[13px] font-bold text-[#1e293b]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{h.full_name}</p>
                  <p className="text-[10px] text-[#0A6070] font-semibold">{h.role}</p>
                </div>
                <StatusBadge status={h.status} />
              </div>
              <p className="text-[10px] text-[#64748B]">{h.organization} · {h.district}</p>
              {h.phone && <p className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-1"><Phone className="w-2.5 h-2.5" />{h.phone}</p>}
              <div className="flex gap-1 mt-2">
                <button onClick={() => { setEditing({ ...h }); setShowForm(true); }} className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0A6070] hover:bg-slate-50"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => softDelete(h.id)} className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DatabasePage() {
  const [active, setActive] = useState('preemies');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[#0f172a]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Database</h1>
        <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Beneficiary records, team, board, and medical personnel.</p>
      </div>
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="bg-white/60 rounded-2xl border border-slate-100 shadow-sm p-4">
        {active === 'preemies' && <PreemiesTab />}
        {active === 'parents' && <ParentsTab />}
        {active === 'team' && <TeamManager />}
        {active === 'board' && <BoardTab />}
        {active === 'nurses' && <NursesTab />}
        {active === 'health' && <HealthWorkersTab />}
        {active === 'volunteers' && <VolunteersManager />}
      </div>
    </div>
  );
}
