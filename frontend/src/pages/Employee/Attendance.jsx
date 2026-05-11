import { useState, useEffect } from 'react';
import { getTodayAttendance, checkIn, checkOut, getAllAttendanceRecords } from '../../services/attendanceService';
import Card from '../../components/common/Card';

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
    } catch (err) {
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
      const res = await checkIn({
        location: null,
        notes: ''
      });
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

  const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div></div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">الحضور والانصراف</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {message && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{message}</div>}

      <Card className="mb-6 text-center">
        <h2 className="text-lg font-semibold mb-4">اليوم</h2>
        <p className="text-gray-500 mb-2">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

        {!checkedIn ? (
          <button onClick={handleCheckIn} disabled={checking} className="px-8 py-3 bg-green-600 text-white rounded-lg text-lg font-semibold hover:bg-green-700 disabled:opacity-50">
            {checking ? 'جاري...' : 'تسجيل حضور'}
          </button>
        ) : !checkedOut ? (
          <>
            <div className="mb-4">
              <span className="text-green-600 font-semibold">تم تسجيل الحضور</span>
              <p className="text-2xl font-bold text-green-700 mt-1">{formatTime(checkedIn)}</p>
            </div>
            <button onClick={handleCheckOut} disabled={checking} className="px-8 py-3 bg-red-600 text-white rounded-lg text-lg font-semibold hover:bg-red-700 disabled:opacity-50">
              {checking ? 'جاري...' : 'تسجيل انصراف'}
            </button>
          </>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">الحضور</p>
                <p className="text-xl font-bold text-green-700">{formatTime(checkedIn)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">الانصراف</p>
                <p className="text-xl font-bold text-red-700">{formatTime(checkedOut)}</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm">تم تسجيل اليوم بالكامل</p>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">سجل الحضور</h2>
        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-4">لا توجد سجلات سابقة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-right">
                  <th className="p-2 text-sm">التاريخ</th>
                  <th className="p-2 text-sm">الحضور</th>
                  <th className="p-2 text-sm">الانصراف</th>
                  <th className="p-2 text-sm">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r._id || r.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-sm">{r.date ? new Date(r.date).toLocaleDateString('ar-SA') : '-'}</td>
                    <td className="p-2 text-sm">{formatTime(r.checkIn?.time)}</td>
                    <td className="p-2 text-sm">{formatTime(r.checkOut?.time)}</td>
                    <td className="p-2 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        r.status === 'present' ? 'bg-green-100 text-green-700' :
                        r.status === 'absent' ? 'bg-red-100 text-red-700' :
                        r.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {r.status === 'present' ? 'حاضر' :
                         r.status === 'absent' ? 'غائب' :
                         r.status === 'late' ? 'متأخر' :
                         r.status === 'on_leave' ? 'في إجازة' :
                         r.status || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Attendance;
