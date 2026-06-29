import { useState, useEffect } from 'react';
import { getDepartmentTasks, updateTask } from '../../services/taskService';
import Card from '../../components/common/Card';
import { formatDateArabic } from '../../utils/dateUtils';
import { getStoredUser } from '../../services/authService';

const STATUS_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'in_progress', label: 'في التنفيذ' },
  { value: 'completed', label: 'مكتملة' }
];

const DepartmentTasks = () => {
  const user = getStoredUser();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    difficulty: 50,
    duration: 1,
    startTime: '',
    endTime: '',
    dueDate: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await getDepartmentTasks({ status: statusFilter || undefined });
      if (res.success) setTasks(res.data.tasks);
    } catch (err) {
      console.error('Error fetching department tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (task) => {
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      difficulty: task.difficulty || 50,
      duration: task.duration || 1,
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : ''
    });
    setEditModal(task);
  };

  const handleEditChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setEditForm(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSave = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const res = await updateTask(editModal._id, editForm);
      if (res.success) {
        setEditModal(null);
        fetchTasks();
      }
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: 'bg-gray-500', label: 'قيد الانتظار' },
      in_progress: { bg: 'bg-warning', label: 'في التنفيذ' },
      completed: { bg: 'bg-info', label: 'مكتملة' },
      approved: { bg: 'bg-success', label: 'موافق عليها' },
      final_approved: { bg: 'bg-success', label: 'موافقة نهائية' },
      rejected: { bg: 'bg-error', label: 'مرفوضة' }
    };
    const s = map[status] || { bg: 'bg-gray-500', label: status };
    return <span className={`badge ${s.bg} text-white`}>{s.label}</span>;
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-8">مهام القسم</h1>

      <Card className="mb-6 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <label className="font-semibold text-dark text-sm">تصفية حسب الحالة:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full md:w-48"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">لا توجد مهام في القسم</p>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {tasks.map((task) => (
            <Card key={task._id} className="hover:shadow-xl transition-shadow p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <h3 className="font-semibold text-dark text-base md:text-lg break-words flex-1">{task.title}</h3>
                    <div className="flex-shrink-0">{getStatusBadge(task.status)}</div>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-gray-500">
                    <span>👤 {task.assignedTo?.map(u => u.name).join(', ')}</span>
                    <span>⏱️ {task.duration} ساعة</span>
                    <span>📅 <span className="en-num">{formatDateArabic(task.taskDate)}</span></span>
                    {task.createdBy && (
                      <span>✏️ منشئ: {task.createdBy.name}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openEditModal(task)}
                  className="btn btn-sm bg-interactive text-white hover:bg-interactive-dark whitespace-nowrap self-start min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  ✏️ تعديل
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg md:text-xl font-bold text-dark mb-4">تعديل المهمة</h2>

            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="label">العنوان</label>
                <input type="text" name="title" value={editForm.title} onChange={handleEditChange} className="input" />
              </div>
              <div>
                <label className="label">الوصف</label>
                <textarea name="description" value={editForm.description} onChange={handleEditChange} className="input min-h-[80px]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="label">الصعوبة</label>
                  <select name="difficulty" value={editForm.difficulty} onChange={handleEditChange} className="input">
                    <option value={20}>سهل (20%)</option>
                    <option value={50}>متوسط (50%)</option>
                    <option value={100}>صعب (100%)</option>
                  </select>
                </div>
                <div>
                  <label className="label">المدة (ساعات)</label>
                  <input type="number" name="duration" value={editForm.duration} onChange={handleEditChange} className="input" min="0.5" step="0.5" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="label">وقت البدء</label>
                  <input type="time" name="startTime" value={editForm.startTime} onChange={handleEditChange} className="input" dir="ltr" />
                </div>
                <div>
                  <label className="label">وقت الانتهاء</label>
                  <input type="time" name="endTime" value={editForm.endTime} onChange={handleEditChange} className="input" dir="ltr" />
                </div>
              </div>
              <div>
                <label className="label">تاريخ الاستحقاق</label>
                <input type="date" name="dueDate" value={editForm.dueDate} onChange={handleEditChange} className="input" dir="ltr" />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mt-6">
              <button onClick={() => setEditModal(null)} className="btn btn-ghost w-full md:flex-1 py-3 md:py-2">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary w-full md:flex-1 py-3 md:py-2">
                {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentTasks;