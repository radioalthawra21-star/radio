import React, { useState, useEffect } from 'react';
import { getLeaveRequests } from '../../services/leaveService';
import { useDepartments } from '../../hooks/useDepartments';
import Card from '../../components/common/Card';
import { BarChart, PieChart, LineChart } from '../../components/charts';
import StatCard from '../../components/widgets/StatCard';
import { formatNumber, formatCurrency } from '../../utils/analyticsUtils';
import { formatDateArabic } from '../../utils/dateUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const LeaveReports = () => {
  const [leaveStats, setLeaveStats] = useState(null);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    department: '',
    startDate: '',
    endDate: '',
    leaveType: '' // all, annual, sick, emergency, unpaid
  });
  const { getDepartmentName, departments: allDepartments } = useDepartments();

  useEffect(() => {
    fetchLeaveData();
  }, [filter]);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch leave records
      const recordsResponse = await getLeaveRequests(filter);
      if (recordsResponse.success) {
        const records = recordsResponse.data?.requests || recordsResponse.data || [];
        const recordsArray = Array.isArray(records) ? records : [];
        setLeaveRecords(recordsArray);
        
        // Prepare chart data
        const chartData = prepareChartData(recordsArray);
        setChartData(chartData);
      }
    } catch (err) {
      console.error('Error fetching leave data:', err);
      setError('فشل في تحميل بيانات الإجازات');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (records) => {
    // Group by leave type and count occurrences
    const leaveTypeCounts = {
      annual: 0,
      sick: 0,
      emergency: 0,
      unpaid: 0,
      other: 0
    };
    
    records.forEach(record => {
      const type = record.leaveType || 'other';
      if (leaveTypeCounts[type] !== undefined) {
        leaveTypeCounts[type]++;
      } else {
        leaveTypeCounts.other++;
      }
    });
    
    // Group by month for trend analysis
    const monthlyData = {};
    
    records.forEach(record => {
      const date = record.date ? new Date(record.date) : new Date();
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, paid: 0, unpaid: 0 };
      }
      
      monthlyData[monthKey].total++;
      if (record.isPaid !== false) {
        monthlyData[monthKey].paid++;
      } else {
        monthlyData[monthKey].unpaid++;
      }
    });
    
    // Convert to arrays for charting
    const months = Object.keys(monthlyData)
      .sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        return yearA * 12 + monthA - (yearB * 12 + monthB);
      })
      .map(key => {
        const [year, month] = key.split('-').map(Number);
        return `${formatDateArabic(new Date(year, month - 1))}`;
      });
    
    const totalLeaveData = months.map((_, i) => monthlyData[Object.keys(monthlyData).sort()[i]].total);
    const paidLeaveData = months.map((_, i) => monthlyData[Object.keys(monthlyData).sort()[i]].paid);
    const unpaidLeaveData = months.map((_, i) => monthlyData[Object.keys(monthlyData).sort()[i]].unpaid);
    
    return {
      leaveTypeCounts,
      monthlyTrend: {
        labels: months,
        datasets: [
          {
            label: 'إجمالي الإجازات',
            data: totalLeaveData,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)'
          },
          {
            label: 'إجازات مدفوعة',
            data: paidLeaveData,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)'
          },
          {
            label: 'إجازات غير مدفوعة',
            data: unpaidLeaveData,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)'
          }
        ]
      }
    };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setRtl(true);
    
    // Title
    doc.setFontSize(18);
    doc.text('تقرير الإجازات', 105, 20, { align: 'center' });
    
    // Date
    doc.setFontSize(12);
    doc.text(`تاريخ التقرير: ${formatDateArabic(new Date())}`, 105, 30, { align: 'center' });
    
    // Stats
    if (leaveStats) {
      doc.setFontSize(14);
      doc.text('إحصائيات الإجازات', 14, 40);
      doc.setFontSize(10);
      let yPos = 50;
      
      const statsLines = [
        `إجمالي أيام الإجازة: ${formatNumber(leaveStats.totalLeaveDays || 0)}`,
        `متوسط أيام الإجازة لكل موظف: ${formatNumber(leaveStats.averageLeavePerEmployee || 0)}`,
        `نسبة الإجازات المدفوعة: ${formatNumber(leaveStats.paidLeavePercentage || 0)}%`,
        `إجمالي الإجازات السنوية: ${formatNumber(leaveStats.totalAnnualLeave || 0)}`,
        `إجمالي الإجازات المرضية: ${formatNumber(leaveStats.totalSickLeave || 0)}`,
        `إجمالي الإجازات الطارئة: ${formatNumber(leaveStats.totalEmergencyLeave || 0)}`
      ];
      
      statsLines.forEach(line => {
        doc.text(line, 14, yPos);
        yPos += 7;
      });
    }
    
    // Table
    doc.setRtl(false);
    const tableData = leaveRecords.map(record => [
      record.employeeName || '-',
      record.leaveType || '-',
      record.startDate ? formatDateArabic(record.startDate) : '-',
      record.endDate ? formatDateArabic(record.endDate) : '-',
      record.durationDays || '0',
      record.isPaid ? 'مدفوعة' : 'غير مدفوعة',
      record.notes || '-'
    ]);
    
    doc.autoTable({
      head: [['الموظف', 'نوع الإجازة', 'من تاريخ', 'إلى تاريخ', 'المدة (أيام)', 'الحالة', 'ملاحظات']],
      body: tableData,
      startY: leaveStats ? 100 : 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' }
    });
    
    doc.save('leave-report.pdf');
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
        <h1 className="text-3xl font-bold text-dark">تقارير الإجازات</h1>
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
          <div>
            <label className="label">نوع الإجازة</label>
            <select
              className="input"
              value={filter.leaveType}
              onChange={(e) => setFilter({ ...filter, leaveType: e.target.value })}
            >
              <option value="">الكل</option>
              <option value="annual">سنوية</option>
              <option value="sick">مرضية</option>
              <option value="emergency">طارئة</option>
              <option value="unpaid">غير مدفوعة</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      {leaveStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="إجمالي أيام الإجازة"
            value={formatNumber(leaveStats.totalLeaveDays || 0)}
            icon="📅"
            color="blue"
          />
          <StatCard
            title="متوسط الإجازة لكل موظف"
            value={formatNumber(leaveStats.averageLeavePerEmployee || 0)}
            icon="👥"
            color="green"
            trend={leaveStats.leavePerEmployeeTrend}
          />
          <StatCard
            title="نسبة الإجازات المدفوعة"
            value={`${formatNumber(leaveStats.paidLeavePercentage || 0)}%`}
            icon="💰"
            color="orange"
          />
          <StatCard
            title="الإجازات السنوية"
            value={formatNumber(leaveStats.totalAnnualLeave || 0)}
            icon="🏖️"
            color="purple"
          />
          <StatCard
            title="الإجازات المرضية"
            value={formatNumber(leaveStats.totalSickLeave || 0)}
            icon="🤒"
            color="red"
          />
          <StatCard
            title="الإجازات الطارئة"
            value={formatNumber(leaveStats.totalEmergencyLeave || 0)}
            icon="🚨"
            color="yellow"
          />
        </div>
      )}

      {/* Charts Section */}
      {chartData && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-dark mb-4">تحليلات الإجازات</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold text-dark mb-4">توزيع أنواع الإجازات</h3>
              <PieChart
                data={{
                  labels: ['سنوية', 'مرضية', 'طارئة', 'غير مدفوعة', 'أخرى'],
                  data: [
                    chartData.leaveTypeCounts.annual,
                    chartData.leaveTypeCounts.sick,
                    chartData.leaveTypeCounts.emergency,
                    chartData.leaveTypeCounts.unpaid,
                    chartData.leaveTypeCounts.other
                  ]
                }}
                width={400}
                height={300}
              />
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold text-dark mb-4">الاتجاه الشهري للإجازات</h3>
              <LineChart 
                data={chartData.monthlyTrend} 
                options={{ 
                  plugins: { 
                    legend: { position: 'top' },
                    title: { 
                      display: true, 
                      text: 'الاتجاه الشهري لنوع الإجازات' 
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

      {/* Leave Records Table */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold text-dark mb-4">سجلات الإجازات</h2>
        {leaveRecords.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد سجلات إجازات</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الموظف</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">نوع الإجازة</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">من تاريخ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">إلى تاريخ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">المدة (أيام)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaveRecords.map((record, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-left text-sm text-gray-900">{record.employeeName || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{record.leaveType || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{record.startDate ? formatDateArabic(record.startDate) : '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{record.endDate ? formatDateArabic(record.endDate) : '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{record.durationDays || '0'}</td>
                    <td className="px-6 py-4 text-left text-sm font-medium">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.isPaid === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {record.isPaid === false ? 'غير مدفوعة' : 'مدفوعة'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-left text-sm">{record.notes || '-'}</td>
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

export default LeaveReports;