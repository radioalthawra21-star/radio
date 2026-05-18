import React, { useState, useEffect } from 'react';
import { getAllAttendanceRecords, getDepartmentAttendance } from '../../services/attendanceService';
import { useDepartments } from '../../hooks/useDepartments';
import Card from '../../components/common/Card';
import { BarChart, PieChart, LineChart } from '../../components/charts';
import StatCard from '../../components/widgets/StatCard';
import { formatNumber, formatCurrency } from '../../utils/analyticsUtils';
import { formatDateArabic } from '../../utils/dateUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { FaSignInAlt, FaSignOutAlt, FaHourglassHalf, FaCalendarAlt } from 'react-icons/fa';

const ATTENDANCE_STATUS_MAP = {
  present: { label: 'حاضر', class: 'bg-green-100 text-green-800 border border-green-200' },
  absent: { label: 'غائب', class: 'bg-red-100 text-red-800 border border-red-200' },
  late: { label: 'متأخر', class: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
  half_day: { label: 'نصف يوم', class: 'bg-orange-100 text-orange-800 border border-orange-200' },
  on_leave: { label: 'في إجازة', class: 'bg-blue-100 text-blue-800 border border-blue-200' },
  work_from_home: { label: 'عمل عن بعد', class: 'bg-purple-100 text-purple-800 border border-purple-200' }
};

const formatTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    : '-';

const AttendanceReports = () => {
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    department: '',
    startDate: '',
    endDate: '',
    period: 'monthly' // daily, weekly, monthly
  });
  const { getDepartmentName, departments: allDepartments } = useDepartments();

  useEffect(() => {
    fetchAttendanceData();
  }, [filter]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch attendance stats
      // Fetch attendance records
      const recordsResponse = await getAllAttendanceRecords(filter);
      if (recordsResponse.success) {
        const records = (recordsResponse.data?.records || []).filter(r => r.employee);
        setAttendanceRecords(records);
        
        // Prepare chart data
        const chartData = prepareChartData(records);
        setChartData(chartData);
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError('فشل في تحميل بيانات الحضور');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (records) => {
    // Group by date and calculate attendance percentage
    const grouped = {};
    
    records.forEach(record => {
      const date = record.date ? new Date(record.date).toISOString().split('T')[0] : 'unknown';
      if (!grouped[date]) {
        grouped[date] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      
      if (record.status === 'present') {
        grouped[date].present++;
      } else if (record.status === 'absent') {
        grouped[date].absent++;
      } else if (record.status === 'late') {
        grouped[date].late++;
      }
      grouped[date].total++;
    });
    
    // Convert to arrays for charting
    const dates = Object.keys(grouped).sort();
    const presentData = dates.map(date => grouped[date].present);
    const absentData = dates.map(date => grouped[date].absent);
    const lateData = dates.map(date => grouped[date].late);
    
    return {
      labels: dates.map(date => formatDateArabic(date)),
      datasets: [
        {
          label: 'حاضر',
          data: presentData,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)'
        },
        {
          label: 'غائب',
          data: absentData,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)'
        },
        {
          label: 'متأخر',
          data: lateData,
          backgroundColor: 'rgba(255, 206, 86, 0.5)',
          borderColor: 'rgba(255, 206, 86, 1)'
        }
      ]
    };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setRtl(true);
    
    // Title
    doc.setFontSize(18);
    doc.text('تقرير الحضور والانصراف', 105, 20, { align: 'center' });
    
    // Date
    doc.setFontSize(12);
    doc.text(`تاريخ التقرير: ${formatDateArabic(new Date())}`, 105, 30, { align: 'center' });
    
    // Stats
    if (attendanceStats) {
      doc.setFontSize(14);
      doc.text('إحصائيات الحضور', 14, 40);
      doc.setFontSize(10);
      let yPos = 50;
      
      const statsLines = [
        `إجمالي الساعات العاملة: ${formatNumber(attendanceStats.totalHours || 0)}`,
        `متوسط الساعات اليومية: ${formatNumber(attendanceStats.averageDailyHours || 0)}`,
        `نسبة الحضور: ${formatNumber(attendanceStats.attendanceRate || 0)}%`,
        `إجمالي الأيام العاملة: ${formatNumber(attendanceStats.totalWorkingDays || 0)}`,
        `إجمالي أيام الغياب: ${formatNumber(attendanceStats.totalAbsentDays || 0)}`,
        `إجمالي أيام التأخير: ${formatNumber(attendanceStats.totalLateDays || 0)}`
      ];
      
      statsLines.forEach(line => {
        doc.text(line, 14, yPos);
        yPos += 7;
      });
    }
    
    // Table
    doc.setRtl(false);
    const tableData = attendanceRecords.map(record => [
      record.employee?.name || '-',
      record.date ? formatDateArabic(record.date) : '-',
      ATTENDANCE_STATUS_MAP[record.status]?.label || record.status || '-',
      record.checkIn?.time ? formatTime(record.checkIn.time) : '-',
      record.checkOut?.time ? formatTime(record.checkOut.time) : '-',
      record.duration ? `${record.duration.toFixed(1)}` : '0',
      record.checkIn?.notes || record.checkOut?.notes || '-'
    ]);
    
    doc.autoTable({
      head: [['الموظف', 'التاريخ', 'الحالة', 'وقت الدخول', 'وقت الخروج', 'الساعات', 'ملاحظات']],
      body: tableData,
      startY: attendanceStats ? 100 : 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' }
    });
    
    doc.save('attendance-report.pdf');
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">تقارير الحضور والانصراف</h1>
        <button onClick={exportToPDF} className="btn btn-primary">
          📥 تصدير PDF
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label">القسم</label>
            <select
              className="input"
              value={filter.department}
              onChange={(e) => setFilter({ ...filter, department: e.target.value })}
            >
              <option value="">الكل</option>
              {allDepartments.map(dept => (
                <option key={dept._id} value={dept.name}>
                  {getDepartmentName(dept.name)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">من تاريخ</label>
            <input
              type="date"
              className="input"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">إلى تاريخ</label>
            <input
              type="date"
              className="input"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilter({ department: '', startDate: '', endDate: '' })}
              className="btn btn-outline w-full"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      {attendanceStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="إجمالي الساعات العاملة"
            value={formatNumber(attendanceStats.totalHours || 0)}
            icon="⏰"
            color="blue"
          />
          <StatCard
            title="متوسط الساعات اليومية"
            value={formatNumber(attendanceStats.averageDailyHours || 0)}
            icon="📊"
            color="green"
            trend={attendanceStats.dailyHoursTrend}
          />
          <StatCard
            title="نسبة الحضور"
            value={`${formatNumber(attendanceStats.attendanceRate || 0)}%`}
            icon="👥"
            color="orange"
            trend={attendanceStats.attendanceRateTrend}
          />
          <StatCard
            title="إجمالي الأيام العاملة"
            value={formatNumber(attendanceStats.totalWorkingDays || 0)}
            icon="📅"
            color="purple"
          />
          <StatCard
            title="إجمالي أيام الغياب"
            value={formatNumber(attendanceStats.totalAbsentDays || 0)}
            icon="❌"
            color="red"
          />
          <StatCard
            title="إجمالي أيام التأخير"
            value={formatNumber(attendanceStats.totalLateDays || 0)}
            icon="⏳"
            color="yellow"
          />
        </div>
      )}

      {/* Charts Section */}
      {chartData && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-dark mb-4">اتجاهات الحضور</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold text-dark mb-4">الحضور اليومي</h3>
              <BarChart 
                data={chartData} 
                options={{ 
                  plugins: { 
                    legend: { position: 'top' },
                    title: { 
                      display: true, 
                      text: 'الحضور اليومي حسب الحالة' 
                    } 
                  } 
                }} 
                width={400} 
                height={300} 
              />
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold text-dark mb-4">نسبة الحضور الأسبوعية</h3>
              {/* Example pie chart for attendance rate */}
              <PieChart
                data={{
                  labels: ['حاضر', 'غائب', 'متأخر'],
                  data: [
                    attendanceStats?.attendanceRate || 0,
                    100 - (attendanceStats?.attendanceRate || 0),
                    Math.max(0, 100 - (attendanceStats?.attendanceRate || 0) - 5) // Simplified late calculation
                  ]
                }}
                width={400}
                height={300}
              />
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold text-dark mb-4">سجلات الحضور</h2>
        {attendanceRecords.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد سجلات حضور</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">الموظف</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">التاريخ</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">الحالة</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">وقت الدخول</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">وقت الخروج</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">الساعات العاملة</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendanceRecords.map((record, index) => {
                  const statusInfo = ATTENDANCE_STATUS_MAP[record.status];
                  return (
                    <tr key={record._id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{record.employee?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                        <span className="date-display inline-flex items-center gap-1.5">
                          <FaCalendarAlt className="text-[10px] text-gray-400" />
                          {record.date ? formatDateArabic(record.date) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusInfo?.class || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {statusInfo?.label || record.status || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {record.checkIn?.time ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">
                            <FaSignInAlt className="text-[10px]" />
                            {formatTime(record.checkIn.time)}
                          </span>
                        ) : <span className="text-gray-400 text-xs">--:--</span>}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {record.checkOut?.time ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                            <FaSignOutAlt className="text-[10px]" />
                            {formatTime(record.checkOut.time)}
                          </span>
                        ) : record.checkIn?.time ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                            لم يسجل خروج
                          </span>
                        ) : <span className="text-gray-400 text-xs">--:--</span>}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {record.checkIn?.time && record.checkOut?.time ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                            <FaHourglassHalf className="text-[10px] text-gray-400" />
                            {record.duration ? `${record.duration.toFixed(1)} س` : '-'}
                          </span>
                        ) : record.checkIn?.time ? (
                          <span className="text-xs text-gray-400">قيد العمل</span>
                        ) : <span className="text-xs text-gray-400">--</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {record.checkIn?.notes || record.checkOut?.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AttendanceReports;