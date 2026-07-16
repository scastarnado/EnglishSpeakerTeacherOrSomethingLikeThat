import { ReactNode, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, History, Settings, MessageSquare, Sparkles } from 'lucide-react';
import { usePreferences } from '../lib/preferences';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { preferences } = usePreferences();

  const navItems = useMemo(() => [
    { path: '/', label: 'Home', icon: Home },
    { path: '/history', label: 'History', icon: History },
    { path: '/settings', label: 'Settings', icon: Settings },
  ], []);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="relative hidden w-64 shrink-0 border-r border-border bg-card md:block">
        <div className={preferences.density === 'compact' ? 'p-4' : 'p-6'}>
          <div className="mb-8 flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">C1 Speaking Coach</h1>
              <p className="text-xs text-muted-foreground">Practice Tool</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Personalized
            </div>
            <p>
              {preferences.theme === 'system' ? 'System theme' : `${preferences.theme} theme`} · {preferences.density}
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="absolute bottom-0 w-64 p-4 text-xs text-muted-foreground border-t border-border">
          <p>
            Independent practice tool. Not affiliated with Cambridge University Press &
            Assessment.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="border-b border-border bg-card p-3 md:hidden">
          <div className="flex items-center justify-around">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`rounded-md p-2 ${
                  location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                }`}
                aria-label={label}
              >
                <Icon className="h-5 w-5" />
              </Link>
            ))}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
