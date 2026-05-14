import { StatusBadge, StatCard } from './RecruitmentComponents';

export default function RecruitmentSection({
  recruitmentSubTab, setRecruitmentSubTab,
  stats, jobs, applications, loading,
  jobFilters, handleJobFilterChange, loadRecruitmentData,
  applicationFilters, handleApplicationFilterChange,
  currentUser, navigate, handleCreateJob
}) {
  return (
    <div>
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Recruitment Tabs">
            <button onClick={() => setRecruitmentSubTab('jobs')}
              className={`${recruitmentSubTab === 'jobs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
              الإعلانات الوظيفية
            </button>
            <button onClick={() => setRecruitmentSubTab('applications')}
              className={`${recruitmentSubTab === 'applications' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
              طلبات التوظيف
            </button>
          </nav>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard title="الإعلانات الإجمالية" value={stats.postings.total} icon="📄" color="blue" />
          <StatCard title="مفتوحة" value={stats.postings.open} icon="🔓" color="green" />
          <StatCard title="مغلقة" value={stats.postings.closed} icon="🔒" color="orange" />
          <StatCard title="ممتلئة" value={stats.postings.filled} icon="✅" color="purple" />
          <StatCard title="الطلبات" value={Object.values(stats.applications).reduce((a, b) => a + b, 0)} icon="👥" color="red" />
        </div>
      )}

      {recruitmentSubTab === 'jobs' && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-60">
                <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
                <input type="text" name="search" value={jobFilters.search} onChange={handleJobFilterChange}
                  placeholder="ابحث في العناوين أو الوصف..." className="w-full border rounded p-2" />
              </div>
              <div className="min-w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <select name="status" value={jobFilters.status} onChange={handleJobFilterChange} className="w-full border rounded p-2">
                  <option value="">جميع الحالات</option>
                  <option value="draft">مسودة</option>
                  <option value="open">مفتوح</option>
                  <option value="closed">مغلق</option>
                  <option value="filled">ممتلئ</option>
                </select>
              </div>
              <button onClick={() => loadRecruitmentData()} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">بحث</button>
              {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                <button onClick={handleCreateJob} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">إعلان جديد</button>
              )}
            </div>
          </div>

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
                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={job.status} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.applications}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => navigate(`/recruitment/jobs/${job._id}`)} className="text-blue-600 hover:text-blue-900 mr-3">عرض</button>
                          {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                            <button onClick={() => navigate(`/recruitment/jobs/${job._id}/edit`)} className="text-green-600 hover:text-green-900 mr-3">تعديل</button>
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

      {recruitmentSubTab === 'applications' && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-60">
                <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
                <input type="text" name="search" value={applicationFilters.search} onChange={handleApplicationFilterChange}
                  placeholder="ابحث في الأسماء أو البريد..." className="w-full border rounded p-2" />
              </div>
              <div className="min-w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <select name="status" value={applicationFilters.status} onChange={handleApplicationFilterChange} className="w-full border rounded p-2">
                  <option value="">جميع الحالات</option>
                  <option value="applied">تم التقديم</option>
                  <option value="screening">فحص أولي</option>
                  <option value="interview">مقابلة</option>
                  <option value="offer">عرض</option>
                  <option value="hired">تم التوظيف</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>
              <button onClick={() => loadRecruitmentData()} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">بحث</button>
            </div>
          </div>

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
                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={app.status} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.overallRating || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => navigate(`/recruitment/applications/${app._id}`)} className="text-blue-600 hover:text-blue-900 mr-3">عرض</button>
                          {app.status !== 'hired' && app.status !== 'rejected' && (
                            <button onClick={() => navigate(`/recruitment/applications/${app._id}/edit`)} className="text-green-600 hover:text-green-900">تحديث</button>
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
  );
}
