import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CalendarDays, Eye, Users, LogOut, ChevronLeft, ChevronRight, X, CalendarClock, ClipboardList } from 'lucide-react';
import logo from '../assets/logo.png';

const navItems = [
  { label: 'Dashboard',        path: '/dashboard',        icon: LayoutDashboard, adminOnly: false },
  { label: 'Projects',         path: '/projects',         icon: FolderKanban,    adminOnly: false },
  { label: 'Attendance',       path: '/attendance',       icon: CalendarDays,    adminOnly: false },
  { label: 'Leaves',           path: '/leaves',           icon: CalendarClock,   adminOnly: false },
  { label: 'Task Oversight',   path: '/task-oversight',   icon: Eye,             adminOnly: true },
  { label: 'People',           path: '/people',           icon: Users,           adminOnly: true },
  { label: 'Leave Management', path: '/leave-management', icon: ClipboardList,   adminOnly: true },
];

interface AppSidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navLinkClass = (isActive: boolean) =>
  `flex items-center gap-3 px-3 rounded text-sm transition-colors ${
    isActive
      ? 'bg-sidebar-accent text-sidebar-primary'
      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
  }`;

export default function AppSidebar({ collapsed, setCollapsed, mobileOpen, onMobileClose }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const filtered = navItems.filter((item) => !item.adminOnly || user?.role === 'admin');

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex-col z-50 transition-all duration-200 hidden md:flex ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-0.5">
              <img src={logo} alt="HF Logo" className="w-8 h-8 object-contain drop-shadow-md" />
              <span className="font-heading italic text-[#d4af37] text-xl truncate tracking-wide mt-1">HF Portal</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground hover:text-foreground p-1 ml-auto"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {filtered.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `${navLinkClass(isActive)} py-2.5`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {!collapsed && user && (
            <div className="mb-2 px-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.fullName}</p>
              <p className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold mt-0.5">{user.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-0.5">
            <img src={logo} alt="HF Logo" className="w-8 h-8 object-contain drop-shadow-md" />
            <span className="font-heading italic text-[#d4af37] text-xl truncate tracking-wide mt-1">HF Portal</span>
          </div>
          <button onClick={onMobileClose} className="text-sidebar-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {filtered.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={({ isActive }) => `${navLinkClass(isActive)} py-3`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {user && (
            <div className="mb-2 px-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.fullName}</p>
              <p className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold mt-0.5">{user.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-3 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
