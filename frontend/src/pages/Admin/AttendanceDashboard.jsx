import { useState, useEffect, useMemo } from 'react';
import {
  FaUsers, FaCheckCircle, FaUserTimes, FaUserClock,
  FaClock, FaCalendarDay, FaCalendarWeek, FaCalendarAlt,
  FaChartBar, FaChartPie, FaSync, FaPlug, FaInfoCircle,
  FaHourglassHalf, FaSignInAlt, FaSignOutAlt, FaFingerprint,
  FaTimes, FaIdBadge, FaCheck, FaExclamationTriangle, FaCog, FaSave
} from 'react-icons/fa';
import { getAttendanceDashboard, syncZKTecoDevice, testZKTecoConnection, getZKTecoStatus, getDeviceUsersFromDevice, pullDeviceAttendance } from '../../services/attendanceService';
import { updateMultipleSettings } from '../../services/notificationService';
import * as XLSX from 'xlsx';
import { getStoredUser } from '../../services/authService';
import { formatNumber } from '../../utils/analyticsUtils';
import { formatDateArabic } from '../../utils/dateUtils';
import Card from '../../components/common/Card';
import StatCard from '../../components/widgets/StatCard';
import AttendanceNavBar from '../../components/attendance/AttendanceNavBar';
import AttendanceTimeline from '../../components/attendance/AttendanceTimeline';
import { BarChart, PieChart } from '../../components/charts';

