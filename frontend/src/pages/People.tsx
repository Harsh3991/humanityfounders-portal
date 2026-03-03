import { useState, useEffect, useRef } from 'react';
import axiosInstance from '../lib/axiosInstance';
import { Plus, Search, X, Loader2, AlertTriangle, Users, ArrowRight, FileText, CheckCircle2, LayoutDashboard, Clock, FileBadge, Eye, EyeOff, FolderKanban, ListChecks, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, LogIn, LogOut, Coffee, FileCheck, Shield, Activity, Timer, Briefcase, ClipboardList } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  phone?: string;
  bank?: string;
  accountNo?: string;
  ifscCode?: string;
  startDate?: string;
  onboarding?: any;
}

const ROLES = ["admin", "hr", "manager", "employee"];
const DEPARTMENTS = ["Engineering", "Marketing", "Sales", "Finance", "Operations", "Design", "Management"];

const STATUS_STYLES = {
  active: 'text-emerald-400 bg-emerald-950/30 border-emerald-800/50',
  pending: 'text-amber-400 bg-amber-950/30 border-amber-800/50',
  inactive: 'text-zinc-400 bg-zinc-800/50 border-zinc-700/50'
};

export default function People() {
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // View / Edit Panel State
  const [selected, setSelected] = useState<Employee | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'overview' | 'edit'>('overview');
  const [overviewTab, setOverviewTab] = useState<'personal' | 'work'>('personal');
  const [editForm, setEditForm] = useState<Partial<Employee>>({});

  // Connected Dashboard State
  const [profileTasks, setProfileTasks] = useState<any[]>([]);
  const [profileAttendance, setProfileAttendance] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Work Log State
  const [worklog, setWorklog] = useState<any>(null);
  const [loadingWorklog, setLoadingWorklog] = useState(false);
  const [worklogMonth, setWorklogMonth] = useState(new Date().getMonth() + 1);
  const [worklogYear, setWorklogYear] = useState(new Date().getFullYear());
  const [worklogSection, setWorklogSection] = useState<'overview' | 'projects' | 'tasks' | 'attendance' | 'audit'>('overview');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', email: '', password: '', role: 'employee', department: 'Engineering' });
  const [addingError, setAddingError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sensitive field reveal state — track which fields are currently shown
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});

  const toggleReveal = (field: string) =>
    setRevealedFields(prev => ({ ...prev, [field]: !prev[field] }));

  // Reset revealed fields when a new profile is opened
  const resetRevealedFields = () => setRevealedFields({});

  // Ref for closing the date picker popover on outside click
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDatePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/users');
      const usersData = res.data.data.map((u: any) => ({
        id: u._id,
        name: u.fullName,
        role: u.role,
        department: u.department || 'Unassigned',
        email: u.email,
        status: u.status
      }));
      setEmployees(usersData);
    } catch (err) {
      console.error("Error fetching employees", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    try {
      setPanelOpen(true);
      setPanelMode('overview');
      setOverviewTab('personal');
      setLoadingProfile(true);
      resetRevealedFields(); // Hide sensitive data when switching profiles

      // Parallelize fetches to avoid waterfall delay
      const [uRes, tasksRes, attRes] = await Promise.all([
        axiosInstance.get(`/users/${id}`).catch(() => null),
        axiosInstance.get(`/tasks/user/${id}`).catch(() => null),
        axiosInstance.get(`/attendance/admin/${id}/history`).catch(() => null)
      ]);

      if (uRes?.data?.data) {
        const u = uRes.data.data;
        const emp: Employee = {
          id: u._id,
          name: u.fullName,
          role: u.role,
          department: u.department || 'Unassigned',
          email: u.email,
          status: u.status,
          phone: u.phone || '',
          bank: u.onboarding?.bankName || '',
          accountNo: u.onboarding?.accountNumber || '',
          ifscCode: u.onboarding?.ifscCode || '',
          startDate: u.startDate ? u.startDate.split('T')[0] : '',
          onboarding: u.onboarding || {}
        };
        setSelected(emp);
        setEditForm(emp);
      }

      if (tasksRes?.data?.data) {
        setProfileTasks(tasksRes.data.data.flatMap((g: any) => g.tasks) || []);
      } else {
        setProfileTasks([]);
      }

      if (attRes?.data?.data?.stats) {
        setProfileAttendance(attRes.data.data.stats);
      } else {
        setProfileAttendance(null);
      }

    } catch (err) {
      console.error("Error fetching employee details", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => {
      setSelected(null);
      setProfileTasks([]);
      setProfileAttendance(null);
      setWorklog(null);
      setWorklogSection('overview');
    }, 500);
  };

  const fetchWorklog = async (userId: string, month?: number, year?: number) => {
    setLoadingWorklog(true);
    try {
      const m = month || worklogMonth;
      const y = year || worklogYear;
      const res = await axiosInstance.get(`/users/${userId}/worklog?month=${m}&year=${y}`);
      if (res?.data?.data) {
        setWorklog(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching worklog', err);
    } finally {
      setLoadingWorklog(false);
    }
  };

  const handleWorklogMonthChange = (direction: 'prev' | 'next') => {
    let m = worklogMonth;
    let y = worklogYear;
    if (direction === 'prev') {
      m -= 1;
      if (m < 1) { m = 12; y -= 1; }
    } else {
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    setWorklogMonth(m);
    setWorklogYear(y);
    if (selected) fetchWorklog(selected.id, m, y);
  };

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleViewDocument = async (docType: 'aadhaarCard' | 'panCard') => {
    if (!selected?.id) return;
    try {
      const response = await axiosInstance.get(`/users/${selected.id}/document/${docType}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      console.error("Failed to fetch document blob", e);
      alert("Could not load the document. It might be missing or corrupted.");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingError('');
    setIsSubmitting(true);
    try {
      await axiosInstance.post('/auth/register', addForm);
      setShowAddModal(false);
      setAddForm({ fullName: '', email: '', password: '', role: 'employee', department: 'Engineering' });
      fetchEmployees();
    } catch (err: any) {
      setAddingError(err.response?.data?.message || 'Failed to add employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSubmitting(true);
    try {
      const payload = {
        fullName: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        role: editForm.role,
        department: editForm.department,
        status: editForm.status,
        startDate: editForm.startDate,
        bankName: editForm.bank,
        accountNumber: editForm.accountNo,
        ifscCode: editForm.ifscCode
      };
      await axiosInstance.put(`/users/${selected.id}`, payload);
      setPanelMode('overview');
      fetchEmployees();
      // Refetch specific profile silently
      handleSelect(selected.id);
    } catch (err: any) {
      console.error("Failed to update employee", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await axiosInstance.delete(`/users/${selected.id}`);
      closePanel();
      setShowDeleteConfirm(false);
      fetchEmployees();
    } catch (err: any) {
      console.error("Failed to delete", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase())
  );

  // Inline styles for the "Etched Metal" look
  const brushedMetalBg = {
    backgroundColor: '#0f0f0f',
    backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), 
                      linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)`,
    backgroundSize: '20px 20px'
  };

  const goldTextGradient = {
    background: 'linear-gradient(to bottom, #fcf6ba 0%, #d4af37 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-16 text-zinc-400 font-sans selection:bg-[#d4af37]/30">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-zinc-800/50">
        <div className="space-y-2">
          <h1 className="text-4xl font-serif italic tracking-tight pb-1 leading-normal" style={goldTextGradient}>Directory</h1>
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-12 bg-[#d4af37]/40" />
            <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-500">Manage Personnel & Roles</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="relative group overflow-hidden px-10 py-4 bg-gradient-to-b from-[#d4af37] to-[#aa8a2e] text-black text-[11px] font-bold uppercase tracking-[0.2em] rounded-sm transition-all hover:shadow-[0_0_25px_rgba(212,175,55,0.3)] shrink-0"
        >
          <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
          <div className="flex items-center gap-2 relative z-10">
            <Plus className="w-4 h-4 stroke-[3]" /> Add Employee
          </div>
        </button>
      </div>

      {/* Main Content Area */}
      <div
        style={brushedMetalBg}
        className="border border-zinc-800/80 rounded-sm shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col min-h-[600px]"
      >

        {/* Search Bar */}
        <div className="p-8 bg-black/40 backdrop-blur-xl border-b border-zinc-800/60 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]/50" />
            <input
              placeholder="Search directory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/50 border border-zinc-800 text-zinc-200 text-sm rounded-sm pl-12 pr-4 py-4 focus:outline-none focus:border-[#d4af37]/40 transition-all placeholder:text-zinc-700 font-light"
            />
          </div>
          <div className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase italic hidden sm:block">
            Displaying {filtered.length} active records
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-black/20">
                {['Name', 'Role', 'Department', 'Status', 'Actions'].map((head) => (
                  <th key={head} className="px-10 py-6 text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-black border-b border-zinc-800/80">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#d4af37]/40 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center flex flex-col items-center justify-center">
                    <Users className="w-12 h-12 text-zinc-800 mb-4" />
                    <span className="text-zinc-500 italic text-sm">No personnel found.</span>
                  </td>
                </tr>
              ) : filtered.map((e) => (
                <tr key={e.id} className="group hover:bg-[#d4af37]/[0.02] transition-colors">
                  <td className="px-10 py-6">
                    <div
                      onClick={() => handleSelect(e.id)}
                      className="flex items-center gap-4 cursor-pointer group/name"
                    >
                      <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#d4af37] font-serif italic text-lg shadow-inner group-hover/name:border-[#d4af37]/50 transition-colors">
                        {e.name.charAt(0)}
                      </div>
                      <span className="text-zinc-200 font-medium tracking-wide group-hover/name:text-[#d4af37] transition-colors">{e.name}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{e.role}</span>
                  </td>
                  <td className="px-10 py-6 text-zinc-500 italic font-light">{e.department}</td>
                  <td className="px-10 py-6">
                    <span className={`text-[9px] px-3 py-1 rounded-full uppercase tracking-tighter font-bold border ${STATUS_STYLES[e.status]}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button
                      onClick={() => handleSelect(e.id)}
                      className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 hover:text-[#d4af37] transition-all"
                    >
                      View Profile <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Overlay */}
      <div
        className={`fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${panelOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={closePanel}
      />

      {/* Slide Panel structure */}
      <div className={`fixed top-0 right-0 h-screen w-full md:w-[calc(100vw-14rem)] max-w-5xl bg-[#0a0a0a] border-l border-zinc-800/60 shadow-2xl z-[90] transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {selected && (
          <div className="flex flex-col h-full relative">

            {/* Header */}
            <div className="px-8 py-6 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-[#18181b]/50">
              <div className="flex items-center gap-4">
                <button onClick={closePanel} className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 hover:bg-zinc-800/50 rounded-full border border-transparent hover:border-zinc-700">
                  <ArrowRight className="w-5 h-5" />
                </button>
                <div className="h-8 w-px bg-zinc-800" />
                <div>
                  <h3 className="text-2xl font-light text-zinc-100 truncate">
                    {panelMode === 'edit' ? `Edit ${selected.name}` : selected.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-[#d4af37] font-semibold uppercase tracking-widest">{selected.role}</span>
                    <span className="text-zinc-600 text-[10px]">•</span>
                    <span className="text-xs text-zinc-400">{selected.department}</span>
                  </div>
                </div>
              </div>

              {/* Context Actions Header Toggles */}
              {panelMode === 'overview' && (
                <button onClick={() => setPanelMode('edit')} className="px-5 py-2 text-xs uppercase tracking-widest bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold rounded-md hover:bg-zinc-700 hover:text-white transition-colors">
                  Edit Profile
                </button>
              )}
            </div>

            {panelMode === 'edit' ? (
              // FORM MODE UI
              <form onSubmit={handleUpdateEmployee} className="flex-1 overflow-y-auto p-8 flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 flex-1">

                  {/* Work Identity */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-semibold text-[#d4af37] uppercase tracking-widest border-b border-zinc-800 pb-3">Work Identity Settings</h4>
                    <div className="space-y-5">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">Full Name</label>
                        <input className="w-full text-sm bg-[#18181b] border border-zinc-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 transition-colors" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">Email</label>
                        <input type="email" className="w-full text-sm bg-[#18181b] border border-zinc-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 transition-colors" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">Phone</label>
                        <input type="tel" className="w-full text-sm bg-[#18181b] border border-zinc-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 transition-colors" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">Role</label>
                          <select className="w-full text-sm bg-[#18181b] border border-zinc-800 rounded-md px-3 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200" value={editForm.role || ''} onChange={e => {
                            const newRole = e.target.value;
                            setEditForm({ ...editForm, role: newRole, department: ['admin', 'hr'].includes(newRole) ? '' : (editForm.department || DEPARTMENTS[0]) });
                          }}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        {!['admin', 'hr'].includes(editForm.role || '') && (
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">Department</label>
                            <select className="w-full text-sm bg-[#18181b] border border-zinc-800 rounded-md px-3 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200" value={editForm.department || ''} onChange={e => setEditForm({ ...editForm, department: e.target.value })}>
                              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">System Status</label>
                        <select className="w-full text-sm bg-[#18181b] border border-zinc-800 rounded-md px-3 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200" value={editForm.status || ''} onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}>
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Confidential Edit */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-semibold text-[#d4af37] uppercase tracking-widest border-b border-zinc-800 pb-3">Confidential Overrides</h4>
                    <div className="space-y-5 bg-[#18181b]/50 p-5 rounded-xl border border-zinc-800/50">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">Start Date</label>
                        <input type="date" className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 transition-colors" value={editForm.startDate || ''} onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">Bank Name</label>
                        <input className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 transition-colors" value={editForm.bank || ''} onChange={e => setEditForm({ ...editForm, bank: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">Account Number</label>
                        <input type="password" placeholder="Leave empty if not updating" className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 placeholder:text-zinc-600 transition-colors" value={editForm.accountNo || ''} onChange={e => setEditForm({ ...editForm, accountNo: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">IFSC Code</label>
                        <input className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 transition-colors uppercase" value={editForm.ifscCode || ''} onChange={e => setEditForm({ ...editForm, ifscCode: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex justify-between gap-3 pt-5 border-t border-zinc-800">
                  <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-xs font-semibold text-red-500 hover:bg-red-950/40 px-4 py-2.5 rounded-md transition-colors uppercase tracking-widest border border-transparent hover:border-red-900/50 flex shrink-0 items-center justify-center">
                    Revoke Access
                  </button>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => { setPanelMode('overview'); setEditForm(selected); }} className="px-5 py-2.5 text-xs uppercase tracking-widest font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors border border-transparent hover:border-zinc-700">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-xs uppercase tracking-widest bg-[#d4af37] text-black rounded-md font-semibold hover:bg-[#b5952f] transition-colors shadow-lg shadow-[#d4af37]/10 flex items-center gap-2">
                      {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Details
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              // OVERVIEW DASHBOARD MODE
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
                {loadingProfile ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest">Assembling Profile...</span>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto w-full flex flex-col space-y-8">
                    {/* Tab Navigation */}
                    <div className="flex items-center gap-6 border-b border-zinc-800/60 pb-1 px-1">
                      <button
                        onClick={() => setOverviewTab('personal')}
                        className={`pb-3 text-sm font-medium uppercase tracking-widest transition-colors relative ${overviewTab === 'personal' ? 'text-[#d4af37]' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        Personal Details
                        {overviewTab === 'personal' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4af37] rounded-t-sm" />}
                      </button>
                      <button
                        onClick={() => {
                          setOverviewTab('work');
                          if (selected && !worklog) fetchWorklog(selected.id);
                        }}
                        className={`pb-3 text-sm font-medium uppercase tracking-widest transition-colors relative ${overviewTab === 'work' ? 'text-[#d4af37]' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        Work Log
                        {overviewTab === 'work' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4af37] rounded-t-sm" />}
                      </button>
                    </div>

                    {overviewTab === 'personal' ? (
                      <div className="space-y-6 pb-12">
                        {/* Identity & Role Container */}
                        <div className="bg-[#18181b] border border-zinc-800/60 shadow-xl rounded-xl p-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/5 rounded-bl-full pointer-events-none" />
                          <h4 className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold mb-6 flex items-center gap-3 border-b border-zinc-800/60 pb-3">
                            <Users className="w-4 h-4" /> Identity & Role
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 gap-x-6">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Full Name</p>
                              <p className="text-sm font-medium text-zinc-200">{selected.name}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Email</p>
                              <p className="text-sm font-medium text-zinc-200">{selected.email}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Phone</p>
                              <p className="text-sm font-medium text-zinc-200">{selected.phone || <span className="text-zinc-600 italic">Not provided</span>}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Role</p>
                              <p className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">{selected.role}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Department</p>
                              <p className="text-sm font-medium text-zinc-200">{selected.department}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">System Status</p>
                              <span className={`text-[10px] px-2.5 py-1 rounded-md uppercase tracking-widest font-semibold border ${STATUS_STYLES[selected.status]} inline-block mt-0.5`}>
                                {selected.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Confidential & Financial */}
                          <div className="bg-[#18181b] border border-zinc-800/60 shadow-xl rounded-xl p-6">
                            <h4 className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold mb-6 flex items-center gap-3 border-b border-zinc-800/60 pb-3">
                              <Shield className="w-4 h-4" /> Confidential Details
                            </h4>
                            <div className="space-y-6">
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Start Date</p>
                                <p className="text-sm font-medium text-zinc-200">
                                  {selected.startDate ? formatDate(selected.startDate) : <span className="text-zinc-600 italic">Not set</span>}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Bank Name</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-zinc-200 flex-1">
                                    {selected.bank
                                      ? revealedFields['bankName']
                                        ? selected.bank
                                        : '••••••••'
                                      : <span className="text-zinc-600 italic">Not provided</span>}
                                  </p>
                                  {selected.bank && (
                                    <button
                                      onClick={() => toggleReveal('bankName')}
                                      className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-[#d4af37] transition-colors"
                                      title={revealedFields['bankName'] ? 'Hide' : 'Reveal'}
                                    >
                                      {revealedFields['bankName']
                                        ? <EyeOff className="w-3.5 h-3.5" />
                                        : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Account Number</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-zinc-200 font-mono flex-1">
                                      {selected.accountNo
                                        ? revealedFields['accountNo']
                                          ? selected.accountNo
                                          : `•••• ${selected.accountNo.slice(-4)}`
                                        : <span className="text-zinc-600 italic">Not provided</span>}
                                    </p>
                                    {selected.accountNo && (
                                      <button
                                        onClick={() => toggleReveal('accountNo')}
                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-[#d4af37] transition-colors"
                                        title={revealedFields['accountNo'] ? 'Hide account number' : 'Reveal account number'}
                                      >
                                        {revealedFields['accountNo']
                                          ? <EyeOff className="w-3.5 h-3.5" />
                                          : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">IFSC Code</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-zinc-200 font-mono uppercase flex-1">
                                      {selected.ifscCode
                                        ? revealedFields['ifscCode']
                                          ? selected.ifscCode
                                          : `${selected.ifscCode.slice(0, 4)}••••••`
                                        : <span className="text-zinc-600 italic">Not provided</span>}
                                    </p>
                                    {selected.ifscCode && (
                                      <button
                                        onClick={() => toggleReveal('ifscCode')}
                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-[#d4af37] transition-colors"
                                        title={revealedFields['ifscCode'] ? 'Hide IFSC' : 'Reveal IFSC'}
                                      >
                                        {revealedFields['ifscCode']
                                          ? <EyeOff className="w-3.5 h-3.5" />
                                          : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Compliance & Documents */}
                          <div className="space-y-4">
                            <h4 className="text-xs uppercase tracking-widest font-semibold text-zinc-100 pl-1">Compliance & Forms</h4>
                            <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-5 shadow-xl space-y-4">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0a] border border-zinc-800/80">
                                <div className="flex items-center gap-3">
                                  <FileBadge className="w-5 h-5 text-[#d4af37]" />
                                  <div>
                                    <p className="text-sm font-medium text-zinc-200">Aadhaar Card</p>
                                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{selected.onboarding?.aadhaarCard?.fileName || 'Not uploaded'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {selected.onboarding?.aadhaarCard?.fileName ? (
                                    <>
                                      <button type="button" onClick={() => handleViewDocument('aadhaarCard')} className="p-1.5 text-zinc-400 hover:text-[#d4af37] hover:bg-zinc-800 rounded transition-colors" title="View Document">
                                        <Eye className="w-4 h-4 cursor-pointer" />
                                      </button>
                                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-amber-500 uppercase tracking-widest font-semibold bg-amber-950/40 px-2 py-1 rounded">Pending</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0a] border border-zinc-800/80">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-[#d4af37]" />
                                  <div>
                                    <p className="text-sm font-medium text-zinc-200">PAN Card</p>
                                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{selected.onboarding?.panCard?.fileName || 'Not uploaded'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {selected.onboarding?.panCard?.fileName ? (
                                    <>
                                      <button type="button" onClick={() => handleViewDocument('panCard')} className="p-1.5 text-zinc-400 hover:text-[#d4af37] hover:bg-zinc-800 rounded transition-colors" title="View Document">
                                        <Eye className="w-4 h-4 cursor-pointer" />
                                      </button>
                                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-amber-500 uppercase tracking-widest font-semibold bg-amber-950/40 px-2 py-1 rounded">Pending</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                                <span className="text-xs text-zinc-400">Digital Declaration</span>
                                {selected.onboarding?.declarationAccepted ? (
                                  <span className="text-xs text-emerald-400 font-medium">Signed ({new Date(selected.onboarding.declarationDate).toLocaleDateString()})</span>
                                ) : (
                                  <span className="text-xs text-zinc-600 font-medium">Unsigned</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : loadingWorklog ? (
                      <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-500">
                        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest">Loading Work Log...</span>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Month / Year Navigator */}
                        <div className="flex items-center justify-between bg-[#18181b] border border-zinc-800/60 rounded-xl px-5 py-3">
                          <button
                            onClick={() => handleWorklogMonthChange('prev')}
                            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {/* Clickable label → opens floating popover */}
                          <div className="relative" ref={datePickerRef}>
                            <button
                              onClick={() => setShowDatePicker(p => !p)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors group"
                            >
                              <CalendarDays className="w-4 h-4 text-[#d4af37]" />
                              <span className="text-sm font-semibold text-zinc-200 tracking-wide group-hover:text-[#d4af37] transition-colors">
                                {MONTH_NAMES[worklogMonth - 1]} {worklogYear}
                              </span>
                              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${showDatePicker ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Floating Popover */}
                            {showDatePicker && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[150] w-56 bg-[#18181b] border border-zinc-700/60 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
                                {/* Year selector row */}
                                <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/60">
                                  <button
                                    onClick={() => {
                                      const y = worklogYear - 1;
                                      setWorklogYear(y);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-xs font-bold text-zinc-100 tracking-widest">{worklogYear}</span>
                                  <button
                                    onClick={() => {
                                      const y = worklogYear + 1;
                                      setWorklogYear(y);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* 4×3 month grid */}
                                <div className="grid grid-cols-4 gap-1 p-2">
                                  {MONTH_NAMES.map((m, idx) => {
                                    const active = idx + 1 === worklogMonth;
                                    return (
                                      <button
                                        key={m}
                                        onClick={() => {
                                          const newMonth = idx + 1;
                                          setWorklogMonth(newMonth);
                                          setShowDatePicker(false);
                                          if (selected) fetchWorklog(selected.id, newMonth, worklogYear);
                                        }}
                                        className={`py-1.5 text-[11px] font-semibold rounded-md transition-all duration-150 ${active
                                          ? 'bg-[#d4af37] text-black shadow-sm shadow-[#d4af37]/30'
                                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                                          }`}
                                      >
                                        {m}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleWorklogMonthChange('next')}
                            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Sub-navigation */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                          {[
                            { key: 'overview', label: 'Summary', icon: Activity },
                            { key: 'projects', label: 'Projects', icon: FolderKanban },
                            { key: 'tasks', label: 'Tasks', icon: ListChecks },
                            { key: 'attendance', label: 'Attendance', icon: Clock },
                            { key: 'audit', label: 'Audit Trail', icon: Shield },
                          ].map(({ key, label, icon: Icon }) => (
                            <button
                              key={key}
                              onClick={() => setWorklogSection(key as any)}
                              className={`flex items-center gap-1.5 px-3.5 py-2 text-[10px] uppercase tracking-widest font-semibold rounded-lg border transition-all duration-200 whitespace-nowrap ${worklogSection === key
                                ? 'bg-[#d4af37]/10 border-[#d4af37]/40 text-[#d4af37]'
                                : 'bg-[#18181b] border-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {label}
                            </button>
                          ))}
                        </div>

                        {/* ═══ SUMMARY SECTION ═══ */}
                        {worklogSection === 'overview' && worklog && (
                          <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {[
                                { label: 'Projects', value: worklog.summary?.totalProjects || 0, icon: FolderKanban, accent: 'text-violet-400' },
                                { label: 'Tasks', value: worklog.summary?.totalTasks || 0, icon: ListChecks, accent: 'text-blue-400' },
                                { label: 'Days Present', value: worklog.summary?.attendance?.daysPresent || 0, icon: CalendarDays, accent: 'text-emerald-400' },
                                { label: 'Hours Worked', value: worklog.summary?.attendance?.totalWorkingHours || 0, icon: Timer, accent: 'text-amber-400' },
                              ].map(({ label, value, icon: Icon, accent }) => (
                                <div key={label} className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-4 flex flex-col">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Icon className={`w-4 h-4 ${accent}`} />
                                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold">{label}</span>
                                  </div>
                                  <span className="text-2xl font-light text-zinc-100">{value}</span>
                                </div>
                              ))}
                            </div>

                            {/* Task Status Breakdown */}
                            <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-5">
                              <h4 className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold mb-4">Task Status Breakdown</h4>
                              <div className="grid grid-cols-4 gap-3">
                                {[
                                  { label: 'To Do', count: worklog.summary?.tasksByStatus?.todo || 0, color: 'bg-zinc-700' },
                                  { label: 'In Progress', count: worklog.summary?.tasksByStatus?.inProgress || 0, color: 'bg-blue-500' },
                                  { label: 'Review', count: worklog.summary?.tasksByStatus?.review || 0, color: 'bg-amber-500' },
                                  { label: 'Done', count: worklog.summary?.tasksByStatus?.done || 0, color: 'bg-emerald-500' },
                                ].map(({ label, count, color }) => (
                                  <div key={label} className="text-center">
                                    <div className={`h-2 rounded-full ${color} mb-2`} style={{ width: `${Math.max(((count / Math.max(worklog.summary?.totalTasks || 1, 1)) * 100), 8)}%`, margin: '0 auto' }} />
                                    <span className="text-lg font-light text-zinc-100 block">{count}</span>
                                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold">{label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Attendance Overview */}
                            <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-5">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold">Attendance Overview</h4>
                                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">{worklog.summary?.attendance?.totalSessions || 0} Sessions · {worklog.summary?.attendance?.totalBreaks || 0} Breaks</span>
                              </div>
                              <div className="flex items-end gap-2 mb-4">
                                <span className="text-4xl font-light text-zinc-100 leading-none">{worklog.summary?.attendance?.daysPresent || 0}</span>
                                <span className="text-xs text-zinc-500 pb-1 font-semibold uppercase tracking-widest">/ 22 Days</span>
                              </div>
                              <div className="h-1.5 w-full bg-[#0a0a0a] border border-zinc-800/50 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#d4af37] to-amber-200 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(((worklog.summary?.attendance?.daysPresent || 0) / 22) * 100, 100)}%` }} />
                              </div>
                            </div>

                            {/* Recent Timeline */}
                            <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-5">
                              <h4 className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold mb-4">Recent Activity</h4>
                              <div className="space-y-3 max-h-[20rem] overflow-y-auto pr-1">
                                {(worklog.timeline || []).slice(0, 20).map((event: any, i: number) => (
                                  <div key={i} className="flex items-start gap-3 group">
                                    <div className={`mt-1 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${event.type === 'clock_in' ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400' :
                                      event.type === 'clock_out' ? 'bg-red-950/30 border-red-800/50 text-red-400' :
                                        event.type === 'break_start' || event.type === 'break_end' ? 'bg-amber-950/30 border-amber-800/50 text-amber-400' :
                                          event.type === 'daily_report' ? 'bg-blue-950/30 border-blue-800/50 text-blue-400' :
                                            event.type === 'task_assigned' || event.type === 'task_completed' ? 'bg-violet-950/30 border-violet-800/50 text-violet-400' :
                                              'bg-zinc-900 border-zinc-800 text-zinc-400'
                                      }`}>
                                      {event.type === 'clock_in' ? <LogIn className="w-3.5 h-3.5" /> :
                                        event.type === 'clock_out' ? <LogOut className="w-3.5 h-3.5" /> :
                                          event.type === 'break_start' || event.type === 'break_end' ? <Coffee className="w-3.5 h-3.5" /> :
                                            event.type === 'daily_report' ? <FileCheck className="w-3.5 h-3.5" /> :
                                              event.type === 'audit' ? <Shield className="w-3.5 h-3.5" /> :
                                                <Activity className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-zinc-300 truncate">{event.details}</p>
                                      <p className="text-[10px] text-zinc-600 mt-0.5">{formatDateTime(event.timestamp)}</p>
                                    </div>
                                  </div>
                                ))}
                                {(!worklog.timeline || worklog.timeline.length === 0) && (
                                  <p className="text-sm text-zinc-500 italic text-center py-4">No activity recorded for this month.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ═══ PROJECTS SECTION ═══ */}
                        {worklogSection === 'projects' && worklog && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs uppercase tracking-widest font-semibold text-zinc-100 pl-1">Assigned Projects</h4>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{worklog.projects?.length || 0} total</span>
                            </div>
                            {(worklog.projects || []).length === 0 ? (
                              <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-8 text-center">
                                <FolderKanban className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                                <p className="text-sm text-zinc-500 italic">Not assigned to any projects.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(worklog.projects || []).map((p: any) => (
                                  <div key={p._id} className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-5 hover:border-[#d4af37]/30 transition-colors">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-violet-950/40 border border-violet-800/50 rounded-lg flex items-center justify-center">
                                          <Briefcase className="w-4 h-4 text-violet-400" />
                                        </div>
                                        <div>
                                          <h5 className="text-sm font-medium text-zinc-200">{p.name}</h5>
                                          <p className="text-[10px] text-zinc-500 mt-0.5">Created {formatDate(p.createdAt)}</p>
                                        </div>
                                      </div>
                                      <span className={`text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded border ${p.status === 'active' ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20' :
                                        p.status === 'completed' ? 'text-blue-400 border-blue-900/50 bg-blue-950/20' :
                                          p.status === 'on-hold' ? 'text-amber-400 border-amber-900/50 bg-amber-950/20' :
                                            'text-zinc-400 border-zinc-800 bg-zinc-900'
                                        }`}>{p.status}</span>
                                    </div>
                                    {p.description && <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{p.description}</p>}
                                    <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.members?.length || 0} members</span>
                                      {p.deadline && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Due {formatDate(p.deadline)}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ═══ TASKS SECTION ═══ */}
                        {worklogSection === 'tasks' && worklog && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs uppercase tracking-widest font-semibold text-zinc-100 pl-1">Assigned Tasks</h4>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{worklog.tasks?.length || 0} total</span>
                            </div>
                            {(worklog.tasks || []).length === 0 ? (
                              <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-8 text-center">
                                <ClipboardList className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                                <p className="text-sm text-zinc-500 italic">No tasks assigned.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(worklog.tasks || []).map((t: any) => (
                                  <div key={t._id} className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-4 hover:border-[#d4af37]/30 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-medium text-zinc-200 truncate">{t.name}</h5>
                                        <p className="text-[10px] text-zinc-500 mt-1 font-mono">{t.project?.name || 'Unknown Project'}</p>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {t.priority && t.priority !== 'none' && (
                                          <span className={`text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded ${t.priority === 'urgent' ? 'text-red-400 bg-red-950/30' :
                                            t.priority === 'high' ? 'text-orange-400 bg-orange-950/30' :
                                              t.priority === 'medium' ? 'text-amber-400 bg-amber-950/30' :
                                                'text-zinc-400 bg-zinc-800'
                                            }`}>{t.priority}</span>
                                        )}
                                        <span className={`text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded border ${t.status === 'done' ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20' :
                                          t.status === 'in-progress' ? 'text-blue-400 border-blue-900/50 bg-blue-950/20' :
                                            t.status === 'review' ? 'text-amber-400 border-amber-900/50 bg-amber-950/20' :
                                              'text-zinc-400 border-zinc-800 bg-zinc-900'
                                          }`}>{t.status}</span>
                                      </div>
                                    </div>
                                    {t.description && <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{t.description}</p>}
                                    <div className="flex items-center gap-4 mt-3 text-[10px] text-zinc-500">
                                      {t.dueDate && <span>Due {formatDate(t.dueDate)}</span>}
                                      {t.completedAt && <span className="text-emerald-500">✓ Completed {formatDate(t.completedAt)}</span>}
                                      {t.createdBy && <span>By {t.createdBy.fullName}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ═══ ATTENDANCE SECTION ═══ */}
                        {worklogSection === 'attendance' && worklog && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs uppercase tracking-widest font-semibold text-zinc-100 pl-1">Attendance Records</h4>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{worklog.attendance?.length || 0} days</span>
                            </div>
                            {(worklog.attendance || []).length === 0 ? (
                              <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-8 text-center">
                                <Clock className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                                <p className="text-sm text-zinc-500 italic">No attendance records for this month.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(worklog.attendance || []).map((record: any) => (
                                  <div key={record._id} className="bg-[#18181b] border border-zinc-800/60 rounded-xl overflow-hidden">
                                    {/* Day Header */}
                                    <div className="px-5 py-3 bg-[#0a0a0a]/50 border-b border-zinc-800/40 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${record.status === 'clocked-in' ? 'bg-emerald-400 animate-pulse' :
                                          record.status === 'clocked-out' ? 'bg-zinc-500' :
                                            record.status === 'away' ? 'bg-amber-400' :
                                              'bg-red-400'
                                          }`} />
                                        <span className="text-sm font-medium text-zinc-200">{formatDate(record.date)}</span>
                                        <span className={`text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded border ${record.status === 'clocked-in' ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20' :
                                          record.status === 'clocked-out' ? 'text-zinc-400 border-zinc-800 bg-zinc-900' :
                                            record.status === 'away' ? 'text-amber-400 border-amber-900/50 bg-amber-950/20' :
                                              'text-red-400 border-red-900/50 bg-red-950/20'
                                          }`}>{record.status}</span>
                                      </div>
                                      <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">
                                        {Math.round((record.activeSeconds || 0) / 3600 * 10) / 10} hrs
                                      </span>
                                    </div>

                                    <div className="p-5 space-y-4">
                                      {/* Sessions */}
                                      {record.sessions && record.sessions.length > 0 && (
                                        <div>
                                          <h6 className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Sessions</h6>
                                          <div className="space-y-2">
                                            {record.sessions.map((s: any, idx: number) => (
                                              <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0a0a0a] border border-zinc-800/50">
                                                <LogIn className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                <span className="text-xs text-zinc-300">{formatTime(s.start)}</span>
                                                <span className="text-zinc-700">→</span>
                                                {s.end ? (
                                                  <>
                                                    <LogOut className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                                    <span className="text-xs text-zinc-300">{formatTime(s.end)}</span>
                                                    <span className="text-[10px] text-zinc-500 ml-auto">{Math.round((s.duration || 0) / 60)} min</span>
                                                  </>
                                                ) : (
                                                  <span className="text-xs text-emerald-400 italic">Ongoing</span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Breaks */}
                                      {record.breaks && record.breaks.length > 0 && (
                                        <div>
                                          <h6 className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Breaks</h6>
                                          <div className="space-y-2">
                                            {record.breaks.map((b: any, idx: number) => (
                                              <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0a0a0a] border border-amber-900/20">
                                                <Coffee className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                <span className="text-xs text-zinc-300">{formatTime(b.start)}</span>
                                                <span className="text-zinc-700">→</span>
                                                {b.end ? (
                                                  <>
                                                    <span className="text-xs text-zinc-300">{formatTime(b.end)}</span>
                                                    <span className="text-[10px] text-zinc-500 ml-auto">{Math.round((b.duration || 0) / 60)} min</span>
                                                  </>
                                                ) : (
                                                  <span className="text-xs text-amber-400 italic">Ongoing</span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Daily Report */}
                                      {record.dailyReport && record.dailyReport.trim() && (
                                        <div>
                                          <h6 className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Daily Report</h6>
                                          <div className="p-3 rounded-lg bg-blue-950/10 border border-blue-900/20">
                                            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{record.dailyReport}</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ═══ AUDIT TRAIL SECTION ═══ */}
                        {worklogSection === 'audit' && worklog && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs uppercase tracking-widest font-semibold text-zinc-100 pl-1">Audit Trail</h4>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{worklog.auditLogs?.length || 0} events</span>
                            </div>
                            {(worklog.auditLogs || []).length === 0 ? (
                              <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-8 text-center">
                                <Shield className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                                <p className="text-sm text-zinc-500 italic">No audit events recorded.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(worklog.auditLogs || []).map((log: any, i: number) => (
                                  <div key={log._id || i} className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                                    <div className="flex items-start gap-3">
                                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${log.action === 'CREATE_EMPLOYEE' ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400' :
                                        log.action === 'DELETE_EMPLOYEE' ? 'bg-red-950/30 border-red-800/50 text-red-400' :
                                          log.action === 'UPDATE_EMPLOYEE' ? 'bg-blue-950/30 border-blue-800/50 text-blue-400' :
                                            'bg-amber-950/30 border-amber-800/50 text-amber-400'
                                        }`}>
                                        <Shield className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded ${log.action === 'CREATE_EMPLOYEE' ? 'text-emerald-400 bg-emerald-950/30' :
                                            log.action === 'DELETE_EMPLOYEE' ? 'text-red-400 bg-red-950/30' :
                                              log.action === 'UPDATE_EMPLOYEE' ? 'text-blue-400 bg-blue-950/30' :
                                                'text-amber-400 bg-amber-950/30'
                                            }`}>{log.action?.replace(/_/g, ' ')}</span>
                                        </div>
                                        <p className="text-sm text-zinc-300">{log.details}</p>
                                        <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
                                          <span>By {log.performedBy?.fullName || 'System'}</span>
                                          <span>•</span>
                                          <span>{formatDateTime(log.createdAt)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* If no worklog data loaded at all */}
                        {!worklog && !loadingWorklog && (
                          <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-8 text-center">
                            <Activity className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                            <p className="text-sm text-zinc-500 italic">No work log data available.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] w-full max-w-md border border-zinc-800 shadow-2xl rounded-xl overflow-hidden flex flex-col">

            <div className="px-6 py-5 border-b border-zinc-800 bg-[#0a0a0a]/50">
              <h3 className="text-xl font-light text-[#d4af37]">Add New Employee</h3>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-2 font-semibold">Invite link & credentials will be emailed.</p>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
              {addingError && (
                <div className="p-3 rounded-md bg-red-950/30 border border-red-900/50 text-red-400 text-sm">
                  {addingError}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Full Name</label>
                <input required value={addForm.fullName} onChange={e => setAddForm({ ...addForm, fullName: e.target.value })} className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 placeholder:text-zinc-600 transition-colors" placeholder="e.g. Jane Doe" autoFocus />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Work Email</label>
                <input required type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 placeholder:text-zinc-600 transition-colors" placeholder="jane@company.com" />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Initial Password</label>
                <input required minLength={8} type="password" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 placeholder:text-zinc-600 transition-colors" placeholder="Min 8 characters" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Privilege Role</label>
                  <select value={addForm.role} onChange={e => {
                    const newRole = e.target.value;
                    setAddForm({ ...addForm, role: newRole, department: ['admin', 'hr'].includes(newRole) ? '' : (addForm.department || DEPARTMENTS[0]) });
                  }} className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-3 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 transition-colors">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {!['admin', 'hr'].includes(addForm.role) && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Department</label>
                    <select value={addForm.department} onChange={e => setAddForm({ ...addForm, department: e.target.value })} className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-3 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 transition-colors">
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-zinc-800 mt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-xs uppercase tracking-widest font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-xs uppercase tracking-widest bg-[#d4af37] text-black rounded-md font-semibold hover:bg-[#b5952f] transition-colors shadow-lg shadow-[#d4af37]/10 flex items-center gap-2">
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selected && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] w-full max-w-sm border border-red-900/40 shadow-2xl rounded-xl overflow-hidden flex flex-col items-center p-8 text-center">

            <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h3 className="text-xl font-light text-zinc-100 mb-3">Revoke Access?</h3>

            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-zinc-200 font-medium">{selected.name}</strong>? This action cannot be undone and their access will be immediately revoked.
            </p>

            <div className="flex w-full gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 text-xs uppercase tracking-widest rounded-md font-semibold hover:bg-zinc-800 transition-colors text-zinc-300 border border-zinc-700 hover:border-zinc-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 text-xs uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/30 rounded-md font-semibold hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}