import { useState } from "react";
import { HiOutlineDocumentText, HiX } from "react-icons/hi";
import "../../styles/clockout-modal.css";

const ClockOutModal = ({ onSubmit, onCancel, isSubmitting, activeSeconds }) => {
    const [report, setReport] = useState("");

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}h ${m}m ${s}s`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!report.trim()) return;
        onSubmit(report.trim());
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-header-icon">
                        <HiOutlineDocumentText />
                    </div>
                    <div>
                        <h2 className="modal-title">Clock Out</h2>
                        <p className="modal-subtitle">
                            Active time: <strong>{formatTime(activeSeconds)}</strong>
                        </p>
                    </div>
                    <button className="modal-close" onClick={onCancel}>
                        <HiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <label className="modal-label">
                            What did you work on today? <span className="required">*</span>
                        </label>
                        <textarea
                            className="modal-textarea"
                            placeholder="Describe the tasks you completed during this session..."
                            value={report}
                            onChange={(e) => setReport(e.target.value)}
                            rows={5}
                            autoFocus
                        />
                        <p className="modal-hint">
                            This report will be saved as part of your daily attendance record.
                        </p>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="modal-btn-cancel"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Continue Working
                        </button>
                        <button
                            type="submit"
                            className="modal-btn-submit"
                            disabled={!report.trim() || isSubmitting}
                        >
                            {isSubmitting ? (
                                <span className="btn-loading">
                                    <span className="btn-spinner"></span>
                                    Saving...
                                </span>
                            ) : (
                                "Submit & Clock Out"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClockOutModal;
