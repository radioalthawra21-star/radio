import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllAttendanceRecords } from '../../services/attendanceService';
import { getAllEmployees } from '../../services/userService';
import { getStoredUser } from '../../services/authService';
import Card from '../../components/common/Card';
import { formatDateArabic } from '../../utils/dateUtils';

const ATTENDANCE_STATUS_MAP = {
  present: { label: 'حاضر', class: 'bg-green-100 text-green-800' },
  absent: { label: 'غائب', class: 'bg-red-100 text-red-800' },
  late: { label: 'متأخر', class: 'bg-yellow-100 text-yellow-800' },
  half_day: { label: 'نصف يوم', class: 'bg-orange-100 text-orange-800' },
  on_leave: { label: 'في إجازة', class: 'bg-blue-100 text-blue-800' },
  work_from_home: { label: 'عمل عن بعد', class: 'bg-purple-100 text-purple-800' }
};

const AttendanceManagement = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [attendanceRes, employeesRes] = await Promise.all([
        getAllAttendanceRecords({
          startDate: dateRange.start,
          endDate: dateRange.end,
          employeeId: employeeFilter !== 'all' ? employeeFilter : undefined
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
  }, [dateRange, employeeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts);
  }, [employees]);

  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(record => {
      const employeeId = record.employee?._id || record.employee;
      if (employeeFilter !== 'all' && employeeId !== employeeFilter) return false;
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;
      if (departmentFilter !== 'all') {
        const emp = employees.find(e => e.id === employeeId || e._id === employeeId);
        if (emp && emp.department !== departmentFilter) return false;
      }
      return true;
    });
  }, [attendanceRecords, employeeFilter, statusFilter, departmentFilter, employees]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page) => setCurrentPage(page);

  const getStatusBadge = (status) => {
    const config = ATTENDANCE_STATUS_MAP[status] || { label: status, class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.class}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return <div className='loading-spinner'>جاري التحميل...</div>;
  }

  return (
    <div className='attendance-management'>
      <Card>
        <h2>إدارة الحضور</h2>
        {error && <div className='error-message'>{error}</div>}

        <div className='filters'>
          <input
            type='date'
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
          />
          <input
            type='date'
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
          />
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          >
            <option value='all'>جميع الموظفين</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value='all'>جميع الحالات</option>
            {Object.entries(ATTENDANCE_STATUS_MAP).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value='all'>جميع الأقسام</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div className='table-container'>
          <table className='data-table'>
            <thead>
              <tr>
                <th>الموظف</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map(record => (
                <tr key={record._id || record.id}>
                  <td>{record.employee?.name || 'غير معروف'}</td>
                  <td>{formatDateArabic(record.date)}</td>
                  <td>{getStatusBadge(record.status)}</td>
                  <td>
                    <button onClick={() => {/* edit */}}>تعديل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='pagination'>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={currentPage === page ? 'active' : ''}
            >
              {page}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AttendanceManagement;
