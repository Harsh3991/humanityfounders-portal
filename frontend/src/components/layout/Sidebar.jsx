import { NavLink, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import {
    HiOutlineHome,
    HiOutlineClipboardList,
    HiOutlineClock,
    HiOutlineUserGroup,
    HiOutlineLogout,
    HiOutlineCog,
} from "react-icons/hi";
import "../../styles/sidebar.css";

const Sidebar = () => {
    const { user, logout, isAdmin, isHR } = useAuth();
    const location = useLocation();

    // Get user initials for avatar
    const getInitials = (name) => {
        if (!name) return "?";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <aside className="sidebar">
            {/* Brand */}
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">HF</div>
                    <div className="sidebar-brand-text">
                        <span className="sidebar-brand-name">Humanity Founders</span>
                        <span className="sidebar-brand-label">Employee Portal</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <span className="sidebar-section-label">Main</span>

                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `sidebar-link ${isActive ? "active" : ""}`
                    }
                >
                    <HiOutlineHome className="sidebar-link-icon" />
                    Dashboard
                </NavLink>

                <span className="sidebar-section-label">Workspace</span>

                <NavLink
                    to="/projects"
                    className={({ isActive }) =>
                        `sidebar-link ${isActive ? "active" : ""}`
                    }
                >
                    <HiOutlineClipboardList className="sidebar-link-icon" />
                    Projects
                    <span className="sidebar-link-coming">Soon</span>
                </NavLink>

                <NavLink
                    to="/attendance"
                    className={({ isActive }) =>
                        `sidebar-link ${isActive ? "active" : ""}`
                    }
                >
                    <HiOutlineClock className="sidebar-link-icon" />
                    Attendance
                    <span className="sidebar-link-coming">Soon</span>
                </NavLink>

                {/* HR/Admin only */}
                {(isAdmin || isHR) && (
                    <>
                        <span className="sidebar-section-label">Management</span>

                        <NavLink
                            to="/people"
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? "active" : ""}`
                            }
                        >
                            <HiOutlineUserGroup className="sidebar-link-icon" />
                            People
                            <span className="sidebar-link-coming">Soon</span>
                        </NavLink>

                        {isAdmin && (
                            <NavLink
                                to="/settings"
                                className={({ isActive }) =>
                                    `sidebar-link ${isActive ? "active" : ""}`
                                }
                            >
                                <HiOutlineCog className="sidebar-link-icon" />
                                Settings
                                <span className="sidebar-link-coming">Soon</span>
                            </NavLink>
                        )}
                    </>
                )}
            </nav>

            {/* Footer: User Info */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">{getInitials(user?.fullName)}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.fullName}</div>
                        <div className="sidebar-user-role">{user?.role}</div>
                    </div>
                    <button
                        className="sidebar-logout-btn"
                        onClick={logout}
                        title="Logout"
                    >
                        <HiOutlineLogout />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
