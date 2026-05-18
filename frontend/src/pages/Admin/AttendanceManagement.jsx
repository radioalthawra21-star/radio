import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaUser, FaBuilding, FaFilter, FaChevronLeft,
  FaChevronRight, FaEdit, FaUsers, FaClock,
  FaSignInAlt, FaSignOutAlt, FaHourglassHalf, FaChartBar
} from 'react-icons/fa';
import { getAllAttendanceRecords, updateAttendanceRecord } from '../../services/attendanceService';
import { getAllEmployees } from '../../services/userService';
import { getStoredUser } from '../../services/authService';
import Card from '../../components/common/Card';
import { formatDateArabic } from '../../utils/dateUtils';
import { BarChart, PieChart, LineChart } from '../../components/charts';
import StatCard from '../../components/widgets/StatCard';
import { formatNumber } from '../../utils/analyticsUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const ATTENDANCE_STATUS_MAP = {
  present: { label: 'حاضر', class: 'bg-green-100 text-green-800 border border-green-200' },
  absent: { label: 'غائب', class: 'bg-red-100 text-red-800 border border-red-200' },
  late: { label: 'متأخر', class: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
  half_day: { label: 'نصف يوم', class: 'bg-orange-100 text-orange-800 border border-orange-200' },
  on_leave: { label: 'في إجازة', class: 'bg-blue-100 text-blue-800 border border-blue-200' },
  work_from_home: { label: 'عمل عن بعد', class: 'bg-purple-100 text-purple-800 border border-purple-200' }
};

const filterFields = [
  { key: 'employee', label: 'الموظف', icon: FaUser, type: 'select' },
  { key: 'department', label: 'القسم', icon: FaBuilding, type: 'select' },
  { key: 'status', label: 'الحالة', icon: FaFilter, type: 'select' },
];

const tabs = [
  { id: 'records', label: 'السجلات' },
  { id: 'reports', label: 'التقارير' },
];

