import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllAttendanceRecords } from '../../services/attendanceService';
import { getAllEmployees } from '../../services/userService';
import { getStoredUser } from '../../services/authService';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import './AttendanceManagement.css';

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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Load data
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

  // Get unique departments from employees
  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts);
  }, [employees]);

  // Filter logic
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(record => {
      if (employeeFilter !== 'all' && record.employeeId !== employeeFilter) return false;
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;
      if (departmentFilter !== 'all') {
        const emp = employees.find(e => e.id === record.employeeId);
        if (emp && emp.department !== departmentFilter) return false;
      }
      return true;
    });
  }, [attendanceRecords, employeeFilter, statusFilter, departmentFilter, employees]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page) => setCurrentPage(page);

  if (loading) {
    return <div className='loading-spinner'>جاري التحميل...</div>;
  }

  return (
    <div className='attendance-management'>
      <Card>
        <h2>إدارة الحضور</h2>
        {error && <div className='error-message'>{error}</div>}
        
        {/* Filters */}
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
          {/* Add more filters as needed */}
        </div>

        {/* Table */}
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
                <tr key={record.id}>
                  <td>{record.employeeName}</td>
                  <td>{record.date}</td>
                  <td>
                    <StatusBadge status={record.status} />
                  </td>
                  <td>
                    <button onClick={() => {/* edit */}}>تعديل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
