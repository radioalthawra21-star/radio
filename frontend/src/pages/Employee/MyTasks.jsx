/**
 * My Tasks Page
 * View and manage assigned tasks
 */

import { useState, useEffect } from 'react';
import { getMyTasks, updateTaskStatus } from '../../services/taskService';
import Card from '../../components/common/Card';
import { formatDateArabic } from '../../utils/dateUtils';

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await getMyTasks(filter);
      if (response.success) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await updateTaskStatus(taskId, newStatus);
      if (response.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-gray-500',
      in_progress: 'bg-warning',
      completed: 'bg-info',
      approved: 'bg-success',
      final_approved: 'bg-success'
    };
    const labels = {
      pending: 'قيد الانتظار',
      in_progress: 'قيد التنفيذ',
      completed: 'مكتملة',
      approved: 'موافقة المدير',
      final_approved: 'موافقة نهائية'
    };
    return (
      <span className={`badge ${badges[status] || 'bg-gray-500'} text-white`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-8">مهماتي</h1>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">الحالة</label>
            <select
              className="input"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">الكل</option>
              <option value="pending">قيد الانتظار</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="completed">مكتملة</option>
            </select>
          </div>
          <div>
            <label className="label">من تاريخ</label>
            <input
              type="date"
              lang="en"
              dir="ltr"
              className="input"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">إلى تاريخ</label>
            <input
              type="date"
              lang="en"
              dir="ltr"
              className="input"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Tasks List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">لا توجد مهام حالياً</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task._id} className="hover:shadow-xl transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    {task.isUnusual ? '⚠️' : '📝'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark text-lg">{task.title}</h3>
                    <p className="text-sm text-gray-600">{task.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>🕐 {task.duration} ساعة</span>
                      <span>📅 <span className="en-num">{formatDateArabic(task.taskDate)}</span></span>
                      {task.managerScore && (
                        <span>⭐ التقييم: {task.managerScore}/100</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {task.isUnusual && (
                    <span className="badge bg-warning text-white">غير عادية</span>
                  )}
                  {getStatusBadge(task.status)}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusChange(task._id, 'completed')}
                      className="btn btn-interactive"
                    >
                      إكمال
                    </button>
                  )}
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(task._id, 'in_progress')}
                      className="btn btn-primary"
                    >
                      بدء
                    </button>
                  )}
                </div>
              </div>
              {task.managerNotes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-dark">ملاحظات المدير:</p>
                  <p className="text-sm text-gray-600">{task.managerNotes}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTasks;