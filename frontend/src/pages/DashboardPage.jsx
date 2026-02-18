import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import AppLayout from "../components/layout/AppLayout";
import AttendanceWidget from "../components/dashboard/AttendanceWidget";
import { getDashboardData } from "../api/dashboardApi";
import {
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlineClipboardList,
    HiOutlineBriefcase,
    HiOutlineUserGroup,
    HiOutlineUsers,
    HiOutlineLightningBolt,
} from "react-icons/hi";
import "../styles/dashboard.css";

const DashboardPage = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const isManagement =
        user?.role === "admin" || user?.role === "hr" || user?.role === "manager";

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await getDashboardData();
                setData(response.data);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            }
            setLoading(false);
        };

        fetchDashboard();
    }, []);

    // Format due date
    const formatDate = (dateStr) => {
        if (!dateStr) return "No date";
        const date = new Date(dateStr);
        const today = new Date();
        const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

        if (diff < 0) return `${Math.abs(diff)}d overdue`;
        if (diff === 0) return "Today";
        if (diff === 1) return "Tomorrow";
        return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="dashboard-loading">
                    <div className="spinner"></div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="dashboard">
                {/* ─── Welcome Header ─── */}
                <div className="dashboard-welcome">
                    <h1>
                        Welcome, {data?.user?.fullName || user?.fullName}
                        <span className="dashboard-role-badge">
                            {data?.user?.role || user?.role}
                        </span>
                    </h1>
                    <p>
                        {data?.user?.department || user?.department} • {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                </div>

                {/* ─── Stats Cards ─── */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon green">
                            <HiOutlineCalendar />
                        </div>
                        <div className="stat-info">
                            <h3>{data?.monthlyStats?.daysPresent || 0}</h3>
                            <p>Days Present</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon orange">
                            <HiOutlineClock />
                        </div>
                        <div className="stat-info">
                            <h3>{data?.monthlyStats?.totalWorkingHours || 0}h</h3>
                            <p>Hours Worked</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon purple">
                            <HiOutlineClipboardList />
                        </div>
                        <div className="stat-info">
                            <h3>{data?.tasks?.length || 0}</h3>
                            <p>Active Tasks</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon blue">
                            <HiOutlineBriefcase />
                        </div>
                        <div className="stat-info">
                            <h3>{data?.activeProjects?.length || 0}</h3>
                            <p>Active Projects</p>
                        </div>
                    </div>

                    {/* Management-only stats */}
                    {isManagement && data?.teamOverview && (
                        <>
                            <div className="stat-card">
                                <div className="stat-icon green">
                                    <HiOutlineUsers />
                                </div>
                                <div className="stat-info">
                                    <h3>{data.teamOverview.onDutyCount || 0}</h3>
                                    <p>On Duty Now</p>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon purple">
                                    <HiOutlineUserGroup />
                                </div>
                                <div className="stat-info">
                                    <h3>{data.teamOverview.totalEmployees || 0}</h3>
                                    <p>Total Employees</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ─── Main Dashboard Grid ─── */}
                <div className="dashboard-grid">
                    {/* Attendance Widget */}
                    <AttendanceWidget />

                    {/* My Tasks */}
                    <div className="widget-card">
                        <div className="widget-header">
                            <span className="widget-title">
                                <HiOutlineClipboardList className="widget-title-icon" />
                                My Tasks
                            </span>
                            {data?.tasks?.length > 0 && (
                                <span className="widget-badge">{data.tasks.length}</span>
                            )}
                        </div>
                        <div className="widget-body">
                            {data?.tasks?.length > 0 ? (
                                <ul className="task-list">
                                    {data.tasks.map((task) => (
                                        <li key={task._id} className="task-item">
                                            <span
                                                className={`task-priority ${task.priority}`}
                                            ></span>
                                            <div className="task-info">
                                                <div className="task-name">{task.name}</div>
                                                <div className="task-meta">{task.projectName}</div>
                                            </div>
                                            <span
                                                className={`task-due ${task.isOverdue ? "overdue" : ""}`}
                                            >
                                                {formatDate(task.dueDate)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-state-icon">📋</div>
                                    <p className="empty-state-text">
                                        No active tasks assigned
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Projects */}
                    <div className="widget-card">
                        <div className="widget-header">
                            <span className="widget-title">
                                <HiOutlineBriefcase className="widget-title-icon" />
                                Active Projects
                            </span>
                        </div>
                        <div className="widget-body">
                            {data?.activeProjects?.length > 0 ? (
                                data.activeProjects.map((project) => (
                                    <div key={project._id} className="project-item">
                                        <span className="project-name">{project.name}</span>
                                        <span className="project-status active">
                                            {project.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-state-icon">📁</div>
                                    <p className="empty-state-text">No active projects</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Management: Team On Duty */}
                    {isManagement && data?.teamOverview && (
                        <div className="widget-card">
                            <div className="widget-header">
                                <span className="widget-title">
                                    <HiOutlineUsers className="widget-title-icon" />
                                    Team On Duty
                                </span>
                                <span className="widget-badge">
                                    {data.teamOverview.onDutyCount || 0}
                                </span>
                            </div>
                            <div className="widget-body">
                                {data.teamOverview.onDutyEmployees?.length > 0 ? (
                                    data.teamOverview.onDutyEmployees.map((emp, i) => (
                                        <div key={i} className="team-item">
                                            <span className="team-dot"></span>
                                            <span className="team-name">{emp.fullName}</span>
                                            <span className="team-dept">{emp.department}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">👥</div>
                                        <p className="empty-state-text">
                                            No employees clocked in today
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Management: Resource Availability */}
                    {isManagement && data?.resourceAvailability && (
                        <div className="widget-card">
                            <div className="widget-header">
                                <span className="widget-title">
                                    <HiOutlineLightningBolt className="widget-title-icon" />
                                    Available Resources
                                </span>
                                <span className="widget-badge">
                                    {data.resourceAvailability.length || 0}
                                </span>
                            </div>
                            <div className="widget-body">
                                {data.resourceAvailability.length > 0 ? (
                                    data.resourceAvailability.map((emp) => (
                                        <div key={emp._id} className="team-item">
                                            <span className="team-dot" style={{ background: "var(--info)" }}></span>
                                            <span className="team-name">{emp.fullName}</span>
                                            <span className="team-dept">{emp.department}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">⚡</div>
                                        <p className="empty-state-text">
                                            All employees have active tasks
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
};

export default DashboardPage;
