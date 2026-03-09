import { useState, useEffect, useRef } from 'react';
import axiosInstance from '../lib/axiosInstance';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, ChevronDown, ChevronRight, Folder, FolderOpen, Trash2, User, Loader2, CheckCircle2, Flag, Ban, Calendar, Pencil, Clock } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  assignees: { id: string; name: string }[];
  status: string;
  priority: string;
  dueDate: string | null;
  subtasks: Task[];
  deadlineExtended?: boolean;
}

interface Project {
  id: string;
  name: string;
  tasks: Task[];
  color: string;
}

// Helper to build a recursive task tree — sorted oldest-first by createdAt
function buildTaskTree(flatTasks: any[]): Task[] {
  // Sort ascending by creation time so oldest tasks appear at the top
  const sorted = [...flatTasks].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const taskMap = new Map<string, Task>();
  const roots: Task[] = [];

  for (const t of sorted) {
    taskMap.set(t._id, {
      id: t._id,
      name: t.name,
      assignees: (t.assignees || []).map((a: any) => ({ id: a._id || a, name: a.fullName || a.name || '' })),
      status: t.status || 'todo',
      priority: t.priority || 'none',
      dueDate: t.dueDate || null,
      deadlineExtended: t.deadlineExtended || false,
      subtasks: []
    });
  }

  for (const t of sorted) {
    const task = taskMap.get(t._id)!;
    if (t.parentTask) {
      const parent = taskMap.get(t.parentTask);
      if (parent) {
        parent.subtasks.push(task); // subtasks also in creation order
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

const AVATAR_COLORS = [
  { bg: 'bg-[#d4af37]/20', text: 'text-[#d4af37]' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  { bg: 'bg-amber-500/20', text: 'text-amber-500' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
];

const getAvatarColor = (identifier: string) => {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

const TaskInputRow = ({
  level,
  employees,
  onSave,
  onCancel
}: {
  level: number;
  employees: { id: string, name: string }[];
  onSave: (data: { name: string; assignees: string[]; priority: string; dueDate: string | null }) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [priority, setPriority] = useState('none');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [showAssignPopover, setShowAssignPopover] = useState(false);
  const [showPriorityPopover, setShowPriorityPopover] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const assignRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showAssignPopover && !showPriorityPopover) return;
    function handleClickOutside(event: MouseEvent) {
      if (assignRef.current && !assignRef.current.contains(event.target as Node)) {
        setShowAssignPopover(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
        setShowPriorityPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssignPopover, showPriorityPopover]);

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(assignSearch.toLowerCase()));

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 20) {
      setError('Task name must be at least 20 characters');
      return;
    }
    if (trimmedName.length > 150) {
      setError('Task name cannot exceed 150 characters');
      return;
    }
    onSave({ name: trimmedName, assignees: selectedAssignees, priority, dueDate });
    setError(null);
  };

  return (
    <div
      className={`flex items-start py-3 px-3 bg-[#d4af37]/[0.03] border-b border-zinc-800/40 last:border-0 ring-1 ring-[#d4af37]/20 ${showAssignPopover ? 'relative z-50' : ''}`}
    >
      <div style={{ width: `calc(${level * 1.5}rem + 12px)` }} className="shrink-0" />
      {/* Status placeholder */}
      <div className="relative mr-1.5 flex items-center justify-center shrink-0 mt-0.5">
        <div className="w-5 h-5 flex items-center justify-center">
          <div className="w-3.5 h-3.5 rounded-full border-[2px] border-zinc-500 border-dotted" />
        </div>
      </div>

      {/* Chevron placeholder */}
      <div className="w-5 h-5 flex items-center justify-center mr-3 text-zinc-600 shrink-0 mt-0.5">
        <ChevronRight className="w-4 h-4 opacity-50" />
      </div>

      {/* Name input */}
      <div className="flex-1 min-w-[200px] text-sm text-zinc-200 pr-4 shrink-0 flex flex-col">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Task name (20-150 characters)..."
          className={`w-full bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-zinc-600 font-medium py-0.5 ${error ? 'text-red-400' : ''}`}
          maxLength={150}
        />
        <div className="flex items-center justify-between w-full pr-4 mt-1 mb-1">
          {error ? (
            <span className="text-[10px] text-red-500 font-medium">{error}</span>
          ) : (
            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
              {name.length < 20 ? `${20 - name.length} more chars needed` : `${150 - name.length} chars remaining`}
            </span>
          )}
        </div>
      </div>

      {/* Assignee picker */}
      <div className="w-48 flex items-center justify-start shrink-0 relative" ref={assignRef}>
        <button
          onClick={() => setShowAssignPopover(!showAssignPopover)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all duration-200 ${selectedAssignees.length > 0
            ? 'bg-zinc-800/40 border border-zinc-700/50 hover:border-zinc-500'
            : 'text-zinc-400 border border-dashed border-zinc-700 hover:border-[#d4af37] hover:text-[#d4af37]'
            }`}
        >
          {selectedAssignees.length > 0 ? (
            <div className="flex -space-x-1.5 items-center">
              {selectedAssignees.map((uid) => {
                const emp = employees.find(e => e.id === uid);
                if (!emp) return null;
                const colors = getAvatarColor(emp.id);
                return (
                  <div key={uid} className={`w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center ${colors.text} text-[10px] font-bold flex-shrink-0 ring-1 ring-[#18181b]`} title={emp.name}>
                    {emp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                  </div>
                );
              })}
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
                  onClick={() => toggleAssignee(emp.id)}
                  className="flex items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors w-full text-left"
                >
                  <span>{emp.name}</span>
                  {selectedAssignees.includes(emp.id) && <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37]" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Priority picker */}
      <div className="w-12 flex justify-center shrink-0 relative" ref={priorityRef}>
        <button
          onClick={() => setShowPriorityPopover(!showPriorityPopover)}
          className="w-7 h-7 flex items-center justify-center hover:bg-zinc-800 rounded-md transition-colors"
        >
          <Flag className={`w-3.5 h-3.5 ${priority === 'urgent' ? 'text-red-500 fill-red-500/20' :
            priority === 'high' ? 'text-amber-500 fill-amber-500/20' :
              priority === 'medium' ? 'text-blue-500 fill-blue-500/20' :
                priority === 'low' ? 'text-zinc-500 fill-zinc-500/20' :
                  'text-white'
            }`} />
        </button>

        {showPriorityPopover && (
          <div className="absolute top-full right-0 mt-2 w-32 bg-[#18181b] border border-zinc-700 shadow-xl rounded-lg overflow-hidden z-[100] flex flex-col p-1">
            <button onClick={() => { setPriority('urgent'); setShowPriorityPopover(false); }} className="flex items-center gap-2 text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors">
              <Flag className="w-3.5 h-3.5 text-red-500 fill-red-500/20 shrink-0" /> Urgent
            </button>
            <button onClick={() => { setPriority('high'); setShowPriorityPopover(false); }} className="flex items-center gap-2 text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors">
              <Flag className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" /> High
            </button>
            <button onClick={() => { setPriority('medium'); setShowPriorityPopover(false); }} className="flex items-center gap-2 text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors">
              <Flag className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20 shrink-0" /> Normal
            </button>
            <button onClick={() => { setPriority('low'); setShowPriorityPopover(false); }} className="flex items-center gap-2 text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors">
              <Flag className="w-3.5 h-3.5 text-zinc-500 fill-zinc-500/20 shrink-0" /> Low
            </button>
            <div className="border-t border-zinc-800 my-1 font-sans mx-1" />
            <button onClick={() => { setPriority('none'); setShowPriorityPopover(false); }} className="flex items-center gap-2 text-left px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 rounded-md transition-colors font-semibold">
              <Ban className="w-3.5 h-3.5 shrink-0" /> Clear
            </button>
          </div>
        )}
      </div>

      {/* Due date picker */}
      <div className="w-36 flex justify-start shrink-0 relative px-2">
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
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all duration-200 cursor-pointer ${dueDate
            ? 'bg-zinc-800/40 border border-zinc-700/50 hover:border-zinc-500 text-zinc-300'
            : 'text-zinc-400 border border-dashed border-zinc-700 hover:border-[#d4af37] hover:text-[#d4af37]'
            }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-medium truncate">
            {dueDate ? formatDueDate(dueDate) : <span className="uppercase tracking-wider">Due Date</span>}
          </span>
        </div>
        <input
          type="date"
          ref={dateInputRef}
          value={dueDate || ''}
          onChange={(e) => setDueDate(e.target.value || null)}
          className="absolute opacity-0 w-px h-px overflow-hidden pointer-events-none"
          style={{ right: '50%' }}
        />
      </div>

      {/* Save / Cancel */}
      <div className="w-24 shrink-0 flex items-center justify-center gap-1.5">
        <button onClick={handleSave} className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors rounded shadow-lg shadow-[#d4af37]/10">Save</button>
        <button onClick={onCancel} className="px-2.5 py-1.5 text-[10px] uppercase tracking-widest font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors">✕</button>
      </div>
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
  onChangeDueDate,
  onChangeName,
  onToggleDeadlineExtended,
  parentId = null,
  onDragStartReorder,
  onDragOverReorder,
  onDropReorder,
  onDragEndReorder
}: {
  task: Task,
  level?: number,
  employees: { id: string, name: string }[],
  onAddSubtask: (parentId: string, data: { name: string; assignees: string[]; priority: string; dueDate: string | null }) => void,
  onDeleteTask: (taskId: string) => void,
  onToggleAssign: (taskId: string, userId: string) => void,
  onChangeStatus: (taskId: string, status: string) => void,
  onChangePriority: (taskId: string, priority: string) => void,
  onChangeDueDate: (taskId: string, dueDate: string | null) => void,
  onChangeName: (taskId: string, newName: string) => void,
  onToggleDeadlineExtended: (taskId: string, extended: boolean) => void,
  parentId?: string | null,
  onDragStartReorder: (e: React.DragEvent, taskId: string, parentId: string | null) => void,
  onDragOverReorder: (e: React.DragEvent, taskId: string, parentId: string | null) => void,
  onDropReorder: (e: React.DragEvent, taskId: string, parentId: string | null) => void,
  onDragEndReorder: (e: React.DragEvent) => void
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

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const editInputRef = useRef<HTMLInputElement>(null);

  // A task is overdue ONLY if it's not done and the due date has passed (ignoring time)
  const isOverdue = (() => {
    if (!task.dueDate || task.status === 'done') return false;
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  })();

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

  const handleNameSave = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed.length >= 20 && trimmed.length <= 150 && trimmed !== task.name) {
      onChangeName(task.id, trimmed);
    } else {
      setEditName(task.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSave();
    if (e.key === 'Escape') {
      setEditName(task.name);
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    if (isEditingName) {
      editInputRef.current?.focus();
    }
  }, [isEditingName]);

  return (
    <div className={`flex flex-col ${showAssignPopover ? 'relative z-50' : ''}`}>
      <div
        draggable
        onDragStart={(e) => onDragStartReorder(e, task.id, parentId || null)}
        onDragOver={(e) => onDragOverReorder(e, task.id, parentId || null)}
        onDrop={(e) => onDropReorder(e, task.id, parentId || null)}
        onDragEnd={onDragEndReorder}
        className="flex items-start group py-3 px-3 hover:bg-zinc-800/20 transition-colors border-b border-zinc-800/40 last:border-0 cursor-grab active:cursor-grabbing"
      >
        <div style={{ width: `calc(${level * 1.5}rem + 12px)` }} className="shrink-0" />
        <div className="relative mr-1.5 flex items-center justify-center shrink-0 mt-0.5" ref={statusRef}>
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
          className="w-5 h-5 flex items-center justify-center mr-3 text-zinc-500 hover:text-[#d4af37] transition-colors shrink-0 mt-0.5"
          onClick={() => setExpanded(!expanded)}
          style={{ visibility: task.subtasks.length > 0 || isAddingMode ? 'visible' : 'hidden' }}
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-[200px] flex flex-col pr-4 shrink-0 py-1">
          {isEditingName ? (
            <div className="flex flex-col w-full relative">
              <input
                ref={editInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                className={`w-full bg-[#0a0a0a] border ${editName.trim().length < 20 || editName.trim().length > 150 ? 'border-red-500/50 focus:ring-red-500/50' : 'border-zinc-800 focus:border-[#d4af37] focus:ring-[#d4af37]'} text-zinc-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 transition-colors`}
              />
              <span className={`text-[10px] mt-1 ${editName.trim().length < 20 || editName.trim().length > 150 ? 'text-red-400' : 'text-zinc-500'}`}>
                {editName.trim().length} / 150 chars (min 20)
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 relative group/name">
              <span
                className="text-sm text-zinc-200 font-medium break-words whitespace-normal leading-relaxed cursor-text"
                onDoubleClick={() => setIsEditingName(true)}
              >
                {task.name}
              </span>
              <button
                onClick={() => setIsEditingName(true)}
                className="opacity-0 group-hover/name:opacity-100 p-1 text-zinc-500 hover:text-[#d4af37] transition-all ml-1 shrink-0 bg-zinc-900/50 rounded-md mt-0.5"
                title="Edit name"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {task.deadlineExtended ? (
                <span className="text-[9px] uppercase tracking-widest bg-blue-950/50 text-blue-500 px-1.5 py-0.5 rounded border border-blue-900/50 font-bold shrink-0 mt-0.5">
                  Deadline Extended
                </span>
              ) : isOverdue && (
                <span className="text-[9px] uppercase tracking-widest bg-red-950/50 text-red-500 px-1.5 py-0.5 rounded border border-red-900/50 font-bold shrink-0 mt-0.5">
                  Overdue
                </span>
              )}
            </div>
          )}
        </div>

        <div className="w-48 flex items-center justify-start shrink-0 relative" ref={assignRef}>
          <button
            onClick={() => setShowAssignPopover(!showAssignPopover)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all duration-200 ${(task.assignees && task.assignees.length > 0) ? 'bg-zinc-800/40 border border-zinc-700/50 hover:border-zinc-500' : 'text-zinc-400 border border-dashed border-zinc-700 hover:border-[#d4af37] hover:text-[#d4af37]'}`}
          >
            {task.assignees && task.assignees.length > 0 ? (
              <div className="flex -space-x-1.5 items-center">
                {task.assignees.map((assignee) => {
                  const colors = getAvatarColor(assignee.id);
                  return (
                    <div key={assignee.id} className={`w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center ${colors.text} text-[10px] font-bold flex-shrink-0 ring-1 ring-[#18181b]`} title={assignee.name}>
                      {assignee.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                  );
                })}
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

        <div className="w-36 flex justify-start shrink-0 relative px-1">
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
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-200 cursor-pointer ${task.dueDate ? (task.deadlineExtended ? 'bg-blue-950/10 border border-blue-900/40 hover:border-blue-500/50' : isOverdue ? 'bg-red-950/10 border border-red-900/40 hover:border-red-500/50' : 'bg-zinc-800/40 border border-zinc-700/50 hover:border-zinc-500') : 'text-zinc-400 border border-dashed border-zinc-700 hover:border-[#d4af37] hover:text-[#d4af37]'}`}
          >
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${task.deadlineExtended ? 'text-blue-500' : isOverdue ? 'text-red-500' : task.dueDate ? 'text-zinc-400' : ''}`} />
            <span className={`text-[11px] font-medium whitespace-nowrap ${task.deadlineExtended ? 'text-blue-400' : isOverdue ? 'text-red-400' : task.status === 'done' ? 'text-emerald-500/80' : task.dueDate ? 'text-zinc-300' : ''}`}>
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

        <div className="w-32 flex justify-center shrink-0">
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onToggleDeadlineExtended(task.id, !task.deadlineExtended)} className={`p-1.5 rounded transition-colors ${task.deadlineExtended ? 'bg-blue-950/30 text-blue-400' : 'hover:bg-blue-950/30 text-zinc-400 hover:text-blue-400'}`} title={task.deadlineExtended ? "Remove Deadline Extended" : "Mark Deadline Extended"}>
              <Clock className="w-4 h-4" />
            </button>
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
              parentId={task.id}
              employees={employees}
              onAddSubtask={onAddSubtask}
              onDeleteTask={onDeleteTask}
              onToggleAssign={onToggleAssign}
              onChangeStatus={onChangeStatus}
              onChangePriority={onChangePriority}
              onChangeDueDate={onChangeDueDate}
              onChangeName={onChangeName}
              onToggleDeadlineExtended={onToggleDeadlineExtended}
              onDragStartReorder={onDragStartReorder}
              onDragOverReorder={onDragOverReorder}
              onDropReorder={onDropReorder}
              onDragEndReorder={onDragEndReorder}
            />
          ))}
          {isAddingMode && (
            <TaskInputRow
              level={level + 1}
              employees={employees}
              onSave={(data) => {
                if (data.name.trim()) onAddSubtask(task.id, { ...data, name: data.name.trim() });
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
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const [taskFilters, setTaskFilters] = useState({
    status: 'all',
    priority: 'all',
    deadline: 'all',
    employee: 'all',
  });

  const [draggedItem, setDraggedItem] = useState<{ id: string, parentId: string | null } | null>(null);

  const handleDragStartReorder = (e: React.DragEvent, id: string, parentId: string | null) => {
    e.stopPropagation();
    setDraggedItem({ id, parentId });
    e.dataTransfer.effectAllowed = 'move';
    (e.target as HTMLElement).classList.add('opacity-40');
  };

  const handleDragOverReorder = (e: React.DragEvent, id: string, parentId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropReorder = (e: React.DragEvent, dropTargetId: string, parentId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).classList.remove('opacity-40');

    if (!draggedItem) return;
    if (draggedItem.id === dropTargetId) return;
    if (draggedItem.parentId !== parentId) return;

    setProjects(prevProjects => {
      const newProjects = JSON.parse(JSON.stringify(prevProjects));
      for (const p of newProjects) {
        if (p.id === selectedProjectId) {
          if (parentId === null) {
            const dragIndex = p.tasks.findIndex((t: Task) => t.id === draggedItem.id);
            const dropIndex = p.tasks.findIndex((t: Task) => t.id === dropTargetId);
            if (dragIndex > -1 && dropIndex > -1) {
              const [draggedObj] = p.tasks.splice(dragIndex, 1);
              p.tasks.splice(dropIndex, 0, draggedObj);
            }
          } else {
            const reorderSubtasks = (tasks: Task[]) => {
              for (const task of tasks) {
                if (task.id === parentId) {
                  const dragIndex = task.subtasks.findIndex(t => t.id === draggedItem.id);
                  const dropIndex = task.subtasks.findIndex(t => t.id === dropTargetId);
                  if (dragIndex > -1 && dropIndex > -1) {
                    const [draggedObj] = task.subtasks.splice(dragIndex, 1);
                    task.subtasks.splice(dropIndex, 0, draggedObj);
                  }
                  return true;
                }
                if (task.subtasks && task.subtasks.length > 0) {
                  if (reorderSubtasks(task.subtasks)) return true;
                }
              }
              return false;
            };
            reorderSubtasks(p.tasks);
          }
        }
      }
      return newProjects;
    });

    setDraggedItem(null);
  };

  const handleDragEndReorder = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('opacity-40');
    setDraggedItem(null);
  };


  // New sophisticated colors matching your dark/gold aesthetic
  const projectColors = ['#d4af37', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

  useEffect(() => {
    if (!user) return;
    axiosInstance.get('/users?status=active').then(res => {
      setEmployees(res.data.data.map((u: any) => ({ id: u._id, name: u.fullName })));
    }).catch(console.error);
  }, [user]);

  const fetchProjects = async () => {
    try {
      const res = await axiosInstance.get('/projects');
      const projectsData = res.data.data;

      const basicProjects = projectsData.map((p: any, index: number) => ({
        id: p._id,
        name: p.name,
        color: projectColors[index % projectColors.length],
        tasks: []
      }));
      setProjects(basicProjects);

      if (projectsData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsData[0]._id);
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

  // Fetch tasks when switching to a new project (cache-aware)
  const [tasksLoading, setTasksLoading] = useState(false);
  const [hasFetchedTasks, setHasFetchedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedProjectId) return;
    if (hasFetchedTasks[selectedProjectId]) return; // Already cached

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

  const handleAddTask = async (
    projectId: string,
    parentId: string | null,
    data: { name: string; assignees: string[]; priority: string; dueDate: string | null }
  ) => {
    try {
      const res = await axiosInstance.post('/tasks', {
        name: data.name,
        project: projectId,
        parentTask: parentId,
        assignees: data.assignees,
        priority: data.priority || 'none',
        dueDate: data.dueDate || undefined,
        status: 'todo',
      });
      const newTask = res.data.data;
      const formattedSubtask: Task = {
        id: newTask._id,
        name: newTask.name,
        assignees: (newTask.assignees || []).map((a: any) => ({ id: a._id || a, name: a.fullName || a.name || '' })),
        status: newTask.status || 'todo',
        priority: newTask.priority || data.priority || 'none',
        dueDate: newTask.dueDate || data.dueDate || null,
        deadlineExtended: newTask.deadlineExtended || false,
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
    if (!newProjectName.trim() || isSubmittingProject) return;
    setIsSubmittingProject(true);
    try {
      await axiosInstance.post('/projects', {
        name: newProjectName.trim(),
        description: newProjectDesc.trim()
      });
      setShowAddProjectModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      fetchProjects();
    } catch (e) {
      console.error("Failed to create project", e);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || isDeletingProject) return;
    setIsDeletingProject(true);
    const deletedId = projectToDelete.id;
    try {
      await axiosInstance.delete(`/projects/${deletedId}`);
      // Optimistically remove from state
      setProjects(prev => prev.filter(p => p.id !== deletedId));
      if (selectedProjectId === deletedId) {
        setSelectedProjectId(null);
      }
      setProjectToDelete(null);
    } catch (e) {
      console.error("Failed to delete project", e);
      fetchProjects(); // Re-fetch on error
    } finally {
      setIsDeletingProject(false);
    }
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

    const updates: Partial<Task> = { dueDate };
    if (currentTask && currentTask.dueDate && dueDate && new Date(dueDate) > new Date(currentTask.dueDate)) {
      updates.deadlineExtended = true;
    }

    updateLocalTask(taskId, updates);
    try {
      await axiosInstance.put(`/tasks/${taskId}`, updates);
    } catch (e) { fetchProjects(); }
  };

  const handleChangeName = async (taskId: string, newName: string) => {
    updateLocalTask(taskId, { name: newName });
    try {
      await axiosInstance.put(`/tasks/${taskId}`, { name: newName });
    } catch (e) { fetchProjects(); }
  };

  const handleToggleDeadlineExtended = async (taskId: string, extended: boolean) => {
    updateLocalTask(taskId, { deadlineExtended: extended });
    try {
      await axiosInstance.put(`/tasks/${taskId}`, { deadlineExtended: extended });
    } catch (e) { fetchProjects(); }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const filterTopLevelTasks = (tasks: Task[], filters: typeof taskFilters): Task[] => {
    return tasks.filter(t => {
      if (filters.employee !== 'all') {
        const hasEmployee = (taskToCheck: Task): boolean => {
          if (taskToCheck.assignees?.some(a => a.id === filters.employee)) return true;
          if (taskToCheck.subtasks?.some(sub => hasEmployee(sub))) return true;
          return false;
        };
        if (!hasEmployee(t)) return false;
      }

      if (filters.status !== 'all' && t.status !== filters.status) return false;
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;

      if (filters.deadline !== 'all') {
        if (!t.dueDate) return false;

        const todayStr = new Date().toISOString().split('T')[0];
        const dueStr = t.dueDate.split('T')[0];
        if (filters.deadline === 'today' && dueStr !== todayStr) return false;
        if (filters.deadline === 'overdue' && (dueStr >= todayStr || t.status === 'done' || t.deadlineExtended)) return false;
        if (filters.deadline === 'extended' && !t.deadlineExtended) return false;
      }

      return true;
    });
  };

  const filteredTasks = selectedProject ? filterTopLevelTasks(selectedProject.tasks, taskFilters) : [];

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-6 bg-[#0a0a0a] rounded-xl border border-zinc-800/50 font-sans">
        <div className="w-10 h-10 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm uppercase tracking-widest font-semibold">Loading projects...</p>
      </div>
    );
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
            <div
              key={p.id}
              className={`group w-full flex items-center gap-1 rounded-lg transition-all duration-200 ${selectedProjectId === p.id ? 'bg-[#d4af37]/10 ring-1 ring-[#d4af37]/30' : 'hover:bg-zinc-800/40'}`}
            >
              <button
                onClick={() => setSelectedProjectId(p.id)}
                className={`flex-1 text-left px-4 py-3 text-sm flex items-center gap-3 transition-all duration-200 min-w-0 ${selectedProjectId === p.id ? 'text-[#d4af37] font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}40` }} />
                <span className="truncate">{p.name}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setProjectToDelete({ id: p.id, name: p.name }); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 mr-2 hover:bg-red-950/40 text-zinc-600 hover:text-red-400 rounded transition-all duration-200 shrink-0"
                title="Delete project"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
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
                  <option value="extended">Deadline Extended</option>
                  <option value="today">Today</option>
                </select>

                <select
                  className="bg-[#0a0a0a] border border-zinc-800 text-zinc-300 text-xs rounded-md px-2 py-1.5 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none max-w-[120px] truncate"
                  value={taskFilters.employee}
                  onChange={e => setTaskFilters({ ...taskFilters, employee: e.target.value })}
                >
                  <option value="all">Assignee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
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
                  <div style={{ width: '12px' }} className="shrink-0" />
                  <div className="w-5 mr-1.5 shrink-0" /> {/* Status */}
                  <div className="w-5 mr-3 shrink-0" /> {/* Chevron */}
                  <div className="flex-1 min-w-[200px] pr-4">Task Name</div>
                  <div className="w-48 text-left px-2 shrink-0">Assignee</div>
                  <div className="w-12 text-center shrink-0">Pri</div>
                  <div className="w-36 text-left px-2 shrink-0">Due Date</div>
                  <div className="w-32 text-center shrink-0">Actions</div>
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
                          parentId={null}
                          employees={employees}
                          onAddSubtask={(parentId, data) => { handleAddTask(selectedProject.id, parentId, data); }}
                          onDeleteTask={handleDeleteTask}
                          onToggleAssign={handleToggleAssign}
                          onChangeStatus={handleChangeStatus}
                          onChangePriority={handleChangePriority}
                          onChangeDueDate={handleChangeDueDate}
                          onChangeName={handleChangeName}
                          onToggleDeadlineExtended={handleToggleDeadlineExtended}
                          onDragStartReorder={handleDragStartReorder}
                          onDragOverReorder={handleDragOverReorder}
                          onDropReorder={handleDropReorder}
                          onDragEndReorder={handleDragEndReorder}
                        />
                      ))}
                      {isAddingRootTask && (
                        <TaskInputRow
                          level={0}
                          employees={employees}
                          onSave={(data) => {
                            if (data.name.trim()) handleAddTask(selectedProject.id, null, { ...data, name: data.name.trim() });
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

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#18181b] w-full max-w-sm border border-red-900/30 shadow-2xl rounded-xl overflow-hidden mx-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Red accent bar */}
            <div className="h-1 bg-gradient-to-r from-red-800 via-red-600 to-red-800" />
            <div className="p-6">
              {/* Icon */}
              <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-900/40 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-light text-zinc-100 text-center mb-2">Delete Project</h3>
              <p className="text-sm text-zinc-400 text-center mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-sm font-semibold text-red-400 text-center mb-4 truncate px-4">
                &ldquo;{projectToDelete.name}&rdquo;
              </p>
              <p className="text-xs text-zinc-500 text-center mb-6 leading-relaxed">
                This will permanently delete the project and <span className="text-zinc-300 font-medium">all associated tasks</span>. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setProjectToDelete(null)}
                  disabled={isDeletingProject}
                  className="flex-1 px-4 py-2.5 text-xs uppercase tracking-widest font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={isDeletingProject}
                  className={`flex-1 px-4 py-2.5 text-xs uppercase tracking-widest font-semibold bg-red-700 text-white hover:bg-red-600 rounded-md transition-colors flex items-center justify-center gap-2 ${isDeletingProject ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isDeletingProject ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...</>
                  ) : (
                    <><Trash2 className="w-3.5 h-3.5" /> Delete Project</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={handleCreateProject} disabled={isSubmittingProject} className={`px-5 py-2.5 text-xs uppercase tracking-widest bg-[#d4af37] text-black rounded-md font-semibold hover:bg-[#b5952f] transition-colors shadow-lg shadow-[#d4af37]/10 ${isSubmittingProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isSubmittingProject ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}