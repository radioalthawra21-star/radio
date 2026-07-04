import { useState, useEffect } from 'react';
import { getMyTasks, deleteTask } from '../../services/taskService';
import Card from '../../components/common/Card';
import { formatDateArabic } from '../../utils/dateUtils';

const TaskHistory = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', startDate: '', endDate: '' });

  useEffect(() => { fetchTasks(); }, [filter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await getMyTasks(filter);
      if (response.success) setTasks(response.data.tasks);
    } catch (error) { console.error('Error fetching tasks:', error); }
    finally { setLoading(false); }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المهمة من السجل؟')) return;
    try {
      const res = await deleteTask(taskId);
      if (res.success) fetchTasks();
    } catch (error) { console.error('Error deleting task:', error); }
  };

  const groupTasksByDate = () => {
    const grouped = {};
    tasks.forEach((task) => {
      const date = formatDateArabic(task.taskDate);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(task);
    });
    return grouped;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-gray-500', in_progress: 'bg-warning', completed: 'bg-info',
      approved: 'bg-success', final_approve: 'bg-success', rejected: 'bg-error'
    };
    const labels = {
      pending: 'قيد الانتظار', in_progress: 'في التنفيذ', completed: 'مكتملة',
      approved: 'موافقة المدير', final_approve: 'موافقة نهائية', rejected: 'مرفوضة'
    };
    return <span className={`badge ${badges[status] || 'bg-gray-500'} text-white`}>{labels[status] || status}</span>;
  };

  const groupedTasks = groupTasksByDate();

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold text-dark mb-6 md:mb-8">سجل المهام</h1>

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">الحالة</label>
            <select className="input" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
              <option value="">الكل</option>
              <option value="pending">قيد الانتظار</option>
              <option value="in_progress">في التنفيذ</option>
              <option value="completed">مكتملة</option>
              <option value="approved">موافقة المدير</option>
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
          <div className="flex items-end gap-2">
              <button onClick={() => setFilter({ status: '', startDate: '', endDate: '' })} className="btn btn-outline flex-1 min-h-[44px]">إعادة تعيين</button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div></div>
      ) : tasks.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-8">لا توجد مهام في السجل</p></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([date, dateTasks]) => (
            <div key={date}>
              <h3 className="text-lg font-bold text-dark mb-3 flex items-center gap-2">
                <span>📅</span>
                <span className="en-num">{date}</span>
                <span className="text-sm font-normal text-gray-500">({dateTasks.length} مهمة)</span>
              </h3>
              <div className="space-y-3">
                {dateTasks.map((task) => (
                  <Card key={task._id} className="hover:shadow-lg transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 max-w-full">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          {task.status === 'rejected' ? '🚫' : task.isUnusual ? '⚠️' : '📝'}
                        </div>
                        <div className="min-w-0 flex-1 max-w-full">
                          <h4 className="font-semibold text-dark break-words">{task.title}</h4>
                          <p className="text-sm text-gray-600 break-words">{task.description}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs md:text-sm text-gray-500">
                            <span className="whitespace-nowrap">⏱️ {task.duration} ساعة</span>
                            {task.startTime && <span className="whitespace-nowrap">🕐 {task.startTime} - {task.endTime}</span>}
                          </div>
                          {task.rejectionReason && (
                            <p className="text-xs text-red-500 mt-1">🚫 {task.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {task.isUnusual && <span className="badge bg-warning text-white">غير عادية</span>}
                        {task.managerScore && <span className="badge bg-info text-white">⭐ {task.managerScore}/100</span>}
                        {getStatusBadge(task.status)}
                        <button onClick={() => handleDelete(task._id)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors" title="حذف من السجل">🗑️</button>
                      </div>
                    </div>
                    {task.employeeNotes && (
                      <div className="mt-3 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                        ملاحظتي: {task.employeeNotes}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskHistory;
