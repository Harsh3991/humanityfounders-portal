import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Clock, CalendarDays, User as UserIcon, CheckCircle, XCircle, Loader2, ListTodo } from 'lucide-react';
import axiosInstance from '../lib/axiosInstance';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type AttendanceStatus = 'absent' | 'present-light' | 'present-medium' | 'present-full';

interface AttendanceEntry {
  date: string;
  totalSeconds: number;
  attendanceStatus: AttendanceStatus;
  summary: string;
  clockIn: number;
  clockOut: number;
  isAdminOverride: boolean;
}

interface EmployeeItem {
  id: string;
  name: string;
}

function getAttendanceStatus(totalSeconds: number): AttendanceStatus {
  const hours = totalSeconds / 3600;
  if (hours <= 0) return 'absent';
  if (hours <= 3) return 'present-light';   // 1 to 3 hours
  if (hours <= 6) return 'present-medium';  // 4 to 6 hours
  return 'present-full';                    // 7+ hours
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [history, setHistory] = useState<AttendanceEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const [overrideLoading, setOverrideLoading] = useState(false);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // 1. Fetch Employees if Admin
  useEffect(() => {
    if (!isAdmin) return;
    const fetchEmployees = async () => {
      try {
        const res = await axiosInstance.get('/users?status=active');
        const emps = res.data.data.map((u: any) => ({
          id: u._id,
          name: u.fullName
        }));
        setEmployees(emps);
        if (emps.length > 0) setSelectedEmployeeId(emps[0].id);
      } catch (err) {
        console.error("Failed to load employees for attendance", err);
      }
    };
    fetchEmployees();
  }, [isAdmin]);

  // 2. Fetch History
  const fetchHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      let res;
      if (isAdmin) {
        if (!selectedEmployeeId) return;
        res = await axiosInstance.get(`/attendance/admin/${selectedEmployeeId}/history`);
      } else {
        res = await axiosInstance.get(`/attendance/history`);
      }

      const dataArray = res?.data?.data?.records;

      if (res?.data?.success && Array.isArray(dataArray)) {
        const formattedHistory = dataArray.map((h: any) => {
          const d = new Date(h.date);
          const safeLocalString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return {
            date: safeLocalString,
            totalSeconds: h.activeSeconds || 0,
            attendanceStatus: h.status === 'absent' ? 'absent' : getAttendanceStatus(h.activeSeconds || 0),
            summary: h.dailyReport || 'No update provided',
            clockIn: h.clockIn ? new Date(h.clockIn).getTime() : Date.now(),
            clockOut: h.clockOut ? new Date(h.clockOut).getTime() : Date.now(),
            isAdminOverride: h.dailyReport && String(h.dailyReport).startsWith('Admin') ? true : false,
          };
        });
        setHistory(formattedHistory);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isAdmin, selectedEmployeeId]);

  useEffect(() => {
    fetchHistory();
    setSelectedDay(null);
  }, [fetchHistory, month, year]);

  const handleAdminOverride = async (day: number, status: 'present' | 'absent') => {
    if (!isAdmin || !selectedEmployeeId) return;

    // Safely format local YYYY-MM-DD without UTC conversion backward-drift
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setOverrideLoading(true);

    try {
      await axiosInstance.post(`/attendance/admin/${selectedEmployeeId}/override`, {
        date: dateStr,
        status
      });
      await fetchHistory(); // Refresh to reflect changes instantly
    } catch (error) {
      console.error("Failed to override attendance", error);
    } finally {
      setOverrideLoading(false);
    }
  };

  // Dictionary for quick day lookup
  const historyByDay = useMemo(() => {
    const map: Record<number, AttendanceEntry> = {};
    history.forEach((entry) => {
      const d = new Date(entry.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        map[d.getDate()] = entry;
      }
    });
    return map;
  }, [history, year, month]);

  // Calculate stats for Summary Widget
  const stats = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let totalSeconds = 0;

    Object.values(historyByDay).forEach(e => {
      if (e.attendanceStatus === 'absent') absentCount++;
      else {
        presentCount++;
        totalSeconds += e.totalSeconds;
      }
    });

    return {
      present: presentCount,
      absent: absentCount,
      hours: Math.floor(totalSeconds / 3600),
    };
  }, [historyByDay]);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const selectedEntry = selectedDay ? historyByDay[selectedDay] : null;
  const isSundaySelection = selectedDay ? new Date(year, month, selectedDay).getDay() === 0 : false;

  return (
    // Matte black global background container wrapper
    <div
      className="min-h-full bg-black -m-6 p-4 md:p-6 lg:p-8 font-sans text-gray-200"
    >
      <div className="mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 w-full max-w-[1500px]">

        {/* Left Sidebar (Only for Admins) */}
        {isAdmin && (
          <aside className="w-full lg:w-[260px] shrink-0 flex flex-col pt-1 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)]">
            <h1 className="text-yellow-500 font-heading text-3xl mb-8 tracking-wide">Workforce</h1>

            <div className="bg-[#18181b] rounded-xl overflow-hidden border border-zinc-800/60 shadow-2xl">
              <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Employees</span>
                <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">{employees.length}</span>
              </div>
              <div className="flex flex-col p-2 space-y-1 max-h-[50vh] lg:max-h-[70vh] overflow-y-auto">
                {employees.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedEmployeeId(e.id)}
                    className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${selectedEmployeeId === e.id
                      ? 'bg-yellow-500/10 text-yellow-500 font-medium'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-gray-200'
                      }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${selectedEmployeeId === e.id ? 'bg-yellow-500/20' : 'bg-zinc-800'
                      }`}>
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{e.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col xl:flex-row gap-6 lg:gap-8 pt-1">

          {/* Calendar Section (Left/Center) */}
          <section className="flex-1 min-w-0">
            {/* Calendar Header */}
            <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 w-full">
              {!isAdmin && <h1 className="text-yellow-500 font-heading text-3xl tracking-wide">Attendance</h1>}
              {isAdmin && (
                <div className="flex-1 min-w-0">
                  <h1 className="text-yellow-500 font-heading text-xl sm:text-2xl tracking-wide truncate pr-0 sm:pr-4 text-center sm:text-left title">
                    {employees.find(e => e.id === selectedEmployeeId)?.name}'s Record
                  </h1>
                </div>
              )}

              <div className="flex items-center justify-between w-full sm:w-auto sm:gap-6 bg-[#18181b] rounded-xl p-1.5 border border-zinc-800/60 shadow-lg shrink-0">
                <button
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-yellow-500 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 px-2 sm:px-4">
                  <CalendarDays className="w-4 h-4 text-yellow-500/70" />
                  <h2 className="text-yellow-500 font-heading text-lg md:text-xl tracking-wide w-32 md:w-40 text-center uppercase">
                    {monthName} {year}
                  </h2>
                </div>
                <button
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-yellow-500 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Calendar Grid */}
            <div className="bg-[#18181b] p-4 md:p-6 rounded-2xl border border-zinc-800/60 shadow-2xl">
              <div className="grid grid-cols-7 gap-2 sm:gap-3 lg:gap-4">
                {/* Day Labels */}
                {DAYS.map(d => (
                  <div key={d} className="text-center text-zinc-500 font-bold text-xs md:text-sm uppercase tracking-widest pb-2 sm:pb-3">
                    {d}
                  </div>
                ))}

                {/* Day Cards */}
                {isLoadingHistory ? (
                  <div className="col-span-7 py-16 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mb-4" />
                    <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">Loading Records...</p>
                  </div>
                ) : calendarDays.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} />;

                  const date = new Date(year, month, day);
                  const isSunday = date.getDay() === 0;
                  const entry = historyByDay[day];
                  const isSelected = selectedDay === day;

                  // Base styling for days
                  let bgClass = "bg-zinc-900/60 hover:bg-zinc-800 cursor-pointer border border-transparent";
                  let textClass = "text-yellow-500/80 group-hover:text-yellow-500";

                  if (isSunday) {
                    bgClass = "bg-[#1f1f22] border-zinc-800/50 pointer-events-none"; // Holiday
                    textClass = "text-zinc-600";
                  } else if (entry) {
                    if (entry.attendanceStatus === 'absent') {
                      bgClass = "bg-rose-950/80 hover:bg-rose-900 border-rose-900/30 cursor-pointer";
                      textClass = "text-rose-300";
                    } else if (entry.attendanceStatus === 'present-light') {
                      bgClass = "bg-[#ecf3a4] hover:bg-[#dce38a] border-none cursor-pointer"; // 1-3 Hours (Almost yellow)
                      textClass = "text-stone-900 font-bold";
                    } else if (entry.attendanceStatus === 'present-medium') {
                      bgClass = "bg-emerald-500 hover:bg-emerald-400 border-none cursor-pointer"; // 4-6 Hours (Normal light green)
                      textClass = "text-white font-bold";
                    } else if (entry.attendanceStatus === 'present-full') {
                      bgClass = "bg-emerald-900 hover:bg-emerald-800 border-none cursor-pointer"; // 7+ Hours (Dark green)
                      textClass = "text-white";
                    }
                  }

                  return (
                    <button
                      key={day}
                      onClick={() => !isSunday && setSelectedDay(day)}
                      title={entry ? Object.keys(entry).map(k => k === "totalSeconds" ? formatTime(entry[k]) : "").filter(a => a).join('') : ""}
                      className={`group aspect-square rounded-[8px] p-2.5 sm:p-3 flex items-start justify-start transition-all duration-200 outline-none
                                 ${bgClass} ${isSelected ? '!ring-2 !ring-yellow-500 ring-offset-2 ring-offset-[#18181b] scale-[1.05] shadow-lg z-10' : ''}`}
                    >
                      <span className={`font-semibold text-sm sm:text-lg transition-colors ${textClass}`}>{day}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-6 justify-center lg:justify-start px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-900" /> 7+ Hrs</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> 4-6 Hrs</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#ecf3a4]" /> 1-3 Hrs</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-950 border border-rose-900" /> Absent</span>
            </div>

            {/* Daily Report for Selected Date */}
            {selectedDay && !isSundaySelection && selectedEntry && (
              <div className="mt-8 bg-[#18181b] p-6 rounded-2xl border border-zinc-800/60 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className="text-yellow-500 font-heading text-xl mb-5 uppercase tracking-widest flex items-center gap-3 border-b border-zinc-800 pb-4">
                  <ListTodo className="w-5 h-5" /> Daily Report
                </h3>
                <div className="space-y-4">
                  {selectedEntry.summary && selectedEntry.summary !== 'No update provided' ? (
                    <div className="space-y-3">
                      {selectedEntry.summary.split('\n').filter(line => line.trim()).map((line, idx) => {
                        const match = line.match(/^\[(.*?)\]:\s*(.*)/);
                        if (match) {
                          return (
                            <div key={idx} className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 flex flex-col gap-1.5 hover:border-yellow-500/30 transition-colors">
                              <span className="text-[10px] text-yellow-500/70 font-mono font-bold uppercase tracking-widest">{match[1]}</span>
                              <span className="text-zinc-300 text-sm leading-relaxed">{match[2]}</span>
                            </div>
                          );
                        } else {
                          return (
                            <div key={idx} className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 flex flex-col hover:border-yellow-500/30 transition-colors">
                              <span className="text-zinc-300 text-sm leading-relaxed">{line}</span>
                            </div>
                          );
                        }
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-zinc-500 flex flex-col items-center gap-3 bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800/60">
                      <ListTodo className="w-8 h-8 opacity-20" />
                      <span className="text-sm font-medium">No daily report submitted for this date</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Right Sidebar: Summary Widget & Daily Report */}
          <aside className="w-full xl:w-[320px] shrink-0 flex flex-col gap-6 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-3rem)] overflow-y-auto">

            {/* Summary Widget Card */}
            <div className="bg-[#18181b] rounded-2xl p-6 shadow-2xl border border-zinc-800/60 flex flex-col">
              <h3 className="text-yellow-500 font-heading text-xl mb-4 uppercase tracking-widest flex items-center gap-3 border-b border-zinc-800 pb-4">
                <Clock className="w-5 h-5" /> Summary
              </h3>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center group">
                  <span className="text-zinc-400 text-sm font-medium uppercase tracking-wider group-hover:text-zinc-300 transition-colors">Total Present</span>
                  <span className="text-white font-bold text-lg">{stats.present} <span className="text-zinc-500 text-xs font-normal">Days</span></span>
                </div>
                <div className="flex justify-between items-center group">
                  <span className="text-zinc-400 text-sm font-medium uppercase tracking-wider group-hover:text-zinc-300 transition-colors">Total Absent</span>
                  <span className="text-white font-bold text-lg">{stats.absent} <span className="text-zinc-500 text-xs font-normal">Days</span></span>
                </div>
                <div className="w-full h-px bg-zinc-800/80 my-2" />
                <div className="flex justify-between items-center group">
                  <span className="text-yellow-500/80 text-sm font-bold uppercase tracking-wider">Hours Logged</span>
                  <span className="text-yellow-500 font-bold text-xl">{stats.hours} <span className="text-yellow-500/50 text-xs font-normal">Hrs</span></span>
                </div>
              </div>
            </div>

            {/* Daily Report Widget (or Admin Override Panel) */}
            {selectedDay && !isSundaySelection && (
              <div className="bg-[#18181b] rounded-2xl p-6 shadow-2xl border border-yellow-500/30 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-zinc-800">
                  <h3 className="text-white font-heading text-lg tracking-wide">
                    {monthName} {selectedDay}
                  </h3>
                  <button onClick={() => setSelectedDay(null)} className="p-1.5 text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 rounded-lg">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>

                {selectedEntry ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                      <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Status Recorded</span>
                      <span className={`text-xs uppercase tracking-widest font-bold px-2.5 py-1 rounded ${selectedEntry.attendanceStatus === 'absent'
                        ? 'bg-rose-950/50 text-rose-400 border border-rose-900/30'
                        : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30'
                        }`}>
                        {selectedEntry.attendanceStatus.split('-')[0]}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-zinc-500 flex flex-col items-center gap-3 bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800/60 object-contain">
                    <CalendarDays className="w-8 h-8 opacity-20" />
                    <span className="text-sm font-medium">No recorded data</span>
                  </div>
                )}

                {/* Admin Quick Action Override Section */}
                {isAdmin && (
                  <div className="mt-6 pt-5 border-t border-zinc-800">
                    <span className="text-yellow-500/50 text-[10px] uppercase tracking-widest font-bold mb-3 block text-center">Admin Override Tools</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdminOverride(selectedDay, 'present')}
                        disabled={overrideLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 bg-emerald-950 text-emerald-400 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-emerald-900 hover:bg-emerald-900 transition-colors disabled:opacity-50"
                      >
                        {overrideLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Mark Present
                      </button>
                      <button
                        onClick={() => handleAdminOverride(selectedDay, 'absent')}
                        disabled={overrideLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 bg-rose-950 text-rose-400 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-rose-900 hover:bg-rose-900 transition-colors disabled:opacity-50"
                      >
                        {overrideLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Mark Absent
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </aside>
        </main>
      </div>
    </div >
  );
}
