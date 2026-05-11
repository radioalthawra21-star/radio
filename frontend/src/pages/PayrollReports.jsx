import React, { useState, useEffect } from 'react';
import { FaChartLine, FaChartBar, FaChartPie, FaDownload, FaPrint, FaFileExcel, FaFilePdf, FaBuilding, FaUsers, FaMoneyBillWave } from 'react-icons/fa';
import DynamicNumber from '../components/DynamicNumber';
import { getAllPayrolls } from '../services/payrollService';
import { getAllUsers } from '../services/userService';
import './PayrollReports.css';

const MEDIA_DEPARTMENTS = {
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

const PayrollReports = () => {
  const [dateRange, setDateRange] = useState({ start: '2026-01-01', end: '2026-05-31' });
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [reportType, setReportType] = useState('monthly');

  const [payrollData, setPayrollData] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pr, us] = await Promise.all([
          getAllPayrolls({ limit: 200 }),
          getAllUsers ? getAllUsers().catch(() => ({ success: false })) : { success: false }
        ]);

        if (pr?.success) {
          setPayrollData(pr.data?.payrolls || []);
        }
        if (us?.success) {
          setUsers(us.data?.users || us.data || []);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const buildAggregates = () => {
    const deptMap = {};
    let totalGross = 0, totalNet = 0, totalDeductions = 0;
    const employeeIds = new Set();
    const monthlyMap = {};

    payrollData.forEach((p) => {
      const emp = p.employee;
      const deptKey = emp?.department || 'management';
      const deptLabel = MEDIA_DEPARTMENTS[deptKey] || deptKey;

      if (!deptMap[deptLabel]) {
        deptMap[deptLabel] = { employees: new Set(), payroll: 0, overtime: 0, allowances: 0, deductions: 0, net: 0 };
      }

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

      totalGross += gross;
      totalNet += net;
      totalDeductions += ded;
      if (emp?._id) employeeIds.add(emp._id.toString());

      const periodLabel = p.periodStart
        ? new Date(p.periodStart).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })
        : 'غير محدد';
      if (!monthlyMap[periodLabel]) {
        monthlyMap[periodLabel] = { gross: 0, net: 0, deductions: 0, employees: new Set(), tax: 0 };
      }
      monthlyMap[periodLabel].gross += gross;
      monthlyMap[periodLabel].net += net;
      monthlyMap[periodLabel].deductions += ded;
      if (emp?._id) monthlyMap[periodLabel].employees.add(emp._id.toString());
    });

    const departmentData = Object.entries(deptMap).map(([department, d]) => ({
      department,
      employees: d.employees.size,
      payroll: d.payroll,
      overtime: d.overtime,
      allowances: d.allowances,
      deductions: d.deductions,
      net: d.net,
    }));

    const monthlyData = Object.entries(monthlyMap).map(([month, m]) => ({
      month,
      gross: m.gross,
      net: m.net,
      tax: m.deductions * 0.15,
      employees: m.employees.size,
    }));

    const totalEmployees = employeeIds.size;
    return { departmentData, monthlyData, totalGross, totalNet, totalDeductions, totalEmployees };
  };

  const aggregates = buildAggregates();
  const { departmentData, monthlyData, totalGross, totalNet, totalDeductions, totalEmployees } = aggregates;

  const filteredDepts = selectedDepartment === 'all'
    ? departmentData
    : departmentData.filter((d) => d.department === selectedDepartment);

  const formatCurrency = (amount, size = 'normal') => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  const maxDeptPayroll = Math.max(...departmentData.map((d) => d.payroll), 1);
  const totalDeptPayroll = departmentData.reduce((s, d) => s + d.payroll, 0);

  const handleExport = (format) => {
    console.log(`تصدير التقرير بتنسيق ${format}`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="payroll-reports-page">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaChartLine className="h-8 w-8 ml-3 text-green-600" />
              تقارير الرواتب
            </h1>
            <p className="text-gray-600 mt-1">تحليل تكاليف العمالة والإنتاجية - مؤسسة إعلامية غير ربحية</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handlePrint()}
              className="bg-white border border-gray-300 px-4 py-2 rounded-lg flex items-center text-gray-700 hover:bg-gray-50"
            >
              <FaPrint className="h-4 w-4 ml-2" />
              طباعة
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700"
            >
              <FaFileExcel className="h-4 w-4 ml-2" />
              تصدير Excel
            </button>
          </div>
        </div>
      </div>

      {/* ملخص سريع */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-lg"><FaUsers className="h-5 w-5 text-blue-600" /></div>
            <span className="text-sm text-gray-500">إجمالي الموظفين</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 p-2 rounded-lg"><FaMoneyBillWave className="h-5 w-5 text-green-600" /></div>
            <span className="text-sm text-gray-500">إجمالي الرواتب</span>
          </div>
          <p className="stat-value-cell">{formatCurrency(totalGross, 'xl')}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-yellow-100 p-2 rounded-lg"><FaChartBar className="h-5 w-5 text-yellow-600" /></div>
            <span className="text-sm text-gray-500">صافي الرواتب</span>
          </div>
          <p className="stat-value-cell">{formatCurrency(totalNet, 'xl')}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-100 p-2 rounded-lg"><FaBuilding className="h-5 w-5 text-purple-600" /></div>
            <span className="text-sm text-gray-500">عدد الأقسام</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{departmentData.length}</p>
        </div>
      </div>

      {/* فلاتر */}
      <div className="report-filters bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">فلاتر التقارير</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع التقرير</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="monthly">ملخص شهري</option>
              <option value="department">تحليل الأقسام</option>
              <option value="overview">نظرة عامة</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البدء</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ النهاية</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">جميع الأقسام</option>
              {departmentData.map((d) => (
                <option key={d.department} value={d.department}>{d.department}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* اتجاهات شهرية */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <FaChartLine className="h-5 w-5 ml-2 text-blue-600" />
            اتجاهات الرواتب الشهرية
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الشهر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجمالي الرواتب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">صافي الرواتب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الموظفون</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التغير</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyData.map((month, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{month.month}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-cell">{formatCurrency(month.gross)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-cell">{formatCurrency(month.net)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{month.employees}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {index > 0 && (
                        <span className={`text-sm font-medium ${
                          month.gross > monthlyData[index - 1].gross ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(((month.gross - monthlyData[index - 1].gross) / monthlyData[index - 1].gross) * 100).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* تحليل الأقسام */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <FaChartPie className="h-5 w-5 ml-2 text-purple-600" />
            تكاليف الأقسام الفعلية
          </h2>

          {filteredDepts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">لا توجد بيانات أقسام حالياً</p>
          ) : (
            <div className="space-y-4">
              {filteredDepts.map((dept, index) => (
                <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{dept.department}</span>
                    <span className="text-sm text-gray-500">{dept.employees} موظف</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(dept.payroll / maxDeptPayroll) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">الرواتب: {formatCurrency(dept.payroll, 'small')}</span>
                    <span className="text-gray-600">الإضافي: {formatCurrency(dept.overtime, 'small')}</span>
                    <span className="text-gray-600">البدلات: {formatCurrency(dept.allowances, 'small')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <FaChartBar className="h-5 w-5 ml-2 text-orange-600" />
            ملخص التوزيع
          </h2>

          {departmentData.length === 0 ? (
            <p className="text-gray-500 text-center py-8">لا توجد بيانات للعرض</p>
          ) : (
            <div className="space-y-3">
              {departmentData
                .sort((a, b) => b.payroll - a.payroll)
                .map((dept, i) => {
                  const pct = totalDeptPayroll > 0 ? ((dept.payroll / totalDeptPayroll) * 100).toFixed(1) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        <span className="text-sm font-medium text-gray-900">{dept.department}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{pct}%</span>
                        <span className="text-cell">{formatCurrency(dept.payroll, 'small')}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* تفصيل الرواتب حسب الفئة */}
      {payrollData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <FaMoneyBillWave className="h-5 w-5 ml-2 text-green-600" />
            ملخص كشوف الرواتب
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الموظف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">القسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفترة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجمالي</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الخصومات</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الصافي</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollData.slice(0, 50).map((p) => {
                  const deptLabel = p.employee?.department
                    ? (MEDIA_DEPARTMENTS[p.employee.department] || p.employee.department)
                    : 'غير محدد';
                  const statusLabels = {
                    paid: 'مدفوع',
                    pending: 'معلق',
                    approved: 'معتمد',
                    draft: 'مسودة',
                  };
                  const statusColors = {
                    paid: 'bg-green-100 text-green-800',
                    approved: 'bg-blue-100 text-blue-800',
                    pending: 'bg-yellow-100 text-yellow-800',
                    draft: 'bg-gray-100 text-gray-800',
                  };
                  return (
                    <tr key={p._id || p.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {p.employee?.name || 'غير معروف'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{deptLabel}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {p.periodStart ? new Date(p.periodStart).toLocaleDateString('ar-EG') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-cell">{formatCurrency(p.totals?.gross || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-cell">{formatCurrency(p.totals?.deductions || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-cell font-semibold text-green-700">{formatCurrency(p.totals?.net || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[p.status] || 'bg-gray-100 text-gray-800'}`}>
                          {statusLabels[p.status] || p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {payrollData.length > 50 && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              عرض أول 50 من أصل {payrollData.length} كشف راتب
            </p>
          )}
        </div>
      )}

      {payrollData.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FaChartBar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد بيانات رواتب</h3>
          <p className="text-gray-500">لم يتم تسجيل أي كشوف رواتب بعد. ابدأ بمعالجة الرواتب من قسم معالجة الرواتب.</p>
        </div>
      )}
    </div>
  );
};

export default PayrollReports;
