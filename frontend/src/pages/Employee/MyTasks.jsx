import { useState, useEffect } from 'react';
import { getMyTasks, updateTaskStatus, addTaskNotes, deleteTask } from '../../services/taskService';
import Card from '../../components/common/Card';
import { formatDateArabic } from '../../utils/dateUtils';

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', startDate: '', endDate: '' });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [notesInput, setNotesInput] = useState({});

  useEffect(() => { fetchTasks(); }, [filter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await getMyTasks(filter);
      if (response.success) setTasks(response.data.tasks);
    } catch (error) { console.error('Error fetching tasks:', error); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (taskId, newStatus, extra = {}) => {
    try {
      const response = await updateTaskStatus(taskId, newStatus, extra);
      if (response.success) fetchTasks();
    } catch (error) { console.error('Error updating task:', error); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    await handleStatusChange(rejectModal._id, 'rejected', { rejectionReason: rejectReason });
    setRejectModal(null);
    setRejectReason('');
  };

  const handleSaveNotes = async (taskId) => {
    try {
      const response = await addTaskNotes(taskId, notesInput[taskId] || '');
      if (response.success) fetchTasks();
    } catch (error) { console.error('Error saving notes:', error); }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المهمة من سجلك؟')) return;
    try {
      const res = await deleteTask(taskId);
      if (res.success) fetchTasks();
    } catch (error) { console.error('Error deleting task:', error); }
  };

  const isProposal = (task) => task.isProposal && task.status === 'pending';

  const getStatusBadge = (task) => {
    if (isProposal(task)) return <span className="badge bg-warning text-white">🕐 باقتراح</span>;
    const status = task.status;
    const badges = {
      pending: 'bg-gray-500', in_progress: 'bg-warning', completed: 'bg-info',
      approved: 'bg-success', final_approved: 'bg-success', rejected: 'bg-error'
    };
    const labels = {
      pending: 'في الانتظار', in_progress: 'في التنفيذ', completed: 'مكتملة',
      approved: 'موافقة', final_approved: 'موافقة نهائية', rejected: 'مرفوضة'
    };
    return <span className={`badge ${badges[status] || 'bg-gray-500'} text-white`}>{labels[status] || status}</span>;
  };

  const canReject = (task) =>
    (task.status === 'pending' || task.status === 'in_progress') && !isProposal(task);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-8">مهماتي</h1>

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">الحالة</label>
            <select className="input" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
              <option value="">الكل</option>
              <option value="pending">قيد الانتظار</option>
              <option value="in_progress">في التنفيذ</option>
              <option value="completed">مكتملة</option>
              <option value="rejected">مرفوضة</option>
            </select>
          </div>
          <div>
            <label className="label">من تاريخ</label>
            <input type="date" lang="en" dir="ltr" className="input" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })} />
          </div>
          <div>
            <label className="label">إلى تاريخ</label>
            <input type="date" lang="en" dir="ltr" className="input" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })} />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div></div>
      ) : tasks.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-8">لا توجد مهام حالياً</p></Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task._id} className="hover:shadow-xl transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    {isProposal(task) ? '💡' : task.isUnusual ? '⚠️' : task.status === 'rejected' ? '🚫' : '📝'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark text-lg">{task.title}</h3>
                    <p className="text-sm text-gray-600">{task.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>🕐 {task.duration} ساعة</span>
                      <span>📅 <span className="en-num">{formatDateArabic(task.taskDate)}</span></span>
                      {task.managerScore && <span>⭐ التقييم: {task.managerScore}/100</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {task.isUnusual && <span className="badge bg-warning text-white">غير عادية</span>}
                  {getStatusBadge(task)}
                  {task.status === 'in_progress' && (
                    <button onClick={() => handleStatusChange(task._id, 'completed')} className="btn btn-interactive">إكمال</button>
                  )}
                  {task.status === 'pending' && !isProposal(task) && (
                    <button onClick={() => handleStatusChange(task._id, 'in_progress')} className="btn btn-primary">بدء</button>
                  )}
                  {canReject(task) && (
                    <button onClick={() => { setRejectModal(task); setRejectReason(''); }} className="btn btn-outline border-error text-error hover:bg-error/10">رفض</button>
                  )}
                  <button onClick={() => handleDelete(task._id)} className="btn btn-outline border-gray-300 text-gray-500 hover:bg-gray-100 text-sm px-2 py-1">🗑️</button>
                </div>
              </div>

              {task.managerNotes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-dark">ملاحظات المدير:</p>
                  <p className="text-sm text-gray-600">{task.managerNotes}</p>
                </div>
              )}

              {task.rejectionReason && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-semibold text-dark">سبب الرفض:</p>
                  <p className="text-sm text-gray-600">{task.rejectionReason}</p>
                </div>
              )}

              <div className="mt-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="أضف ملاحظة للمهمة..."
                    value={notesInput[task._id] ?? task.employeeNotes ?? ''}
                    onChange={(e) => setNotesInput(n => ({ ...n, [task._id]: e.target.value }))}
                    className="input flex-1 text-sm"
                  />
                  <button onClick={() => handleSaveNotes(task._id)} className="btn btn-primary text-sm whitespace-nowrap px-3 py-1">حفظ</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">رفض المهمة</h3>
            <p className="text-sm text-gray-500 mb-4">
              رفض المهمة: {rejectModal.title}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="اذكر سبب الرفض..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-sm"
            />
            <div className="flex items-center gap-2 mt-4">
              <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">تأكيد الرفض</button>
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTasks;
