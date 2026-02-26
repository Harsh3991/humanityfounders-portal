import { useState, useEffect, useRef } from 'react';
import axiosInstance from '../lib/axiosInstance';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, ChevronDown, ChevronRight, Folder, FolderOpen, Trash2, User, Loader2, CheckCircle2, Flag, Ban, Calendar } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  assignees: { id: string; name: string }[];
  status: string;
  priority: string;
  dueDate: string | null;
  subtasks: Task[];
}

interface Project {
  id: string;
  name: string;
  tasks: Task[];
  color: string;
}

// Helper to build a recursive task tree
function buildTaskTree(flatTasks: any[]): Task[] {
  const taskMap = new Map<string, Task>();
  const roots: Task[] = [];

  for (const t of flatTasks) {
    taskMap.set(t._id, {
      id: t._id,
      name: t.name,
      assignees: (t.assignees || []).map((a: any) => ({ id: a._id || a, name: a.fullName || a.name || '' })),
      status: t.status || 'todo',
      priority: t.priority || 'none',
      dueDate: t.dueDate || null,
      subtasks: []
    });
  }

  for (const t of flatTasks) {
    const task = taskMap.get(t._id)!;
    if (t.parentTask) {
      const parent = taskMap.get(t.parentTask);
      if (parent) {
        parent.subtasks.push(task);
      } else {
        roots.push(task);
      }
    } else {
      roots.push(task);
    }
  }

  return roots;
}

function formatDueDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullDate = `${target.getDate()} ${months[target.getMonth()]} ${target.getFullYear()}`;

  if (diffDays < 0) {
    if (diffDays >= -6) {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
    } else {
      return fullDate;
    }
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays === 2) {
    return 'Day after tomorrow';
  } else if (diffDays <= 6) {
    return target.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return fullDate;
  }
}

