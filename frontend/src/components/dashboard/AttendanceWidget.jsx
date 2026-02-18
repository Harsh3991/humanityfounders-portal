import { useState, useEffect, useRef, useCallback } from "react";
import { HiOutlineClock } from "react-icons/hi";
import {
    getAttendanceToday,
    clockIn as apiClockIn,
    goAway as apiGoAway,
    resumeWork as apiResume,
    clockOut as apiClockOut,
} from "../../api/attendanceApi";
import ClockOutModal from "./ClockOutModal";
import toast from "react-hot-toast";

const AttendanceWidget = () => {
    // ─── State ───
    const [status, setStatus] = useState("absent"); // absent | clocked-in | away | clocked-out
    const [activeSeconds, setActiveSeconds] = useState(0);
    const [clockInTime, setClockInTime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showClockOutModal, setShowClockOutModal] = useState(false);

    const timerRef = useRef(null);
    const baseSecondsRef = useRef(0); // seconds already accumulated server-side
    const segmentStartRef = useRef(null); // when the current active segment began

    // ─── Format seconds to HH:MM:SS ───
    const formatTimer = (totalSec) => {
        const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
        const s = String(totalSec % 60).padStart(2, "0");
        return `${h}:${m}:${s}`;
    };

    // ─── Start the local tick timer ───
    const startTicking = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        segmentStartRef.current = Date.now();

        timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - segmentStartRef.current) / 1000);
            setActiveSeconds(baseSecondsRef.current + elapsed);
        }, 1000);
    }, []);

    // ─── Stop the local tick timer ───
    const stopTicking = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // ─── Fetch today's status on mount ───
    useEffect(() => {
        const fetchToday = async () => {
            try {
                const res = await getAttendanceToday();
                const d = res.data;

                setStatus(d.status);
                setClockInTime(d.clockIn);

                if (d.status === "clocked-in") {
                    // Server already calculated live active seconds
                    baseSecondsRef.current = d.activeSeconds || 0;
                    setActiveSeconds(d.activeSeconds || 0);
                    startTicking();
                } else if (d.status === "away") {
                    baseSecondsRef.current = d.activeSeconds || 0;
                    setActiveSeconds(d.activeSeconds || 0);
                } else if (d.status === "clocked-out") {
                    setActiveSeconds(d.activeSeconds || 0);
                }
            } catch (err) {
                // No attendance record yet — that's fine
            }
            setLoading(false);
        };

        fetchToday();

        return () => stopTicking();
    }, [startTicking, stopTicking]);

    // ─── Clock In ───
    const handleClockIn = async () => {
        setActionLoading(true);
        try {
            const res = await apiClockIn();
            setStatus("clocked-in");
            setClockInTime(res.data.clockIn);
            // Use cumulative active seconds from backend logic
            baseSecondsRef.current = res.data.activeSeconds;
            setActiveSeconds(res.data.activeSeconds);
            startTicking();
            toast.success("Clocked in! Timer started ⏱️");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to clock in");
        }
        setActionLoading(false);
    };

    // ─── Go Away ───
    const handleAway = async () => {
        setActionLoading(true);
        try {
            const res = await apiGoAway();
            stopTicking();
            baseSecondsRef.current = res.data.activeSeconds;
            setActiveSeconds(res.data.activeSeconds);
            setStatus("away");
            toast("Timer paused ☕", { icon: "⏸️" });
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to pause");
        }
        setActionLoading(false);
    };

    // ─── Resume ───
    const handleResume = async () => {
        setActionLoading(true);
        try {
            const res = await apiResume();
            baseSecondsRef.current = res.data.activeSeconds;
            setActiveSeconds(res.data.activeSeconds);
            setStatus("clocked-in");
            startTicking();
            toast.success("Welcome back! Timer resumed ⏱️");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to resume");
        }
        setActionLoading(false);
    };

    // ─── Clock Out (submit from modal) ───
    const handleClockOut = async (dailyReport) => {
        setActionLoading(true);
        try {
            const res = await apiClockOut(dailyReport);
            stopTicking();
            setActiveSeconds(res.data.activeSeconds);
            setStatus("clocked-out");
            setShowClockOutModal(false);
            toast.success("Clocked out — great work today! 🎉");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to clock out");
        }
        setActionLoading(false);
    };

    // ─── Badge helpers ───
    const getBadgeText = () => {
        switch (status) {
            case "clocked-in": return "On Duty";
            case "away": return "Away";
            case "clocked-out": return "Done";
            default: return "Off Duty";
        }
    };

    const getBadgeClass = () => {
        switch (status) {
            case "clocked-in": return "badge-active";
            case "away": return "badge-away";
            case "clocked-out": return "badge-done";
            default: return "badge-off";
        }
    };

    if (loading) {
        return (
            <div className="widget-card">
                <div className="widget-header">
                    <span className="widget-title">
                        <HiOutlineClock className="widget-title-icon" />
                        Attendance
                    </span>
                </div>
                <div className="attendance-widget">
                    <div className="spinner" style={{ margin: "20px auto" }}></div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="widget-card">
                <div className="widget-header">
                    <span className="widget-title">
                        <HiOutlineClock className="widget-title-icon" />
                        Attendance
                    </span>
                    <span className={`attendance-badge ${getBadgeClass()}`}>
                        {getBadgeText()}
                    </span>
                </div>
                <div className="attendance-widget">
                    {/* Status Text */}
                    <div className={`attendance-status ${status === "clocked-in" ? "clocked-in" : status === "away" ? "away" : "not-started"}`}>
                        {status === "clocked-in" && "● Working"}
                        {status === "away" && "● Away"}
                        {status === "clocked-out" && "✓ Clocked Out"}
                        {status === "absent" && "Not Clocked In"}
                    </div>

                    {/* Timer */}
                    <div className={`attendance-timer ${status === "away" ? "paused" : ""}`}>
                        {formatTimer(activeSeconds)}
                    </div>

                    {/* Clock-in time */}
                    {clockInTime && (
                        <div className="attendance-clock-time">
                            Clocked in at{" "}
                            {new Date(clockInTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="attendance-actions">
                        {/* Initial state: only Clock In */}
                        {status === "absent" && (
                            <button
                                className="btn-clock-in"
                                onClick={handleClockIn}
                                disabled={actionLoading}
                            >
                                {actionLoading ? "Clocking in..." : "Clock In"}
                            </button>
                        )}

                        {/* Clocked in: Away + Clock Out */}
                        {status === "clocked-in" && (
                            <>
                                <button
                                    className="btn-away"
                                    onClick={handleAway}
                                    disabled={actionLoading}
                                >
                                    Away
                                </button>
                                <button
                                    className="btn-clock-out"
                                    onClick={() => setShowClockOutModal(true)}
                                    disabled={actionLoading}
                                >
                                    Clock Out
                                </button>
                            </>
                        )}

                        {/* Away: Resume + Clock Out */}
                        {status === "away" && (
                            <>
                                <button
                                    className="btn-resume"
                                    onClick={handleResume}
                                    disabled={actionLoading}
                                >
                                    Resume
                                </button>
                                <button
                                    className="btn-clock-out"
                                    onClick={() => setShowClockOutModal(true)}
                                    disabled={actionLoading}
                                >
                                    Clock Out
                                </button>
                            </>
                        )}

                        {/* Clocked out: Allow Re-Clock In (Multi-session) */}
                        {status === "clocked-out" && (
                            <button
                                className="btn-clock-in"
                                onClick={handleClockIn}
                                disabled={actionLoading}
                            >
                                {actionLoading ? "Starting..." : "Clock In Again"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Clock Out Modal */}
            {showClockOutModal && (
                <ClockOutModal
                    onSubmit={handleClockOut}
                    onCancel={() => setShowClockOutModal(false)}
                    isSubmitting={actionLoading}
                    activeSeconds={activeSeconds}
                />
            )}
        </>
    );
};

export default AttendanceWidget;
