import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaUser, FaCalendarAlt, FaClock, FaSignInAlt, FaSignOutAlt,
  FaHourglassHalf, FaChartBar, FaArrowRight, FaSearch,
  FaCheckCircle, FaExclamationTriangle, FaInfoCircle,
  FaFilePdf, FaPrint
} from 'react-icons/fa';
import { getEmployeeAttendanceReport } from '../../services/attendanceService';
import { formatNumber } from '../../utils/analyticsUtils';
import { formatDateArabic } from '../../utils/dateUtils';
import Card from '../../components/common/Card';
import StatCard from '../../components/widgets/StatCard';
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

const EmployeeAttendanceReport = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getEmployeeAttendanceReport(employeeId, {
        startDate: filters.startDate,
        endDate: filters.endDate
      });
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'فشل تحميل التقرير');
      }
    } catch (err) {
      setError(err.userMessage || 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [employeeId]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const pieChartData = useMemo(() => {
    if (!data?.summary) return null;
    const s = data.summary;
    return {
      labels: ['حاضر', 'غائب', 'متأخر', 'نصف يوم', 'في إجازة'],
      data: [s.present, s.absent, s.late, s.halfDay, s.onLeave]
    };
  }, [data]);

  const formatDuration = (hours) => {
    if (!hours && hours !== 0) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}s ${m}د`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">جاري تحميل تقرير حضور الموظف...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-center gap-3">
          <FaExclamationTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary hover:underline text-sm flex items-center gap-2">
          <FaArrowRight className="w-3 h-3" /> العودة
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-full" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FaArrowRight className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
              <FaUser className="text-primary" />
              كشف حضور الموظف
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {data?.employee?.name} - {data?.employee?.department || 'بدون قسم'}
              {data?.employee?.jobTitle ? ` | ${data.employee.jobTitle}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <FaPrint className="text-gray-500" /> طباعة
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <FaFilePdf className="w-3.5 h-3.5" /> تصدير PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl border bg-yellow-50 border-yellow-200 text-yellow-700 text-sm flex items-center gap-2">
          <FaInfoCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Card className="mb-6">
        <form onSubmit={handleSearch} className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <FaCalendarAlt className="text-primary" /> من تاريخ
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="input text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <FaCalendarAlt className="text-primary" /> إلى تاريخ
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="input text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <FaSearch className="w-3 h-3" /> بحث
          </button>
        </form>
      </Card>

      {data && data.summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <StatCard title="إجمالي الأيام" value={formatNumber(data.summary.totalDays)} icon="📅" color="blue" />
            <StatCard title="حاضر" value={formatNumber(data.summary.present)} icon="✅" color="green" />
            <StatCard title="غائب" value={formatNumber(data.summary.absent)} icon="❌" color="red" />
            <StatCard title="متأخر" value={formatNumber(data.summary.late)} icon="⏳" color="orange" />
            <StatCard title="إجمالي الساعات" value={formatDuration(data.summary.totalHours)} icon="⏰" color="purple" />
            <StatCard title="نسبة الحضور" value={`${data.summary.attendanceRate}%`} icon="📊" color="teal" />
            <StatCard title="نسبة التأخير" value={`${data.summary.lateRate}%`} icon="⚠️" color="yellow" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-green-500">
              <p className="text-xs text-gray-500 mb-1">متوسط الساعات اليومي</p>
              <p className="text-xl font-bold text-dark">{formatDuration(data.summary.averageHoursPerDay)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-blue-500">
              <p className="text-xs text-gray-500 mb-1">إجمالي ساعات إضافية</p>
              <p className="text-xl font-bold text-dark">{formatDuration(data.summary.totalOvertime)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-yellow-500">
              <p className="text-xs text-gray-500 mb-1">إجمالي دقائق التأخير</p>
              <p className="text-xl font-bold text-dark">{formatNumber(data.summary.totalLateMinutes)} د</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-purple-500">
              <p className="text-xs text-gray-500 mb-1">متوسط التأخير</p>
              <p className="text-xl font-bold text-dark">{formatNumber(data.summary.averageLateMinutes)} د</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {pieChartData && (
              <Card>
                <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                  <FaChartBar className="text-primary" />
                  توزيع حالات الحضور
                </h3>
                {data.summary.totalDays > 0 ? (
                  <div className="flex justify-center">
                    <PieChart
                      data={pieChartData}
                      options={{
                        plugins: {
                          legend: { position: 'bottom', rtl: true },
                        },
                        responsive: true,
                        maintainAspectRatio: true
                      }}
                      width={300}
                      height={300}
                    />
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    <FaInfoCircle className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm">لا توجد بيانات</p>
                  </div>
                )}
              </Card>
            )}

            <Card>
              <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                <FaClock className="text-primary" />
                ملخص الأداء
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">نسبة الحضور</span>
                    <span className="font-bold text-dark">{data.summary.attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${data.summary.attendanceRate}%`,
                        backgroundColor: data.summary.attendanceRate >= 80 ? '#16A34A' : data.summary.attendanceRate >= 50 ? '#EAB308' : '#DC2626'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">نسبة التأخير</span>
                    <span className="font-bold text-dark">{data.summary.lateRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(data.summary.lateRate, 100)}%`,
                        backgroundColor: data.summary.lateRate <= 10 ? '#16A34A' : data.summary.lateRate <= 30 ? '#EAB308' : '#DC2626'
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{formatNumber(data.summary.daysWithCheckOut)}</p>
                    <p className="text-xs text-gray-500">أيام مكتملة</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{formatNumber(data.summary.totalDays - data.summary.daysWithCheckOut)}</p>
                    <p className="text-xs text-gray-500">أيام غير مكتملة</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
              <FaClock className="text-primary" />
              سجل الحضور التفصيلي
            </h3>
            {data.records && data.records.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-right p-3 font-bold text-dark text-xs">التاريخ</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">الحضور</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">الانصراف</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">المدة</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">ساعات إضافية</th>
                      <th className="text-center p-3 font-bold text-dark text-xs">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.records.map((r) => {
                      const statusInfo = ATTENDANCE_STATUS_MAP[r.status] || { label: r.status || '-', color: 'text-gray-600', dot: 'bg-gray-500' };
                      return (
                        <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 text-gray-700 font-medium">
                            <FaCalendarAlt className="inline w-3 h-3 ml-1 text-gray-400" />
                            {formatDateArabic(r.date)}
                          </td>
                          <td className="p-3 text-center">
                            {r.checkIn?.time ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">
                                <FaSignInAlt className="text-[10px]" />
                                {formatTime(r.checkIn.time)}
                              </span>
                            ) : <span className="text-xs text-gray-400">--:--</span>}
                          </td>
                          <td className="p-3 text-center">
                            {r.checkOut?.time ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                                <FaSignOutAlt className="text-[10px]" />
                                {formatTime(r.checkOut.time)}
                              </span>
                            ) : r.checkIn?.time ? (
                              <span className="text-xs text-yellow-600">لم يسجل</span>
                            ) : <span className="text-xs text-gray-400">--:--</span>}
                          </td>
                          <td className="p-3 text-center">
                            {r.checkIn?.time && r.checkOut?.time ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                                <FaHourglassHalf className="text-[10px] text-gray-400" />
                                {r.duration ? formatDuration(r.duration) : (() => {
                                  const diff = (new Date(r.checkOut.time) - new Date(r.checkIn.time)) / (1000 * 60 * 60);
                                  return formatDuration(diff);
                                })()}
                              </span>
                            ) : <span className="text-xs text-gray-400">--</span>}
                          </td>
                          <td className="p-3 text-center">
                            {r.overtime && r.overtime > 0 ? (
                              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                {formatDuration(r.overtime)}
                              </span>
                            ) : <span className="text-xs text-gray-400">--</span>}
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
            ) : (
              <div className="text-center py-12 text-gray-400">
                <FaInfoCircle className="w-12 h-12 mx-auto mb-3" />
                <p>لا توجد سجلات حضور</p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default EmployeeAttendanceReport;
