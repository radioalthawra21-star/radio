import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaChartBar, FaUsers, FaFileInvoice, FaMoneyBillWave,
  FaCalculator, FaShieldAlt, FaChartLine,
  FaCheckCircle, FaClock, FaExclamationTriangle,
  FaCalendarAlt, FaDownload, FaFilter, FaSearch,
  FaPlus, FaEdit, FaTrash, FaEye, FaTasks,
  FaBuilding, FaBars, FaTimes, FaChevronLeft
} from 'react-icons/fa';
import './PayrollManagement.css';

import EditablePayrollTable from '../features/payroll/components/EditablePayrollTable';
import { getAllPayrolls } from '../services/payrollService';
import { getStoredUser } from '../services/authService';

const DEPARTMENT_NAMES = {
  'financial': 'المالي',
  'it': 'تقنية المعلومات',
  'marketing': 'التسويق',
  'news': 'الأخبار',
  'production': 'الإنتاج',
  'live_broadcast': 'البث المباشر',
  'hr': 'الموارد البشرية',
  'finance': 'المالي',
  'human_resources': 'الموارد البشرية',
  'engineering': 'تقنية المعلومات',
  'management': 'الإدارة',
  المالي: 'المالي',
  'تقنية المعلومات': 'تقنية المعلومات',
  التسويق: 'التسويق',
  الأخبار: 'الأخبار',
  الإنتاج: 'الإنتاج',
  'البث المباشر': 'البث المباشر',
  'الموارد البشرية': 'الموارد البشرية',
};

