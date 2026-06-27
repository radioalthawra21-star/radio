import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTaskById, updateTask } from '../services/taskService';
import { formatDateArabic } from '../utils/dateUtils';
import { getStoredUser } from '../services/authService';

const PRIORITY_STYLES = {
  urgent: { bg: 'bg-red-100 text-red-700', label: 'عاجلة' },
  high: { bg: 'bg-orange-100 text-orange-700', label: 'عالية' },
  medium: { bg: 'bg-blue-100 text-blue-700', label: 'متوسطة' },
  low: { bg: 'bg-gray-100 text-gray-600', label: 'منخفضة' }
};

const KANBAN_LABELS = {
  new: 'جديدة', in_progress: 'قيد التنفيذ', pending_review: 'بانتظار المراجعة',
  pending_approval: 'بانتظار الموافقة', completed: 'مكتملة', rejected: 'مرفوضة'
};

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getStoredUser();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    difficulty: 50,
    duration: 1,
    startTime: '',
    endTime: '',
    dueDate: ''
  });

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await getTaskById(id);
        if (response.success) {
          setTask(response.data.task);
        } else {
          setError(response.message || 'Failed to fetch task');
        }
      } catch (err) {
        setError('An error occurred while fetching task details');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [id]);

  const startEditing = () => {
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      difficulty: task.difficulty || 50,
      duration: task.duration || 1,
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : ''
    });
    setEditing(true);
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setEditForm(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateTask(task._id, editForm);
      if (res.success) {
        setTask(res.data.task);
        setEditing(false);
      }
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  if (!task || error) {
    return (
      <div className="p-6">
        {error ? (
          <div className="bg-red-100 text-red-800 p-4 rounded-lg">
            {error}
          </div>
        ) : (
          <div className="bg-gray-100 text-gray-800 p-4 rounded-lg">
            Task not found
          </div>
        )}
      </div>
    );
  }

  const priorityStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-dark">تفاصيل المهمة</h1>
        {isManager && !editing && (
          <button onClick={startEditing} className="btn btn-interactive">
            ✏️ تعديل المهمة
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap border-b pb-4">
          {editing ? (
            <input
              type="text"
              name="title"
              value={editForm.title}
              onChange={handleChange}
              className="input text-xl font-semibold flex-1"
            />
          ) : (
            <h2 className="text-xl font-semibold flex-1">{task.title}</h2>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityStyle.bg}`}>
            {priorityStyle.label}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            task.status === 'completed' ? 'bg-green-100 text-green-800' : 
            task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            task.status === 'in_progress' ? 'bg-orange-100 text-orange-800' : 
            task.status === 'approved' ? 'bg-green-100 text-green-800' : 
            'bg-[#CDD6E8] text-[#182E4E]'
          }`}>
            {task.status === 'completed' ? 'مكتملة' : 
             task.status === 'pending' ? 'قيد الانتظار' :
             task.status === 'in_progress' ? 'في التنفيذ' :
             task.status === 'approved' ? 'موافقة المدير' :
             task.status === 'final_approved' ? 'موافقة نهائية' : task.status}
          </span>
          {task.kanbanStatus && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
              {KANBAN_LABELS[task.kanbanStatus] || task.kanbanStatus}
            </span>
          )}
        </div>
        
        {task.workflowId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
            <span className="text-blue-600 font-bold">📋</span>
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-semibold">{task.workflowId.name}</p>
              <p className="text-xs text-blue-600">
                المرحلة {task.currentStage + 1} من {task.workflowId.stages?.length || '?'}
              </p>
            </div>
            <button
              onClick={() => navigate(`/workflow/task/${task._id}`)}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              فتح في سير العمل
            </button>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">الوصف</p>
            {editing ? (
              <textarea name="description" value={editForm.description} onChange={handleChange} className="input min-h-[100px]" />
            ) : (
              <p className="text-dark">{task.description || 'لا يوجد وصف'}</p>
            )}
          </div>
          <div>
            <p className="text-gray-600">المسندة إلى</p>
            <p className="text-dark">
              {Array.isArray(task.assignedTo)
                ? task.assignedTo.map(a => a.name).join(', ')
                : task.assignedTo?.name || 'غير محدد'}
            </p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">الصعوبة</p>
            {editing ? (
              <select name="difficulty" value={editForm.difficulty} onChange={handleChange} className="input">
                <option value={20}>سهل (20%)</option>
                <option value={50}>متوسط (50%)</option>
                <option value={100}>صعب (100%)</option>
              </select>
            ) : (
              <p className="text-dark">{task.difficulty || 'غير محدد'}</p>
            )}
          </div>
          <div>
            <p className="text-gray-600">المدة المقدرة</p>
            {editing ? (
              <input type="number" name="duration" value={editForm.duration} onChange={handleChange} className="input" min="0.5" step="0.5" dir="ltr" />
            ) : (
              <p className="text-dark">{task.duration || 'غير محدد'} ساعة</p>
            )}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">تاريخ الاستحقاق</p>
            {editing ? (
              <input type="date" name="dueDate" value={editForm.dueDate} onChange={handleChange} className="input" dir="ltr" />
            ) : (
              <p className="text-dark en-num">{task.dueDate ? formatDateArabic(task.dueDate) : 'غير محدد'}</p>
            )}
          </div>
          <div>
            <p className="text-gray-600">تاريخ المهمة</p>
            <p className="text-dark en-num">{task.taskDate ? formatDateArabic(task.taskDate) : 'غير محدد'}</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">وقت البدء</p>
            {editing ? (
              <input type="time" name="startTime" value={editForm.startTime} onChange={handleChange} className="input" dir="ltr" />
            ) : (
              <p className="text-dark">{task.startTime || 'غير محدد'}</p>
            )}
          </div>
          <div>
            <p className="text-gray-600">وقت الانتهاء</p>
            {editing ? (
              <input type="time" name="endTime" value={editForm.endTime} onChange={handleChange} className="input" dir="ltr" />
            ) : (
              <p className="text-dark">{task.endTime ? (typeof task.endTime === 'string' ? task.endTime : formatDateArabic(task.endTime)) : 'غير محدد'}</p>
            )}
          </div>
        </div>
        
        {editing && (
          <div className="flex gap-3 pt-4 border-t">
            <button onClick={cancelEditing} className="btn btn-ghost flex-1">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        )}
        
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-700 mb-3">تقييم المدير</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">التقييم</p>
              <p className="text-dark font-bold text-lg">
                {task.managerScore !== undefined ? `${task.managerScore}/100` : 'لم يتم التقييم بعد'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">تاريخ الإنشاء</p>
              <p className="text-dark en-num">{task.createdAt ? formatDateArabic(task.createdAt) : 'غير محدد'}</p>
            </div>
          </div>
          {task.managerNotes && (
            <div className="mt-2">
              <p className="text-gray-600">ملاحظات المدير</p>
              <p className="text-dark bg-gray-50 p-3 rounded-lg mt-1">{task.managerNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;