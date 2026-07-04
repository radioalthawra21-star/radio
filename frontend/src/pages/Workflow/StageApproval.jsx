import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKanbanBoard, approveStage, rejectStage } from '../../services/workflowTaskService';
import { formatDateArabic } from '../../utils/dateUtils';
import Card from '../../components/common/Card';

const AWAITING_STATUSES = ['pending_review', 'pending_approval'];

const StageApproval = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [note, setNote] = useState('');

  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getKanbanBoard();
      if (res.success) {
        const awaiting = AWAITING_STATUSES.flatMap(s => res.data.columns[s] || []);
        setTasks(awaiting);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const handleAction = async (taskId, action) => {
    setActionId(taskId);
    try {
      const fn = action === 'approve' ? approveStage : rejectStage;
      const res = await fn(taskId, note);
      if (res.success) {
        setNote('');
        fetchBoard();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'فشل العملية');
    } finally { setActionId(null); }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold text-dark mb-6 md:mb-8">الموافقات</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
        </div>
      ) : tasks.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-8">لا توجد مهام بانتظار الموافقة</p></Card>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <Card key={task._id} className="hover:shadow-xl transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/workflow/task/${task._id}`)}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-dark text-lg break-words">{task.title}</h3>
                    <span className={`badge text-xs px-2 py-0.5 rounded-full ${
                      task.kanbanStatus === 'pending_approval' ? 'bg-primary text-white' : 'bg-info text-white'
                    }`}>
                      {task.kanbanStatus === 'pending_approval' ? 'بانتظار الموافقة' : 'بانتظار المراجعة'}
                    </span>
                  </div>
                  {task.description && <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>👤 {task.assignedTo?.map(u => u.name).join(', ') || 'غير معين'}</span>
                    {task.dueDate && <span className="en-num">📅 {formatDateArabic(task.dueDate)}</span>}
                    {task.workflowId && <span>📋 {task.workflowId.name}</span>}
                  </div>
                </div>
                <div className="w-full lg:w-auto shrink-0">
                  <div className="flex flex-col gap-2">
                    <textarea
                      placeholder="ملاحظات (اختياري)"
                      className="input text-sm min-h-[44px] w-full"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => handleAction(task._id, 'approve')}
                        disabled={actionId === task._id}
                        className="btn btn-success text-sm flex-1 md:flex-none min-h-[44px]"
                      >
                        {actionId === task._id ? '...' : '✅ موافقة'}
                      </button>
                      <button
                        onClick={() => handleAction(task._id, 'reject')}
                        disabled={actionId === task._id}
                        className="btn btn-error text-sm flex-1 md:flex-none min-h-[44px]"
                      >
                        {actionId === task._id ? '...' : '❌ رفض'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StageApproval;
