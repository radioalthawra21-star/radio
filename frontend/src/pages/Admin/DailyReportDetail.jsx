import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReportById, deleteDailyReport } from '../../services/dailyReportService';
import { getStoredUser } from '../../services/authService';
import Card from '../../components/common/Card';

const statusLabels = {
  completed: 'مكتمل',
  in_progress: 'قيد التنفيذ',
  not_completed: 'غير مكتمل',
  stopped: 'متوقف',
  postponed: 'مؤجل'
};

const statusColors = {
  completed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  not_completed: 'bg-red-100 text-red-800',
  stopped: 'bg-gray-100 text-gray-800',
  postponed: 'bg-yellow-100 text-yellow-800'
};

const departmentNames = {
  financial: 'المالي',
  it: 'تقنية المعلومات',
  marketing: 'التسويق',
  news: 'الأخبار',
  production: 'الإنتاج',
  live_broadcast: 'البث المباشر',
  hr: 'الموارد البشرية',
  'human resources': 'الموارد البشرية',
  المالي: 'المالي',
  'تقنية المعلومات': 'تقنية المعلومات',
  التسويق: 'التسويق',
  الأخبار: 'الأخبار',
  الإنتاج: 'الإنتاج',
  'البث المباشر': 'البث المباشر',
  'الموارد البشرية': 'الموارد البشرية',
  المراسلين: 'المراسلين',
  التحرير: 'التحرير',
  الخدمات: 'الخدمات',
  العلاقات: 'العلاقات'
};

const getDeptName = (dept) => departmentNames[dept] || dept || 'غير محدد';

const DailyReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isGeneralManager = currentUser?.role === 'admin' || currentUser?.role === 'developer';
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getReportById(id);
      if (response.success) {
        setReport(response.data);
      } else {
        setError(response.message || 'فشل في تحميل التقرير');
      }
    } catch (err) {
      setError(err.userMessage || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await deleteDailyReport(id);
      if (response.success) {
        navigate('/admin/daily-reports');
      } else {
        alert(response.message || 'فشل في حذف التقرير');
      }
    } catch (err) {
      alert(err.userMessage || 'حدث خطأ في حذف التقرير');
    } finally {
      setDeleting(false);
    }
  };

  const totalCompletion = report?.achievements?.length
    ? Math.round(report.achievements.reduce((sum, a) => sum + (a.completionPercentage || 0), 0) / report.achievements.length)
    : 0;

  const completedCount = report?.achievements?.filter(a => a.status === 'completed').length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <Card>
          <div className="text-center py-12">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">خطأ في تحميل التقرير</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={() => navigate('/admin/daily-reports')} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
              العودة إلى اللوحة
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="p-3 md:p-6" dir="rtl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/daily-reports')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          العودة إلى لوحة التحكم
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التقرير اليومي</h1>
            <p className="text-gray-500 text-sm mt-1">{report.reportDate || '-'}</p>
          </div>
          {isGeneralManager && (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              حذف التقرير
            </button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">بيانات الموظف</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">الاسم</label>
            <p className="font-medium text-gray-800">{report.employeeName || report.userId?.name || '-'}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">القسم</label>
            <p className="font-medium text-gray-800">{getDeptName(report.department || report.userId?.department)}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">المسمى الوظيفي</label>
            <p className="font-medium text-gray-800">{report.jobTitle || report.userId?.jobTitle || '-'}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">المدير المباشر</label>
            <p className="font-medium text-gray-800">{report.directManager || '-'}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <p className="text-sm text-gray-500 mb-1">إجمالي الإنجازات</p>
          <p className="text-2xl font-bold text-gray-800">{report.achievements?.length || 0}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500 mb-1">الإنجازات المكتملة</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500 mb-1">معدل الإنجاز الكلي</p>
          <p className={`text-2xl font-bold ${
            totalCompletion >= 80 ? 'text-green-600' : totalCompletion >= 50 ? 'text-yellow-600' : 'text-red-600'
          }`}>{totalCompletion}%</p>
        </Card>
      </div>

      {report.achievements?.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">الإنجازات والمهام</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 border text-sm font-medium text-gray-600">#</th>
                  <th className="p-3 border text-sm font-medium text-gray-600">الإنجاز</th>
                  <th className="p-3 border text-sm font-medium text-gray-600">الوصف</th>
                  <th className="p-3 border text-sm font-medium text-gray-600">المستهدف</th>
                  <th className="p-3 border text-sm font-medium text-gray-600">الحالة</th>
                  <th className="p-3 border text-sm font-medium text-gray-600">نسبة الإنجاز</th>
                  <th className="p-3 border text-sm font-medium text-gray-600">المدة</th>
                </tr>
              </thead>
              <tbody>
                {report.achievements.map((a, idx) => (
                  <tr key={a._id || idx} className="hover:bg-gray-50 border-b">
                    <td className="p-3 border text-sm text-gray-500">{idx + 1}</td>
                    <td className="p-3 border text-sm font-medium text-gray-800">{a.name}</td>
                    <td className="p-3 border text-sm text-gray-600">{a.description || '-'}</td>
                    <td className="p-3 border text-sm text-gray-600">{a.target || '-'}</td>
                    <td className="p-3 border">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[a.status] || a.status}
                      </span>
                    </td>
                    <td className="p-3 border">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              a.completionPercentage >= 80 ? 'bg-green-500' : a.completionPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${a.completionPercentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 min-w-[40px] text-center">{a.completionPercentage}%</span>
                      </div>
                    </td>
                    <td className="p-3 border text-sm text-gray-600">{(a.duration?.hours || a.duration?.minutes) ? `${a.duration.hours || 0} س ${a.duration.minutes || 0} د` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(report.priorities?.first || report.priorities?.second || report.priorities?.third) && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">خطة العمل والأولويات لليوم القادم</h2>
          <div className="space-y-3">
            {report.priorities.first && (
              <div className="p-3 bg-blue-50 rounded-lg border-r-4 border-blue-500">
                <span className="text-xs text-blue-600 font-medium block mb-1">الأولوية الأولى</span>
                <p className="text-gray-800">{report.priorities.first}</p>
              </div>
            )}
            {report.priorities.second && (
              <div className="p-3 bg-blue-50/60 rounded-lg border-r-4 border-blue-400">
                <span className="text-xs text-blue-600 font-medium block mb-1">الأولوية الثانية</span>
                <p className="text-gray-800">{report.priorities.second}</p>
              </div>
            )}
            {report.priorities.third && (
              <div className="p-3 bg-blue-50/30 rounded-lg border-r-4 border-blue-300">
                <span className="text-xs text-blue-600 font-medium block mb-1">الأولوية الثالثة</span>
                <p className="text-gray-800">{report.priorities.third}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {(report.challenges?.obstacles || report.challenges?.supportRequired) && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">التحديات والمعوقات والدعم المطلوب</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.challenges.obstacles && (
              <div className="p-4 bg-red-50 rounded-lg">
                <label className="block text-xs text-red-600 font-medium mb-2">العقبات المرصودة</label>
                <p className="text-gray-800 text-sm whitespace-pre-wrap">{report.challenges.obstacles}</p>
              </div>
            )}
            {report.challenges.supportRequired && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <label className="block text-xs text-yellow-600 font-medium mb-2">الدعم والموارد المطلوبة</label>
                <p className="text-gray-800 text-sm whitespace-pre-wrap">{report.challenges.supportRequired}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {report.suggestions?.performanceVision && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">المقترحات والأفكار التطويرية</h2>
          <div className="p-4 bg-purple-50 rounded-lg">
            <label className="block text-xs text-purple-600 font-medium mb-2">رؤية الموظف لتطوير الأداء</label>
            <p className="text-gray-800 text-sm whitespace-pre-wrap">{report.suggestions.performanceVision}</p>
          </div>
        </Card>
      )}

      {report.bestWork?.items?.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">تقييم الإنجاز الأسبوعي - أفضل المواد</h2>
          <div className="space-y-3">
            {report.bestWork.items.map((item, i) => (
              <div key={i} className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-amber-600 font-medium">المادة {i + 1}</span>
                </div>
                <p className="text-gray-800 font-medium">{item.title}</p>
                {item.publishLink && (
                  <a href={item.publishLink} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    رابط النشر
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="text-center pb-6">
        <button
          onClick={() => navigate('/admin/daily-reports')}
          className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
        >
          العودة إلى لوحة التحكم
        </button>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">🗑️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذا التقرير؟ هذا الإجراء لا يمكن التراجع عنه.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
              >
                {deleting && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>}
                {deleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReportDetail;