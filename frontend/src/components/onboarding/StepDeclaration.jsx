import { useState } from "react";
import { HiOutlineExclamationCircle } from "react-icons/hi";

const DECLARATION_TEXT = `"I acknowledge that I have carefully read and understood the company ethics. I will follow these standards to maintain a professional and proper work environment."`;

const StepDeclaration = ({ onSubmit, onBack, isSubmitting, error }) => {
    const [accepted, setAccepted] = useState(false);
    const [signature, setSignature] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            declarationAccepted: true,
            digitalSignature: signature.trim(),
        });
    };

    const isFormValid = accepted && signature.trim().length >= 2;

    return (
        <form onSubmit={handleSubmit}>
            <h3 className="step-title">Digital Declaration</h3>
            <p className="step-description">
                Read the declaration below and provide your digital signature
            </p>

            {error && (
                <div className="onboarding-error">
                    <HiOutlineExclamationCircle style={{ color: "var(--error)", fontSize: "1.1rem", flexShrink: 0 }} />
                    <span className="onboarding-error-text">{error}</span>
                </div>
            )}

            {/* Declaration Text */}
            <div className="declaration-box">
                <p className="declaration-text">{DECLARATION_TEXT}</p>

                <div className="declaration-checkbox" onClick={() => setAccepted(!accepted)}>
                    <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                        id="declaration-agree"
                    />
                    <label htmlFor="declaration-agree">
                        I Agree to the above declaration
                    </label>
                </div>
            </div>

            {/* Digital Signature */}
            <div className="form-group">
                <label className="form-label">Digital Signature (Type Your Full Name)</label>
                <input
                    type="text"
                    className="signature-input"
                    placeholder="Type your full name here..."
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    required
                />
            </div>

            {/* Actions */}
            <div className="onboarding-actions">
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={onBack}
                    disabled={isSubmitting}
                >
                    ← Back
                </button>
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={!isFormValid || isSubmitting}
                >
                    {isSubmitting ? "Completing..." : "Complete Onboarding ✓"}
                </button>
            </div>
        </form>
    );
};

export default StepDeclaration;
