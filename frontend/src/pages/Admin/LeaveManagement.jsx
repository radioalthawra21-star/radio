import { useState, useEffect, useCallback } from 'react';
import { getLeaveRequests, updateLeaveStatus } from '../../services/leaveService';
import { getAllEmployees } from '../../services/userService';
import { getAllDepartments } from '../../services/departmentService';
import Card from '../../components/common/Card';
import { BarChart, PieChart, LineChart } from '../../components/charts';
import StatCard from '../../components/widgets/StatCard';
import { formatNumber } from '../../utils/analyticsUtils';
import { formatDateArabic } from '../../utils/dateUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const leaveTypes = [
  { value: 'annual', label: 'إجازة سنوية' },
  { value: 'sick', label: 'إجازة مرضية' },
  { value: 'exceptional', label: 'إجازة استثنائية' },
  { value: 'death', label: 'إجازة وفاة' },
  { value: 'hourly', label: 'إجازة ساعية' },
  { value: 'emergency', label: 'إجازة طارئة' },
  { value: 'unpaid', label: 'إجازة بدون راتب' },
  { value: 'mission', label: 'مأمورية' },
  { value: 'overtime', label: 'أجر إضافي' },
];

const LEAVE_TYPE_LABELS = {
  annual: 'إجازة سنوية', sick: 'إجازة مرضية', exceptional: 'إجازة استثنائية',
  death: 'إجازة وفاة', hourly: 'إجازة ساعية', emergency: 'إجازة طارئة',
  maternity: 'إجازة وضع', paternity: 'إجازة أبوة', unpaid: 'إجازة بدون راتب',
  compensatory: 'إجازة تعويضية', mission: 'مأمورية', overtime: 'أجر إضافي',
};

const LEAVE_TYPE_ICONS = {
  annual: '🏖️', sick: '🩺', exceptional: '⭐', death: '🕊️', hourly: '⏰',
  emergency: '🚨', maternity: '👶', paternity: '👨‍👧', unpaid: '💼', compensatory: '🔄',
  mission: '📋', overtime: '💰',
};

