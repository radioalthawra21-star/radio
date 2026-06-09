import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaArrowRight, FaFileAlt, FaDownload, FaUser } from 'react-icons/fa';
import { getMonthlyTimesheet } from '../../services/attendanceService';
import { getAllUsers } from '../../services/userService';

const STATUS_MAP = {
  present: { label: 'حاضر', color: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
  late: { label: 'متأخر', color: 'text-yellow-700', bg: 'bg-yellow-50', dot: 'bg-yellow-500' },
  absent: { label: 'غائب', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
  half_day: { label: 'نصف يوم', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  on_leave: { label: 'في إجازة', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  work_from_home: { label: 'عمل عن بعد', color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-500' },
};

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';

const formatHours = (hours) => {
  if (hours === null || hours === undefined) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return '0s';
  return m > 0 ? `${h}s ${m}د` : `${h}s`;
};

const MonthlyTimesheet = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminOrHr = user.role === 'admin' || user.role === 'hr';
  const employeeIdForQuery = employeeId || user.id;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeIdForQuery);
  const [employees, setEmployees] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="p-6 max-w-6xl mx-auto">
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

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap items-end gap-4">
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

      {data && (
        <>
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
                {months[month - 1].label} {year}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatBox label="أيام العمل" value={data.summary.totalWorkingDays} color="text-blue-700" bg="bg-blue-50" />
              <StatBox label="أيام الحضور" value={data.summary.totalAttendanceDays} color="text-green-700" bg="bg-green-50" />
              <StatBox label="أيام الغياب" value={data.summary.totalAbsenceDays} color="text-red-700" bg="bg-red-50" />
              <StatBox label="أيام التأخير" value={data.summary.totalLateDays} color="text-yellow-700" bg="bg-yellow-50" />
              <StatBox label="خروج مبكر" value={data.summary.totalEarlyDepartures} color="text-orange-700" bg="bg-orange-50" />
              <StatBox label="ساعات العمل" value={formatHours(data.summary.totalWorkedHours)} color="text-teal-700" bg="bg-teal-50" />
              <StatBox label="ساعات إضافية" value={formatHours(data.summary.totalOvertimeHours)} color="text-purple-700" bg="bg-purple-50" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold" style={{ color: '#182E4E' }}>تفاصيل الحضور اليومي</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#182E4E' }}>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-right whitespace-nowrap">اليوم</th>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-right whitespace-nowrap">التاريخ</th>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-center whitespace-nowrap">تسجيل الدخول</th>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-center whitespace-nowrap">تسجيل الخروج</th>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-center whitespace-nowrap">ساعات العمل</th>
                    <th className="px-3 py-3 text-white font-semibold text-xs text-center whitespace-nowrap">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((day) => {
                    const statusInfo = day.attendanceStatus && STATUS_MAP[day.attendanceStatus]
                      ? STATUS_MAP[day.attendanceStatus]
                      : null;
                    return (
                      <tr key={day.date} className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${!day.hasRecord ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <span className="text-xs font-medium" style={{ color: '#6B7280' }}>{day.dayName}</span>
                        </td>
                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <span className="font-medium text-xs" style={{ color: '#182E4E' }}>
                            {new Date(day.date + 'T00:00:00').toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center whitespace-nowrap">
                          <span className="font-semibold text-xs" style={{ color: day.firstCheckIn ? '#059669' : '#D1D5DB' }}>
                            {day.firstCheckIn ? formatTime(day.firstCheckIn) : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center whitespace-nowrap">
                          <span className="font-semibold text-xs" style={{ color: day.lastCheckOut ? '#DC2626' : '#D1D5DB' }}>
                            {day.lastCheckOut ? formatTime(day.lastCheckOut) : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center whitespace-nowrap">
                          <span className="font-medium text-xs" style={{ color: day.totalWorkedHours ? '#1C95A4' : '#D1D5DB' }}>
                            {day.totalWorkedHours ? formatHours(day.totalWorkedHours) : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center whitespace-nowrap">
                          {statusInfo ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                              {statusInfo.label}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
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