const ATTENDANCE_STATUS_MAP = {
  present: { label: 'حاضر', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' },
  absent: { label: 'غائب', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
  late: { label: 'متأخر', color: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-500' },
  half_day: { label: 'نصف يوم', color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  on_leave: { label: 'في إجازة', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' }
};

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';

const AttendanceDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [activePeriod, setActivePeriod] = useState('today');

  const currentUser = getStoredUser();
  const userRole = currentUser?.role || 'employee';

  const [pullingFingerprints, setPullingFingerprints] = useState(false);
  const [fingerprintResult, setFingerprintResult] = useState(null);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [pullStartDate, setPullStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [pullEndDate, setPullEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [pullingRecords, setPullingRecords] = useState(false);
  const [pullProgress, setPullProgress] = useState('');

  const [settings, setSettings] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getAttendanceDashboard();
      if (res.success) {
        setData(res.data);
        if (res.data.settings) {
          setSettings(res.data.settings);
          setSettingsForm(res.data.settings);
        }
      } else {
        setError(res.message || 'فشل تحميل البيانات');
      }
    } catch (err) {
      setError(err.userMessage || 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenPullModal = () => {
    setShowDateModal(true);
  };

  const handlePullToExcel = async () => {
    if (!pullStartDate || !pullEndDate) return;
    try {
      setPullingRecords(true);
      setSyncStatus(null);
      setError('');

      setPullProgress('جاري سحب حركات الحضور من جهاز البصمة مباشرة...');
      const res = await pullDeviceAttendance(pullStartDate, pullEndDate);

      if (!res.success) {
        setError(res.message || 'فشل سحب البيانات من الجهاز');
        return;
      }

      const records = res.data?.records || [];
      if (records.length === 0) {
        setError('لا توجد سجلات حضور في النطاق المحدد على الجهاز');
        return;
      }

      setPullProgress(`تم سحب ${records.length} سجل، جاري إنشاء ملف Excel...`);

      const safeFmtTime = (val) => {
        if (!val) return '-';
        try {
          const d = new Date(val);
          if (isNaN(d.getTime())) return val;
          return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        } catch { return val; }
      };
      const safeFmtDate = (val) => {
        if (!val) return '-';
        try {
          const d = new Date(val + 'T00:00:00');
          if (isNaN(d.getTime())) return val;
          return d.toLocaleDateString('ar-SA');
        } catch { return val; }
      };

      const excelData = [];
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        try {
          excelData.push({
            '#': i + 1,
            'معرف الموظف': (r.employeeId && r.employeeId !== '-') ? r.employeeId : r.zkUserId || '-',
            'الموظف': r.employeeName || 'غير معروف',
            'القسم': r.department || '-',
            'معرف الجهاز': r.deviceUserId || r.zkUserId || '-',
            'معرف البصمة': r.fingerprintUid || '-',
            'عدد البصمات': String(r.fingerprintCount || '?'),
            'التاريخ': safeFmtDate(r.date),
            'وقت الحضور': safeFmtTime(r.checkInTime),
            'وقت الانصراف': safeFmtTime(r.checkOutTime),
            'عدد المسحات': String(r.totalScans ?? 1),
            'الجهاز': r.deviceName || '-'
          });
        } catch (rowErr) {
          excelData.push({ '#': i + 1, 'الموظف': `خطأ: ${rowErr.message}` });
        }
      }

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'حركات الحضور من الجهاز');

      ws['!cols'] = [
        { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
        { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }
      ];

      const fileName = `حركات_الحضور_من_الجهاز_${pullStartDate}_إلى_${pullEndDate}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setSyncStatus({
        success: true,
        message: `تم سحب ${records.length} سجل حضور مباشرة من الجهاز إلى ملف Excel`
      });
      setShowDateModal(false);
    } catch (err) {
      setError(err.userMessage || err.message || 'فشل سحب حركات الحضور من الجهاز');
    } finally {
      setPullingRecords(false);
      setPullProgress('');
    }
  };

  const handleTestConnection = async () => {
    try {
      const res = await testZKTecoConnection();
      setDeviceStatus(res);
    } catch (err) {
      setDeviceStatus({ success: false, message: err.userMessage || 'فشل اختبار الاتصال' });
    }
  };

  const handlePullFingerprints = async () => {
    try {
      setPullingFingerprints(true);
      setFingerprintResult(null);
      const res = await getDeviceUsersFromDevice();
      setFingerprintResult(res);
      if (res.success) {
        setShowFingerprintModal(true);
      }
    } catch (err) {
      setFingerprintResult({ success: false, message: err.userMessage || 'فشل سحب البصمات من الجهاز' });
      setShowFingerprintModal(true);
    } finally {
      setPullingFingerprints(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      setSettingsMsg('');
      const res = await updateMultipleSettings(settingsForm);
      if (res.success) {
        setSettings({ ...settingsForm });
        setSettingsMsg('تم حفظ إعدادات الدوام بنجاح');
        setTimeout(() => setSettingsMsg(''), 3000);
      } else {
        setSettingsMsg(res.message || 'فشل حفظ الإعدادات');
      }
    } catch (err) {
      setSettingsMsg(err.userMessage || 'حدث خطأ في حفظ الإعدادات');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettingsForm(prev => ({ ...prev, [key]: value }));
  };

  const currentStats = useMemo(() => {
    if (!data) return null;
    if (activePeriod === 'today') return data.today;
    if (activePeriod === 'weekly') return data.weekly;
    return data.monthly;
  }, [data, activePeriod]);

  const pieChartData = useMemo(() => {
    if (!currentStats) return null;
    return {
      labels: ['حاضر', 'غائب', 'متأخر', 'نصف يوم', 'في إجازة'],
      data: [
        currentStats.present,
        currentStats.absent,
        currentStats.late,
        currentStats.halfDay,
        currentStats.onLeave
      ]
    };
  }, [currentStats]);

  const barChartData = useMemo(() => {
    if (!data) return null;
    const periods = [
      { label: 'اليوم', ...data.today },
      { label: 'الأسبوع', ...data.weekly },
      { label: 'الشهر', ...data.monthly }
    ];
    return {
      labels: periods.map(p => p.label),
      datasets: [
        { label: 'حاضر', data: periods.map(p => p.present), backgroundColor: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgba(75, 192, 192, 1)' },
        { label: 'غائب', data: periods.map(p => p.absent), backgroundColor: 'rgba(255, 99, 132, 0.6)', borderColor: 'rgba(255, 99, 132, 1)' },
        { label: 'متأخر', data: periods.map(p => p.late), backgroundColor: 'rgba(255, 206, 86, 0.6)', borderColor: 'rgba(255, 206, 86, 1)' }
      ]
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">جاري تحميل لوحة إحصائيات الحضور...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-full" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
            <FaChartBar className="text-primary" />
            لوحة إحصائيات الحضور
          </h1>
          <p className="text-sm text-gray-500 mt-1">نظرة شاملة على حضور وانصراف الموظفين</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleTestConnection}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <FaPlug className="w-3.5 h-3.5 text-gray-500" />
            اختبار جهاز البصمة
          </button>
          <button
            onClick={handleOpenPullModal}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <FaSync className="w-3.5 h-3.5" />
            سحب حركات الحضور والانصراف
          </button>
          <button
            onClick={handlePullFingerprints}
            disabled={pullingFingerprints}
            className="px-4 py-2 bg-secondary text-white rounded-lg text-sm font-medium hover:bg-secondary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <FaFingerprint className={`w-3.5 h-3.5 ${pullingFingerprints ? 'animate-pulse' : ''}`} />
            {pullingFingerprints ? 'جاري السحب...' : 'سحب بصمات المستخدمين'}
          </button>
        </div>
      </div>

      <AttendanceNavBar userRole={userRole} />

      <Card className="mb-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between p-3 text-right"
        >
          <div className="flex items-center gap-2">
            <FaCog className="text-primary" />
            <span className="font-bold text-dark">إعدادات الدوام</span>
          </div>
          <span className={`text-gray-400 transition-transform ${showSettings ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {showSettings && settingsForm && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">وقت بدء الدوام</label>
              <div className="flex gap-2">
                <select value={settingsForm.workStartHour ?? 9} onChange={e => handleSettingChange('workStartHour', Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                </select>
                <span className="text-gray-400 self-center">:</span>
                <select value={settingsForm.workStartMinute ?? 0} onChange={e => handleSettingChange('workStartMinute', Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {[0, 15, 30, 45].map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">وقت نهاية الدوام</label>
              <div className="flex gap-2">
                <select value={settingsForm.workEndHour ?? 17} onChange={e => handleSettingChange('workEndHour', Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                </select>
                <span className="text-gray-400 self-center">:</span>
                <select value={settingsForm.workEndMinute ?? 0} onChange={e => handleSettingChange('workEndMinute', Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {[0, 15, 30, 45].map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">عدد ساعات العمل اليومية</label>
              <input type="number" value={settingsForm.dailyWorkHours ?? 8} onChange={e => handleSettingChange('dailyWorkHours', Number(e.target.value))} min={1} max={24} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">فترة سماح التأخير (دقائق)</label>
              <input type="number" value={settingsForm.lateGracePeriodMinutes ?? 0} onChange={e => handleSettingChange('lateGracePeriodMinutes', Number(e.target.value))} min={0} max={180} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">فترة سماح الخروج المبكر (دقائق)</label>
              <input type="number" value={settingsForm.earlyLeaveGracePeriodMinutes ?? 0} onChange={e => handleSettingChange('earlyLeaveGracePeriodMinutes', Number(e.target.value))} min={0} max={180} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">حد التأخير الكبير (دقائق)</label>
              <input type="number" value={settingsForm.veryLateThresholdMinutes ?? 120} onChange={e => handleSettingChange('veryLateThresholdMinutes', Number(e.target.value))} min={1} max={480} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <FaSave className={`w-3.5 h-3.5 ${savingSettings ? 'animate-spin' : ''}`} />
                {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </button>
              {settingsMsg && (
                <span className={`text-sm ${settingsMsg.includes('بنحاح') ? 'text-green-600' : 'text-red-600'}`}>
                  {settingsMsg}
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {deviceStatus && (
        <div className={`mb-4 p-4 rounded-xl border text-sm flex items-center gap-3 ${
          deviceStatus.success
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <FaInfoCircle className="w-4 h-4 shrink-0" />
          <span>{deviceStatus.message}</span>
          {deviceStatus.data?.deviceInfo && (
            <span className="text-xs opacity-75 mr-auto">
              الجهاز: {deviceStatus.data.deviceInfo.deviceName || deviceStatus.data.deviceIp || ''}
            </span>
          )}
        </div>
      )}

      {syncStatus && (
        <div className={`mb-4 p-4 rounded-xl border text-sm flex items-center gap-3 ${
          syncStatus.success
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-yellow-50 border-yellow-200 text-yellow-700'
        }`}>
          <FaInfoCircle className="w-4 h-4 shrink-0" />
          <span>{syncStatus.message || `تمت المزامنة: ${syncStatus.data?.synced || 0} سجل جديد`}</span>
        </div>
      )}

      {showDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowDateModal(false)} className="absolute top-3 left-3 text-gray-400 hover:text-gray-600">
              <FaTimes />
            </button>
            <h3 className="text-lg font-bold mb-4">سحب حركات الحضور من الجهاز</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">تاريخ البداية</label>
                <input type="date" value={pullStartDate} onChange={e => setPullStartDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">تاريخ النهاية</label>
                <input type="date" value={pullEndDate} onChange={e => setPullEndDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              {pullProgress && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <FaSync className="animate-spin" />
                  <span>{pullProgress}</span>
                </div>
              )}
              <button
                onClick={handlePullToExcel}
                disabled={pullingRecords}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <FaSync className={`w-4 h-4 ${pullingRecords ? 'animate-spin' : ''}`} />
                {pullingRecords ? 'جاري السحب...' : 'سحب إلى Excel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFingerprintModal && fingerprintResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[80vh] overflow-y-auto">
            <button onClick={() => setShowFingerprintModal(false)} className="absolute top-3 left-3 text-gray-400 hover:text-gray-600">
              <FaTimes />
            </button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FaFingerprint className="text-secondary" />
              بصمات المستخدمين من الجهاز
            </h3>
            {fingerprintResult.success ? (
              <>
                <p className="text-sm text-green-600 mb-4 flex items-center gap-2">
                  <FaCheck className="w-4 h-4" />
                  تم سحب {fingerprintResult.data?.users?.length || 0} مستخدم بنجاح
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-right p-2 font-bold">#</th>
                        <th className="text-right p-2 font-bold">معرف الجهاز</th>
                        <th className="text-right p-2 font-bold">الاسم</th>
                        <th className="text-center p-2 font-bold">عدد البصمات</th>
                        <th className="text-center p-2 font-bold">المعرف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(fingerprintResult.data?.users || []).map((u, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-2 text-gray-500">{i + 1}</td>
                          <td className="p-2 font-medium">{u.deviceUserId ?? u.userId ?? '-'}</td>
                          <td className="p-2">{u.name || 'غير معروف'}</td>
                          <td className="p-2 text-center">
                            <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-xs font-bold">
                              {u.fingerprintCount ?? u.fingerprints ?? 0}
                            </span>
                          </td>
                          <td className="p-2 text-center text-xs text-gray-400">{u.uid ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg text-red-700 text-sm">
                <FaExclamationTriangle className="w-5 h-5 shrink-0" />
                <span>{fingerprintResult.message || 'فشل سحب البصمات من الجهاز'}</span>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowFingerprintModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-xl border bg-red-50 border-red-200 text-red-700 text-sm flex items-center gap-3">
          <FaInfoCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          <div className="flex items-center gap-2 mb-4">
            {[
              { id: 'today', label: 'اليوم', icon: FaCalendarDay },
              { id: 'weekly', label: 'الأسبوع', icon: FaCalendarWeek },
              { id: 'monthly', label: 'الشهر', icon: FaCalendarAlt }
            ].map(period => (
              <button
                key={period.id}
                onClick={() => setActivePeriod(period.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  activePeriod === period.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <period.icon className="w-3.5 h-3.5" />
                {period.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <StatCard title="إجمالي السجلات" value={formatNumber(currentStats?.total || 0)} icon="📋" color="blue" />
            <StatCard title="حاضر" value={formatNumber(currentStats?.present || 0)} icon="✅" color="green" />
            <StatCard title="غائب" value={formatNumber(currentStats?.absent || 0)} icon="❌" color="red" />
            <StatCard title="متأخر" value={formatNumber(currentStats?.late || 0)} icon="⏳" color="orange" />
            <StatCard title="نسبة الحضور" value={`${currentStats?.attendanceRate || 0}%`} icon="📊" color="purple" />
            <StatCard title="مسجل حضور" value={formatNumber(currentStats?.checkedIn || 0)} icon="🕐" color="yellow" />
            <StatCard title="مكتمل" value={formatNumber(currentStats?.completed || 0)} icon="✅" color="teal" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                <FaChartBar className="text-primary" />
                مقارنة فترات الحضور
              </h3>
              {barChartData && (
                <BarChart data={barChartData} options={{
                  plugins: {
                    legend: { position: 'bottom', rtl: true },
                  },
                  responsive: true
                }} />
              )}
            </Card>

            <Card>
              <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                <FaChartPie className="text-primary" />
                توزيع الحالات
              </h3>
              {pieChartData && currentStats?.total > 0 && (
                <PieChart
                  data={pieChartData}
                  options={{ plugins: { legend: { position: 'bottom', rtl: true } } }}
                  width={300}
                  height={300}
                />
              )}
              {currentStats?.total === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <FaInfoCircle className="w-10 h-10 mb-2" />
                  <p className="text-sm">لا توجد بيانات</p>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            <div className="lg:col-span-3">
              {data.todayRecords && data.todayRecords.length > 0 && (
                <Card>
                  <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                    <FaClock className="text-primary" />
                    سجل الحضور اليومي
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-right p-3 font-bold text-dark text-xs">الموظف</th>
                          <th className="text-right p-3 font-bold text-dark text-xs">القسم</th>
                          <th className="text-center p-3 font-bold text-dark text-xs">الحضور</th>
                          <th className="text-center p-3 font-bold text-dark text-xs">الانصراف</th>
                          <th className="text-center p-3 font-bold text-dark text-xs">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.todayRecords.map((r) => {
                          const statusInfo = ATTENDANCE_STATUS_MAP[r.status] || { label: r.status, color: 'text-gray-600', dot: 'bg-gray-500' };
                          return (
                            <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                    {((r.employee?.name || r.deviceUserName) || '?').charAt(0)}
                                  </div>
                                  <span className="font-medium text-dark">{r.employee?.name || r.deviceUserName || '-'}</span>
                                </div>
                              </td>
                              <td className="p-3 text-gray-500">{r.employee?.department || r.department || '-'}</td>
                              <td className="p-3 text-center">
                                {r.checkIn?.time ? (
                                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                                    <FaSignInAlt className="inline w-3 h-3 ml-1" />
                                    {formatTime(r.checkIn.time)}
                                  </span>
                                ) : <span className="text-xs text-gray-400">--:--</span>}
                              </td>
                              <td className="p-3 text-center">
                                {r.checkOut?.time ? (
                                  <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-lg">
                                    <FaSignOutAlt className="inline w-3 h-3 ml-1" />
                                    {formatTime(r.checkOut.time)}
                                  </span>
                                ) : r.checkIn?.time ? (
                                  <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg">لم يسجل</span>
                                ) : <span className="text-xs text-gray-400">--:--</span>}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                  {statusInfo.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
            <div className="lg:col-span-2">
              <Card>
                <AttendanceTimeline />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceDashboard;
