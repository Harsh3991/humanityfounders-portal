import { useState, useEffect } from 'react';
import axiosInstance from '../lib/axiosInstance';
import { Plus, Search, X, Loader2, AlertTriangle, Users, ArrowRight, FileText, CheckCircle2, LayoutDashboard, Clock, FileBadge, Eye } from 'lucide-react';

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
const DEPARTMENTS = ["Engineering", "Marketing", "Sales", "Human Resources", "Finance", "Operations", "Design", "Management"];

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

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', email: '', password: '', role: 'employee', department: 'Engineering' });
  const [addingError, setAddingError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    }, 500); // Wipe data after transition completes safely
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 text-zinc-300 font-sans">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/50 pb-6">
        <div>
          <h1 className="text-3xl font-light text-zinc-100">Directory</h1>
          <p className="text-sm text-zinc-500 mt-2 tracking-wide uppercase">Manage Personnel & Roles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-2.5 text-xs uppercase tracking-widest font-semibold bg-[#d4af37] text-black rounded-md hover:bg-[#b5952f] transition-all duration-300 shadow-lg shadow-[#d4af37]/10 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl shadow-xl overflow-hidden flex flex-col min-h-[500px]">

        {/* Search Bar */}
        <div className="p-4 border-b border-zinc-800/50 bg-[#0a0a0a]/30">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              placeholder="Search by name or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-zinc-800 text-zinc-200 text-sm rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-[#0a0a0a]/50">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Name</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Role</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Department</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Status</th>
                <th className="px-6 py-4 text-right text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#d4af37] mx-auto opacity-70" />
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
                <tr key={e.id} className="hover:bg-zinc-800/20 transition-colors group">
                  <td className="px-6 py-4 text-zinc-200 font-medium">{e.name}</td>
                  <td className="px-6 py-4 text-zinc-400 uppercase tracking-widest text-[10px] font-semibold">{e.role}</td>
                  <td className="px-6 py-4 text-zinc-400 text-xs">{e.department}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2.5 py-1 rounded-md uppercase tracking-widest font-semibold border ${STATUS_STYLES[e.status]}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleSelect(e.id)}
                      className="text-xs uppercase tracking-widest text-[#d4af37] hover:text-[#b5952f] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      View Profile
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
                          <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">Department</label>
                          <select className="w-full text-sm bg-[#18181b] border border-zinc-800 rounded-md px-3 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200" value={editForm.department || ''} onChange={e => setEditForm({ ...editForm, department: e.target.value })}>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">Role</label>
                          <select className="w-full text-sm bg-[#18181b] border border-zinc-800 rounded-md px-3 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200" value={editForm.role || ''} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
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
                        onClick={() => setOverviewTab('work')}
                        className={`pb-3 text-sm font-medium uppercase tracking-widest transition-colors relative ${overviewTab === 'work' ? 'text-[#d4af37]' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        Work Log
                        {overviewTab === 'work' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4af37] rounded-t-sm" />}
                      </button>
                    </div>

                    {overviewTab === 'personal' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Personal Snapshot */}
                        <div className="bg-[#18181b] border border-zinc-800/60 shadow-xl rounded-xl p-6 flex flex-col justify-center">
                          <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-zinc-500" />
                            <h4 className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold">Contact & Status</h4>
                          </div>
                          <p className="text-sm font-medium text-zinc-200 truncate mb-1">{selected.email}</p>
                          <p className="text-xs text-zinc-500 font-mono mb-6">{selected.phone || 'No phone set'}</p>
                          <div className="mt-auto">
                            <span className={`text-[10px] px-2.5 py-1 rounded-md uppercase tracking-widest font-semibold border ${STATUS_STYLES[selected.status]}`}>
                              {selected.status}
                            </span>
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
                    ) : (
                      <div className="space-y-8">
                        {/* Top Insight Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Attendance Snapshot */}
                          <div className="bg-[#18181b] border border-zinc-800/60 shadow-xl rounded-xl p-6 flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-4 mt-[-0.25rem]">
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-zinc-500" />
                                <h4 className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold">MTD Attendance</h4>
                              </div>
                              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{profileAttendance?.totalWorkingHours || 0} HRS</span>
                            </div>

                            <div className="flex items-end gap-2 mb-6">
                              <span className="text-4xl font-light text-zinc-100 leading-none">{profileAttendance?.daysPresent || 0}</span>
                              <span className="text-xs text-zinc-500 pb-1 font-semibold uppercase tracking-widest">Days Logged</span>
                            </div>

                            <div className="mt-auto">
                              <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Month Progress</span>
                                <span className="text-xs font-medium text-zinc-300">~{Math.min(Math.round(((profileAttendance?.daysPresent || 0) / 22) * 100), 100)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-[#0a0a0a] border border-zinc-800/50 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#d4af37] to-amber-200 rounded-full transition-all duration-1000 ease-out"
                                  style={{ width: `${Math.min(((profileAttendance?.daysPresent || 0) / 22) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Task Quick Stats */}
                          <div className="bg-[#18181b] border border-zinc-800/60 shadow-xl rounded-xl p-6 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-5">
                              <LayoutDashboard className="w-5 h-5 text-zinc-500" />
                              <h4 className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold">Project Load</h4>
                            </div>
                            <div className="flex items-end gap-2 mb-2">
                              <span className="text-4xl font-light text-zinc-100 leading-none">{profileTasks.length}</span>
                              <span className="text-xs text-zinc-500 pb-1 font-semibold uppercase tracking-widest">Tasks</span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-auto">Across multiple shared projects</p>
                          </div>
                        </div>

                        {/* Active Work Flow */}
                        <div className="space-y-4">
                          <h4 className="text-xs uppercase tracking-widest font-semibold text-zinc-100 pl-1">Active Work</h4>
                          <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-5 shadow-xl min-h-[16rem] max-h-[16rem] overflow-y-auto align-top">
                            {profileTasks.length === 0 ? (
                              <p className="text-sm text-zinc-500 italic mt-4 text-center">No assigned tasks currently.</p>
                            ) : (
                              <div className="space-y-3">
                                {profileTasks.map(t => (
                                  <div key={t._id} className="p-3 border border-zinc-800/60 bg-[#0a0a0a] rounded-lg group hover:border-[#d4af37]/60 transition-colors">
                                    <div className="flex justify-between items-start gap-3">
                                      <h5 className="text-sm font-medium text-zinc-200 truncate">{t.name}</h5>
                                      <span className={`text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded border ${t.status === 'done' ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20' :
                                        t.status === 'in-progress' ? 'text-blue-400 border-blue-900/50 bg-blue-950/20' :
                                          'text-zinc-400 border-zinc-800 bg-zinc-900'
                                        }`}>
                                        {t.status}
                                      </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1.5 font-mono truncate">{t.project?.name || 'Assigned Project'}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
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
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Department</label>
                  <select value={addForm.department} onChange={e => setAddForm({ ...addForm, department: e.target.value })} className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-3 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 transition-colors">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Privilege Role</label>
                  <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-3 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 transition-colors">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
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