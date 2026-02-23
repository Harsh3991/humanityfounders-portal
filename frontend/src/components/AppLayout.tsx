import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AppSidebar from '@/components/AppSidebar';
import AppHeader from '@/components/AppHeader';
import PageTransition from '@/components/PageTransition';

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex w-full relative">
      <AppSidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen relative overflow-hidden">
        <AppHeader />
        <main className="flex-1 p-6 flex flex-col relative overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
