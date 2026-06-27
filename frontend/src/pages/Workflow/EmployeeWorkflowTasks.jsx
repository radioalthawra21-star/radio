import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKanbanBoard, updateKanbanStatus } from '../../services/workflowTaskService';
import { formatDateArabic } from '../../utils/dateUtils';

const TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'in_progress', label: 'قيد التنفيذ' },
  { key: 'completed', label: 'مكتملة' },
  { key: 'rejected', label: 'مرفوضة' }
];

const PRIORITY_CLASSES = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600'
};

const STATUS_LABELS = {
  new: 'جديدة', in_progress: 'قيد التنفيذ', pending_review: 'بانتظار المراجعة',
  pending_approval: 'بانتظار الموافقة', completed: 'مكتملة', rejected: 'مرفوضة'
};

const EmployeeWorkflowTasks = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await getKanbanBoard({ assignedTo: 'me' });
      if (res.success) {
        const all = Object.values(res.data.columns).flat();
        setTasks(all);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateKanbanStatus(taskId, newStatus);
      fetchTasks();
    } catch (err) { alert('فشل تغيير الحالة'); }
  };

  const filtered = activeTab === 'all' ? tasks : tasks.filter(t => t.kanbanStatus === activeTab);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-6">مهامي</h1>

      <div className="flex gap-2 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <p className="text-gray-400 text-lg">لا توجد مهام في هذا القسم</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(task => (
            <div key={task._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/workflow/task/${task._id}`)}>
                  <h3 className="font-bold text-dark">{task.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_CLASSES[task.priority] || 'bg-gray-100 text-gray-600'}`}>
                    {task.priority === 'urgent' ? 'عاجل' : task.priority === 'high' ? 'عالية' : task.priority === 'low' ? 'منخفضة' : 'متوسطة'}
                  </span>
                  <select
                    value={task.kanbanStatus || 'new'}
                    onChange={(e) => handleStatusChange(task._id, e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 bg-gray-50 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                {task.dueDate && (
                  <span className={`en-num ${new Date(task.dueDate) < new Date() && task.kanbanStatus !== 'completed' ? 'text-error font-bold' : ''}`}>
                    📅 {formatDateArabic(task.dueDate)}
                  </span>
                )}
                {task.workflowId && <span>📋 {task.workflowId.name || 'سير عمل'}</span>}
                <span>🔄 {STATUS_LABELS[task.kanbanStatus] || task.kanbanStatus}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeWorkflowTasks;
