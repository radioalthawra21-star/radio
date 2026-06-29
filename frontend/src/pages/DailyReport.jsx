import { useState, useEffect, useCallback } from 'react';
import { getStoredUser } from '../services/authService';
import { getDailyReportStatus, submitDailyReport, getDepartmentManager } from '../services/dailyReportService';
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
  const [hasSubmitted, setHasSubmitted] = useState(false);
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

  useEffect(() => {
    checkStatus();
    fetchManager();
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

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await getDailyReportStatus();
      if (response.success) {
        setHasSubmitted(response.data.hasSubmitted);
      }
    } catch (error) {
      console.error('Error checking report status:', error);
    } finally {
      setLoading(false);
    }
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
        suggestions
      });
      if (response.success) {
        setHasSubmitted(true);
        setMessage({ type: 'success', text: response.message });
        playNotificationSound();
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

  if (hasSubmitted) {
    return (
      <div className="p-6" dir="rtl">
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">تم إرسال التقرير</h2>
            <p className="text-gray-600">شكراً لك! تم حفظ التقرير اليومي بنجاح</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6" dir="rtl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">التقرير اليومي للموظف</h2>
        <p className="text-gray-500 text-sm mt-1">يرجى تعبئة التقرير اليومي لإدارة الأداء</p>
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

        <div className="flex justify-center">
          <button type="submit" disabled={submitting}
            className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors text-lg min-w-[200px]">
            {submitting ? 'جاري الحفظ...' : 'حفظ التقرير'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DailyReport;
