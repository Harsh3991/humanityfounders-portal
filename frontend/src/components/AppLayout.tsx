import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import AppHeader from '@/components/AppHeader';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="h-screen w-full relative bg-background overflow-hidden">
      <AppSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className={`flex flex-col h-full relative transition-all duration-200 ${collapsed ? 'md:ml-16' : 'md:ml-56'}`}>
        <AppHeader onMobileMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 flex flex-col relative overflow-y-auto overflow-x-hidden">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
