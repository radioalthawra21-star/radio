import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllEmployees, getAllManagers, getPendingUsers, getEmployeesByDepartment, createUser, updateUser, deleteUser, activateUser } from '../../services/userService';
import { getAllDepartments, createDepartment, deleteDepartment } from '../../services/departmentService';
import { getStoredUser } from '../../services/authService';
import { useDepartments } from '../../hooks/useDepartments';
import Card from '../../components/common/Card';
import UserFormModal from './UserFormModal';
import DeptFormModal from './DeptFormModal';
import RecruitmentSection from '../recruitment/RecruitmentSection';
import PerformanceSection from '../recruitment/PerformanceSection';
import { getJobPostings, getJobStats, getApplications, getPerformanceReviews, getKPIs } from '../../services/recruitmentPerformanceService';
import { BarChart, PieChart, LineChart } from '../../components/charts';
import StatCard from '../../components/widgets/StatCard';
import { formatNumber } from '../../utils/analyticsUtils';
import { formatDateArabic } from '../../utils/dateUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const roleNames = {
  employee: 'موظف', manager: 'مدير قسم', hr: 'مسؤول الموارد البشرية', admin: 'المدير العام'
};

const mainTabs = [
  { id: 'employees', label: 'الموظفين' },
  { id: 'recruitment', label: 'التوظيف والأداء' },
  { id: 'reports', label: 'التقارير' },
];

