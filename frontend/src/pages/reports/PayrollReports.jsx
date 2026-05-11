import React, { useState, useEffect } from 'react';
import { getPayrollSummary, getAllPayrolls } from '../../services/payrollService';
import { useDepartments } from '../../hooks/useDepartments';
import Card from '../../components/common/Card';
import { BarChart, PieChart, LineChart } from '../../components/charts';
import StatCard from '../../components/widgets/StatCard';
import { formatNumber, formatCurrency } from '../../utils/analyticsUtils';
import { formatDateArabic } from '../../utils/dateUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const PayrollReports = () => {
  const [payrollStats, setPayrollStats] = useState(null);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    department: '',
    startDate: '',
    endDate: '',
    period: 'monthly'
  });
  const { getDepartmentName, departments: allDepartments } = useDepartments();

  useEffect(() => {
    fetchPayrollData();
  }, [filter]);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch payroll stats
      const statsResponse = await getPayrollSummary(filter);
      if (statsResponse.success) {
        setPayrollStats(statsResponse.data);
      }
      
      // Fetch payroll records
      const recordsResponse = await getAllPayrolls(filter);
      if (recordsResponse.success) {
        setPayrollRecords(recordsResponse.data || []);
        
        // Prepare chart data
        const chartData = prepareChartData(recordsResponse.data || []);
        setChartData(chartData);
      }
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      setError('فشل في تحميل بيانات الرواتب');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (records) => {
    // Group by month and calculate totals
    const grouped = {};
    
    records.forEach(record => {
      const date = record.date ? new Date(record.date) : new Date();
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = { gross: 0, deductions: 0, net: 0, count: 0 };
      }
      
      grouped[monthKey].gross += record.gross || 0;
      grouped[monthKey].deductions += record.deductions || 0;
      grouped[monthKey].net += record.net || 0;
      grouped[monthKey].count++;
    });
    
    // Convert to arrays for charting
    const months = Object.keys(grouped)
      .sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        return yearA * 12 + monthA - (yearB * 12 + monthB);
      })
      .map(key => {
        const [year, month] = key.split('-').map(Number);
        return `${formatDateArabic(new Date(year, month - 1))}`;
      });
    
    const grossData = months.map((_, i) => grouped[Object.keys(grouped).sort()[i]].gross);
    const deductionsData = months.map((_, i) => grouped[Object.keys(grouped).sort()[i]].deductions);
    const netData = months.map((_, i) => grouped[Object.keys(grouped).sort()[i]].net);
    
    return {
      labels: months,
      datasets: [
        {
          label: 'الإجمالي',
          data: grossData,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)'
        },
        {
          label: 'الخصومات',
          data: deductionsData,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)'
        },
        {
          label: 'الصافي',
          data: netData,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)'
        }
      ]
    };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setRtl(true);
    
    // Title
    doc.setFontSize(18);
    doc.text('تقرير الرواتب', 105, 20, { align: 'center' });
    
    // Date
    doc.setFontSize(12);
    doc.text(`تاريخ التقرير: ${formatDateArabic(new Date())}`, 105, 30, { align: 'center' });
    
    // Stats
    if (payrollStats) {
      doc.setFontSize(14);
      doc.text('إحصائيات الرواتب', 14, 40);
      doc.setFontSize(10);
      let yPos = 50;
      
      const statsLines = [
        `إجمالي الرواتب المدفوعة: ${formatCurrency(payrollStats.totalPaid || 0)}`,
        `متوسط الراتب الشهري: ${formatCurrency(payrollStats.averageMonthly || 0)}`,
        `إجمالي الموظفين: ${formatNumber(payrollStats.totalEmployees || 0)}`,
        `متوسط الزيادة السنوية: ${formatNumber(payrollStats.annualIncrease || 0)}%`,
        `إجمالي الخصومات: ${formatCurrency(payrollStats.totalDeductions || 0)}`,
        `متوسط الخصومات لكل موظف: ${formatCurrency(payrollStats.averageDeductions || 0)}`
      ];
      
      statsLines.forEach(line => {
        doc.text(line, 14, yPos);
        yPos += 7;
      });
    }
    
    // Table
    doc.setRtl(false);
    const tableData = payrollRecords.map(record => [
      record.employeeName || '-',
      record.month || '-',
      formatCurrency(record.baseSalary || 0),
      formatCurrency(record.allowances || 0),
      formatCurrency(record.bonuses || 0),
      formatCurrency(record.overtime || 0),
      formatCurrency(record.gross || 0),
      formatCurrency(record.deductions || 0),
      formatCurrency(record.net || 0)
    ]);
    
    doc.autoTable({
      head: [['الموظف', 'الشهر', 'الأساسي', 'البدلات', 'المكافآت', 'الإضافي', 'الإجمالي', 'الخصومات', 'الصافي']],
      body: tableData,
      startY: payrollStats ? 100 : 40,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' }
    });
    
    doc.save('payroll-report.pdf');
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
        <h1 className="text-3xl font-bold text-dark">تقارير الرواتب</h1>
        <button onClick={exportToPDF} className="btn btn-primary">
          📥 تصدير PDF
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
            <label className="label">من تاريخ</label>
            <input
              type="date"
              className="input"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">إلى تاريخ</label>
            <input
              type="date"
              className="input"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilter({ department: '', startDate: '', endDate: '' })}
              className="btn btn-outline w-full"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      {payrollStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="إجمالي الرواتب المدفوعة"
            value={formatCurrency(payrollStats.totalPaid || 0)}
            icon="💰"
            color="green"
          />
          <StatCard
            title="متوسط الراتب الشهري"
            value={formatCurrency(payrollStats.averageMonthly || 0)}
            icon="📊"
            color="blue"
            trend={payrollStats.monthlyTrend}
          />
          <StatCard
            title="إجمالي الموظفين"
            value={formatNumber(payrollStats.totalEmployees || 0)}
            icon="👥"
            color="purple"
          />
          <StatCard
            title="متوسط الزيادة السنوية"
            value={formatNumber(payrollStats.annualIncrease || 0) + '%'}
            icon="📈"
            color="orange"
          />
          <StatCard
            title="إجمالي الخصومات"
            value={formatCurrency(payrollStats.totalDeductions || 0)}
            icon="➖"
            color="red"
          />
          <StatCard
            title="متوسط الخصومات لكل موظف"
            value={formatCurrency(payrollStats.averageDeductions || 0)}
            icon="➗"
            color="yellow"
          />
        </div>
      )}

      {/* Charts Section */}
      {chartData && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-dark mb-4">اتجاهات الرواتب</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold text-dark mb-4">الاتجاه الشهري للرواتب</h3>
              <LineChart 
                data={chartData} 
                options={{ 
                  plugins: { 
                    legend: { position: 'top' },
                    title: { 
                      display: true, 
                      text: 'التطور الشهري للرواتب الإجمالية والخصومات والصافي' 
                    } 
                  } 
                }} 
                width={400} 
                height={300} 
              />
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold text-dark mb-4">توزيع مكونات الراتب</h3>
              {/* Example pie chart for salary composition */}
              <PieChart
                data={{
                  labels: ['الأساسي', 'البدلات', 'المكافآت', 'الإضافي'],
                  data: [
                    payrollStats?.averageBaseSalary || 0,
                    payrollStats?.averageAllowances || 0,
                    payrollStats?.averageBonuses || 0,
                    payrollStats?.averageOvertime || 0
                  ]
                }}
                width={400}
                height={300}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payroll Records Table */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold text-dark mb-4">سجلات الرواتب</h2>
        {payrollRecords.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد سجلات رواتب</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الموظف</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الشهر</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الأساسي</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">البدلات</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">المكافآت</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الإضافي</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الإجمالي</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الخصومات</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الصافي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payrollRecords.map((record, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-left text-sm text-gray-900">{record.employeeName || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{record.month || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{formatCurrency(record.baseSalary || 0)}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{formatCurrency(record.allowances || 0)}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{formatCurrency(record.bonuses || 0)}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{formatCurrency(record.overtime || 0)}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{formatCurrency(record.gross || 0)}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{formatCurrency(record.deductions || 0)}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{formatCurrency(record.net || 0)}</td>
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

export default PayrollReports;