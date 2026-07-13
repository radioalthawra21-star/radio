import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDepartmentTasks, updateTask, addManagerNote, approveDepartmentTask, rejectDepartmentTask } from '../../services/taskService';
import { addComment, getComments } from '../../services/workflowTaskService';
import Card from '../../components/common/Card';
import { formatDateArabic } from '../../utils/dateUtils';
import { getStoredUser } from '../../services/authService';

const STATUS_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'approved', label: 'تمت الموافقة' },
  { value: 'in_progress', label: 'في التنفيذ' },
  { value: 'completed', label: 'مكتملة' },
  { value: 'rejected', label: 'مرفوضة' }
];

const PRIORITY_MAP = {
  low: { label: 'منخفضة', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'متوسطة', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'عاجلة', color: 'bg-red-100 text-red-700' }
};

const DepartmentTasks = ({ departmentFilter }) => {
  const user = getStoredUser();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [editModal, setEditModal] = useState(null);
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
  const [saving, setSaving] = useState(false);
  const [managerNote, setManagerNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, departmentFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = { status: statusFilter || undefined };
      if (departmentFilter) params.department = departmentFilter;
      const res = await getDepartmentTasks(params);
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
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      priority: task.priority || 'medium'
    });
    setEditModal(task);
  };

  const openDetailModal = async (task) => {
    setDetailModal(task);
    setManagerNote(task.managerNotes || '');
    try {
      const res = await getComments(task._id);
      if (res.success) setComments(res.data.comments || []);
      else setComments([]);
    } catch { setComments([]); }
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

  const handleSaveManagerNote = async () => {
    if (!detailModal) return;
    setSavingNote(true);
    try {
      const res = await addManagerNote(detailModal._id, managerNote);
      if (res.success) {
        setDetailModal(res.data.task);
        fetchTasks();
      }
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !detailModal) return;
    setCommentLoading(true);
    try {
      const res = await addComment(detailModal._id, commentText.trim());
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

  const handleApprove = async (task) => {
    setProcessing(true);
    try {
      const res = await approveDepartmentTask(task._id);
      if (res.success) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Error approving task:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessing(true);
    try {
      const res = await rejectDepartmentTask(rejectModal._id, rejectReason);
      if (res.success) {
        setRejectModal(null);
        setRejectReason('');
        fetchTasks();
      }
    } catch (err) {
      console.error('Error rejecting task:', err);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: 'bg-gray-500', label: 'قيد الانتظار' },
      approved: { bg: 'bg-success', label: '✅ تمت الموافقة' },
      in_progress: { bg: 'bg-warning', label: 'في التنفيذ' },
      completed: { bg: 'bg-info', label: 'مكتملة' },
      final_approved: { bg: 'bg-success', label: 'موافقة نهائية' },
      rejected: { bg: 'bg-error', label: 'مرفوضة' }
    };
    const s = map[status] || { bg: 'bg-gray-500', label: status };
    return <span className={`badge ${s.bg} text-white text-xs`}>{s.label}</span>;
  };

  const getPriorityBadge = (priority) => {
    const p = PRIORITY_MAP[priority] || PRIORITY_MAP.medium;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.color}`}>{p.label}</span>;
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold text-dark mb-6 md:mb-8">مهام القسم</h1>

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
                  <div className="flex items-start gap-2 mb-2 w-full max-w-full flex-wrap">
                    <h3 className="font-semibold text-dark text-base md:text-lg break-words flex-1 min-w-0">{task.title}</h3>
                    {getPriorityBadge(task.priority)}
                    {getStatusBadge(task.status)}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2 break-words">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-gray-500">
                    <span>👤 {task.assignedTo?.map(u => u.name).join(', ')}</span>
                    <span>⏱️ {task.duration} ساعة</span>
                    <span>📅 <span className="en-num">{formatDateArabic(task.taskDate)}</span></span>
                    {task.createdBy && (
                      <span>✏️ منشئ: {task.createdBy.name}</span>
                    )}
                  </div>
                  {task.managerNotes && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs font-semibold text-yellow-700 mb-0.5">📝 ملاحظة المدير:</p>
                      <p className="text-xs text-yellow-800 line-clamp-2">{task.managerNotes}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  {task.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(task)}
                        disabled={processing}
                        className="btn btn-sm bg-green-500 text-white hover:bg-green-600 whitespace-nowrap self-start min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        ✅ موافقة
                      </button>
                      <button
                        onClick={() => { setRejectModal(task); setRejectReason(''); }}
                        disabled={processing}
                        className="btn btn-sm bg-red-500 text-white hover:bg-red-600 whitespace-nowrap self-start min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        ❌ رفض
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => openDetailModal(task)}
                    className="btn btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap self-start min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    📋 تفاصيل
                  </button>
                  <button
                    onClick={() => openEditModal(task)}
                    className="btn btn-sm bg-interactive text-white hover:bg-interactive-dark whitespace-nowrap self-start min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    ✏️ تعديل
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
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
                  <label className="label">الأولوية</label>
                  <select name="priority" value={editForm.priority} onChange={handleEditChange} className="input">
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                    <option value="urgent">عاجلة</option>
                  </select>
                </div>
                <div>
                  <label className="label">الصعوبة</label>
                  <select name="difficulty" value={editForm.difficulty} onChange={handleEditChange} className="input">
                    <option value={20}>سهل (20%)</option>
                    <option value={50}>متوسط (50%)</option>
                    <option value={100}>صعب (100%)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="label">المدة (ساعات)</label>
                  <input type="number" name="duration" value={editForm.duration} onChange={handleEditChange} className="input" min="0.5" step="0.5" dir="ltr" />
                </div>
                <div>
                  <label className="label">تاريخ الاستحقاق</label>
                  <input type="date" name="dueDate" value={editForm.dueDate} onChange={handleEditChange} className="input" dir="ltr" />
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

      {/* Detail Modal (Notes + Comments) */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-dark">{detailModal.title}</h2>
              <button onClick={() => setDetailModal(null)} className="p-2 hover:bg-gray-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
                ✕
              </button>
            </div>

            <div className="text-sm text-gray-500 mb-4 flex flex-wrap gap-2">
              {getPriorityBadge(detailModal.priority)}
              {getStatusBadge(detailModal.status)}
              <span>👤 {detailModal.assignedTo?.map(u => u.name).join(', ')}</span>
            </div>

            {/* Manager Note */}
            <div className="mb-6">
              <h3 className="font-semibold text-dark mb-2">📝 ملاحظة المدير</h3>
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
            </div>

            {/* Comments */}
            <div>
              <h3 className="font-semibold text-dark mb-2">💬 التعليقات ({comments.length})</h3>
              <div className="flex gap-2 mb-3">
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
                <div className="space-y-2 max-h-60 overflow-y-auto">
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
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-dark mb-4">رفض المهمة</h2>
            <p className="text-sm text-gray-600 mb-3">هل أنت متأكد من رفض مهمة: <strong>{rejectModal.title}</strong>؟</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input min-h-[80px] mb-4"
              placeholder="سبب الرفض (اختياري)..."
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="btn btn-ghost flex-1 py-3">إلغاء</button>
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

export default DepartmentTasks;
