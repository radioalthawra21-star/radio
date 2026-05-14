import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '../services/authService';
import {
  getJobPostings, getJobStats, getApplications,
  getPerformanceReviews, getKPIs
} from '../services/recruitmentPerformanceService';
import RecruitmentSection from './recruitment/RecruitmentSection';
import PerformanceSection from './recruitment/PerformanceSection';

export default function RecruitmentPerformanceManagement() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [activeTab, setActiveTab] = useState('recruitment');
  const [recruitmentSubTab, setRecruitmentSubTab] = useState('jobs');
  const [performanceSubTab, setPerformanceSubTab] = useState('reviews');

  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const [jobFilters, setJobFilters] = useState({ status: '', department: '', search: '' });
  const [applicationFilters, setApplicationFilters] = useState({ status: '', jobId: '', search: '' });
  const [reviewFilters, setReviewFilters] = useState({ status: '', employee: '', period: '', search: '' });

  useEffect(() => { loadData(); }, [activeTab]);

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
      const jobsRes = await getJobPostings({
        status: jobFilters.status, department: jobFilters.department, search: jobFilters.search
      });
      if (jobsRes?.data?.jobPostings) setJobs(jobsRes.data.jobPostings);

      if (recruitmentSubTab === 'applications') {
        const appsRes = await getApplications({
          status: applicationFilters.status, jobPostingId: applicationFilters.jobId, search: applicationFilters.search
        });
        if (appsRes?.data?.applications) setApplications(appsRes.data.applications);
      }

      const statsRes = await getJobStats();
      if (statsRes?.data) setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading recruitment data:', error);
    }
  };

  const loadPerformanceData = async () => {
    try {
      if (performanceSubTab === 'reviews') {
        const reviewsRes = await getPerformanceReviews({
          status: reviewFilters.status, employee: reviewFilters.employee, period: reviewFilters.period
        });
        if (reviewsRes?.data?.reviews) setReviews(reviewsRes.data.reviews);
      } else if (performanceSubTab === 'kpis') {
        const kpisRes = await getKPIs();
        if (kpisRes?.data?.kpis) setKpis(kpisRes.data.kpis);
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

  const handleCreateJob = () => navigate('/recruitment/jobs/new');
  const handleCreateReview = () => navigate('/performance/reviews/new');

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {activeTab === 'recruitment' ? 'إدارة التوظيف' : 'إدارة الأداء'}
          </h1>
          <p className="text-gray-600">
            {activeTab === 'recruitment' ? 'إدارة الإعلانات الوظيفية وطلبات التوظيف' : 'إدارة تقييمات الأداء والمؤشرات الرئيسية'}
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button onClick={() => setActiveTab('recruitment')}
                className={`${activeTab === 'recruitment' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                التوظيف
              </button>
              <button onClick={() => setActiveTab('performance')}
                className={`${activeTab === 'performance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                الأداء
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'recruitment' && (
          <RecruitmentSection
            recruitmentSubTab={recruitmentSubTab} setRecruitmentSubTab={setRecruitmentSubTab}
            stats={stats} jobs={jobs} applications={applications} loading={loading}
            jobFilters={jobFilters} handleJobFilterChange={handleJobFilterChange}
            loadRecruitmentData={loadRecruitmentData}
            applicationFilters={applicationFilters} handleApplicationFilterChange={handleApplicationFilterChange}
            currentUser={currentUser} navigate={navigate} handleCreateJob={handleCreateJob}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceSection
            performanceSubTab={performanceSubTab} setPerformanceSubTab={setPerformanceSubTab}
            reviews={reviews} kpis={kpis} loading={loading}
            reviewFilters={reviewFilters} handleReviewFilterChange={handleReviewFilterChange}
            loadPerformanceData={loadPerformanceData}
            currentUser={currentUser} navigate={navigate} handleCreateReview={handleCreateReview}
          />
        )}
      </div>
    </div>
  );
}
