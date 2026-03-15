import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback, useMemo } from 'react';
import axiosInstance from '../lib/axiosInstance';
import { Clock, CheckCircle, AlertTriangle, FolderOpen, Pause, Play, History, Users, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type AttendanceStatus = 'absent' | 'present-light' | 'present-medium' | 'present-full' | 'working';

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
  if (hours <= 0) return 'absent';
  if (hours <= 3) return 'present-light';   // 1 to 3 hours
  if (hours <= 6) return 'present-medium';  // 4 to 6 hours
  return 'present-full';                    // 7+ hours
}

// Updated to match the dark matte / rich colors of the calendar
const STATUS_CONFIG: Record<AttendanceStatus, { label: string; colorClass: string }> = {
  'absent': { label: 'Absent', colorClass: 'text-red-400 border-red-900/50 bg-red-950/40' },
  'present-light': { label: '<4 Hrs', colorClass: 'text-emerald-500/70 border-emerald-900/30 bg-emerald-950/20' },
  'present-medium': { label: '4-6 Hrs', colorClass: 'text-emerald-400 border-emerald-800/60 bg-emerald-900/30' },
  'present-full': { label: '7+ Hrs', colorClass: 'text-emerald-400 border-emerald-700 bg-emerald-900/50' },
  'working': { label: 'Working', colorClass: 'text-yellow-500 border-yellow-800/60 bg-yellow-900/30' },
};

function getDisplaySeconds(session: TimeSession | null): number {
  if (!session) return 0;
  const base = session.activeSeconds;
  if (session.status !== 'clocked-in' || !session.runStartedAt) return base;
  return base + Math.floor((Date.now() - session.runStartedAt) / 1000);
}

