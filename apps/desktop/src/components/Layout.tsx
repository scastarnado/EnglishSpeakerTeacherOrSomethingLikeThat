import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, History, Settings, MessageSquare } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/history', label: 'History', icon: History },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
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
                  location.pathname === path
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
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
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
