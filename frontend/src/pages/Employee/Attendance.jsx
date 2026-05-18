import { useState, useEffect, useMemo } from 'react';
import {
  FaClock, FaCheckCircle, FaSignInAlt, FaSignOutAlt, FaCalendarAlt, FaHistory,
  FaUserCheck, FaUserTimes, FaUserClock, FaHome, FaInfoCircle,
  FaCheck, FaTimes, FaCircle
} from 'react-icons/fa';
import { getTodayAttendance, checkIn, checkOut, getAllAttendanceRecords } from '../../services/attendanceService';

const STATUS_MAP = {
  present: { label: 'حاضر', color: 'text-green-600', bg: 'bg-green-50', icon: FaUserCheck, dot: 'bg-green-500' },
  absent: { label: 'غائب', color: 'text-red-600', bg: 'bg-red-50', icon: FaUserTimes, dot: 'bg-red-500' },
  late: { label: 'متأخر', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: FaUserClock, dot: 'bg-yellow-500' },
  on_leave: { label: 'في إجازة', color: 'text-blue-600', bg: 'bg-blue-50', icon: FaHome, dot: 'bg-blue-500' },
  work_from_home: { label: 'عمل عن بعد', color: 'text-purple-600', bg: 'bg-purple-50', icon: FaHome, dot: 'bg-purple-500' },
};

