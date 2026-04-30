import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { api } from '@/lib/api';
import { useUiStore } from '@/store/ui';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const navigate = useNavigate();
  const { communityId } = useParams<{ communityId?: string }>();
  const { setActiveCommunity } = useUiStore();

  const { data } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const { data } = await api.get<{ communities: { id: string; name: string; slug: string; role: string }[] }>(
        '/communities'
      );
      return data.communities;
    },
  });

  useEffect(() => {
    if (communityId) setActiveCommunity(communityId);
  }, [communityId, setActiveCommunity]);

  const cid = communityId || '';
  const currentRole = data?.find(c => c.id === cid)?.role || 'USER';
  const isPrivileged = currentRole === 'ADMIN' || currentRole === 'MODERATOR';

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 border-r bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 z-50">
      <div className="flex flex-col h-full">
        <div className="h-[80px] px-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <img
            alt="Sentinel Platform Logo"
            className="w-12 h-10 drop-shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            src="/logo.png"
          />
          <div>
            <h1 className="text-lg font-black tracking-tighter text-blue-600 dark:text-blue-400">
              Sentinel
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              AI Enterprise Suite
            </p>
          </div>
        </div>

        <div className="px-6 mb-4 mt-6">
          <select
            value={cid}
            onChange={(e) => {
              const id = e.target.value;
              setActiveCommunity(id);
              navigate(isPrivileged ? `/c/${id}/dashboard` : `/c/${id}/feed`);
            }}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value="" disabled>Select Community</option>
            {(data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex-1 space-y-1">
          {!data ? (
            <div className="flex flex-col gap-2 p-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 bg-slate-100 dark:bg-slate-900 rounded-md animate-pulse"></div>
              ))}
            </div>
          ) : (
            <>
              {!isPrivileged && (
                <>
                  <SidebarNavItem to={`/c/${cid}/feed`} icon="dynamic_feed" label="Community Feed" />
                  <SidebarNavItem to={`/c/${cid}/create-post`} icon="add_box" label="Create Post" />
                  <SidebarNavItem to={`/c/${cid}/your-posts`} icon="history_edu" label="Your Posts" />
                  <SidebarNavItem to={`/c/${cid}/saved`} icon="bookmark" label="Saved Posts" />
                  <SidebarNavItem to={`/c/${cid}/profile`} icon="account_circle" label="My Profile" />
                  <div className="pt-4 pb-2 px-6">
                    <div className="h-px bg-slate-200 dark:bg-slate-800" />
                  </div>
                </>
              )}
              {isPrivileged && (
                <>
                  <SidebarNavItem to={`/c/${cid}/dashboard`} icon="dashboard" label="Admin Dashboard" />
                  <SidebarNavItem to={`/c/${cid}/feed`} icon="dynamic_feed" label="Community Feed" />
                  <SidebarNavItem to={`/c/${cid}/queue`} icon="fact_check" label="Moderation Queue" />
                  <SidebarNavItem to={`/c/${cid}/posts`} icon="article" label="Content Management" />
                  <SidebarNavItem to={`/c/${cid}/audit`} icon="analytics" label="System Monitoring" />
                  <SidebarNavItem to={`/c/${cid}/analytics`} icon="monitoring" label="Analytics" />
                  <SidebarNavItem to={`/c/${cid}/trust`} icon="verified_user" label="Trust System" />
                  <SidebarNavItem to={`/c/${cid}/rules`} icon="gavel" label="Rules" />
                </>
              )}
            </>
          )}
        </nav>

        {isPrivileged && (
          <NavLink
            to={`/c/${cid}/settings`}
            className="flex items-center gap-3 px-6 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 font-medium border-t border-slate-200 dark:border-slate-800"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
}

function SidebarNavItem({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-6 py-3 transition-all duration-200 font-medium',
          isActive
            ? 'text-blue-600 dark:text-blue-400 border-l-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
        )
      }
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </NavLink>
  );
}
