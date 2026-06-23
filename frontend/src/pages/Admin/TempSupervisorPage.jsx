import { useState, useEffect, useCallback } from 'react';
import { getStoredUser } from '../../services/authService';
import {
  getSupervisorDashboard, getRawLogs, getManualOverrides,
  getFinalAttendance, createManualOverride, deleteManualOverride,
  getDeviceUsersForSupervisor, getSupervisorStats,
  syncDeviceNow, downloadAttendanceExcel, downloadEmployeeActivityExcel,
  downloadAllEmployeesActivityExcel,
  relinkDeviceLogs, getEmployeeActivity
} from '../../services/supervisorService';
import {
  getUnmappedDeviceUsers, getSystemUsersForMapping, mapUserToDevice,
  unmapUserFromDevice, bulkMapUsers
} from '../../services/attendanceService';

const TABS = [
  { id: 'raw', label: '📋 البصمات الخام' },
  { id: 'overrides', label: '✏️ التعديلات اليدوية' },
  { id: 'final', label: '✅ النتيجة النهائية' },
  { id: 'admin', label: '⚡ إدارة التعديلات' },
  { id: 'merge', label: '🔄 عرض الدمج المتكامل' },
  { id: 'activity', label: '📊 تقرير موظف' },
  { id: 'mapping', label: '🔗 ربط المستخدمين' }
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
function calcMinutesDiff(time, baseHour, baseMin) {
  if (!time) return null;
  try {
    const t = new Date(time);
    return (t.getHours() * 60 + t.getMinutes()) - (baseHour * 60 + baseMin);
  } catch { return null; }
}
function fmtMin(min) {
  if (min == null) return '-';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = min < 0 ? '-' : '';
  if (h > 0) return `${sign}${h}:${String(m).padStart(2, '0')}`;
  return `${sign}${m} د`;
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
    <div className="bg-gray-800/40 border border-gray-700 rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/60 rounded-t-lg">
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
  const currentUser = getStoredUser();
  const userRole = (currentUser?.role || '').toLowerCase();
  const userDept = (currentUser?.department || '').toString().toLowerCase().trim();
  const isHrEmployee = userRole === 'employee' && (userDept === 'hr' || userDept === 'الموارد البشرية' || userDept.includes('موارد بشرية'));
  const visibleTabs = isHrEmployee ? TABS.filter(t => t.id === 'activity') : TABS;
  const [activeTab, setActiveTab] = useState(isHrEmployee ? 'activity' : 'raw');
  const [loading, setLoading] = useState({});
  const [allUsers, setAllUsers] = useState([]);

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const toLocalDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const currentDay = now.getDate();
  const actStartDefault = currentDay >= 12
    ? toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 12))
    : toLocalDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 12));
  const actEndDefault = currentDay >= 12
    ? toLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 12))
    : toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 12));

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

  // mapping
  const [unmappedDeviceUsers, setUnmappedDeviceUsers] = useState([]);
  const [showAllDeviceUsers, setShowAllDeviceUsers] = useState(false);
  const [systemUsers, setSystemUsers] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [selectedSystemUser, setSelectedSystemUser] = useState(null);
  const [selectedDeviceUser, setSelectedDeviceUser] = useState(null);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [bulkMapping, setBulkMapping] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

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
      const { attendance, approvedLeaves, holidays } = res.data;

      // Build leave date lookup
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

      // Build holiday date lookup
      const holidayDateMap = new Map();
      (holidays || []).forEach(h => {
        const hStart = new Date(h.startDate);
        hStart.setHours(0, 0, 0, 0);
        const hEnd = new Date(h.endDate);
        hEnd.setHours(0, 0, 0, 0);
        const cur = new Date(hStart);
        while (cur <= hEnd) {
          const key = cur.toISOString().split('T')[0];
          if (!holidayDateMap.has(key)) {
            holidayDateMap.set(key, h);
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
        const isFri = isFriday(cursor);
        const isHol = holidayDateMap.has(key);
        const hol = holidayDateMap.get(key);
        const isLeaveDay = leaveDateMap.has(key);
        const lv = leaveDateMap.get(key);

        if (dateMap.has(key)) {
          const rec = dateMap.get(key);
          // الأولوية: عطلة رسمية > تعويض بإجازة > عطلة أسبوعية
          if (isHol && !isFri) {
            rec._isHoliday = hol;
            rec.isMissing = false;
            rec._compensatedByLeave = null;
            rec._isWeeklyHoliday = undefined;
            if (!rec.checkIn?.time) {
              const ci = new Date(rec.date);
              ci.setHours(9, 0, 0, 0);
              rec.checkIn = { time: ci.toISOString(), status: 'on_time', notes: 'عطلة رسمية' };
            }
            if (!rec.checkOut?.time) {
              const co = new Date(rec.date);
              co.setHours(16, 0, 0, 0);
              rec.checkOut = { time: co.toISOString(), status: 'on_time', notes: 'عطلة رسمية' };
            }
            rec.duration = rec.duration || 7;
            if (!rec.status) rec.status = 'present';
          } else if (rec.leave || isLeaveDay) {
            const lvRef = rec.leave || lv;
            rec._compensatedByLeave = lvRef;
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
          // الجمعة عطلة أسبوعية
          if (isFri) {
            rec._isWeeklyHoliday = true;
            rec.isMissing = false;
            rec._compensatedByLeave = null;
            rec._isHoliday = null;
          }
          filled.push(rec);
        } else {
          const rec = {
            _id: null, date: new Date(cursor), checkIn: null, checkOut: null,
            duration: null, status: null, overtime: null, employee: user,
            isMissing: !isHol && !isLeaveDay && !isFri,
            _compensatedByLeave: isLeaveDay && !isHol && !isFri ? lv : null,
            _isWeeklyHoliday: isFri || undefined,
            _isHoliday: isHol && !isFri ? hol : null
          };
          if (isHol && !isFri) {
            const ci = new Date(cursor);
            ci.setHours(9, 0, 0, 0);
            rec.checkIn = { time: ci.toISOString(), status: 'on_time', notes: 'عطلة رسمية' };
            const co = new Date(cursor);
            co.setHours(16, 0, 0, 0);
            rec.checkOut = { time: co.toISOString(), status: 'on_time', notes: 'عطلة رسمية' };
            rec.duration = 7;
            rec.status = 'present';
            rec.isMissing = false;
          } else if (isLeaveDay && lv && !isFri) {
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
  useEffect(() => { if (!isHrEmployee) { loadStats(); } }, [loadStats, isHrEmployee]);
  useEffect(() => { if (!isHrEmployee) { loadRawLogs(); } }, [loadRawLogs, isHrEmployee]);
  useEffect(() => { if (!isHrEmployee) { loadOverrides(); } }, [loadOverrides, isHrEmployee]);
  useEffect(() => { if (!isHrEmployee) { loadFinalAttendance(); } }, [loadFinalAttendance, isHrEmployee]);
  useEffect(() => { if (!isHrEmployee) { loadAdminOverrides(); } }, [loadAdminOverrides, isHrEmployee]);
  useEffect(() => { if (!isHrEmployee) { loadMergeView(); } }, [loadMergeView, isHrEmployee]);

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
      if (!isHrEmployee) loadStats();
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

  // --- MAPPING FUNCTIONS ---
  const loadUnmappedUsers = useCallback(async (showAll) => {
    try {
      const res = await getUnmappedDeviceUsers(showAll);
      if (res.success) setUnmappedDeviceUsers(res.data?.deviceUsers || []);
    } catch { }
  }, []);

  const loadSystemUsers = useCallback(async (search = '') => {
    try {
      const res = await getSystemUsersForMapping(search);
      if (res.success) setSystemUsers(res.data || []);
    } catch { }
  }, []);

  useEffect(() => {
    if (activeTab === 'mapping') {
      loadUnmappedUsers(showAllDeviceUsers);
      loadSystemUsers();
    }
  }, [activeTab, showAllDeviceUsers, loadUnmappedUsers, loadSystemUsers]);

  const handleMapUser = async () => {
    if (!selectedSystemUser || !selectedDeviceUser) { showToast('اختر مستخدم النظام ومعرف الجهاز', 'error'); return; }
    try {
      setMappingLoading(true);
      const res = await mapUserToDevice(selectedSystemUser._id, selectedDeviceUser);
      if (res.success) {
        showToast(res.message);
        setSelectedSystemUser(null);
        setSelectedDeviceUser(null);
        loadUnmappedUsers(showAllDeviceUsers);
        loadSystemUsers(searchUser);
      } else {
        showToast(res.message || 'فشل ربط المستخدم', 'error');
      }
    } catch (err) {
      showToast(err?.userMessage || 'فشل ربط المستخدم', 'error');
    } finally {
      setMappingLoading(false);
    }
  };

  const handleUnmapUser = async (userId) => {
    try {
      const res = await unmapUserFromDevice(userId);
      if (res.success) {
        showToast(res.message);
        loadSystemUsers(searchUser);
        loadUnmappedUsers(showAllDeviceUsers);
      } else {
        showToast(res.message || 'فشل فك الربط', 'error');
      }
    } catch (err) {
      showToast(err?.userMessage || 'فشل فك الربط', 'error');
    }
  };

  const handleBulkMap = async () => {
    if (!bulkMapping.length) { showToast('لا توجد تعيينات', 'error'); return; }
    try {
      setMappingLoading(true);
      const res = await bulkMapUsers(bulkMapping);
      if (res.success) {
        showToast(res.message);
        setBulkMapping([]);
        setShowBulkModal(false);
        loadUnmappedUsers(showAllDeviceUsers);
        loadSystemUsers(searchUser);
      } else {
        showToast(res.message || 'فشل الربط الجماعي', 'error');
      }
    } catch (err) {
      showToast(err?.userMessage || 'فشل الربط الجماعي', 'error');
    } finally {
      setMappingLoading(false);
    }
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
        {visibleTabs.map(tab => (
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
              <button
                onClick={() => downloadAllEmployeesActivityExcel(actStartDate, actEndDate)}
                className="px-4 py-1.5 rounded-md bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
              >
                📥 Excel كل الموظفين
              </button>
              {activityData.length > 0 && (
                <>
                  <FilterLabel>فلتر</FilterLabel>
                  <FilterSelect value={actFilter} onChange={e => setActFilter(e.target.value)}>
                    <option value="all">الكل</option>
                    <option value="absent">أيام الغياب</option>
                    <option value="missing">ساعات ناقصة</option>
                    <option value="compensated">إجازات مبررة</option>
                    <option value="unexcused">إجازات غير مبررة</option>
                    <option value="holidays">أيام العطل</option>
                  </FilterSelect>
                  <button
                    onClick={() => downloadEmployeeActivityExcel(actEmployeeId, actStartDate, actEndDate)}
                    className="px-4 py-1.5 rounded-md bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                  >
                    📥 موظف واحد
                  </button>
                </>
              )}
            </Filters>
            {(() => {
              const filteredData = activityData.filter(r => {
                if (actFilter === 'all') return true;
                if (actFilter === 'holidays') return !!(r._isHoliday || r._isWeeklyHoliday);
                if (r._isWeeklyHoliday || r._isHoliday) return false;
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
                : <div className="max-h-[70vh] overflow-y-auto overflow-x-auto rounded-b-lg"><table className="w-full text-sm"><thead className="sticky top-0 z-10 bg-gray-800"><tr className="bg-gray-800">
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">#</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">التاريخ</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">اليوم</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">أول دخول</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">آخر خروج</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">المدة</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">الحالة</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">تأخر الدخول</th>
                  <th className="text-right p-3 text-xs text-gray-400 font-medium">خروج مبكر</th>
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
                    const holiday = r._isHoliday;
                    const leaveTypeLabel = compensated?.type ? {
                      annual: 'سنوية', sick: 'مرضية', emergency: 'طارئة',
                      exceptional: 'استثنائية', death: 'وفاة', unpaid: 'بدون راتب',
                      maternity: 'وضع', paternity: 'أبوة', compensatory: 'تعويضية',
                      hourly: 'ساعية', mission: 'مأمورية', overtime: 'أجر إضافي',
                      attendance_correction: 'تصحيح بصمة', fingerprint_forgotten: 'نسيان بصمة'
                    }[compensated.type] || compensated.type : null;
                    if (r._isWeeklyHoliday) {
                      notes = '📅 عطلة أسبوعية - الجمعة';
                      rowBg = 'bg-blue-400/15';
                      statusDisplay = null;
                    } else if (holiday) {
                      notes = `🏖️ عطلة رسمية - ${holiday.name || ''}`;
                      rowBg = 'bg-red-600/20 border-r-4 border-r-red-500';
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
                    const rawLate = hasCheckIn ? calcMinutesDiff(r.checkIn.time, 9, 0) : null;
                    const lateArrival = rawLate != null ? Math.max(0, rawLate) : null;
                    const rawEarly = hasCheckOut ? calcMinutesDiff(r.checkOut.time, 16, 0) : null;
                    const earlyDeparture = rawEarly != null ? Math.max(0, -rawEarly) : null;
                    const diffClasses = 'text-xs font-medium';
                    return (
                      <tr key={r._id || i} className={`border-t border-gray-800 hover:bg-gray-800/40 ${rowBg}`} style={isFri ? { backgroundColor: 'rgba(236, 72, 153, 0.2)' } : {}}>
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3 whitespace-nowrap">{safeDate(r.date)}</td>
                        <td className="p-3">{getDayName(r.date)}</td>
                        <td className="p-3">{r.checkIn?.time ? safeTime(r.checkIn.time) : '---'}</td>
                        <td className="p-3">{r.checkOut?.time ? safeTime(r.checkOut.time) : '---'}</td>
                        <td className="p-3 font-medium text-blue-400">{r.duration ? `${r.duration.toFixed(1)} س` : (compensated ? '-' : '-')}</td>
                        <td className="p-3">{statusDisplay ? <StatusBadge status={r.status} /> : <span className="text-gray-500">---</span>}</td>
                        <td className={`p-3 ${diffClasses} ${lateArrival > 0 ? 'text-red-400' : 'text-gray-500'}`}>{lateArrival > 0 ? fmtMin(lateArrival) : '---'}</td>
                        <td className={`p-3 ${diffClasses} ${earlyDeparture > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>{earlyDeparture > 0 ? fmtMin(earlyDeparture) : '---'}</td>
                        <td className="p-3">{r.overtime ? `${r.overtime.toFixed(1)} س` : '-'}</td>
                        <td className="p-3 text-xs max-w-[200px]" style={{ color: holiday ? '#ef4444' : compensated ? '#4ade80' : r._isWeeklyHoliday ? '#60a5fa' : r.isMissing ? '#a855f7' : '#fb923c' }}>{notes}</td>
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
                  <StatCard label="أيام الحضور" value={activityData.filter(r => !r.isMissing && r.status !== 'absent' && !r._isWeeklyHoliday && !r._isHoliday).length} color="text-green-400" />
                  <StatCard label="أيام الغياب" value={activityData.filter(r => !r.isMissing && r.status === 'absent' && !r._isWeeklyHoliday && !r._isHoliday).length} color="text-red-400" />
                  <StatCard label="أيام التأخير" value={activityData.filter(r => !r.isMissing && r.status === 'late' && !r._isWeeklyHoliday && !r._isHoliday).length} color="text-yellow-400" />
                  <StatCard label="أيام معوضة بإجازة" value={activityData.filter(r => r._compensatedByLeave && !r._isWeeklyHoliday && !r._isHoliday).length} color="text-green-400" />
                  <StatCard label="عطل رسمية" value={activityData.filter(r => r._isHoliday).length} color="text-red-400" />
                  <StatCard label="عطل أسبوعية" value={activityData.filter(r => r._isWeeklyHoliday).length} color="text-blue-400" />
                  <StatCard label="إجمالي ساعات العمل" value={activityData.reduce((s, r) => s + (r.isMissing || r._isWeeklyHoliday ? 0 : (r.duration || (r._isHoliday ? 7 : 0))), 0).toFixed(1)} color="text-blue-400" />
                  <StatCard label="إجمالي الإضافي" value={activityData.reduce((s, r) => s + (r.isMissing || r._isWeeklyHoliday || r._isHoliday ? 0 : (r.overtime || 0)), 0).toFixed(1)} color="text-purple-400" />
                </div>
                <h4 className="text-sm font-semibold text-orange-400 mb-3 mt-4">⚠️ حالات البصمات الناقصة</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="نقص بصمة دخول" value={activityData.filter(r => !r.isMissing && !r._isWeeklyHoliday && !r._isHoliday && !r.checkIn?.time).length} color="text-orange-400" />
                  <StatCard label="نقص بصمة خروج" value={activityData.filter(r => !r.isMissing && !r._isWeeklyHoliday && !r._isHoliday && !r.checkOut?.time).length} color="text-orange-400" />
                  <StatCard label="نقص البصمتين معاً" value={activityData.filter(r => !r.isMissing && !r._isWeeklyHoliday && !r._isHoliday && !r.checkIn?.time && !r.checkOut?.time).length} color="text-red-400" />
                  <StatCard label="أيام بدون أي سجل" value={activityData.filter(r => r.isMissing && !r._isWeeklyHoliday && !r._isHoliday).length} color="text-purple-400" />
                </div>
                <h4 className="text-sm font-semibold text-blue-400 mb-3 mt-4">⏱ فروقات وقت الدوام</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(() => {
                    const valid = activityData.filter(r => !r.isMissing && !r._isWeeklyHoliday && !r._isHoliday);
                    const totalLate = valid.reduce((s, r) => {
                      if (!r.checkIn?.time) return s;
                      const m = Math.max(0, calcMinutesDiff(r.checkIn.time, 9, 0));
                      return s + (isNaN(m) ? 0 : m);
                    }, 0);
                    const totalEarly = valid.reduce((s, r) => {
                      if (!r.checkOut?.time) return s;
                      const raw = calcMinutesDiff(r.checkOut.time, 16, 0);
                      const m = Math.max(0, -raw);
                      return s + (isNaN(m) ? 0 : m);
                    }, 0);
                    const totalOvertime = valid.reduce((s, r) => {
                      if (!r.checkOut?.time) return s;
                      const raw = calcMinutesDiff(r.checkOut.time, 16, 0);
                      const m = Math.max(0, raw);
                      return s + (isNaN(m) ? 0 : m);
                    }, 0);
                    return <>
                      <StatCard label="إجمالي تأخر الدخول" value={fmtMin(totalLate)} color="text-red-400" />
                      <StatCard label="إجمالي خروج مبكر" value={fmtMin(totalEarly)} color="text-yellow-400" />
                      <StatCard label="إجمالي إضافي (بعد 4م)" value={fmtMin(totalOvertime)} color="text-green-400" />
                      <StatCard label="صافي الفرق" value={fmtMin(totalOvertime - totalLate - totalEarly)} color="text-blue-400" />
                    </>;
                  })()}
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB: MAPPING */}
        {activeTab === 'mapping' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>👥</span>
                  {showAllDeviceUsers ? 'جميع مستخدمي الجهاز' : 'مستخدمي الجهاز غير المرتبطين'}
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-400">الكل</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={showAllDeviceUsers}
                      onChange={e => setShowAllDeviceUsers(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-600 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-[-16px] transition-transform"></div>
                  </div>
                  <span className="text-xs text-gray-400">غير المرتبطين</span>
                </label>
              </div>
              {unmappedDeviceUsers.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">جميع مستخدمي الجهاز مرتبطون بالفعل</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {unmappedDeviceUsers.map((u, i) => {
                    const devId = String(u.userId || u.user_id || u.id || '');
                    const isMapped = u.isMapped;
                    const mappedTo = u.mappedTo;
                    return (
                      <div key={i}
                        onClick={() => {
                          if (!isMapped) setSelectedDeviceUser(devId);
                        }}
                        className={`p-3 rounded-lg border transition-colors ${
                          isMapped
                            ? 'border-green-800 bg-green-900/20 cursor-default'
                            : selectedDeviceUser === devId
                              ? 'border-blue-500 bg-blue-900/20 cursor-pointer'
                              : 'border-gray-700 hover:border-gray-600 hover:bg-gray-700/50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{u.name || `مستخدم #${devId}`}</span>
                              <span className="text-xs text-gray-500 shrink-0">معرف: {devId}</span>
                            </div>
                            {isMapped && mappedTo && (
                              <p className="text-xs text-green-400 mt-0.5 flex items-center gap-1">
                                <span>🔗</span>
                                مرتبط بـ: {mappedTo.name} ({mappedTo.email})
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isMapped ? (
                              <span className="text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full">مرتبط</span>
                            ) : (
                              <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded-full">
                                {u.fingerprintCount || u.fingerprints || 0} بصمات
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-5">
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <span className="text-green-400">🔗</span>
                ربط مستخدم النظام بجهاز البصمة
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">البحث عن مستخدم</label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                  <input
                    type="text"
                    value={searchUser}
                    onChange={e => { setSearchUser(e.target.value); loadSystemUsers(e.target.value); }}
                    placeholder="ابحث باسم المستخدم أو البريد الإلكتروني..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pr-10 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {systemUsers.map(u => (
                  <div
                    key={u._id}
                    onClick={() => setSelectedSystemUser(u)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSystemUser?._id === u._id
                        ? 'border-green-500 bg-green-900/20'
                        : 'border-gray-700 hover:border-green-700 hover:bg-green-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">{u.name}</span>
                        <span className="text-xs text-gray-500 mr-2">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.zkUserId ? (
                          <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded-full">
                            مرتبط: {u.zkUserId}
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">غير مرتبط</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{u.department || '-'} · {u.role}</p>
                  </div>
                ))}
                {systemUsers.length === 0 && (
                  <p className="text-sm text-gray-500 py-4 text-center">لا توجد نتائج</p>
                )}
              </div>
              {selectedSystemUser && selectedDeviceUser && (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-sm text-green-400 mb-4">
                  <span className="ml-1">🔗</span>
                  ربط <strong>{selectedSystemUser.name}</strong> ← معرف الجهاز <strong>{selectedDeviceUser}</strong>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleMapUser}
                  disabled={!selectedSystemUser || !selectedDeviceUser || mappingLoading}
                  className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <span>🔗</span>
                  {mappingLoading ? 'جاري الربط...' : 'ربط المستخدم'}
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-4 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <span>👥</span>
                  ربط جماعي
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-gray-800/40 border border-gray-700 rounded-lg p-5">
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <span>📋</span>
                المستخدمين المرتبطين حالياً
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800/60 border-b border-gray-700">
                      <th className="text-right p-3 text-xs font-medium">الموظف</th>
                      <th className="text-right p-3 text-xs font-medium">معرف الجهاز</th>
                      <th className="text-right p-3 text-xs font-medium">القسم</th>
                      <th className="text-right p-3 text-xs font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemUsers.filter(u => u.zkUserId).map((u, i) => (
                      <tr key={u._id || i} className="border-t border-gray-700 hover:bg-gray-700/30">
                        <td className="p-3">
                          <span className="font-medium">{u.name}</span>
                          <span className="text-xs text-gray-500 mr-2">{u.email}</span>
                        </td>
                        <td className="p-3 text-blue-400">{u.zkUserId}</td>
                        <td className="p-3 text-gray-400">{u.department || '-'}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleUnmapUser(u._id)}
                            className="text-xs px-3 py-1.5 bg-red-800/40 text-red-400 rounded-lg hover:bg-red-700/50 transition-colors"
                          >
                            فك الربط
                          </button>
                        </td>
                      </tr>
                    ))}
                    {systemUsers.filter(u => u.zkUserId).length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500">لا يوجد مستخدمين مرتبطين</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* BULK MAPPING MODAL */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[85vh] overflow-y-auto">
              <button onClick={() => setShowBulkModal(false)} className="absolute top-3 left-3 text-gray-500 hover:text-gray-300">
                ✕
              </button>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-blue-400">👥</span>
                ربط جماعي لمستخدمي الجهاز
              </h3>
              <p className="text-sm text-gray-400 mb-4">اختر مستخدم النظام لكل معرف جهاز غير مرتبط</p>
              <div className="space-y-4">
                {unmappedDeviceUsers.filter(du => !du.isMapped).map((du, i) => {
                  const devId = String(du.userId || du.user_id || du.id || '');
                  const existingMapping = bulkMapping.find(m => m.deviceUserId === devId);
                  return (
                    <div key={i} className="p-4 border border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-sm">{du.name || `مستخدم #${devId}`}</span>
                          <span className="text-xs text-gray-500 mr-2">معرف: {devId}</span>
                        </div>
                        <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded-full">
                          {du.fingerprintCount || du.fingerprints || 0} بصمات
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="ابحث عن مستخدم..."
                          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500 transition-colors"
                          onChange={async (e) => {
                            const val = e.target.value;
                            if (val.length > 1) {
                              const res = await getSystemUsersForMapping(val);
                              const users = res.data || [];
                              if (users.length > 0) {
                                const updatedMapping = bulkMapping.filter(m => m.deviceUserId !== devId);
                                updatedMapping.push({ userId: users[0]._id, deviceUserId: devId, userName: users[0].name });
                                setBulkMapping(updatedMapping);
                              }
                            }
                          }}
                        />
                      </div>
                      {existingMapping && (
                        <p className="text-xs text-green-400 mt-1">✓ {existingMapping.userName || 'تم الاختيار'}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleBulkMap}
                  disabled={mappingLoading || !bulkMapping.length}
                  className="flex-1 py-2.5 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <span>🔗</span>
                  {mappingLoading ? 'جاري الربط...' : `ربط ${bulkMapping.length} مستخدم`}
                </button>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-6 py-2.5 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
