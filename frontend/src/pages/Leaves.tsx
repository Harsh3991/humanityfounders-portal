import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Loader2, RefreshCw, Download } from 'lucide-react';
import axiosInstance from '../lib/axiosInstance';
import LeaveRequestModal from '../components/LeaveRequestModal';

interface Leave {
  _id: string;
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

const STATUS_STYLES = {
  pending:  'bg-amber-950/60 text-amber-400 border border-amber-900/50',
  approved: 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50',
  declined: 'bg-red-950/60 text-red-400 border border-red-900/50',
};

const REASON_LABELS = { medical: 'Medical', exam: 'Exam', other: 'Other' };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type Filter = 'all' | 'pending' | 'approved' | 'declined';

export default function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [showModal, setShowModal] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await axiosInstance.get(`/leaves/my-requests${params}`);
      if (res.data.success) setLeaves(res.data.data);
    } catch (err) {
      console.error('Failed to fetch leaves', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

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

  const TABS: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Declined', value: 'declined' },
  ];

  return (
    <div className="min-h-full bg-black -m-6 p-4 md:p-6 lg:p-8 font-sans text-gray-200">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-3xl text-[#d4af37] tracking-wide">My Leave Requests</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeaves}
              disabled={loading}
              className="p-2 rounded-lg bg-[#18181b] border border-zinc-800 text-zinc-400 hover:text-[#d4af37] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#d4af37] text-black font-semibold text-sm rounded-lg hover:bg-[#c4a030] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Request Leave
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-6 bg-[#18181b] rounded-lg p-1 border border-zinc-800 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
            <p className="text-zinc-500 text-sm uppercase tracking-widest">Loading...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[#18181b] rounded-xl border border-zinc-800">
            <FileText className="w-12 h-12 text-zinc-700" />
            <p className="text-zinc-400 text-base font-medium">No leave requests</p>
            <p className="text-zinc-600 text-sm">Click &ldquo;Request Leave&rdquo; to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {leaves.map(leave => (
              <div key={leave._id} className="bg-[#18181b] rounded-xl border border-zinc-800/60 p-5 hover:border-zinc-700 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">
                        {formatDate(leave.startDate)}
                        {leave.startDate !== leave.endDate && ` — ${formatDate(leave.endDate)}`}
                      </span>
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full capitalize">
                        {REASON_LABELS[leave.reason]}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Submitted {formatDate(leave.createdAt)}</p>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[leave.status]}`}>
                    {leave.status}
                  </span>
                </div>

                {leave.description && (
                  <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{leave.description}</p>
                )}

                {leave.status !== 'pending' && leave.adminNotes && (
                  <div className={`text-xs rounded-lg px-3 py-2 mb-3 ${leave.status === 'approved' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40' : 'bg-red-950/30 text-red-400 border border-red-900/40'}`}>
                    <span className="font-semibold uppercase tracking-wider">Admin notes: </span>
                    {leave.adminNotes}
                  </div>
                )}

                {leave.status !== 'pending' && leave.approvedBy && (
                  <p className="text-xs text-zinc-500 mb-3">
                    {leave.status === 'approved' ? 'Approved' : 'Declined'} by {leave.approvedBy.fullName}
                    {leave.actionDate && ` on ${formatDate(leave.actionDate)}`}
                  </p>
                )}

                {leave.documentFileName && (
                  <button
                    onClick={() => handleDownload(leave._id, leave.documentFileName)}
                    className="flex items-center gap-1.5 text-xs text-[#d4af37] hover:text-[#c4a030] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {leave.documentFileName}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <LeaveRequestModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchLeaves(); }}
        />
      )}
    </div>
  );
}