const TaskInputRow = ({
  level,
  onSave,
  onCancel
}: {
  level: number;
  onSave: (name: string) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState('');
  return (
    <div
      className="flex items-center py-2.5 px-3 bg-[#18181b]/50 hover:bg-zinc-800/30 transition-colors border-b border-zinc-800/40 last:border-0"
      style={{ paddingLeft: `calc(${level * 1.5 + 1}rem + 8px)` }}
    >
      <div className="w-5 h-5 flex items-center justify-center mr-3 text-zinc-600 shrink-0">
        <ChevronRight className="w-4 h-4 opacity-50" />
      </div>
      <div className="flex-1 text-sm text-zinc-200 pr-4 min-w-0">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave(name);
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Task name (press Enter to save)"
          className="w-full bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-zinc-600 font-medium"
        />
      </div>
      <div className="w-48 shrink-0 flex items-center gap-2">
        <button onClick={() => onSave(name)} className="px-3 py-1 text-[10px] uppercase tracking-widest font-semibold bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors rounded">Save</button>
        <button onClick={onCancel} className="px-3 py-1 text-[10px] uppercase tracking-widest font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors">Cancel</button>
      </div>
      <div className="w-12 shrink-0" />
      <div className="w-40 shrink-0" />
      <div className="w-24 shrink-0" />
    </div>
  );
};

const TaskRow = ({
  task,
  level = 0,
  employees,
  onAddSubtask,
  onDeleteTask,
  onToggleAssign,
  onChangeStatus,
  onChangePriority,
  onChangeDueDate
}: {
  task: Task,
  level?: number,
  employees: { id: string, name: string }[],
  onAddSubtask: (parentId: string, name: string) => void,
  onDeleteTask: (taskId: string) => void,
  onToggleAssign: (taskId: string, userId: string) => void,
  onChangeStatus: (taskId: string, status: string) => void,
  onChangePriority: (taskId: string, priority: string) => void,
  onChangeDueDate: (taskId: string, dueDate: string | null) => void
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showAssignPopover, setShowAssignPopover] = useState(false);
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [showPriorityPopover, setShowPriorityPopover] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const assignRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);

  useEffect(() => {
    if (!showAssignPopover && !showStatusPopover && !showPriorityPopover) return;
    function handleClickOutside(event: MouseEvent) {
      if (assignRef.current && !assignRef.current.contains(event.target as Node)) {
        setShowAssignPopover(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusPopover(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
        setShowPriorityPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssignPopover, showStatusPopover, showPriorityPopover]);

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(assignSearch.toLowerCase()));

  return (
    <div className={`flex flex-col ${showAssignPopover ? 'relative z-50' : ''}`}>
      <div
        className="flex items-center group py-3 px-3 hover:bg-zinc-800/20 transition-colors border-b border-zinc-800/40 last:border-0"
        style={{ paddingLeft: `calc(${level * 1.5 + 1}rem + 8px)` }}
      >
        <div className="relative mr-1.5 flex items-center justify-center shrink-0" ref={statusRef}>
          <button
            onClick={() => setShowStatusPopover(!showStatusPopover)}
            className="w-5 h-5 flex items-center justify-center hover:bg-zinc-800 rounded-full transition-colors"
          >
            {task.status === 'done' ? (
              <CheckCircle2 className="w-4 h-4 text-white fill-emerald-500" />
            ) : task.status === 'in-progress' ? (
              <div className="w-3.5 h-3.5 rounded-full border-[2px] border-[#d4af37] bg-[#d4af37]/20" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border-[2px] border-zinc-500 border-dotted" />
            )}
          </button>

          {showStatusPopover && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-[#18181b] border border-zinc-700 shadow-xl rounded-lg overflow-hidden z-[100] flex flex-col p-1">
              <button
                onClick={() => { onChangeStatus(task.id, 'todo'); setShowStatusPopover(false); }}
                className="flex items-center gap-2 text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors"
              >
                <div className="w-3.5 h-3.5 rounded-full border-[2px] border-zinc-500 border-dotted shrink-0" />
                To Do
              </button>
              <button
                onClick={() => { onChangeStatus(task.id, 'in-progress'); setShowStatusPopover(false); }}
                className="flex items-center gap-2 text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors"
              >
                <div className="w-3.5 h-3.5 rounded-full border-[2px] border-[#d4af37] bg-[#d4af37]/20 shrink-0" />
                In Progress
              </button>
              <button
                onClick={() => { onChangeStatus(task.id, 'done'); setShowStatusPopover(false); }}
                className="flex items-center gap-2 text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-white fill-emerald-500 shrink-0" />
                Complete
              </button>
            </div>
          )}
        </div>

        <button
          className="w-5 h-5 flex items-center justify-center mr-3 text-zinc-500 hover:text-[#d4af37] transition-colors shrink-0"
          onClick={() => setExpanded(!expanded)}
          style={{ visibility: task.subtasks.length > 0 || isAddingMode ? 'visible' : 'hidden' }}
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 text-sm text-zinc-200 pr-4 truncate min-w-0 font-medium">
          {task.name}
        </div>

        <div className="w-48 flex items-center justify-start shrink-0 relative" ref={assignRef}>
          <button
            onClick={() => setShowAssignPopover(!showAssignPopover)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all duration-200 ${(task.assignees && task.assignees.length > 0) ? 'bg-zinc-800/40 border border-zinc-700/50 hover:border-zinc-500' : 'text-zinc-400 border border-dashed border-zinc-700 hover:border-[#d4af37] hover:text-[#d4af37]'}`}
          >
            {task.assignees && task.assignees.length > 0 ? (
              <div className="flex -space-x-1.5 items-center">
                {task.assignees.map((assignee) => (
                  <div key={assignee.id} className="w-5 h-5 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] text-[10px] font-bold flex-shrink-0 ring-1 ring-[#18181b]" title={assignee.name}>
                    {assignee.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <User className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Assign</span>
              </>
            )}
          </button>

          {showAssignPopover && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-[#18181b] border border-zinc-700 shadow-xl rounded-lg overflow-hidden z-[100] flex flex-col">
              <div className="p-2 border-b border-zinc-800">
                <input
                  type="text"
                  placeholder="Search employee..."
                  className="w-full h-9 px-3 text-xs bg-[#0a0a0a] text-zinc-200 border border-zinc-800 rounded focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto p-1 flex flex-col">
                {filteredEmployees.length === 0 ? (
                  <p className="text-xs text-zinc-500 p-3 text-center italic">No employees found.</p>
                ) : filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      onToggleAssign(task.id, emp.id);
                    }}
                    className="flex items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors w-full text-left"
                  >
                    <span>{emp.name}</span>
                    {task.assignees.some(a => a.id === emp.id) && <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-12 flex justify-center shrink-0 relative" ref={priorityRef}>
          <button
            onClick={() => setShowPriorityPopover(!showPriorityPopover)}
            className="w-7 h-7 flex items-center justify-center hover:bg-zinc-800 rounded-md transition-colors"
          >
            <Flag className={`w-3.5 h-3.5 ${task.priority === 'urgent' ? 'text-red-500 fill-red-500/20' :
              task.priority === 'high' ? 'text-amber-500 fill-amber-500/20' :
                task.priority === 'medium' ? 'text-blue-500 fill-blue-500/20' :
                  task.priority === 'low' ? 'text-zinc-500 fill-zinc-500/20' :
                    'text-white'
              }`} />
          </button>

          {showPriorityPopover && (
            <div className="absolute top-full right-0 mt-2 w-32 bg-[#18181b] border border-zinc-700 shadow-xl rounded-lg overflow-hidden z-[100] flex flex-col p-1">
              <button onClick={() => { onChangePriority(task.id, 'urgent'); setShowPriorityPopover(false); }} className="flex items-center gap-2 text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors">
                <Flag className="w-3.5 h-3.5 text-red-500 fill-red-500/20 shrink-0" /> Urgent
              </button>
              <button onClick={() => { onChangePriority(task.id, 'high'); setShowPriorityPopover(false); }} className="flex items-center gap-2 text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors">
                <Flag className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" /> High
              </button>
              <button onClick={() => { onChangePriority(task.id, 'medium'); setShowPriorityPopover(false); }} className="flex items-center gap-2 text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors">
                <Flag className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20 shrink-0" /> Normal
              </button>
              <button onClick={() => { onChangePriority(task.id, 'low'); setShowPriorityPopover(false); }} className="flex items-center gap-2 text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors">
                <Flag className="w-3.5 h-3.5 text-zinc-500 fill-zinc-500/20 shrink-0" /> Low
              </button>
              <div className="border-t border-zinc-800 my-1 font-sans mx-1" />
              <button onClick={() => { onChangePriority(task.id, 'none'); setShowPriorityPopover(false); }} className="flex items-center gap-2 text-left px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 rounded-md transition-colors font-semibold">
                <Ban className="w-3.5 h-3.5 shrink-0" /> Clear
              </button>
            </div>
          )}
        </div>

        <div className="w-40 flex justify-start shrink-0 relative px-2">
          <div
            onClick={() => {
              try {
                if (dateInputRef.current && 'showPicker' in HTMLInputElement.prototype) {
                  dateInputRef.current.showPicker();
                } else {
                  dateInputRef.current?.focus();
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all duration-200 cursor-pointer ${task.dueDate ? 'bg-zinc-800/40 border border-zinc-700/50 hover:border-zinc-500 text-zinc-300' : 'text-zinc-400 border border-dashed border-zinc-700 hover:border-[#d4af37] hover:text-[#d4af37]'}`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-medium truncate">
              {task.dueDate ? formatDueDate(task.dueDate) : <span className="uppercase tracking-wider">Due Date</span>}
            </span>
          </div>
          <input
            type="date"
            ref={dateInputRef}
            value={task.dueDate ? task.dueDate.split('T')[0] : ''}
            onChange={(e) => onChangeDueDate(task.id, e.target.value || null)}
            className="absolute opacity-0 w-px h-px overflow-hidden pointer-events-none"
            style={{ right: '50%' }}
          />
        </div>

        <div className="w-24 flex justify-center shrink-0">
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setExpanded(true); setIsAddingMode(true); }} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-[#d4af37] rounded transition-colors" title="Add Subtask">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => onDeleteTask(task.id)} className="p-1.5 hover:bg-red-950/30 text-zinc-400 hover:text-red-400 rounded transition-colors" title="Delete Task">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (task.subtasks.length > 0 || isAddingMode) && (
        <div className="flex flex-col relative before:absolute before:left-[1.35rem] before:top-0 before:bottom-0 before:w-px before:bg-zinc-800/50">
          {task.subtasks.map(sub => (
            <TaskRow
              key={sub.id}
              task={sub}
              level={level + 1}
              employees={employees}
              onAddSubtask={onAddSubtask}
              onDeleteTask={onDeleteTask}
              onToggleAssign={onToggleAssign}
              onChangeStatus={onChangeStatus}
              onChangePriority={onChangePriority}
              onChangeDueDate={onChangeDueDate}
            />
          ))}
          {isAddingMode && (
            <TaskInputRow
              level={level + 1}
              onSave={(name) => {
                if (name.trim()) onAddSubtask(task.id, name.trim());
                setIsAddingMode(false);
              }}
              onCancel={() => setIsAddingMode(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<{ id: string, name: string }[]>([]);

  const [isAddingRootTask, setIsAddingRootTask] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [taskFilters, setTaskFilters] = useState({
    status: 'all',
    priority: 'all',
    deadline: 'all',
  });

  // New sophisticated colors matching your dark/gold aesthetic
  const projectColors = ['#d4af37', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

  useEffect(() => {
    axiosInstance.get('/users?status=active').then(res => {
      setEmployees(res.data.data.map((u: any) => ({ id: u._id, name: u.fullName })));
    }).catch(console.error);
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axiosInstance.get('/projects');
      const projectsData = res.data.data;

      let basicSelectedProjectId = selectedProjectId;
      if (projectsData.length > 0 && !basicSelectedProjectId) {
        basicSelectedProjectId = projectsData[0]._id;
      }

      const basicProjects = projectsData.map((p: any, index: number) => ({
        id: p._id,
        name: p.name,
        color: projectColors[index % projectColors.length],
        tasks: []
      }));
      setProjects(basicProjects);

      if (basicSelectedProjectId) {
        setSelectedProjectId(basicSelectedProjectId);
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch tasks when project is selected
  const [tasksLoading, setTasksLoading] = useState(false);
  const [hasFetchedTasks, setHasFetchedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedProjectId) return;
    if (hasFetchedTasks[selectedProjectId]) return; // Skip fetch if cached

    let didCancel = false;
    const fetchSelectedTasks = async () => {
      setTasksLoading(true);
      try {
        const taskRes = await axiosInstance.get(`/tasks/project/${selectedProjectId}?topLevel=false`);
        if (didCancel) return;
        const tasksData = taskRes.data.data;
        const roots = buildTaskTree(tasksData);
        setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, tasks: roots } : p));
        setHasFetchedTasks(prev => ({ ...prev, [selectedProjectId]: true }));
      } catch (e) {
        console.error(e);
      } finally {
        if (!didCancel) setTasksLoading(false);
      }
    };
    fetchSelectedTasks();
    return () => { didCancel = true; };
  }, [selectedProjectId, hasFetchedTasks]);

  const updateLocalTask = (taskId: string, updates: Partial<Task>) => {
    setProjects(prevProjects => {
      const newProjects = [...prevProjects];
      const updateTree = (tasks: Task[]): boolean => {
        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i].id === taskId) {
            tasks[i] = { ...tasks[i], ...updates };
            return true;
          }
          if (tasks[i].subtasks && tasks[i].subtasks.length > 0) {
            if (updateTree(tasks[i].subtasks)) return true;
          }
        }
        return false;
      };

      for (const p of newProjects) {
        const cpTasks = JSON.parse(JSON.stringify(p.tasks));
        if (updateTree(cpTasks)) {
          p.tasks = cpTasks;
          break;
        }
      }
      return newProjects;
    });
  };

  const handleAddTask = async (projectId: string, parentId: string | null, name: string) => {
    try {
      const res = await axiosInstance.post('/tasks', {
        name: name,
        project: projectId,
        parentTask: parentId,
        status: 'todo',
        priority: 'none',
      });
      const newTask = res.data.data;
      const formattedSubtask: Task = {
        id: newTask._id,
        name: newTask.name,
        assignees: (newTask.assignees || []).map((a: any) => ({ id: a._id || a, name: a.fullName || a.name || '' })),
        status: 'todo',
        priority: 'none',
        dueDate: null,
        subtasks: []
      };

      setProjects(prev => {
        const newProjects = [...prev];
        const proj = newProjects.find(p => p.id === projectId);
        if (!proj) return prev;

        const cpTasks = JSON.parse(JSON.stringify(proj.tasks));

        if (!parentId) {
          cpTasks.push(formattedSubtask);
        } else {
          const addToParent = (tasks: Task[]) => {
            for (let i = 0; i < tasks.length; i++) {
              if (tasks[i].id === parentId) {
                tasks[i].subtasks.push(formattedSubtask);
                return true;
              }
              if (tasks[i].subtasks && addToParent(tasks[i].subtasks)) return true;
            }
            return false;
          };
          addToParent(cpTasks);
        }
        proj.tasks = cpTasks;
        return newProjects;
      });
    } catch (e) {
      fetchProjects();
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      await axiosInstance.post('/projects', {
        name: newProjectName.trim(),
        description: newProjectDesc.trim()
      });
      setShowAddProjectModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      fetchProjects();
    } catch (e) { }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task? Associated subtasks will also be deleted.")) return;
    setProjects(prev => {
      const newProjects = [...prev];
      const removeTask = (tasks: Task[]) => {
        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i].id === taskId) {
            tasks.splice(i, 1);
            return true;
          }
          if (tasks[i].subtasks && removeTask(tasks[i].subtasks)) return true;
        }
        return false;
      };
      for (const p of newProjects) {
        const cpTasks = JSON.parse(JSON.stringify(p.tasks));
        if (removeTask(cpTasks)) {
          p.tasks = cpTasks;
          break;
        }
      }
      return newProjects;
    });
    try {
      await axiosInstance.delete(`/tasks/${taskId}`);
    } catch (e) {
      fetchProjects();
    }
  };

  const handleToggleAssign = async (taskId: string, userId: string) => {
    let currentTask: Task | undefined;
    const findTask = (tasks: Task[]) => {
      for (const t of tasks) {
        if (t.id === taskId) {
          currentTask = t; return true;
        }
        if (t.subtasks && findTask(t.subtasks)) return true;
      }
      return false;
    };
    for (const p of projects) {
      if (findTask(p.tasks)) break;
    }

    if (!currentTask) return;

    const hasUser = currentTask.assignees.some(a => a.id === userId);
    let newAssignees;
    if (hasUser) {
      newAssignees = currentTask.assignees.filter(a => a.id !== userId);
    } else {
      const emp = employees.find(e => e.id === userId);
      if (!emp) return;
      newAssignees = [...currentTask.assignees, { id: emp.id, name: emp.name }];
    }

    updateLocalTask(taskId, { assignees: newAssignees });
    try {
      await axiosInstance.put(`/tasks/${taskId}`, { assignees: newAssignees.map(a => a.id) });
    } catch (e) { fetchProjects(); }
  };

  const handleChangeStatus = async (taskId: string, status: string) => {
    updateLocalTask(taskId, { status });
    try {
      await axiosInstance.put(`/tasks/${taskId}`, { status });
    } catch (e) { fetchProjects(); }
  };

  const handleChangePriority = async (taskId: string, priority: string) => {
    updateLocalTask(taskId, { priority });
    try {
      await axiosInstance.put(`/tasks/${taskId}`, { priority });
    } catch (e) { fetchProjects(); }
  };

  const handleChangeDueDate = async (taskId: string, dueDate: string | null) => {
    updateLocalTask(taskId, { dueDate });
    try {
      await axiosInstance.put(`/tasks/${taskId}`, { dueDate });
    } catch (e) { fetchProjects(); }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const filterTopLevelTasks = (tasks: Task[], filters: typeof taskFilters): Task[] => {
    return tasks.filter(t => {
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;

      if (filters.deadline !== 'all') {
        if (!t.dueDate) return false;

        const todayStr = new Date().toISOString().split('T')[0];
        const dueStr = t.dueDate.split('T')[0];
        if (filters.deadline === 'today' && dueStr !== todayStr) return false;
        if (filters.deadline === 'overdue' && (dueStr >= todayStr || t.status === 'done')) return false;
      }

      return true;
    });
  };

  const filteredTasks = selectedProject ? filterTopLevelTasks(selectedProject.tasks, taskFilters) : [];

  if (isLoading) {
    // Return empty structural state immediately instead of a full loading screen
    // This allows the sidebars and headers to render instantly while data populates.
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row bg-[#0a0a0a] rounded-xl border border-zinc-800/50 overflow-hidden font-sans">

      {/* Sidebar - Project List */}
      <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-zinc-800/50 bg-[#18181b] shrink-0 flex flex-col pt-6 max-h-[300px] md:max-h-none overflow-y-auto">
        <div className="px-6 pb-5 border-b border-zinc-800/50 flex items-center justify-between">
          <h2 className="text-lg text-zinc-100 font-light tracking-wide">Projects</h2>
          <button onClick={() => setShowAddProjectModal(true)} className="px-2 py-1.5 hover:bg-[#d4af37]/10 text-[#d4af37] rounded-md transition-colors flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold" title="New Project">
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>
        <div className="p-4 space-y-1.5 overflow-y-auto flex-1">
          {projects.length === 0 ? (
            <p className="text-sm text-zinc-600 px-2 italic">No projects found.</p>
          ) : projects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm flex items-center gap-3 transition-all duration-200 ${selectedProjectId === p.id ? 'bg-[#d4af37]/10 text-[#d4af37] font-medium ring-1 ring-[#d4af37]/30' : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}`}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}40` }} />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Selected Project Tasks */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] relative">
        {selectedProject ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18181b]/30">
              <div className="flex items-center gap-4">
                <div className="w-3 h-8 rounded-sm shrink-0" style={{ backgroundColor: selectedProject.color }} />
                <h1 className="text-3xl text-zinc-100 font-light truncate">{selectedProject.name}</h1>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
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

                <button
                  onClick={() => setIsAddingRootTask(true)}
                  className="px-4 py-1.5 bg-[#d4af37] text-black text-xs uppercase tracking-widest font-semibold rounded-md hover:bg-[#b5952f] flex items-center justify-center gap-2 transition-colors shrink-0 shadow-lg shadow-[#d4af37]/10"
                >
                  <Plus className="w-4 h-4" /> Task
                </button>
              </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-8 pb-48">
              <div className="border border-zinc-800/60 rounded-xl bg-[#18181b] shadow-xl flex flex-col pb-8">
                {/* List Header */}
                <div className="flex bg-[#0a0a0a]/50 px-3 py-3 border-b border-zinc-800/60 rounded-t-xl text-[10px] uppercase tracking-widest text-zinc-500 font-semibold shrink-0">
                  <div className="flex-1 pl-[2.25rem]">Task Name</div>
                  <div className="w-48 text-left pl-2 shrink-0">Assignee</div>
                  <div className="w-12 text-center shrink-0">Pri</div>
                  <div className="w-40 text-left pl-2 shrink-0">Due Date</div>
                  <div className="w-24 text-center shrink-0">Actions</div>
                </div>

                {/* List Rows */}
                <div className="flex flex-col relative min-h-[200px]">
                  {tasksLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#18181b]/80 z-10 backdrop-blur-sm">
                      <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
                      <span className="text-xs text-zinc-400 tracking-widest uppercase mt-4">Loading tasks...</span>
                    </div>
                  ) : filteredTasks.length === 0 && !isAddingRootTask ? (
                    <div className="p-16 text-center flex flex-col items-center">
                      <FolderOpen className="w-12 h-12 text-zinc-700 mb-4" />
                      <p className="text-zinc-400 text-sm font-medium">No tasks in this project yet.</p>
                      <p className="text-xs text-zinc-600 mt-2">Click the "Add Task" button above to get started.</p>
                    </div>
                  ) : (
                    <>
                      {filteredTasks.map(t => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          employees={employees}
                          onAddSubtask={(parentId, name) => { handleAddTask(selectedProject.id, parentId, name); }}
                          onDeleteTask={handleDeleteTask}
                          onToggleAssign={handleToggleAssign}
                          onChangeStatus={handleChangeStatus}
                          onChangePriority={handleChangePriority}
                          onChangeDueDate={handleChangeDueDate}
                        />
                      ))}
                      {isAddingRootTask && (
                        <TaskInputRow
                          level={0}
                          onSave={(name) => {
                            if (name.trim()) handleAddTask(selectedProject.id, null, name.trim());
                            setIsAddingRootTask(false);
                          }}
                          onCancel={() => setIsAddingRootTask(false)}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <Folder className="w-16 h-16 text-zinc-800 mb-6" />
            <p className="text-xl font-light text-zinc-300">No Project Selected</p>
            <p className="text-sm mt-2 text-zinc-500">Select a project from the sidebar to view its tasks.</p>
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#18181b] w-full max-w-md border border-zinc-800 shadow-2xl rounded-xl overflow-hidden mx-4">
            <div className="p-5 border-b border-zinc-800">
              <h3 className="text-xl font-light text-[#d4af37]">Add New Project</h3>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-semibold">Project Name</label>
                <input
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-4 py-3 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-zinc-200 placeholder:text-zinc-600 transition-colors"
                  placeholder="e.g. Website Redesign"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-semibold">Description <span className="text-zinc-600 normal-case tracking-normal font-normal">(Optional)</span></label>
                <textarea
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  className="w-full text-sm bg-[#0a0a0a] border border-zinc-800 rounded-md px-4 py-3 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] resize-none h-28 text-zinc-200 placeholder:text-zinc-600 transition-colors"
                  placeholder="Brief description..."
                />
              </div>
            </div>
            <div className="p-5 border-t border-zinc-800 flex justify-end gap-3 bg-[#0a0a0a]/50">
              <button onClick={() => setShowAddProjectModal(false)} className="px-5 py-2.5 text-xs uppercase tracking-widest font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors">Cancel</button>
              <button onClick={handleCreateProject} className="px-5 py-2.5 text-xs uppercase tracking-widest bg-[#d4af37] text-black rounded-md font-semibold hover:bg-[#b5952f] transition-colors shadow-lg shadow-[#d4af37]/10">Create Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}