const PayrollManagement = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [payrollData, setPayrollData] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    processedThisMonth: 0,
    pendingApproval: 0,
    totalPayrollAmount: 0,
    totalDeductions: 0,
    netPayrollAmount: 0
  });

  useEffect(() => {
    const fetchPayrollData = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await getAllPayrolls({ limit: 100 });

        if (response.success) {
          const payrolls = response.data.payrolls || [];

          const transformedData = payrolls.map((payroll, index) => {
            const allowances = payroll.components?.allowances || [];
            const housingAllowance = allowances.find(a => a.type === 'housing')?.amount || 0;
            const transportAllowance = allowances.find(a => a.type === 'transport')?.amount || 0;
            const foodAllowance = allowances.find(a => a.type === 'food')?.amount || 0;
            const communicationAllowance = allowances.find(a => a.type === 'communication')?.amount || 0;
            const otherAllowances = allowances
              .filter(a => a.type === 'other')
              .reduce((sum, a) => sum + (a.amount || 0), 0);

            const bonuses = payroll.components?.bonuses || [];
            const totalBonuses = bonuses.reduce((sum, b) => sum + (b.amount || 0), 0);

            const overtimeAmount = payroll.components?.overtime?.totalAmount || 0;
            const baseSalary = payroll.baseSalary || 0;

            return {
              id: payroll._id ? payroll._id.toString() : `temp-${index}`,
              employeeName: payroll.employee?.name || 'غير معروف',
              employeeId: payroll.employee?._id ? payroll.employee._id.toString() : null,
              department: payroll.employee?.department || '',
              basicSalary: baseSalary,
              housingAllowance,
              transportAllowance,
              foodAllowance,
              communicationAllowance,
              otherAllowances,
              bonuses: totalBonuses,
              overtime: overtimeAmount,
              deductions: payroll.totals?.deductions || 0,
              netPay: payroll.totals?.net || 0,
              gross: payroll.totals?.gross || 0,
              status: payroll.status || 'pending',
              periodStart: payroll.periodStart,
              periodEnd: payroll.periodEnd,
              isPending: payroll.isPendingSalaryAssignment || false
            };
          });

          setPayrollData(transformedData);

          const totalEmployees = new Set(payrolls.map(p => p.employee?._id).filter(id => id != null)).size;
          const pendingCount = payrolls.filter(p => p.status === 'pending').length;
          const totalGross = payrolls.reduce((sum, p) => sum + (p.totals?.gross || 0), 0);
          const totalDeductions = payrolls.reduce((sum, p) => sum + (p.totals?.deductions || 0), 0);
          const totalNet = payrolls.reduce((sum, p) => sum + (p.totals?.net || 0), 0);

          setStats({
            totalEmployees,
            processedThisMonth: payrolls.length,
            pendingApproval: pendingCount,
            totalPayrollAmount: totalGross,
            totalDeductions: totalDeductions,
            netPayrollAmount: totalNet
          });
        } else {
          setError(response.message || 'حدث خطأ في جلب بيانات الرواتب');
        }
      } catch (err) {
        console.error('Error fetching payroll data:', err);
        setError('حدث خطأ في الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveRow = useCallback((rowId, updatedData) => {
    setPayrollData(prev => prev.map(row =>
      row.id === rowId ? { ...row, ...updatedData } : row
    ));
  }, []);

  const handleDeleteRow = useCallback((rowId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      setPayrollData(prev => prev.filter(row => row.id !== rowId));
    }
  }, []);

  const handleAddRow = useCallback((newRow) => {
    if (!newRow.employeeName) {
      alert('يرجى إدخال اسم الموظف');
      return;
    }
    setPayrollData(prev => [...prev, { ...newRow, id: Date.now() }]);
  }, []);

  const handleBulkUpdate = useCallback((updates) => {
    setPayrollData(prev => prev.map(row => {
      if (updates[row.id]) {
        const rowUpdates = {};
        Object.entries(updates[row.id]).forEach(([key, val]) => {
          rowUpdates[key] = val === undefined ? 0 : val;
        });
        const basic = rowUpdates.basicSalary ?? row.basicSalary ?? 0;
        const housing = rowUpdates.housingAllowance ?? row.housingAllowance ?? 0;
        const transport = rowUpdates.transportAllowance ?? row.transportAllowance ?? 0;
        const food = rowUpdates.foodAllowance ?? row.foodAllowance ?? 0;
        const comm = rowUpdates.communicationAllowance ?? row.communicationAllowance ?? 0;
        const other = rowUpdates.otherAllowances ?? row.otherAllowances ?? 0;
        const bonuses = rowUpdates.bonuses ?? row.bonuses ?? 0;
        const overtime = rowUpdates.overtime ?? row.overtime ?? 0;
        const deductions = rowUpdates.deductions ?? row.deductions ?? 0;
        const gross = basic + housing + transport + food + comm + other + bonuses + overtime;
        return { ...row, ...rowUpdates, gross, netPay: gross - deductions };
      }
      return row;
    }));
  }, []);

  const getDeptName = (deptKey) => DEPARTMENT_NAMES[deptKey] || deptKey || 'غير محدد';

  const recentActivities = payrollData.slice(-5).map((p, i) => ({
    id: i,
    action: `كشاف راتب لـ ${p.employeeName}`,
    user: getDeptName(p.department),
    time: p.periodStart ? new Date(p.periodStart).toLocaleDateString('ar-EG') : 'غير محدد',
    type: p.status === 'paid' || p.status === 'approved' ? 'success' : 'info'
  }));

  return (
    <div className="payroll-page">
      {loading && (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="فتح قائمة الرواتب"
                    >
                      {menuOpen ? (
                        <FaTimes className="h-5 w-5 text-gray-700" />
                      ) : (
                        <FaBars className="h-5 w-5 text-gray-700" />
                      )}
                    </button>

                    <div
                      className={`absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 origin-top-right transition-all duration-200 ease-out ${
                        menuOpen
                          ? 'opacity-100 scale-100 translate-y-0'
                          : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                      }`}
                    >
                      <div className="p-2">
                        <div className="px-3 py-2 border-b border-gray-100 mb-1">
                          <p className="text-xs font-semibold text-gray-400 uppercase">أقسام الرواتب</p>
                        </div>

                        <button
                          onClick={() => { navigate('/payroll'); setMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-primary hover:text-white transition-colors"
                        >
                          <FaMoneyBillWave className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">إدارة الرواتب</span>
                        </button>

                        <button
                          onClick={() => { navigate('/payroll/processing'); setMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-primary hover:text-white transition-colors"
                        >
                          <FaCalculator className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">معالجة الرواتب</span>
                        </button>

                        <button
                          onClick={() => { navigate('/payroll/reports'); setMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-primary hover:text-white transition-colors"
                        >
                          <FaChartLine className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">تقارير الرواتب</span>
                        </button>

                        <button
                          onClick={() => { navigate('/payroll/audit'); setMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-primary hover:text-white transition-colors"
                        >
                          <FaShieldAlt className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">تدقيق الرواتب</span>
                        </button>

                        <button
                          onClick={() => { navigate('/payroll/policies'); setMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-primary hover:text-white transition-colors"
                        >
                          <FaFileInvoice className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">سياسات الرواتب</span>
                        </button>

                        <button
                          onClick={() => { navigate('/payroll/pending-assignments'); setMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-primary hover:text-white transition-colors"
                        >
                          <FaClock className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">مراجعة الرواتب الجديدة</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary p-2 rounded-lg">
                    <FaMoneyBillWave className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">نظام الرواتب</h1>
                    <p className="text-sm text-gray-500">راديو الثورة - مؤسسة إعلامية غير ربحية</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{currentTime.toLocaleDateString('ar-EG')}</p>
                    <p className="text-xs text-gray-500">{currentTime.toLocaleTimeString('ar-EG')}</p>
                  </div>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    نظام نشط
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <EditablePayrollTable
                data={payrollData}
                onSave={handleSaveRow}
                onDelete={handleDeleteRow}
                onAdd={handleAddRow}
                onBulkUpdate={handleBulkUpdate}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="bg-blue-500 rounded-md p-3">
                        <FaUsers className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">إجمالي الموظفين</dt>
                        <dd className="text-lg font-semibold text-gray-900">{stats.totalEmployees}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="bg-green-500 rounded-md p-3">
                        <FaMoneyBillWave className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">الرواتب الشهرية</dt>
                        <dd className="text-lg font-semibold text-gray-900">{stats.totalPayrollAmount.toLocaleString()}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="bg-yellow-500 rounded-md p-3">
                        <FaChartLine className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">إجمالي الخصومات</dt>
                        <dd className="text-lg font-semibold text-gray-900">{stats.totalDeductions.toLocaleString()}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="bg-purple-500 rounded-md p-3">
                        <FaCheckCircle className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">صافي الرواتب</dt>
                        <dd className="text-lg font-semibold text-gray-900">{stats.netPayrollAmount.toLocaleString()}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaTasks className="h-5 w-5 ml-2 text-blue-600" />
                إجراءات سريعة
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  onClick={() => navigate('/payroll/processing')}
                  className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <FaCalculator className="h-5 w-5 ml-2" />
                  معالجة الرواتب الشهرية
                </button>
                <button
                  onClick={() => navigate('/payroll/reports')}
                  className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <FaChartLine className="h-5 w-5 ml-2" />
                  التقارير والتحليلات
                </button>
                <button
                  onClick={() => navigate('/payroll/audit')}
                  className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  <FaShieldAlt className="h-5 w-5 ml-2" />
                  التدقيق والمراجعة
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FaTasks className="h-5 w-5 ml-2 text-blue-600" />
                    آخر النشاطات
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {recentActivities.length === 0 ? (
                    <p className="p-6 text-gray-500 text-center">لا توجد نشاطات حديثة</p>
                  ) : (
                    recentActivities.map((activity) => (
                      <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${activity.type === 'success' ? 'bg-green-400' : 'bg-blue-400'}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                            <p className="text-xs text-gray-500">{activity.user}</p>
                            <p className="text-xs text-gray-400">{activity.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FaBuilding className="h-5 w-5 ml-2 text-orange-600" />
                    الأقسام النشطة
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {(() => {
                    const deptCounts = {};
                    payrollData.forEach(p => {
                      const dept = p.department || 'غير محدد';
                      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
                    });
                    const deptList = Object.entries(deptCounts).map(([dept, count]) => ({
                      name: getDeptName(dept),
                      count,
                      total: payrollData.reduce((s, p) => (p.department === dept ? s + (p.totals?.net || 0) : s), 0)
                    }));

                    return deptList.length === 0 ? (
                      <p className="p-6 text-gray-500 text-center">لا توجد أقسام مسجلة</p>
                    ) : (
                      deptList.map((dept, i) => (
                        <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500">{dept.count} موظف</span>
                              <span className="text-xs font-semibold text-gray-700">{dept.total.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PayrollManagement;
