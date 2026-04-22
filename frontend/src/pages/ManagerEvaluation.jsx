/**
 * Manager Evaluation Page
 * Anonymous manager evaluation form for employees
 */

import { useState, useEffect } from 'react';
import { getEvaluationQuestions, getSubmissionStatus, getManagersList, submitEvaluation } from '../services/managerEvaluationService';
import Card from '../components/common/Card';

const SCALES = [
  { value: 1, label: 'ضعيف جداً', color: 'bg-red-500' },
  { value: 2, label: 'ضعيف', color: 'bg-orange-400' },
  { value: 3, label: 'مقبول', color: 'bg-yellow-400' },
  { value: 4, label: 'جيد', color: 'bg-lime-400' },
  { value: 5, label: 'ممتاز', color: 'bg-green-500' }
];

const SCALE_LABELS = ['1', '2', '3', '4', '5'];

const ManagerEvaluation = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [periodInfo, setPeriodInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState('');
  const [responses, setResponses] = useState({});
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, questionsRes, managersRes] = await Promise.all([
        getSubmissionStatus(),
        getEvaluationQuestions(),
        getManagersList()
      ]);
      
      setStatus(statusRes.data);
      setPeriodInfo(questionsRes.data);
      setQuestions(questionsRes.data.questions || []);
      setManagers(managersRes.data?.managers || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (questionId, rating) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: rating
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedManager) {
      setMessage({ type: 'error', text: 'يرجى اختيار المدير' });
      return;
    }
    
    const missingQuestion = questions.find(q => !responses[q.id]);
    if (missingQuestion) {
      setMessage({ type: 'error', text: 'يرجى تقييم جميع الأسئلة' });
      return;
    }
    
    const formattedResponses = questions.map(q => ({
      questionId: q.id,
      rating: responses[q.id]
    }));
    
    try {
      setSubmitting(true);
      setMessage(null);
      
      const response = await submitEvaluation({
        managerId: selectedManager,
        responses: formattedResponses,
        strengthsComment: strengths,
        improvementsComment: improvements
      });
      
      if (response.success) {
        setMessage({ type: 'success', text: response.message });
        setStatus({ ...status, hasSubmitted: true });
      } else {
        setMessage({ type: 'error', text: response.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ في إرسال التقييم' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  if (status?.hasSubmitted) {
    return (
      <div className="p-6" dir="rtl">
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">تم إرسال تقييمك</h2>
            <p className="text-gray-600">
              شكراً لك على مشاركتك في تقييم المدير للفترة {status.period}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!periodInfo?.isOpen) {
    return (
      <div className="p-6" dir="rtl">
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">التقييم مغلق</h2>
            <p className="text-gray-600">
              فترة التقييم {periodInfo?.period} غير متاحة حالياً
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">تقييم المدير</h2>
        <p className="text-gray-600">الفترة: {periodInfo?.period}</p>
        <p className="text-sm text-gray-500">
          من {new Date(periodInfo?.startDate).toLocaleDateString('ar-EG')} حتى {new Date(periodInfo?.endDate).toLocaleDateString('ar-EG')}
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">اختر المدير</label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full p-3 border rounded-lg bg-white"
              required
            >
              <option value="">-- اختر المدير --</option>
              {managers.map(m => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">التقييم</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-center text-sm text-gray-600">
                    <th className="text-right p-2 min-w-[200px]">السؤال</th>
                    {SCALE_LABELS.map(n => (
                      <th key={n} className="p-2 w-12">{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {questions.map(q => (
                    <tr key={q.id} className="border-t">
                      <td className="p-3 text-gray-700">{q.questionAr}</td>
                      {SCALES.map(s => (
                        <td key={s.value} className="p-2 text-center">
                          <label className="cursor-pointer flex justify-center">
                            <input
                              type="radio"
                              name={`rating_${q.id}`}
                              value={s.value}
                              checked={responses[q.id] === s.value}
                              onChange={() => handleRatingChange(q.id, s.value)}
                              className="w-5 h-5 accent-primary"
                            />
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center gap-2 mt-2">
              {SCALES.map(s => (
                <span key={s.value} className="text-xs text-gray-500 w-12 text-center">{s.label}</span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ما الذي يقوم به المدير بشكل جيد؟ (اختياري)
              </label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                rows="3"
                className="w-full p-3 border rounded-lg"
                placeholder="اكتب ملاحظاتك هنا..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ما الذي يمكن للمدير تحسينه؟ (اختياري)
              </label>
              <textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                rows="3"
                className="w-full p-3 border rounded-lg"
                placeholder="اكتب ملاحظاتك هنا..."
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-primary-dark disabled:opacity-50"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500">
            ⚠️ التقييم مجهول الهوية - لن يتم تسجيل اسمك
          </p>
        </form>
      </Card>
    </div>
  );
};

export default ManagerEvaluation;