import { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, RefreshCw, Download, CheckCircle, XCircle, Eye, X } from 'lucide-react';
import axiosInstance from '../lib/axiosInstance';

interface Leave {
  _id: string;
  user: { _id: string; fullName: string; email: string; department: string };
  startDate: string;
  endDate: string;
  reason: 'medical' | 'exam' | 'other';
  description: string;
  documentUrl: string;
  documentFileName: string;
  status: 'pending' | 'approved' | 'declined';
  approvedBy?: { fullName: string };
  actionDate?: string;
  adminNotes: string;
  createdAt: string;
}

interface PreviewDoc {
  blobUrl: string;
  fileName: string;
  isPdf: boolean;
}

const REASON_COLORS = {
  medical: 'bg-blue-950/60 text-blue-400 border border-blue-900/50',
  exam:    'bg-purple-950/60 text-purple-400 border border-purple-900/50',
  other:   'bg-zinc-800 text-zinc-400 border border-zinc-700',
};

const STATUS_STYLES = {
  pending:  'bg-amber-950/60 text-amber-400 border border-amber-900/50',
  approved: 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50',
  declined: 'bg-red-950/60 text-red-400 border border-red-900/50',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type FilterType = 'pending' | 'all' | 'medical' | 'exam' | 'other';

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [allLeaves, setAllLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('pending');

  const [actionState, setActionState] = useState<Record<string, { loading?: boolean; declineMode?: boolean; declineNote?: string }>>({});
  const [previewLoading, setPreviewLoading] = useState<string | null>(null); // leaveId being loaded
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/leaves?limit=200');
      if (res.data.success) setAllLeaves(res.data.data);
    } catch (err) {
      console.error('Failed to fetch leaves', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (activeFilter === 'pending') {
      setLeaves(allLeaves.filter(l => l.status === 'pending'));
    } else if (activeFilter === 'all') {
      setLeaves(allLeaves);
    } else {
      setLeaves(allLeaves.filter(l => l.reason === activeFilter));
    }
  }, [allLeaves, activeFilter]);

  // Cleanup blob URL on unmount or when preview closes
  const closePreview = () => {
    if (previewDoc) URL.revokeObjectURL(previewDoc.blobUrl);
    setPreviewDoc(null);
  };

  const counts = {
    pending:  allLeaves.filter(l => l.status === 'pending').length,
    all:      allLeaves.length,
    medical:  allLeaves.filter(l => l.reason === 'medical').length,
    exam:     allLeaves.filter(l => l.reason === 'exam').length,
    other:    allLeaves.filter(l => l.reason === 'other').length,
  };

  const setCardState = (id: string, patch: object) =>
    setActionState(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleApprove = async (leave: Leave) => {
    setCardState(leave._id, { loading: true });
    try {
      const res = await axiosInstance.patch(`/leaves/${leave._id}/approve`, { adminNotes: '' });
      if (res.data.success) {
        setAllLeaves(prev => prev.map(l => l._id === leave._id ? res.data.data : l));
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to approve leave.');
    } finally {
      setCardState(leave._id, { loading: false });
    }
  };

  const handleDecline = async (leave: Leave) => {
    const note = actionState[leave._id]?.declineNote || '';
    if (!note.trim()) { setCardState(leave._id, { declineMode: true }); return; }

    setCardState(leave._id, { loading: true });
    try {
      const res = await axiosInstance.patch(`/leaves/${leave._id}/decline`, { adminNotes: note });
      if (res.data.success) {
        setAllLeaves(prev => prev.map(l => l._id === leave._id ? res.data.data : l));
        setCardState(leave._id, { loading: false, declineMode: false, declineNote: '' });
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to decline leave.');
      setCardState(leave._id, { loading: false });
    }
  };

  const handlePreview = async (leaveId: string, fileName: string) => {
    setPreviewLoading(leaveId);
    try {
      const res = await axiosInstance.get(`/leaves/${leaveId}/download-document`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      setPreviewDoc({ blobUrl, fileName, isPdf: ext === 'pdf' });
    } catch {
      alert('Failed to load document preview.');
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleDownload = async (leaveId: string, fileName: string) => {
    try {
      const res = await axiosInstance.get(`/leaves/${leaveId}/download-document`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'document';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download document.');
    }
  };

  const FILTERS: { label: string; value: FilterType }[] = [
    { label: 'Pending',        value: 'pending' },
    { label: 'All Requests',   value: 'all' },
    { label: 'Medical',        value: 'medical' },
    { label: 'Exam',           value: 'exam' },
    { label: 'Miscellaneous',  value: 'other' },
  ];

  return (
    <div className="min-h-full bg-black -m-6 p-4 md:p-6 lg:p-8 font-sans text-gray-200">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-3xl text-[#d4af37] tracking-wide">Leave Management</h1>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2 rounded-lg bg-[#18181b] border border-zinc-800 text-zinc-400 hover:text-[#d4af37] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar Filters */}
          <aside className="w-full lg:w-52 shrink-0">
            <div className="bg-[#18181b] rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Filters</span>
              </div>
              <div className="p-2 space-y-0.5">
                {FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setActiveFilter(f.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeFilter === f.value
                        ? 'bg-[#d4af37]/10 text-[#d4af37] font-medium'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      activeFilter === f.value ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {counts[f.value]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
                <p className="text-zinc-500 text-sm uppercase tracking-widest">Loading...</p>
              </div>
            ) : leaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[#18181b] rounded-xl border border-zinc-800">
                <FileText className="w-12 h-12 text-zinc-700" />
                <p className="text-zinc-400">No leave requests found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {leaves.map(leave => {
                  const cs = actionState[leave._id] || {};
                  return (
                    <div key={leave._id} className="bg-[#18181b] rounded-xl border border-zinc-800/60 p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{leave.user?.fullName}</p>
                          <p className="text-xs text-zinc-500 truncate">{leave.user?.department} · {leave.user?.email}</p>
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[leave.status]}`}>
                          {leave.status}
                        </span>
                      </div>

                      {/* Date + Reason */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-zinc-300 font-medium">
                          {formatDate(leave.startDate)}
                          {leave.startDate !== leave.endDate && ` — ${formatDate(leave.endDate)}`}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${REASON_COLORS[leave.reason]}`}>
                          {leave.reason}
                        </span>
                      </div>

                      {/* Description */}
                      {leave.description && (
                        <p className="text-sm text-zinc-400 line-clamp-2">{leave.description}</p>
                      )}

                      {/* Admin Notes (if actioned) */}
                      {leave.status !== 'pending' && leave.adminNotes && (
                        <div className={`text-xs rounded-lg px-3 py-2 ${leave.status === 'approved' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40' : 'bg-red-950/30 text-red-400 border border-red-900/40'}`}>
                          <span className="font-semibold">Notes: </span>{leave.adminNotes}
                        </div>
                      )}

                      {/* Actioned by */}
                      {leave.status !== 'pending' && leave.approvedBy && (
                        <p className="text-xs text-zinc-500">
                          {leave.status === 'approved' ? 'Approved' : 'Declined'} by {leave.approvedBy.fullName}
                          {leave.actionDate && ` · ${formatDate(leave.actionDate)}`}
                        </p>
                      )}

                      {/* Submitted date */}
                      <p className="text-xs text-zinc-600">Submitted {formatDate(leave.createdAt)}</p>

                      {/* Document — preview + download buttons */}
                      {leave.documentFileName && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="text-xs text-zinc-400 truncate flex-1">{leave.documentFileName}</span>
                          <button
                            onClick={() => handlePreview(leave._id, leave.documentFileName)}
                            disabled={previewLoading === leave._id}
                            title="Preview document"
                            className="flex items-center gap-1 text-xs text-[#d4af37] hover:text-[#c4a030] transition-colors disabled:opacity-50 shrink-0 px-2 py-1 rounded bg-[#d4af37]/10 hover:bg-[#d4af37]/20"
                          >
                            {previewLoading === leave._id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Eye className="w-3.5 h-3.5" />}
                            View
                          </button>
                          <button
                            onClick={() => handleDownload(leave._id, leave.documentFileName)}
                            title="Download document"
                            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Action Buttons — only for pending */}
                      {leave.status === 'pending' && (
                        <div className="pt-1 border-t border-zinc-800/80 space-y-2">
                          {cs.declineMode ? (
                            <div className="space-y-2">
                              <textarea
                                rows={2}
                                placeholder="Reason for declining (required)..."
                                value={cs.declineNote || ''}
                                onChange={e => setCardState(leave._id, { declineNote: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-red-700"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setCardState(leave._id, { declineMode: false, declineNote: '' })}
                                  className="flex-1 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs hover:bg-zinc-800 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDecline(leave)}
                                  disabled={cs.loading || !cs.declineNote?.trim()}
                                  className="flex-1 py-1.5 rounded-lg bg-red-950 text-red-400 border border-red-900 text-xs font-semibold hover:bg-red-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                  {cs.loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                  Confirm Decline
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(leave)}
                                disabled={cs.loading}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-900 text-xs font-semibold hover:bg-emerald-900 transition-colors disabled:opacity-50"
                              >
                                {cs.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Approve
                              </button>
                              <button
                                onClick={() => setCardState(leave._id, { declineMode: true })}
                                disabled={cs.loading}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-950 text-red-400 border border-red-900 text-xs font-semibold hover:bg-red-900 transition-colors disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] w-full max-w-3xl max-h-[90vh] rounded-xl border border-zinc-800 shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[#d4af37] shrink-0" />
                <span className="text-sm text-zinc-300 truncate">{previewDoc.fileName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = previewDoc.blobUrl;
                    a.download = previewDoc.fileName;
                    a.click();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={closePreview}
                  className="p-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-0">
              {previewDoc.isPdf ? (
                <iframe
                  src={previewDoc.blobUrl}
                  className="w-full h-full min-h-[60vh] rounded-lg border border-zinc-800"
                  title={previewDoc.fileName}
                />
              ) : (
                <img
                  src={previewDoc.blobUrl}
                  alt={previewDoc.fileName}
                  className="max-w-full max-h-[70vh] rounded-lg object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