const Attendance = () => {
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [todayRes, historyRes] = await Promise.all([
        getTodayAttendance(),
        getAllAttendanceRecords({ limit: 20 })
      ]);
      if (todayRes.success) setTodayRecord(todayRes.data?.attendance || todayRes.data || null);
      if (historyRes.success) setHistory(historyRes.data?.records || []);
    } catch {
      setError('فشل تحميل بيانات الحضور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCheckIn = async () => {
    try {
      setChecking(true);
      setError('');
      setMessage('');
      const res = await checkIn({ location: null, notes: '' });
      if (res.success) {
        setMessage('تم تسجيل الحضور بنجاح');
        loadData();
      } else {
        setError(res.message || 'فشل تسجيل الحضور');
      }
    } catch (err) {
      setError(err.userMessage || 'حدث خطأ في الاتصال');
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setChecking(true);
      setError('');
      setMessage('');
      const res = await checkOut();
      if (res.success) {
        setMessage('تم تسجيل الانصراف بنجاح');
        loadData();
      } else {
        setError(res.message || 'فشل تسجيل الانصراف');
      }
    } catch (err) {
      setError(err.userMessage || 'حدث خطأ في الاتصال');
    } finally {
      setChecking(false);
    }
  };

  const checkedIn = todayRecord?.checkIn?.time;
  const checkedOut = todayRecord?.checkOut?.time;

  const formatTime = (iso) =>
    iso
      ? new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      : '-';

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : '';

  const workDuration = useMemo(() => {
    if (!checkedIn) return null;
    const start = new Date(checkedIn);
    const end = checkedOut ? new Date(checkedOut) : new Date();
    const diff = Math.floor((end - start) / (1000 * 60));
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}s ${minutes}د`;
  }, [checkedIn, checkedOut]);

  const stats = useMemo(() => {
    const total = history.length;
    if (!total) return { present: 0, absent: 0, late: 0, rate: 0 };
    const present = history.filter((r) => r.status === 'present').length;
    const absent = history.filter((r) => r.status === 'absent').length;
    const late = history.filter((r) => r.status === 'late').length;
    return {
      present,
      absent,
      late,
      rate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
    };
  }, [history]);

  const CurrentStatusIcon = todayRecord?.status ? STATUS_MAP[todayRecord.status]?.icon || FaClock : FaClock;

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>جاري تحميل بيانات الحضور...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(205, 111, 19, 0.1)', color: '#CD6F13' }}>
            <FaClock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#182E4E' }}>الحضور والانصراف</h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>{formatDate(new Date().toISOString())}</p>
          </div>
        </div>
        {todayRecord?.status && (
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 ${
            STATUS_MAP[todayRecord.status]?.bg || 'bg-gray-100'
          } ${STATUS_MAP[todayRecord.status]?.color || 'text-gray-600'}`}>
            <FaCircle className={`w-2 h-2 ${STATUS_MAP[todayRecord.status]?.dot || 'bg-gray-500'}`} />
            {STATUS_MAP[todayRecord.status]?.label || todayRecord.status}
          </span>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
          <FaTimes className="w-4 h-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {message && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-6">
          <FaCheck className="w-4 h-4 shrink-0" />
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-100 text-green-600">
            <FaUserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs" style={{ color: '#6B7280' }}>أيام الحضور</p>
            <p className="text-xl font-bold" style={{ color: '#182E4E' }}>{stats.present}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-yellow-100 text-yellow-600">
            <FaUserClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs" style={{ color: '#6B7280' }}>أيام التأخير</p>
            <p className="text-xl font-bold" style={{ color: '#182E4E' }}>{stats.late}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-100 text-red-600">
            <FaUserTimes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs" style={{ color: '#6B7280' }}>أيام الغياب</p>
            <p className="text-xl font-bold" style={{ color: '#182E4E' }}>{stats.absent}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${
            stats.rate >= 80 ? 'bg-green-100 text-green-600' :
            stats.rate >= 50 ? 'bg-yellow-100 text-yellow-600' :
            'bg-red-100 text-red-600'
          }`}>
            <FaInfoCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs" style={{ color: '#6B7280' }}>نسبة الحضور</p>
            <p className="text-xl font-bold" style={{ color: '#182E4E' }}>{stats.rate}%</p>
          </div>
        </div>
      </div>

      {/* Today Card */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="flex items-center gap-2 text-lg font-bold mb-6" style={{ color: '#182E4E' }}>
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(28, 149, 164, 0.1)', color: '#1C95A4' }}>
            <FaCalendarAlt className="w-4 h-4" />
          </div>
          سجل اليوم
        </h2>

        <div className="flex flex-col items-center justify-center py-6">
          <div className={`p-5 rounded-full mb-4 ${checkedIn ? (checkedOut ? 'bg-green-100' : 'bg-yellow-100') : 'bg-gray-100'}`}>
            <CurrentStatusIcon className={`w-10 h-10 ${checkedIn ? (checkedOut ? 'text-green-600' : 'text-yellow-600') : 'text-gray-400'}`} />
          </div>

          <p className="mb-1" style={{ color: '#6B7280' }}>
            {!checkedIn
              ? 'لم يتم تسجيل الحضور بعد'
              : checkedOut
              ? 'تم تسجيل اليوم بالكامل'
              : 'مسجل حضور - بانتظار الانصراف'}
          </p>

          {checkedIn && !checkedOut && (
            <div className="flex items-center gap-3 mt-2 mb-6">
              <span className="text-3xl font-bold" style={{ color: '#182E4E' }}>{formatTime(checkedIn)}</span>
              {workDuration && (
                <span className="text-sm" style={{ color: '#9CA3AF' }}>({workDuration})</span>
              )}
            </div>
          )}

          {checkedIn && checkedOut && (
            <div className="flex items-center gap-6 mb-6">
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: '#6B7280' }}>الحضور</p>
                <p className="text-xl font-bold text-green-600">{formatTime(checkedIn)}</p>
              </div>
              <div className="w-px h-10" style={{ backgroundColor: '#E5E7EB' }} />
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: '#6B7280' }}>الانصراف</p>
                <p className="text-xl font-bold text-red-600">{formatTime(checkedOut)}</p>
              </div>
              <div className="w-px h-10" style={{ backgroundColor: '#E5E7EB' }} />
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: '#6B7280' }}>المدة</p>
                <p className="text-xl font-bold" style={{ color: '#1C95A4' }}>{workDuration}</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-2">
            {!checkedIn ? (
              <button
                onClick={handleCheckIn}
                disabled={checking}
                className="px-8 py-3.5 text-white rounded-xl font-bold text-lg shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-2"
                style={{ backgroundColor: '#16A34A' }}
              >
                <FaSignInAlt className="w-4 h-4" />
                {checking ? 'جاري...' : 'تسجيل حضور'}
              </button>
            ) : !checkedOut ? (
              <button
                onClick={handleCheckOut}
                disabled={checking}
                className="px-8 py-3.5 text-white rounded-xl font-bold text-lg shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-2"
                style={{ backgroundColor: '#DC2626' }}
              >
                <FaSignOutAlt className="w-4 h-4" />
                {checking ? 'جاري...' : 'تسجيل انصراف'}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-6 py-3 rounded-xl">
                <FaCheckCircle className="w-5 h-5" />
                <span className="font-semibold">اكتمل تسجيل اليوم</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="flex items-center gap-2 text-lg font-bold mb-0" style={{ color: '#182E4E' }}>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(205, 111, 19, 0.1)', color: '#CD6F13' }}>
              <FaHistory className="w-4 h-4" />
            </div>
            سجل الحضور السابق
          </h2>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <FaHistory className="w-12 h-12 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
            <p style={{ color: '#6B7280' }}>لا توجد سجلات سابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#182E4E' }}>
                  <th className="px-4 py-3 text-white font-semibold text-xs text-right whitespace-nowrap">التاريخ</th>
                  <th className="px-4 py-3 text-white font-semibold text-xs text-right whitespace-nowrap">الحضور</th>
                  <th className="px-4 py-3 text-white font-semibold text-xs text-right whitespace-nowrap">الانصراف</th>
                  <th className="px-4 py-3 text-white font-semibold text-xs text-right whitespace-nowrap">المدة</th>
                  <th className="px-4 py-3 text-white font-semibold text-xs text-right whitespace-nowrap">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => {
                  const statusInfo = STATUS_MAP[r.status] || { label: r.status || '-', color: 'text-gray-600', bg: 'bg-gray-50', icon: FaClock, dot: 'bg-gray-500' };
                  const StatusIcon = statusInfo.icon;
                  const start = r.checkIn?.time ? new Date(r.checkIn.time) : null;
                  const end = r.checkOut?.time ? new Date(r.checkOut.time) : null;
                  let duration = '-';
                  if (start && end) {
                    const diff = Math.floor((end - start) / (1000 * 60));
                    duration = `${Math.floor(diff / 60)}s ${diff % 60}د`;
                  }
                  return (
                    <tr key={r._id || r.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 align-middle">
                        <span className="flex items-center gap-2 font-medium">
                          <FaCalendarAlt className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                          {r.date ? new Date(r.date).toLocaleDateString('ar-SA') : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="font-semibold text-green-700">{formatTime(r.checkIn?.time)}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="font-semibold text-red-700">{formatTime(r.checkOut?.time)}</span>
                      </td>
                      <td className="px-4 py-3 align-middle" style={{ color: '#1C95A4' }}>
                        <span className="font-medium">{duration}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Attendance;
