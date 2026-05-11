import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { getLeaveBalance } from '../../services/leaveService';

type LeaveType = 'annual' | 'sick' | 'maternity' | 'unpaid' | 'hourly' | 'mission' | 'overtime' | 'attendance_correction';
type LeaveStatus = 'draft' | 'pending_manager' | 'pending_general_manager' | 'approved' | 'rejected' | 'cancelled' | 'synced_to_payroll';
type MissionType = 'internal' | 'external';

interface LeaveFormData {
  type: LeaveType;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  isHalfDay: boolean;
  coveragePlan: string;
  missionType: MissionType;
  visitParty: string;
  geoLocation: { lat: number; lng: number; address: string };
  transportAllowance: number;
  overtimeHours: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface BalanceInfo {
  totalBalance: number;
  remainingBalance: number;
  usedDays: number;
  remainingHours: number;
}

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'annual', label: 'إجازة سنوية' },
  { value: 'sick', label: 'إجازة مرضية' },
  { value: 'maternity', label: 'إجازة أمومة' },
  { value: 'unpaid', label: 'بدون راتب' },
  { value: 'hourly', label: 'ساعية' },
  { value: 'mission', label: 'مهمة' },
  { value: 'overtime', label: 'أجر إضافي' },
  { value: 'attendance_correction', label: 'تصحيح بصمة' },
];

const STATUS_STEPS: { key: LeaveStatus; label: string }[] = [
  { key: 'draft', label: 'مسودة' },
  { key: 'pending_manager', label: 'بانتظار المدير' },
  { key: 'pending_general_manager', label: 'موافقة المدير العام' },
  { key: 'approved', label: 'معتمدة' },
  { key: 'synced_to_payroll', label: 'منعكسة على الراتب' },
];

