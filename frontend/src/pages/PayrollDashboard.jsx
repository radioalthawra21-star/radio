import { useState, useEffect } from 'react';
import { FaChartBar, FaUsers, FaMoneyBillWave, FaDownload, FaPrint, FaChartLine, FaChartPie, FaSpinner, FaFileInvoice, FaClock, FaCheckCircle, FaBalanceScale } from 'react-icons/fa';
import DynamicNumber from '../components/DynamicNumber';
import PayrollActions from '../features/payroll/components/PayrollActions';
import DashboardQuickMenu from './DashboardQuickMenu';
import RecentPaymentsTable from '../components/RecentPaymentsTable';
import { usePayroll } from '../features/payroll/hooks/usePayrollState.jsx';
import { getDepartmentCosts } from '../services/departmentService';
import { getPayrollSummary, getRecentPayments } from '../services/payrollService';

const PayrollDashboard = () => {
  const { canEdit, canCreate, canExport } = usePayroll();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0, processedPayroll: 0, pendingApproval: 0,
    totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0,
    accuracyRate: 0, onTimeRate: 0, yearToDatePayroll: 0, overtimeCost: 0, benefitsCost: 0
  });

  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [departmentCosts, setDepartmentCosts] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [costsRes, summaryRes, recentRes] = await Promise.all([
          getDepartmentCosts().catch(() => ({ success: false })),
          getPayrollSummary().catch(() => ({ success: false })),
          getRecentPayments().catch(() => ({ success: false }))
        ]);

        if (costsRes?.success) setDepartmentCosts(costsRes.data?.departmentCosts || []);
        if (recentRes?.success) setRecentPayments(recentRes.data?.recentPayments || []);

        if (summaryRes?.success) {
          const s = summaryRes.data;
          setDashboardData({
            totalEmployees: s.totalEmployees || 0, processedPayroll: s.totalPayrolls || 0,
            pendingApproval: s.statusBreakdown?.pending || 0,
            totalGrossPay: s.totals?.gross || 0, totalDeductions: s.totals?.deductions || 0,
            totalNetPay: s.totals?.net || 0, accuracyRate: 99.7, onTimeRate: 100,
            yearToDatePayroll: s.totals?.gross || 0, overtimeCost: 0, benefitsCost: 0
          });
        }
      } catch {} finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const formatCurrency = (amount, size = 'normal') => {
    const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    const fullText = `${formatted} $`;
    const sizes = { small: { base: '0.75rem', min: '0.5rem' }, normal: { base: '0.875rem', min: '0.5rem' }, large: { base: '1.125rem', min: '0.5625rem' }, xl: { base: '1.25rem', min: '0.625rem' }, xxl: { base: '1.5rem', min: '0.75rem' } };
    const s = sizes[size] || sizes.normal;
    return <DynamicNumber value={fullText} baseSize={s.base} minSize={s.min} />;
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="payroll-dashboard">
      <div className="page-header mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DashboardQuickMenu />
            <div>
              <h1 className="text-3xl font-bold text-dark flex items-center">
                <FaChartBar className="h-8 w-8 ml-3 text-primary" />
                لوحة تحكم الرواتب
              </h1>
              <p className="text-gray-600 mt-1">نظرة عامة على عمليات الرواتب والمؤشرات الرئيسية للأداء</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExportExcel} className="bg-white border border-gray-300 px-4 py-2 rounded-lg flex items-center text-gray-700 hover:bg-gray-50 transition-colors">
              <FaDownload className="h-4 w-4 ml-2" /> تصدير البيانات
            </button>
            <button onClick={() => window.print()} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary/90 transition-colors">
              <FaPrint className="h-4 w-4 ml-2" /> طباعة التقرير
            </button>
          </div>
        </div>
      </div>

      <PayrollActions
        isEditing={isEditing} canEdit={canEdit} canCreate={canCreate} canExport={canExport}
        onExportExcel={handleExportExcel} onExportPDF={() => window.print()}
        onPrint={() => window.print()} onAddNew={() => {}}
        onSaveAll={() => setIsEditing(false)} onCancelAll={() => setIsEditing(false)}
        onStartEdit={() => setIsEditing(true)}
      />

      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-icon employees"><FaUsers /></div>
          <div className="stat-info">
            <h3>إجمالي الموظفين</h3>
            <p className="stat-value">{dashboardData.totalEmployees.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gross"><FaMoneyBillWave /></div>
          <div className="stat-info">
            <h3>إجمالي الرواتب الإجمالي</h3>
            <p className="stat-value">{formatCurrency(dashboardData.totalGrossPay)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon deductions"><FaBalanceScale /></div>
          <div className="stat-info">
            <h3>إجمالي الخصومات</h3>
            <p className="stat-value">{formatCurrency(dashboardData.totalDeductions)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon net"><FaChartLine /></div>
          <div className="stat-info">
            <h3>صافي الرواتب</h3>
            <p className="stat-value">{formatCurrency(dashboardData.totalNetPay)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="section-card">
          <h2><FaChartLine className="text-secondary" /> اتجاهات الرواتب الشهرية</h2>
          <div className="space-y-4">
            {monthlyTrends.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد بيانات اتجاهات حالياً</p>
            ) : monthlyTrends.map((trend, i) => {
              const maxGross = Math.max(...monthlyTrends.map(t => t.gross), 1);
              return (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium text-sm">{trend.month}</span>
                  <div className="flex items-center gap-4 flex-1 mr-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div className="bg-primary h-4 rounded-full transition-all" style={{ width: `${(trend.gross / maxGross) * 100}%` }}></div>
                    </div>
                    <span className="text-sm text-gray-500 w-20 text-left">{formatCurrency(trend.gross)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="section-card">
          <h2><FaChartPie className="text-purple-600" /> توزيع تكاليف الأقسام</h2>
          {departmentCosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">لا توجد بيانات تكاليف للأقسام</p>
          ) : (
            <div className="space-y-4">
              {departmentCosts.map((dept, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color || '#8B5CF6' }}></span>
                    <span className="text-gray-900 font-medium text-sm truncate">{dept.department}</span>
                    <span className="text-gray-500 text-xs whitespace-nowrap">({dept.employees} موظف)</span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="w-24 bg-gray-200 rounded-full h-4">
                      <div className="bg-purple-600 h-4 rounded-full transition-all" style={{ width: `${dept.percentage || 0}%` }}></div>
                    </div>
                    <span className="text-sm text-gray-500 w-20 text-left">{formatCurrency(dept.payrollGross)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecentPaymentsTable payments={recentPayments} formatCurrency={formatCurrency} />
    </div>
  );
};

export default PayrollDashboard;
