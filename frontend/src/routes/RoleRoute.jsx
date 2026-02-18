import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

/**
 * RoleRoute — restricts access to specific roles
 * Usage: <RoleRoute roles={["admin", "hr"]}>...</RoleRoute>
 */
const RoleRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default RoleRoute;
