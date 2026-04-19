/**
 * TaskDetail Component
 * Displays detailed information about a specific task
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTaskById } from '../services/taskService';
import { formatDateArabic } from '../utils/dateUtils';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await getTaskById(id);
        if (response.success) {
          setTask(response.data.task);
        } else {
          setError(response.message || 'Failed to fetch task');
        }
      } catch (err) {
        setError('An error occurred while fetching task details');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [id]);

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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-dark">تفاصيل المهمة</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-semibold">{task.title}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            task.status === 'completed' ? 'bg-green-100 text-green-800' : 
            task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {task.status === 'completed' ? 'مكتملة' : 
             task.status === 'pending' ? 'قيد الانتظار' : 'جاري'}
          </span>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">الوصف</p>
            <p className="text-dark">{task.description}</p>
          </div>
          <div>
            <p className="text-gray-600">المسندة إلى</p>
            <p className="text-dark">{task.assignedTo?.name || 'غير محدد'}</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">الصعوبة</p>
            <p className="text-dark">{task.difficulty || 'غير محدد'}</p>
          </div>
          <div>
            <p className="text-gray-600">المدة المقدرة</p>
            <p className="text-dark">{task.duration || 'غير محدد'} ساعة</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">تاريخ الاستحقاق</p>
            <p className="text-dark en-num">{task.dueDate ? formatDateArabic(task.dueDate) : 'غير محدد'}</p>
          </div>
          <div>
            <p className="text-gray-600">مدير المهمة</p>
            <p className="text-dark">{task.manager?.name || 'غير محدد'}</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">تقييم المدير</p>
            <p className="text-dark">{task.managerScore !== undefined ? task.managerScore : 'غير محدد'}</p>
          </div>
          <div>
            <p className="text-gray-600">تاريخ الإنشاء</p>
            <p className="text-dark en-num">{task.createdAt ? formatDateArabic(task.createdAt) : 'غير محدد'}</p>
          </div>
        </div>
        
        {task.evaluatedAt && (
          <div>
            <p className="text-gray-600">تاريخ التقييم</p>
            <p className="text-dark en-num">{formatDateArabic(task.evaluatedAt)}</p>
          </div>
        )}
        
        {task.notes && (
          <div>
            <p className="text-gray-600">ملاحظات المدير</p>
            <p className="text-dark">{task.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetail;