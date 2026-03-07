import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Receipt, Users, Package, FileText, RotateCcw } from 'lucide-react';
import jmpLogo from '@/assets/jmp-logo.png';

interface POSLayoutProps {
  children: ReactNode;
}

const POSLayout = ({ children }: POSLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/billing', label: 'Billing', icon: Receipt },
    { path: '/refunds', label: 'Refund Receipt', icon: RotateCcw },
    { path: '/receipts', label: 'Receipts', icon: FileText },
    { path: '/creditors', label: 'Creditors', icon: Users },
    { path: '/items', label: 'Items', icon: Package },
    { path: '/reports', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <img src={jmpLogo} alt="JMP POS" className="h-12 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-foreground">JMP POS System</h1>
            <p className="text-xs text-muted-foreground">Point of Sale Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Welcome, <span className="font-semibold text-foreground">{user?.username}</span>
          </span>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card">
          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
};

export default POSLayout;
