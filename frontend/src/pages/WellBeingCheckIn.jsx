/**
 * Well-Being Check-In Page
 * Quick daily mood and well-being tracking
 */

import { useState, useEffect } from 'react';
import { getWellBeingStatus, submitWellBeingCheckIn } from '../services/wellBeingService';
import { playNotificationSound } from '../utils/audioUtils';
import Card from '../components/common/Card';

const WellBeingCheckIn = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await getWellBeingStatus();
      if (response.success) {
        setHasSubmitted(response.data.hasSubmitted);
        setQuestions(response.data.questions || []);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionId, value) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const missing = questions.find(q => !responses[q.id]);
    if (missing) {
      setMessage({ type: 'error', text: 'يرجى الإجابة على جميع الأسئلة' });
      return;
    }

    try {
      setSubmitting(true);
      const response = await submitWellBeingCheckIn({
        mood: responses.mood,
        workload: responses.workload,
        energy: responses.energy,
        supportNeeded: responses.support,
        comment: comment.trim() || null
      });

      if (response.success) {
        setHasSubmitted(true);
        setMessage({ type: 'success', text: response.message });
        playNotificationSound();
      } else {
        setMessage({ type: 'error', text: response.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ في الإرسال' });
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

  if (hasSubmitted) {
    return (
      <div className="p-6" dir="rtl">
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">تم التسجيل</h2>
            <p className="text-gray-600">شكراً لك! تم تسجيل حالتك اليومية</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">تقرير الحالة اليومية</h2>
        <p className="text-gray-600">يستغرق أقل من 20 ثانية</p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-8">
          {questions.map(q => (
            <div key={q.id}>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{q.question}</h3>
              <div className="flex flex-wrap gap-3">
                {q.options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleOptionSelect(q.id, opt.value)}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all min-w-[80px] ${
                      responses[q.id] === opt.value
                        ? 'border-primary bg-primary/10 scale-105'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {opt.emoji && (
                      <span className="text-3xl mb-2">{opt.emoji}</span>
                    )}
                    <span className={`text-sm font-medium ${
                      responses[q.id] === opt.value ? 'text-primary' : 'text-gray-700'
                    }`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">هل هناك شيء يؤثر على عملك اليوم؟ (اختياري)</h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="3"
              maxLength="500"
              className="w-full p-3 border rounded-lg"
              placeholder="اكتب هنا..."
            />
            <p className="text-xs text-gray-400 mt-1">{comment.length}/500</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال التقرير ✓'}
          </button>

          <p className="text-center text-sm text-gray-500">
            🔒 تقريرك مجهول الهوية ولا يظهر إلا كإحصائيات مجمعة
          </p>
        </form>
      </Card>
    </div>
  );
};

export default WellBeingCheckIn;