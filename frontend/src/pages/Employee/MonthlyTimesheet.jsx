import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaArrowRight, FaFileAlt, FaPen } from 'react-icons/fa';
import { getMonthlyTimesheet, updateAttendanceRecord } from '../../services/attendanceService';
import { getAllUsers } from '../../services/userService';

const LEAVE_TYPE_LABELS = {
  annual: 'سنوية', sick: 'مرضية', emergency: 'طارئة', exceptional: 'استثنائية',
  death: 'وفاة', unpaid: 'بدون راتب', maternity: 'وضع', paternity: 'أبوة',
  compensatory: 'تعويضية', hourly: 'ساعية', mission: 'مأمورية', overtime: 'أجر إضافي',
  attendance_correction: 'تصحيح بصمة',
};

const STATUS_MAP = {
  present: { label: 'حاضر', color: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
  late: { label: 'متأخر', color: 'text-yellow-700', bg: 'bg-yellow-50', dot: 'bg-yellow-500' },
  absent: { label: 'غائب', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
  half_day: { label: 'نصف يوم', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  on_leave: { label: 'في إجازة', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  work_from_home: { label: 'عمل عن بعد', color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-500' },
  holiday: { label: 'عطلة', color: 'text-white', bg: 'bg-red-600', dot: 'bg-white' },
};

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';

const formatHours = (hours) => {
  if (hours === null || hours === undefined) return '-';
  return hours.toFixed(2);
};

const MonthlyTimesheet = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminOrHr = user.role === 'admin' || user.role === 'hr';
  const employeeIdForQuery = employeeId || user.id;

  const now = new Date();
  const toLocalDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const currentDay = now.getDate();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [startDate, setStartDate] = useState(
    currentDay >= 12
      ? toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 12))
      : toLocalDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 12))
  );
  const [endDate, setEndDate] = useState(
    currentDay >= 12
      ? toLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 12))
      : toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 12))
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeIdForQuery);
  const [employees, setEmployees] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editDay, setEditDay] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', checkInTime: '', checkOutTime: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (isAdminOrHr) {
      getAllUsers().then(res => {
        if (res.success) setEmployees(res.data.users || []);
      }).catch(() => {});
    }
  }, []);

  const loadTimesheet = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getMonthlyTimesheet(selectedEmployeeId, month, year);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'فشل تحميل كشف الحضور');
      }
    } catch (err) {
      setError(err.userMessage || 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimesheet();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadTimesheet();
  };

  const toTimeInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const toISOFromTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [h, m] = timeStr.split(':');
    const d = new Date(dateStr + 'T00:00:00');
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d.toISOString();
  };

  const openEditModal = (day) => {
    setEditDay(day);
    setEditForm({
      status: day.attendanceStatus || 'present',
      checkInTime: toTimeInput(day.firstCheckIn),
      checkOutTime: toTimeInput(day.lastCheckOut),
      notes: '',
    });
  };

  const closeEditModal = () => {
    setEditDay(null);
    setEditSaving(false);
  };

  const handleEditSave = async () => {
    if (!editDay || !editDay.recordId) return;
    setEditSaving(true);
    try {
      const body = { status: editForm.status, notes: editForm.notes || '' };
      if (editForm.checkInTime) {
        body.checkInTime = toISOFromTime(editDay.date, editForm.checkInTime);
      }
      if (editForm.checkOutTime) {
        body.checkOutTime = toISOFromTime(editDay.date, editForm.checkOutTime);
      }
      const res = await updateAttendanceRecord(editDay.recordId, body);
      if (res.success) {
        closeEditModal();
        loadTimesheet();
      } else {
        setError(res.message || 'فشل الحفظ');
      }
    } catch (err) {
      setError(err.userMessage || 'حدث خطأ في الحفظ');
    } finally {
      setEditSaving(false);
    }
  };

  const months = [
    { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' }, { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' }, { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' },
  ];

  const years = [];
  for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 1; y++) {
    years.push(y);
  }

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: '#6B7280' }}>
            <FaArrowRight className="w-5 h-5" />
          </button>
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(28, 149, 164, 0.1)', color: '#1C95A4' }}>
            <FaCalendarAlt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#182E4E' }}>كشف الحضور الشهري</h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>تقرير شهري لسجلات الحضور من جهاز البصمة</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-md p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
        {isAdminOrHr && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>الموظف</label>
            <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              style={{ color: '#182E4E', minWidth: '180px' }}>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name} — {emp.department || ''}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>الشهر</label>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            style={{ color: '#182E4E' }}>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>السنة</label>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            style={{ color: '#182E4E' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>من تاريخ</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            style={{ color: '#182E4E' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>إلى تاريخ</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            style={{ color: '#182E4E' }} />
        </div>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
          <FaFileAlt className="w-4 h-4" />
          {loading ? 'جاري التحميل...' : 'عرض كشف الحضور'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {data && (() => {
        const filteredDays = startDate && endDate
          ? data.daily.filter(day => day.date >= startDate && day.date <= endDate)
          : data.daily;

        const summary = (() => {
          const s = {
            totalWorkingDays: 0, totalAttendanceDays: 0, totalAbsenceDays: 0,
            totalLateDays: 0, totalLateHours: 0, totalEarlyDepartureMinutes: 0,
            totalHolidays: 0, totalWorkedHours: 0, totalOvertimeMinutes: 0
          };
          filteredDays.forEach(day => {
            if (day.isHoliday) s.totalHolidays++;
            else s.totalWorkingDays++;
            if (day.hasRecord) {
              s.totalAttendanceDays++;
              if (day.attendanceStatus === 'late') s.totalLateDays++;
              if (day.lateHours) s.totalLateHours += day.lateHours;
              if (day.earlyDepartureMinutes) s.totalEarlyDepartureMinutes += day.earlyDepartureMinutes;
              if (day.totalWorkedHours) s.totalWorkedHours += day.totalWorkedHours;
              if (day.overtimeMinutes) s.totalOvertimeMinutes += day.overtimeMinutes;
            }
            if (day.attendanceStatus === 'absent') s.totalAbsenceDays++;
          });
          return s;
        })();

        return (<>
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#182E4E' }}>
                  {data.employee.name}
                </h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {data.employee.department || '-'} — {data.employee.jobTitle || ''}
                </p>
              </div>
              <span className="text-sm" style={{ color: '#6B7280' }}>
                {startDate} ← {endDate}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatBox label="أيام العمل" value={summary.totalWorkingDays} color="text-blue-700" bg="bg-blue-50" />
              <StatBox label="أيام الحضور" value={summary.totalAttendanceDays} color="text-green-700" bg="bg-green-50" />
              <StatBox label="أيام الغياب" value={summary.totalAbsenceDays} color="text-red-700" bg="bg-red-50" />
              <StatBox label="أيام التأخير" value={summary.totalLateDays} color="text-yellow-700" bg="bg-yellow-50" />
              <StatBox label="ساعات التأخير" value={formatHours(summary.totalLateHours || 0)} color="text-yellow-700" bg="bg-yellow-50" />
              <StatBox label="خروج مبكر" value={summary.totalEarlyDepartureMinutes + ' د'} color="text-orange-700" bg="bg-orange-50" />
              <StatBox label="العطل" value={summary.totalHolidays} color="text-red-700" bg="bg-red-50" />
              <StatBox label="ساعات العمل" value={formatHours(summary.totalWorkedHours)} color="text-teal-700" bg="bg-teal-50" />
              <StatBox label="ساعات إضافية" value={(summary.totalOvertimeMinutes / 60).toFixed(1) + ' ساعة'} color="text-purple-700" bg="bg-purple-50" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold" style={{ color: '#182E4E' }}>تفاصيل الحضور اليومي</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-responsive-cards">
                <thead>
                  <tr style={{ backgroundColor: '#182E4E' }}>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-right whitespace-nowrap">اليوم</th>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-right whitespace-nowrap">التاريخ</th>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-center whitespace-nowrap">تسجيل الدخول</th>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-center whitespace-nowrap">تسجيل الخروج</th>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-center whitespace-nowrap">ساعات العمل</th>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-center whitespace-nowrap">الحالة</th>
                    {isAdminOrHr && <th className="px-3 py-3 text-white font-semibold text-xs text-center whitespace-nowrap"></th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredDays.map((day) => {
                    const statusInfo = day.attendanceStatus && STATUS_MAP[day.attendanceStatus]
                      ? STATUS_MAP[day.attendanceStatus]
                      : null;
                    return (
                      <tr key={day.date} className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${!day.hasRecord && !day.attendanceStatus ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-2.5 align-middle whitespace-nowrap" data-label="اليوم">
                          <span className="text-xs font-medium" style={{
                            color: day.dayOfWeek === 5 ? '#DC2626' : '#6B7280',
                            fontWeight: day.dayOfWeek === 5 ? 700 : 500
                          }}>
                            {day.dayName} {day.dayOfWeek === 5 ? '‼' : ''}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle whitespace-nowrap" data-label="التاريخ">
                          <span className="font-medium text-xs" style={{
                            color: day.dayOfWeek === 5 ? '#DC2626' : '#182E4E',
                            fontWeight: day.dayOfWeek === 5 ? 700 : 500
                          }}>
                            {new Date(day.date + 'T00:00:00').toLocaleDateString('en-SA', { day: 'numeric', month: 'short' })}
                            {day.isHoliday && <span className="block text-[10px] text-red-600 font-semibold">{day.holidayName}</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center whitespace-nowrap" data-label="تسجيل الدخول">
                          <span className="font-semibold text-xs" style={{ color: day.firstCheckIn ? '#059669' : '#D1D5DB' }}>
                            {day.firstCheckIn ? formatTime(day.firstCheckIn) : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center whitespace-nowrap" data-label="تسجيل الخروج">
                          <span className="font-semibold text-xs" style={{ color: day.lastCheckOut ? '#DC2626' : '#D1D5DB' }}>
                            {day.lastCheckOut ? formatTime(day.lastCheckOut) : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center whitespace-nowrap" data-label="ساعات العمل">
                          <span className="font-medium text-xs" style={{ color: day.totalWorkedHours ? '#1C95A4' : '#D1D5DB' }}>
                            {day.totalWorkedHours ? formatHours(day.totalWorkedHours) : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center whitespace-nowrap" data-label="الحالة">
                          {statusInfo ? (
                            <span className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                              <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                {statusInfo.label}
                              </span>
                              {day.isOnLeave && day.leaveType && (
                                <span className="text-[9px] opacity-75">{LEAVE_TYPE_LABELS[day.leaveType] || day.leaveType}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>—</span>
                          )}
                        </td>
                        {isAdminOrHr && day.hasRecord && (
                          <td className="px-2 py-2.5 align-middle text-center whitespace-nowrap">
                            <button onClick={() => openEditModal(day)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary">
                              <FaPen className="w-3 h-3" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )})()}

      {editDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeEditModal()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold" style={{ color: '#182E4E' }}>تعديل سجل الحضور</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 transition-colors text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">الموظف</p>
                <p className="font-medium" style={{ color: '#182E4E' }}>{data?.employee?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">التاريخ</p>
                <p className="font-medium" style={{ color: '#182E4E' }}>
                  {editDay.date ? new Date(editDay.date + 'T00:00:00').toLocaleDateString('en-SA', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">الحالة</label>
                <select value={editForm.status} onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent">
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">وقت تسجيل الدخول</label>
                <input type="time" value={editForm.checkInTime} onChange={(e) => setEditForm(p => ({ ...p, checkInTime: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">وقت تسجيل الخروج</label>
                <input type="time" value={editForm.checkOutTime} onChange={(e) => setEditForm(p => ({ ...p, checkOutTime: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ملاحظات</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full min-h-[80px] resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="ملاحظات... (اختياري)" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {editSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button onClick={closeEditModal}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatBox = ({ label, value, color, bg }) => (
  <div className={`${bg} rounded-xl p-4 text-center`}>
    <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>{label}</p>
    <p className={`text-lg font-bold ${color}`}>{value}</p>
  </div>
);

export default MonthlyTimesheet;