const PRIORITY_STYLES: Record<string, string> = {
  none: 'text-zinc-500 border-zinc-800 bg-[#18181b]/50',
  low: 'text-zinc-400 border-zinc-700 bg-zinc-800/30',
  medium: 'text-blue-500 border-blue-800/50 bg-blue-950/20',
  high: 'text-amber-500 border-amber-700/50 bg-amber-950/20',
  urgent: 'text-red-400 border-red-800/50 bg-red-950/30',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<TimeSession | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [dailyUpdate, setDailyUpdate] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [isSubmittingClockOut, setIsSubmittingClockOut] = useState(false);

  const [history, setHistory] = useState<AttendanceEntry[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [totalPresent, setTotalPresent] = useState<number | null>(null);
  const [allOverdueTasks, setAllOverdueTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [taskFilters, setTaskFilters] = useState({
    status: 'none', // using 'none' to mean "All Active" by default or something? wait, we can just do 'all'
    priority: 'all',
    deadline: 'all'
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const promises = [
          axiosInstance.get('/attendance/today').catch(() => null),
          axiosInstance.get('/projects').catch(() => null),
          axiosInstance.get('/tasks/my-tasks').catch(() => null),
          axiosInstance.get(`/attendance/history?t=${Date.now()}`).catch(() => null),
          user?.role === 'admin' ? axiosInstance.get('/attendance/admin/status').catch(() => null) : Promise.resolve(null),
          user?.role === 'admin' ? axiosInstance.get('/tasks/overdue').catch(() => null) : Promise.resolve(null),
        ];

        const [todayRes, projRes, taskRes, histRes, statusRes, overdueRes] = await Promise.all(promises);

        if (todayRes?.data?.success) {
          const d = todayRes.data.data;
          const s: TimeSession = {
            status: d.status,
            activeSeconds: d.activeSeconds || 0,
            runStartedAt: d.status === 'clocked-in' ? Date.now() : null
          };
          setSession(s);
          setDisplayTime(d.activeSeconds || 0);
        }

        if (projRes?.data?.success) {
          setProjects(projRes.data.data.map((p: any) => p.name));
        }

        if (taskRes?.data?.success) {
          setTasks(taskRes.data.data.map((t: any) => ({
            id: t._id,
            name: t.name,
            project: t.project?.name || 'Unassigned',
            due: t.dueDate ? t.dueDate.split('T')[0] : 'No Date',
            status: t.status || 'todo',
            priority: t.priority || 'none',
            overdue: t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done',
            deadlineExtended: t.deadlineExtended || false
          })));
        }

        const dataArray = histRes?.data?.data?.records;
        if (histRes?.data?.success && Array.isArray(dataArray)) {
          const formattedHistory = dataArray.map((h: any) => {
            const d = new Date(h.date);
            const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            let mappedStatus: AttendanceStatus = getAttendanceStatus(h.activeSeconds || 0);
            if (h.status === 'clocked-in' || h.status === 'away') {
              mappedStatus = 'working';
            } else if (h.status === 'absent') {
              mappedStatus = 'absent';
            } else if (h.status === 'clocked-out' && (h.activeSeconds || 0) >= 28800) {
              mappedStatus = 'present-full';
            } else if (h.status === 'clocked-out') {
              mappedStatus = 'present-light'; // Handle partials so they don't revert
            }

            return {
              date: localDate,
              totalSeconds: h.activeSeconds || 0,
              attendanceStatus: mappedStatus,
              summary: h.dailyReport || 'No update provided',
              clockIn: h.clockIn ? new Date(h.clockIn).getTime() : Date.now(),
              clockOut: h.clockOut ? new Date(h.clockOut).getTime() : Date.now(),
            };
          });
          setHistory(formattedHistory);
        }

        if (statusRes?.data?.success) {
          const presentCount = statusRes.data.data.filter((u: any) => u.status !== 'absent').length;
          setTotalPresent(presentCount);
        }

        if (overdueRes?.data?.success) {
          setAllOverdueTasks(overdueRes.data.data || []);
        }
      } catch (err) {
        console.error("Dashboard fetch error", err);
      } finally {
        setIsLoading(false);
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
    const charCount = dailyUpdate.trim().length;
    if (charCount < 100) {
      setUpdateError(`Report must be at least 100 characters (currently ${charCount} chars). Please provide more detail.`);
      return;
    }
    setUpdateError(null as any);
    setIsSubmittingClockOut(true);

    try {
      await axiosInstance.post('/attendance/clock-out', { dailyReport: dailyUpdate.trim() });

      const totalSeconds = getDisplaySeconds(session);

      // Update session state immediately for the timer UI
      setSession((prev) => prev ? { ...prev, status: 'clocked-out', activeSeconds: totalSeconds, runStartedAt: null } : null);
      setDisplayTime(totalSeconds);
      setShowClockOutModal(false);
      setDailyUpdate('');

      // Re-fetch history from the API to get accurate, server-side data
      const histRes = await axiosInstance.get(`/attendance/history?t=${Date.now()}`);
      const dataArray = histRes?.data?.data?.records;
      if (histRes?.data?.success && Array.isArray(dataArray)) {
        const formattedHistory: AttendanceEntry[] = dataArray.map((h: any) => {
          const d = new Date(h.date);
          const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

          let mappedStatus: AttendanceStatus = getAttendanceStatus(h.activeSeconds || 0);
          if (h.status === 'clocked-in' || h.status === 'away') {
            mappedStatus = 'working';
          } else if (h.status === 'absent') {
            mappedStatus = 'absent';
          } else if (h.status === 'clocked-out' && (h.activeSeconds || 0) >= 28800) {
            mappedStatus = 'present-full';
          } else if (h.status === 'clocked-out') {
            mappedStatus = 'present-light'; // Handle partials so they don't revert
          }

          return {
            date: localDate,
            totalSeconds: h.activeSeconds || 0,
            attendanceStatus: mappedStatus,
            summary: h.dailyReport || 'No update provided',
            clockIn: h.clockIn ? new Date(h.clockIn).getTime() : Date.now(),
            clockOut: h.clockOut ? new Date(h.clockOut).getTime() : Date.now(),
          };
        });
        setHistory(formattedHistory);
      }
    } catch (err) {
      console.error("Failed to submit clock-out or refresh history:", err);
      setUpdateError('An error occurred. Please try again.');
    } finally {
      setIsSubmittingClockOut(false);
    }
  }, [dailyUpdate, session]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const historyByDay: Record<number, AttendanceEntry> = {};

    history.forEach(entry => {
      const entryDate = new Date(entry.date);
      if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
        historyByDay[entryDate.getDate()] = entry;
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const iterDate = new Date(currentYear, currentMonth, d);
      if (!historyByDay[d] && iterDate < today) {
        historyByDay[d] = {
          date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          totalSeconds: 0,
          attendanceStatus: 'absent' as AttendanceStatus,
          summary: 'No update provided',
          clockIn: 0,
          clockOut: 0
        };
      }
    }

    let present = 0;
    let absent = 0;

    Object.values(historyByDay).forEach(entry => {
      if (entry.attendanceStatus === 'absent') {
        absent++;
      } else {
        present++;
      }
    });

    const totalDays = present + absent;
    // Default to 0 to avoid NaN, but handle edge cases smoothly
    const presentPercentage = totalDays === 0 ? 0 : (present / totalDays) * 100;
    const absentPercentage = totalDays === 0 ? 0 : (absent / totalDays) * 100;

    return { present, absent, presentPercentage, absentPercentage };
  }, [history]);

  const isClockedIn = session?.status === 'clocked-in' || session?.status === 'away';
  const isAway = session?.status === 'away';
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayEntry = history.find((e) => e.date === todayStr);

  const recentActivities = useMemo(() => {
    const activities: any[] = [];
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Regex: split only at newlines that are immediately followed by a [time]: marker
    // This keeps multi-line report content (bullet lists etc.) together as one session
    const SESSION_SPLIT = /\n(?=\[\d{1,2}:\d{2}:\d{2}\s+(?:am|pm)\]:)/i;

    sortedHistory.forEach(entry => {
      // Skip today's working entry if no report submitted yet
      if (entry.attendanceStatus === 'working' && entry.summary === 'No update provided') return;

      // Derive status purely from hours worked
      const hoursStatus: AttendanceStatus =
        entry.attendanceStatus === 'absent' ? 'absent' : getAttendanceStatus(entry.totalSeconds);
      const statusLabel = STATUS_CONFIG[hoursStatus].label;
      const statusColor = STATUS_CONFIG[hoursStatus].colorClass;

      if (entry.attendanceStatus === 'absent') {
        activities.push({
          date: entry.date,
          hours: entry.totalSeconds,
          status: statusLabel,
          statusColor,
          summary: 'Absent'
        });
        return;
      }

      const sessions = entry.summary && entry.summary !== 'No update provided'
        ? entry.summary.split(SESSION_SPLIT).filter(s => s.trim()).reverse()
        : [];

      if (sessions.length === 0) return;

      sessions.forEach((session) => {
        activities.push({
          date: entry.date,
          hours: entry.totalSeconds,
          status: statusLabel,
          statusColor,
          summary: session.trim()
        });
      });
    });

    return activities.slice(0, 5);
  }, [history]);

  const filteredTasks = tasks.filter(t => {
    let match = true;
    if (taskFilters.status !== 'none' && taskFilters.status !== 'all' && t.status !== taskFilters.status) match = false;
    if (taskFilters.priority !== 'all' && t.priority !== taskFilters.priority) match = false;

    if (taskFilters.deadline !== 'all') {
      if (!t.due || t.due === 'No Date') {
        match = false;
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        if (taskFilters.deadline === 'today' && t.due !== todayStr) match = false;
        if (taskFilters.deadline === 'overdue' && (!t.overdue || t.deadlineExtended)) match = false;
        if (taskFilters.deadline === 'extended' && !t.deadlineExtended) match = false;
      }
    }
    return match;
  });

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-6 bg-[#0a0a0a] rounded-xl border border-zinc-800/50 font-sans">
        <div className="w-10 h-10 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm uppercase tracking-widest font-semibold">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10 text-zinc-300 font-sans">

      {/* Welcome Section */}
      <div className="border-b border-zinc-800/50 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-light text-zinc-100">
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
        <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-4 md:p-6 shadow-md">
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
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-400">
                    Work Summary <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-xs font-mono tabular-nums ${dailyUpdate.trim().length < 100
                    ? 'text-red-400'
                    : 'text-emerald-400'
                    }`}>
                    {dailyUpdate.trim().length} / 100 chars (min)
                  </span>
                </div>
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
              <Button
                onClick={handleSubmitClockOut}
                className="bg-[#d4af37] text-black hover:bg-[#b5952f] font-semibold flex items-center gap-2 min-w-[140px]"
                disabled={isSubmittingClockOut}
              >
                {isSubmittingClockOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Clocking Out...
                  </>
                ) : (
                  'Submit & Clock Out'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Monthly Stats Card */}
        <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-4 md:p-6 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Monthly Stats</h3>
          </div>
          <div className="space-y-5 mt-2">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-400 tracking-wide">Present</span>
                <span className="text-zinc-100 font-medium font-mono">{monthlyStats.present} days</span>
              </div>
              <div className="w-full bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500/80 h-full rounded-full transition-all duration-500" style={{ width: `${monthlyStats.presentPercentage}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-400 tracking-wide">Absent</span>
                <span className="text-zinc-100 font-medium font-mono">{monthlyStats.absent} days</span>
              </div>
              <div className="w-full bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-red-500/80 h-full rounded-full transition-all duration-500" style={{ width: `${monthlyStats.absentPercentage}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Active Projects Card */}
        <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-4 md:p-6 shadow-md flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <FolderOpen className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Active Projects</h3>
          </div>
          <ul className="space-y-3 flex-1">
            {projects.length > 0 ? projects.slice(0, 5).map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                {p}
              </li>
            )) : (
              <li className="text-sm text-zinc-500 italic">No active projects</li>
            )}
          </ul>
          {projects.length > 6 && (
            <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-end">
              <Link
                to="/projects"
                className="text-xs font-semibold uppercase tracking-widest text-[#d4af37] hover:text-[#b5952f] transition-colors flex items-center gap-1.5"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Today's Summary (shown after clock out) */}
      {!isClockedIn && todayEntry && (
        <div className={`bg-[#18181b] border rounded-xl p-4 md:p-6 shadow-md ${todayEntry.attendanceStatus === 'present-full' ? 'border-emerald-700/50' :
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
      {recentActivities.length > 0 && (
        <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-4 md:p-6 shadow-md">
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
                {recentActivities.map((activity, i) => (
                  <tr key={`${activity.date}-${i}`} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 px-2 text-zinc-300 font-mono text-xs whitespace-nowrap">{activity.date}</td>
                    <td className="py-3 px-2 text-zinc-300 font-mono text-xs tabular-nums">{formatTime(activity.hours)}</td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border font-medium ${activity.statusColor}`}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-zinc-400 text-xs leading-relaxed max-w-md">
                      {typeof activity.summary === 'string' && activity.summary.match(/^\[(.*?)\s+(am|pm|AM|PM)\]:\s*(.*)/i) ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-[#d4af37]/70 font-mono tracking-wider">
                            {activity.summary.match(/^\[(.*?)\]:/)?.[1]}
                          </span>
                          <span className="text-zinc-300">
                            {activity.summary.replace(/^\[.*?\]:\s*/, '')}
                          </span>
                        </div>
                      ) : (
                        activity.summary
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-4 md:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">My Tasks</h3>
          </div>
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
              <option value="extended">Deadline Extended</option>
              <option value="today">Today</option>
            </select>
          </div>
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
              {filteredTasks.length > 0 ? filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 px-2 text-zinc-200 font-medium">{t.name}</td>
                  <td className="py-3 px-2 text-zinc-400 text-xs">{t.project}</td>
                  <td className={`py-3 px-2 font-mono text-xs ${t.deadlineExtended ? 'text-blue-400' : (t.overdue ? 'text-red-400' : 'text-zinc-400')}`}>
                    {t.due} {t.deadlineExtended ? <span className="ml-2 text-[10px] bg-blue-950/40 border border-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Deadline Extended</span> : (t.overdue && <span className="ml-2 text-[10px] bg-red-950/40 border border-red-900/50 text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Overdue</span>)}
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

      {/* Admin: All Overdue Tasks */}
      {user?.role === 'admin' && (
        <div className="bg-[#18181b] border border-red-900/40 rounded-xl p-4 md:p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">All Overdue Tasks</h3>
            </div>
            {allOverdueTasks.length > 0 && (
              <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border border-red-900/50 text-red-400 bg-red-950/30 font-semibold self-start sm:self-auto">
                {allOverdueTasks.length} Overdue
              </span>
            )}
          </div>
          {allOverdueTasks.length === 0 ? (
            <p className="text-sm text-zinc-500 italic text-center py-6">No overdue tasks — everything is on track.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[640px]">
                <thead>
                  <tr className="border-b border-zinc-800/80">
                    <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Task</th>
                    <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Project</th>
                    <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Assigned To</th>
                    <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Priority</th>
                    <th className="py-3 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {allOverdueTasks.map((t, i) => (
                    <tr
                      key={t._id || i}
                      onClick={() => navigate(`/projects?projectId=${t.project?._id}`)}
                      className="hover:bg-red-950/10 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-2 text-zinc-200 font-medium max-w-[200px]">
                        <span className="truncate block">{t.name}</span>
                      </td>
                      <td className="py-3 px-2 text-zinc-400 text-xs whitespace-nowrap">{t.project?.name || 'Unassigned'}</td>
                      <td className="py-3 px-2 text-zinc-400 text-xs">
                        {(t.assignees || []).map((a: any) => a.fullName).join(', ') || '—'}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest rounded-md border font-bold ${PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.none}`}>
                          {t.priority || 'none'}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-mono text-xs text-red-400 whitespace-nowrap">
                        {t.dueDate ? t.dueDate.split('T')[0] : 'No Date'}
                        {t.deadlineExtended
                          ? <span className="ml-2 text-[10px] bg-blue-950/40 border border-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Extended</span>
                          : <span className="ml-2 text-[10px] bg-red-950/40 border border-red-900/50 text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Overdue</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}