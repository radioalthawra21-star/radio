import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTaskById, updateTask, addManagerNote, approveDepartmentTask, rejectDepartmentTask } from '../services/taskService';
import { addComment, getComments } from '../services/workflowTaskService';
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
    dueDate: '',
    priority: 'medium'
  });
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [managerNote, setManagerNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await getTaskById(id);
        if (response.success) {
          setTask(response.data.task);
          setManagerNote(response.data.task.managerNotes || '');
        } else {
          setError(response.message || 'Failed to fetch task');
        }
      } catch (err) {
        setError('An error occurred while fetching task details');
      } finally {
        setLoading(false);
      }
    };

    const fetchComments = async () => {
      try {
        const res = await getComments(id);
        if (res.success) setComments(res.data.comments || []);
      } catch (err) { /* comments may not exist */ }
    };

    fetchTask();
    fetchComments();
  }, [id]);

  const startEditing = () => {
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      difficulty: task.difficulty || 50,
      duration: task.duration || 1,
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      priority: task.priority || 'medium'
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

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await addComment(task._id, commentText.trim());
      if (res.success) {
        setComments(prev => [res.data.comment, ...prev]);
        setCommentText('');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleSaveManagerNote = async () => {
    setSavingNote(true);
    try {
      const res = await addManagerNote(task._id, managerNote);
      if (res.success) {
        setTask(res.data.task);
      }
    } catch (err) {
      console.error('Error saving manager note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const res = await approveDepartmentTask(task._id);
      if (res.success) {
        setTask(prev => ({ ...prev, status: 'approved' }));
      }
    } catch (err) {
      console.error('Error approving task:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const res = await rejectDepartmentTask(task._id, rejectReason);
      if (res.success) {
        setTask(prev => ({ ...prev, status: 'rejected' }));
        setRejectModal(false);
        setRejectReason('');
      }
    } catch (err) {
      console.error('Error rejecting task:', err);
    } finally {
      setProcessing(false);
    }
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
    <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-dark">تفاصيل المهمة</h1>
        <div className="flex gap-2 flex-wrap self-start md:self-auto">
          {isManager && task.status === 'pending' && (
            <>
              <button onClick={handleApprove} disabled={processing} className="btn bg-green-500 text-white hover:bg-green-600 whitespace-nowrap">
                {processing ? '...' : '✅ موافقة'}
              </button>
              <button onClick={() => setRejectModal(true)} disabled={processing} className="btn bg-red-500 text-white hover:bg-red-600 whitespace-nowrap">
                ❌ رفض
              </button>
            </>
          )}
          {isManager && !editing && (
            <button onClick={startEditing} className="btn btn-interactive whitespace-nowrap">
              ✏️ تعديل المهمة
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 md:p-6 space-y-4">
      <div className="flex items-start gap-2 flex-wrap border-b pb-4">
        {editing ? (
          <input
            type="text"
            name="title"
            value={editForm.title}
            onChange={handleChange}
            className="input text-xl font-semibold flex-1 w-full md:w-auto"
          />
        ) : (
          <h2 className="text-xl font-semibold flex-1 min-w-[200px]">{task.title}</h2>
        )}
        <span className={`px-2 md:px-3 py-1 rounded-full text-[11px] md:text-sm font-medium ${priorityStyle.bg}`}>
          {priorityStyle.label}
        </span>
        <span className={`px-2 md:px-3 py-1 rounded-full text-[11px] md:text-sm font-medium ${
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
          <span className="px-2 md:px-3 py-1 rounded-full text-[11px] md:text-sm font-medium bg-purple-100 text-purple-700">
            {KANBAN_LABELS[task.kanbanStatus] || task.kanbanStatus}
          </span>
        )}
      </div>
        
        {task.workflowId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-blue-600 font-bold">📋</span>
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-semibold">{task.workflowId.name}</p>
              <p className="text-xs text-blue-600">
                المرحلة {task.currentStage + 1} من {task.workflowId.stages?.length || '?'}
              </p>
            </div>
            <button
              onClick={() => navigate(`/workflow/task/${task._id}`)}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto text-center"
            >
              فتح في سير العمل
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">الأولوية</p>
            {editing ? (
              <select name="priority" value={editForm.priority} onChange={handleChange} className="input">
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة</option>
              </select>
            ) : (
              <p className="text-dark">{PRIORITY_STYLES[task.priority]?.label || 'متوسطة'}</p>
            )}
          </div>
          <div>
            <p className="text-gray-600">تاريخ الاستحقاق</p>
            {editing ? (
              <input type="date" name="dueDate" value={editForm.dueDate} onChange={handleChange} className="input" dir="ltr" />
            ) : (
              <p className="text-dark en-num">{task.dueDate ? formatDateArabic(task.dueDate) : 'غير محدد'}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="flex flex-col md:flex-row gap-3 pt-4 border-t">
            <button onClick={cancelEditing} className="btn btn-ghost w-full md:flex-1 py-3 md:py-2">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary w-full md:flex-1 py-3 md:py-2">
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        )}
        
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-700 mb-3">تقييم المدير</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Manager Note Section */}
        {isManager && (
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-700 mb-3">ملاحظة المدير</h3>
            <textarea
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
              className="input min-h-[80px] mb-2"
              placeholder="أضف ملاحظة على هذه المهمة..."
            />
            <button
              onClick={handleSaveManagerNote}
              disabled={savingNote}
              className="btn btn-primary text-sm"
            >
              {savingNote ? 'جاري الحفظ...' : 'حفظ الملاحظة'}
            </button>
            {task.managerNotes && !managerNote && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{task.managerNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Comments Section */}
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-700 mb-3">التعليقات ({comments.length})</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              className="input flex-1"
              placeholder="أضف تعليقاً..."
            />
            <button
              onClick={handleAddComment}
              disabled={commentLoading || !commentText.trim()}
              className="btn btn-primary text-sm whitespace-nowrap"
            >
              {commentLoading ? '...' : 'إرسال'}
            </button>
          </div>
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد تعليقات بعد</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {comments.map((c) => (
                <div key={c._id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-dark">{c.user?.name || 'مستخدم'}</span>
                    <span className="text-xs text-gray-400 en-num">{formatDateArabic(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => setRejectModal(false)}>
          <div className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-dark mb-4">رفض المهمة</h2>
            <p className="text-sm text-gray-600 mb-3">هل أنت متأكد من رفض مهمة: <strong>{task.title}</strong>؟</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input min-h-[80px] mb-4"
              placeholder="سبب الرفض (اختياري)..."
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(false)} className="btn btn-ghost flex-1 py-3">إلغاء</button>
              <button onClick={handleReject} disabled={processing} className="btn bg-red-500 text-white hover:bg-red-600 flex-1 py-3">
                {processing ? 'جاري الرفض...' : 'رفض المهمة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;