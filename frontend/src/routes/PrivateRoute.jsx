import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

/**
 * PrivateRoute — redirects to /login if not authenticated
 */
const PrivateRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