const STATUS_LABELS = {
  pending_manager: { label: 'بانتظار المدير', color: 'bg-yellow-100 text-yellow-800' },
  pending_general_manager: { label: 'بانتظار المدير العام', color: 'bg-orange-100 text-orange-800' },
  approved: { label: 'تمت الموافقة', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-600' },
};

const tabs = [
  { id: 'pending', label: 'قيد المراجعة' },
  { id: 'approval', label: 'الموافقة' },
  { id: 'approved', label: 'المقبولة' },
  { id: 'rejected', label: 'المرفوضة' },
  { id: 'reports', label: 'التقارير' },
  { id: 'all', label: 'الكل' },
];

const LeaveManagement = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState('');
  const [gmApprovedDays, setGmApprovedDays] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectionModal, setRejectionModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [chartData, setChartData] = useState(null);
  const itemsPerPage = 15;

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUserRole(JSON.parse(stored).role); } catch {}
    }
  }, []);

  const prepareChartData = (records) => {
    const leaveTypeCounts = { annual: 0, sick: 0, emergency: 0, exceptional: 0, death: 0, hourly: 0, unpaid: 0, mission: 0, overtime: 0, other: 0 };
    records.forEach(record => {
      const type = record.type || 'other';
      if (leaveTypeCounts[type] !== undefined) {
        leaveTypeCounts[type]++;
      } else {
        leaveTypeCounts.other++;
      }
    });

    const monthlyData = {};
    records.forEach(record => {
      const date = record.startDate ? new Date(record.startDate) : new Date();
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, approved: 0, rejected: 0, pending: 0 };
      }
      monthlyData[monthKey].total++;
      if (record.status === 'approved') monthlyData[monthKey].approved++;
      else if (record.status === 'rejected') monthlyData[monthKey].rejected++;
      else monthlyData[monthKey].pending++;
    });

    const sortedKeys = Object.keys(monthlyData).sort();
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const months = sortedKeys.map(key => {
      const [year, month] = key.split('-').map(Number);
      return `${monthNames[month - 1]} ${year}`;
    });

    return {
      leaveTypeCounts,
      monthlyTrend: {
        labels: months,
        datasets: [
          { label: 'إجمالي الإجازات', data: months.map((_, i) => monthlyData[sortedKeys[i]].total), backgroundColor: 'rgba(54, 162, 235, 0.5)', borderColor: 'rgba(54, 162, 235, 1)' },
          { label: 'مقبولة', data: months.map((_, i) => monthlyData[sortedKeys[i]].approved), backgroundColor: 'rgba(75, 192, 192, 0.5)', borderColor: 'rgba(75, 192, 192, 1)' },
          { label: 'مرفوضة', data: months.map((_, i) => monthlyData[sortedKeys[i]].rejected), backgroundColor: 'rgba(255, 99, 132, 0.5)', borderColor: 'rgba(255, 99, 132, 1)' },
        ]
      }
    };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setRtl(true);
    doc.setFontSize(18);
    doc.text('تقرير الإجازات', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, 105, 30, { align: 'center' });

    const reportStats = computeReportStats(leaveRequests);
    if (reportStats) {
      doc.setFontSize(14);
      doc.text('إحصائيات الإجازات', 14, 40);
      doc.setFontSize(10);
      let yPos = 50;
      const statsLines = [
        `إجمالي الطلبات: ${formatNumber(reportStats.total)}`,
        `المقبولة: ${formatNumber(reportStats.approved)}`,
        `المرفوضة: ${formatNumber(reportStats.rejected)}`,
        `قيد المراجعة: ${formatNumber(reportStats.pending)}`,
        `إجمالي أيام الإجازة: ${formatNumber(reportStats.totalDays)}`,
        `متوسط أيام الإجازة لكل طلب: ${formatNumber(reportStats.avgDays)}`,
      ];
      statsLines.forEach(line => { doc.text(line, 14, yPos); yPos += 7; });
    }

    doc.setRtl(false);
    const tableData = leaveRequests.map(record => [
      getEmployeeNameFromRecord(record) || '-',
      LEAVE_TYPE_LABELS[record.type] || record.type || '-',
      record.startDate ? formatDateArabic(record.startDate) : '-',
      record.endDate ? formatDateArabic(record.endDate) : '-',
      record.days || '0',
      STATUS_LABELS[record.status]?.label || record.status || '-',
    ]);

    doc.autoTable({
      head: [['الموظف', 'نوع الإجازة', 'من تاريخ', 'إلى تاريخ', 'الأيام', 'الحالة']],
      body: tableData,
      startY: reportStats ? 95 : 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' }
    });

    doc.save('leave-report.pdf');
  };

  const computeReportStats = (records) => {
    if (!records.length) return null;
    const total = records.length;
    const approved = records.filter(r => r.status === 'approved').length;
    const rejected = records.filter(r => r.status === 'rejected').length;
    const pending = records.filter(r => r.status === 'pending_manager' || r.status === 'pending_general_manager').length;
    const totalDays = records.reduce((sum, r) => sum + (r.days || 0), 0);
    const avgDays = totalDays / total;
    return { total, approved, rejected, pending, totalDays, avgDays };
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const params = {
        status: activeTab !== 'all' && activeTab !== 'approval' && activeTab !== 'reports' ? activeTab : undefined,
        employeeId: employeeFilter !== 'all' ? employeeFilter : undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      };
      const [leaveRes, empRes, deptRes] = await Promise.all([
        getLeaveRequests(params),
        getAllEmployees(),
        getAllDepartments(),
      ]);
      if (leaveRes.success) setLeaveRequests(leaveRes.data.requests || leaveRes.data || []);
      if (empRes.success) setEmployees(empRes.data.users || empRes.data.employees || []);
      if (deptRes.success) setDepartments(deptRes.data.departments || []);
    } catch (err) {
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [activeTab, employeeFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'reports' && leaveRequests.length) {
      setChartData(prepareChartData(leaveRequests));
    }
  }, [activeTab, leaveRequests]);

  const handleApprove = async (id, days) => {
    try {
      const body = { status: 'approved' };
      if (days) body.approvedDays = days;
      const res = await updateLeaveStatus(id, body);
      if (res.success) {
        setSuccess(res.message || 'تمت الموافقة');
        setApproveModal(null);
        setGmApprovedDays(null);
        loadData();
      }
    } catch (err) {
      setError(err.userMessage || 'فشل الموافقة');
    }
  };

  const handleReject = async () => {
    if (!rejectionModal) return;
    try {
      const res = await updateLeaveStatus(rejectionModal._id || rejectionModal.id, { status: 'rejected', rejectionReason });
      if (res.success) {
        setSuccess('تم الرفض');
        setRejectionModal(null);
        setRejectionReason('');
        loadData();
      }
    } catch (err) {
      setError(err.userMessage || 'فشل الرفض');
    }
  };

  const handleRejectSimple = async (id) => {
    const reason = prompt('سبب الرفض:');
    if (reason === null) return;
    try {
      const res = await updateLeaveStatus(id, { status: 'rejected', rejectionReason: reason });
      if (res.success) {
        setSuccess('تم الرفض');
        loadData();
      }
    } catch (err) {
      setError(err.userMessage || 'فشل تحديث الحالة');
    }
  };

  const openApproveModal = (req) => {
    setGmApprovedDays(req.managerSuggestedDays || req.days);
    setApproveModal(req);
  };

  const filtered = leaveRequests.filter((r) => {
    if (activeTab === 'approval' && r.status !== 'pending_general_manager') return false;
    if (leaveTypeFilter !== 'all' && r.type !== leaveTypeFilter) return false;
    if (departmentFilter !== 'all') {
      const emp = employees.find((e) => (e._id || e.id) === (r.employee?._id || r.employeeId || r.employee));
      if (!emp || emp.department !== departmentFilter) return false;
    }
    if (searchTerm) {
      const emp = employees.find((e) => (e._id || e.id) === (r.employee?._id || r.employeeId || r.employee));
      const name = emp?.name || '';
      if (!name.includes(searchTerm)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getEmployeeNameFromRecord = (r) => {
    if (r.employee?.name) return r.employee.name;
    const emp = employees.find((e) => (e._id || e.id) === (r.employee?._id || r.employeeId || r.employee));
    return emp?.name || 'غير معروف';
  };

  const getLeaveTypeLabelFn = (type) => {
    return LEAVE_TYPE_LABELS[type] || type;
  };

  const getStatusInfo = (status) => {
    return STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  };

  const canApprove = (status) => {
    return status === 'pending_manager' || status === 'pending_general_manager';
  };

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter((r) => r.status === 'pending_manager').length,
    approval: leaveRequests.filter((r) => r.status === 'pending_general_manager').length,
    approved: leaveRequests.filter((r) => r.status === 'approved').length,
    rejected: leaveRequests.filter((r) => r.status === 'rejected').length,
  };

  const reportStats = computeReportStats(leaveRequests);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const renderTableContent = () => (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-right">
              <th className="p-3">الموظف</th>
              <th className="p-3">النوع</th>
              <th className="p-3">من</th>
              <th className="p-3">إلى</th>
              <th className="p-3">الأيام</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => {
              const statusInfo = getStatusInfo(r.status);
              return (
                <tr key={r._id || r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{getEmployeeNameFromRecord(r)}</td>
                  <td className="p-3">{getLeaveTypeLabelFn(r.type)}</td>
                  <td className="p-3">{r.startDate ? new Date(r.startDate).toLocaleDateString('ar-SA') : '-'}</td>
                  <td className="p-3">{r.endDate ? new Date(r.endDate).toLocaleDateString('ar-SA') : '-'}</td>
                  <td className="p-3">{r.days || 0}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="p-3">
                    {canApprove(r.status) ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(r._id || r.id, null)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                        >
                          قبول
                        </button>
                        <button
                          onClick={() => handleRejectSimple(r._id || r.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                        >
                          رفض
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">السابق</button>
          <span className="px-3 py-1">{currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">التالي</button>
        </div>
      )}
    </>
  );

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">إدارة الإجازات</h1>
        {activeTab === 'reports' && (
          <button onClick={exportToPDF} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 text-sm font-medium">
            📥 تصدير PDF
          </button>
        )}
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      <Card className="mb-6">
        <div className="flex gap-4 mb-4 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label} {tab.id !== 'reports' && `(${stats[tab.id] || 0})`}
            </button>
          ))}
        </div>

        {activeTab !== 'approval' && activeTab !== 'reports' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1">الموظف</label>
                <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="w-full p-2 border rounded">
                  <option value="all">الكل</option>
                  {employees.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">القسم</label>
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="w-full p-2 border rounded">
                  <option value="all">الكل</option>
                  {departments.map((dept) => (
                    <option key={dept._id || dept.id} value={dept._id || dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">نوع الإجازة</label>
                <select value={leaveTypeFilter} onChange={(e) => setLeaveTypeFilter(e.target.value)} className="w-full p-2 border rounded">
                  <option value="all">الكل</option>
                  {leaveTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">بحث</label>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="اسم الموظف..." className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1">من تاريخ</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">إلى تاريخ</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full p-2 border rounded" />
              </div>
            </div>
          </>
        )}

        {activeTab !== 'approval' && activeTab !== 'reports' && (
          <div className="text-xs text-gray-400 mb-2">
            ملاحظة: المدير يوافق على طلبات الإجازة للأيام 3 فأقل، أما أكثر من 3 أيام فتحتاج موافقة المدير العام بعد موافقة المدير المباشر
          </div>
        )}
      </Card>

      {activeTab === 'approval' ? (
        <Card>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-5xl mb-4">✅</p>
              لا توجد طلبات إجازة تنتظر موافقتك
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginated.map((req) => (
                  <div key={req._id || req.id} className="bg-gray-50 rounded-xl p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
                          {LEAVE_TYPE_ICONS[req.type] || '📋'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold">{getEmployeeNameFromRecord(req)}</h3>
                            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                              {req.employee?.department || ''}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{getLeaveTypeLabelFn(req.type)}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(req.startDate)} → {formatDate(req.endDate)}
                            <span className="mx-1">·</span>
                            {req.days} يوم
                          </p>
                          {req.managerSuggestedDays ? (
                            <p className="text-xs text-blue-600 mt-1">
                              المدير المباشر وافق على <strong>{req.managerSuggestedDays} يوم</strong> من أصل {req.days}
                            </p>
                          ) : (
                            <p className="text-xs text-green-600 mt-1">
                              المدير المباشر: موافقة كاملة ({req.days} يوم)
                            </p>
                          )}
                          <p className="text-sm text-gray-600 mt-2 bg-white p-2 rounded-lg">
                            {req.reason}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mr-4">
                        <button
                          onClick={() => openApproveModal(req)}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
                        >
                          موافقة
                        </button>
                        <button
                          onClick={() => setRejectionModal(req)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                        >
                          رفض
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">السابق</button>
                  <span className="px-3 py-1">{currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">التالي</button>
                </div>
              )}
            </>
          )}
        </Card>
      ) : activeTab === 'reports' ? (
        <>
          {reportStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <StatCard title="إجمالي الطلبات" value={formatNumber(reportStats.total)} icon="📋" color="blue" />
              <StatCard title="المقبولة" value={formatNumber(reportStats.approved)} icon="✅" color="green" />
              <StatCard title="المرفوضة" value={formatNumber(reportStats.rejected)} icon="❌" color="red" />
              <StatCard title="قيد المراجعة" value={formatNumber(reportStats.pending)} icon="⏳" color="orange" />
              <StatCard title="إجمالي الأيام" value={formatNumber(reportStats.totalDays)} icon="📅" color="purple" />
              <StatCard title="متوسط الأيام" value={formatNumber(reportStats.avgDays)} icon="📊" color="teal" />
            </div>
          )}

          {chartData && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4">تحليلات الإجازات</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-bold mb-4">توزيع أنواع الإجازات</h3>
                  <PieChart
                    data={{
                      labels: ['سنوية', 'مرضية', 'طارئة', 'استثنائية', 'وفاة', 'ساعية', 'بدون راتب', 'مأمورية', 'أخرى'],
                      data: [
                        chartData.leaveTypeCounts.annual,
                        chartData.leaveTypeCounts.sick,
                        chartData.leaveTypeCounts.emergency,
                        chartData.leaveTypeCounts.exceptional,
                        chartData.leaveTypeCounts.death,
                        chartData.leaveTypeCounts.hourly,
                        chartData.leaveTypeCounts.unpaid,
                        chartData.leaveTypeCounts.mission,
                        chartData.leaveTypeCounts.other,
                      ]
                    }}
                    width={400}
                    height={300}
                  />
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-bold mb-4">الاتجاه الشهري للإجازات</h3>
                  <LineChart
                    data={chartData.monthlyTrend}
                    options={{ plugins: { legend: { position: 'top' }, title: { display: true, text: 'الاتجاه الشهري' } } }}
                    width={400}
                    height={300}
                  />
                </div>
              </div>
            </div>
          )}

          <Card>
            <h2 className="text-xl font-bold mb-4">سجلات الإجازات</h2>
            {loading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : leaveRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">لا توجد سجلات إجازات</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-right">
                        <th className="p-3">الموظف</th>
                        <th className="p-3">النوع</th>
                        <th className="p-3">من</th>
                        <th className="p-3">إلى</th>
                        <th className="p-3">الأيام</th>
                        <th className="p-3">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.slice(0, 50).map((r) => {
                        const statusInfo = getStatusInfo(r.status);
                        return (
                          <tr key={r._id || r.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{getEmployeeNameFromRecord(r)}</td>
                            <td className="p-3">{getLeaveTypeLabelFn(r.type)}</td>
                            <td className="p-3">{r.startDate ? new Date(r.startDate).toLocaleDateString('ar-SA') : '-'}</td>
                            <td className="p-3">{r.endDate ? new Date(r.endDate).toLocaleDateString('ar-SA') : '-'}</td>
                            <td className="p-3">{r.days || 0}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </>
      ) : (
        <Card>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد طلبات إجازة</div>
          ) : (
            renderTableContent()
          )}
        </Card>
      )}

      {approveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setApproveModal(null); setGmApprovedDays(null); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">الموافقة على الإجازة</h3>
            <p className="text-sm text-gray-500 mb-4">
              {LEAVE_TYPE_LABELS[approveModal.type] || approveModal.type} - {getEmployeeNameFromRecord(approveModal)}
            </p>

            {approveModal.managerSuggestedDays ? (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                اقتراح المدير المباشر: الموافقة على <strong>{approveModal.managerSuggestedDays} يوم</strong> من أصل {approveModal.days}
              </div>
            ) : (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                المدير المباشر: موافقة كاملة ({approveModal.days} يوم)
              </div>
            )}

            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <button
                  onClick={() => { handleApprove(approveModal._id || approveModal.id, null); setApproveModal(null); }}
                  className="w-full text-green-800 hover:text-green-900 text-sm font-medium transition-colors text-center py-2"
                >
                  قبول كامل الإجازة ({approveModal.days} يوم)
                </button>
              </div>

              {approveModal.managerSuggestedDays && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <button
                    onClick={() => { handleApprove(approveModal._id || approveModal.id, approveModal.managerSuggestedDays); setApproveModal(null); }}
                    className="w-full text-blue-800 hover:text-blue-900 text-sm font-medium transition-colors text-center py-2"
                  >
                    قبول اقتراح المدير ({approveModal.managerSuggestedDays} يوم)
                  </button>
                </div>
              )}

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-gray-400">أو</span></div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <label className="block text-sm font-medium text-purple-800 mb-3">تحديد عدد أيام محدد:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={approveModal.days}
                    value={gmApprovedDays}
                    onChange={(e) => setGmApprovedDays(Math.min(Number(e.target.value), approveModal.days))}
                    className="w-20 p-2 border border-purple-200 rounded-lg text-sm text-center bg-white"
                  />
                  <span className="text-sm text-purple-700">يوم من أصل {approveModal.days}</span>
                  <button
                    onClick={() => { handleApprove(approveModal._id || approveModal.id, gmApprovedDays); }}
                    disabled={!gmApprovedDays || gmApprovedDays < 1}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50"
                  >
                    تأكيد
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setApproveModal(null); setGmApprovedDays(null); }}
              className="mt-4 w-full p-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {rejectionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setRejectionModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">سبب الرفض</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="اذكر سبب رفض طلب الإجازة..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-sm"
            />
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                تأكيد الرفض
              </button>
              <button
                onClick={() => { setRejectionModal(null); setRejectionReason(''); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
