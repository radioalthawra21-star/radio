import { useState, useEffect, useRef } from 'react';
import { createLeaveRequest, getLeaveRequests, getLeaveBalance, cancelLeaveRequest, deleteLeaveRequestPermanent, requestStopLeave } from '../../services/leaveService';

const LEAVE_TYPES = [
  { value: 'annual', label: 'إجازة إدارية', icon: '🏖️', color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'sick', label: 'إجازة مرضية', icon: '🩺', color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'exceptional', label: 'إجازة استثنائية', icon: '⭐', color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'death', label: 'إجازة وفاة', icon: '🕊️', color: 'text-gray-600', bg: 'bg-gray-100' },
  { value: 'hajj', label: 'إجازة حج', icon: '🕋', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { value: 'hourly', label: 'إجازة ساعية', icon: '⏰', color: 'text-teal-600', bg: 'bg-teal-50' },
  { value: 'development', label: 'إجازة تطوير', icon: '📚', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { value: 'maternity', label: 'إجازة وضع', icon: '👶', color: 'text-pink-600', bg: 'bg-pink-50' },
  { value: 'unpaid', label: 'إجازة بدون راتب', icon: '💼', color: 'text-gray-600', bg: 'bg-gray-50' },
  { value: 'compensatory', label: 'إجازة تعويضية', icon: '🔄', color: 'text-teal-600', bg: 'bg-teal-50' },
  { value: 'fingerprint_forgotten', label: 'نسيان بصمة', icon: '🖐️', color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

const STATUS_MAP = {
  pending_office_manager: { label: 'بانتظار موافقة مدير المكتب', color: 'bg-blue-100 text-blue-800' },
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
  const [uploadingMedical, setUploadingMedical] = useState(false);
  const [medicalPreview, setMedicalPreview] = useState('');
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    isHalfDay: false,
    reason: '',
    coveragePlan: '',
    fingerprintType: 'in',
    fingerprintDate: '',
    fingerprintTime: '',
    deathDegree: 1,
    startTime: '',
    endTime: '',
    medicalReport: null,
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
    if (!form.reason.trim()) {
      setError('يرجى كتابة السبب');
      return;
    }
    if (form.type === 'fingerprint_forgotten') {
      if (!form.fingerprintDate) {
        setError('يرجى تحديد تاريخ البصمة');
        return;
      }
    } else if (form.type === 'death') {
      if (!form.startDate) {
        setError('يرجى تحديد تاريخ البداية');
        return;
      }
    } else if (form.type === 'hourly') {
      if (!form.startDate) {
        setError('يرجى تحديد تاريخ الإجازة');
        return;
      }
      if (!form.startTime || !form.endTime) {
        setError('يرجى تحديد وقت البداية والنهاية');
        return;
      }
      if (form.startTime >= form.endTime) {
        setError('وقت النهاية يجب أن يكون بعد وقت البداية');
        return;
      }
    } else if (form.type === 'development') {
      if (!form.startDate || !form.startTime || !form.endTime) {
        setError('يرجى تحديد التاريخ ووقت البداية والنهاية');
        return;
      }
    } else if (form.type === 'hajj') {
      if (!form.startDate) {
        setError('يرجى تحديد تاريخ بداية إجازة الحج');
        return;
      }
    } else {
      if (!form.startDate || !form.endDate) {
        setError('يرجى تحديد تاريخ البداية والنهاية');
        return;
      }
      if (new Date(form.endDate) < new Date(form.startDate)) {
        setError('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');
        return;
      }
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const submitData = { ...form };
      if (form.type === 'hourly') {
        submitData.endDate = submitData.startDate;
      }
      if (form.medicalReport) {
        submitData.documents = [{ url: form.medicalReport, description: 'تقرير طبي' }];
      }
      delete submitData.medicalReport;
      if (form.type !== 'death') delete submitData.deathDegree;
      if (form.type !== 'development' && form.type !== 'hourly') { delete submitData.startTime; delete submitData.endTime; }
      const res = await createLeaveRequest(submitData);
      if (res.success) {
        setSuccess(res.message || 'تم تقديم طلب الإجازة بنجاح');
        setShowForm(false);
        setMedicalPreview('');
        setForm({ type: 'annual', startDate: '', endDate: '', isHalfDay: false, reason: '', coveragePlan: '', fingerprintType: 'in', fingerprintDate: '', fingerprintTime: '', deathDegree: 1, startTime: '', endTime: '', medicalReport: null });
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

  const mainBalanceTypes = LEAVE_TYPES.filter(t => !['compensatory', 'fingerprint_forgotten', 'development'].includes(t.value));

  const handleDeletePermanent = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الإجازة نهائياً من السجل؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      const res = await deleteLeaveRequestPermanent(id);
      if (res.success) {
        setSuccess('تم حذف الإجازة من السجل');
        loadData();
      }
    } catch (err) {
      setError(err.userMessage || 'فشل حذف الإجازة');
    }
  };

  const uploadMedicalReport = async (file) => {
    setUploadingMedical(true);
    setError('');
    try {
      const token = JSON.parse(localStorage.getItem('user') || '{}').token;
      const formData = new FormData();
      formData.append('medicalReport', file);
      const res = await fetch('/api/leave/upload-medical', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setForm({ ...form, medicalReport: data.data.url });
        setMedicalPreview(data.data.url);
      } else {
        setError(data.message || 'فشل رفع الملف');
      }
    } catch (err) {
      setError('خطأ في رفع التقرير الطبي');
    } finally {
      setUploadingMedical(false);
    }
  };

  const handleStopLeave = async (id) => {
    if (!window.confirm('هل تريد طلب إيقاف هذه الإجازة؟ بعد الطلب، قم بالبصم على جهاز البصمة لإيقاف الإجازة فعلياً.')) return;
    try {
      const res = await requestStopLeave(id);
      if (res.success) {
        setSuccess(res.message || 'تم تسجيل طلب إيقاف الإجازة');
        loadData();
      }
    } catch (err) {
      setError(err.userMessage || 'خطأ في طلب إيقاف الإجازة');
    }
  };

  const canCancel = (status) => ['pending_office_manager', 'pending_manager', 'pending_general_manager', 'approved', 'synced_to_payroll'].includes(status);

  const canStop = (req) => ['approved', 'synced_to_payroll'].includes(req.status) && !req.stopRequested;

  const isStopPending = (req) => ['approved', 'synced_to_payroll'].includes(req.status) && req.stopRequested && !req.fingerprintStoppedAt;
  const hasCheckInOnly = (req) => isStopPending(req) && req.checkInDetectedAt;

  const canDelete = (status) => ['rejected', 'cancelled'].includes(status);

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">طلبات الإجازة</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">تقديم وإدارة طلبات الإجازة</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
          className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium shadow-sm flex items-center justify-center gap-2 w-full md:w-auto"
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
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">طلب إجازة جديد</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع الطلب</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  const updates = { ...form, type: newType };
                  if (newType === 'hourly' && !updates.startDate) {
                    updates.startDate = new Date().toISOString().split('T')[0];
                  }
                  setForm(updates);
                }}
                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
              >
                {LEAVE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>

            {form.type === 'fingerprint_forgotten' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البصمة</label>
                  <input
                    type="date"
                    value={form.fingerprintDate}
                    onChange={(e) => setForm({ ...form, fingerprintDate: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع البصمة</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="fingerprintType"
                        value="in"
                        checked={form.fingerprintType === 'in'}
                        onChange={(e) => setForm({ ...form, fingerprintType: e.target.value })}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">دخول</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="fingerprintType"
                        value="out"
                        checked={form.fingerprintType === 'out'}
                        onChange={(e) => setForm({ ...form, fingerprintType: e.target.value })}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">خروج</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوقت (اختياري)</label>
                  <input
                    type="time"
                    value={form.fingerprintTime}
                    onChange={(e) => setForm({ ...form, fingerprintTime: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  />
                </div>
              </>
            ) : form.type === 'death' ? (
              <>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">درجة القرابة</label>
                  <select
                    value={form.deathDegree}
                    onChange={(e) => setForm({ ...form, deathDegree: parseInt(e.target.value) })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  >
                    <option value={1}>الدرجة الأولى (3 أيام) - والد، والدة، زوج/ة، ولد</option>
                    <option value={2}>الدرجة الثانية (يومان) - أخ، أخت، جد، جدة</option>
                    <option value={3}>الدرجة الثالثة (يوم واحد) - خال، خالة، عم، عمة</option>
                  </select>
                </div>
              </>
            ) : form.type === 'development' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت البداية</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت النهاية</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-sm text-cyan-800">
                  ⏰ إجازة تطوير: 6 ساعات أسبوعياً - تنتهي بانتهاء الأسبوع ولا تتراكم
                </div>
              </>
            ) : form.type === 'hourly' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الإجازة</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">من الساعة</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">إلى الساعة</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-800 md:col-span-2">
                  ⏰ الإجازة الساعية — عند تجميع 7 ساعات يُخصم يوم كامل من الرصيد الإداري
                </div>
              </>
            ) : form.type === 'hajj' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ بداية إجازة الحج</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                  🕋 إجازة الحج مدتها شهر كامل (30 يوم) وتحتاج موافقة المدير العام
                </div>
              </>
            ) : (
              <>
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
              </>
            )}

            {form.type === 'sick' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">صورة التقرير الطبي (مطلوب)</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) uploadMedicalReport(file);
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingMedical}
                      className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      {uploadingMedical ? (
                        <span>جاري الرفع...</span>
                      ) : (
                        <><span>📎</span> اختيار صورة التقرير الطبي</>
                      )}
                    </button>
                    {form.medicalReport && !uploadingMedical && (
                      <button
                        type="button"
                        onClick={() => window.open(form.medicalReport, '_blank')}
                        className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        عرض الصورة 🔍
                      </button>
                    )}
                  </div>
                  {medicalPreview && (
                    <div className="relative w-40 h-40 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={medicalPreview}
                        alt="التقرير الطبي"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => window.open(medicalPreview, '_blank')}
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-red-500 mt-1">* يجب إرفاق صورة عن التقرير الطبي لإجازة مرضية</p>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">السبب</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                placeholder={form.type === 'fingerprint_forgotten' ? 'اذكر سبب نسيان البصمة...' : form.type === 'death' ? 'اذكر اسم المتوفي وصلة القرابة...' : 'اذكر سبب طلب الإجازة...'}
                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm resize-none"
              />
            </div>
            {form.type !== 'fingerprint_forgotten' && form.type !== 'development' && (
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
            )}
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 md:py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {submitting ? 'جاري التقديم...' : 'تقديم الطلب'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-3 md:py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
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
              const isShowBalance = value === 'annual' || value === 'hourly';
              return (
                <div key={value} className={`${bg} rounded-xl p-4 border border-gray-100`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{icon}</span>
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                  {isShowBalance && bal ? (
                    <>
                      {value === 'annual' ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-bold ${color}`}>{bal.remainingBalance}</span>
                            <span className="text-xs text-gray-400">يوم</span>
                            {bal.remainingHours > 0 && (
                              <>
                                <span className="text-sm font-bold text-gray-600 mx-0.5">{bal.remainingHours}</span>
                                <span className="text-xs text-gray-400">ساعة</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-sm font-medium text-gray-500">{bal.usedDays} يوم</span>
                            {bal.usedHours > 0 && (
                              <span className="text-xs text-gray-400">+ {Math.round(bal.usedHours)} س</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-bold ${color}`}>
                              {bal.remainingBalance * 7 + bal.remainingHours}
                            </span>
                            <span className="text-xs text-gray-400">ساعة متبقية</span>
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-sm font-medium text-gray-500">{Math.round(bal.usedHours)} ساعة</span>
                            <span className="text-xs text-gray-400">مستخدمة</span>
                          </div>
                        </>
                      )}
                    </>
                  ) : isShowBalance ? (
                    <div className="text-xs text-gray-400">–</div>
                  ) : (
                    <div className="text-xs text-gray-400 leading-relaxed">
                      {value === 'sick' ? <><span>تحتاج تقرير طبي</span><br/><span>موافقة المدير العام</span></> : 
                       value === 'exceptional' ? <><span>تحتاج موافقة</span><br/><span>المدير العام</span></> :
                       value === 'hajj' ? <><span>شهر كامل - تحتاج</span><br/><span>موافقة المدير العام</span></> :
                       value === 'death' ? <><span>حسب درجة القرابة</span><br/><span>موافقة المدير العام</span></> :
                       'دون رصيد محدد'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {balances.development && (
            <div className="mb-6">
              <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📚</span>
                  <div>
                    <span className="text-sm text-gray-600">إجازة تطوير (أسبوعياً)</span>
                    <div className="text-xs text-gray-400 mt-0.5">6 ساعات أسبوع - تنتهي بانتهاء الأسبوع</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-cyan-700">
                    {Math.max(0, balances.development.remainingHours || 0)} <span className="text-sm">س</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    مستخدم {Math.round(balances.development.usedHours || 0)} س هذا الأسبوع
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100">
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
                    <div key={req._id} className="px-4 md:px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 ${typeInfo.bg} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
                            {typeInfo.icon}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm">{typeInfo.label}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {req.type === 'fingerprint_forgotten' ? (
                                <>
                                  {formatDate(req.fingerprintDate)}
                                  <span className="mx-1">·</span>
                                  {req.fingerprintType === 'in' ? 'دخول' : 'خروج'}
                                  {req.fingerprintTime && <><span className="mx-1">·</span>⏰ {req.fingerprintTime}</>}
                                </>
                              ) : req.type === 'hourly' ? (
                                <>
                                  {formatDate(req.startDate)}
                                  <span className="mx-1">·</span>
                                  {req.startTime} → {req.endTime}
                                  <span className="mx-1">·</span>
                                  {req.hours} ساعات
                                </>
                              ) : (
                                <>
                                  {formatDate(req.startDate)} → {formatDate(req.endDate)}
                                  {req.isHalfDay ? ' (نصف يوم)' : ''}
                                  <span className="mx-1">·</span>
                                  {req.days} يوم
                                </>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px] md:max-w-none">{req.reason?.slice(0, 80)}{req.reason?.length > 80 ? '...' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {canStop(req) && (
                            <button
                              onClick={() => handleStopLeave(req._id)}
                              className="text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded transition-colors"
                              title="اطلب إيقاف الإجازة ثم بصم على الجهاز"
                            >
                              🔴 إيقاف
                            </button>
                          )}
                          {isStopPending(req) && !hasCheckInOnly(req) && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                              <span className="animate-pulse">⏳</span> بانتظار البصمة
                            </span>
                          )}
                          {hasCheckInOnly(req) && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                              <span className="animate-pulse">🔵</span> بانتظار بصمة الخروج
                            </span>
                          )}
                          {canCancel(req.status) && (
                            <button
                              onClick={() => handleCancel(req._id, req.status)}
                              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                            >
                              إلغاء
                            </button>
                          )}
                          {canDelete(req.status) && (
                            <button
                              onClick={() => handleDeletePermanent(req._id)}
                              className="text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                              title="حذف نهائي من السجل"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                      {isStopPending(req) && !hasCheckInOnly(req) && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                          <span className="animate-pulse">⏳</span>
                          <span>تم طلب إيقاف الإجازة. قم بالبصم (دخول وخروج) على جهاز البصمة لإيقافها فعلياً</span>
                        </div>
                      )}
                      {hasCheckInOnly(req) && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center gap-2">
                          <span className="animate-pulse">🔵</span>
                          <span>تم تسجيل بصمة الدخول ✓ - قم ببصمة الخروج لإيقاف الإجازة. سيتم إيقاف الإجازة تلقائياً عند بصمة الخروج</span>
                        </div>
                      )}
                      {req.fingerprintStoppedAt && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 flex items-center gap-2">
                          <span>✅</span>
                          <span>تم إيقاف الإجازة بعد البصم على الجهاز بتاريخ {formatDate(req.fingerprintStoppedAt)}</span>
                        </div>
                      )}
                      {req.status === 'rejected' && req.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                          سبب الرفض: {req.rejectionReason}
                        </div>
                      )}
                      {req.status === 'pending_general_manager' && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-100 rounded-lg text-xs text-orange-700">
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
