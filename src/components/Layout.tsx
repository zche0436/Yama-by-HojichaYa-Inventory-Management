import { NavLink, useLocation } from 'react-router-dom';
import { Zap, Package, AlertTriangle, ClipboardCheck, ScrollText } from 'lucide-react';
import { useAuth } from 'zitejs/auth';

const navItems = [
  { to: '/', label: 'Actions', icon: Zap },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/low-stock', label: 'Alerts', icon: AlertTriangle },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/audit', label: 'Audit', icon: ClipboardCheck },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      {/* Top bar — minimal on mobile */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground text-sm">Inventory</span>
          </div>
          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(item => {
              const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="text-xs text-muted-foreground hidden sm:block">
            {user?.firstName || user?.email}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg sm:max-w-4xl">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-sm border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map(item => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
