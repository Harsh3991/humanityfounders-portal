import { Outlet, useLocation } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import AppHeader from '@/components/AppHeader';

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="h-screen w-full relative bg-background overflow-hidden">
      <AppSidebar />
      <div className="ml-56 flex flex-col h-full relative">
        <AppHeader />
        <main className="flex-1 p-6 flex flex-col relative overflow-y-auto overflow-x-hidden">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
