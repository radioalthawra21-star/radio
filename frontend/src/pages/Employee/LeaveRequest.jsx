import { useState, useEffect } from 'react';
import { createLeaveRequest, getLeaveRequests, getLeaveBalance, cancelLeaveRequest } from '../../services/leaveService';

const LEAVE_TYPES = [
  { value: 'annual', label: 'إجازة سنوية', icon: '🏖️', color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'sick', label: 'إجازة مرضية', icon: '🩺', color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'exceptional', label: 'إجازة استثنائية', icon: '⭐', color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'death', label: 'إجازة وفاة', icon: '🕊️', color: 'text-gray-600', bg: 'bg-gray-100' },
  { value: 'hourly', label: 'إجازة ساعية', icon: '⏰', color: 'text-teal-600', bg: 'bg-teal-50' },
  { value: 'emergency', label: 'إجازة طارئة', icon: '🚨', color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: 'maternity', label: 'إجازة وضع', icon: '👶', color: 'text-pink-600', bg: 'bg-pink-50' },
  { value: 'paternity', label: 'إجازة أبوة', icon: '👨‍👧', color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'unpaid', label: 'إجازة بدون راتب', icon: '💼', color: 'text-gray-600', bg: 'bg-gray-50' },
  { value: 'compensatory', label: 'إجازة تعويضية', icon: '🔄', color: 'text-teal-600', bg: 'bg-teal-50' },
];

const STATUS_MAP = {
  pending_manager: { label: 'بانتظار موافقة المدير', color: 'bg-yellow-100 text-yellow-800' },
  pending_general_manager: { label: 'بانتظار موافقة المدير العام', color: 'bg-orange-100 text-orange-800' },
  approved: { label: 'تمت الموافقة', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-600' },
};

const LeaveRequest = () => {
  const [showForm, setShowForm] = useState(false);
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    isHalfDay: false,
    reason: '',
    coveragePlan: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [reqRes, balRes] = await Promise.all([
        getLeaveRequests(),
        getLeaveBalance()
      ]);
      if (reqRes.success) setRequests(reqRes.data.requests || reqRes.data.leaveRequests || []);
      if (balRes.success) setBalances(balRes.data.balances);
    } catch (err) {
      setError(err.userMessage || 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await createLeaveRequest(form);
      if (res.success) {
        setSuccess(res.message || 'تم تقديم طلب الإجازة بنجاح');
        setShowForm(false);
        setForm({ type: 'annual', startDate: '', endDate: '', isHalfDay: false, reason: '', coveragePlan: '' });
        loadData();
      } else {
        setError(res.message || 'حدث خطأ في تقديم الطلب');
      }
    } catch (err) {
      setError(err.userMessage || 'خطأ في تقديم الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id, status) => {
    const msg = status === 'approved' || status === 'synced_to_payroll'
      ? 'تمت الموافقة على هذه الإجازة مسبقاً. سيتم إلغاؤها وإشعار مدير الفريق. هل أنت متأكد؟'
      : 'هل أنت متأكد من إلغاء طلب الإجازة؟';
    if (!window.confirm(msg)) return;
    try {
      const res = await cancelLeaveRequest(id);
      if (res.success) {
        setSuccess('تم إلغاء الطلب بنجاح');
        loadData();
      }
    } catch (err) {
      setError(err.userMessage || 'خطأ في إلغاء الطلب');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getLeaveTypeInfo = (type) => LEAVE_TYPES.find(t => t.value === type) || { label: type, icon: '📋', color: 'text-gray-600', bg: 'bg-gray-50' };

  const mainBalanceTypes = LEAVE_TYPES.filter(t => !['compensatory'].includes(t.value));

  const canCancel = (status) => ['pending_manager', 'pending_general_manager', 'approved', 'synced_to_payroll'].includes(status);

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">طلبات الإجازة</h1>
          <p className="text-gray-500 text-sm mt-1">تقديم وإدارة طلبات الإجازة</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
          className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium shadow-sm flex items-center gap-2"
        >
          <span>{showForm ? 'إلغاء' : 'طلب إجازة جديد'}</span>
          <span>{showForm ? '✕' : '➕'}</span>
        </button>
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

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">طلب إجازة جديد</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع الإجازة</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
              >
                {LEAVE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isHalfDay}
                  onChange={(e) => setForm({ ...form, isHalfDay: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">نصف يوم</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">السبب</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                placeholder="اذكر سبب طلب الإجازة..."
                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">خطة تغطية العمل (اختياري)</label>
              <input
                type="text"
                value={form.coveragePlan}
                onChange={(e) => setForm({ ...form, coveragePlan: e.target.value })}
                placeholder="من سيتولى مهامك أثناء الإجازة؟"
                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {submitting ? 'جاري التقديم...' : 'تقديم الطلب'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {mainBalanceTypes.slice(0, 5).map(({ value, label, icon, color, bg }) => {
              const bal = balances[value];
              const isHourly = value === 'hourly';
              const remaining = bal ? (isHourly ? Math.max(0, bal.remainingHours) : Math.max(0, bal.remainingBalance)) : '–';
              const total = bal ? (isHourly ? `${Math.round(bal.totalBalance * 8)} ساعة` : `${bal.totalBalance} يوم`) : '';
              const used = bal ? (isHourly ? `${Math.round(bal.usedHours)} س` : `${bal.usedDays} يوم`) : '';
              return (
                <div key={value} className={`${bg} rounded-xl p-4 border border-gray-100`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{icon}</span>
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${color}`}>
                    {remaining}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {bal ? `من ${total}` : ''}
                    {bal && (isHourly ? bal.usedHours > 0 : bal.usedDays > 0) ? ` | مستخدم ${used}` : ''}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">طلبات الإجازة السابقة</h2>
            </div>
            {requests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">📋</p>
                <p>لا توجد طلبات إجازة سابقة</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {requests.map((req) => {
                  const typeInfo = getLeaveTypeInfo(req.type);
                  const statusInfo = STATUS_MAP[req.status] || STATUS_MAP.pending_manager;
                  return (
                    <div key={req._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 ${typeInfo.bg} rounded-xl flex items-center justify-center text-lg`}>
                            {typeInfo.icon}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{typeInfo.label}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatDate(req.startDate)} → {formatDate(req.endDate)}
                              {req.isHalfDay ? ' (نصف يوم)' : ''}
                              <span className="mx-1">·</span>
                              {req.days} يوم
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{req.reason?.slice(0, 80)}{req.reason?.length > 80 ? '...' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {canCancel(req.status) && (
                            <button
                              onClick={() => handleCancel(req._id, req.status)}
                              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                            >
                              إلغاء
                            </button>
                          )}
                        </div>
                      </div>
                      {req.status === 'rejected' && req.rejectionReason && (
                        <div className="mt-2 mr-14 p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                          سبب الرفض: {req.rejectionReason}
                        </div>
                      )}
                      {req.status === 'pending_general_manager' && (
                        <div className="mt-2 mr-14 p-2 bg-orange-50 border border-orange-100 rounded-lg text-xs text-orange-700">
                          {req.managerSuggestedDays
                            ? `وافق المدير المباشر على ${req.managerSuggestedDays} يوم من أصل ${req.days}، بانتظار موافقة المدير العام`
                            : 'تمت موافقة المدير المباشر، بانتظار موافقة المدير العام'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LeaveRequest;
