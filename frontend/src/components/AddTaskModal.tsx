import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Flag, Calendar, ChevronRight, Folder, Check, Plus, UserPlus, Search, Layout, ChevronDown, User } from 'lucide-react';
import axiosInstance from '../lib/axiosInstance';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialAssigneeId?: string;
}

interface Project {
    _id: string;
    name: string;
}

interface Task {
    _id: string;
    name: string;
    parentTask: string | null;
    project: string;
}

export default function AddTaskModal({ isOpen, onClose, onSuccess, initialAssigneeId }: AddTaskModalProps) {
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([]);

    const [selectedProject, setSelectedProject] = useState('');
    const [selectedParent, setSelectedParent] = useState('');
    const [taskName, setTaskName] = useState('');
    const [priority, setPriority] = useState('none');
    const [dueDate, setDueDate] = useState('');
    const [assignees, setAssignees] = useState<string[]>(initialAssigneeId ? [initialAssigneeId] : []);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Custom Dropdown States
    const [isProjectOpen, setIsProjectOpen] = useState(false);
    const [isParentOpen, setIsParentOpen] = useState(false);
    const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
    
    const [projectSearch, setProjectSearch] = useState('');
    const [parentSearch, setParentSearch] = useState('');
    const [assigneeSearch, setAssigneeSearch] = useState('');
    
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    const projectRef = useRef<HTMLDivElement>(null);
    const parentRef = useRef<HTMLDivElement>(null);
    const assigneeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (initialAssigneeId) {
            setAssignees([initialAssigneeId]);
        }
    }, [initialAssigneeId]);

    // Click outside listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
                setIsProjectOpen(false);
            }
            if (parentRef.current && !parentRef.current.contains(event.target as Node)) {
                setIsParentOpen(false);
            }
            if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
                setIsAssigneeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [projRes, userRes] = await Promise.all([
                axiosInstance.get('/projects'),
                axiosInstance.get('/users?status=active')
            ]);
            setProjects(projRes.data.data);
            setEmployees(userRes.data.data.map((u: any) => ({ id: u._id, name: u.fullName })));
        } catch (err) {
            console.error("Failed to fetch modal data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchProjectTasks = async () => {
            if (!selectedProject) {
                setTasks([]);
                setSelectedParent('');
                setExpandedTasks(new Set());
                return;
            }
            try {
                const res = await axiosInstance.get(`/tasks/project/${selectedProject}?topLevel=false`);
                setTasks(res.data.data);
                setExpandedTasks(new Set());
            } catch (err) {
                console.error("Failed to fetch project tasks", err);
            }
        };
        fetchProjectTasks();
    }, [selectedProject]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskName || !selectedProject) {
            setError("Task name and Project are required.");
            return;
        }

        if (taskName.trim().length < 20) {
            setError("Task name must be at least 20 characters.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await axiosInstance.post('/tasks', {
                name: taskName,
                project: selectedProject,
                parentTask: selectedParent || null,
                priority,
                dueDate: dueDate || undefined,
                assignees: assignees
            });
            onSuccess();
            resetForm();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create task");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setTaskName('');
        setSelectedProject('');
        setSelectedParent('');
        setPriority('none');
        setDueDate('');
        setAssignees(initialAssigneeId ? [initialAssigneeId] : []);
        setError(null);
        setProjectSearch('');
        setParentSearch('');
        setAssigneeSearch('');
        setExpandedTasks(new Set());
    };

    const toggleExpandTask = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    const getTaskTreeIndented = () => {
        const taskMap = new Map<string, Task & { children: any[] }>();
        const roots: any[] = [];

        tasks.forEach(t => taskMap.set(t._id, { ...t, children: [] }));

        tasks.forEach(t => {
            const node = taskMap.get(t._id)!;
            if (t.parentTask && taskMap.has(t.parentTask)) {
                taskMap.get(t.parentTask)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        const sorted: { id: string, name: string, level: number, hasChildren: boolean, parentId: string | null }[] = [];
        const traverse = (nodes: any[], level: number, parentId: string | null) => {
            nodes.forEach(node => {
                sorted.push({
                    id: node._id,
                    name: node.name,
                    level,
                    hasChildren: node.children.length > 0,
                    parentId
                });
                traverse(node.children, level + 1, node._id);
            });
        };
        traverse(roots, 0, null);
        return sorted;
    };

    const indentedTasks = getTaskTreeIndented();

    const visibleTasks = indentedTasks.filter(t => {
        if (parentSearch) return t.name.toLowerCase().includes(parentSearch.toLowerCase());

        let currentParentId = t.parentId;
        while (currentParentId) {
            if (!expandedTasks.has(currentParentId)) return false;
            const parentNode = indentedTasks.find(p => p.id === currentParentId);
            currentParentId = parentNode ? parentNode.parentId : null;
        }
        return true;
    });

    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()));
    
    const availableEmployees = employees.filter(e => 
        !assignees.includes(e.id) && 
        e.name.toLowerCase().includes(assigneeSearch.toLowerCase())
    );

    const activeProject = projects.find(p => p._id === selectedProject);
    const activeParent = indentedTasks.find(t => t.id === selectedParent);

    // Shared input styling class for consistency
    const inputClasses = "w-full bg-[#0a0a0a]/80 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#d4af37]/70 focus:ring-2 focus:ring-[#d4af37]/20 transition-all duration-200 hover:border-zinc-700 placeholder:text-zinc-600 shadow-inner cursor-pointer";
    const labelClasses = "block text-[11px] uppercase tracking-wider text-zinc-400 mb-2 font-medium";
    const dropdownClasses = "absolute z-[100] w-full mt-2 bg-[#18181b] border border-zinc-700/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[550px] bg-[#18181b] border border-zinc-800/80 text-zinc-100 shadow-2xl shadow-black/50 p-0 overflow-hidden font-sans rounded-xl">
                <DialogHeader className="px-7 py-6 border-b border-zinc-800/50 bg-[#18181b]/50 backdrop-blur-sm">
                    <DialogTitle className="text-xl font-medium text-[#d4af37] tracking-wide flex items-center gap-2.5">
                        <Plus className="w-5 h-5 text-[#d4af37]/80" />
                        Create New Task
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-7 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-hide">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-lg text-red-400 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <X className="w-4 h-4 cursor-pointer hover:text-red-300 transition-colors shrink-0" onClick={() => setError(null)} />
                            <p className="leading-relaxed">{error}</p>
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* Project Selection */}
                        <div ref={projectRef} className="relative">
                            <label className={labelClasses}>Project</label>
                            <div
                                onClick={() => setIsProjectOpen(!isProjectOpen)}
                                className={inputClasses}
                            >
                                <div className="flex items-center gap-3">
                                    <Folder className={`w-4 h-4 ${activeProject ? 'text-[#d4af37]' : 'text-zinc-500'}`} />
                                    <span className={activeProject ? 'text-zinc-100' : 'text-zinc-500'}>
                                        {activeProject ? activeProject.name : 'Select a project...'}
                                    </span>
                                </div>
                                <ChevronRight className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-transform duration-200 ${isProjectOpen ? 'rotate-90' : ''}`} />
                            </div>

                            {isProjectOpen && (
                                <div className={dropdownClasses}>
                                    <div className="p-2 border-b border-zinc-800/50 bg-[#0a0a0a]/30">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                                            <input
                                                autoFocus
                                                placeholder="Search projects..."
                                                value={projectSearch}
                                                onChange={(e) => setProjectSearch(e.target.value)}
                                                className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#d4af37]/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-52 overflow-y-auto py-1 scrollbar-hide">
                                        {filteredProjects.length === 0 ? (
                                            <div className="px-4 py-3 text-xs text-zinc-500 italic">No projects found</div>
                                        ) : (
                                            filteredProjects.map(p => (
                                                <div
                                                    key={p._id}
                                                    onClick={() => {
                                                        setSelectedProject(p._id);
                                                        setIsProjectOpen(false);
                                                        setProjectSearch('');
                                                    }}
                                                    className={`px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer transition-colors ${selectedProject === p._id ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                                                        }`}
                                                >
                                                    {p.name}
                                                    {selectedProject === p._id && <Check className="w-3.5 h-3.5" />}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Parent Task Selection */}
                        {selectedProject && (
                            <div ref={parentRef} className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className={labelClasses}>Parent Task <span className="text-zinc-600 lowercase tracking-normal text-[10px] ml-1">(Optional)</span></label>
                                <div
                                    onClick={() => setIsParentOpen(!isParentOpen)}
                                    className={inputClasses}
                                >
                                    <div className="flex items-center gap-3">
                                        <Layout className={`w-4 h-4 ${activeParent ? 'text-[#d4af37]' : 'text-zinc-500'}`} />
                                        <span className={activeParent ? 'text-zinc-100' : 'text-zinc-500'}>
                                            {activeParent ? activeParent.name : 'None (Root Task)'}
                                        </span>
                                    </div>
                                    <ChevronRight className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-transform duration-200 ${isParentOpen ? 'rotate-90' : ''}`} />
                                </div>

                                {isParentOpen && (
                                    <div className={dropdownClasses}>
                                        <div className="p-2 border-b border-zinc-800/50 bg-[#0a0a0a]/30">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                                                <input
                                                    autoFocus
                                                    placeholder="Search tasks..."
                                                    value={parentSearch}
                                                    onChange={(e) => setParentSearch(e.target.value)}
                                                    className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#d4af37]/50"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto py-1 scrollbar-hide">
                                            <div
                                                onClick={() => {
                                                    setSelectedParent('');
                                                    setIsParentOpen(false);
                                                }}
                                                className={`px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer transition-colors ${selectedParent === '' ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                                                    }`}
                                            >
                                                None (Root Task)
                                                {selectedParent === '' && <Check className="w-3.5 h-3.5" />}
                                            </div>
                                            {visibleTasks.map(t => (
                                                <div
                                                    key={t.id}
                                                    onClick={() => {
                                                        setSelectedParent(t.id);
                                                        setIsParentOpen(false);
                                                        setParentSearch('');
                                                    }}
                                                    className={`px-4 py-2 text-sm flex items-center justify-between cursor-pointer transition-colors group/item ${selectedParent === t.id ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                                                        }`}
                                                    style={{ paddingLeft: `${(t.level * 1.5) + 0.5}rem` }}
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <div
                                                            onClick={(e) => t.hasChildren && toggleExpandTask(e, t.id)}
                                                            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700/50 transition-colors ${!t.hasChildren && 'invisible'}`}
                                                        >
                                                            {expandedTasks.has(t.id) ? (
                                                                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                                                            ) : (
                                                                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                                                            )}
                                                        </div>
                                                        <span className="truncate">{t.name}</span>
                                                    </div>
                                                    {selectedParent === t.id && <Check className="w-3.5 h-3.5" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <p className="text-[10px] text-zinc-500 mt-2 font-medium">Nest this task under an existing one to create subtasks.</p>
                            </div>
                        )}

                        {/* Task Name */}
                        <div>
                            <label className={labelClasses}>Task Title</label>
                            <input
                                type="text"
                                placeholder="What needs to be done? (Min 20 chars)"
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                className={inputClasses}
                                maxLength={150}
                                required
                            />
                            <div className="flex justify-end mt-1.5">
                                <span className={`text-[10px] font-medium transition-colors duration-200 ${taskName.length < 20 ? 'text-amber-500/80' : 'text-zinc-600'}`}>
                                    {taskName.length}/150 {taskName.length < 20 && taskName.length > 0 && `(need ${20 - taskName.length} more)`}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            {/* Priority */}
                            <div>
                                <label className={labelClasses}>Priority</label>
                                <div className="relative group">
                                    <Flag className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${priority === 'urgent' ? 'text-red-400' :
                                        priority === 'high' ? 'text-amber-400' :
                                            priority === 'medium' ? 'text-blue-400' :
                                                priority === 'low' ? 'text-zinc-400' : 'text-zinc-600'
                                        }`} />
                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className={`${inputClasses} pl-10 appearance-none`}
                                    >
                                        <option value="none" className="bg-[#18181b]">None</option>
                                        <option value="low" className="bg-[#18181b]">Low</option>
                                        <option value="medium" className="bg-[#18181b]">Medium</option>
                                        <option value="high" className="bg-[#18181b]">High</option>
                                        <option value="urgent" className="bg-[#18181b]">Urgent</option>
                                    </select>
                                    <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 rotate-90 pointer-events-none" />
                                </div>
                            </div>

                            {/* Due Date */}
                            <div>
                                <label className={labelClasses}>Due Date</label>
                                <div className="relative group">
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-[#d4af37] transition-colors duration-200" />
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className={`${inputClasses} pl-10 [color-scheme:dark]`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Assignees */}
                        <div ref={assigneeRef} className="relative">
                            <label className={labelClasses}>Assignees</label>
                            <div className={`flex flex-wrap items-center gap-2 p-2 bg-[#0a0a0a]/80 border border-zinc-800 rounded-lg min-h-[52px] transition-all duration-200 hover:border-zinc-700 focus-within:border-[#d4af37]/70 focus-within:ring-2 focus-within:ring-[#d4af37]/20`}>
                                {assignees.map(id => {
                                    const emp = employees.find(e => e.id === id);
                                    return (
                                        <div key={id} className="flex items-center gap-1.5 bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] px-2.5 py-1.5 rounded-md text-xs font-medium animate-in zoom-in-95 duration-200">
                                            {emp?.name || 'Loading...'}
                                            {id !== initialAssigneeId && (
                                                <X
                                                    className="w-3.5 h-3.5 cursor-pointer opacity-70 hover:opacity-100 hover:text-white transition-all"
                                                    onClick={() => setAssignees(prev => prev.filter(a => a !== id))}
                                                />
                                            )}
                                        </div>
                                    );
                                })}

                                <button 
                                    type="button"
                                    onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                                    className="flex items-center gap-1.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Add
                                </button>
                            </div>

                            {isAssigneeOpen && (
                                <div className={dropdownClasses}>
                                    <div className="p-2 border-b border-zinc-800/50 bg-[#0a0a0a]/30">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                                            <input
                                                autoFocus
                                                placeholder="Search members..."
                                                value={assigneeSearch}
                                                onChange={(e) => setAssigneeSearch(e.target.value)}
                                                className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#d4af37]/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto py-1 scrollbar-hide">
                                        {availableEmployees.length === 0 ? (
                                            <div className="px-4 py-3 text-xs text-zinc-500 italic">No members available</div>
                                        ) : (
                                            availableEmployees.map(e => (
                                                <div
                                                    key={e.id}
                                                    onClick={() => {
                                                        setAssignees([...assignees, e.id]);
                                                        setIsAssigneeOpen(false);
                                                        setAssigneeSearch('');
                                                    }}
                                                    className="px-4 py-2.5 text-sm flex items-center gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer transition-colors group/row"
                                                >
                                                    <div className="w-7 h-7 bg-[#d4af37]/10 rounded-full flex items-center justify-center text-[#d4af37] text-[10px] font-bold border border-[#d4af37]/20 group-hover/row:border-[#d4af37]/50 transition-colors">
                                                        <User className="w-3.5 h-3.5" />
                                                    </div>
                                                    {e.name}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-6 mt-2 flex items-center justify-end gap-3 border-t border-zinc-800/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-all duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || loading}
                            className="px-7 py-2.5 bg-[#d4af37] text-black text-[11px] uppercase tracking-wider font-bold rounded-lg shadow-[0_0_15px_rgba(212,175,55,0.15)] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:bg-[#c29f2f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 transform active:scale-[0.98]"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 stroke-[3]" />
                                    Create Task
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}