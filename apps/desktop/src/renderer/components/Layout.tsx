import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { LayoutDashboard, Calendar, User, LogOut, Bell, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../stores/theme-store';

const navItems = [
  { to: '/board', label: 'Board', icon: LayoutDashboard },
  { to: '/planner', label: 'Planner', icon: Calendar },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function Layout() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { isDark, toggle } = useThemeStore();

  return (
    <div className="flex flex-col h-screen bg-bg">
      {/* Top Navbar — frosted glass */}
      <header className="drag-region h-[60px] flex items-center justify-between pl-20 pr-6 border-b border-border z-50 shrink-0"
        style={{
          background: isDark ? 'rgba(26,23,38,0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)', boxShadow: '0 4px 16px rgba(124,92,252,0.3)' }}
          >
            ST
          </div>
          <span className="text-lg font-extrabold" style={{
            background: 'linear-gradient(135deg, #7C5CFC, #A78BFA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Smart Todo
          </span>
        </div>

        {/* Center: Nav tabs */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'text-text-muted hover:bg-bg-hover hover:text-text'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: User + Logout */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-text-dim hover:bg-bg-hover hover:text-accent transition-all duration-200"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-[34px] h-[34px] rounded-full bg-accent-soft flex items-center justify-center text-accent text-xs font-bold">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-text-muted hidden sm:block">{user.name}</span>
            </div>
          )}
          <button
            onClick={logout}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-text-dim hover:bg-bg-hover hover:text-danger transition-all duration-200"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
