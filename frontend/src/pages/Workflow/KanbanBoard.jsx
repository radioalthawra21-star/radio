import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKanbanBoard, updateKanbanStatus } from '../../services/workflowTaskService';
import KanbanColumn from '../../components/workflow/KanbanColumn';

const STATUS_FLOW = ['new', 'in_progress', 'pending_review', 'pending_approval', 'completed', 'rejected'];
const STATUS_LABELS = {
  new: 'جديدة', in_progress: 'قيد التنفيذ', pending_review: 'بانتظار المراجعة',
  pending_approval: 'بانتظار الموافقة', completed: 'مكتملة', rejected: 'مرفوضة'
};

const KanbanBoard = () => {
  const navigate = useNavigate();
  const [columns, setColumns] = useState({
    new: [], in_progress: [], pending_review: [],
    pending_approval: [], completed: [], rejected: []
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getKanbanBoard();
      if (res.success) setColumns(res.data.columns);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateKanbanStatus(taskId, newStatus);
      fetchBoard();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل تغيير الحالة');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  const totalTasks = Object.values(columns).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-dark">لوحة سير العمل</h1>
        <button onClick={() => navigate('/workflows')} className="btn btn-primary text-sm self-start md:self-auto">
          + قوالب سير العمل
        </button>
      </div>

      <div className="overflow-x-auto -mx-3 md:mx-0 mb-4 md:mb-6">
        <div className="flex items-center gap-2 px-3 md:px-0 min-w-max">
          <span className="text-sm text-gray-500 flex-shrink-0">المجموع: <span className="font-bold text-dark en-num">{totalTasks}</span></span>
          {STATUS_FLOW.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={`text-xs md:text-sm px-2 md:px-3 py-1.5 min-h-[44px] rounded-full transition-colors whitespace-nowrap ${
                statusFilter === status ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {STATUS_LABELS[status]} ({columns[status].length})
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-3 md:mx-0 px-3 md:px-0 snap-x snap-mandatory">
        {STATUS_FLOW.map(status => {
          if (statusFilter && statusFilter !== status) return null;
          return (
            <div key={status} className="snap-start shrink-0 min-w-[75vw] md:min-w-[260px]">
              <KanbanColumn
                status={status}
                tasks={columns[status]}
                onStatusChange={handleStatusChange}
                onCardClick={(taskId) => navigate(`/workflow/task/${taskId}`)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
