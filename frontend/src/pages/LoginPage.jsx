import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineExclamationCircle } from "react-icons/hi";
import "../styles/auth.css";

const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, error, setError } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const result = await login(email, password);

        if (result.success) {
            const user = result.user;

            // PRD: First login (pending status) → Onboarding
            // Subsequent logins → Dashboard
            if (user.status === "pending") {
                navigate("/onboarding");
            } else {
                navigate("/dashboard");
            }
        }

        setIsSubmitting(false);
    };

    return (
        <div className="auth-container">
            {/* ─── Left Panel: Branding ─── */}
            <div className="auth-branding">
                <div className="branding-content">
                    <div className="branding-logo">🏢</div>
                    <h1 className="branding-title">Humanity Founders</h1>
                    <p className="branding-subtitle">
                        Your centralized employee management portal. Track attendance,
                        manage projects, and streamline operations — all in one place.
                    </p>

                    <div className="branding-features">
                        <div className="branding-feature">
                            <span className="branding-feature-icon">⏰</span>
                            <span className="branding-feature-text">
                                Real-time attendance tracking
                            </span>
                        </div>
                        <div className="branding-feature">
                            <span className="branding-feature-icon">📊</span>
                            <span className="branding-feature-text">
                                Project & task management
                            </span>
                        </div>
                        <div className="branding-feature">
                            <span className="branding-feature-icon">👥</span>
                            <span className="branding-feature-text">
                                Role-based access control
                            </span>
                        </div>
                        <div className="branding-feature">
                            <span className="branding-feature-icon">🔒</span>
                            <span className="branding-feature-text">
                                Secure employee data
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Right Panel: Login Form ─── */}
            <div className="auth-form-panel">
                <div className="auth-form-wrapper">
                    <div className="auth-form-header">
                        <h2>Welcome Back</h2>
                        <p>Sign in to access your dashboard</p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            <HiOutlineExclamationCircle className="auth-error-icon" />
                            <span className="auth-error-text">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="login-form">
                        <div className="form-group">
                            <label className="form-label" htmlFor="email">
                                Email Address
                            </label>
                            <div className="form-input-wrapper">
                                <input
                                    id="email"
                                    type="email"
                                    className="form-input"
                                    placeholder="name@humanityfounders.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                                <HiOutlineMail className="form-input-icon" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="password">
                                Password
                            </label>
                            <div className="form-input-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    className="form-input"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <HiOutlineLockClosed className="form-input-icon" />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={isSubmitting || !email || !password}
                            id="login-submit-btn"
                        >
                            {isSubmitting ? (
                                <span className="btn-loading">
                                    <span className="btn-spinner"></span>
                                    Signing in...
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
