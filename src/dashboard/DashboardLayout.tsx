import { useState, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth, UserRole, ROLE_LABELS } from '../contexts/AdminAuthContext';
import {
  LayoutDashboard, Globe, Database, Mail, Heart,
  CalendarDays, FolderOpen, Wallet, Users, Settings as SettingsIcon,
  LogOut, ExternalLink, Menu, X, ChevronLeft, ChevronRight, Trash2, ShieldCheck, Send, ClipboardList,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  permission: 'website' | 'database' | 'contact' | 'donations' | 'events' | 'documents' | 'finance' | 'users' | 'settings' | 'trash' | 'subscribers' | 'forms';
}

const navItems: NavItem[] = [
  { label: 'Overview',  path: '/dashboard',            icon: LayoutDashboard, color: 'from-teal-500 to-cyan-400',     permission: 'website' },
  { label: 'Website',   path: '/dashboard/website',     icon: Globe,           color: 'from-blue-500 to-sky-400',      permission: 'website' },
  { label: 'Database',  path: '/dashboard/database',    icon: Database,        color: 'from-violet-500 to-purple-400', permission: 'database' },
  { label: 'Contact',   path: '/dashboard/contact',    icon: Mail,            color: 'from-cyan-500 to-teal-400',     permission: 'contact' },
  { label: 'Donations', path: '/dashboard/donations',   icon: Heart,           color: 'from-red-500 to-rose-400',      permission: 'donations' },
  { label: 'Events',    path: '/dashboard/events',      icon: CalendarDays,    color: 'from-indigo-500 to-blue-400',    permission: 'events' },
  { label: 'Forms',     path: '/dashboard/forms',       icon: ClipboardList,   color: 'from-fuchsia-500 to-pink-400',  permission: 'forms' },
  { label: 'Documents',path: '/dashboard/documents',   icon: FolderOpen,      color: 'from-orange-500 to-amber-400',   permission: 'documents' },
  { label: 'Finance',   path: '/dashboard/finance',     icon: Wallet,          color: 'from-emerald-500 to-green-400', permission: 'finance' },
  { label: 'Subscribers', path: '/dashboard/subscribers', icon: Send,          color: 'from-cyan-500 to-sky-400',       permission: 'subscribers' },
  { label: 'Users',     path: '/dashboard/users',       icon: Users,           color: 'from-rose-500 to-pink-400',      permission: 'users' },
  { label: 'Settings',  path: '/dashboard/settings',    icon: SettingsIcon,    color: 'from-slate-500 to-slate-400',    permission: 'settings' },
  { label: 'Trash',     path: '/dashboard/trash',       icon: Trash2,          color: 'from-red-400 to-rose-400',      permission: 'trash' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { adminEmail, adminRole, displayName, can, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/dashboard/login'); };
  const visibleItems = navItems.filter(n => n.permission === 'website' && n.path === '/dashboard' ? true : can(n.permission));
  const activeItem = visibleItems.find(n => n.path === location.pathname);

  const SidebarInner = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full min-h-0">
      <div className="relative flex-shrink-0 px-4 py-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A6070] via-[#0d7a8c] to-[#1AADA0]" />
        <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
        <div className={`relative z-10 flex items-center gap-2.5 ${collapsed && !mobile ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <img src="/Voice_Of_Preemies_Logo.png" alt="VOP" className="h-5 w-auto brightness-0 invert" />
          </div>
          {(!collapsed || mobile) && (
            <div className="min-w-0">
              <p className="text-white font-bold text-[12px] leading-tight truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Voice of Preemies</p>
              <p className="text-white/55 text-[10px]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Admin Dashboard</p>
            </div>
          )}
          {mobile && (
            <button onClick={() => setMobileOpen(false)} className="ml-auto p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin">
        {visibleItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => mobile && setMobileOpen(false)}
              title={collapsed && !mobile ? item.label : undefined}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 group relative ${collapsed && !mobile ? 'justify-center' : ''} ${active ? 'bg-white shadow-sm text-[#0A6070]' : 'text-[#64748B] hover:text-[#1e293b] hover:bg-white/60'}`}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br ${item.color} ${active ? 'shadow-sm' : 'opacity-65 group-hover:opacity-100'} transition-opacity`}>
                <item.icon className="text-white" style={{ width: 12, height: 12 }} />
              </div>
              {(!collapsed || mobile) && (
                <>
                  <span className="truncate flex-1">{item.label}</span>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-[#0A6070] flex-shrink-0" />}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex-shrink-0 px-2 pb-3 pt-2 border-t border-slate-100 space-y-1">
        <a href="/" target="_blank" rel="noopener noreferrer" title={collapsed && !mobile ? 'Visit Website' : undefined}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] font-medium text-[#64748B] hover:text-[#1e293b] hover:bg-white/60 transition-all ${collapsed && !mobile ? 'justify-center' : ''}`}
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div className="w-6 h-6 flex-shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-br from-slate-400 to-slate-500">
            <ExternalLink className="text-white" style={{ width: 11, height: 11 }} />
          </div>
          {(!collapsed || mobile) && <span className="truncate">Visit Website</span>}
        </a>

        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-gradient-to-r from-[#0A6070]/8 to-[#1AADA0]/8 border border-[#0A6070]/10">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0A6070] to-[#1AADA0] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm">
              {adminEmail.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[#1e293b] truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{displayName}</p>
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-[#0A6070]" />
                <p className="text-[9px] text-[#0A6070] font-semibold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{ROLE_LABELS[adminRole as UserRole] ?? adminRole}</p>
              </div>
            </div>
            <button onClick={handleLogout} title="Sign Out" className="p-1 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0">
              <LogOut style={{ width: 13, height: 13 }} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} title="Sign Out" className="w-full flex items-center justify-center px-2.5 py-2 rounded-xl text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-all">
            <LogOut style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg,#f0f9ff 0%,#e8f4f8 40%,#f0fdf4 100%)' }}>
      <aside className={`hidden lg:flex flex-col flex-shrink-0 h-full relative transition-all duration-300 ${collapsed ? 'w-14' : 'w-56'}`}
        style={{ background: 'rgba(248,250,252,0.97)', backdropFilter: 'blur(16px)', borderRight: '1px solid rgba(148,163,184,0.15)' }}>
        <SidebarInner />
        <button onClick={() => setCollapsed(p => !p)} className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow z-20">
          {collapsed ? <ChevronRight className="w-3 h-3 text-[#64748B]" /> : <ChevronLeft className="w-3 h-3 text-[#64748B]" />}
        </button>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-64 flex flex-col h-full shadow-2xl" style={{ background: 'rgba(248,250,252,0.99)' }}>
            <SidebarInner mobile />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 h-12"
          style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(148,163,184,0.13)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <button className="lg:hidden p-1.5 rounded-xl text-[#64748B] hover:bg-white hover:shadow-sm transition-all flex-shrink-0" onClick={() => setMobileOpen(true)}>
              <Menu className="w-4 h-4" />
            </button>
            {activeItem && (
              <div className="flex items-center gap-2">
                <div className={`hidden sm:flex w-6 h-6 rounded-lg bg-gradient-to-br ${activeItem.color} items-center justify-center shadow-sm flex-shrink-0`}>
                  <activeItem.icon className="text-white" style={{ width: 11, height: 11 }} />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold text-[#0f172a] leading-none" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{activeItem.label}</h2>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5 hidden sm:block" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Voice of Preemies Rwanda</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-xl bg-white/70 border border-slate-100">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#0A6070] to-[#1AADA0] flex items-center justify-center text-white text-[9px] font-bold shadow-sm flex-shrink-0">
                {adminEmail.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block text-[11px] font-medium text-[#334155] truncate max-w-[100px]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{displayName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
