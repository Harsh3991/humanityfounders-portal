import { useAuth } from '@/contexts/AuthContext';

export default function AppHeader() {
  const { user } = useAuth();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-40">
      <div />
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
          {user?.fullName?.charAt(0)}
        </div>
      </div>
    </header>
  );
}
