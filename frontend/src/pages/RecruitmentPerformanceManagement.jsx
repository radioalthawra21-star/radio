/**
 * Recruitment & Performance Management Page
 * Comprehensive recruitment and performance management system
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '../services/authService';
import {
  getJobPostings,
  getJobStats,
  getApplications,
  getPerformanceReviews,
  getKPIs
} from '../services/recruitmentPerformanceService';
import { formatDateArabic } from '../utils/dateUtils';
import { formatNumber } from '../utils/numberUtils';

// Status Badge Component
const StatusBadge = ({ status, type = 'default' }) => {
  const statusConfig = {
    // Job Status
    draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'مسودة' },
    open: { bg: 'bg-green-100', text: 'text-green-800', label: 'مفتوح' },
    closed: { bg: 'bg-red-100', text: 'text-red-800', label: 'مغلق' },
    filled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'ممتلئ' },
    // Application Status
    applied: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'تم التقديم' },
    screening: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'فحص أولي' },
    interview: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'مقابلة' },
    offer: { bg: 'bg-green-100', text: 'text-green-800', label: 'عرض' },
    hired: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'تم التوظيف' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'مرفوض' },
    // Review Status
    draft_review: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'مسودة' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'قيد التقييم' },
    completed: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'مكتمل' },
    approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'تمت الموافقة' }
  };

  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// Statistics Card Component
const StatCard = ({ title, value, icon, color, trend }) => {
  const colorConfig = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500'
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        <div className={`${colorConfig[color] || colorConfig.blue} text-white p-3 rounded-full text-xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default function RecruitmentPerformanceManagement() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [activeTab, setActiveTab] = useState('recruitment'); // recruitment, performance
  const [recruitmentSubTab, setRecruitmentSubTab] = useState('jobs'); // jobs, applications
  const [performanceSubTab, setPerformanceSubTab] = useState('reviews'); // reviews, kpis

  // Data states
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Filters
  const [jobFilters, setJobFilters] = useState({ status: '', department: '', search: '' });
  const [applicationFilters, setApplicationFilters] = useState({ status: '', jobId: '', search: '' });
  const [reviewFilters, setReviewFilters] = useState({ status: '', employee: '', period: '' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage(null);

      if (activeTab === 'recruitment') {
        await loadRecruitmentData();
      } else {
        await loadPerformanceData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'خطأ في تحميل البيانات' });
    } finally {
      setLoading(false);
    }
  };

  const loadRecruitmentData = async () => {
    try {
      // Load job postings
      const jobsRes = await getJobPostings({
        status: jobFilters.status,
        department: jobFilters.department,
        search: jobFilters.search
      });
      if (jobsRes?.data?.jobPostings) {
        setJobs(jobsRes.data.jobPostings);
      }

      // Load applications if needed
      if (recruitmentSubTab === 'applications') {
        const appsRes = await getApplications({
          status: applicationFilters.status,
          jobPostingId: applicationFilters.jobId,
          search: applicationFilters.search
        });
        if (appsRes?.data?.applications) {
          setApplications(appsRes.data.applications);
        }
      }

      // Load stats
      const statsRes = await getJobStats();
      if (statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Error loading recruitment data:', error);
    }
  };

  const loadPerformanceData = async () => {
    try {
      if (performanceSubTab === 'reviews') {
        const reviewsRes = await getPerformanceReviews({
          status: reviewFilters.status,
          employee: reviewFilters.employee,
          period: reviewFilters.period
        });
        if (reviewsRes?.data?.reviews) {
          setReviews(reviewsRes.data.reviews);
        }
      } else if (performanceSubTab === 'kpis') {
        const kpisRes = await getKPIs();
        if (kpisRes?.data?.kpis) {
          setKpis(kpisRes.data.kpis);
        }
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
    }
  };

  const handleJobFilterChange = (e) => {
    const { name, value } = e.target;
    setJobFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplicationFilterChange = (e) => {
    const { name, value } = e.target;
    setApplicationFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleReviewFilterChange = (e) => {
    const { name, value } = e.target;
    setReviewFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateJob = () => {
    navigate('/recruitment/jobs/new');
  };

  const handleCreateReview = () => {
    navigate('/performance/reviews/new');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {activeTab === 'recruitment' ? 'إدارة التوظيف' : 'إدارة الأداء'}
          </h1>
          <p className="text-gray-600">
            {activeTab === 'recruitment'
              ? 'إدارة الإعلانات الوظيفية وطلبات التوظيف'
              : 'إدارة تقييمات الأداء والمؤشرات الرئيسية'
            }
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Main Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('recruitment')}
                className={`${activeTab === 'recruitment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                التوظيف
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`${activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                الأداء
              </button>
            </nav>
          </div>
        </div>

        {/* Recruitment Section */}
        {activeTab === 'recruitment' && (
          <div>
            {/* Recruitment Sub-tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Recruitment Tabs">
                  <button
                    onClick={() => setRecruitmentSubTab('jobs')}
                    className={`${recruitmentSubTab === 'jobs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    الإعلانات الوظيفية
                  </button>
                  <button
                    onClick={() => setRecruitmentSubTab('applications')}
                    className={`${recruitmentSubTab === 'applications'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    طلبات التوظيف
                  </button>
                </nav>
              </div>
            </div>

            {/* Statistics Cards (for recruitment) */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <StatCard
                  title="الإعلانات الإجمالية"
                  value={stats.postings.total}
                  icon="📄"
                  color="blue"
                />
                <StatCard
                  title="مفتوحة"
                  value={stats.postings.open}
                  icon="🔓"
                  color="green"
                />
                <StatCard
                  title="مغلقة"
                  value={stats.postings.closed}
                  icon="🔒"
                  color="orange"
                />
                <StatCard
                  title="ممتلئة"
                  value={stats.postings.filled}
                  icon="✅"
                  color="purple"
                />
                <StatCard
                  title="الطلبات"
                  value={Object.values(stats.applications).reduce((a, b) => a + b, 0)}
                  icon="👥"
                  color="red"
                />
              </div>
            )}

            {/* Jobs Sub-tab */}
            {recruitmentSubTab === 'jobs' && (
              <div>
                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-60">
                      <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
                      <input
                        type="text"
                        name="search"
                        value={jobFilters.search}
                        onChange={handleJobFilterChange}
                        placeholder="ابحث في العناوين أو الوصف..."
                        className="w-full border rounded p-2"
                      />
                    </div>
                    <div className="min-w-40">
                      <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                      <select
                        name="status"
                        value={jobFilters.status}
                        onChange={handleJobFilterChange}
                        className="w-full border rounded p-2"
                      >
                        <option value="">جميع الحالات</option>
                        <option value="draft">مسودة</option>
                        <option value="open">مفتوح</option>
                        <option value="closed">مغلق</option>
                        <option value="filled">ممتلئ</option>
                      </select>
                    </div>
                    <button
                      onClick={() => loadRecruitmentData()}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      بحث
                    </button>
                    {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                      <button
                        onClick={handleCreateJob}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        إعلان جديد
                      </button>
                    )}
                  </div>
                </div>

                {/* Jobs Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {loading ? (
                    <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
                  ) : jobs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">لا توجد إعلانات وظيفية</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العنوان</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">القسم</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستوى</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع العمل</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التقديمات</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {jobs.map((job) => (
                            <tr key={job._id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.title}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.department?.name || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.level}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.jobType}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={job.status} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.applications}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => navigate(`/recruitment/jobs/${job._id}`)}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  عرض
                                </button>
                                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                                  <button
                                    onClick={() => navigate(`/recruitment/jobs/${job._id}/edit`)}
                                    className="text-green-600 hover:text-green-900 mr-3"
                                  >
                                    تعديل
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Applications Sub-tab */}
            {recruitmentSubTab === 'applications' && (
              <div>
                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-60">
                      <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
                      <input
                        type="text"
                        name="search"
                        value={applicationFilters.search}
                        onChange={handleApplicationFilterChange}
                        placeholder="ابحث في الأسماء أو البريد..."
                        className="w-full border rounded p-2"
                      />
                    </div>
                    <div className="min-w-40">
                      <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                      <select
                        name="status"
                        value={applicationFilters.status}
                        onChange={handleApplicationFilterChange}
                        className="w-full border rounded p-2"
                      >
                        <option value="">جميع الحالات</option>
                        <option value="applied">تم التقديم</option>
                        <option value="screening">فحص أولي</option>
                        <option value="interview">مقابلة</option>
                        <option value="offer">عرض</option>
                        <option value="hired">تم التوظيف</option>
                        <option value="rejected">مرفوض</option>
                      </select>
                    </div>
                    <button
                      onClick={() => loadRecruitmentData()}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      بحث
                    </button>
                  </div>
                </div>

                {/* Applications Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {loading ? (
                    <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
                  ) : applications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">لا توجد طلبات توظيف</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المرشح</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوظيفة</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البريد</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التجربة</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التقييم</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {applications.map((app) => (
                            <tr key={app._id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.applicantName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.jobPosting?.title || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.experience?.years || 0} سنة</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={app.status} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.overallRating || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => navigate(`/recruitment/applications/${app._id}`)}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  عرض
                                </button>
                                {app.status !== 'hired' && app.status !== 'rejected' && (
                                  <button
                                    onClick={() => navigate(`/recruitment/applications/${app._id}/edit`)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    تحديث
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance Section */}
        {activeTab === 'performance' && (
          <div>
            {/* Performance Sub-tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Performance Tabs">
                  <button
                    onClick={() => setPerformanceSubTab('reviews')}
                    className={`${performanceSubTab === 'reviews'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    تقييمات الأداء
                  </button>
                  <button
                    onClick={() => setPerformanceSubTab('kpis')}
                    className={`${performanceSubTab === 'kpis'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    المؤشرات الرئيسية
                  </button>
                </nav>
              </div>
            </div>

            {/* Reviews Sub-tab */}
            {performanceSubTab === 'reviews' && (
              <div>
                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-60">
                      <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
                      <input
                        type="text"
                        name="search"
                        value={reviewFilters.search}
                        onChange={handleReviewFilterChange}
                        placeholder="ابحث في أسماء الموظفين..."
                        className="w-full border rounded p-2"
                      />
                    </div>
                    <div className="min-w-40">
                      <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                      <select
                        name="status"
                        value={reviewFilters.status}
                        onChange={handleReviewFilterChange}
                        className="w-full border rounded p-2"
                      >
                        <option value="">جميع الحالات</option>
                        <option value="draft">مسودة</option>
                        <option value="in_progress">قيد التقييم</option>
                        <option value="completed">مكتمل</option>
                        <option value="approved">تمت الموافقة</option>
                      </select>
                    </div>
                    <button
                      onClick={() => loadPerformanceData()}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      بحث
                    </button>
                    {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                      <button
                        onClick={handleCreateReview}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        تقييم جديد
                      </button>
                    )}
                  </div>
                </div>

                {/* Reviews Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {loading ? (
                    <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
                  ) : reviews.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">لا توجد تقييمات أداء</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الموظف</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدقق</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفترة</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التقييم</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {reviews.map((review) => (
                            <tr key={review._id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{review.employee?.name || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.reviewer?.name || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {review.reviewPeriod?.period} {review.reviewPeriod?.year}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.finalRating || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={`${review.status === 'draft' ? 'draft_review' : review.status}`} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => navigate(`/performance/reviews/${review._id}`)}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  عرض
                                </button>
                                {review.status === 'draft' && (
                                  <button
                                    onClick={() => navigate(`/performance/reviews/${review._id}/edit`)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    تعديل
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KPIs Sub-tab */}
            {performanceSubTab === 'kpis' && (
              <div>
                {/* KPIs List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {loading ? (
                    <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
                  ) : kpis.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">لا توجد مؤشرات رئيسية</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفئة</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المؤشر</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهدف</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأقسام</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {kpis.map((kpi) => (
                            <tr key={kpi._id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{kpi.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{kpi.category}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{kpi.metric}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {kpi.target} {kpi.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {kpi.applicableRoles?.join(', ') || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={kpi.isActive ? 'open' : 'closed'} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => navigate(`/performance/kpis/${kpi._id}/edit`)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  تعديل
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