const LeaveRequestForm: React.FC = () => {
  const [form, setForm] = useState<LeaveFormData>({
    type: 'annual', startDate: '', endDate: '', startTime: '', endTime: '',
    reason: '', isHalfDay: false, coveragePlan: '',
    missionType: 'internal', visitParty: '', geoLocation: { lat: 0, lng: 0, address: '' },
    transportAllowance: 0, overtimeHours: 0,
  });
  const [balances, setBalances] = useState<Record<string, BalanceInfo>>({});
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: [], warnings: [] });
  const [estimatedAmount, setEstimatedAmount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getLeaveBalance().then((res: any) => {
      if (res?.success) setBalances(res.data.balances);
    }).catch(() => {});
  }, []);

  const updateForm = (patch: Partial<LeaveFormData>) => {
    setForm(prev => ({ ...prev, ...patch }));
  };

  const validate = useCallback(async () => {
    const payload: any = { type: form.type };
    if (form.type === 'hourly') {
      payload.startTime = form.startTime;
      payload.endTime = form.endTime;
      if (form.startTime && form.endTime) {
        const [sh, sm] = form.startTime.split(':').map(Number);
        const [eh, em] = form.endTime.split(':').map(Number);
        payload.hours = Math.max(0, (eh + em / 60) - (sh + sm / 60));
      }
    } else {
      payload.startDate = form.startDate;
      payload.endDate = form.endDate;
    }
    try {
      const res = await api.post('/leave/validate', payload);
      if (res.data?.success) setValidation(res.data.data);
    } catch { }
  }, [form]);

  useEffect(() => {
    const timer = setTimeout(validate, 500);
    return () => clearTimeout(timer);
  }, [form.startDate, form.endDate, form.startTime, form.endTime, form.type, validate]);

  useEffect(() => {
    if (form.type === 'overtime' && form.overtimeHours > 0) {
      const annualBal = balances['annual'];
      const hr = annualBal
        ? (annualBal.totalBalance * annualBal.remainingBalance > 0 ? annualBal.totalBalance * 8 / 22 / 8 : 0) || 20
        : 20;
      const mult = 1.5;
      setEstimatedAmount(hr * mult * form.overtimeHours);
    } else if (form.type === 'mission') {
      const allowance = form.missionType === 'external' ? (form.transportAllowance || 200) : (form.transportAllowance || 100);
      setEstimatedAmount(allowance);
    } else {
      setEstimatedAmount(null);
    }
  }, [form.type, form.overtimeHours, form.missionType, form.transportAllowance, balances]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reason.trim()) { setError('يرجى كتابة سبب الطلب'); return; }
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const res = await api.post('/leave', form);
      if (res.data?.success) {
        setSuccess('تم تقديم الطلب بنجاح');
        setForm({ type: 'annual', startDate: '', endDate: '', startTime: '', endTime: '', reason: '', isHalfDay: false, coveragePlan: '', missionType: 'internal', visitParty: '', geoLocation: { lat: 0, lng: 0, address: '' }, transportAllowance: 0, overtimeHours: 0 });
        getLeaveBalance().then((r: any) => { if (r?.success) setBalances(r.data.balances); });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.userMessage || 'خطأ في تقديم الطلب');
    } finally { setSubmitting(false); }
  };

  const annualBal = balances['annual'];
  const hourlyBal = balances['hourly'];
  const annualDisplay = annualBal
    ? annualBal.remainingBalance + ' يوم (' + (annualBal.remainingHours || Math.round(annualBal.remainingBalance * 8)) + ' ساعة)'
    : '--';
  const hourlyRemainingDisplay = hourlyBal
    ? (hourlyBal.remainingHours || hourlyBal.remainingBalance * 8) + ' ساعة'
    : '--';

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">نموذج طلب الإجازة</h1>
      <p className="text-gray-500 text-sm mb-6">تقديم طلب إجازة، مهمة، أجر إضافي، أو تصحيح بصمة</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center justify-between">
          {STATUS_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ' + (i === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400')}>
                  {i + 1}
                </div>
                <span className="text-xs mt-1 text-gray-500">{step.label}</span>
              </div>
              {i < STATUS_STEPS.length - 1 && <div className="flex-1 h-0.5 mx-2 bg-gray-100" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm">
        <span className="font-semibold text-blue-800">الرصيد السنوي المتبقي: </span>
        <span className="text-blue-600 font-bold">{annualDisplay}</span>
        {form.type === 'hourly' && (
          <>
            <span className="mr-4 font-semibold text-blue-800">الرصيد الساعي المتبقي: </span>
            <span className="text-blue-600 font-bold">{hourlyRemainingDisplay}</span>
          </>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{success}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نوع الطلب</label>
          <select value={form.type} onChange={e => updateForm({ type: e.target.value as LeaveType })}
            className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm">
            {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {form.type !== 'hourly' && form.type !== 'overtime' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
              <input type="date" value={form.startDate} onChange={e => updateForm({ startDate: e.target.value })}
                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية</label>
              <input type="date" value={form.endDate} onChange={e => updateForm({ endDate: e.target.value })}
                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
            </div>
          </div>
        )}

        {form.type === 'hourly' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وقت البداية</label>
              <input type="time" value={form.startTime} onChange={e => updateForm({ startTime: e.target.value })}
                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وقت النهاية</label>
              <input type="time" value={form.endTime} onChange={e => updateForm({ endTime: e.target.value })}
                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
            </div>
            {form.startTime && form.endTime && (() => {
              const [sh, sm] = form.startTime.split(':').map(Number);
              const [eh, em] = form.endTime.split(':').map(Number);
              const hrs = Math.max(0, (eh + em / 60) - (sh + sm / 60));
              const remaining = hourlyBal ? (hourlyBal.remainingHours || hourlyBal.remainingBalance * 8) : 0;
              return (
                <div className="md:col-span-2 text-sm space-y-1">
                  <div className="text-gray-600">المدة: <strong>{hrs}</strong> ساعة</div>
                  {remaining > 0 && (
                    <div className={'font-semibold ' + (hrs > remaining ? 'text-red-600' : 'text-green-600')}>
                      {hrs > remaining
                        ? '⚠ تجاوز الرصيد المتبقي! سيتم خصم ' + ((hrs - remaining) * (annualBal ? annualBal.totalBalance * 8 / 22 / 8 : 20)).toFixed(2) + ' ريال'
                        : '✅ ضمن الرصيد المتبقي (' + remaining.toFixed(1) + ' ساعة)'}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {form.type === 'mission' && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-sm text-gray-700">تفاصيل المهمة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع المهمة</label>
                <select value={form.missionType} onChange={e => updateForm({ missionType: e.target.value as MissionType })}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm">
                  <option value="internal">داخلية</option>
                  <option value="external">خارجية</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">جهة الزيارة</label>
                <input type="text" value={form.visitParty} onChange={e => updateForm({ visitParty: e.target.value })}
                  placeholder="اسم الجهة"
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">بدل تنقل متوقع (ريال)</label>
                <input type="number" min="0" value={form.transportAllowance} onChange={e => updateForm({ transportAllowance: +e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الموقع الجغرافي (اختياري)</label>
                <input type="text" value={form.geoLocation.address} onChange={e => updateForm({ geoLocation: { ...form.geoLocation, address: e.target.value } })}
                  placeholder="عنوان الموقع"
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
          </div>
        )}

        {form.type === 'overtime' && (
          <div className="space-y-4 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-sm text-gray-700">تفاصيل الأجر الإضافي</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الأجر الإضافي</label>
                <input type="date" value={form.startDate} onChange={e => updateForm({ startDate: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عدد الساعات الإضافية</label>
                <input type="number" step="0.5" min="0.5" value={form.overtimeHours} onChange={e => updateForm({ overtimeHours: +e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            {estimatedAmount !== null && (
              <div className="text-sm bg-white p-3 rounded-lg border border-yellow-200">
                المبلغ التقديري: <strong className="text-blue-600">{estimatedAmount.toFixed(2)} ريال</strong>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">السبب</label>
          <textarea value={form.reason} onChange={e => updateForm({ reason: e.target.value })} rows={3}
            placeholder="اذكر سبب الطلب..." className="w-full p-2.5 border border-gray-200 rounded-lg text-sm resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">خطة تغطية العمل (اختياري)</label>
          <input type="text" value={form.coveragePlan} onChange={e => updateForm({ coveragePlan: e.target.value })}
            placeholder="من سيتولى مهامك؟" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
        </div>

        {validation.warnings.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            {validation.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
          </div>
        )}
        {validation.errors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {validation.errors.map((e, i) => <p key={i}>✕ {e}</p>)}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button type="submit" disabled={submitting || !validation.valid || !form.reason.trim()}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
            {submitting ? 'جاري التقديم...' : 'تقديم الطلب'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveRequestForm;
