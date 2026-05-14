import { useState, useEffect, useCallback } from 'react';
import { getLeaveRequests, updateLeaveStatus } from '../../services/leaveService';
import { getAllEmployees } from '../../services/userService';
import { getAllDepartments } from '../../services/departmentService';
import Card from '../../components/common/Card';

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

const STATUS_LABELS = {
  pending_manager: { label: 'بانتظار المدير', color: 'bg-yellow-100 text-yellow-800' },
  pending_general_manager: { label: 'بانتظار المدير العام', color: 'bg-orange-100 text-orange-800' },
  approved: { label: 'تمت الموافقة', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-600' },
};

const tabs = [
  { id: 'pending', label: 'قيد المراجعة' },
  { id: 'approved', label: 'المقبولة' },
  { id: 'rejected', label: 'المرفوضة' },
  { id: 'all', label: 'الكل' },
];

const LeaveManagement = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState('');
  const itemsPerPage = 15;

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUserRole(JSON.parse(stored).role); } catch {}
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        status: activeTab !== 'all' ? activeTab : undefined,
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

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id, currentStatus) => {
    try {
      const res = await updateLeaveStatus(id, { status: 'approved' });
      if (res.success) {
        setError('');
        loadData();
      }
    } catch (err) {
      setError(err.userMessage || 'فشل تحديث الحالة');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('سبب الرفض:');
    if (reason === null) return;
    try {
      const res = await updateLeaveStatus(id, { status: 'rejected', rejectionReason: reason });
      if (res.success) {
        setError('');
        loadData();
      }
    } catch (err) {
      setError(err.userMessage || 'فشل تحديث الحالة');
    }
  };

  const filtered = leaveRequests.filter((r) => {
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

  const getEmployeeName = (r) => {
    if (r.employee?.name) return r.employee.name;
    const emp = employees.find((e) => (e._id || e.id) === (r.employee?._id || r.employeeId || r.employee));
    return emp?.name || 'غير معروف';
  };

  const getLeaveTypeLabel = (type) => {
    const found = leaveTypes.find((t) => t.value === type);
    return found?.label || type;
  };

  const getStatusInfo = (status) => {
    return STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  };

  const canApprove = (status) => {
    return status === 'pending_manager' || status === 'pending_general_manager';
  };

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter((r) => r.status === 'pending_manager' || r.status === 'pending_general_manager').length,
    approved: leaveRequests.filter((r) => r.status === 'approved').length,
    rejected: leaveRequests.filter((r) => r.status === 'rejected').length,
  };

  return (
    <div className="p-6" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">إدارة الإجازات</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <Card className="mb-6">
        <div className="flex gap-4 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({stats[tab.id]})
            </button>
          ))}
        </div>

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

        <div className="text-xs text-gray-400 mb-2">
          ملاحظة: المدير يوافق على طلبات الإجازة للأيام 3 فأقل، أما أكثر من 3 أيام فتحتاج موافقة المدير العام بعد موافقة المدير المباشر
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-8 text-gray-500">لا توجد طلبات إجازة</div>
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
                    <th className="p-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r) => {
                    const statusInfo = getStatusInfo(r.status);
                    return (
                      <tr key={r._id || r.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{getEmployeeName(r)}</td>
                        <td className="p-3">{getLeaveTypeLabel(r.type)}</td>
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
                                onClick={() => handleApprove(r._id || r.id, r.status)}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                              >
                                قبول
                              </button>
                              <button
                                onClick={() => handleReject(r._id || r.id)}
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
        )}
      </Card>
    </div>
  );
};

export default LeaveManagement;
