import { useState, useEffect } from 'react';
import { FaChartLine, FaChartBar, FaChartPie, FaDownload, FaPrint, FaFileExcel, FaBuilding, FaUsers, FaMoneyBillWave, FaPercentage } from 'react-icons/fa';
import DynamicNumber from '../components/DynamicNumber';
import { getAllPayrolls } from '../services/payrollService';
import { getAllUsers } from '../services/userService';

const MEDIA_DEPARTMENTS = {
  financial: 'المالي', it: 'تقنية المعلومات', marketing: 'التسويق',
  news: 'الأخبار', production: 'الإنتاج', live_broadcast: 'البث المباشر',
  hr: 'الموارد البشرية', finance: 'المالي', human_resources: 'الموارد البشرية',
  engineering: 'تقنية المعلومات', management: 'الإدارة',
};

const formatWithUnit = (amount) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' $';

const PayrollReports = () => {
  const [dateRange, setDateRange] = useState({ start: '2026-01-01', end: '2026-05-31' });
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [reportType, setReportType] = useState('monthly');
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pr] = await Promise.all([
          getAllPayrolls({ limit: 200 }).catch(() => ({ success: false })),
        ]);
        if (pr?.success) setPayrollData(pr.data?.payrolls || []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const buildAggregates = () => {
    const deptMap = {}; const monthlyMap = {}; const employeeIds = new Set();
    let totalGross = 0, totalNet = 0, totalDeductions = 0;

    payrollData.forEach(p => {
      const emp = p.employee;
      const deptKey = emp?.department || 'management';
      const deptLabel = MEDIA_DEPARTMENTS[deptKey] || deptKey;
      if (!deptMap[deptLabel]) deptMap[deptLabel] = { employees: new Set(), payroll: 0, overtime: 0, allowances: 0, deductions: 0, net: 0 };

      const gross = p.totals?.gross || 0;
      const net = p.totals?.net || 0;
      const ded = p.totals?.deductions || 0;
      const ot = p.components?.overtime?.totalAmount || 0;
      const allowances = (p.components?.allowances || []).reduce((s, a) => s + (a.amount || 0), 0);

      if (emp?._id) deptMap[deptLabel].employees.add(emp._id.toString());
      deptMap[deptLabel].payroll += gross;
      deptMap[deptLabel].overtime += ot;
      deptMap[deptLabel].allowances += allowances;
      deptMap[deptLabel].deductions += ded;
      deptMap[deptLabel].net += net;
      totalGross += gross; totalNet += net; totalDeductions += ded;
      if (emp?._id) employeeIds.add(emp._id.toString());

      const periodLabel = p.periodStart ? new Date(p.periodStart).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }) : 'غير محدد';
      if (!monthlyMap[periodLabel]) monthlyMap[periodLabel] = { gross: 0, net: 0, deductions: 0, employees: new Set() };
      monthlyMap[periodLabel].gross += gross;
      monthlyMap[periodLabel].net += net;
      monthlyMap[periodLabel].deductions += ded;
      if (emp?._id) monthlyMap[periodLabel].employees.add(emp._id.toString());
    });

    return {
      departmentData: Object.entries(deptMap).map(([department, d]) => ({ department, employees: d.employees.size, payroll: d.payroll, overtime: d.overtime, allowances: d.allowances, deductions: d.deductions, net: d.net })),
      monthlyData: Object.entries(monthlyMap).map(([month, m]) => ({ month, gross: m.gross, net: m.net, tax: m.deductions * 0.15, employees: m.employees.size })),
      totalGross, totalNet, totalDeductions, totalEmployees: employeeIds.size,
    };
  };

  const { departmentData, monthlyData, totalGross, totalNet, totalDeductions, totalEmployees } = buildAggregates();
  const filteredDepts = selectedDepartment === 'all' ? departmentData : departmentData.filter(d => d.department === selectedDepartment);
  const maxDeptPayroll = Math.max(...departmentData.map(d => d.payroll), 1);
  const totalDeptPayroll = departmentData.reduce((s, d) => s + d.payroll, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="payroll-reports-page">
      <div className="page-header mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark flex items-center">
              <FaChartLine className="h-8 w-8 ml-3 text-green-600" />
              تقارير الرواتب
            </h1>
            <p className="text-gray-600 mt-1">تحليل تكاليف العمالة والإنتاجية</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="bg-white border border-gray-300 px-4 py-2 rounded-lg flex items-center text-gray-700 hover:bg-gray-50 transition-colors">
              <FaPrint className="h-4 w-4 ml-2" /> طباعة
            </button>
            <button className="bg-success text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 transition-colors">
              <FaFileExcel className="h-4 w-4 ml-2" /> تصدير Excel
            </button>
          </div>
        </div>
      </div>

      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-icon employees"><FaUsers /></div>
          <div className="stat-info"><h3>إجمالي الموظفين</h3><p className="stat-value">{totalEmployees}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gross"><FaMoneyBillWave /></div>
          <div className="stat-info"><h3>إجمالي الرواتب</h3><p className="stat-value">{formatWithUnit(totalGross)}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EAB308' }}><FaPercentage /></div>
          <div className="stat-info"><h3>صافي الرواتب</h3><p className="stat-value">{formatWithUnit(totalNet)}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#8B5CF6' }}><FaBuilding /></div>
          <div className="stat-info"><h3>عدد الأقسام</h3><p className="stat-value">{departmentData.length}</p></div>
        </div>
      </div>

      <div className="filters-section mb-8">
        <div className="filter-group">
          <label>نوع التقرير:</label>
          <select value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="monthly">ملخص شهري</option>
            <option value="department">تحليل الأقسام</option>
            <option value="overview">نظرة عامة</option>
          </select>
        </div>
        <div className="filter-group">
          <label>تاريخ البدء:</label>
          <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
        </div>
        <div className="filter-group">
          <label>تاريخ النهاية:</label>
          <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
        </div>
        <div className="filter-group">
          <label>القسم:</label>
          <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)}>
            <option value="all">جميع الأقسام</option>
            {departmentData.map(d => <option key={d.department} value={d.department}>{d.department}</option>)}
          </select>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="section-card mb-8">
          <h2><FaChartLine className="text-secondary" /> اتجاهات الرواتب الشهرية</h2>
          <div className="overflow-x-auto">
            <table className="payroll-table">
              <thead><tr>
                <th>الشهر</th><th>إجمالي الرواتب</th><th>صافي الرواتب</th><th>الموظفون</th><th>التغير</th>
              </tr></thead>
              <tbody>
                {monthlyData.map((month, i) => (
                  <tr key={i}>
                    <td className="font-medium text-dark">{month.month}</td>
                    <td className="currency">{formatWithUnit(month.gross)}</td>
                    <td className="net">{formatWithUnit(month.net)}</td>
                    <td className="text-gray-500">{month.employees}</td>
                    <td>{i > 0 ? (
                      <span className={`text-sm font-medium ${month.gross > monthlyData[i - 1].gross ? 'text-success' : 'text-error'}`}>
                        {(((month.gross - monthlyData[i - 1].gross) / monthlyData[i - 1].gross) * 100).toFixed(1)}%
                      </span>
                    ) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="section-card">
          <h2><FaChartPie className="text-purple-600" /> تكاليف الأقسام الفعلية</h2>
          {filteredDepts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">لا توجد بيانات أقسام حالياً</p>
          ) : (
            <div className="space-y-4">
              {filteredDepts.map((dept, i) => (
                <div key={i} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{dept.department}</span>
                    <span className="text-sm text-gray-500">{dept.employees} موظف</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div className="bg-primary h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(dept.payroll / maxDeptPayroll) * 100}%` }}></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">الرواتب: {formatWithUnit(dept.payroll)}</span>
                    <span className="text-gray-600">الإضافي: {formatWithUnit(dept.overtime)}</span>
                    <span className="text-gray-600">البدلات: {formatWithUnit(dept.allowances)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section-card">
          <h2><FaChartBar className="text-primary" /> ملخص التوزيع</h2>
          {departmentData.length === 0 ? (
            <p className="text-gray-500 text-center py-8">لا توجد بيانات للعرض</p>
          ) : (
            <div className="space-y-3">
              {departmentData.sort((a, b) => b.payroll - a.payroll).map((dept, i) => {
                const pct = totalDeptPayroll > 0 ? ((dept.payroll / totalDeptPayroll) * 100).toFixed(1) : 0;
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{dept.department}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">{pct}%</span>
                      <span className="currency">{formatWithUnit(dept.payroll)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {payrollData.length > 0 && (
        <div className="section-card mb-8">
          <h2><FaMoneyBillWave className="text-success" /> ملخص كشوف الرواتب</h2>
          <div className="overflow-x-auto">
            <table className="payroll-table">
              <thead><tr>
                <th>الموظف</th><th>القسم</th><th>الفترة</th><th>الإجمالي</th><th>الخصومات</th><th>الصافي</th><th>الحالة</th>
              </tr></thead>
              <tbody>
                {payrollData.slice(0, 50).map(p => {
                  const deptLabel = p.employee?.department ? (MEDIA_DEPARTMENTS[p.employee.department] || p.employee.department) : 'غير محدد';
                  const sLabels = { paid: 'مدفوع', pending: 'معلق', approved: 'معتمد', draft: 'مسودة' };
                  const sColors = { paid: 'status-badge paid', approved: 'status-badge approved', pending: 'status-badge pending', draft: 'status-badge draft' };
                  return (
                    <tr key={p._id || p.id}>
                      <td className="font-medium text-dark">{p.employee?.name || 'غير معروف'}</td>
                      <td className="text-gray-600">{deptLabel}</td>
                      <td className="text-gray-500">{p.periodStart ? new Date(p.periodStart).toLocaleDateString('ar-EG') : '-'}</td>
                      <td className="currency">{formatWithUnit(p.totals?.gross || 0)}</td>
                      <td className="currency">{formatWithUnit(p.totals?.deductions || 0)}</td>
                      <td className="net">{formatWithUnit(p.totals?.net || 0)}</td>
                      <td><span className={sColors[p.status] || 'status-badge draft'}>{sLabels[p.status] || p.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {payrollData.length > 50 && <p className="text-sm text-gray-500 mt-4 text-center">عرض أول 50 من أصل {payrollData.length} كشف راتب</p>}
        </div>
      )}

      {payrollData.length === 0 && (
        <div className="empty-state">
          <FaChartBar className="text-gray-300" style={{ width: '4rem', height: '4rem' }} />
          <h3>لا توجد بيانات رواتب</h3>
          <p>لم يتم تسجيل أي كشوف رواتب بعد. ابدأ بمعالجة الرواتب من قسم معالجة الرواتب.</p>
        </div>
      )}
    </div>
  );
};

export default PayrollReports;
