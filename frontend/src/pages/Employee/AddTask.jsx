/**
 * Add Task Page
 * Employees can add their daily tasks
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTask } from '../../services/taskService';
import { getWorkflows } from '../../services/workflowService';
import { getStoredUser } from '../../services/authService';
import Card from '../../components/common/Card';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'منخفضة', icon: '🟢' },
  { value: 'medium', label: 'متوسطة', icon: '🟡' },
  { value: 'high', label: 'عالية', icon: '🟠' },
  { value: 'urgent', label: 'عاجلة', icon: '🔴' }
];

const AddTask = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isManager = currentUser?.role === 'manager';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workflows, setWorkflows] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 1,
    startTime: '',
    endTime: '',
    taskDate: new Date().toISOString().split('T')[0],
    isUnusual: false,
    isProposal: false,
    priority: 'medium',
    workflowId: ''
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await getWorkflows({ isActive: true });
      if (res.success) setWorkflows(res.data.workflows || []);
    } catch (err) { console.error(err); }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await createTask(formData);
      if (response.success) {
        navigate('/my-tasks');
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ في إنشاء المهمة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-8">{isManager ? 'مهمة جديدة لي' : 'إضافة مهمة جديدة'}</h1>

      <Card>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-error/10 border border-error text-error p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Task Title */}
          <div className="mb-4">
            <label className="label">عنوان المهمة *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="input"
              placeholder="أدخل عنوان المهمة"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="label">الوصف</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input min-h-[100px]"
              placeholder="أدخل وصف المهمة"
            />
          </div>

          {/* Task Date */}
          <div className="mb-4">
            <label className="label">التاريخ</label>
            <input
              type="date"
              lang="en"
              dir="ltr"
              name="taskDate"
              value={formData.taskDate}
              onChange={handleChange}
              className="input"
            />
          </div>

          {/* Duration & Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">مدة العمل (ساعات)</label>
              <input
                type="number"
                dir="ltr"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="input"
                min="0.5"
                step="0.5"
              />
            </div>
            <div>
              <label className="label">وقت البدء</label>
              <input
                type="time"
                dir="ltr"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">وقت الانتهاء</label>
              <input
                type="time"
                dir="ltr"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          {/* Priority */}
          <div className="mb-4">
            <label className="label">الأولوية</label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, priority: p.value }))}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    formData.priority === p.value
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Workflow Template */}
          <div className="mb-6">
            <label className="label">قالب سير العمل (اختياري)</label>
            <select
              name="workflowId"
              value={formData.workflowId}
              onChange={handleChange}
              className="input"
            >
              <option value="">-- بدون سير عمل --</option>
              {workflows.map(w => (
                <option key={w._id} value={w._id}>{w.name} ({w.stages?.length || 0} مراحل)</option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              عند اختيار قالب سير عمل، ستظهر المهمة في لوحة سير العمل مع مراحل الاعتماد
            </p>
          </div>

          {/* Unusual Task Checkbox */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isUnusual"
                checked={formData.isUnusual}
                onChange={handleChange}
                className="w-5 h-5 text-interactive rounded focus:ring-interactive"
              />
              <span className="text-dark font-semibold">مهمة غير عادية</span>
            </label>
            <p className="text-sm text-gray-500 mt-1">
              حدد هذه الخانة إذا كانت المهمة تتطلب جهداً إضافياً أو خارج نطاق العمل المعتاد
            </p>
          </div>

          {/* Proposal Checkbox */}
          {!isManager && (
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isProposal"
                  checked={formData.isProposal}
                  onChange={handleChange}
                  className="w-5 h-5 text-primary rounded focus:ring-primary"
                />
                <span className="text-dark font-semibold">تقديم كاقتراح</span>
              </label>
              <p className="text-sm text-gray-500 mt-1 mr-8">
                عند التفعيل، سيتم إرسال المهمة كاقتراح للمسؤول المباشر للموافقة عليها قبل أن تصبح مهمة رسمية
              </p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ المهمة'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-outline"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddTask;