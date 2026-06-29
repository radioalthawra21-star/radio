import { useState, useEffect, useCallback } from 'react';
import {
  FaFingerprint, FaPlug, FaSync, FaExclamationTriangle, FaInfoCircle,
  FaCheckCircle, FaTimesCircle, FaClock, FaCalendarAlt, FaSearch,
  FaSave, FaTimes, FaChartBar, FaUserCheck,
  FaUserTimes, FaFileExcel, FaEye, FaCheck, FaHistory, FaList,
  FaCog, FaArrowLeft, FaArrowRight, FaTools
} from 'react-icons/fa';
import {
  getBiometricDashboardStats, getDeviceStatusMonitor, getRecentBiometricActivity,
  pullDeviceAttendance, syncZKTecoDevice, testZKTecoConnection,
  getErrorLogs, resolveErrorLog,
  getMappedUsersActivity, cleanSyncDevice
} from '../../services/attendanceService';
import AttendanceNavBar from '../../components/attendance/AttendanceNavBar';
import { getStoredUser } from '../../services/authService';
import * as XLSX from 'xlsx';

const TABS = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: FaChartBar },
  { id: 'sync', label: 'مزامنة البيانات', icon: FaSync },
  { id: 'biometric_activity', label: 'نشاط البصمة', icon: FaUserCheck },
  { id: 'errors', label: 'سجل الأخطاء', icon: FaExclamationTriangle },
  { id: 'activity', label: 'النشاط الحديث', icon: FaHistory }
];

const safeTime = (iso) => {
  if (!iso) return '--:--';
  try {
    return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch { return '--:--'; }
};

const safeDate = (iso) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('ar-SA');
  } catch { return '-'; }
};

const safeDateTime = (iso) => {
  if (!iso) return '-';
  try {
    return `${safeDate(iso)} ${safeTime(iso)}`;
  } catch { return '-'; }
};

const BiometricManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentUser = getStoredUser();
  const userRole = currentUser?.role || 'employee';

  const [dashboardStats, setDashboardStats] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [errorLogPagination, setErrorLogPagination] = useState(null);
  const [pullRecords, setPullRecords] = useState([]);
  const [pullCount, setPullCount] = useState(0);

  const [syncStartDate, setSyncStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [syncEndDate, setSyncEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [syncStartTime, setSyncStartTime] = useState('00:00');
  const [syncEndTime, setSyncEndTime] = useState('23:59');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  const [errorFilterResolved, setErrorFilterResolved] = useState('');
  const [errorFilterType, setErrorFilterType] = useState('');
  const [errorPage, setErrorPage] = useState(1);

  const [mappedActivity, setMappedActivity] = useState([]);
  const [mappedActivityLoading, setMappedActivityLoading] = useState(false);
  const [activityDays, setActivityDays] = useState(7);
  const [expandedUser, setExpandedUser] = useState(null);

  const showError = (msg) => { setError(msg); setTimeout(() => setError(''), 5000); };
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); };

  const loadDashboardStats = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, dashboard: true }));
      const res = await getBiometricDashboardStats();
      if (res.success) setDashboardStats(res.data);
    } catch (err) {
      showError(err.userMessage || 'فشل تحميل إحصائيات لوحة التحكم');
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
  }, []);

  const loadDeviceStatus = useCallback(async () => {
    try {
      const res = await getDeviceStatusMonitor();
      if (res.success) setDeviceStatus(res.data);
    } catch { }
  }, []);

  const loadRecentActivity = useCallback(async () => {
    try {
      const res = await getRecentBiometricActivity();
      if (res.success) setRecentActivity(res.data || []);
    } catch { }
  }, []);

  const loadErrorLogs = useCallback(async (page = 1) => {
    try {
      setLoading(prev => ({ ...prev, errors: true }));
      const params = { page, limit: 15 };
      if (errorFilterResolved !== '') params.resolved = errorFilterResolved;
      if (errorFilterType) params.errorType = errorFilterType;
      const res = await getErrorLogs(params);
      if (res.success) {
        setErrorLogs(res.data || []);
        setErrorLogPagination(res.pagination);
        setErrorPage(page);
      }
    } catch { } finally {
      setLoading(prev => ({ ...prev, errors: false }));
    }
  }, [errorFilterResolved, errorFilterType]);

  const loadMappedActivity = useCallback(async () => {
    try {
      setMappedActivityLoading(true);
      const res = await getMappedUsersActivity(activityDays);
      if (res.success) setMappedActivity(res.data?.users || []);
    } catch { } finally {
      setMappedActivityLoading(false);
    }
  }, [activityDays]);

  useEffect(() => { loadDashboardStats(); }, [loadDashboardStats]);
  useEffect(() => { loadRecentActivity(); }, [loadRecentActivity]);
  useEffect(() => {
    if (activeTab === 'errors') loadErrorLogs(1);
  }, [activeTab, errorFilterResolved, errorFilterType, loadErrorLogs]);
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDeviceStatus();
    }
  }, [activeTab, loadDeviceStatus]);
  useEffect(() => {
    if (activeTab === 'biometric_activity') {
      loadMappedActivity();
    }
  }, [activeTab, loadMappedActivity]);

  const handleTestConnection = async () => {
    try {
      setLoading(prev => ({ ...prev, test: true }));
      const res = await testZKTecoConnection();
      setDeviceStatus(res.success
        ? { online: true, message: res.message, deviceInfo: res.data?.deviceInfo, lastSync: res.data?.timestamp }
        : { online: false, message: res.message });
      showSuccess(res.success ? 'تم الاتصال بالجهاز بنجاح' : res.message);
      loadDashboardStats();
    } catch (err) {
      showError(err.userMessage || 'فشل اختبار الاتصال');
    } finally {
      setLoading(prev => ({ ...prev, test: false }));
    }
  };

  const handlePullAttendance = async () => {
    if (!syncStartDate || !syncEndDate) return;
    try {
      setSyncing(true);
      setSyncProgress('جاري سحب حركات الحضور من الجهاز...');
      const startDateTime = `${syncStartDate}T${syncStartTime}:00`;
      const endDateTime = `${syncEndDate}T${syncEndTime}:00`;
      const res = await pullDeviceAttendance(startDateTime, endDateTime);
      if (!res.success) { showError(res.message || 'فشل سحب البيانات'); return; }
      const records = res.data?.records || [];
      setPullRecords(records);
      setPullCount(records.length);
      if (records.length === 0) {
        showError('لا توجد سجلات في النطاق المحدد');
        setSyncProgress('');
        setSyncing(false);
        return;
      }
      setSyncProgress(`تم سحب ${records.length} سجل بنجاح`);
      showSuccess(`تم سحب ${records.length} سجل حضور من الجهاز`);
      const mappedToActivity = records.map(r => ({
        id: r.zkUserId + '_' + r.date,
        employeeName: r.employeeName || 'غير معروف',
        employeeDepartment: r.department || '-',
        date: r.date,
        checkIn: r.checkInTime || null,
        checkOut: r.checkOutTime || null,
        status: 'present',
        isMapped: !!r.employeeId && r.employeeId !== '-',
        deviceUserId: r.deviceUserId || r.zkUserId || null
      }));
      setRecentActivity(prev => {
        const existing = new Set(prev.map(a => a.id));
        const newOnes = mappedToActivity.filter(a => !existing.has(a.id));
        return [...newOnes, ...prev].slice(0, 200);
      });
    } catch (err) {
      showError(err.userMessage || 'فشل سحب حركات الحضور');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncProgress(''), 3000);
    }
  };

  const handleSyncToDB = async () => {
    try {
      setSyncing(true);
      setSyncProgress('جاري مزامنة البيانات مع قاعدة البيانات...');
      const res = await syncZKTecoDevice();
      if (res.success) {
        showSuccess(res.message || 'تمت المزامنة بنجاح');
        loadDashboardStats();
        loadRecentActivity();
      } else {
        showError(res.message || 'فشلت المزامنة');
      }
    } catch (err) {
      showError(err.userMessage || 'فشلت المزامنة');
    } finally {
      setSyncing(false);
      setSyncProgress('');
    }
  };

  const [cleanSyncing, setCleanSyncing] = useState(false);
  const handleCleanSync = async () => {
    if (!window.confirm('سيتم حذف جميع سجلات الحضور السابقة وإعادة مزامنتها من الجهاز. هل أنت متأكد؟')) return;
    try {
      setCleanSyncing(true);
      setSyncProgress('جاري الحذف وإعادة المزامنة...');
      const res = await cleanSyncDevice();
      if (res.success) {
        showSuccess(res.message || 'تمت المزامنة الكاملة بنجاح');
        loadDashboardStats();
        loadRecentActivity();
      } else {
        showError(res.message || 'فشلت المزامنة الكاملة');
      }
    } catch (err) {
      showError(err.userMessage || 'فشلت المزامنة الكاملة');
    } finally {
      setCleanSyncing(false);
      setSyncProgress('');
    }
  };

  const handleExportToExcel = () => {
    if (!pullRecords.length) { showError('لا توجد بيانات للتصدير'); return; }
    const safeFmtTime = (val) => { if (!val) return '-'; try { const d = new Date(val); return isNaN(d.getTime()) ? val : d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }); } catch { return val; } };
    const safeFmtDate = (val) => { if (!val) return '-'; try { const d = new Date(val); return isNaN(d.getTime()) ? val : d.toLocaleDateString('ar-SA'); } catch { return val; } };
    const excelData = pullRecords.map((r, i) => ({
      '#': i + 1,
      'معرف الموظف': (r.employeeId && r.employeeId !== '-') ? r.employeeId : r.zkUserId || '-',
      'الموظف': r.employeeName || 'غير معروف',
      'القسم': r.department || '-',
      'معرف الجهاز': r.deviceUserId || r.zkUserId || '-',
      'التاريخ': safeFmtDate(r.date),
      'وقت الحضور': safeFmtTime(r.checkInTime),
      'وقت الانصراف': safeFmtTime(r.checkOutTime),
      'عدد المسحات': String(r.totalScans ?? 1)
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'حركات الحضور');
    ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    XLSX.writeFile(wb, `حركات_الحضور_${syncStartDate}_إلى_${syncEndDate}.xlsx`);
    showSuccess('تم تصدير الملف بنجاح');
  };

  const handleResolveError = async (id) => {
    try {
      const res = await resolveErrorLog(id, 'تم حل المشكلة');
      if (res.success) {
        showSuccess('تم حل الخطأ');
        loadErrorLogs(errorPage);
      }
    } catch (err) {
      showError(err.userMessage || 'فشل حل الخطأ');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      present: 'bg-green-100 text-green-700',
      absent: 'bg-red-100 text-red-700',
      late: 'bg-yellow-100 text-yellow-700',
      half_day: 'bg-orange-100 text-orange-700',
      on_leave: 'bg-blue-100 text-blue-700'
    };
    const labels = {
      present: 'حاضر', absent: 'غائب', late: 'متأخر', half_day: 'نصف يوم', on_leave: 'إجازة'
    };
    return { cls: map[status] || 'bg-gray-100 text-gray-600', label: labels[status] || status };
  };

  return (
    <div className="p-4 md:p-6 max-w-full" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
            <FaFingerprint className="text-secondary" />
            إدارة جهاز البصمة
          </h1>
          <p className="text-sm text-gray-500 mt-1">ربط ومزامنة وإدارة جهاز ZKTeco للبصمة</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleTestConnection}
            disabled={loading.test}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <FaPlug className={`w-3.5 h-3.5 ${loading.test ? 'animate-spin' : ''} text-gray-500`} />
            {loading.test ? 'جاري الاختبار...' : 'اختبار الاتصال'}
          </button>
          <button
            onClick={() => { loadDeviceStatus(); loadDashboardStats(); }}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <FaSync className="w-3.5 h-3.5" />
            تحديث
          </button>
        </div>
      </div>

      <AttendanceNavBar userRole={userRole} />

      {error && (
        <div className="mb-4 p-4 rounded-xl border bg-red-50 border-red-200 text-red-700 text-sm flex items-center gap-3">
          <FaExclamationTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 rounded-xl border bg-green-50 border-green-200 text-green-700 text-sm flex items-center gap-3">
          <FaCheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-secondary text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">حالة الجهاز</span>
                {deviceStatus ? (
                  deviceStatus.online
                    ? <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    : <span className="w-3 h-3 rounded-full bg-red-500" />
                ) : <div className="w-3 h-3 rounded-full bg-gray-300" />}
              </div>
              <p className={`text-lg font-bold ${deviceStatus?.online ? 'text-green-600' : 'text-red-600'}`}>
                {deviceStatus ? (deviceStatus.online ? 'متصل' : 'غير متصل') : 'جاري التحقق...'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {deviceStatus?.lastSync ? `آخر مزامنة: ${safeDateTime(deviceStatus.lastSync)}` : ''}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">سجلات اليوم</span>
                <FaClock className="text-primary w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-dark">{dashboardStats?.todayAttendance || 0}</p>
              <p className="text-xs text-gray-400 mt-1">تسجيل دخول وخروج اليوم</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">مستخدمي الجهاز</span>
                <FaFingerprint className="text-secondary w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-dark">
                {dashboardStats?.deviceUsersCount ?? '-'}
              </p>
              <p className="text-xs text-gray-400 mt-1">مسجلين على جهاز البصمة</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">المرتبطبن بالنظام</span>
                <FaUserCheck className="text-green-500 w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-dark">
                {dashboardStats?.mappedUsers || 0}
                <span className="text-sm text-gray-400 mr-1">/ {dashboardStats?.totalUsers || 0}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {dashboardStats?.mappingRate || 0}% نسبة الربط
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">الأخطاء</span>
                <FaExclamationTriangle className={`w-4 h-4 ${(dashboardStats?.unresolvedErrors || 0) > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
              <p className="text-lg font-bold text-dark">
                {dashboardStats?.unresolvedErrors || 0}
                <span className="text-sm text-gray-400 mr-1">/ {dashboardStats?.totalErrors || 0}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">غير محلولة / إجمالي</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-base font-bold text-dark mb-4 flex items-center gap-2">
              <FaTools className="text-secondary" />
              معلومات الجهاز
            </h3>
            {deviceStatus ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400 block">عنوان IP</span>
                  <span className="font-medium">{deviceStatus.config?.ip || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">المنفذ</span>
                  <span className="font-medium">{deviceStatus.config?.port || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">اسم الجهاز</span>
                  <span className="font-medium">{deviceStatus.deviceInfo?.deviceName || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">آخر خطأ</span>
                  <span className="font-medium text-red-600">{deviceStatus.lastError || 'لا يوجد'}</span>
                </div>
                {deviceStatus.statusHistory?.length > 0 && (
                  <div className="col-span-full mt-2">
                    <span className="text-gray-400 block text-xs mb-1">سجل الحالة (آخر 10)</span>
                    <div className="flex flex-wrap gap-2">
                      {deviceStatus.statusHistory.map((h, i) => (
                        <span key={i} className={`text-xs px-2 py-1 rounded-md ${
                          h.status === 'connected' ? 'bg-green-50 text-green-700' :
                          h.status === 'disconnected' ? 'bg-gray-100 text-gray-500' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {h.status === 'connected' ? '✓ متصل' : h.status === 'disconnected' ? '✗ منفصل' : '⚠ ' + h.message}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">اضغط على "اختبار الاتصال" لعرض معلومات الجهاز</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sync' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-base font-bold text-dark mb-4 flex items-center gap-2">
              <FaCalendarAlt className="text-primary" />
              نطاق التاريخ والوقت
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">تاريخ البداية</label>
                <input type="date" value={syncStartDate} onChange={e => setSyncStartDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">تاريخ النهاية</label>
                <input type="date" value={syncEndDate} onChange={e => setSyncEndDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">وقت البداية</label>
                <input type="time" value={syncStartTime} onChange={e => setSyncStartTime(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">وقت النهاية</label>
                <input type="time" value={syncEndTime} onChange={e => setSyncEndTime(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handlePullAttendance}
                disabled={syncing}
                className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <FaSync className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'جاري السحب...' : 'سحب حركات الحضور'}
              </button>
              <button
                onClick={handleCleanSync}
                disabled={syncing || cleanSyncing}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <FaSync className={`w-4 h-4 ${cleanSyncing ? 'animate-spin' : ''}`} />
                {cleanSyncing ? 'جاري التنظيف...' : '🔄 مزامنة كاملة + حذف البيانات القديمة'}
              </button>
              <button
                onClick={handleSyncToDB}
                disabled={syncing || cleanSyncing}
                className="px-5 py-2.5 bg-secondary text-white rounded-lg text-sm font-medium hover:bg-secondary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <FaSave className="w-4 h-4" />
                مزامنة مع قاعدة البيانات
              </button>
              <button
                onClick={handleExportToExcel}
                disabled={!pullRecords.length}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <FaFileExcel className="w-4 h-4" />
                تصدير إلى Excel
              </button>
            </div>
            {syncProgress && (
              <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                <FaSync className="animate-spin" />
                <span>{syncProgress}</span>
              </div>
            )}
            {pullCount > 0 && (
              <p className="mt-3 text-sm text-green-600">✓ تم سحب {pullCount} سجل من الجهاز</p>
            )}
          </div>

          {pullRecords.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-dark flex items-center gap-2">
                  <FaList className="text-primary" />
                  نتائج السحب ({pullRecords.length})
                </h3>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm table-responsive-cards">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="border-b border-gray-200">
                      <th className="text-right p-3 font-bold text-dark text-xs">#</th>
                      <th className="text-right p-3 font-bold text-dark text-xs">الموظف</th>
                      <th className="text-right p-3 font-bold text-dark text-xs">القسم</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">التاريخ</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">الحضور</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">الانصراف</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">المسحات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pullRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-500" data-label="#">{i + 1}</td>
                        <td className="p-3 font-medium" data-label="الموظف">{r.employeeName || 'غير معروف'}</td>
                        <td className="p-3 text-gray-500" data-label="القسم">{r.department || '-'}</td>
                        <td className="p-3 text-center" data-label="التاريخ">{safeDate(r.date)}</td>
                        <td className="p-3 text-center" data-label="الحضور">
                          <span className="text-green-700 bg-green-50 px-2 py-1 rounded-lg text-xs">{safeTime(r.checkInTime)}</span>
                        </td>
                        <td className="p-3 text-center" data-label="الانصراف">
                          {r.checkOutTime
                            ? <span className="text-red-700 bg-red-50 px-2 py-1 rounded-lg text-xs">{safeTime(r.checkOutTime)}</span>
                            : <span className="text-gray-400 text-xs">لم يسجل</span>}
                        </td>
                        <td className="p-3 text-center" data-label="المسحات">
                          <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-xs font-bold">{r.totalScans}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'biometric_activity' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-base font-bold text-dark flex items-center gap-2">
                <FaUserCheck className="text-secondary" />
                نشاط البصمة للمستخدمين المرتبطين
              </h3>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">آخر</label>
                <select value={activityDays} onChange={e => setActivityDays(Number(e.target.value))}
                  className="border rounded-lg px-3 py-1.5 text-sm">
                  <option value={1}>يوم</option>
                  <option value={3}>3 أيام</option>
                  <option value={7}>7 أيام</option>
                  <option value={14}>14 يوم</option>
                  <option value={30}>30 يوم</option>
                </select>
                <button onClick={loadMappedActivity}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 flex items-center gap-1">
                  <FaSync className="w-3 h-3" /> عرض
                </button>
              </div>
            </div>

            {mappedActivityLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : mappedActivity.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">لا يوجد مستخدمين مرتبطين بنظام البصمة</p>
            ) : (
              <div className="space-y-3">
                {mappedActivity.map(user => (
                  <div key={user._id} className="border border-gray-100 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-sm font-bold">
                          {(user.name || '?').charAt(0)}
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-sm block">{user.name}</span>
                          <span className="text-xs text-gray-400">{user.department || '-'} · معرف الجهاز: {user.zkUserId}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          user.totalRecords > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {user.totalRecords} سجل
                        </span>
                        <FaArrowLeft className={`w-3 h-3 text-gray-400 transition-transform ${expandedUser === user._id ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {expandedUser === user._id && (
                      <div className="border-t border-gray-100">
                        {user.attendance.length === 0 ? (
                          <p className="text-sm text-gray-400 py-4 text-center">لا توجد سجلات حضور لهذا المستخدم</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm table-responsive-cards">
                              <thead className="bg-gray-50">
                                <tr className="border-b border-gray-200">
                                  <th className="text-right p-3 font-bold text-dark text-xs">التاريخ</th>
                                  <th className="text-center p-3 font-bold text-dark text-xs">الحضور</th>
                                  <th className="text-center p-3 font-bold text-dark text-xs">الانصراف</th>
                                  <th className="text-center p-3 font-bold text-dark text-xs">الحالة</th>
                                  <th className="text-center p-3 font-bold text-dark text-xs">عدد الساعات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {user.attendance.map(rec => (
                                  <tr key={rec.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-700" data-label="التاريخ">{safeDate(rec.date)}</td>
                                    <td className="p-3 text-center" data-label="الحضور">
                                      <span className="text-green-700 bg-green-50 px-2 py-1 rounded-lg text-xs">
                                        {safeTime(rec.checkIn)}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center" data-label="الانصراف">
                                      {rec.checkOut ? (
                                        <span className="text-red-700 bg-red-50 px-2 py-1 rounded-lg text-xs">
                                          {safeTime(rec.checkOut)}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 text-xs">لم يسجل</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center" data-label="الحالة">
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        rec.status === 'present' ? 'bg-green-50 text-green-700' :
                                        rec.status === 'late' ? 'bg-yellow-50 text-yellow-700' :
                                        rec.status === 'absent' ? 'bg-red-50 text-red-700' :
                                        'bg-gray-100 text-gray-500'
                                      }`}>
                                        {rec.status === 'present' ? 'حاضر' :
                                         rec.status === 'late' ? 'متأخر' :
                                         rec.status === 'absent' ? 'غائب' : rec.status}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center text-gray-600" data-label="عدد الساعات">
                                      {rec.duration ? `${rec.duration.toFixed(1)} س` : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'errors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">تصفية حسب الحالة</label>
                <select value={errorFilterResolved} onChange={e => setErrorFilterResolved(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">الكل</option>
                  <option value="false">غير محلولة</option>
                  <option value="true">محلولة</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">نوع الخطأ</label>
                <select value={errorFilterType} onChange={e => setErrorFilterType(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">الكل</option>
                  <option value="fingerprint_mismatch">عدم تطابق بصمة</option>
                  <option value="device_communication">خطأ اتصال</option>
                  <option value="timeout">مهلة اتصال</option>
                  <option value="user_not_found">مستخدم غير موجود</option>
                  <option value="device_offline">جهاز غير متصل</option>
                </select>
              </div>
              <button onClick={() => loadErrorLogs(1)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center gap-2">
                <FaSearch className="w-3 h-3" /> بحث
              </button>
            </div>

            {loading.errors ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-responsive-cards">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-right p-3 font-bold text-dark text-xs">التاريخ</th>
                      <th className="text-right p-3 font-bold text-dark text-xs">نوع الخطأ</th>
                      <th className="text-right p-3 font-bold text-dark text-xs">الرسالة</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">معرف الجهاز</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">الحالة</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {errorLogs.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد أخطاء مسجلة</td></tr>
                    ) : errorLogs.map((log) => (
                      <tr key={log._id} className={`hover:bg-gray-50 ${log.resolved ? 'opacity-60' : ''}`}>
                        <td className="p-3 text-gray-500 text-xs" data-label="التاريخ">{safeDateTime(log.createdAt)}</td>
                        <td className="p-3" data-label="نوع الخطأ">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            log.errorType === 'fingerprint_mismatch' ? 'bg-yellow-100 text-yellow-700' :
                            log.errorType === 'device_communication' || log.errorType === 'device_offline' ? 'bg-red-100 text-red-700' :
                            log.errorType === 'timeout' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {log.errorType === 'fingerprint_mismatch' ? 'عدم تطابق بصمة' :
                             log.errorType === 'device_communication' ? 'خطأ اتصال' :
                             log.errorType === 'timeout' ? 'مهلة اتصال' :
                             log.errorType === 'user_not_found' ? 'مستخدم غير موجود' :
                             log.errorType === 'device_offline' ? 'جهاز غير متصل' :
                             log.errorType}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600" data-label="الرسالة">{log.errorMessage}</td>
                        <td className="p-3 text-center text-xs text-gray-500" data-label="معرف الجهاز">{log.deviceUserId || '-'}</td>
                        <td className="p-3 text-center" data-label="الحالة">
                          {log.resolved ? (
                            <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">تم الحل</span>
                          ) : (
                            <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs">قيد المعالجة</span>
                          )}
                        </td>
                        <td className="p-3 text-center" data-label="إجراء">
                          {!log.resolved && (
                            <button
                              onClick={() => handleResolveError(log._id)}
                              className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1 mx-auto min-h-[44px]"
                            >
                              <FaCheck className="w-3 h-3" /> حل
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {errorLogPagination && errorLogPagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  صفحة {errorLogPagination.page} من {errorLogPagination.pages} ({errorLogPagination.total} سجل)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadErrorLogs(errorPage - 1)}
                    disabled={errorPage <= 1}
                    className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    <FaArrowRight className="w-3 h-3" /> السابق
                  </button>
                  <button
                    onClick={() => loadErrorLogs(errorPage + 1)}
                    disabled={errorPage >= errorLogPagination.pages}
                    className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    التالي <FaArrowLeft className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-dark flex items-center gap-2">
              <FaHistory className="text-primary" />
              سجل الحضور والانصراف اليوم
            </h3>
            <span className="text-sm text-gray-500">
              إجمالي {recentActivity.length} حركة
            </span>
          </div>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FaClock className="w-12 h-12 mb-3" />
              <p className="text-sm">لا توجد حركات بصمة اليوم</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((act, i) => {
                const isCheckin = act.eventType === 'checkin';
                const isCheckout = act.eventType === 'checkout';
                return (
                  <div key={act.id || i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      act.isMapped ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {(act.employeeName || '?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{act.employeeName}</span>
                        {act.employeeDepartment && act.employeeDepartment !== '-' && (
                          <span className="text-xs text-gray-400">{act.employeeDepartment}</span>
                        )}
                        {!act.isMapped && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">غير مرتبط</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <FaClock className="w-3 h-3 text-gray-400" />
                        <span dir="ltr">{safeDateTime(act.timestamp)}</span>
                        {isCheckin && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">دخول</span>}
                        {isCheckout && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">خروج</span>}
                        {!isCheckin && !isCheckout && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">بصمة</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={() => { loadRecentActivity(); loadDashboardStats(); }}
            className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <FaSync className="w-3 h-3" /> تحديث
          </button>
        </div>
      )}

    </div>
  );
};

export default BiometricManagement;
