import KanbanCard from './KanbanCard';

const COLUMN_CONFIG = {
  new: { title: 'جديدة', color: 'bg-gray-500', border: 'border-gray-300' },
  in_progress: { title: 'قيد التنفيذ', color: 'bg-warning', border: 'border-warning' },
  pending_review: { title: 'بانتظار المراجعة', color: 'bg-info', border: 'border-info' },
  pending_approval: { title: 'بانتظار الموافقة', color: 'bg-primary', border: 'border-primary' },
  completed: { title: 'مكتملة', color: 'bg-success', border: 'border-success' },
  rejected: { title: 'مرفوضة', color: 'bg-error', border: 'border-error' }
};

const KanbanColumn = ({ status, tasks = [], onStatusChange, onCardClick }) => {
  const config = COLUMN_CONFIG[status] || { title: status, color: 'bg-gray-500', border: 'border-gray-300' };
  return (
    <div className={`kanban-column bg-gray-50 rounded-xl p-3 min-w-[260px] border-t-4 ${config.border}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-dark flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${config.color}`}></span>
          {config.title}
        </h3>
        <span className="text-sm bg-white px-2 py-0.5 rounded-full font-bold text-dark">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-3 min-h-[200px]">
        {tasks.map((task) => (
          <KanbanCard
            key={task._id}
            task={task}
            onStatusChange={onStatusChange}
            onClick={() => onCardClick && onCardClick(task._id)}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">لا توجد مهام</p>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
