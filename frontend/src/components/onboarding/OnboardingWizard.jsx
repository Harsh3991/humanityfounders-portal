import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import StepFinancials from "./StepFinancials";
import StepDeclaration from "./StepDeclaration";
import { getOnboardingStatus, submitStep1, submitStep2 } from "../../api/onboardingApi";
import { HiOutlineCheckCircle } from "react-icons/hi";
import "../../styles/onboarding.css";

const OnboardingWizard = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const { user, logout, refreshUser } = useAuth();
    const navigate = useNavigate();

    // Check onboarding status on mount
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await getOnboardingStatus();
                const data = response.data;

                if (data.onboardingComplete) {
                    navigate("/dashboard", { replace: true });
                    return;
                }

                // Resume from where they left off
                setCurrentStep(data.currentStep === "done" ? 2 : data.currentStep);
            } catch (err) {
                // If error, just start from step 1
                setCurrentStep(1);
            }
            setLoading(false);
        };

        checkStatus();
    }, [navigate]);

    // Handle Step 1 submission
    const handleStep1Submit = async (formData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            await submitStep1(formData);
            setCurrentStep(2);
        } catch (err) {
            const message =
                err.response?.data?.message ||
                err.response?.data?.errors?.[0]?.message ||
                "Failed to save. Please check your inputs.";
            setError(message);
        }

        setIsSubmitting(false);
    };

    // Handle Step 2 submission
    const handleStep2Submit = async (data) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await submitStep2(data);

            // Refresh user data in auth context (status is now "active")
            await refreshUser();
            navigate("/dashboard", { replace: true });
        } catch (err) {
            const message =
                err.response?.data?.message ||
                err.response?.data?.errors?.[0]?.message ||
                "Failed to complete onboarding.";
            setError(message);
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="onboarding-page">
            <div className="onboarding-card">
                {/* Header */}
                <div className="onboarding-header">
                    <div className="onboarding-header-emoji">👋</div>
                    <h1>Welcome, {user?.fullName}!</h1>
                    <p>Complete your onboarding to get started</p>
                </div>

                {/* Stepper */}
                <div className="stepper">
                    <div className="step-item">
                        <div className={`step-circle ${currentStep >= 1 ? (currentStep > 1 ? "completed" : "active") : ""}`}>
                            {currentStep > 1 ? <HiOutlineCheckCircle /> : "1"}
                        </div>
                        <span className={`step-label ${currentStep >= 1 ? (currentStep > 1 ? "completed" : "active") : ""}`}>
                            Financials
                        </span>
                    </div>

                    <div className={`step-connector ${currentStep > 1 ? "completed" : ""}`}></div>

                    <div className="step-item">
                        <div className={`step-circle ${currentStep === 2 ? "active" : ""}`}>
                            2
                        </div>
                        <span className={`step-label ${currentStep === 2 ? "active" : ""}`}>
                            Declaration
                        </span>
                    </div>
                </div>

                {/* Step Content */}
                <div className="onboarding-content">
                    {currentStep === 1 && (
                        <StepFinancials
                            onSubmit={handleStep1Submit}
                            isSubmitting={isSubmitting}
                            error={error}
                        />
                    )}

                    {currentStep === 2 && (
                        <StepDeclaration
                            onSubmit={handleStep2Submit}
                            onBack={() => {
                                setCurrentStep(1);
                                setError(null);
                            }}
                            isSubmitting={isSubmitting}
                            error={error}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
