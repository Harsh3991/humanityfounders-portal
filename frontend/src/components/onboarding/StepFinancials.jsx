import { useState, useRef } from "react";
import { HiOutlineUpload, HiOutlineCheckCircle, HiOutlineExclamationCircle } from "react-icons/hi";

const StepFinancials = ({ onSubmit, isSubmitting, error }) => {
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");
    const [aadhaarFile, setAadhaarFile] = useState(null);
    const [panFile, setPanFile] = useState(null);

    const aadhaarRef = useRef(null);
    const panRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append("bankName", bankName);
        formData.append("accountNumber", accountNumber);
        formData.append("ifscCode", ifscCode.toUpperCase());
        if (aadhaarFile) formData.append("aadhaarCard", aadhaarFile);
        if (panFile) formData.append("panCard", panFile);

        onSubmit(formData);
    };

    const isFormValid =
        bankName.trim() &&
        accountNumber.trim() &&
        ifscCode.trim() &&
        aadhaarFile &&
        panFile;

    return (
        <form onSubmit={handleSubmit}>
            <h3 className="step-title">Financials & Identity</h3>
            <p className="step-description">
                Enter your bank details and upload identity documents
            </p>

            {error && (
                <div className="onboarding-error">
                    <HiOutlineExclamationCircle style={{ color: "var(--error)", fontSize: "1.1rem", flexShrink: 0 }} />
                    <span className="onboarding-error-text">{error}</span>
                </div>
            )}

            {/* Bank Details */}
            <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., State Bank of India"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter account number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">IFSC Code</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., SBIN0001234"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        maxLength={11}
                        required
                    />
                </div>
            </div>

            {/* Document Uploads */}
            <div className="form-row" style={{ marginTop: "8px" }}>
                <div className="form-group">
                    <label className="form-label">Aadhaar Card</label>
                    <div
                        className={`file-upload-area ${aadhaarFile ? "has-file" : ""}`}
                        onClick={() => aadhaarRef.current?.click()}
                    >
                        <div className="file-upload-icon">
                            {aadhaarFile ? <HiOutlineCheckCircle /> : <HiOutlineUpload />}
                        </div>
                        {aadhaarFile ? (
                            <p className="file-name" title={aadhaarFile.name}>
                                {aadhaarFile.name.length > 20
                                    ? aadhaarFile.name.slice(0, 17) + "..."
                                    : aadhaarFile.name}
                            </p>
                        ) : (
                            <>
                                <p className="file-upload-text">
                                    <strong>Click to upload</strong>
                                </p>
                                <p className="file-upload-hint">PDF, JPG, PNG (max 5MB)</p>
                            </>
                        )}
                    </div>
                    <input
                        ref={aadhaarRef}
                        type="file"
                        className="file-input-hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setAadhaarFile(e.target.files[0] || null)}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">PAN Card</label>
                    <div
                        className={`file-upload-area ${panFile ? "has-file" : ""}`}
                        onClick={() => panRef.current?.click()}
                    >
                        <div className="file-upload-icon">
                            {panFile ? <HiOutlineCheckCircle /> : <HiOutlineUpload />}
                        </div>
                        {panFile ? (
                            <p className="file-name" title={panFile.name}>
                                {panFile.name.length > 20
                                    ? panFile.name.slice(0, 17) + "..."
                                    : panFile.name}
                            </p>
                        ) : (
                            <>
                                <p className="file-upload-text">
                                    <strong>Click to upload</strong>
                                </p>
                                <p className="file-upload-hint">PDF, JPG, PNG (max 5MB)</p>
                            </>
                        )}
                    </div>
                    <input
                        ref={panRef}
                        type="file"
                        className="file-input-hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setPanFile(e.target.files[0] || null)}
                    />
                </div>
            </div>

            {/* Submit */}
            <div className="onboarding-actions">
                <div></div>
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={!isFormValid || isSubmitting}
                >
                    {isSubmitting ? "Saving..." : "Continue →"}
                </button>
            </div>
        </form>
    );
};

export default StepFinancials;
