import { useState, useEffect } from 'react';
import { Search, ClipboardList, Calendar, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import axiosInstance from '../lib/axiosInstance';

interface EmployeeItem {
  id: string;
  name: string;
  department: string;
}

interface TaskItem {
  id?: string;
  name: string;
  project: string;
  due: string;
  status: string;
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  overdue: boolean;
}



const PRIORITY_STYLES: Record<string, string> = {
  none: 'text-zinc-500 border-zinc-800 bg-[#18181b]/50',
  low: 'text-zinc-400 border-zinc-700 bg-zinc-800/30',
  medium: 'text-blue-500 border-blue-800/50 bg-blue-950/20',
  high: 'text-amber-500 border-amber-700/50 bg-amber-950/20',
  urgent: 'text-red-400 border-red-800/50 bg-red-950/30'
};

const STATUS_STYLES: Record<string, { color: string, icon: React.ReactNode }> = {
  todo: { color: 'text-zinc-400 border-zinc-700 bg-zinc-800/30', icon: <Clock className="w-3 h-3" /> },
  'in-progress': { color: 'text-blue-400 border-blue-800/50 bg-blue-950/30', icon: <AlertCircle className="w-3 h-3" /> },
  done: { color: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30', icon: <CheckCircle2 className="w-3 h-3" /> },
};

export default function TaskOversight() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskFilters, setTaskFilters] = useState({
    status: 'all',
    priority: 'all',
    deadline: 'all'
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axiosInstance.get('/users?status=active');
        const emps = res.data.data.map((u: any) => ({
          id: u._id,
          name: u.fullName,
          department: u.department || 'Unassigned'
        }));
        setEmployees(emps);
        if (emps.length > 0) setSelectedId(emps[0].id);
      } catch (err) {
        console.error("Failed to load employees for task oversight", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedId) return;
      setTasksLoading(true);
      try {
        const res = await axiosInstance.get(`/tasks/user/${selectedId}`);
        const allTasks = res.data.data.flatMap((group: any) => group.tasks);
        const userTasks = allTasks.map((t: any) => ({
          id: t._id,
          name: t.name,
          project: t.project?.name || 'Unassigned',
          due: t.dueDate ? t.dueDate.split('T')[0] : 'No Due Date',
          status: t.status || 'todo',
          priority: t.priority || 'none',
          overdue: t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
        }));
        setTasks(userTasks);
      } catch (err) {
        setTasks([]);
      } finally {
        setTasksLoading(false);
      }
    };
    fetchTasks();
  }, [selectedId]);

  const filtered = employees.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedEmployee = employees.find((e) => e.id === selectedId);

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-[#0a0a0a] rounded-xl border border-zinc-800/50">
        <div className="flex flex-col items-center gap-4 animate-pulse text-zinc-500">
          <ClipboardList className="w-10 h-10 text-[#d4af37] opacity-80" />
          <p className="font-medium tracking-widest uppercase text-xs">Loading Directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row bg-[#0a0a0a] rounded-xl border border-zinc-800/50 overflow-hidden font-sans shadow-2xl">

      {/* Left Panel: Employee Directory */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-800/50 bg-[#18181b] shrink-0 flex flex-col max-h-[400px] md:max-h-none overflow-hidden">

        {/* Sticky Header & Filters */}
        <div className="p-6 border-b border-zinc-800/50 space-y-5 bg-[#18181b] z-10 shrink-0">
          <h2 className="text-xl text-zinc-100 font-light tracking-wide">Task Oversight</h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-zinc-800 text-zinc-200 text-sm rounded-md pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors placeholder:text-zinc-600"
            />
          </div>


        </div>

        {/* Scrollable Employee List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-600 px-2 py-4 italic text-center">No employees found.</p>
          ) : (
            filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`w-full text-left px-4 py-3 rounded-lg flex flex-col gap-1 transition-all duration-200 ${selectedId === e.id
                  ? 'bg-[#d4af37]/10 text-[#d4af37] ring-1 ring-[#d4af37]/30'
                  : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                  }`}
              >
                <span className="text-sm font-medium truncate">{e.name}</span>
                <span className={`text-xs ${selectedId === e.id ? 'text-[#d4af37]/70' : 'text-zinc-600'} truncate`}>{e.department}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Selected Employee's Tasks */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {selectedEmployee ? (
          <>
            {/* Header */}
            <div className="px-8 py-6 border-b border-zinc-800/50 bg-[#18181b]/30 shrink-0">
              <h1 className="text-3xl text-zinc-100 font-light truncate">
                {selectedEmployee.name}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
                  {tasks.length} Assigned Task{tasks.length !== 1 && 's'}
                </p>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                  <select
                    className="bg-[#0a0a0a] border border-zinc-800 text-zinc-300 text-xs rounded-md px-2 py-1.5 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none"
                    value={taskFilters.status}
                    onChange={e => setTaskFilters({ ...taskFilters, status: e.target.value })}
                  >
                    <option value="all">All Status</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>

                  <select
                    className="bg-[#0a0a0a] border border-zinc-800 text-zinc-300 text-xs rounded-md px-2 py-1.5 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none"
                    value={taskFilters.priority}
                    onChange={e => setTaskFilters({ ...taskFilters, priority: e.target.value })}
                  >
                    <option value="all">Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Normal</option>
                    <option value="low">Low</option>
                    <option value="none">No Priority</option>
                  </select>

                  <select
                    className="bg-[#0a0a0a] border border-zinc-800 text-zinc-300 text-xs rounded-md px-2 py-1.5 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none"
                    value={taskFilters.deadline}
                    onChange={e => setTaskFilters({ ...taskFilters, deadline: e.target.value })}
                  >
                    <option value="all">Date</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Today</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tasks Grid */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#0a0a0a] relative">
              {tasksLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]/80 z-10 backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
                  <span className="text-xs text-zinc-400 tracking-widest uppercase mt-4">Pulling Tasks...</span>
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-12">
                  <ClipboardList className="w-16 h-16 text-zinc-800 mb-6" />
                  <p className="text-xl font-light text-zinc-300">Clear Schedule</p>
                  <p className="text-sm mt-2">This employee has no active tasks assigned.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {tasks.filter(t => {
                    let match = true;
                    if (taskFilters.status !== 'all' && t.status !== taskFilters.status) match = false;
                    if (taskFilters.priority !== 'all' && t.priority !== taskFilters.priority) match = false;

                    if (taskFilters.deadline !== 'all') {
                      if (!t.due || t.due === 'No Due Date') {
                        match = false;
                      } else {
                        const todayStr = new Date().toISOString().split('T')[0];
                        if (taskFilters.deadline === 'today' && t.due !== todayStr) match = false;
                        if (taskFilters.deadline === 'overdue' && !t.overdue) match = false;
                      }
                    }
                    return match;
                  }).map((t, i) => {
                    const statusConfig = STATUS_STYLES[t.status.toLowerCase()] || STATUS_STYLES.todo;

                    return (
                      <div
                        key={i}
                        className={`bg-[#18181b] border rounded-xl p-5 flex flex-col gap-5 transition-colors hover:border-zinc-600 shadow-md ${t.overdue ? 'border-red-900/40 bg-red-950/5' : 'border-zinc-800/60'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h4 className="text-zinc-200 font-medium text-base truncate">{t.name}</h4>
                            <p className="text-xs text-zinc-500 mt-1.5 truncate">Project: <span className="text-zinc-400">{t.project}</span></p>
                          </div>
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-md border font-semibold shrink-0 ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {t.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                          <div className="flex items-center gap-2">
                            <Calendar className={`w-3.5 h-3.5 ${t.overdue ? 'text-red-500' : 'text-zinc-600'}`} />
                            <span className={`text-xs font-mono ${t.overdue ? 'text-red-400 font-medium' : 'text-zinc-400'}`}>
                              {t.due}
                              {t.overdue && <span className="ml-2 text-[9px] uppercase tracking-widest bg-red-950/50 text-red-500 px-1.5 py-0.5 rounded border border-red-900/50">Overdue</span>}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest rounded-md border font-bold ${PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium}`}>
                            {t.priority}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-[#0a0a0a]">
            <Search className="w-16 h-16 text-zinc-800 mb-6" />
            <p className="text-xl font-light text-zinc-300">No Employee Selected</p>
            <p className="text-sm mt-2">Select a team member from the directory to view their tasks.</p>
          </div>
        )}
      </div>
    </div>
  );
}