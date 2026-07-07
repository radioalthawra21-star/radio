import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminTodaySummary, downloadEmployeeReports, deleteDailyReport } from '../../services/dailyReportService';
import { getStoredUser } from '../../services/authService';
import Card from '../../components/common/Card';

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

const DailyReportsDashboard = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isGeneralManager = currentUser?.role === 'admin' || currentUser?.role === 'developer';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const arabicDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const now = new Date();
  const todayStr = `${arabicDayNames[now.getDay()]} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAdminTodaySummary();
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || 'فشل في تحميل البيانات');
      }
    } catch (err) {
      setError(err.userMessage || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      const response = await deleteDailyReport(deleteConfirm);
      if (response.success) {
        setDeleteConfirm(null);
        fetchSummary();
      } else {
        alert(response.message || 'فشل في حذف التقرير');
      }
    } catch (err) {
      alert(err.userMessage || 'حدث خطأ في حذف التقرير');
    } finally {
      setDeleting(false);
    }
  };

  const getProgressColor = (pct) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRateColor = (pct) => {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const uniqueDepartments = data?.departmentStats
    ? [...new Set(data.departmentStats.map(d => d.department))]
    : [];

  const filteredReports = data?.reports?.filter(r => {
    const name = (r.employeeName || r.userId?.name || '').toLowerCase();
    const dept = (r.department || r.userId?.department || '');
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesDept = !deptFilter || dept === deptFilter;
    return matchesSearch && matchesDept;
  }) || [];

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
            <h2 className="text-xl font-bold text-gray-800 mb-2">خطأ في تحميل البيانات</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={fetchSummary} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
              إعادة المحاولة
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-3 md:p-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">لوحة تحكم التقارير اليومية</h1>
          <p className="text-gray-500 text-sm mt-1">{todayStr}</p>
        </div>
        <button
          onClick={fetchSummary}
          className="mt-3 md:mt-0 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الموظفين</p>
              <p className="text-2xl font-bold text-gray-800">{data.totalEmployees}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">تم التقديم</p>
              <p className="text-2xl font-bold text-green-600">{data.submittedCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">لم يقدموا</p>
              <p className="text-2xl font-bold text-red-600">{data.notSubmittedCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">نسبة التقديم</p>
              <p className={`text-2xl font-bold ${getRateColor(Math.round((data.submittedCount / data.totalEmployees) * 100))}`}>
                {data.totalEmployees > 0 ? Math.round((data.submittedCount / data.totalEmployees) * 100) : 0}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">مقارنة الأقسام</h2>
            {data.departmentStats.length === 0 ? (
              <p className="text-gray-400 text-center py-4">لا توجد أقسام</p>
            ) : (
              <div className="space-y-4">
                {data.departmentStats.map((dept) => (
                  <div key={dept.department}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{getDeptName(dept.department)}</span>
                      <span className="text-sm text-gray-500">
                        {dept.submitted}/{dept.total}
                        <span className={`mr-2 font-semibold ${getRateColor(dept.percentage)}`}>{dept.percentage}%</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(dept.percentage)}`}
                        style={{ width: `${dept.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">ملخص سريع</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">تم التقديم</span>
                <span className="text-sm font-bold text-green-700">{data.submittedUsers.length} موظف</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-gray-700">لم يقدموا</span>
                <span className="text-sm font-bold text-red-700">{data.notSubmittedUsers.length} موظف</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-700">إجمالي الأقسام</span>
                <span className="text-sm font-bold text-blue-700">{data.departmentStats.length} أقسام</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-800">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs ml-2">✓</span>
              تم التقديم اليوم
            </h2>
            <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">{data.submittedUsers.length}</span>
          </div>
          {data.submittedUsers.length === 0 ? (
            <p className="text-gray-400 text-center py-4">لم يقم أي موظف بتقديم التقرير بعد</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.submittedUsers.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/daily-report/${u.reportId}`)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-sm">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-500">{getDeptName(u.department)}</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-800">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs ml-2">✕</span>
              لم يقدموا بعد
            </h2>
            <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded-full">{data.notSubmittedUsers.length}</span>
          </div>
          {data.notSubmittedUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-green-600 font-medium">جميع الموظفين قدموا تقاريرهم اليومية!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.notSubmittedUsers.map((u) => (
                <div key={u._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold text-sm">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-500">{getDeptName(u.department)}</p>
                    </div>
                  </div>
                  <span className="text-xs text-red-500 bg-red-100 px-2 py-0.5 rounded">لم يتم</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 md:mb-0">جميع التقارير</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم الموظف..."
              className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">جميع الأقسام</option>
              {uniqueDepartments.map(d => (
                <option key={d} value={d}>{getDeptName(d)}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <p className="text-gray-400 text-center py-4">لا توجد تقارير متطابقة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 border text-sm font-medium text-gray-600">#</th>
                  <th className="p-3 border text-sm font-medium text-gray-600">الموظف</th>
                  <th className="p-3 border text-sm font-medium text-gray-600">القسم</th>
                  <th className="p-3 border text-sm font-medium text-gray-600">المسمى الوظيفي</th>
                  <th className="p-3 border text-sm font-medium text-gray-600">المدير المباشر</th>
                  <th className="p-3 border text-sm font-medium text-gray-600">عدد الإنجازات</th>
                  <th className="p-3 border text-sm font-medium text-gray-600" colSpan={isGeneralManager ? 3 : 2}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r, idx) => {
                  const achievementCount = r.achievements?.length || 0;
                  const completedCount = r.achievements?.filter(a => a.status === 'completed').length || 0;
                  return (
                    <tr key={r._id} className="hover:bg-gray-50 border-b">
                      <td className="p-3 border text-sm text-gray-500">{idx + 1}</td>
                      <td className="p-3 border text-sm font-medium text-gray-800">{r.employeeName || r.userId?.name || '-'}</td>
                      <td className="p-3 border text-sm text-gray-600">{getDeptName(r.department || r.userId?.department)}</td>
                      <td className="p-3 border text-sm text-gray-600">{r.jobTitle || r.userId?.jobTitle || '-'}</td>
                      <td className="p-3 border text-sm text-gray-600">{r.directManager || '-'}</td>
                      <td className="p-3 border text-sm text-center">
                        <span className="text-gray-700">{achievementCount}</span>
                        {completedCount > 0 && (
                          <span className="mr-1 text-xs text-green-600">({completedCount} مكتمل)</span>
                        )}
                      </td>
                      <td className="p-3 border text-center">
                        <button
                          onClick={() => navigate(`/admin/daily-report/${r._id}`)}
                          className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-xs font-medium"
                        >
                          عرض التقرير
                        </button>
                      </td>
                      <td className="p-3 border text-center">
                        <button
                          onClick={() => downloadEmployeeReports(r.userId?._id || r.userId, r.employeeName || r.userId?.name || 'تقرير')}
                          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium"
                          title="تحميل سجل التقارير"
                        >
                          <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          السجل
                        </button>
                      </td>
                      {isGeneralManager && (
                        <td className="p-3 border text-center">
                          <button
                            onClick={() => setDeleteConfirm(r._id)}
                            className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                            title="حذف التقرير"
                          >
                            <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">🗑️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذا التقرير؟ هذا الإجراء لا يمكن التراجع عنه.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirm(null)}
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

export default DailyReportsDashboard;