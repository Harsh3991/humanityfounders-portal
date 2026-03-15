import { useAuth } from '@/contexts/AuthContext';
import { Menu } from 'lucide-react';

interface AppHeaderProps {
  onMobileMenuToggle: () => void;
}

export default function AppHeader({ onMobileMenuToggle }: AppHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden p-2 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden md:block" />
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
          {user?.fullName?.charAt(0)}
        </div>
      </div>
    </header>
  );
}
