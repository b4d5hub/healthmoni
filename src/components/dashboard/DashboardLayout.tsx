import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, LayoutDashboard, Clock, Bell, Settings, LogOut, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import ChatBubble from './ChatBubble';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dashboard/reports', icon: FileText, label: 'Reports' },
  { to: '/dashboard/history', icon: Clock, label: 'History' },
  { to: '/dashboard/alerts', icon: Bell, label: 'Alerts' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-sm">
            <Heart className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">LifePulse</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3 px-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-sm">
              <Heart className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">LifePulse</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 pb-24 md:p-6 lg:p-8 lg:pb-8">
          {children}
        </main>

        {/* Bottom tab bar – mobile only */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-border bg-card/95 backdrop-blur-md safe-bottom lg:hidden">
          {navItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors active:scale-95 ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Floating AI Chat Bubble */}
      <ChatBubble />
    </div>
  );
}
