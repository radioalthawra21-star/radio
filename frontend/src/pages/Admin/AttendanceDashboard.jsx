import { useState, useEffect, useMemo } from 'react';
import {
  FaUsers, FaCheckCircle, FaUserTimes, FaUserClock,
  FaClock, FaCalendarDay, FaCalendarWeek, FaCalendarAlt,
  FaChartBar, FaChartPie, FaSync, FaPlug, FaInfoCircle,
  FaHourglassHalf, FaSignInAlt, FaSignOutAlt
} from 'react-icons/fa';
import { getAttendanceDashboard, syncZKTecoDevice, testZKTecoConnection, getZKTecoStatus } from '../../services/attendanceService';
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

const AttendanceDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [activePeriod, setActivePeriod] = useState('today');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getAttendanceDashboard();
      if (res.success) {
        setData(res.data);
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

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncStatus(null);
      const res = await syncZKTecoDevice();
      setSyncStatus(res);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      setSyncStatus({ success: false, message: err.userMessage || 'فشلت المزامنة' });
    } finally {
      setSyncing(false);
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <FaPlug className="text-gray-500" />
            اختبار جهاز البصمة
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <FaSync className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'جاري المزامنة...' : 'مزامنة جهاز البصمة'}
          </button>
        </div>
      </div>

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
                                {(r.employee?.name || '?').charAt(0)}
                              </div>
                              <span className="font-medium text-dark">{r.employee?.name || '-'}</span>
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
        </>
      )}
    </div>
  );
};

export default AttendanceDashboard;
