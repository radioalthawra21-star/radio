import { formatDateArabic } from '../../utils/dateUtils';

const PRIORITY_CONFIG = {
  urgent: { label: 'عاجل', class: 'bg-red-100 text-red-700' },
  high: { label: 'عالية', class: 'bg-orange-100 text-orange-700' },
  medium: { label: 'متوسطة', class: 'bg-blue-100 text-blue-700' },
  low: { label: 'منخفضة', class: 'bg-gray-100 text-gray-600' }
};

const KanbanCard = ({ task, onStatusChange, onClick }) => {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.kanbanStatus !== 'completed';

  return (
    <div
      className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-dark text-sm leading-tight">{task.title}</h4>
        <span className={`text-xs px-1.5 py-0.5 rounded ${priority.class}`}>{priority.label}</span>
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{task.assignedTo?.map(u => u.name).join(', ') || 'غير معين'}</span>
        {isOverdue && <span className="text-error font-semibold">متأخرة!</span>}
      </div>
      {task.dueDate && (
        <div className="mt-1 text-xs text-gray-400 en-num">
          📅 {formatDateArabic(task.dueDate)}
        </div>
      )}
    </div>
  );
};

export default KanbanCard;
