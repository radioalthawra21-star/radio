import React, { useState, useEffect } from 'react';
import { getDepartmentStats, getDepartmentEmployees } from '../../services/departmentService';
import { getDepartmentPerformance } from '../../services/userService'; // Assuming performance data is in user service
import Card from '../../components/common/Card';
import { BarChart, PieChart, LineChart } from '../../components/charts';
import { StatCard } from '../../components/widgets/StatCard';
import { formatNumber, formatCurrency } from '../../utils/analyticsUtils';
import { formatDateArabic } from '../../utils/dateUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const DepartmentReports = () => {
  const [deptStats, setDeptStats] = useState(null);
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [deptPerformance, setDeptPerformance] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    department: '',
    period: 'monthly'
  });
  const { getDepartmentName, departments: allDepartments } = useDepartments();

  useEffect(() => {
    fetchDepartmentData();
  }, [filter]);

  const fetchDepartmentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch department stats
      const statsResponse = await getDepartmentStats(filter);
      if (statsResponse.success) {
        setDeptStats(statsResponse.data);
      }
      
      // Fetch department employees
      const employeesResponse = await getDepartmentEmployees(filter);
      if (employeesResponse.success) {
        setDeptEmployees(employeesResponse.data || []);
      }
      
      // Fetch department performance
      const performanceResponse = await getDepartmentPerformance(filter);
      if (performanceResponse.success) {
        setDeptPerformance(performanceResponse.data);
      }
      
      // Prepare chart data
      const chartData = prepareChartData(
        deptStats || null,
        deptEmployees || [],
        deptPerformance || null
      );
      setChartData(chartData);
    } catch (err) {
      console.error('Error fetching department data:', err);
      setError('فشل في تحميل بيانات الأقسام');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (stats, employees, performance) => {
    // Prepare data for various charts
    
    // Employee count by department (if we have multiple departments)
    const deptEmployeeCounts = {};
    if (Array.isArray(employees) && employees.length > 0) {
      employees.forEach(emp => {
        const dept = emp.department || 'غير محدد';
        if (!deptEmployeeCounts[dept]) {
          deptEmployeeCounts[dept] = 0;
        }
        deptEmployeeCounts[dept]++;
      });
    }
    
    // Performance trends over time (if we have historical data)
    const performanceTrend = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Current'],
      datasets: [
        {
          label: 'متوسط الأداء',
          data: [
            performance?.q1Score || 0,
            performance?.q2Score || 0,
            performance?.q3Score || 0,
            performance?.q4Score || 0,
            performance?.currentScore || 0
          ],
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)'
        }
      ]
    };
    
    // Department distribution
    const deptDistribution = {
      labels: Object.keys(deptEmployeeCounts),
      data: Object.values(deptEmployeeCounts)
    };
    
    return {
      deptEmployeeCounts,
      performanceTrend,
      deptDistribution
    };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setRtl(true);
    
    // Title
    doc.setFontSize(18);
    doc.text('تقرير الأقسام', 105, 20, { align: 'center' });
    
    // Date
    doc.setFontSize(12);
    doc.text(`تاريخ التقرير: ${formatDateArabic(new Date())}`, 105, 30, { align: 'center' });
    
    // Stats
    if (deptStats) {
      doc.setFontSize(14);
      doc.text('إحصائيات الأقسام', 14, 40);
      doc.setFontSize(10);
      let yPos = 50;
      
      const statsLines = [
        `إجمالي الأقسام: ${formatNumber(deptStats.totalDepartments || 0)}`,
        `إجمالي الموظفين: ${formatNumber(deptStats.totalEmployees || 0)}`,
        `متوسط الأداء العام: ${formatNumber(deptStats.averagePerformance || 0)}`,
        `إجمالي الرواتب الشهرية: ${formatCurrency(deptStats.totalMonthlyPayroll || 0)}`,
        `متوسط الراتب الشهري: ${formatCurrency(deptStats.averageMonthlySalary || 0)}`,
        `إجمالي الساعات العاملة: ${formatNumber(deptStats.totalWorkHours || 0)}`
      ];
      
      statsLines.forEach(line => {
        doc.text(line, 14, yPos);
        yPos += 7;
      });
    }
    
    // Table - Department Employees
    doc.setRtl(false);
    doc.addPage();
    doc.setFontSize(16);
    doc.text('قائمة الموظفين حسب القسم', 105, 20, { align: 'center' });
    
    const employeeTableData = deptEmployees.map(emp => [
      emp.name || '-',
      emp.department ? getDepartmentName(emp.department) : '-',
      emp.position || '-',
      emp.status === 'active' ? 'نشط' : 'غير نشط',
      emp.hireDate ? formatDateArabic(emp.hireDate) : '-',
      formatCurrency(emp.salary || 0)
    ]);
    
    doc.autoTable({
      head: [['الموظف', 'القسم', 'المنصب', 'الحالة', 'تاريخ التوظيف', 'الراتب']],
      body: employeeTableData,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' }
    });
    
    // Table - Department Statistics
    doc.addPage();
    doc.setFontSize(16);
    doc.text('إحصائيات الأقسام المفصلة', 105, 20, { align: 'center' });
    
    const deptTableData = deptStats?.departmentBreakdown || [];
    
    doc.autoTable({
      head: [['القسم', 'الموظفين', 'الموظفين النشطين', 'متوسط الأداء', 'الراتب المتوسط', 'الساعات العاملة']],
      body: deptTableData.map(dept => [
        dept.name || '-',
        dept.employeeCount || '0',
        dept.activeEmployeeCount || '0',
        formatNumber(dept.averagePerformance || 0),
        formatCurrency(dept.averageSalary || 0),
        formatNumber(dept.workHours || '0')
      ]),
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' }
    });
    
    doc.save('department-report.pdf');
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">تقارير الأقسام</h1>
        <button onClick={exportToPDF} className="btn btn-primary">
          📥 تصدير PDF
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">القسم</label>
            <select
              className="input"
              value={filter.department}
              onChange={(e) => setFilter({ ...filter, department: e.target.value })}
            >
              <option value="">الكل</option>
              {allDepartments.map(dept => (
                <option key={dept._id} value={dept.name}>
                  {getDepartmentName(dept.name)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">الفترة</label>
            <select
              className="input"
              value={filter.period}
              onChange={(e) => setFilter({ ...filter, period: e.target.value })}
            >
              <option value="monthly">شهري</option>
              <option value="quarterly">ربع سنوي</option>
              <option value="yearly">سنوي</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilter({ department: '', period: '' })}
              className="btn btn-outline w-full"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      {deptStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="إجمالي الأقسام"
            value={formatNumber(deptStats.totalDepartments || 0)}
            icon="🏢"
            color="blue"
          />
          <StatCard
            title="إجمالي الموظفين"
            value={formatNumber(deptStats.totalEmployees || 0)}
            icon="👥"
            color="green"
          />
          <StatCard
            title="متوسط الأداء العام"
            value={formatNumber(deptStats.averagePerformance || 0)}
            icon="📊"
            color="orange"
          />
          <StatCard
            title="إجمالي الرواتب الشهرية"
            value={formatCurrency(deptStats.totalMonthlyPayroll || 0)}
            icon="💰"
            color="purple"
          />
          <StatCard
            title="متوسط الراتب الشهري"
            value={formatCurrency(deptStats.averageMonthlySalary || 0)}
            icon="📈"
            color="red"
          />
          <StatCard
            title="إجمالي الساعات العاملة"
            value={formatNumber(deptStats.totalWorkHours || 0)}
            icon="⏰"
            color="yellow"
          />
        </div>
      )}

      {/* Charts Section */}
      {chartData && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-dark mb-4">تحليلات الأقسام</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold text-dark mb-4">توزيع الموظفين حسب القسم</h3>
              <PieChart
                data={{
                  labels: Object.keys(chartData.deptDistribution.labels),
                  data: Object.values(chartData.deptDistribution.data)
                }}
                width={400}
                height={300}
              />
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold text-dark mb-4">اتجاه أداء القسم</h3>
              <LineChart 
                data={chartData.performanceTrend} 
                options={{ 
                  plugins: { 
                    legend: { position: 'top' },
                    title: { 
                      display: true, 
                      text: 'اتجاه متوسط الأداءquarterly' 
                    } 
                  } 
                }} 
                width={400} 
                height={300} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Department Employees Table */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold text-dark mb-4">قائمة الموظفين حسب القسم</h2>
        {deptEmployees.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد موظفين</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الموظف</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">القسم</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">المنصب</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">تاريخ التوظيف</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الراتب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deptEmployees.map((emp, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-left text-sm text-gray-900>{emp.name || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500>{emp.department ? getDepartmentName(emp.department) : '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500>{emp.position || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm font-medium>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {emp.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-left text-sm>{emp.hireDate ? formatDateArabic(emp.hireDate) : '-'}</td>
                    <td className="px-6 py-4 text-left text-sm>{formatCurrency(emp.salary || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Department Breakdown Table */}
      {deptStats?.departmentBreakdown && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-dark mb-4">إحصائيات الأقسام المفصلة</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">القسم</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الموظفين</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الموظفين النشطين</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">متوسط الأداء</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الراتب المتوسط</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الساعات العاملة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deptStats.departmentBreakdown.map((dept, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-left text-sm text-gray-900>{dept.name || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500>{dept.employeeCount || '0'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500>{dept.activeEmployeeCount || '0'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500>{formatNumber(dept.averagePerformance || 0)}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500>{formatCurrency(dept.averageSalary || 0)}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500>{formatNumber(dept.workHours || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DepartmentReports;