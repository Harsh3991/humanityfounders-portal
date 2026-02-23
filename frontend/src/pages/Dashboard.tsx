import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../lib/axiosInstance';
import { Clock, CheckCircle, AlertTriangle, FolderOpen, Pause, Play, History, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type AttendanceStatus = 'absent' | 'present-light' | 'present-medium' | 'present-full';

interface TimeSession {
  status: 'clocked-in' | 'away' | 'clocked-out' | 'absent';
  activeSeconds: number;
  runStartedAt: number | null;
}

interface AttendanceEntry {
  date: string;
  totalSeconds: number;
  attendanceStatus: AttendanceStatus;
  summary: string;
  clockIn: number;
  clockOut: number;
}

function getAttendanceStatus(totalSeconds: number): AttendanceStatus {
  const hours = totalSeconds / 3600;
  if (hours < 4) return 'present-light';
  if (hours < 7) return 'present-medium';
  return 'present-full';
}

// Updated to match the dark matte / rich colors of the calendar
const STATUS_CONFIG: Record<AttendanceStatus, { label: string; colorClass: string }> = {
  'absent': { label: 'Absent', colorClass: 'text-red-400 border-red-900/50 bg-red-950/40' },
  'present-light': { label: '<4 Hrs', colorClass: 'text-emerald-500/70 border-emerald-900/30 bg-emerald-950/20' },
  'present-medium': { label: '4-6 Hrs', colorClass: 'text-emerald-400 border-emerald-800/60 bg-emerald-900/30' },
  'present-full': { label: '7+ Hrs', colorClass: 'text-emerald-400 border-emerald-700 bg-emerald-900/50' },
};

function getDisplaySeconds(session: TimeSession | null): number {
  if (!session) return 0;
  const base = session.activeSeconds;
  if (session.status !== 'clocked-in' || !session.runStartedAt) return base;
  return base + Math.floor((Date.now() - session.runStartedAt) / 1000);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [session, setSession] = useState<TimeSession | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [dailyUpdate, setDailyUpdate] = useState('');
  const [updateError, setUpdateError] = useState('');

  const [history, setHistory] = useState<AttendanceEntry[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [totalPresent, setTotalPresent] = useState<number | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const todayRes = await axiosInstance.get('/attendance/today');
        if (todayRes.data.success) {
          const d = todayRes.data.data;
          const s: TimeSession = {
            status: d.status,
            activeSeconds: d.activeSeconds || 0,
            runStartedAt: d.status === 'clocked-in' ? Date.now() : null
          };
          setSession(s);
          setDisplayTime(d.activeSeconds || 0);
        }

        const projRes = await axiosInstance.get('/projects');
        setProjects(projRes.data.data.map((p: any) => p.name));

        const taskRes = await axiosInstance.get('/tasks/my-tasks');
        setTasks(taskRes.data.data.map((t: any) => ({
          id: t._id,
          name: t.name,
          project: t.project?.name || 'Unassigned',
          due: t.dueDate ? t.dueDate.split('T')[0] : 'No Date',
          overdue: t.dueDate && new Date(t.dueDate) < new Date()
        })));

        const histRes = await axiosInstance.get('/attendance/history');
        const dataArray = histRes?.data?.data?.records;

        if (histRes?.data?.success && Array.isArray(dataArray)) {
          const formattedHistory = dataArray.map((h: any) => ({
            date: new Date(h.date).toISOString().slice(0, 10),
            totalSeconds: h.activeSeconds || 0,
            attendanceStatus: h.status === 'absent' ? 'absent' : getAttendanceStatus(h.activeSeconds || 0),
            summary: h.dailyReport || 'No update provided',
            clockIn: h.clockIn ? new Date(h.clockIn).getTime() : Date.now(),
            clockOut: h.clockOut ? new Date(h.clockOut).getTime() : Date.now(),
          }));
          setHistory(formattedHistory);
        }

        if (user?.role === 'admin') {
          try {
            const statusRes = await axiosInstance.get('/attendance/admin/status');
            if (statusRes.data.success) {
              const presentCount = statusRes.data.data.filter((u: any) => u.status !== 'absent').length;
              setTotalPresent(presentCount);
            }
          } catch (e) {
            console.error("Failed to load admin stats", e);
          }
        }
      } catch (err) {
        console.error("Dashboard fetch error", err);
      }
    };
    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    if (!session || session.status !== 'clocked-in') return;
    const interval = setInterval(() => {
      setDisplayTime(getDisplaySeconds(session));
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => { setDisplayTime(getDisplaySeconds(session)); }, [session]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const handleClockIn = useCallback(async () => {
    const now = Date.now();
    setSession(prev => ({ status: 'clocked-in', activeSeconds: prev?.activeSeconds || 0, runStartedAt: now }));
    try {
      await axiosInstance.post('/attendance/clock-in');
    } catch (err) { }
  }, []);

  const handleToggleAway = useCallback(async () => {
    const isCurrentlyAway = session?.status === 'away';
    setSession((prev) => {
      if (!prev) return prev;
      if (prev.status === 'clocked-in' && prev.runStartedAt) {
        const newElapsed = prev.activeSeconds + Math.floor((Date.now() - prev.runStartedAt) / 1000);
        return { ...prev, status: 'away', activeSeconds: newElapsed, runStartedAt: null };
      }
      return { ...prev, status: 'clocked-in', runStartedAt: Date.now() };
    });
    try {
      if (isCurrentlyAway) await axiosInstance.post('/attendance/resume');
      else await axiosInstance.post('/attendance/away');
    } catch (err) { }
  }, [session]);

  const handleClockOutClick = useCallback(() => {
    setUpdateError('');
    setDailyUpdate('');
    setShowClockOutModal(true);
  }, []);

  const handleSubmitClockOut = useCallback(async () => {
    if (!dailyUpdate.trim()) {
      setUpdateError('Please fill in your daily update before clocking out');
      return;
    }
    try {
      await axiosInstance.post('/attendance/clock-out', { dailyReport: dailyUpdate.trim() });
    } catch (err) { }

    const totalSeconds = getDisplaySeconds(session);
    const status = getAttendanceStatus(totalSeconds);
    const now = Date.now();

    const entry: AttendanceEntry = {
      date: new Date().toISOString().slice(0, 10),
      totalSeconds,
      attendanceStatus: status,
      summary: dailyUpdate.trim(),
      clockIn: now,
      clockOut: now,
    };

    setHistory((prev) => [entry, ...prev]);
    setSession((prev) => prev ? { ...prev, status: 'clocked-out', activeSeconds: totalSeconds, runStartedAt: null } : null);
    setDisplayTime(totalSeconds);
    setShowClockOutModal(false);
    setDailyUpdate('');
  }, [dailyUpdate, session]);

  const isClockedIn = session?.status === 'clocked-in' || session?.status === 'away';
  const isAway = session?.status === 'away';
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEntry = history.find((e) => e.date === todayStr);
  const recentHistory = history.slice(0, 7);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10 text-zinc-300 font-sans">

      {/* Welcome Section */}
      <div className="border-b border-zinc-800/50 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-zinc-100">
            Welcome back, <span className="text-[#d4af37] font-medium">{user?.fullName}</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-2 tracking-wide uppercase">{user?.department} Department</p>
        </div>

        {user?.role === 'admin' && totalPresent !== null && (
          <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl px-5 py-3 shadow-md flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-0.5">Total Present Today</p>
              <p className="text-xl text-emerald-400 font-mono leading-none">{totalPresent}</p>
            </div>
          </div>
        )}
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Attendance Timer Card */}
        <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Attendance</h3>
            {isClockedIn && (
              <span className={`ml-auto text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border ${isAway ? 'border-amber-700/50 text-amber-500 bg-amber-950/20' : 'border-emerald-700/50 text-emerald-400 bg-emerald-950/20'}`}>
                {isAway ? 'Away' : 'Active'}
              </span>
            )}
          </div>

          <div className="text-center py-4">
            <p className={`font-mono text-5xl font-light tabular-nums tracking-tight transition-colors duration-300 ${isAway ? 'text-amber-500' : 'text-zinc-100'}`}>
              {formatTime(displayTime)}
            </p>

            <div className="flex gap-3 mt-8 justify-center">
              {!isClockedIn ? (
                <button
                  onClick={handleClockIn}
                  className="px-6 py-2.5 text-xs font-semibold uppercase tracking-widest border border-[#d4af37] text-[#d4af37] rounded-md hover:bg-[#d4af37] hover:text-black transition-all duration-300"
                >
                  Clock In
                </button>
              ) : (
                <button
                  onClick={handleToggleAway}
                  className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-widest border rounded-md transition-all duration-300 flex items-center gap-2 ${isAway
                    ? 'border-emerald-600/50 text-emerald-400 hover:bg-emerald-900/40'
                    : 'border-amber-600/50 text-amber-500 hover:bg-amber-900/40'
                    }`}
                >
                  {isAway ? <><Play className="w-3 h-3" /> Resume</> : <><Pause className="w-3 h-3" /> Away</>}
                </button>
              )}
              <button
                onClick={handleClockOutClick}
                disabled={!isClockedIn}
                className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest border border-zinc-700 text-zinc-400 rounded-md hover:border-red-500/70 hover:text-red-400 transition-all duration-300 disabled:opacity-30 disabled:hover:border-zinc-700 disabled:hover:text-zinc-400"
              >
                Clock Out
              </button>
            </div>
          </div>
        </div>

        {/* Clock Out Modal */}
        <Dialog open={showClockOutModal} onOpenChange={setShowClockOutModal}>
          <DialogContent className="bg-[#18181b] border-zinc-800 text-zinc-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-light text-[#d4af37]">Daily Update Required</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-400 mb-2 block">
                  Work Summary <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={dailyUpdate}
                  onChange={(e) => { setDailyUpdate(e.target.value); setUpdateError(''); }}
                  placeholder="Describe what you worked on today..."
                  className="bg-[#0a0a0a] border-zinc-800 text-zinc-200 min-h-[120px] resize-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                />
                {updateError && (
                  <p className="text-red-400 text-xs mt-2">{updateError}</p>
                )}
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-400 mb-2 block">
                  Blockers / Notes <span className="text-zinc-600 lowercase tracking-normal">(optional)</span>
                </label>
                <Textarea
                  placeholder="Any blockers or additional notes..."
                  className="bg-[#0a0a0a] border-zinc-800 text-zinc-200 min-h-[60px] resize-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowClockOutModal(false)} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
                Cancel
              </Button>
              <Button onClick={handleSubmitClockOut} className="bg-[#d4af37] text-black hover:bg-[#b5952f] font-semibold">
                Submit &amp; Clock Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Monthly Stats Card */}
        <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Monthly Stats</h3>
          </div>
          <div className="space-y-5 mt-2">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-400 tracking-wide">Present</span>
                <span className="text-zinc-100 font-medium font-mono">18 days</span>
              </div>
              <div className="w-full bg-zinc-800/50 rounded-full h-1.5">
                <div className="bg-emerald-500/80 h-1.5 rounded-full" style={{ width: '90%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-400 tracking-wide">Absent</span>
                <span className="text-zinc-100 font-medium font-mono">2 days</span>
              </div>
              <div className="w-full bg-zinc-800/50 rounded-full h-1.5">
                <div className="bg-red-500/80 h-1.5 rounded-full" style={{ width: '10%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Active Projects Card */}
        <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <FolderOpen className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Active Projects</h3>
          </div>
          <ul className="space-y-3">
            {projects.length > 0 ? projects.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                {p}
              </li>
            )) : (
              <li className="text-sm text-zinc-500 italic">No active projects</li>
            )}
          </ul>
        </div>
      </div>

      {/* Today's Summary (shown after clock out) */}
      {!isClockedIn && todayEntry && (
        <div className={`bg-[#18181b] border rounded-xl p-6 shadow-md ${todayEntry.attendanceStatus === 'present-full' ? 'border-emerald-700/50' :
          todayEntry.attendanceStatus === 'present-medium' ? 'border-emerald-800/50' :
            todayEntry.attendanceStatus === 'present-light' ? 'border-emerald-900/50' : 'border-red-900/50'
          }`}>
          <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-5 h-5 ${todayEntry.attendanceStatus.startsWith('present') ? 'text-emerald-500' : 'text-red-500'}`} />
              <h3 className="text-xs text-zinc-300 uppercase tracking-widest font-semibold">Today's Summary</h3>
            </div>
            <span className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-md border font-semibold ${STATUS_CONFIG[todayEntry.attendanceStatus].colorClass}`}>
              {STATUS_CONFIG[todayEntry.attendanceStatus].label}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Total Hours</p>
              <p className="font-mono text-2xl text-zinc-100">{formatTime(todayEntry.totalSeconds)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Clock In</p>
              <p className="text-base text-zinc-300 font-mono">{new Date(todayEntry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Clock Out</p>
              <p className="text-base text-zinc-300 font-mono">{new Date(todayEntry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-800/50">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Work Summary</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{todayEntry.summary}</p>
          </div>
        </div>
      )}

      {/* Attendance History */}
      {recentHistory.length > 0 && (
        <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <History className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Recent History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-800/80">
                  <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Date</th>
                  <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Hours</th>
                  <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Status</th>
                  <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {recentHistory.map((entry, i) => (
                  <tr key={`${entry.date}-${i}`} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 px-2 text-zinc-300 font-mono text-xs">{entry.date}</td>
                    <td className="py-3 px-2 text-zinc-300 font-mono text-xs tabular-nums">{formatTime(entry.totalSeconds)}</td>
                    <td className="py-3 px-2">
                      <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border font-medium ${STATUS_CONFIG[entry.attendanceStatus].colorClass}`}>
                        {STATUS_CONFIG[entry.attendanceStatus].label}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-zinc-400 max-w-[250px] truncate text-xs">{entry.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6 shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-[#d4af37]" />
          <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">My Tasks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-zinc-800/80">
                <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Task</th>
                <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Project</th>
                <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {tasks.length > 0 ? tasks.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 px-2 text-zinc-200 font-medium">{t.name}</td>
                  <td className="py-3 px-2 text-zinc-400 text-xs">{t.project}</td>
                  <td className={`py-3 px-2 font-mono text-xs ${t.overdue ? 'text-red-400' : 'text-zinc-400'}`}>
                    {t.due} {t.overdue && <span className="ml-2 text-[10px] bg-red-950/40 border border-red-900/50 text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Overdue</span>}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="py-6 text-zinc-500 text-center text-xs italic">No active tasks</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}