import { createContext, useState, useEffect } from "react";
import { loginUser as loginAPI, getMe } from "../api/authApi";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ─── Check if user is already logged in (on app load) ───
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem("accessToken");
            const savedUser = localStorage.getItem("user");

            if (token && savedUser) {
                try {
                    // Verify token is still valid by calling /me
                    const response = await getMe();
                    setUser(response.data.user);
                    localStorage.setItem("user", JSON.stringify(response.data.user));
                } catch (err) {
                    // Token expired or invalid
                    logout();
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // ─── Login ───
    const login = async (email, password) => {
        try {
            setError(null);
            const response = await loginAPI({ email, password });

            const { user, accessToken, refreshToken } = response.data;

            // Save to localStorage
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", refreshToken);
            localStorage.setItem("user", JSON.stringify(user));

            setUser(user);
            return { success: true, user };
        } catch (err) {
            const message =
                err.response?.data?.message || "Login failed. Please try again.";
            setError(message);
            return { success: false, message };
        }
    };

    // ─── Logout ───
    const logout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        setUser(null);
        setError(null);
    };

    // ─── Refresh user data from server ───
    const refreshUser = async () => {
        try {
            const response = await getMe();
            setUser(response.data.user);
            localStorage.setItem("user", JSON.stringify(response.data.user));
            return response.data.user;
        } catch (err) {
            return null;
        }
    };

    const value = {
        user,
        loading,
        error,
        login,
        logout,
        setError,
        setUser,
        refreshUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isHR: user?.role === "hr",
        isManager: user?.role === "manager",
        isEmployee: user?.role === "employee",
        isPending: user?.status === "pending",
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
