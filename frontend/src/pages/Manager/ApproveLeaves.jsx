import { useState, useEffect } from 'react';
import { getPendingLeaveRequests, updateLeaveStatus } from '../../services/leaveService';

const LEAVE_TYPE_LABELS = {
  annual: 'إجازة سنوية', sick: 'إجازة مرضية', exceptional: 'إجازة استثنائية',
  death: 'إجازة وفاة', hourly: 'إجازة ساعية', emergency: 'إجازة طارئة',
  maternity: 'إجازة وضع', paternity: 'إجازة أبوة', unpaid: 'إجازة بدون راتب',
  compensatory: 'إجازة تعويضية',
};

const LEAVE_TYPE_ICONS = {
  annual: '🏖️', sick: '🩺', exceptional: '⭐', death: '🕊️', hourly: '⏰',
  emergency: '🚨', maternity: '👶', paternity: '👨‍👧', unpaid: '💼', compensatory: '🔄',
};

const ApproveLeaves = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectionModal, setRejectionModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveModal, setApproveModal] = useState(null);
  const [approvedDays, setApprovedDays] = useState(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPendingLeaveRequests();
      if (res.success) setRequests(res.data.leaveRequests || []);
    } catch (err) {
      setError('خطأ في تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveFull = async (id) => {
    try {
      const res = await updateLeaveStatus(id, { status: 'approved' });
      if (res.success) {
        setSuccess(res.message || 'تمت الموافقة');
        loadPending();
      }
    } catch (err) {
      setError(err.userMessage || 'فشل الموافقة');
    }
  };

  const handleApprovePartial = async (id, days) => {
    try {
      const res = await updateLeaveStatus(id, { status: 'approved', approvedDays: days });
      if (res.success) {
        setSuccess(res.message || 'تمت الموافقة');
        setApproveModal(null);
        setApprovedDays(null);
        loadPending();
      }
    } catch (err) {
      setError(err.userMessage || 'فشل الموافقة');
    }
  };

  const handleReject = async () => {
    if (!rejectionModal) return;
    try {
      const res = await updateLeaveStatus(rejectionModal, { status: 'rejected', rejectionReason });
      if (res.success) {
        setSuccess('تم الرفض');
        setRejectionModal(null);
        setRejectionReason('');
        loadPending();
      }
    } catch (err) {
      setError(err.userMessage || 'فشل الرفض');
    }
  };

  const openApproveModal = (req) => {
    setApprovedDays(req.days);
    setApproveModal(req);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">الموافقة على طلبات الإجازة</h1>
        <p className="text-gray-500 text-sm mt-1">مراجعة والموافقة على طلبات الإجازة المقدمة من موظفي القسم</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-gray-500 text-lg">لا توجد طلبات إجازة معلقة</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
                    {LEAVE_TYPE_ICONS[req.type] || '📋'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{req.employee?.name || 'موظف'}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {req.employee?.department || ''}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      {LEAVE_TYPE_LABELS[req.type] || req.type}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(req.startDate)} → {formatDate(req.endDate)}
                      <span className="mx-1">·</span>
                      {req.days} يوم
                      {req.days > 3 && (
                        <span className="mr-2 text-orange-600 font-medium">
                          (أكثر من 3 أيام - ستحتاج موافقة المدير العام بعدك)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded-lg">
                      {req.reason}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>🕐 قدّم: {new Date(req.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {req.coveragePlan && <span>🔄 التغطية: {req.coveragePlan}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mr-4">
                  <button
                    onClick={() => req.days > 3 ? openApproveModal(req) : handleApproveFull(req._id)}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                  >
                    ✔ موافقة
                  </button>
                  <button
                    onClick={() => setRejectionModal(req._id)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    ✕ رفض
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {approveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setApproveModal(null); setApprovedDays(null); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">موافقة على إجازة أكثر من 3 أيام</h3>
            <p className="text-sm text-gray-500 mb-4">
              {LEAVE_TYPE_LABELS[approveModal.type] || approveModal.type} - {approveModal.employee?.name} ({approveModal.days} يوم)
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <button
                  onClick={() => { handleApproveFull(approveModal._id); setApproveModal(null); }}
                  className="w-full text-green-800 hover:text-green-900 text-sm font-medium transition-colors text-center py-2"
                >
                  ✔ قبول كامل الإجازة ({approveModal.days} يوم)
                </button>
              </div>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-gray-400">أو</span></div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm font-medium text-blue-800 mb-3">تحديد عدد أيام محدد:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={approveModal.days}
                    value={approvedDays}
                    onChange={(e) => setApprovedDays(Math.min(Number(e.target.value), approveModal.days))}
                    className="w-20 p-2 border border-blue-200 rounded-lg text-sm text-center bg-white"
                  />
                  <span className="text-sm text-blue-700">يوم من أصل {approveModal.days}</span>
                  <button
                    onClick={() => { handleApprovePartial(approveModal._id, approvedDays); }}
                    disabled={!approvedDays || approvedDays < 1}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    تأكيد
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setApproveModal(null); setApprovedDays(null); }}
              className="mt-4 w-full p-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {rejectionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setRejectionModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">سبب الرفض</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="اذكر سبب رفض طلب الإجازة..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-sm"
            />
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                تأكيد الرفض
              </button>
              <button
                onClick={() => { setRejectionModal(null); setRejectionReason(''); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApproveLeaves;