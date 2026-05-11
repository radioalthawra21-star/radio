import React, { useState, useEffect } from 'react';
import { getJobStats, getApplications, getJobPostings } from '../../services/recruitmentPerformanceService';
import Card from '../../components/common/Card';
import { BarChart, PieChart, LineChart } from '../../components/charts';
import { StatCard } from '../../components/widgets/StatCard';
import { formatNumber } from '../../utils/analyticsUtils';
import { formatDateArabic } from '../../utils/dateUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const RecruitmentReports = () => {
  const [jobStats, setJobStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [jobPostings, setJobPostings] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    department: '',
    status: '',
    period: 'monthly'
  });
  const { getDepartmentName, departments: allDepartments } = useDepartments();

  useEffect(() => {
    fetchRecruitmentData();
  }, [filter]);

  const fetchRecruitmentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch job stats
      const statsResponse = await getJobStats();
      if (statsResponse.success) {
        setJobStats(statsResponse.data);
      }
      
      // Fetch job postings
      const jobsResponse = await getJobPostings({
        department: filter.department,
        status: filter.status
      });
      if (jobsResponse.success) {
        setJobPostings(jobsResponse.data?.jobPostings || []);
      }
      
      // Fetch applications
      const appsResponse = await getApplications({
        department: filter.department,
        status: filter.status
      });
      if (appsResponse.success) {
        setApplications(appsResponse.data?.applications || []);
        
        // Prepare chart data
        const chartData = prepareChartData(appsResponse.data?.applications || [], jobsResponse.data?.jobPostings || []);
        setChartData(chartData);
      }
    } catch (err) {
      console.error('Error fetching recruitment data:', err);
      setError('فشل في تحميل بيانات التوظيف');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (applications, jobPostings) => {
    // Group applications by status
    const statusCounts = {
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0
    };
    
    applications.forEach(app => {
      const status = app.status || 'applied';
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
    });
    
    // Group jobs by department
    const deptCounts = {};
    
    jobPostings.forEach(job => {
      const dept = job.department?.name || 'غير محدد';
      if (!deptCounts[dept]) {
        deptCounts[dept] = 0;
      }
      deptCounts[dept]++;
    });
    
    // Group applications by month for trend analysis
    const monthlyData = {};
    
    applications.forEach(app => {
      const date = application.createdAt ? new Date(application.createdAt) : new Date();
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, hired: 0 };
      }
      
      monthlyData[monthKey].total++;
      if (app.status === 'hired') {
        monthlyData[monthKey].hired++;
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
    
    const totalApplications = months.map((_, i) => monthlyData[Object.keys(monthlyData).sort()[i]].total);
    const hiredApplications = months.map((_, i) => monthlyData[Object.keys(monthlyData).sort()[i]].hired);
    
    return {
      statusCounts,
      deptCounts,
      monthlyTrend: {
        labels: months,
        datasets: [
          {
            label: 'إجمالي الطلبات',
            data: totalApplications,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)'
          },
          {
            label: 'طلبات التوظيف الناجحة',
            data: hiredApplications,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)'
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
    doc.text('تقرير التوظيف', 105, 20, { align: 'center' });
    
    // Date
    doc.setFontSize(12);
    doc.text(`تاريخ التقرير: ${formatDateArabic(new Date())}`, 105, 30, { align: 'center' });
    
    // Stats
    if (jobStats) {
      doc.setFontSize(14);
      doc.text('إحصائيات التوظيف', 14, 40);
      doc.setFontSize(10);
      let yPos = 50;
      
      const statsLines = [
        `إجمالي الوظائف الشاغرة: ${formatNumber(jobStats.total || 0)}`,
        `الوظائف المفتوحة حالياً: ${formatNumber(jobStats.open || 0)}`,
        `الوظائف المملوءة: ${formatNumber(jobStats.filled || 0)}`,
        `إجمالي الطلبات: ${formatNumber(jobStats.totalApplications || 0)}`,
        `معدل التحويل: ${formatNumber(jobStats.conversionRate || 0)}%`,
        `متوسط وقت التوظيف: ${formatNumber(jobStats.averageHiringTime || 0)} يوم`
      ];
      
      statsLines.forEach(line => {
        doc.text(line, 14, yPos);
        yPos += 7;
      });
    }
    
    // Table - Job Postings
    doc.setRtl(false);
    doc.addPage();
    doc.setFontSize(16);
    doc.text('قائمة الوظائف الشاغرة', 105, 20, { align: 'center' });
    
    const jobTableData = jobPostings.map(job => [
      job.title || '-',
      job.department?.name || '-',
      job.level || '-',
      job.jobType || '-',
      job.status || '-',
      job.applications || '0'
    ]);
    
    doc.autoTable({
      head: [['العنوان', 'القسم', 'المستوى', 'نوع العمل', 'الحالة', 'عدد الطلبات']],
      body: jobTableData,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' }
    });
    
    // Table - Applications
    doc.addPage();
    doc.setFontSize(16);
    doc.text('تقرير طلبات التوظيف', 105, 20, { align: 'center' });
    
    const appTableData = applications.map(app => [
      app.applicantName || '-',
      app.jobPosting?.title || '-',
      app.employeeName || '-', // If available
      app.status || '-',
      app.createdAt ? formatDateArabic(app.createdAt) : '-',
      app.notes || '-'
    ]);
    
    doc.autoTable({
      head: [['المتقدم', 'الوظيفة', 'الموظف', 'الحالة', 'تاريخ التقديم', 'ملاحظات']],
      body: appTableData,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' }
    });
    
    doc.save('recruitment-report.pdf');
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
        <h1 className="text-3xl font-bold text-dark">تقارير التوظيف</h1>
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
            <label className="label">الحالة</label>
            <select
              className="input"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">الكل</option>
              <option value="draft">مسودة</option>
              <option value="open">مفتوح</option>
              <option value="closed">مغلق</option>
              <option value="filled">ممتلئ</option>
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
              onClick={() => setFilter({ department: '', status: '', period: '' })}
              className="btn btn-outline w-full"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      {jobStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="إجمالي الوظائف الشاغرة"
            value={formatNumber(jobStats.total || 0)}
            icon="💼"
            color="blue"
          />
          <StatCard
            title="الوظائف المفتوحة"
            value={formatNumber(jobStats.open || 0)}
            icon="🔓"
            color="green"
          />
          <StatCard
            title="الوظائف المملوءة"
            value={formatNumber(jobStats.filled || 0)}
            icon="✅"
            color="purple"
          />
          <StatCard
            title="إجمالي الطلبات"
            value={formatNumber(jobStats.totalApplications || 0)}
            icon="📝"
            color="orange"
          />
          <StatCard
            title="معدل التحويل"
            value={`${formatNumber(jobStats.conversionRate || 0)}%`}
            icon="📊"
            color="red"
          />
          <StatCard
            title="متوسط وقت التوظيف"
            value={`${formatNumber(jobStats.averageHiringTime || 0)} يوم`}
            icon="⏱️"
            color="yellow"
          />
        </div>
      )}

      {/* Charts Section */}
      {chartData && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-dark mb-4">تحليلات التوظيف</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold text-dark mb-4">توزيع الطلبات حسب الحالة</h3>
              <PieChart
                data={{
                  labels: ['تم التقديم', 'فحص أولي', 'مقابلة', 'عرض', 'تم التوظيف', 'مرفوض', 'سحب الطلب'],
                  data: [
                    chartData.statusCounts.applied,
                    chartData.statusCounts.screening,
                    chartData.statusCounts.interview,
                    chartData.statusCounts.offer,
                    chartData.statusCounts.hired,
                    chartData.statusCounts.rejected,
                    chartData.statusCounts.withdrawn
                  ].filter((_, index) => [
                    'applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'
                  ][index] in chartData.statusCounts)
                }}
                width={400}
                height={300}
              />
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold text-dark mb-4">التوزيع الجغرافي للوظائف</h3>
              <PieChart
                data={{
                  labels: Object.keys(chartData.deptCounts),
                  data: Object.values(chartData.deptCounts)
                }}
                width={400}
                height={300}
              />
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-bold text-dark mb-4">الاتجاه الشهري للتوظيف</h3>
            <LineChart 
              data={chartData.monthlyTrend} 
              options={{ 
                plugins: { 
                  legend: { position: 'top' },
                  title: { 
                    display: true, 
                    text: 'الاتجاه الشهري للطلبات والتوظيفات الناجحة' 
                  } 
                } 
              }} 
              width={800} 
              height={300} 
            />
          </div>
        </div>
      )}

      {/* Job Postings Table */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold text-dark mb-4">قائمة الوظائف الشاغرة</h2>
        {jobPostings.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد وظائف شاغرة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">العنوان</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">القسم</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">المستوى</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">نوع العمل</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">عدد الطلبات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobPostings.map((job, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-left text-sm text-gray-900">{job.title || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500">{job.department?.name || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500>{job.level || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500>{job.jobType || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm font-medium>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        job.status === 'open' ? 'bg-green-100 text-green-800' :
                        job.status === 'closed' ? 'bg-red-100 text-red-800' :
                        job.status === 'filled' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {job.status === 'draft' ? 'مسودة' : 
                         job.status === 'open' ? 'مفتوح' : 
                         job.status === 'closed' ? 'مغلق' : 
                         job.status === 'filled' ? 'ممتلئ' : '-' }
                      </span>
                    </td>
                    <td className="px-6 py-4 text-left text-sm>{job.applications || '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Applications Table */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold text-dark mb-4">تقرير طلبات التوظيف</h2>
        {applications.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد طلبات توظيف</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">المتقدم</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الوظيفة</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الموظف</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">تاريخ التقديم</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications.map((app, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-left text-sm text-gray-900">{app.applicantName || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500>{app.jobPosting?.title || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm text-gray-500>{app.employeeName || '-'}</td>
                    <td className="px-6 py-4 text-left text-sm font-medium>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        app.status === 'applied' ? 'bg-yellow-100 text-yellow-800' :
                        app.status === 'screening' ? 'bg-blue-100 text-blue-800' :
                        app.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                        app.status === 'offer' ? 'bg-green-100 text-green-800' :
                        app.status === 'hired' ? 'bg-indigo-100 text-indigo-800' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        app.status === 'withdrawn' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {app.status === 'applied' ? 'تم التقديم' : 
                         app.status === 'screening' ? 'فحص أولي' : 
                         app.status === 'interview' ? 'مقابلة' : 
                         app.status === 'offer' ? 'عرض' : 
                         app.status === 'hired' ? 'تم التوظيف' : 
                         app.status === 'rejected' ? 'مرفوض' : 
                         app.status === 'withdrawn' ? 'سحب الطلب' : '-' }
                      </span>
                    </td>
                    <td className="px-6 py-4 text-left text-sm>{app.createdAt ? formatDateArabic(app.createdAt) : '-'}</td>
                    <td className="px-6 py-4 text-left text-sm>{app.notes || '-'}</td>
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

export default RecruitmentReports;