import { useState, useEffect, useCallback } from 'react';
import {
  getSupervisorDashboard, getRawLogs, getManualOverrides,
  getFinalAttendance, createManualOverride, deleteManualOverride,
  getDeviceUsersForSupervisor, getSupervisorStats,
  syncDeviceNow, downloadAttendanceExcel, downloadEmployeeActivityExcel,
  relinkDeviceLogs, getEmployeeActivity
} from '../../services/supervisorService';

const TABS = [
  { id: 'raw', label: '📋 البصمات الخام' },
  { id: 'overrides', label: '✏️ التعديلات اليدوية' },
  { id: 'final', label: '✅ النتيجة النهائية' },
  { id: 'admin', label: '⚡ إدارة التعديلات' },
  { id: 'merge', label: '🔄 عرض الدمج المتكامل' },
  { id: 'activity', label: '📊 تقرير موظف' }
];

function safeTime(iso) {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  catch { return '--:--'; }
}

function safeDate(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  catch { return '-'; }
}

function safeDateTime(iso) {
  if (!iso) return '-';
  try { return `${safeDate(iso)} ${safeTime(iso)}`; }
  catch { return '-'; }
}

function isFriday(d) { try { return new Date(d).getDay() === 5; } catch { return false; } }
function isSaturday(d) { try { return new Date(d).getDay() === 6; } catch { return false; } }
function getDayName(d) {
  const names = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  try { return names[new Date(d).getDay()]; } catch { return ''; }
}

