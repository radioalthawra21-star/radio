import { useState, useEffect } from 'react';
import { getProposals, approveProposal, rejectProposal } from '../services/taskService';
import Card from './common/Card';
import { formatDateArabic } from '../utils/dateUtils';

const ProposalsList = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectReason, setRejectReason] = useState({});

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const res = await getProposals();
      if (res.success) setProposals(res.data.proposals || []);
    } catch (err) {
      console.error('Error fetching proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId) => {
    setActionLoading(taskId);
    setError('');
    setSuccess('');
    try {
      const res = await approveProposal(taskId);
      if (res.success) {
        setSuccess('تمت الموافقة على الاقتراح');
        fetchProposals();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'فشل الموافقة على الاقتراح');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (taskId) => {
    const reason = rejectReason[taskId] || '';
    setActionLoading(taskId);
    setError('');
    setSuccess('');
    try {
      const res = await rejectProposal(taskId, reason);
      if (res.success) {
        setSuccess('تم رفض الاقتراح');
        setRejectReason(r => { const n = { ...r }; delete n[taskId]; return n; });
        fetchProposals();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'فشل رفض الاقتراح');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-8">الاقتراحات</h1>

      {error && (
        <div className="bg-error/10 border border-error text-error p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-success/10 border border-success text-success p-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
        </div>
      ) : proposals.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">لا توجد اقتراحات في انتظار الموافقة</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <Card key={proposal._id} className="border-r-4 border-r-primary">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                    💡
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark text-lg">{proposal.title}</h3>
                    <p className="text-sm text-gray-600">{proposal.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>👤 {proposal.createdBy?.name}</span>
                      <span>🏢 {proposal.createdBy?.department}</span>
                      <span>⏱️ {proposal.duration} ساعة</span>
                      <span>📅 <span className="en-num">{formatDateArabic(proposal.taskDate)}</span></span>
                    </div>
                    {proposal.isUnusual && (
                      <span className="badge bg-warning text-white mt-2">غير عادية</span>
                    )}
                  </div>
                </div>
                <div className="w-full md:w-64 space-y-2">
                  <button
                    onClick={() => handleApprove(proposal._id)}
                    disabled={actionLoading === proposal._id}
                    className="btn btn-success w-full"
                  >
                    {actionLoading === proposal._id ? 'جاري...' : '✓ موافقة'}
                  </button>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="سبب الرفض (اختياري)"
                      value={rejectReason[proposal._id] || ''}
                      onChange={(e) => setRejectReason(r => ({ ...r, [proposal._id]: e.target.value }))}
                      className="input text-sm flex-1"
                    />
                    <button
                      onClick={() => handleReject(proposal._id)}
                      disabled={actionLoading === proposal._id}
                      className="btn btn-error whitespace-nowrap"
                    >
                      {actionLoading === proposal._id ? '...' : '✕ رفض'}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProposalsList;
