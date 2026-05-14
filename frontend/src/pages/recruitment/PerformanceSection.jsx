import { StatusBadge } from './RecruitmentComponents';

export default function PerformanceSection({
  performanceSubTab, setPerformanceSubTab,
  reviews, kpis, loading, reviewFilters,
  handleReviewFilterChange, loadPerformanceData,
  currentUser, navigate, handleCreateReview
}) {
  return (
    <div>
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Performance Tabs">
            <button onClick={() => setPerformanceSubTab('reviews')}
              className={`${performanceSubTab === 'reviews' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
              تقييمات الأداء
            </button>
            <button onClick={() => setPerformanceSubTab('kpis')}
              className={`${performanceSubTab === 'kpis' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
              المؤشرات الرئيسية
            </button>
          </nav>
        </div>
      </div>

      {performanceSubTab === 'reviews' && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-60">
                <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
                <input type="text" name="search" value={reviewFilters.search} onChange={handleReviewFilterChange}
                  placeholder="ابحث في أسماء الموظفين..." className="w-full border rounded p-2" />
              </div>
              <div className="min-w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <select name="status" value={reviewFilters.status} onChange={handleReviewFilterChange} className="w-full border rounded p-2">
                  <option value="">جميع الحالات</option>
                  <option value="draft">مسودة</option>
                  <option value="in_progress">قيد التقييم</option>
                  <option value="completed">مكتمل</option>
                  <option value="approved">تمت الموافقة</option>
                </select>
              </div>
              <button onClick={() => loadPerformanceData()} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">بحث</button>
              {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                <button onClick={handleCreateReview} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">تقييم جديد</button>
              )}
            </div>
          </div>

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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.reviewPeriod?.period} {review.reviewPeriod?.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.finalRating || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={`${review.status === 'draft' ? 'draft_review' : review.status}`} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => navigate(`/performance/reviews/${review._id}`)} className="text-blue-600 hover:text-blue-900 mr-3">عرض</button>
                          {review.status === 'draft' && (
                            <button onClick={() => navigate(`/performance/reviews/${review._id}/edit`)} className="text-green-600 hover:text-green-900">تعديل</button>
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

      {performanceSubTab === 'kpis' && (
        <div>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{kpi.target} {kpi.unit}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{kpi.applicableRoles?.join(', ') || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={kpi.isActive ? 'open' : 'closed'} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => navigate(`/performance/kpis/${kpi._id}/edit`)} className="text-green-600 hover:text-green-900">تعديل</button>
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
