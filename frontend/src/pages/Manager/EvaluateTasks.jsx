/**
 * Evaluate Tasks Page
 * Managers can evaluate completed tasks
 */

import { useState, useEffect } from 'react';
import { getTasksToEvaluate, evaluateTask } from '../../services/taskService';
import Card from '../../components/common/Card';
import { formatDateArabic } from '../../utils/dateUtils';

const EvaluateTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [evalForm, setEvalForm] = useState({
    score: '',
    notes: ''
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await getTasksToEvaluate();
      if (response.success) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (taskId) => {
    setEvaluating(taskId);
    setError('');
    setSuccess('');

    if (!evalForm.score || evalForm.score < 0 || evalForm.score > 100) {
      setError('يرجى إدخال تقييم صحيح (0-100)');
      setEvaluating(null);
      return;
    }

    try {
      const response = await evaluateTask(taskId, {
        score: parseInt(evalForm.score),
        notes: evalForm.notes
      });
      if (response.success) {
        setSuccess('تم تقييم المهمة بنجاح');
        setEvalForm({ score: '', notes: '' });
        fetchTasks();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ في تقييم المهمة');
    } finally {
      setEvaluating(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-gray-500',
      in_progress: 'bg-warning',
      completed: 'bg-info',
      approved: 'bg-success'
    };
    const labels = {
      pending: 'قيد الانتظار',
      in_progress: 'في التنفيذ',
      completed: 'مكتملة',
      approved: 'موافق عليها'
    };
    return (
      <span className={`badge ${badges[status] || 'bg-gray-500'} text-white`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold text-dark mb-6 md:mb-8">تقييم المهام</h1>

      {error && (
        <div className="bg-error/10 border border-error text-error p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-success/10 border border-success text-success p-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">لا توجد مهام تحتاج تقييم</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task._id} className="hover:shadow-xl transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 max-w-full">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    📝
                  </div>
                  <div className="min-w-0 flex-1 max-w-full">
                    <h3 className="font-semibold text-dark text-base md:text-lg break-words">{task.title}</h3>
                    <p className="text-sm text-gray-600 break-words">{task.description}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs md:text-sm text-gray-500">
                      <span>👤 {task.assignedTo?.map(u => u.name).join(', ')}</span>
                      <span>⏱️ {task.duration} ساعة</span>
                      <span>📅 <span className="en-num">{formatDateArabic(task.taskDate)}</span></span>
                    </div>
                    {task.isUnusual && (
                      <span className="badge bg-warning text-white mt-2">مهمة غير عادية</span>
                    )}
                  </div>
                </div>

                {/* Evaluation Form */}
                <div className="bg-gray-50 p-4 rounded-lg w-full md:w-72 shrink-0">
                  <h4 className="font-semibold text-dark mb-3">تقييم المهمة</h4>
                  <div className="mb-3">
                    <label className="label">التقييم (0-100)</label>
                    <input
                      type="number"
                      dir="ltr"
                      min="0"
                      max="100"
                      value={evalForm.score}
                      onChange={(e) => setEvalForm({ ...evalForm, score: e.target.value })}
                      className="input min-h-[48px]"
                      placeholder="أدخل التقييم"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="label">ملاحظات</label>
                    <textarea
                      value={evalForm.notes}
                      onChange={(e) => setEvalForm({ ...evalForm, notes: e.target.value })}
                      className="input min-h-[80px]"
                      placeholder="أدخل ملاحظاتك..."
                    />
                  </div>
                  <button
                    onClick={() => handleEvaluate(task._id)}
                    disabled={evaluating === task._id}
                    className="btn btn-interactive w-full min-h-[48px] flex items-center justify-center"
                  >
                    {evaluating === task._id ? 'جاري التقييم...' : 'تقييم'}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EvaluateTasks;