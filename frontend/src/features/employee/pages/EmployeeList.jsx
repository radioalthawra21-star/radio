/**
 * Employee List Page - Comprehensive Search & Filter
 * Unified personnel directory with advanced filtering, sorting, and export
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllEmployees, getAllManagers } from '../../../services/userService';
import { getAllDepartments } from '../../../services/departmentService';
import Card from '../../../components/common/Card';
import RoleBadge from '../../../components/common/RoleBadge';
import StatusBadge from '../../../components/common/StatusBadge';
import './EmployeeList.css';

// Debounce utility
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const EmployeeList = () => {
  // State
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Unified personnel data (combines employees + managers)
  const [allPersonnel, setAllPersonnel] = useState([]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Backend now handles scoped access automatically based on user role
      // Manager will only see employees from their department via the API
      // General Manager/Admin will see all employees
      const [empResponse, mgrResponse, deptResponse] = await Promise.all([
        getAllEmployees(),
        getAllManagers(),
        getAllDepartments()
      ]);

      let personnel = [];

      if (empResponse.success) {
        const emps = empResponse.data.employees || [];
        // Mark as regular employee
        personnel = [...personnel, ...emps.map(e => ({ ...e, isManager: false }))];
      }

      if (mgrResponse.success) {
        const mgrs = mgrResponse.data.managers || [];
        // Mark as manager
        personnel = [...personnel, ...mgrs.map(m => ({ ...m, isManager: true }))];
      }

      setAllPersonnel(personnel);

      if (deptResponse.success) {
        setDepartments(deptResponse.data.departments || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and sort personnel (with useMemo for performance)
  const filteredPersonnel = useMemo(() => {
    let filtered = [...allPersonnel];

    // Search filter (across multiple fields)
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(person =>
        (person.name?.toLowerCase()?.includes(term)) ||
        (person.username?.toLowerCase()?.includes(term)) ||
        (person.email?.toLowerCase()?.includes(term)) ||
        (person.department?.toLowerCase()?.includes(term))
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(person => person.department === departmentFilter);
    }

    // Role filter (handles both 'employee' and 'manager' from unified list)
    if (roleFilter !== 'all') {
      if (roleFilter === 'employee') {
        filtered = filtered.filter(person => !person.isManager);
      } else if (roleFilter === 'manager') {
        filtered = filtered.filter(person => person.isManager);
      } else {
        // admin, general_manager, super_admin
        filtered = filtered.filter(person => person.role === roleFilter);
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      const isActiveStatus = statusFilter === 'active';
      filtered = filtered.filter(person => person.isActive === isActiveStatus);
    }

    // Date range filter (hire date)
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(person => {
        if (!person.startDate) return false;
        return new Date(person.startDate) >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(person => {
        if (!person.startDate) return false;
        return new Date(person.startDate) <= toDate;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle date sorting
      if (sortBy === 'startDate' || sortBy === 'lastLogin' || sortBy === 'createdAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allPersonnel, debouncedSearchTerm, departmentFilter, roleFilter, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredPersonnel.length / itemsPerPage);
  const paginatedPersonnel = filteredPersonnel.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getDepartmentName = (deptName) => {
    const translations = {
      'financial': 'المالي',
      'it': 'تقنية المعلومات',
      'marketing': 'التسويق',
      'news': 'الأخبار',
      'production': 'الإنتاج',
      'live_broadcast': 'البث المباشر',
      'hr': 'الموارد البشرية',
      'human resources': 'الموارد البشرية',
      'الموارد البشرية': 'الموارد البشرية',
      'المالية': 'المالي',
      'المالي': 'المالي',
      'تقنية المعلومات': 'تقنية المعلومات',
      'التسويق': 'التسويق',
      'الأخبار': 'الأخبار',
      'الإنتاج': 'الإنتاج',
      'البث المباشر': 'البث المباشر',
      'الit': 'تقنية المعلومات'
    };
    return translations[deptName?.toLowerCase()] || deptName || '-';
  };

  const getRoleLabel = (role, isManager) => {
    if (isManager) return 'رئيس قسم';
    const labels = {
      'employee': 'موظف',
      'admin': 'مدير عام',
      'general_manager': 'مدير عام',
      'super_admin': 'المالك الرئيسي'
    };
    return labels[role] || role;
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('all');
    setRoleFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      '#', 'الاسم', 'اسم المستخدم', 'البريد الإلكتروني', 
      'القسم', 'الدور', 'الحالة', 'تاريخ التعيين', 'آخر دخول'
    ];
    
    const rows = filteredPersonnel.map((person, i) => [
      i + 1,
      person.name,
      person.username,
      person.email,
      getDepartmentName(person.department),
      getRoleLabel(person.role, person.isManager),
      person.isActive ? 'نشط' : 'غير نشط',
      person.startDate ? new Date(person.startDate).toLocaleDateString('ar-EG') : '—',
      person.lastLogin ? new Date(person.lastLogin).toLocaleDateString('ar-EG') : '—'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personnel_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="employee-list-page animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2">إدارة الموظفين</h1>
          <p className="text-gray-600">
            إجمالي السجلات: <span className="font-bold text-primary">{filteredPersonnel.length}</span> 
            {isAdmin && ` | رؤساء الأقسام: ${managers.length}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && filteredPersonnel.length > 0 && (
            <button
              onClick={exportToCSV}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-md"
              title="تصدير جميع البيانات كملف CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              تصدير CSV
            </button>
          )}
          {isAdmin && (
            <Link to="/admin/employees" className="btn btn-primary">
              ➕ إضافة موظف
            </Link>
          )}
        </div>
      </div>

      {/* Advanced Filters Card */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="text-lg font-bold text-dark">تصفية متقدمة</h3>
          {(searchTerm || departmentFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo) && (
            <button
              onClick={clearFilters}
              className="mr-auto text-sm text-primary hover:underline flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              مسح الكل
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البحث
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث بالاسم، اسم المستخدم، البريد، أو القسم..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              القسم
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">جميع الأقسام</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter - FIXED: No duplicate "مدير عام" */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الدور
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">جميع الأدوار</option>
              <option value="employee">موظف</option>
              <option value="manager">رئيس قسم</option>
              <option value="admin">مدير عام</option>
              <option value="general_manager">مدير عام</option>
              <option value="super_admin">المالك الرئيسي</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحالة
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تاريخ التعيين من
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تاريخ التعيين حتى
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {(debouncedSearchTerm || departmentFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {debouncedSearchTerm && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                بحث: {debouncedSearchTerm}
                <button onClick={() => setSearchTerm('')}>×</button>
              </span>
            )}
            {departmentFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                القسم: {departmentFilter}
                <button onClick={() => setDepartmentFilter('all')}>×</button>
              </span>
            )}
            {roleFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                الدور: {getRoleLabel(roleFilter, false)}
                <button onClick={() => setRoleFilter('all')}>×</button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                الحالة: {statusFilter === 'active' ? 'نشط' : 'غير نشط'}
                <button onClick={() => setStatusFilter('all')}>×</button>
              </span>
            )}
            {dateFrom && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">
                من: {dateFrom}
                <button onClick={() => setDateFrom('')}>×</button>
              </span>
            )}
            {dateTo && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">
                حتى: {dateTo}
                <button onClick={() => setDateTo('')}>×</button>
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Results Summary */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          عرض <span className="font-bold">{paginatedPersonnel.length}</span> من <span className="font-bold">{filteredPersonnel.length}</span> سجل
          {filteredPersonnel.length > 0 && (
            <span className="mr-2">
              (الإجمالي: {allPersonnel.length} موظف/رئيس قسم)
            </span>
          )}
        </div>
        {filteredPersonnel.length > 0 && isAdmin && (
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center gap-1"
          >
            📊 تصدير CSV
          </button>
        )}
      </div>

      {/* Personnel Table */}
      <Card>
        {filteredPersonnel.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-right">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 font-bold text-gray-700 hover:text-primary transition-colors"
                      >
                        الاسم
                        <span>{getSortIcon('name')}</span>
                      </button>
                    </th>
                    <th className="p-4 text-right font-bold text-gray-700">اسم المستخدم</th>
                    <th className="p-4 text-right">
                      <button
                        onClick={() => handleSort('department')}
                        className="flex items-center gap-2 font-bold text-gray-700 hover:text-primary transition-colors"
                      >
                        القسم
                        <span>{getSortIcon('department')}</span>
                      </button>
                    </th>
                    <th className="p-4 text-right">
                      <button
                        onClick={() => handleSort('role')}
                        className="flex items-center gap-2 font-bold text-gray-700 hover:text-primary transition-colors"
                      >
                        الدور
                        <span>{getSortIcon('role')}</span>
                      </button>
                    </th>
                    <th className="p-4 text-right">
                      <button
                        onClick={() => handleSort('startDate')}
                        className="flex items-center gap-2 font-bold text-gray-700 hover:text-primary transition-colors"
                      >
                        تاريخ التعيين
                        <span>{getSortIcon('startDate')}</span>
                      </button>
                    </th>
                    <th className="p-4 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('isActive')}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700">الحالة</span>
                        <span className="text-gray-500">{getSortIcon('isActive')}</span>
                      </div>
                    </th>
                    <th className="p-4 text-right font-bold text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedPersonnel.map((person, index) => (
                    <tr key={person._id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            person.isManager
                              ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-md ring-2 ring-primary/10'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {person.name?.charAt(0)?.toUpperCase() || 'م'}
                          </div>
                          <div>
                            <div className="font-semibold text-dark">
                              {person.name}
                            </div>
                            {person.isManager && (
                              <div className="text-xs text-primary font-medium flex items-center gap-1">
                                <span>👥</span>
                                <span>رئيس قسم {getDepartmentName(person.department)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 font-mono text-sm">{person.username}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-dark text-sm">
                            {getDepartmentName(person.department)}
                          </span>
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded w-fit mt-0.5">
                            {person.department}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <RoleBadge role={person.isManager ? 'manager' : person.role} />
                        {person.isManager && (
                          <span className="text-xs text-primary font-medium mr-2">(رئيس)</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-600 text-sm">
                        {person.startDate ? (
                          new Date(person.startDate).toLocaleDateString('ar-EG')
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <StatusBadge isActive={person.isActive} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/employee/profile/${person._id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="عرض الملف"
                          >
                            👁️
                          </Link>
                          {isAdmin && (
                            <Link
                              to={`/admin/employees`}
                              state={{ editEmployee: person }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              ✏️
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Pagination */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-sm">
              <div className="text-gray-600">
                عرض {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPersonnel.length)} من {filteredPersonnel.length} سجل
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    السابق
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-lg transition-colors flex items-center justify-center ${
                          currentPage === i + 1
                            ? 'bg-primary text-white shadow-md'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    التالي
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
              <span className="text-4xl">👥</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-xl">
              لا توجد نتائج
            </h3>
            <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
              {searchTerm || departmentFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo
                ? 'لم يتم العثور على سجلات تطابق معايير البحث. جرب تغيير الفلاتر أو مسحها.'
                : 'المنظومة لا تحتوي على أي موظفين أو رؤساء أقسام مسجلين حتى الآن.'
              }
            </p>
            {(searchTerm || departmentFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={clearFilters}
                className="mt-6 px-6 py-2.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium flex items-center gap-2 mx-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                مسح جميع الفلاتر
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmployeeList;
