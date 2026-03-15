import { useState, useRef } from 'react';
import { X, Upload, Loader2, FileText } from 'lucide-react';
import axiosInstance from '../lib/axiosInstance';

interface LeaveRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const REASON_HINTS: Record<string, string> = {
  medical: 'Please upload a doctor appointment letter or medical certificate (PDF/JPG/PNG, max 5MB).',
  exam: 'Please upload an exam date sheet or admit card (PDF/JPG/PNG, max 5MB).',
  other: '',
};

export default function LeaveRequestModal({ onClose, onSuccess }: LeaveRequestModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const requiresDoc = ['medical', 'exam'].includes(reason);

  const handleFile = (f: File | null) => {
    setFileError('');
    if (!f) { setFile(null); return; }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(f.type)) { setFileError('Only PDF, JPG, PNG files are allowed.'); return; }
    if (f.size > 5 * 1024 * 1024) { setFileError('File size must be under 5MB.'); return; }
    setFile(f);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!startDate) e.startDate = 'Start date is required.';
    if (!endDate) e.endDate = 'End date is required.';
    if (startDate && endDate && endDate < startDate) e.endDate = 'End date must be on or after start date.';
    if (!reason) e.reason = 'Reason is required.';
    if (requiresDoc && !description) e.description = 'Description is required for this leave type.';
    if (requiresDoc && !file) e.file = 'Document is required for this leave type.';
    if (description && description.length < 10) e.description = 'Description must be at least 10 characters.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const formData = new FormData();
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('reason', reason);
    formData.append('description', description);
    if (file) formData.append('documentFile', file);

    setSubmitting(true);
    setServerError('');
    try {
      await axiosInstance.post('/leaves/request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess();
    } catch (err: any) {
      setServerError(err?.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full bg-zinc-900 border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] transition-colors ${
      errors[field] ? 'border-red-700' : 'border-zinc-700'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] w-full max-w-lg rounded-xl border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="font-heading text-xl text-[#d4af37] tracking-wide">Request Leave</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {serverError && (
            <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
              {serverError}
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider font-semibold">From Date</label>
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setErrors(p => ({ ...p, startDate: '' })); }}
                className={inputClass('startDate')}
              />
              {errors.startDate && <p className="text-red-400 text-xs mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider font-semibold">To Date</label>
              <input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setErrors(p => ({ ...p, endDate: '' })); }}
                className={inputClass('endDate')}
              />
              {errors.endDate && <p className="text-red-400 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider font-semibold">Reason</label>
            <select
              value={reason}
              onChange={e => { setReason(e.target.value); setErrors(p => ({ ...p, reason: '' })); }}
              className={inputClass('reason')}
            >
              <option value="">Select a reason...</option>
              <option value="medical">Medical</option>
              <option value="exam">Exam</option>
              <option value="other">Other</option>
            </select>
            {errors.reason && <p className="text-red-400 text-xs mt-1">{errors.reason}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider font-semibold">
              Description {requiresDoc ? <span className="text-red-400">*</span> : <span className="text-zinc-600">(optional)</span>}
            </label>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Provide additional details..."
              value={description}
              onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); }}
              className={`${inputClass('description')} resize-none`}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.description ? <p className="text-red-400 text-xs">{errors.description}</p> : <span />}
              <span className="text-zinc-600 text-xs">{description.length}/500</span>
            </div>
          </div>

          {/* Document Upload */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider font-semibold">
              Supporting Document {requiresDoc ? <span className="text-red-400">*</span> : <span className="text-zinc-600">(optional)</span>}
            </label>
            {reason && REASON_HINTS[reason] && (
              <p className="text-xs text-zinc-500 mb-2">{REASON_HINTS[reason]}</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2">
                <FileText className="w-4 h-4 text-[#d4af37] shrink-0" />
                <span className="text-sm text-zinc-300 truncate flex-1">{file.name}</span>
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }} className="text-zinc-500 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-lg px-4 py-4 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors ${
                  errors.file ? 'border-red-700' : 'border-zinc-700'
                }`}
              >
                <Upload className="w-4 h-4" />
                Click to upload PDF, JPG, or PNG
              </button>
            )}
            {fileError && <p className="text-red-400 text-xs mt-1">{fileError}</p>}
            {errors.file && !fileError && <p className="text-red-400 text-xs mt-1">{errors.file}</p>}
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2 rounded-lg bg-[#d4af37] text-black font-semibold text-sm hover:bg-[#c4a030] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
