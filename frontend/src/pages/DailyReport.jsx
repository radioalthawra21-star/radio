import { useState, useEffect, useCallback, useRef } from 'react';
import { getStoredUser } from '../services/authService';
import { getTodayReport, submitDailyReport, getDepartmentManager, getMyReports } from '../services/dailyReportService';
import { playNotificationSound } from '../utils/audioUtils';
import Card from '../components/common/Card';

const ACHIEVEMENT_STATUSES = [
  { value: 'completed', label: 'مكتمل' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'not_completed', label: 'غير مكتمل' },
  { value: 'stopped', label: 'متوقف' },
  { value: 'postponed', label: 'مؤجل' }
];

const statusLabels = {
  completed: 'مكتمل',
  in_progress: 'قيد التنفيذ',
  not_completed: 'غير مكتمل',
  stopped: 'متوقف',
  postponed: 'مؤجل'
};

const emptyAchievement = () => ({
  _tempId: Date.now() + Math.random(),
  name: '',
  description: '',
  target: '',
  status: 'in_progress',
  completionPercentage: 0
});

const DailyReport = () => {
  const user = getStoredUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [employeeName] = useState(user?.name || '');
  const [department] = useState(user?.department || '');
  const [jobTitle] = useState(user?.jobTitle || '');
  const [directManager, setDirectManager] = useState('');

  const arabicDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const now = new Date();
  const dateStr = `${arabicDayNames[now.getDay()]} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  const [achievements, setAchievements] = useState([emptyAchievement()]);
  const [priorities, setPriorities] = useState({ first: '', second: '', third: '' });
  const [challenges, setChallenges] = useState({ obstacles: '', supportRequired: '' });
  const [suggestions, setSuggestions] = useState({ performanceVision: '' });
  const isThursday = now.getDay() === 4;
  const [bestWork, setBestWork] = useState({ items: [{ title: '', publishLink: '' }] });
  const BEST_WORK_MAX = 3;

  const [showHistory, setShowHistory] = useState(false);
  const [historyReports, setHistoryReports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      setHistoryLoading(true);
      const response = await getMyReports(page, 10);
      if (response.success) {
        setHistoryReports(response.data.reports);
        setHistoryTotalPages(response.data.pages);
        setHistoryTotal(response.data.total);
        setHistoryPage(response.data.page);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchTodayReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTodayReport();
      if (response.success && response.data) {
        const r = response.data;
        setAchievements((r.achievements || []).map(a => ({ ...a, _tempId: Date.now() + Math.random() })));
        setPriorities(r.priorities || { first: '', second: '', third: '' });
        setChallenges(r.challenges || { obstacles: '', supportRequired: '' });
        setSuggestions(r.suggestions || { performanceVision: '' });
        if (r.bestWork) setBestWork(r.bestWork);
        if (r.directManager) setDirectManager(r.directManager);
      }
    } catch (error) {
      console.error('Error fetching today report:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetForm = useCallback(() => {
    setAchievements([emptyAchievement()]);
    setPriorities({ first: '', second: '', third: '' });
    setChallenges({ obstacles: '', supportRequired: '' });
    setSuggestions({ performanceVision: '' });
    setBestWork({ items: [{ title: '', publishLink: '' }] });
    setMessage(null);
  }, []);

  const fetchManager = async () => {
    try {
      const response = await getDepartmentManager();
      if (response.success && response.data.managerName) {
        setDirectManager(response.data.managerName);
      }
    } catch (error) {
      console.error('Error fetching manager:', error);
    }
  };

  useEffect(() => {
    fetchTodayReport();
    fetchManager();
  }, [fetchTodayReport]);

  const lastRefreshDate = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      if (hours >= 9 && lastRefreshDate.current !== todayStr) {
        lastRefreshDate.current = todayStr;
        resetForm();
        fetchTodayReport();
        fetchManager();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchTodayReport, resetForm]);

  const addBestWorkItem = () => {
    if (bestWork.items.length >= BEST_WORK_MAX) return;
    setBestWork(prev => ({ items: [...prev.items, { title: '', publishLink: '' }] }));
  };

  const removeBestWorkItem = (idx) => {
    setBestWork(prev => ({ items: prev.items.filter((_, i) => i !== idx) }));
  };

  const updateBestWorkItem = (idx, field, value) => {
    setBestWork(prev => ({
      items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    }));
  };

  const addAchievement = () => {
    setAchievements(prev => [...prev, emptyAchievement()]);
  };

  const removeAchievement = (tempId) => {
    setAchievements(prev => prev.filter(a => a._tempId !== tempId));
  };

  const updateAchievement = (tempId, field, value) => {
    setAchievements(prev => prev.map(a =>
      a._tempId === tempId ? { ...a, [field]: value } : a
    ));
  };

  const validate = () => {
    const missingAchievement = achievements.find(a => !a.name.trim());
    if (missingAchievement) {
      setMessage({ type: 'error', text: 'يرجى تعبئة اسم الإنجاز لجميع الصفوف أو حذف الصفوف الفارغة' });
      return false;
    }
    if (achievements.length === 0 || !achievements[0].name.trim()) {
      setMessage({ type: 'error', text: 'يرجى إضافة إنجاز واحد على الأقل' });
      return false;
    }
    if (isThursday) {
      const filledItems = bestWork.items.filter(item => item.title.trim());
      if (filledItems.length === 0) {
        setMessage({ type: 'error', text: 'يرجى إضافة مادة واحدة على الأقل في تقييم الإنجاز الأسبوعي' });
        return false;
      }
      const missingLink = bestWork.items.find(item => item.title.trim() && !item.publishLink.trim());
      if (missingLink) {
        setMessage({ type: 'error', text: 'يرجى إضافة رابط النشر للمادة: ' + missingLink.title });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const response = await submitDailyReport({
        achievements: achievements.map(({ _tempId, ...rest }) => rest),
        priorities,
        challenges,
        suggestions,
        bestWork: isThursday ? bestWork : undefined
      });
      if (response.success) {
        setMessage({ type: 'success', text: response.message });
        playNotificationSound();
        // Refresh to show updated data
        fetchTodayReport();
      } else {
        setMessage({ type: 'error', text: response.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.userMessage || 'حدث خطأ في حفظ التقرير' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">التقرير اليومي للموظف</h2>
          <p className="text-gray-500 text-sm mt-1">يرجى تعبئة التقرير اليومي لإدارة الأداء</p>
        </div>
        <button type="button" onClick={() => { setShowHistory(true); fetchHistory(1); }}
          className="px-4 py-2 bg-white border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          التقارير السابقة
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">بيانات الموظف</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">اسم الموظف</label>
              <input type="text" value={employeeName} readOnly
                className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">القسم أو الإدارة</label>
              <input type="text" value={department} readOnly
                className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">المسمى الوظيفي</label>
              <input type="text" value={jobTitle} readOnly
                className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">المدير المباشر</label>
              <input type="text" value={directManager}
                onChange={(e) => setDirectManager(e.target.value)}
                placeholder="اسم المدير المباشر"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">تاريخ التقرير</label>
              <input type="text" value={dateStr} readOnly
                className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-800">ملخص الإنجازات والمهام المكتملة</h3>
            <button type="button" onClick={addAchievement}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة إنجاز
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-right p-2 border text-sm font-medium text-gray-600">#</th>
                  <th className="text-right p-2 border text-sm font-medium text-gray-600">اسم الإنجاز</th>
                  <th className="text-right p-2 border text-sm font-medium text-gray-600">وصف الإنجاز</th>
                  <th className="text-right p-2 border text-sm font-medium text-gray-600">المستهدف</th>
                  <th className="text-right p-2 border text-sm font-medium text-gray-600">حالة الإنجاز</th>
                  <th className="text-right p-2 border text-sm font-medium text-gray-600">نسبة الاكتمال</th>
                  <th className="text-center p-2 border text-sm font-medium text-gray-600 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {achievements.map((a, idx) => (
                  <tr key={a._tempId} className="hover:bg-gray-50">
                    <td className="p-2 border text-sm text-gray-500 align-top pt-3">{idx + 1}</td>
                    <td className="p-2 border">
                      <input type="text" value={a.name}
                        onChange={(e) => updateAchievement(a._tempId, 'name', e.target.value)}
                        placeholder="اسم الإنجاز"
                        className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </td>
                    <td className="p-2 border">
                      <input type="text" value={a.description}
                        onChange={(e) => updateAchievement(a._tempId, 'description', e.target.value)}
                        placeholder="وصف الإنجاز"
                        className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </td>
                    <td className="p-2 border">
                      <input type="text" value={a.target}
                        onChange={(e) => updateAchievement(a._tempId, 'target', e.target.value)}
                        placeholder="المستهدف"
                        className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </td>
                    <td className="p-2 border">
                      <select value={a.status}
                        onChange={(e) => updateAchievement(a._tempId, 'status', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                        {ACHIEVEMENT_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 border">
                      <div className="flex items-center gap-2">
                        <input type="range" min="0" max="100" step="5" value={a.completionPercentage}
                          onChange={(e) => updateAchievement(a._tempId, 'completionPercentage', parseInt(e.target.value))}
                          className="flex-1 h-2 accent-primary" />
                        <span className="text-sm font-medium text-gray-700 min-w-[40px] text-center en-num ltr">{a.completionPercentage}%</span>
                      </div>
                    </td>
                    <td className="p-2 border text-center">
                      <button type="button" onClick={() => removeAchievement(a._tempId)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="حذف">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {achievements.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">لم تتم إضافة أي إنجازات. اضغط "إضافة إنجاز" للبدء</p>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">خطة العمل والأولويات لليوم القادم</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">الأولوية الأولى</label>
              <textarea value={priorities.first}
                onChange={(e) => setPriorities(prev => ({ ...prev, first: e.target.value }))}
                rows="2"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="أكتب الأولوية الأولى..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">الأولوية الثانية</label>
              <textarea value={priorities.second}
                onChange={(e) => setPriorities(prev => ({ ...prev, second: e.target.value }))}
                rows="2"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="أكتب الأولوية الثانية..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">الأولوية الثالثة</label>
              <textarea value={priorities.third}
                onChange={(e) => setPriorities(prev => ({ ...prev, third: e.target.value }))}
                rows="2"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="أكتب الأولوية الثالثة..." />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">التحديات والمعوقات والدعم المطلوب</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">العقبات المرصودة</label>
              <textarea value={challenges.obstacles}
                onChange={(e) => setChallenges(prev => ({ ...prev, obstacles: e.target.value }))}
                rows="3"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="اذكر أي عقبات واجهتك..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">الدعم والموارد المطلوبة</label>
              <textarea value={challenges.supportRequired}
                onChange={(e) => setChallenges(prev => ({ ...prev, supportRequired: e.target.value }))}
                rows="3"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="ما الدعم الذي تحتاجه؟" />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">المقترحات والأفكار التطويرية</h3>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">رؤية الموظف لتطوير الأداء</label>
            <textarea value={suggestions.performanceVision}
              onChange={(e) => setSuggestions(prev => ({ ...prev, performanceVision: e.target.value }))}
              rows="4"
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="مقترحاتك لتطوير الأداء..." />
          </div>
        </Card>

        {isThursday && (
          <Card>
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">تقييم الإنجاز الأسبوعي - أفضل المواد</h3>
                <p className="text-xs text-gray-500 mt-1">اختر أفضل المواد التي قمت بالعمل عليها هذا الأسبوع مع رابط النشر</p>
              </div>
              {bestWork.items.length < BEST_WORK_MAX && (
                <button type="button" onClick={addBestWorkItem}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  إضافة مادة
                </button>
              )}
            </div>

            <div className="space-y-4">
              {bestWork.items.map((item, idx) => (
                <div key={idx} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">المادة {idx + 1}</span>
                    {bestWork.items.length > 1 && (
                      <button type="button" onClick={() => removeBestWorkItem(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors" title="حذف">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">عنوان المادة</label>
                      <input type="text" value={item.title}
                        onChange={(e) => updateBestWorkItem(idx, 'title', e.target.value)}
                        placeholder="عنوان المادة أو المحتوى"
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">رابط النشر</label>
                      <input type="url" value={item.publishLink}
                        onChange={(e) => updateBestWorkItem(idx, 'publishLink', e.target.value)}
                        placeholder="https://..."
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm ltr focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  </div>
                </div>
              ))}
              {bestWork.items.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">لم تتم إضافة أي مواد. اضغط "إضافة مادة" للبدء</p>
              )}
            </div>
          </Card>
        )}

        <div className="flex justify-center">
          <button type="submit" disabled={submitting}
            className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors text-lg min-w-[200px]">
            {submitting ? 'جاري الحفظ...' : 'حفظ التقرير'}
          </button>
        </div>
      </form>

      {showHistory && !selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 md:p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">التقارير السابقة</h3>
              <button onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {historyLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-3 border-primary"></div>
                </div>
              ) : historyReports.length === 0 ? (
                <p className="text-gray-400 text-center py-8">لا توجد تقارير سابقة</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-right p-3 border text-sm font-medium text-gray-600">#</th>
                        <th className="text-right p-3 border text-sm font-medium text-gray-600">التاريخ</th>
                        <th className="text-right p-3 border text-sm font-medium text-gray-600">الإنجازات</th>
                        <th className="text-right p-3 border text-sm font-medium text-gray-600">الأولوية الأولى</th>
                        <th className="text-right p-3 border text-sm font-medium text-gray-600">المعوقات</th>
                        <th className="text-center p-3 border text-sm font-medium text-gray-600">الحالة</th>
                        <th className="text-center p-3 border text-sm font-medium text-gray-600 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyReports.map((report, idx) => {
                        const total = (report.achievements || []).length;
                        const completed = (report.achievements || []).filter(a => a.status === 'completed').length;
                        return (
                          <tr key={report._id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3 border text-sm text-gray-500">{(historyPage - 1) * 10 + idx + 1}</td>
                            <td className="p-3 border text-sm font-medium text-gray-800">{report.reportDate}</td>
                            <td className="p-3 border text-sm text-gray-600 max-w-[200px]">
                              <div className="flex flex-wrap gap-1.5">
                                {(report.achievements || []).slice(0, 2).map((a, i) => (
                                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{a.name}</span>
                                ))}
                                {total > 2 && <span className="text-xs text-gray-400">+{total - 2}</span>}
                              </div>
                            </td>
                            <td className="p-3 border text-sm text-gray-600 max-w-[180px] truncate">{report.priorities?.first || '-'}</td>
                            <td className="p-3 border text-sm text-gray-600 max-w-[180px] truncate">{report.challenges?.obstacles || '-'}</td>
                            <td className="p-3 border text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                total > 0 && completed === total
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {completed}/{total}
                              </span>
                            </td>
                            <td className="p-3 border text-center">
                              <button onClick={() => setSelectedReport(report)}
                                className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium">
                                عرض
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {historyTotalPages > 1 && !historyLoading && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                  <button
                    onClick={() => fetchHistory(historyPage - 1)}
                    disabled={historyPage <= 1}
                    className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors">
                    السابق
                  </button>
                  {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map(p => (
                    <button key={p}
                      onClick={() => fetchHistory(p)}
                      className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                        p === historyPage
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}>
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => fetchHistory(historyPage + 1)}
                    disabled={historyPage >= historyTotalPages}
                    className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors">
                    التالي
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showHistory && selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 md:p-6 border-b">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedReport(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="text-xl font-bold text-gray-800">تفاصيل التقرير</h3>
              </div>
              <button onClick={() => { setSelectedReport(null); setShowHistory(false); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-xs text-gray-400">اسم الموظف</span>
                  <p className="text-sm font-medium text-gray-800">{selectedReport.employeeName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">القسم</span>
                  <p className="text-sm font-medium text-gray-800">{selectedReport.department}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">المسمى الوظيفي</span>
                  <p className="text-sm font-medium text-gray-800">{selectedReport.jobTitle}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">المدير المباشر</span>
                  <p className="text-sm font-medium text-gray-800">{selectedReport.directManager || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">تاريخ التقرير</span>
                  <p className="text-sm font-medium text-gray-800">{selectedReport.reportDate}</p>
                </div>
              </div>

              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3 border-b pb-2">الإنجازات والمهام</h4>
                {(selectedReport.achievements || []).length === 0 ? (
                  <p className="text-gray-400 text-sm">لا توجد إنجازات</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-right p-2 border text-sm font-medium text-gray-600">#</th>
                          <th className="text-right p-2 border text-sm font-medium text-gray-600">الاسم</th>
                          <th className="text-right p-2 border text-sm font-medium text-gray-600">الوصف</th>
                          <th className="text-right p-2 border text-sm font-medium text-gray-600">المستهدف</th>
                          <th className="text-right p-2 border text-sm font-medium text-gray-600">الحالة</th>
                          <th className="text-center p-2 border text-sm font-medium text-gray-600">الإكتمال</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.achievements.map((a, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="p-2 border text-sm text-gray-500">{i + 1}</td>
                            <td className="p-2 border text-sm text-gray-800 font-medium">{a.name}</td>
                            <td className="p-2 border text-sm text-gray-600">{a.description || '-'}</td>
                            <td className="p-2 border text-sm text-gray-600">{a.target || '-'}</td>
                            <td className="p-2 border text-sm">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                a.status === 'completed' ? 'bg-green-100 text-green-700' :
                                a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                a.status === 'not_completed' ? 'bg-red-100 text-red-700' :
                                a.status === 'stopped' ? 'bg-gray-100 text-gray-600' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {statusLabels[a.status] || a.status}
                              </span>
                            </td>
                            <td className="p-2 border text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div className="bg-primary h-2 rounded-full" style={{ width: `${a.completionPercentage}%` }}></div>
                                </div>
                                <span className="text-xs text-gray-600 en-num ltr">{a.completionPercentage}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3 border-b pb-2">خطة العمل والأولويات</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <span className="text-xs text-amber-600 font-medium">الأولوية الأولى</span>
                    <p className="text-sm text-gray-700 mt-1">{selectedReport.priorities?.first || 'لا يوجد'}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <span className="text-xs text-blue-600 font-medium">الأولوية الثانية</span>
                    <p className="text-sm text-gray-700 mt-1">{selectedReport.priorities?.second || 'لا يوجد'}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                    <span className="text-xs text-green-600 font-medium">الأولوية الثالثة</span>
                    <p className="text-sm text-gray-700 mt-1">{selectedReport.priorities?.third || 'لا يوجد'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3 border-b pb-2">التحديات والدعم المطلوب</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                    <span className="text-xs text-red-600 font-medium">العقبات المرصودة</span>
                    <p className="text-sm text-gray-700 mt-1">{selectedReport.challenges?.obstacles || 'لا يوجد'}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                    <span className="text-xs text-purple-600 font-medium">الدعم والموارد المطلوبة</span>
                    <p className="text-sm text-gray-700 mt-1">{selectedReport.challenges?.supportRequired || 'لا يوجد'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3 border-b pb-2">المقترحات والتطوير</h4>
                <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                  <span className="text-xs text-teal-600 font-medium">رؤية الموظف لتطوير الأداء</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedReport.suggestions?.performanceVision || 'لا يوجد'}</p>
                </div>
              </div>

              {selectedReport.bestWork?.items?.length > 0 && (
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-3 border-b pb-2">تقييم الإنجاز الأسبوعي - أفضل المواد</h4>
                  <div className="space-y-3">
                    {selectedReport.bestWork.items.map((item, i) => (
                      <div key={i} className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-amber-600 font-medium">المادة {i + 1}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 mt-1">{item.title}</p>
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReport;