const AllEmployees = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isHR = currentUser?.role === 'hr';
  const userDepartment = currentUser?.department;
  const { departments: hookDepartments, getDepartmentName } = useDepartments();

  const [activeMainTab, setActiveMainTab] = useState('employees');

  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', username: '', email: '', password: '', role: 'employee', department: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customDepartments, setCustomDepartments] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', color: '#3B82F6' });
  const [deptLoading, setDeptLoading] = useState(false);

  const [recruitmentSubTab, setRecruitmentSubTab] = useState('jobs');
  const [performanceSubTab, setPerformanceSubTab] = useState('reviews');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [stats, setStats] = useState(null);
  const [recruitmentLoading, setRecruitmentLoading] = useState(false);
  const [recruitmentMessage, setRecruitmentMessage] = useState(null);
  const [chartData, setChartData] = useState(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeMainTab === 'recruitment') {
      loadRecruitmentData();
    } else if (activeMainTab === 'reports') {
      loadReportsData();
    }
  }, [activeMainTab]);

  const loadDepartments = async () => {
    try {
      const response = await getAllDepartments();
      if (response.success) {
        const depts = (response.data.departments || []).map(d => ({ id: d._id, name: d.name, color: d.color }));
        setCustomDepartments(depts);
      }
    } catch (error) { console.error('Error loading departments:', error); }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) { alert('الرجاء إدخال اسم القسم'); return; }
    setDeptLoading(true);
    try {
      const response = await createDepartment({ name: deptForm.name, color: deptForm.color });
      if (response.success) {
        await loadDepartments();
        setDeptForm({ name: '', color: '#3B82F6' });
        setShowDeptModal(false);
      } else { alert(response.message || 'حدث خطأ'); }
    } catch (error) { console.error('Error creating department:', error); alert('حدث خطأ في إنشاء القسم'); }
    finally { setDeptLoading(false); }
  };

  const handleDeleteDepartment = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    try { await deleteDepartment(id); loadDepartments(); }
    catch (error) { console.error('Error deleting department:', error); }
  };

  const getAllDepartmentsMap = () => Object.fromEntries(hookDepartments.map(d => [d._id || d.id, d.name]));
  const allDepartments = getAllDepartmentsMap();

  const fetchData = async () => {
    try {
      setLoading(true);
      await loadDepartments();
      if (isAdmin || isHR) {
        const empResponse = await getAllEmployees();
        if (empResponse.success) setEmployees(empResponse.data.employees);
        const mgrResponse = await getAllManagers();
        if (mgrResponse.success) setManagers(mgrResponse.data.managers);
        const pendingResponse = await getPendingUsers();
        if (pendingResponse.success) setPendingUsers(pendingResponse.data.users);
      } else if (isManager) {
        const empResponse = await getEmployeesByDepartment(userDepartment);
        if (empResponse.success) setEmployees(empResponse.data.employees);
        setManagers([]);
        setPendingUsers([]);
      }
    } catch (error) { console.error('Error fetching data:', error); }
    finally { setLoading(false); }
  };

  const loadRecruitmentData = async () => {
    try {
      setRecruitmentLoading(true);
      setRecruitmentMessage(null);
      if (recruitmentSubTab === 'jobs' || recruitmentSubTab === 'applications') {
        const jobsRes = await getJobPostings({});
        if (jobsRes?.data?.jobPostings) setJobs(jobsRes.data.jobPostings);
        if (recruitmentSubTab === 'applications') {
          const appsRes = await getApplications({});
          if (appsRes?.data?.applications) setApplications(appsRes.data.applications);
        }
      } else if (performanceSubTab === 'reviews') {
        const reviewsRes = await getPerformanceReviews({});
        if (reviewsRes?.data?.reviews) setReviews(reviewsRes.data.reviews);
      } else if (performanceSubTab === 'kpis') {
        const kpisRes = await getKPIs();
        if (kpisRes?.data?.kpis) setKpis(kpisRes.data.kpis);
      }
      const statsRes = await getJobStats();
      if (statsRes?.data) setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading recruitment data:', error);
      setRecruitmentMessage({ type: 'error', text: 'خطأ في تحميل البيانات' });
    } finally {
      setRecruitmentLoading(false);
    }
  };

  const loadReportsData = async () => {
    try {
      setRecruitmentLoading(true);
      const statsRes = await getJobStats();
      if (statsRes?.success) setStats(statsRes.data);
      const jobsRes = await getJobPostings({});
      if (jobsRes?.success) setJobs(jobsRes.data.jobPostings || []);
      const appsRes = await getApplications({});
      if (appsRes?.success) {
        setApplications(appsRes.data.applications || []);
        setChartData(prepareChartData(appsRes.data.applications || [], jobsRes.data.jobPostings || []));
      }
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setRecruitmentLoading(false);
    }
  };

  const prepareChartData = (applications, jobPostings) => {
    const statusCounts = { applied: 0, screening: 0, interview: 0, offer: 0, hired: 0, rejected: 0, withdrawn: 0 };
    applications.forEach(app => {
      const status = app.status || 'applied';
      if (statusCounts[status] !== undefined) statusCounts[status]++;
    });

    const deptCounts = {};
    jobPostings.forEach(job => {
      const dept = job.department?.name || 'غير محدد';
      if (!deptCounts[dept]) deptCounts[dept] = 0;
      deptCounts[dept]++;
    });

    const monthlyData = {};
    applications.forEach(app => {
      const date = app.createdAt ? new Date(app.createdAt) : new Date();
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { total: 0, hired: 0 };
      monthlyData[monthKey].total++;
      if (app.status === 'hired') monthlyData[monthKey].hired++;
    });

    const sortedKeys = Object.keys(monthlyData).sort();
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const months = sortedKeys.map(key => {
      const [year, month] = key.split('-').map(Number);
      return `${monthNames[month - 1]} ${year}`;
    });

    return {
      statusCounts,
      deptCounts,
      monthlyTrend: {
        labels: months,
        datasets: [
          { label: 'إجمالي الطلبات', data: months.map((_, i) => monthlyData[sortedKeys[i]].total), backgroundColor: 'rgba(54, 162, 235, 0.5)', borderColor: 'rgba(54, 162, 235, 1)' },
          { label: 'تم التوظيف', data: months.map((_, i) => monthlyData[sortedKeys[i]].hired), backgroundColor: 'rgba(75, 192, 192, 0.5)', borderColor: 'rgba(75, 192, 192, 1)' },
        ]
      }
    };
  };

  const exportRecruitmentPDF = () => {
    const doc = new jsPDF();
    doc.setRtl(true);
    doc.setFontSize(18);
    doc.text('تقرير التوظيف', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, 105, 30, { align: 'center' });

    if (stats) {
      doc.setFontSize(14);
      doc.text('إحصائيات التوظيف', 14, 40);
      doc.setFontSize(10);
      let yPos = 50;
      const statsLines = [
        `إجمالي الوظائف: ${formatNumber(stats.total || 0)}`,
        `الوظائف المفتوحة: ${formatNumber(stats.open || 0)}`,
        `الوظائف المملوءة: ${formatNumber(stats.filled || 0)}`,
        `إجمالي الطلبات: ${formatNumber(stats.totalApplications || 0)}`,
      ];
      statsLines.forEach(line => { doc.text(line, 14, yPos); yPos += 7; });
    }

    doc.setRtl(false);
    const tableData = applications.slice(0, 100).map(app => [
      app.applicantName || '-',
      app.jobPosting?.title || '-',
      app.status || '-',
      app.createdAt ? formatDateArabic(app.createdAt) : '-',
      app.notes || '-'
    ]);

    doc.autoTable({
      head: [['المتقدم', 'الوظيفة', 'الحالة', 'تاريخ التقديم', 'ملاحظات']],
      body: tableData,
      startY: stats ? 85 : 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' }
    });

    doc.save('recruitment-report.pdf');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      let response;
      if (editingUser) response = await updateUser(editingUser._id, formData);
      else response = await createUser(formData);
      if (response.success) {
        setSuccess(editingUser ? 'تم تحديث المستخدم بنجاح' : 'تم إنشاء المستخدم بنجاح');
        setShowModal(false); setEditingUser(null);
        setFormData({ name: '', username: '', email: '', password: '', role: 'employee', department: '' });
        fetchData();
        window.dispatchEvent(new Event('usersUpdated'));
      } else { setError(response.message); }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.message || err.message || 'حدث خطأ');
    } finally { setLoading(false); }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name, username: user.username || '', email: user.email, password: '', role: user.role, department: user.department || '' });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      const response = await deleteUser(userId);
      if (response.success) { setSuccess('تم حذف المستخدم بنجاح'); fetchData(); window.dispatchEvent(new Event('usersUpdated')); }
    } catch (error) { console.error('Error deleting user:', error); }
  };

  const handleActivate = async (userId) => {
    try {
      const response = await activateUser(userId);
      if (response.success) { setSuccess('تم تفعيل الحساب بنجاح'); fetchData(); window.dispatchEvent(new Event('usersUpdated')); }
    } catch (error) { console.error('Error activating user:', error); }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: '', username: '', email: '', password: '', role: 'employee', department: isManager ? userDepartment : '' });
    setShowModal(true);
  };

  const handleCreateJob = () => navigate('/recruitment/jobs/new');
  const handleCreateReview = () => navigate('/performance/reviews/new');

  if (activeMainTab === 'recruitment') {
    return (
      <div className="min-h-screen py-6" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">التوظيف والأداء</h1>
              <p className="text-gray-500">إدارة الإعلانات الوظيفية وطلبات التوظيف وتقييمات الأداء</p>
            </div>
            <button onClick={() => setActiveMainTab('employees')} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
              → العودة للموظفين
            </button>
          </div>

          {recruitmentMessage && (
            <div className={`p-4 rounded-lg mb-6 ${recruitmentMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {recruitmentMessage.text}
            </div>
          )}

          <div className="mb-6">
            <div className="flex gap-4 mb-4 border-b border-gray-200">
              <button
                onClick={() => { setRecruitmentSubTab('jobs'); loadRecruitmentData(); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  recruitmentSubTab === 'jobs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                التوظيف
              </button>
              <button
                onClick={() => { setRecruitmentSubTab('performance'); loadRecruitmentData(); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  recruitmentSubTab === 'performance' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                الأداء
              </button>
            </div>
          </div>

          {recruitmentSubTab === 'jobs' ? (
            <RecruitmentSection
              recruitmentSubTab={recruitmentSubTab}
              setRecruitmentSubTab={setRecruitmentSubTab}
              stats={stats}
              jobs={jobs}
              applications={applications}
              loading={recruitmentLoading}
              jobFilters={{}}
              handleJobFilterChange={() => {}}
              loadRecruitmentData={loadRecruitmentData}
              applicationFilters={{}}
              handleApplicationFilterChange={() => {}}
              currentUser={currentUser}
              navigate={navigate}
              handleCreateJob={handleCreateJob}
            />
          ) : (
            <PerformanceSection
              performanceSubTab={performanceSubTab}
              setPerformanceSubTab={setPerformanceSubTab}
              reviews={reviews}
              kpis={kpis}
              loading={recruitmentLoading}
              reviewFilters={{}}
              handleReviewFilterChange={() => {}}
              loadPerformanceData={loadRecruitmentData}
              currentUser={currentUser}
              navigate={navigate}
              handleCreateReview={handleCreateReview}
            />
          )}
        </div>
      </div>
    );
  }

  if (activeMainTab === 'reports') {
    return (
      <div className="animate-fade-in" dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-dark">تقارير التوظيف</h1>
            <p className="text-gray-500 text-sm mt-1">تحليلات وإحصائيات التوظيف</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportRecruitmentPDF} className="btn btn-primary">📥 تصدير PDF</button>
            <button onClick={() => setActiveMainTab('employees')} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
              → العودة للموظفين
            </button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <StatCard title="إجمالي الوظائف" value={formatNumber(stats.total || 0)} icon="💼" color="blue" />
            <StatCard title="الوظائف المفتوحة" value={formatNumber(stats.open || 0)} icon="🔓" color="green" />
            <StatCard title="الوظائف المملوءة" value={formatNumber(stats.filled || 0)} icon="✅" color="purple" />
            <StatCard title="إجمالي الطلبات" value={formatNumber(stats.totalApplications || 0)} icon="📝" color="orange" />
            <StatCard title="معدل التحويل" value={`${formatNumber(stats.conversionRate || 0)}%`} icon="📊" color="red" />
            <StatCard title="متوسط وقت التوظيف" value={`${formatNumber(stats.averageHiringTime || 0)} يوم`} icon="⏱️" color="yellow" />
          </div>
        )}

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
                    ]
                  }}
                  width={400}
                  height={300}
                />
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-bold text-dark mb-4">توزيع الوظائف حسب القسم</h3>
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
            <div className="mt-6 bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold text-dark mb-4">الاتجاه الشهري للتوظيف</h3>
              <LineChart
                data={chartData.monthlyTrend}
                options={{ plugins: { legend: { position: 'top' }, title: { display: true, text: 'الاتجاه الشهري للطلبات والتوظيفات الناجحة' } } }}
                width={800}
                height={300}
              />
            </div>
          </div>
        )}

        <Card className="mb-6">
          <h2 className="text-xl font-bold text-dark mb-4">قائمة الوظائف الشاغرة</h2>
          {loading || recruitmentLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : jobs.length === 0 ? (
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
                  {jobs.map((job, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-left text-sm text-gray-900">{job.title || '-'}</td>
                      <td className="px-6 py-4 text-left text-sm text-gray-500">{job.department?.name || '-'}</td>
                      <td className="px-6 py-4 text-left text-sm text-gray-500">{job.level || '-'}</td>
                      <td className="px-6 py-4 text-left text-sm text-gray-500">{job.jobType || '-'}</td>
                      <td className="px-6 py-4 text-left text-sm font-medium">
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
                           job.status === 'filled' ? 'ممتلئ' : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-left text-sm">{job.applications || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-dark mb-4">تقرير طلبات التوظيف</h2>
          {loading || recruitmentLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : applications.length === 0 ? (
            <p className="text-center text-gray-500 py-8">لا توجد طلبات توظيف</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">المتقدم</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الوظيفة</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الحالة</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">تاريخ التقديم</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applications.map((app, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-left text-sm text-gray-900">{app.applicantName || '-'}</td>
                      <td className="px-6 py-4 text-left text-sm text-gray-500">{app.jobPosting?.title || '-'}</td>
                      <td className="px-6 py-4 text-left text-sm font-medium">
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
                           app.status === 'withdrawn' ? 'سحب الطلب' : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-left text-sm">{app.createdAt ? formatDateArabic(app.createdAt) : '-'}</td>
                      <td className="px-6 py-4 text-left text-sm">{app.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-dark">الموظفين</h1>
        <button onClick={openCreateModal} className="btn btn-primary">➕ إضافة مستخدم</button>
      </div>

      <Card className="mb-6">
        <div className="flex gap-4 flex-wrap">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeMainTab === tab.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {(isAdmin || isHR) && (
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-dark">إدارة الأقسام</h2>
            <button onClick={() => setShowDeptModal(true)} className="btn btn-outline text-sm">➕ إضافة قسم</button>
          </div>
          {customDepartments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">لا توجد أقسام مخصصة</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {customDepartments.map((dept) => (
                <div key={dept.id} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }}></span>
                  <span className="font-medium text-dark">{dept.name}</span>
                  <button onClick={() => handleDeleteDepartment(dept.id)} className="text-error hover:text-red-700 ml-2">✕</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {success && (
        <div className="bg-secondary/10 border border-secondary text-secondary p-3 rounded-lg mb-4">{success}</div>
      )}

      {(isAdmin || isHR) && pendingUsers.length > 0 && (
        <Card className="mb-6 border-2 border-primary">
          <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
            ⚠️ طلبات الانضمام المعلقة <span className="badge bg-primary text-white">{pendingUsers.length}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="p-3">الاسم</th><th className="p-3">اسم المستخدم</th><th className="p-3">البريد الإلكتروني</th>
                  <th className="p-3">القسم</th><th className="p-3">المنصب</th><th className="p-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <tr key={user._id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">{user.name}</td>
                    <td className="p-3 text-gray-600">{user.username}</td>
                    <td className="p-3 text-gray-600">{user.email}</td>
                    <td className="p-3">{allDepartments[user.department] || '-'}</td>
                    <td className="p-3">{roleNames[user.role] || user.role}</td>
                    <td className="p-3"><button onClick={() => handleActivate(user._id)} className="btn btn-primary text-sm">✅ تفعيل</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(isAdmin || isHR) && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-dark mb-4">مديري الأقسام</h2>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div></div>
          ) : managers.length === 0 ? (
            <p className="text-center text-gray-500 py-4">لا يوجد مديرين</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="p-3">الاسم</th><th className="p-3">اسم المستخدم</th><th className="p-3">البريد الإلكتروني</th>
                    <th className="p-3">القسم</th><th className="p-3">الحالة</th><th className="p-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((mgr) => (
                    <tr key={mgr._id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-semibold">{mgr.name}</td>
                      <td className="p-3 text-gray-600">{mgr.username}</td>
                      <td className="p-3 text-gray-600">{mgr.email}</td>
                      <td className="p-3">{getDepartmentName(mgr.department)}</td>
                      <td className="p-3"><span className={`badge ${mgr.isActive ? 'bg-secondary text-white' : 'bg-dark text-white'}`}>{mgr.isActive ? 'نشط' : 'غير نشط'}</span></td>
                      <td className="p-3">
                        <button onClick={() => navigate(`/admin/employee-profile/${mgr._id}`)} className="text-secondary hover:underline ml-2">عرض الملف</button>
                        <button onClick={() => handleEdit(mgr)} className="text-interactive hover:underline ml-2">تعديل</button>
                        <button onClick={() => handleDelete(mgr._id)} className="text-primary hover:underline">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold text-dark mb-4">الموظفين</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div></div>
        ) : employees.length === 0 ? (
          <p className="text-center text-gray-500 py-4">لا يوجد موظفين</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="p-3">الاسم</th><th className="p-3">اسم المستخدم</th><th className="p-3">البريد الإلكتروني</th>
                  <th className="p-3">القسم</th><th className="p-3">نقاط الأداء</th><th className="p-3">الحالة</th><th className="p-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">{emp.name}</td>
                    <td className="p-3 text-gray-600">{emp.username}</td>
                    <td className="p-3 text-gray-600">{emp.email}</td>
                    <td className="p-3">{getDepartmentName(emp.department)}</td>
                    <td className="p-3"><span className={`badge ${emp.performanceScore >= 70 ? 'bg-secondary text-white' : emp.performanceScore >= 40 ? 'bg-primary text-white' : 'bg-dark text-white'}`}>{emp.performanceScore || 0}</span></td>
                    <td className="p-3"><span className={`badge ${emp.isActive ? 'bg-secondary text-white' : 'bg-dark text-white'}`}>{emp.isActive ? 'نشط' : 'غير نشط'}</span></td>
                    <td className="p-3">
                      <button onClick={() => navigate(`/admin/employee-profile/${emp._id}`)} className="text-secondary hover:underline ml-2">عرض الملف</button>
                      <button onClick={() => handleEdit(emp)} className="text-interactive hover:underline ml-2">تعديل</button>
                      <button onClick={() => handleDelete(emp._id)} className="text-primary hover:underline">حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UserFormModal
        showModal={showModal} editingUser={editingUser} formData={formData}
        error={error} loading={loading} handleChange={handleChange}
        handleSubmit={handleSubmit}         isAdmin={isAdmin || isHR}
        onClose={() => setShowModal(false)} customDepartments={customDepartments}
      />
      <DeptFormModal
        showDeptModal={showDeptModal} deptForm={deptForm}
        setDeptForm={setDeptForm} deptLoading={deptLoading}
        handleAddDepartment={handleAddDepartment}
        onClose={() => setShowDeptModal(false)}
      />
    </div>
  );
};

export default AllEmployees;