function StatusBadge({ status }) {
  const map = {
    present: 'bg-green-900/40 text-green-400',
    absent: 'bg-red-900/40 text-red-400',
    late: 'bg-yellow-900/40 text-yellow-400',
    half_day: 'bg-blue-900/40 text-blue-400',
    on_leave: 'bg-purple-900/40 text-purple-400',
    work_from_home: 'bg-teal-900/40 text-teal-400'
  };
  const labels = {
    present: '✅ حاضر', absent: '❌ غائب', late: '⚠️ متأخر',
    half_day: '🌗 نصف يوم', on_leave: '🏖 إجازة', work_from_home: '🏠 عمل عن بعد'
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-700 text-gray-300'}`}>{labels[status] || status}</span>;
}

function ActionBadge({ action }) {
  if (action === 'ISADD') return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-400">➕ إضافة (ISADD)</span>;
  if (action === 'ISDELETE') return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/40 text-red-400">➖ إخفاء (ISDELETE)</span>;
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">{action}</span>;
}

function EventBadge({ type }) {
  if (type === 'checkin') return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-400">⬅ دخول</span>;
  if (type === 'checkout') return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/40 text-yellow-400">➡ خروج</span>;
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">❓ غير معروف</span>;
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${color || 'text-blue-400'}`}>{value ?? '-'}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function Filters({ children }) {
  return <div className="flex flex-wrap gap-2.5 items-center mb-4">{children}</div>;
}

function FilterLabel({ children }) {
  return <label className="text-xs text-gray-400">{children}</label>;
}

function FilterInput(props) {
  return <input {...props} className="px-3 py-1.5 rounded-md border border-gray-700 bg-gray-800 text-gray-200 text-sm outline-none focus:border-blue-500 transition-colors" />;
}

function FilterSelect(props) {
  return <select {...props} className="px-3 py-1.5 rounded-md border border-gray-700 bg-gray-800 text-gray-200 text-sm outline-none focus:border-blue-500 transition-colors" />;
}

function Table({ title, count, legend, children }) {
  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/60">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full">{count}</span>
      </div>
      {legend && (
        <div className="flex gap-3 px-4 py-2 bg-gray-800/30 border-b border-gray-700 text-xs flex-wrap">
          {legend.map((item, i) => (
            <span key={i}><span className={`inline-block w-2 h-2 rounded-full ml-1 ${item.color}`}></span>{item.label}</span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return <div className="text-center py-10 text-gray-500"><div className="text-4xl mb-2">{icon || '📭'}</div><p className="text-sm">{text || 'لا توجد بيانات'}</p></div>;
}

function Loading() {
  return <div className="text-center py-10 text-gray-500"><div className="inline-block w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin ml-2 align-middle"></div>جاري تحميل البيانات...</div>;
}

export default function TempSupervisorPage() {
  const [activeTab, setActiveTab] = useState('raw');
  const [loading, setLoading] = useState({});
  const [allUsers, setAllUsers] = useState([]);

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const actStartDefault = new Date(now.getFullYear(), now.getMonth() - 1, 12).toISOString().split('T')[0];
  const actEndDefault = new Date(now.getFullYear(), now.getMonth(), 12).toISOString().split('T')[0];

  const [todayStr] = useState(today);

  // raw
  const [rawStartDate, setRawStartDate] = useState(today);
  const [rawEndDate, setRawEndDate] = useState(today);
  const [rawEmployee, setRawEmployee] = useState('');
  const [rawLogs, setRawLogs] = useState([]);

  // overrides
  const [ovStartDate, setOvStartDate] = useState(today);
  const [ovEndDate, setOvEndDate] = useState(today);
  const [ovEmployee, setOvEmployee] = useState('');
  const [ovAction, setOvAction] = useState('');
  const [overrides, setOverrides] = useState([]);

  // final
  const [fnStartDate, setFnStartDate] = useState(today);
  const [fnEndDate, setFnEndDate] = useState(today);
  const [fnEmployee, setFnEmployee] = useState('');
  const [fnStatus, setFnStatus] = useState('');
  const [finalAttendance, setFinalAttendance] = useState([]);

  // admin
  const [adminDeviceUser, setAdminDeviceUser] = useState('');
  const [adminTimestamp, setAdminTimestamp] = useState('');
  const [adminAction, setAdminAction] = useState('ISADD');
  const [adminReason, setAdminReason] = useState('');
  const [adminOverrides, setAdminOverrides] = useState([]);

  // merge
  const [mergeStartDate, setMergeStartDate] = useState(today);
  const [mergeEndDate, setMergeEndDate] = useState(today);
  const [mergeEmployee, setMergeEmployee] = useState('');
  const [mergeData, setMergeData] = useState([]);

  // activity
  const [actStartDate, setActStartDate] = useState(actStartDefault);
  const [actEndDate, setActEndDate] = useState(actEndDefault);
  const [actEmployee, setActEmployee] = useState('');
  const [actEmployeeId, setActEmployeeId] = useState('');
  const [activityData, setActivityData] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [actFilter, setActFilter] = useState('all');

  // stats
  const [stats, setStats] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await getDeviceUsersForSupervisor();
      if (res.success) setAllUsers(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await getSupervisorStats();
      if (res.success) setStats(res.data);
    } catch (e) { /* ignore */ }
  }, []);

  const loadRawLogs = useCallback(async () => {
    setLoading(p => ({ ...p, raw: true }));
    try {
      const res = await getRawLogs({ startDate: rawStartDate, endDate: rawEndDate, deviceUserId: rawEmployee });
      if (res.success) setRawLogs(res.data);
    } catch (e) { setRawLogs([]); }
    finally { setLoading(p => ({ ...p, raw: false })); }
  }, [rawStartDate, rawEndDate, rawEmployee]);

  const loadOverrides = useCallback(async () => {
    setLoading(p => ({ ...p, overrides: true }));
    try {
      const res = await getManualOverrides({ startDate: ovStartDate, endDate: ovEndDate, deviceUserId: ovEmployee, action: ovAction || undefined });
      if (res.success) setOverrides(res.data);
    } catch (e) { setOverrides([]); }
    finally { setLoading(p => ({ ...p, overrides: false })); }
  }, [ovStartDate, ovEndDate, ovEmployee, ovAction]);

  const loadFinalAttendance = useCallback(async () => {
    setLoading(p => ({ ...p, final: true }));
    try {
      const user = allUsers.find(u => u.zkUserId === fnEmployee);
      const res = await getFinalAttendance({ startDate: fnStartDate, endDate: fnEndDate, employeeId: user?._id, status: fnStatus || undefined });
      if (res.success) setFinalAttendance(res.data);
    } catch (e) { setFinalAttendance([]); }
    finally { setLoading(p => ({ ...p, final: false })); }
  }, [fnStartDate, fnEndDate, fnEmployee, fnStatus, allUsers]);

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    showToast('⏳ جاري مزامنة الجهاز...');
    try {
      const res = await syncDeviceNow();
      if (res.success) {
        showToast(`✅ تمت المزامنة: ${res.data?.synced || 0} جديد, ${res.data?.skipped || 0} مكرر`);
        loadStats();
        loadRawLogs();
        loadFinalAttendance();
      } else {
        showToast(res.message || 'فشلت المزامنة', 'error');
      }
    } catch (e) {
      showToast('⚠️ فشل الاتصال بالجهاز', 'error');
    }
    finally { setSyncing(false); }
  }, [syncing, loadStats, loadRawLogs, loadFinalAttendance]);

  const loadAdminOverrides = useCallback(async () => {
    try {
      const res = await getManualOverrides({ limit: 100 });
      if (res.success) setAdminOverrides(res.data);
    } catch (e) { /* ignore */ }
  }, []);

  const loadMergeView = useCallback(async () => {
    setLoading(p => ({ ...p, merge: true }));
    try {
      const res = await getSupervisorDashboard(mergeStartDate, mergeEndDate);
      if (!res.success) { setMergeData([]); return; }
      const { rawLogs: rl, manualOverrides: mo, finalAttendance: fa } = res.data;
      const filteredRl = mergeEmployee ? rl.filter(l => l.deviceUserId === mergeEmployee) : rl;
      const filteredMo = mergeEmployee ? mo.filter(o => o.deviceUserId === mergeEmployee) : mo;
      const filteredFa = mergeEmployee ? fa.filter(f => {
        const user = allUsers.find(u => u.zkUserId === mergeEmployee);
        return user && f.employee?._id === user._id;
      }) : fa;
      const merged = [];

      filteredRl.forEach(log => {
        merged.push({
          type: 'raw',
          deviceUserId: log.deviceUserId,
          employeeName: log.employee?.name || log.deviceUserName || `مستخدم #${log.deviceUserId}`,
          timestamp: log.timestamp,
          eventLabel: log.eventType === 'checkin' ? 'دخول (خام)' : log.eventType === 'checkout' ? 'خروج (خام)' : 'بصمة (خام)',
          eventBadge: log.eventType === 'checkin' ? 'text-green-400' : log.eventType === 'checkout' ? 'text-yellow-400' : 'text-gray-400',
          detail: ''
        });
      });
      filteredMo.forEach(o => {
        merged.push({
          type: o.action === 'ISADD' ? 'add' : 'delete',
          deviceUserId: o.deviceUserId,
          employeeName: o.employee?.name || `مستخدم #${o.deviceUserId}`,
          timestamp: o.timestamp,
          eventLabel: o.action === 'ISADD' ? '➕ بصمة مضافة (يدوي)' : '➖ بصمة ملغاة (يدوي)',
          eventBadge: o.action === 'ISADD' ? 'text-green-400' : 'text-red-400',
          detail: o.reason ? `سبب: ${o.reason}` : ''
        });
      });
      filteredFa.forEach(f => {
        if (f.checkIn?.time) {
          merged.push({
            type: 'final',
            employeeName: f.employee?.name || 'غير معروف',
            timestamp: f.checkIn.time,
            eventLabel: `✅ نتيجة نهائية — ${f.status === 'present' ? 'حاضر' : f.status === 'late' ? 'متأخر' : f.status}`,
            eventBadge: 'text-blue-400',
            detail: f.duration ? `المدة: ${f.duration.toFixed(1)} س` : ''
          });
        }
      });
      merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setMergeData(merged);
    } catch (e) { setMergeData([]); }
    finally { setLoading(p => ({ ...p, merge: false })); }
  }, [mergeStartDate, mergeEndDate, mergeEmployee, allUsers]);

  const loadActivity = useCallback(async () => {
    if (!actEmployee) { showToast('الرجاء اختيار الموظف', 'error'); return; }
    setActivityLoading(true);
    try {
      const user = allUsers.find(u => u.zkUserId === actEmployee);
      if (!user) { setActivityData([]); showToast('الموظف غير موجود', 'error'); return; }
      setActEmployeeId(user._id);
      const res = await getEmployeeActivity(user._id, actStartDate, actEndDate);
      if (!res.success) { setActivityData([]); return; }
      const { attendance, approvedLeaves } = res.data;

      // Build leave date lookup: which dates are covered by an approved leave
      const leaveDateMap = new Map();
      approvedLeaves.forEach(lv => {
        const lvStart = new Date(lv.startDate);
        lvStart.setHours(0, 0, 0, 0);
        const lvEnd = new Date(lv.endDate);
        lvEnd.setHours(0, 0, 0, 0);
        const cur = new Date(lvStart);
        while (cur <= lvEnd) {
          const key = cur.toISOString().split('T')[0];
          if (!leaveDateMap.has(key)) {
            leaveDateMap.set(key, lv);
          }
          cur.setDate(cur.getDate() + 1);
        }
      });

      // Fill missing dates
      const start = new Date(actStartDate);
      const end = new Date(actEndDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const dateMap = new Map();
      attendance.forEach(r => {
        const d = new Date(r.date);
        dateMap.set(d.toISOString().split('T')[0], r);
      });
      const filled = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = cursor.toISOString().split('T')[0];
        if (dateMap.has(key)) {
          const rec = dateMap.get(key);
          // إذا كان السجل يشير إلى إجازة، أضف معلومات الإجازة واملأ الأوقات
          if (rec.leave || leaveDateMap.has(key)) {
            const lv = rec.leave || leaveDateMap.get(key);
            rec._compensatedByLeave = lv;
            if (!rec.checkIn?.time) {
              const ci = new Date(rec.date);
              ci.setHours(9, 0, 0, 0);
              rec.checkIn = { time: ci.toISOString(), status: 'on_time', notes: 'تعويض بإجازة' };
            }
            if (!rec.checkOut?.time) {
              const co = new Date(rec.date);
              co.setHours(16, 0, 0, 0);
              rec.checkOut = { time: co.toISOString(), status: 'on_time', notes: 'تعويض بإجازة' };
            }
            rec.duration = rec.duration || 7;
            if (!rec.status) rec.status = 'present';
          }
          // الجمعة عطلة أسبوعية - لا تجمع مع النقص أو الإجازات
          if (isFriday(rec.date)) {
            rec._isWeeklyHoliday = true;
            rec.isMissing = false;
            rec._compensatedByLeave = null;
          }
          filled.push(rec);
        } else {
          const isLeaveDay = leaveDateMap.has(key);
          const lv = leaveDateMap.get(key);
          const isFri = isFriday(cursor);
          const rec = {
            _id: null, date: new Date(cursor), checkIn: null, checkOut: null,
            duration: null, status: null, overtime: null, employee: user,
            isMissing: !isLeaveDay && !isFri,
            _compensatedByLeave: isLeaveDay && !isFri ? lv : null,
            _isWeeklyHoliday: isFri || undefined
          };
          if (isLeaveDay && lv && !isFri) {
            const ci = new Date(cursor);
            ci.setHours(9, 0, 0, 0);
            rec.checkIn = { time: ci.toISOString(), status: 'on_time', notes: 'تعويض بإجازة' };
            const co = new Date(cursor);
            co.setHours(16, 0, 0, 0);
            rec.checkOut = { time: co.toISOString(), status: 'on_time', notes: 'تعويض بإجازة' };
            rec.duration = 7;
            rec.status = 'present';
            rec.isMissing = false;
          }
          filled.push(rec);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      filled.sort((a, b) => new Date(b.date) - new Date(a.date));
      setActivityData(filled);
    } catch (e) { setActivityData([]); }
    finally { setActivityLoading(false); }
  }, [actStartDate, actEndDate, actEmployee, allUsers]);

  // INIT
  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadRawLogs(); }, [loadRawLogs]);
  useEffect(() => { loadOverrides(); }, [loadOverrides]);
  useEffect(() => { loadFinalAttendance(); }, [loadFinalAttendance]);
  useEffect(() => { loadAdminOverrides(); }, [loadAdminOverrides]);
  useEffect(() => { loadMergeView(); }, [loadMergeView]);

  // auto refresh
  const [autoRefresh, setAutoRefresh] = useState(null);
  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      clearInterval(autoRefresh);
      setAutoRefresh(null);
      showToast('تم إيقاف التحديث التلقائي');
      return;
    }
    const interval = setInterval(() => {
      const tab = document.querySelector('.tab-active')?.dataset?.tab || activeTab;
      if (tab === 'raw') loadRawLogs();
      else if (tab === 'overrides') loadOverrides();
      else if (tab === 'final') loadFinalAttendance();
      else if (tab === 'merge') loadMergeView();
      else if (tab === 'activity') loadActivity();
      loadStats();
    }, 15000);
    setAutoRefresh(interval);
    showToast('تم تفعيل التحديث التلقائي كل 15 ثانية');
  };

  // create override
  const handleCreateOverride = async () => {
    if (!adminDeviceUser) { showToast('الرجاء اختيار الموظف', 'error'); return; }
    if (!adminTimestamp) { showToast('الرجاء إدخال التاريخ والوقت', 'error'); return; }
    try {
      const res = await createManualOverride({
        deviceUserId: adminDeviceUser,
        timestamp: new Date(adminTimestamp).toISOString(),
        action: adminAction,
        reason: adminReason
      });
      if (res.success) {
        showToast(res.message);
        setAdminReason('');
        loadAdminOverrides();
        loadOverrides();
        loadStats();
      } else showToast(res.message || 'حدث خطأ', 'error');
    } catch (e) { showToast('فشل في حفظ التعليمة', 'error'); }
  };

  const handleDeleteOverride = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه التعليمة؟')) return;
    try {
      const res = await deleteManualOverride(id);
      if (res.success) {
        showToast('تم حذف التعليمة');
        loadAdminOverrides();
        loadOverrides();
        loadStats();
      }
    } catch (e) { showToast('فشل في حذف التعليمة', 'error'); }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-200" dir="rtl">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-sm font-medium shadow-lg animate-fadeIn ${
          toast.type === 'error' ? 'bg-red-900/80 border border-red-500 text-red-300' : 'bg-green-900/80 border border-green-500 text-green-300'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-4 bg-gray-900/60 border-b border-gray-800">
        <StatCard label="بصمات خام (اليوم)" value={stats?.todayRawCount} color="text-blue-400" />
        <StatCard label="تعديلات يدوية (اليوم)" value={stats?.todayOverrideCount} color="text-yellow-400" />
        <StatCard label="سجلات نهائية (اليوم)" value={stats?.todayAttendanceCount} color="text-green-400" />
        <StatCard label="إضافات (ISADD)" value={stats?.totalISADD} color="text-green-400" />
        <StatCard label="إخفاءات (ISDELETE)" value={stats?.totalISDELETE} color="text-red-400" />
        <div className="flex items-center justify-center">
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all w-full ${
              syncing
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30'
            }`}
          >
            {syncing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></span>
                جاري المزامنة...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">🔄 مزامنة الجهاز</span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 px-4 bg-gray-900/60 border-b border-gray-800 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            data-tab={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-blue-400 border-blue-400'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="mr-auto flex items-center">
          <button
            onClick={toggleAutoRefresh}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              autoRefresh ? 'bg-green-900/40 text-green-400 border border-green-700' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            {autoRefresh ? '⏱ إيقاف التلقائي' : '⏱ تلقائي'}
          </button>
        </div>
      </div>

      <div className="p-4">

        {/* TAB: RAW LOGS */}
        {activeTab === 'raw' && (
          <>
            <Filters>
              <FilterLabel>من تاريخ</FilterLabel>
              <FilterInput type="date" value={rawStartDate} onChange={e => setRawStartDate(e.target.value)} />
              <FilterLabel>إلى تاريخ</FilterLabel>
              <FilterInput type="date" value={rawEndDate} onChange={e => setRawEndDate(e.target.value)} />
              <FilterLabel>الموظف</FilterLabel>
              <FilterSelect value={rawEmployee} onChange={e => setRawEmployee(e.target.value)}>
                <option value="">الكل</option>
                {allUsers.map(u => <option key={u.zkUserId} value={u.zkUserId}>{u.name} (ID: {u.zkUserId})</option>)}
              </FilterSelect>
              <button onClick={loadRawLogs} className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">🔄 تحديث</button>
            </Filters>
            <Table title="📋 سجلات البصمة الخام (CHECKINOUT)" count={rawLogs.length} legend={[
              { color: 'bg-green-500', label: 'دخول' },
              { color: 'bg-yellow-500', label: 'خروج' },
              { color: 'bg-red-500', label: 'غير معروف' },
              { label: '— هذه البيانات قادمة مباشرة من جهاز ZKTeco. للعرض فقط.' }
            ]}>
              {loading.raw ? <Loading /> : !rawLogs.length
                ? <EmptyState icon="📭" text="لا توجد بصمات خام في هذا التاريخ" />
                : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-800/60">
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">#</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الموظف</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الوقت</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">نوع الحركة</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">رقم الجهاز</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">حالة الربط</th>
                </tr></thead><tbody>
                  {rawLogs.map((log, i) => (
                    <tr key={log._id || i} className="border-t border-gray-800 hover:bg-gray-800/40">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3">
                        <div className="font-medium">{log.employee?.name || log.deviceUserName || 'غير معروف'}</div>
                        <div className="text-xs text-gray-500">{log.employee?.department || '-'}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">{safeDateTime(log.timestamp)}</td>
                      <td className="p-3"><EventBadge type={log.eventType} /></td>
                      <td className="p-3">{log.deviceUserId || '-'}</td>
                      <td className="p-3">{log.employee ? <span className="text-green-400">✔ مربوط</span> : <span className="text-gray-500">⛔ غير مربوط</span>}</td>
                    </tr>
                  ))}
                </tbody></table></div>
              }
            </Table>
          </>
        )}

        {/* TAB: OVERRIDES */}
        {activeTab === 'overrides' && (
          <>
            <Filters>
              <FilterLabel>من تاريخ</FilterLabel>
              <FilterInput type="date" value={ovStartDate} onChange={e => setOvStartDate(e.target.value)} />
              <FilterLabel>إلى تاريخ</FilterLabel>
              <FilterInput type="date" value={ovEndDate} onChange={e => setOvEndDate(e.target.value)} />
              <FilterLabel>الموظف</FilterLabel>
              <FilterSelect value={ovEmployee} onChange={e => setOvEmployee(e.target.value)}>
                <option value="">الكل</option>
                {allUsers.map(u => <option key={u.zkUserId} value={u.zkUserId}>{u.name} (ID: {u.zkUserId})</option>)}
              </FilterSelect>
              <FilterLabel>نوع</FilterLabel>
              <FilterSelect value={ovAction} onChange={e => setOvAction(e.target.value)}>
                <option value="">الكل</option>
                <option value="ISADD">إضافة (ISADD)</option>
                <option value="ISDELETE">إخفاء (ISDELETE)</option>
              </FilterSelect>
              <button onClick={loadOverrides} className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">🔄 تحديث</button>
            </Filters>
            <Table title="✏️ التعديلات اليدوية (CHECKEXACT)" count={overrides.length} legend={[
              { color: 'bg-green-500', label: 'ISADD — إضافة سجل بصمة وهمي' },
              { color: 'bg-red-500', label: 'ISDELETE — إخفاء سجل بصمة' }
            ]}>
              {loading.overrides ? <Loading /> : !overrides.length
                ? <EmptyState icon="✏️" text="لا توجد تعديلات يدوية في هذا التاريخ" />
                : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-800/60">
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">#</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الموظف</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الوقت</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">التاريخ</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">نوع</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">السبب</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">أضيف بواسطة</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">تم التطبيق</th>
                </tr></thead><tbody>
                  {overrides.map((o, i) => (
                    <tr key={o._id || i} className={`border-t border-gray-800 hover:bg-gray-800/40 ${o.action === 'ISADD' ? 'border-r-2 border-r-green-500' : 'border-r-2 border-r-red-500 opacity-70'}`}>
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3">
                        <div className="font-medium">{o.employee?.name || `مستخدم #${o.deviceUserId}`}</div>
                        <div className="text-xs text-gray-500">ID: {o.deviceUserId}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">{safeDateTime(o.timestamp)}</td>
                      <td className="p-3 whitespace-nowrap">{safeDate(o.date)}</td>
                      <td className="p-3"><ActionBadge action={o.action} /></td>
                      <td className="p-3 max-w-[150px] truncate">{o.reason || '-'}</td>
                      <td className="p-3">{o.createdBy?.name || 'النظام'}</td>
                      <td className="p-3">{o.isApplied ? <span className="text-green-400">✔ نعم ({safeDateTime(o.appliedAt)})</span> : <span className="text-gray-500">⌛ لا</span>}</td>
                    </tr>
                  ))}
                </tbody></table></div>
              }
            </Table>
          </>
        )}

        {/* TAB: FINAL ATTENDANCE */}
        {activeTab === 'final' && (
          <>
            <Filters>
              <FilterLabel>من تاريخ</FilterLabel>
              <FilterInput type="date" value={fnStartDate} onChange={e => setFnStartDate(e.target.value)} />
              <FilterLabel>إلى تاريخ</FilterLabel>
              <FilterInput type="date" value={fnEndDate} onChange={e => setFnEndDate(e.target.value)} />
              <FilterLabel>الموظف</FilterLabel>
              <FilterSelect value={fnEmployee} onChange={e => setFnEmployee(e.target.value)}>
                <option value="">الكل</option>
                {allUsers.map(u => <option key={u.zkUserId} value={u.zkUserId}>{u.name} (ID: {u.zkUserId})</option>)}
              </FilterSelect>
              <FilterLabel>الحالة</FilterLabel>
              <FilterSelect value={fnStatus} onChange={e => setFnStatus(e.target.value)}>
                <option value="">الكل</option>
                <option value="present">حاضر</option>
                <option value="absent">غائب</option>
                <option value="late">متأخر</option>
                <option value="half_day">نصف يوم</option>
                <option value="on_leave">في إجازة</option>
                <option value="work_from_home">عمل عن بعد</option>
              </FilterSelect>
              <button onClick={loadFinalAttendance} className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">🔄 تحديث</button>
              <button
                onClick={() => downloadAttendanceExcel('', fnStartDate, fnEndDate)}
                className="px-4 py-1.5 rounded-md bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-colors"
              >
                📥 Excel للكل
              </button>
            </Filters>
            <Table title="✅ النتيجة النهائية للحضور (MongoDB Attendance)" count={finalAttendance.length} legend={[
              { color: 'bg-green-500', label: 'نتائج مدمجة من البصمات الخام + التعديلات اليدوية' }
            ]}>
              {loading.final ? <Loading /> : !finalAttendance.length
                ? <EmptyState icon="✅" text="لا توجد سجلات حضور نهائية في هذا التاريخ" />
                : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-800/60">
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">#</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الموظف</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">التاريخ</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">أول دخول</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">آخر خروج</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">المدة</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الحالة</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">إضافي</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">Excel</th>
                </tr></thead><tbody>
                  {finalAttendance.map((r, i) => (
                    <tr key={r._id || i} className="border-t border-gray-800 hover:bg-gray-800/40">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3">
                        <div className="font-medium">{r.employee?.name || r.deviceUserName || 'غير معروف'}</div>
                        <div className="text-xs text-gray-500">{r.employee?.department || r.department || '-'}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">{safeDate(r.date)}</td>
                      <td className="p-3">{r.checkIn?.time ? safeTime(r.checkIn.time) : '---'}</td>
                      <td className="p-3">{r.checkOut?.time ? safeTime(r.checkOut.time) : '---'}</td>
                      <td className="p-3">{r.duration ? `${r.duration.toFixed(1)} س` : '-'}</td>
                      <td className="p-3"><StatusBadge status={r.status} /></td>
                      <td className="p-3">{r.overtime ? `${r.overtime.toFixed(1)} س` : '-'}</td>
                      <td className="p-3">
                        {r.employee?._id && (
                          <button
                            onClick={() => downloadAttendanceExcel(r.employee._id, fnStartDate, fnEndDate)}
                            className="px-2 py-1 rounded text-xs bg-gray-700 hover:bg-green-700 text-gray-300 hover:text-white transition-colors"
                            title="تحميل تقرير Excel"
                          >
                            📥
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody></table></div>
              }
            </Table>
          </>
        )}

        {/* TAB: ADMIN */}
        {activeTab === 'admin' && (
          <>
            <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-5 mb-4">
              <h3 className="text-base font-semibold mb-2">➕ إضافة تعليمة يدوية جديدة</h3>
              <p className="text-sm text-gray-400 mb-4">
                ⚠️ هذه العملية لا تعدل أي سجل موجود. تقوم فقط بإنشاء تعليمة (ISADD / ISDELETE) في CHECKEXACT.
                محرك الدمج سيطبق هذه التعليمات لاحقاً.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">الموظف (رقم الجهاز)</label>
                  <FilterSelect value={adminDeviceUser} onChange={e => setAdminDeviceUser(e.target.value)}>
                    <option value="">اختر موظفاً...</option>
                    {allUsers.map(u => <option key={u.zkUserId} value={u.zkUserId}>{u.name} (ID: {u.zkUserId})</option>)}
                  </FilterSelect>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">التاريخ والوقت</label>
                  <FilterInput type="datetime-local" value={adminTimestamp} onChange={e => setAdminTimestamp(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">نوع التعليمة</label>
                  <FilterSelect value={adminAction} onChange={e => setAdminAction(e.target.value)}>
                    <option value="ISADD">✅ إضافة بصمة (ISADD)</option>
                    <option value="ISDELETE">❌ إخفاء بصمة (ISDELETE)</option>
                  </FilterSelect>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">سبب التعديل</label>
                  <input type="text" value={adminReason} onChange={e => setAdminReason(e.target.value)}
                    placeholder="مثال: نسي الموظف تسجيل البصمة"
                    className="px-3 py-1.5 rounded-md border border-gray-700 bg-gray-800 text-gray-200 text-sm outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={handleCreateOverride} className="px-5 py-2 rounded-md bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors">💾 حفظ التعليمة</button>
                <button onClick={() => { setAdminReason(''); setAdminTimestamp(''); }} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors">🧹 تفريغ</button>
              </div>
            </div>

            <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold mb-2 text-yellow-400">🔗 إعادة ربط سجلات البصمة القديمة</h3>
              <p className="text-xs text-gray-400 mb-3">
                بعد ربط موظفين جدد بمعرفات البصمة، قم بهذه العملية لربط سجلات البصمة السابقة بهم. هذا يضمن ظهور أسمائهم في جدول البصمات الخام.
              </p>
              <button
                onClick={async () => {
                  try {
                    const res = await relinkDeviceLogs();
                    showToast(res.message, 'success');
                  } catch (e) { showToast('فشلت عملية الربط', 'error'); }
                }}
                className="px-4 py-2 rounded-md bg-yellow-700 hover:bg-yellow-600 text-white text-sm font-medium transition-colors"
              >
                🔄 إعادة ربط السجلات القديمة
              </button>
            </div>

            <Table title="📋 آخر التعديلات اليدوية" count={adminOverrides.length}>
              {!adminOverrides.length
                ? <EmptyState icon="✏️" text="لا توجد تعديلات بعد" />
                : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-800/60">
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">#</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الموظف</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الوقت</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">نوع</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">السبب</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">بواسطة</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium"></th>
                </tr></thead><tbody>
                  {adminOverrides.map((o, i) => (
                    <tr key={o._id || i} className={`border-t border-gray-800 hover:bg-gray-800/40 ${o.action === 'ISADD' ? 'border-r-2 border-r-green-500' : 'border-r-2 border-r-red-500 opacity-70'}`}>
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3">{o.employee?.name || `مستخدم #${o.deviceUserId}`} <span className="text-xs text-gray-500">(ID: {o.deviceUserId})</span></td>
                      <td className="p-3 whitespace-nowrap">{safeDateTime(o.timestamp)}</td>
                      <td className="p-3"><ActionBadge action={o.action} /></td>
                      <td className="p-3 max-w-[150px] truncate">{o.reason || '-'}</td>
                      <td className="p-3">{o.createdBy?.name || 'النظام'}</td>
                      <td className="p-3">
                        <button onClick={() => handleDeleteOverride(o._id)} className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-400 hover:bg-red-900/40 hover:text-red-400 hover:border-red-700 text-xs transition-colors">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody></table></div>
              }
            </Table>
          </>
        )}

        {/* TAB: MERGE VIEW */}
        {activeTab === 'merge' && (
          <>
            <Filters>
              <FilterLabel>من تاريخ</FilterLabel>
              <FilterInput type="date" value={mergeStartDate} onChange={e => setMergeStartDate(e.target.value)} />
              <FilterLabel>إلى تاريخ</FilterLabel>
              <FilterInput type="date" value={mergeEndDate} onChange={e => setMergeEndDate(e.target.value)} />
              <FilterLabel>الموظف</FilterLabel>
              <FilterSelect value={mergeEmployee} onChange={e => setMergeEmployee(e.target.value)}>
                <option value="">الكل</option>
                {allUsers.map(u => <option key={u.zkUserId} value={u.zkUserId}>{u.name} (ID: {u.zkUserId})</option>)}
              </FilterSelect>
              <button onClick={loadMergeView} className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">🔄 تحديث</button>
            </Filters>
            <Table title="🔄 عرض الدمج المتكامل — بصمة خام ← تعديل ← نتيجة" count={mergeData.length} legend={[
              { color: 'bg-green-500', label: 'بصمة خام' },
              { color: 'bg-yellow-500', label: 'تعديل يدوي (إضافة)' },
              { color: 'bg-red-500', label: 'تعديل يدوي (إخفاء)' },
              { color: 'bg-blue-500', label: 'النتيجة النهائية' }
            ]}>
              {loading.merge ? <Loading /> : !mergeData.length
                ? <EmptyState icon="🔄" text="لا توجد بيانات للدمج في هذا التاريخ" />
                : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-800/60">
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">#</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الموظف</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الوقت</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">المصدر</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">التفاصيل</th>
                </tr></thead><tbody>
                  {mergeData.map((m, i) => {
                    let bgClass = '';
                    if (m.type === 'add') bgClass = 'bg-green-900/20';
                    else if (m.type === 'delete') bgClass = 'bg-red-900/20 opacity-70';
                    else if (m.type === 'final') bgClass = 'bg-blue-900/20';
                    return (
                      <tr key={i} className={`border-t border-gray-800 hover:bg-gray-800/40 ${bgClass}`}>
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3">{m.employeeName}</td>
                        <td className="p-3 whitespace-nowrap">{safeDateTime(m.timestamp)}</td>
                        <td className="p-3"><span className={`text-xs font-medium ${m.eventBadge}`}>{m.eventLabel}</span></td>
                        <td className="p-3 text-sm">{m.detail}</td>
                      </tr>
                    );
                  })}
                </tbody></table></div>
              }
            </Table>
          </>
        )}

        {/* TAB: EMPLOYEE ACTIVITY */}
        {activeTab === 'activity' && (
          <>
            <Filters>
              <FilterLabel>من تاريخ</FilterLabel>
              <FilterInput type="date" value={actStartDate} onChange={e => setActStartDate(e.target.value)} />
              <FilterLabel>إلى تاريخ</FilterLabel>
              <FilterInput type="date" value={actEndDate} onChange={e => setActEndDate(e.target.value)} />
              <FilterLabel>الموظف</FilterLabel>
              <FilterSelect value={actEmployee} onChange={e => setActEmployee(e.target.value)}>
                <option value="">اختر موظفاً...</option>
                {allUsers.map(u => <option key={u.zkUserId} value={u.zkUserId}>{u.name} (ID: {u.zkUserId})</option>)}
              </FilterSelect>
              <button onClick={loadActivity} className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">🔍 بحث</button>
              {activityData.length > 0 && (
                <>
                  <FilterLabel>فلتر</FilterLabel>
                  <FilterSelect value={actFilter} onChange={e => setActFilter(e.target.value)}>
                    <option value="all">الكل</option>
                    <option value="absent">أيام الغياب</option>
                    <option value="missing">ساعات ناقصة</option>
                    <option value="compensated">إجازات مبررة</option>
                    <option value="unexcused">إجازات غير مبررة</option>
                  </FilterSelect>
                  <button
                    onClick={() => downloadEmployeeActivityExcel(actEmployeeId, actStartDate, actEndDate)}
                    className="px-4 py-1.5 rounded-md bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                  >
                    📥 تحميل Excel ملون
                  </button>
                </>
              )}
            </Filters>
            {(() => {
              const filteredData = activityData.filter(r => {
                if (actFilter === 'all') return true;
                if (r._isWeeklyHoliday) return false;
                if (actFilter === 'absent') return !r._compensatedByLeave && (r.status === 'absent' || r.isMissing);
                if (actFilter === 'missing') return !r._compensatedByLeave && !r.isMissing && (!r.checkIn?.time || !r.checkOut?.time);
                if (actFilter === 'compensated') return !!r._compensatedByLeave;
                if (actFilter === 'unexcused') return r.isMissing && !r._compensatedByLeave;
                return true;
              });
              return (
            <Table title={`📊 تقرير نشاط الموظف`} count={filteredData.length} legend={[
              { color: 'bg-green-500', label: 'حاضر' },
              { color: 'bg-red-500', label: 'غائب' },
              { color: 'bg-yellow-500', label: 'متأخر' },
              { color: 'bg-blue-500', label: 'نصف يوم' }
            ]}>
              {activityLoading ? <Loading /> : !filteredData.length
                ? <EmptyState icon="📊" text="اختر موظفاً واضغط بحث لعرض نشاطه" />
                : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-800/60">
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">#</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">التاريخ</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">اليوم</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">أول دخول</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">آخر خروج</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">المدة</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الحالة</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">إضافي</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">ملاحظات</th>
                </tr></thead><tbody>
                  {filteredData.map((r, i) => {
                    let rowBg = '';
                    const hasCheckIn = !!r.checkIn?.time;
                    const hasCheckOut = !!r.checkOut?.time;
                    let notes = '';
                    let statusDisplay = r.status;
                    const compensated = r._compensatedByLeave;
                    const leaveTypeLabel = compensated?.type ? {
                      annual: 'سنوية', sick: 'مرضية', emergency: 'طارئة',
                      exceptional: 'استثنائية', death: 'وفاة', unpaid: 'بدون راتب',
                      maternity: 'وضع', paternity: 'أبوة', compensatory: 'تعويضية',
                      hourly: 'ساعية', mission: 'مأمورية', overtime: 'أجر إضافي',
                      attendance_correction: 'تصحيح بصمة', fingerprint_forgotten: 'نسيان بصمة'
                    }[compensated.type] || compensated.type : null;
                    if (r._isWeeklyHoliday) {
                      notes = '📅 عطلة أسبوعية - الجمعة';
                      rowBg = 'bg-gray-700/30';
                      statusDisplay = null;
                    } else if (compensated) {
                      notes = `✅ تم تعويض النقص بإجازة ${leaveTypeLabel || ''}`;
                      rowBg = 'bg-green-400/10 border-r-4 border-r-green-400';
                      statusDisplay = statusDisplay || 'on_leave';
                      if (!r.status) r.status = 'on_leave';
                    } else if (r.isMissing) {
                      notes = 'لا توجد بصمة ولا سجل حضور';
                      rowBg = 'bg-purple-900/10';
                      statusDisplay = null;
                    } else {
                      if (!hasCheckIn && !hasCheckOut) notes = 'لا توجد بصمة دخول ولا خروج';
                      else if (!hasCheckIn) notes = 'لا توجد بصمة دخول';
                      else if (!hasCheckOut) notes = 'لا توجد بصمة خروج';
                      if (isSaturday(r.date)) rowBg = 'bg-purple-900/15';
                      else if (notes) rowBg = 'bg-orange-900/10';
                      else if (r.status === 'absent' || r.status === 'late') rowBg = 'bg-red-900/10';
                      else if (r.status === 'present') rowBg = 'bg-green-900/10';
                      else if (r.status === 'half_day') rowBg = 'bg-yellow-900/10';
                    }
                    const isFri = isFriday(r.date) && !r._isWeeklyHoliday;
                    return (
                      <tr key={r._id || i} className={`border-t border-gray-800 hover:bg-gray-800/40 ${rowBg}`} style={isFri ? { backgroundColor: 'rgba(236, 72, 153, 0.2)' } : {}}>
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3 whitespace-nowrap">{safeDate(r.date)}</td>
                        <td className="p-3">{getDayName(r.date)}</td>
                        <td className="p-3">{r.checkIn?.time ? safeTime(r.checkIn.time) : '---'}</td>
                        <td className="p-3">{r.checkOut?.time ? safeTime(r.checkOut.time) : '---'}</td>
                        <td className="p-3 font-medium text-blue-400">{r.duration ? `${r.duration.toFixed(1)} س` : (compensated ? '-' : '-')}</td>
                        <td className="p-3">{statusDisplay ? <StatusBadge status={r.status} /> : <span className="text-gray-500">---</span>}</td>
                        <td className="p-3">{r.overtime ? `${r.overtime.toFixed(1)} س` : '-'}</td>
                        <td className="p-3 text-xs max-w-[200px]" style={{ color: compensated ? '#4ade80' : r._isWeeklyHoliday ? '#9ca3af' : r.isMissing ? '#a855f7' : '#fb923c' }}>{notes}</td>
                      </tr>
                    );
                  })}
                </tbody></table></div>
              }
            </Table>
              );
            })()}

            {activityData.length > 0 && (
              <div className="mt-4 bg-gray-800/40 border border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-400 mb-3">📊 ملخص النشاط</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-8 gap-3">
                  <StatCard label="إجمالي الأيام" value={activityData.length} color="text-blue-400" />
                  <StatCard label="أيام الحضور" value={activityData.filter(r => !r.isMissing && r.status !== 'absent' && !r._isWeeklyHoliday).length} color="text-green-400" />
                  <StatCard label="أيام الغياب" value={activityData.filter(r => !r.isMissing && r.status === 'absent' && !r._isWeeklyHoliday).length} color="text-red-400" />
                  <StatCard label="أيام التأخير" value={activityData.filter(r => !r.isMissing && r.status === 'late' && !r._isWeeklyHoliday).length} color="text-yellow-400" />
                  <StatCard label="أيام معوضة بإجازة" value={activityData.filter(r => r._compensatedByLeave && !r._isWeeklyHoliday).length} color="text-green-400" />
                  <StatCard label="عطل أسبوعية" value={activityData.filter(r => r._isWeeklyHoliday).length} color="text-gray-400" />
                  <StatCard label="إجمالي ساعات العمل" value={activityData.reduce((s, r) => s + (r.isMissing || r._isWeeklyHoliday ? 0 : (r.duration || 0)), 0).toFixed(1)} color="text-blue-400" />
                  <StatCard label="إجمالي الإضافي" value={activityData.reduce((s, r) => s + (r.isMissing || r._isWeeklyHoliday ? 0 : (r.overtime || 0)), 0).toFixed(1)} color="text-purple-400" />
                </div>
                <h4 className="text-sm font-semibold text-orange-400 mb-3 mt-4">⚠️ حالات البصمات الناقصة</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="نقص بصمة دخول" value={activityData.filter(r => !r.isMissing && !r._isWeeklyHoliday && !r.checkIn?.time).length} color="text-orange-400" />
                  <StatCard label="نقص بصمة خروج" value={activityData.filter(r => !r.isMissing && !r._isWeeklyHoliday && !r.checkOut?.time).length} color="text-orange-400" />
                  <StatCard label="نقص البصمتين معاً" value={activityData.filter(r => !r.isMissing && !r._isWeeklyHoliday && !r.checkIn?.time && !r.checkOut?.time).length} color="text-red-400" />
                  <StatCard label="أيام بدون أي سجل" value={activityData.filter(r => r.isMissing && !r._isWeeklyHoliday).length} color="text-purple-400" />
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
