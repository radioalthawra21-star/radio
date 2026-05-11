import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { FaChartBar, FaUsers, FaFileInvoice, FaMoneyBillWave, FaCalendarAlt, FaDownload, FaPrint, FaChartLine, FaChartPie, FaSpinner } from 'react-icons/fa';
import DynamicNumber from '../components/DynamicNumber';
import './PayrollDashboard.css';
import PayrollActions from '../features/payroll/components/PayrollActions';
import { usePayroll } from '../features/payroll/hooks/usePayrollState.jsx';
import { getDepartmentCosts } from '../services/departmentService';
import { getPayrollSummary, getRecentPayments } from '../services/payrollService';

const PayrollDashboard = () => {
  const { canEdit, canCreate, canExport } = usePayroll();
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    processedPayroll: 0,
    pendingApproval: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    accuracyRate: 0,
    onTimeRate: 0,
    yearToDatePayroll: 0,
    overtimeCost: 0,
    benefitsCost: 0
  });

  const [monthlyTrends, setMonthlyTrends] = useState([]);

  const [departmentCosts, setDepartmentCosts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [costsRes, summaryRes, recentRes] = await Promise.all([
          getDepartmentCosts(),
          getPayrollSummary(),
          getRecentPayments()
        ]);

        if (costsRes.success) {
          setDepartmentCosts(costsRes.data.departmentCosts || []);
        }

        if (recentRes.success) {
          setRecentPayments(recentRes.data.recentPayments || []);
        }

        if (summaryRes.success) {
          const s = summaryRes.data;
          setDashboardData({
            totalEmployees: 0,
            processedPayroll: s.totalPayrolls || 0,
            pendingApproval: s.statusBreakdown?.pending || 0,
            totalGrossPay: s.totals?.gross || 0,
            totalDeductions: s.totals?.deductions || 0,
            totalNetPay: s.totals?.net || 0,
            accuracyRate: 99.7,
            onTimeRate: 100,
            yearToDatePayroll: s.totals?.gross || 0,
            overtimeCost: 0,
            benefitsCost: 0
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const [recentPayments, setRecentPayments] = useState([]);

  const formatCurrency = (amount, size = 'normal') => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

    const fullText = `${formatted} $`;

    const sizeMap = {
      small: { base: '0.75rem', min: '0.5rem' },
      normal: { base: '0.875rem', min: '0.5rem' },
      large: { base: '1.125rem', min: '0.5625rem' },
      xl: { base: '1.25rem', min: '0.625rem' },
      xxl: { base: '1.5rem', min: '0.75rem' },
    };

    const s = sizeMap[size] || sizeMap.normal;
    return (
      <DynamicNumber
        value={fullText}
        baseSize={s.base}
        minSize={s.min}
      />
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
      case 'completed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExportExcel = () => {
    const headers = ['الموظف', 'المبلغ', 'التاريخ', 'الحالة'];
    const rows = recentPayments.map(p => [p.employee, p.amount, p.date, p.status]);
    const csv = ['\ufeff' + headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Payroll_Dashboard_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAll = () => {
    setIsEditing(false);
  };

  const handleCancelAll = () => {
    setIsEditing(false);
  };

  const handleAddNew = () => {
    const newPayment = {
      id: Date.now(),
      employee: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      status: 'pending'
    };
    setRecentPayments(prev => [...prev, newPayment]);
  };

  return (
    <div className="payroll-dashboard">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2.5 rounded-lg transition-all duration-200 ${
                  menuOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                aria-label="القائمة"
              >
                <span className={`text-xl block transition-transform duration-200 ${menuOpen ? 'rotate-90' : ''}`}>☰</span>
              </button>
              <div
                className={`absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-2 transition-all duration-300 ease-in-out transform origin-top-right ${
                  menuOpen
                    ? 'opacity-100 scale-100 visible'
                    : 'opacity-0 scale-95 invisible pointer-events-none'
                }`}
              >
                <div className="px-3 pb-2 mb-1 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">الانتقال السريع</p>
                </div>
                <NavLink
                  to="/payroll/management"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 text-sm transition-all duration-150 mx-1 rounded-lg ${
                      isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="ml-3 text-lg">📋</span>
                  إدارة الرواتب
                </NavLink>
                <NavLink
                  to="/payroll/processing"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 text-sm transition-all duration-150 mx-1 rounded-lg ${
                      isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="ml-3 text-lg">⚙️</span>
                  معالجة الرواتب
                </NavLink>
                <NavLink
                  to="/payroll/reports"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 text-sm transition-all duration-150 mx-1 rounded-lg ${
                      isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="ml-3 text-lg">📊</span>
                  تقارير الرواتب
                </NavLink>
                <NavLink
                  to="/payroll/audit"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 text-sm transition-all duration-150 mx-1 rounded-lg ${
                      isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="ml-3 text-lg">🔍</span>
                  تدقيق الرواتب
                </NavLink>
                <NavLink
                  to="/payroll/pending"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 text-sm transition-all duration-150 mx-1 rounded-lg ${
                      isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="ml-3 text-lg">⏳</span>
                  الرواتب المعلقة
                </NavLink>
                <NavLink
                  to="/payroll/policies"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 text-sm transition-all duration-150 mx-1 rounded-lg ${
                      isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="ml-3 text-lg">📋</span>
                  سياسات الرواتب
                </NavLink>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FaChartBar className="h-8 w-8 ml-3 text-blue-600" />
                لوحة تحكم الرواتب
              </h1>
              <p className="text-gray-600 mt-1">نظرة عامة على عمليات الرواتب والمؤشرات الرئيسية للأداء</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="bg-white border border-gray-300 px-4 py-2 rounded-lg flex items-center text-gray-700 hover:bg-gray-50">
              <FaDownload className="h-4 w-4 ml-2" />
              تصدير البيانات
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700">
              <FaPrint className="h-4 w-4 ml-2" />
              طباعة التقرير
            </button>
          </div>
        </div>
      </div>

      {/* أزبار التحكم */}
      <PayrollActions
        isEditing={isEditing}
        canEdit={canEdit}
        canCreate={canCreate}
        canExport={canExport}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        onPrint={handlePrint}
        onAddNew={handleAddNew}
        onSaveAll={handleSaveAll}
        onCancelAll={handleCancelAll}
        onStartEdit={() => setIsEditing(true)}
      />

      {/* مقاييس الأداء */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FaUsers className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-green-500 text-sm font-medium">+2.5%</span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">إجمالي الموظفين</h3>
          <p className="text-2xl font-bold text-gray-900">{dashboardData.totalEmployees.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <FaMoneyBillWave className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-green-500 text-sm font-medium">+3.2%</span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">إجمالي الرواتب الإجمالي</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardData.totalGrossPay)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <FaFileInvoice className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-red-500 text-sm font-medium">-0.8%</span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">إجمالي الخصومات</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardData.totalDeductions)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <FaChartLine className="h-6 w-6 text-orange-600" />
            </div>
            <span className="text-green-500 text-sm font-medium">+1.1%</span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">إجمالي الرواتب الصافية</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardData.totalNetPay)}</p>
        </div>
      </div>

      {/* الاتجاهات الشهرية وتحليل الأقسام */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FaChartLine className="h-5 w-5 mr-2 text-blue-600" />
            اتجاهات الرواتب الشهرية
          </h3>
          <div className="space-y-4">
            {monthlyTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">{trend.month}</span>
                <div className="flex items-center space-x-4">
                  <div className="w-32 bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-blue-600 h-4 rounded-full" 
                      style={{ width: `${(trend.gross / Math.max(...monthlyTrends.map(t => t.gross), 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-20 text-right">{formatCurrency(trend.gross)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaChartPie className="h-5 w-5 mr-2 text-purple-600" />
              توزيع تكاليف الأقسام
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <FaSpinner className="animate-spin ml-2" />
                جاري تحميل البيانات...
              </div>
            ) : departmentCosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                لا توجد بيانات تكاليف للأقسام
              </div>
            ) : (
              <div className="space-y-4">
                {departmentCosts.map((dept, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dept.color || '#8B5CF6' }}
                      ></span>
                      <span className="text-gray-900 font-medium truncate">{dept.department}</span>
                      <span className="text-gray-500 text-sm whitespace-nowrap">({dept.employees} موظف)</span>
                    </div>
                    <div className="flex items-center space-x-4 flex-shrink-0">
                      <div className="w-24 bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-purple-600 h-4 rounded-full" 
                          style={{ width: `${dept.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 w-20 text-right">{formatCurrency(dept.payrollGross)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>

      {/* المدفوعات الأخيرة */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FaFileInvoice className="h-5 w-5 mr-2 text-green-600" />
            المدفوعات الأخيرة
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الموظف</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <FaFileInvoice className="h-8 w-8 text-gray-300" />
                        <p>لا توجد مدفوعات حديثة</p>
                        <p className="text-sm">عند إضافة رواتب الموظفين ستظهر هنا</p>
                      </div>
                    </td>
                  </tr>
                ) : (recentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.employee}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(payment.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status === 'paid' || payment.status === 'completed' ? 'مكتمل' : payment.status === 'pending' ? 'معلق' : 'فشل'}
                      </span>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