const AttendanceManagement = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('records');
  const [chartData, setChartData] = useState(null);

  const [filters, setFilters] = useState({
    start: '',
    end: '',
    employee: 'all',
    status: 'all',
    department: 'all'
  });

  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [attendanceRes, employeesRes] = await Promise.all([
        getAllAttendanceRecords({
          startDate: filters.start,
          endDate: filters.end,
          employeeId: filters.employee !== 'all' ? filters.employee : undefined
        }),
        getAllEmployees()
      ]);

      if (attendanceRes.success) {
        setAttendanceRecords(attendanceRes.data.records || []);
      } else {
        setError('فشل في تحميل بيانات الحضور');
      }

      if (employeesRes.success) {
        setEmployees(employeesRes.data.employees || []);
      }
    } catch (err) {
      console.error('Error loading attendance:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [filters.start, filters.end, filters.employee]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (activeTab === 'reports' && attendanceRecords.length) {
      setChartData(prepareChartData(attendanceRecords));
    }
  }, [activeTab, attendanceRecords]);

  const prepareChartData = (records) => {
    const grouped = {};
    records.forEach(record => {
      const date = record.date ? new Date(record.date).toISOString().split('T')[0] : 'unknown';
      if (!grouped[date]) {
        grouped[date] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      if (record.status === 'present') grouped[date].present++;
      else if (record.status === 'absent') grouped[date].absent++;
      else if (record.status === 'late') grouped[date].late++;
      grouped[date].total++;
    });

    const dates = Object.keys(grouped).sort();
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const labels = dates.map(date => {
      const [y, m] = date.split('-').map(Number);
      return `${monthNames[m - 1]} ${y}`;
    });

    return {
      labels,
      datasets: [
        { label: 'حاضر', data: dates.map(d => grouped[d].present), backgroundColor: 'rgba(75, 192, 192, 0.5)', borderColor: 'rgba(75, 192, 192, 1)' },
        { label: 'غائب', data: dates.map(d => grouped[d].absent), backgroundColor: 'rgba(255, 99, 132, 0.5)', borderColor: 'rgba(255, 99, 132, 1)' },
        { label: 'متأخر', data: dates.map(d => grouped[d].late), backgroundColor: 'rgba(255, 206, 86, 0.5)', borderColor: 'rgba(255, 206, 86, 1)' },
      ]
    };
  };

  const computeStats = (records) => {
    if (!records.length) return null;
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const halfDay = records.filter(r => r.status === 'half_day').length;
    const onLeave = records.filter(r => r.status === 'on_leave').length;
    const totalHours = records.reduce((sum, r) => sum + (r.duration || 0), 0);
    const avgHours = totalHours / total;
    const attendanceRate = ((present + halfDay) / total * 100).toFixed(1);
    return { total, present, absent, late, halfDay, onLeave, totalHours, avgHours, attendanceRate };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setRtl(true);
    doc.setFontSize(18);
    doc.text('تقرير الحضور والانصراف', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, 105, 30, { align: 'center' });

    const stats = computeStats(attendanceRecords);
    if (stats) {
      doc.setFontSize(14);
      doc.text('إحصائيات الحضور', 14, 40);
      doc.setFontSize(10);
      let yPos = 50;
      const statsLines = [
        `إجمالي السجلات: ${formatNumber(stats.total)}`,
        `حاضر: ${formatNumber(stats.present)}`,
        `غائب: ${formatNumber(stats.absent)}`,
        `متأخر: ${formatNumber(stats.late)}`,
        `إجمالي الساعات: ${formatNumber(stats.totalHours.toFixed(1))}`,
        `متوسط الساعات: ${formatNumber(stats.avgHours.toFixed(1))}`,
        `نسبة الحضور: ${stats.attendanceRate}%`,
      ];
      statsLines.forEach(line => { doc.text(line, 14, yPos); yPos += 7; });
    }

    doc.setRtl(false);
    const tableData = attendanceRecords.slice(0, 100).map(record => [
      record.employee?.name || '-',
      record.date ? formatDateArabic(record.date) : '-',
      ATTENDANCE_STATUS_MAP[record.status]?.label || record.status || '-',
      record.checkIn?.time ? formatTimeFn(record.checkIn.time) : '-',
      record.checkOut?.time ? formatTimeFn(record.checkOut.time) : '-',
      record.duration ? `${record.duration.toFixed(1)}` : '0',
    ]);

    doc.autoTable({
      head: [['الموظف', 'التاريخ', 'الحالة', 'وقت الدخول', 'وقت الخروج', 'الساعات']],
      body: tableData,
      startY: stats ? 95 : 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' }
    });

    doc.save('attendance-report.pdf');
  };

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const employeeMap = useMemo(() => {
    const map = new Map();
    employees.forEach(e => map.set(e._id, e));
    return map;
  }, [employees]);

  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach(e => e.department && set.add(e.department));
    return [...set];
  }, [employees]);

  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(r => {
      const empId = r.employee?._id || r.employee;
      if (!r.employee || !empId) return false;
      const emp = employeeMap.get(empId);
      if (!emp) return false;

      if (filters.employee !== 'all' && empId !== filters.employee) return false;
      if (filters.status !== 'all' && r.status !== filters.status) return false;

      if (filters.department !== 'all') {
        if (emp.department !== filters.department) return false;
      }

      return true;
    });
  }, [attendanceRecords, filters, employeeMap]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = filteredRecords.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const openEditModal = (record) => {
    setEditRecord(record);
    setEditForm({ status: record.status || 'present', notes: record.notes || '' });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditRecord(null);
    setEditForm({ status: '', notes: '' });
  };

  const handleEditSave = async () => {
    if (!editRecord?._id) return;
    setSaving(true);
    try {
      const res = await updateAttendanceRecord(editRecord._id, editForm);
      if (res.success) {
        setAttendanceRecords(prev =>
          prev.map(r => r._id === editRecord._id ? { ...r, status: editForm.status, notes: editForm.notes } : r)
        );
        closeEditModal();
      } else {
        alert(res.message || 'فشل في تحديث السجل');
      }
    } catch {
      alert('حدث خطأ في تحديث سجل الحضور');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = ATTENDANCE_STATUS_MAP[status] || { label: status, class: 'bg-gray-100 text-gray-800 border border-gray-200' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${config.class}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {config.label}
      </span>
    );
  };

  const formatTimeFn = (iso) =>
    iso
      ? new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      : '-';

  const renderSelect = (key, label, Icon, options) => (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
        <Icon className="text-[10px] text-primary" />
        {label}
      </label>
      <select
        value={filters[key]}
        onChange={(e) => updateFilter(key, e.target.value)}
        className="input text-sm w-full"
      >
        {options}
      </select>
    </div>
  );

  const reportStats = computeStats(attendanceRecords);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">جاري تحميل بيانات الحضور...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-full" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
            <FaClock className="text-primary" />
            إدارة الحضور
          </h1>
          <p className="text-sm text-gray-500 mt-1">سجل حضور وانصراف الموظفين</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FaUsers className="text-primary" />
            <span>إجمالي السجلات: <strong className="text-dark">{filteredRecords.length.toLocaleString('ar-SA')}</strong></span>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex gap-4 mb-4 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.icon && <span className="ml-1">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'records' && (
          <>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <FaFilter className="text-primary text-sm" />
              <h2 className="text-sm font-bold text-dark">فلترة البحث</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                  <FaCalendarAlt className="text-[10px] text-primary" />
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={filters.start}
                  onChange={(e) => updateFilter('start', e.target.value)}
                  className="input text-sm w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                  <FaCalendarAlt className="text-[10px] text-primary" />
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={filters.end}
                  onChange={(e) => updateFilter('end', e.target.value)}
                  className="input text-sm w-full"
                />
              </div>

              {renderSelect('employee', 'الموظف', FaUser,
                <>
                  <option value="all">جميع الموظفين</option>
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{e.name}</option>
                  ))}
                </>
              )}

              {renderSelect('status', 'الحالة', FaFilter,
                <>
                  <option value="all">جميع الحالات</option>
                  {Object.entries(ATTENDANCE_STATUS_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </>
              )}

              {renderSelect('department', 'القسم', FaBuilding,
                <>
                  <option value="all">جميع الأقسام</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </>
              )}
            </div>

            {(filters.start || filters.end || filters.employee !== 'all' || filters.status !== 'all' || filters.department !== 'all') && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <span className="text-xs text-gray-400">فلاتر نشطة:</span>
                {filters.start && <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">{filters.start}</span>}
                {filters.end && <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">{filters.end}</span>}
                {filters.employee !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    {employees.find(e => e._id === filters.employee)?.name || 'موظف'}
                  </span>
                )}
                {filters.status !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    {ATTENDANCE_STATUS_MAP[filters.status]?.label}
                  </span>
                )}
                {filters.department !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    {filters.department}
                  </span>
                )}
                <button
                  onClick={() => setFilters({ start: '', end: '', employee: 'all', status: 'all', department: 'all' })}
                  className="text-xs text-primary hover:underline mr-auto"
                >
                  مسح الكل
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {activeTab === 'reports' ? (
        <>
          {reportStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
              <StatCard title="إجمالي السجلات" value={formatNumber(reportStats.total)} icon="📋" color="blue" />
              <StatCard title="حاضر" value={formatNumber(reportStats.present)} icon="✅" color="green" />
              <StatCard title="غائب" value={formatNumber(reportStats.absent)} icon="❌" color="red" />
              <StatCard title="متأخر" value={formatNumber(reportStats.late)} icon="⏳" color="orange" />
              <StatCard title="نصف يوم" value={formatNumber(reportStats.halfDay)} icon="🕐" color="purple" />
              <StatCard title="إجمالي الساعات" value={formatNumber(reportStats.totalHours.toFixed(1))} icon="⏰" color="teal" />
              <StatCard title="نسبة الحضور" value={`${reportStats.attendanceRate}%`} icon="👥" color="yellow" />
            </div>
          )}

          {chartData && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4">تحليلات الحضور</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-bold mb-4">توزيع الحضور حسب الحالة</h3>
                  <BarChart
                    data={chartData}
                    options={{ plugins: { legend: { position: 'top' }, title: { display: true, text: 'الحضور حسب الحالة' } } }}
                    width={400}
                    height={300}
                  />
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-bold mb-4">نسبة الحضور</h3>
                  <PieChart
                    data={{
                      labels: ['حاضر', 'غائب', 'متأخر', 'نصف يوم'],
                      data: [reportStats?.present || 0, reportStats?.absent || 0, reportStats?.late || 0, reportStats?.halfDay || 0]
                    }}
                    width={400}
                    height={300}
                  />
                </div>
              </div>
            </div>
          )}

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">سجلات الحضور</h2>
              <button onClick={exportToPDF} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 text-sm font-medium">
                📥 تصدير PDF
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-right p-3 font-bold text-dark text-xs uppercase">الموظف</th>
                    <th className="text-right p-3 font-bold text-dark text-xs uppercase">التاريخ</th>
                    <th className="text-center p-3 font-bold text-dark text-xs uppercase">دخول</th>
                    <th className="text-center p-3 font-bold text-dark text-xs uppercase">خروج</th>
                    <th className="text-center p-3 font-bold text-dark text-xs uppercase">المدة</th>
                    <th className="text-right p-3 font-bold text-dark text-xs uppercase">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceRecords.slice(0, 50).map((r) => (
                    <tr key={r._id || r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {(r.employee?.name || '?').charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-dark">{r.employee?.name || '-'}</div>
                            {employeeMap.get(r.employee?._id || r.employee)?.department && (
                              <div className="text-[11px] text-gray-400">{employeeMap.get(r.employee?._id || r.employee).department}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-600">
                          {r.date ? formatDateArabic(r.date) : '-'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {r.checkIn?.time ? (
                          <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">
                            {formatTimeFn(r.checkIn.time)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">--:--</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {r.checkOut?.time ? (
                          <span className="text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                            {formatTimeFn(r.checkOut.time)}
                          </span>
                        ) : r.checkIn?.time ? (
                          <span className="text-xs text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-100">
                            لم يسجل خروج
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">--:--</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {r.checkIn?.time && r.checkOut?.time ? (
                          <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                            {r.duration ? `${r.duration.toFixed(1)} س` : '-'}
                          </span>
                        ) : r.checkIn?.time ? (
                          <span className="text-xs text-gray-400">قيد العمل</span>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </td>
                      <td className="p-3">{getStatusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          {paginatedRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FaUsers className="text-3xl text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-400 mb-2">لا توجد سجلات حضور</h3>
              <p className="text-sm text-gray-400 text-center max-w-xs">
                لم يتم العثور على أي سجلات حضور للمعايير المحددة. حاول تغيير فلاتر البحث.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-right p-3 font-bold text-dark text-xs uppercase tracking-wider">الموظف</th>
                      <th className="text-right p-3 font-bold text-dark text-xs uppercase tracking-wider">التاريخ</th>
                      <th className="text-center p-3 font-bold text-dark text-xs uppercase tracking-wider">تسجيل الدخول</th>
                      <th className="text-center p-3 font-bold text-dark text-xs uppercase tracking-wider">تسجيل الخروج</th>
                      <th className="text-center p-3 font-bold text-dark text-xs uppercase tracking-wider">المدة</th>
                      <th className="text-right p-3 font-bold text-dark text-xs uppercase tracking-wider">الحالة</th>
                      <th className="text-center p-3 font-bold text-dark text-xs uppercase tracking-wider">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRecords.map((r, idx) => (
                      <tr key={r._id || r.id} className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {(r.employee?.name || '?').charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-dark">{r.employee?.name || '-'}</div>
                              {employeeMap.get(r.employee?._id || r.employee)?.department && (
                                <div className="text-[11px] text-gray-400">{employeeMap.get(r.employee?._id || r.employee).department}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-600">
                            {formatDateArabic(r.date)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {r.checkIn?.time ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">
                              <FaSignInAlt className="text-[10px]" />
                              {formatTimeFn(r.checkIn.time)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">--:--</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r.checkOut?.time ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                              <FaSignOutAlt className="text-[10px]" />
                              {formatTimeFn(r.checkOut.time)}
                            </span>
                          ) : r.checkIn?.time ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                              لم يسجل خروج
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">--:--</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r.checkIn?.time && r.checkOut?.time ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                              <FaHourglassHalf className="text-[10px] text-gray-400" />
                              {r.duration ? `${r.duration.toFixed(1)} س` : (() => {
                                const diff = (new Date(r.checkOut.time) - new Date(r.checkIn.time)) / (1000 * 60 * 60);
                                return `${diff.toFixed(1)} س`;
                              })()}
                            </span>
                          ) : r.checkIn?.time ? (
                            <span className="text-xs text-gray-400">قيد العمل</span>
                          ) : (
                            <span className="text-xs text-gray-400">--</span>
                          )}
                        </td>
                        <td className="p-3">{getStatusBadge(r.status)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => openEditModal(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary bg-secondary/5 border border-secondary/20 rounded-lg hover:bg-secondary/10 hover:border-secondary/30 transition-colors"
                          >
                            <FaEdit className="text-[10px]" />
                            تعديل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    عرض {(page - 1) * itemsPerPage + 1} إلى {Math.min(page * itemsPerPage, filteredRecords.length)} من أصل {filteredRecords.length.toLocaleString('ar-SA')}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <FaChevronRight className="text-[10px]" />
                      السابق
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                      .map((p, idx, arr) => (
                        <span key={p} className="flex items-center">
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="px-1 text-gray-300">•••</span>
                          )}
                          <button
                            onClick={() => setPage(p)}
                            className={`min-w-[32px] h-8 text-xs rounded-lg font-medium transition-colors ${
                              page === p
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                            }`}
                          >
                            {p.toLocaleString('ar-SA')}
                          </button>
                        </span>
                      ))}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      التالي
                      <FaChevronLeft className="text-[10px]" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {editModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeEditModal()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-dark">تعديل سجل الحضور</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="text-xl">✕</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">الموظف</p>
                <p className="font-medium text-dark">{editRecord?.employee?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">التاريخ</p>
                <p className="font-medium text-dark">
                  {editRecord?.date ? formatDateArabic(editRecord.date) : '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">الحالة</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="input text-sm w-full"
                >
                  {Object.entries(ATTENDANCE_STATUS_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ملاحظات</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input text-sm w-full min-h-[80px] resize-none"
                  placeholder="ملاحظات... (اختياري)"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button
                onClick={closeEditModal}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;
