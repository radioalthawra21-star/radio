/**
 * Manager Dashboard
 * Dashboard for department managers
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTasksToEvaluate, getMyTasks, getDailySummary } from '../../services/taskService';
import { getEmployeesByDepartment, getDepartmentStats } from '../../services/userService';
import { getStoredUser } from '../../services/authService';
import Card from '../../components/common/Card';

const departmentNames = {
  production: 'الإنتاج',
  news: 'الأخبار',
  marketing: 'التسويق'
};

const ManagerDashboard = () => {
  const [tasksToEvaluate, setTasksToEvaluate] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0
  });
  const [deptStats, setDeptStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks to evaluate
      const evaluateResponse = await getTasksToEvaluate();
      if (evaluateResponse.success) {
        setTasksToEvaluate(evaluateResponse.data.tasks);
      }

      // Fetch daily summary
      const summaryResponse = await getDailySummary();
      if (summaryResponse.success) {
        setSummary(summaryResponse.data.summary);
      }

      // Fetch department stats
      if (user?.department) {
        const statsResponse = await getDepartmentStats();
        if (statsResponse.success) {
          setDeptStats(statsResponse.data.stats.find(s => s.department === user.department));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark">
          مرحباً، {user?.name}
        </h1>
        <p className="text-gray-600 mt-2">
          مدير قسم {departmentNames[user?.department] || ''}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <p className="text-gray-600 text-sm">إجمالي مهام القسم</p>
            <p className="text-2xl font-bold text-dark">{summary.total}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <div>
            <p className="text-gray-600 text-sm">مكتملة</p>
            <p className="text-2xl font-bold text-success">{summary.completed}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">⏳</span>
          </div>
          <div>
            <p className="text-gray-600 text-sm">قيد التنفيذ</p>
            <p className="text-2xl font-bold text-warning">{summary.inProgress}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-interactive/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">⭐</span>
          </div>
          <div>
            <p className="text-gray-600 text-sm">await التقييم</p>
            <p className="text-2xl font-bold text-interactive">{tasksToEvaluate.length}</p>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Link to="/manager/assign-tasks">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">👥</div>
            <h3 className="font-semibold text-dark">إسناد المهام</h3>
            <p className="text-sm text-gray-600">إسناد مهام للموظفين</p>
          </Card>
        </Link>

        <Link to="/manager/evaluate-tasks">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">⭐</div>
            <h3 className="font-semibold text-dark">تقييم المهام</h3>
            <p className="text-sm text-gray-600">تقييم مهام الموظفين المكتملة</p>
          </Card>
        </Link>

        <Link to="/admin/bonuses">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">🎁</div>
            <h3 className="font-semibold text-dark">المكافآت</h3>
            <p className="text-sm text-gray-600">إدارة مكافآت الموظفين</p>
          </Card>
        </Link>

        <Link to="/manager/reports">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="font-semibold text-dark">تقارير القسم</h3>
            <p className="text-sm text-gray-600">عرض تقارير القسم</p>
          </Card>
        </Link>
      </div>

      {/* Tasks to Evaluate */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-dark">مهام تحتاج تقييم</h2>
          <Link to="/manager/evaluate-tasks" className="text-interactive hover:underline">
            عرض الكل
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div>
          </div>
        ) : tasksToEvaluate.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد مهام تحتاج تقييم</p>
        ) : (
          <div className="space-y-3">
            {tasksToEvaluate.slice(0, 5).map((task) => (
              <div 
                key={task._id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                    ⏳
                  </div>
                  <div>
                    <h4 className="font-semibold text-dark">{task.title}</h4>
                    <p className="text-sm text-gray-500">
                      {task.assignedTo?.map(u => u.name).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {task.duration} ساعة
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ManagerDashboard;
