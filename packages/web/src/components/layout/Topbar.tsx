import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { useParams } from 'react-router-dom';

const ELITE_AVATARS: Record<string, string> = {
  'Admin': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
  'Pratham Bisht': 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
  'Pratham-Admin': 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop',
  'Member': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
  'Moderator': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
};

function getEliteAvatar(name: string) {
  return ELITE_AVATARS[name] || ELITE_AVATARS[name?.replace('-Admin', '')] || null;
}

export function Topbar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const { communityId } = useParams<{ communityId?: string }>();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearAuth();
    navigate('/login', { replace: true });
  }

  const avatarUrl = user?.avatarUrl || getEliteAvatar(user?.name || '');
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="flex justify-between items-center h-[80px] px-8 w-full bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:bg-white transition-all placeholder:text-slate-400 font-inter"
            placeholder="Search moderation logs or users..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="text-slate-400 hover:text-blue-600 transition-colors">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>
        <button className="text-slate-400 hover:text-blue-600 transition-colors">
          <span className="material-symbols-outlined text-[22px]">help</span>
        </button>

        {/* Profile Menu */}
        <div className="relative pl-6 border-l border-slate-100" ref={ref}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden md:block">
              <p className="text-[13px] font-bold text-slate-900 font-inter leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] font-inter">
                {user?.globalRole || 'User'}
              </p>
            </div>
            {/* Avatar */}
            <div className="h-10 w-10 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-900 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user?.name || 'Avatar'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-black">{initials}</span>
              )}
            </div>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">
              {open ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {/* Dropdown Modal */}
          {open && (
            <div className="absolute right-0 top-[calc(100%+12px)] w-72 bg-white rounded-[28px] shadow-2xl shadow-slate-900/10 border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* User header */}
              <div className="p-5 flex items-center gap-4 border-b border-slate-50">
                <div className="h-14 w-14 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center shrink-0 shadow-lg">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user?.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-black">{initials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{user?.email}</p>
                  <span className="mt-1 inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-blue-100">
                    {user?.globalRole}
                  </span>
                </div>
              </div>

              {/* Menu items */}
              <div className="p-3 space-y-1">
                <DropdownItem
                  icon="account_circle"
                  label="My Profile"
                  onClick={() => { setOpen(false); navigate(`/c/${communityId}/profile`); }}
                />
                <DropdownItem
                  icon="settings"
                  label="Settings"
                  onClick={() => { setOpen(false); navigate(`/c/${communityId}/settings`); }}
                />
                <div className="h-px bg-slate-50 my-2" />
                <DropdownItem
                  icon="logout"
                  label="Sign out"
                  danger
                  onClick={handleLogout}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DropdownItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
        danger
          ? 'text-red-500 hover:bg-red-50'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className={`material-symbols-outlined text-[20px] ${danger ? 'text-red-400' : 'text-slate-400'}`}>
        {icon}
      </span>
      {label}
    </button>
  );
}
