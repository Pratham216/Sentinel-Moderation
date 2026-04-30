import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const { accessToken } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-60 flex flex-col min-h-screen min-w-0">
        <Topbar />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function NavItem({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--foreground))]'
            : 'text-[hsl(var(--foreground)/0.75)] hover:bg-[hsl(var(--muted))]'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
