/**
 * Employee Dashboard
 * Personal dashboard for employees
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyTasks, getDailySummary } from '../../services/taskService';
import { getStoredUser } from '../../services/authService';
import { getCurrentPayslip } from '../../services/payrollService';
import { getLeaveBalance } from '../../services/leaveService';
import Card from '../../components/common/Card';

const EmployeeDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0
  });
  const [payslip, setPayslip] = useState(null);
  const [leaveBal, setLeaveBal] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, summaryRes, payslipRes, balanceRes] = await Promise.allSettled([
        getMyTasks(),
        getDailySummary(),
        getCurrentPayslip(),
        getLeaveBalance(),
      ]);
      if (tasksRes.status === 'fulfilled' && tasksRes.value?.success) {
        setTasks(tasksRes.value.data.tasks.slice(0, 5));
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value?.success) {
        setSummary(summaryRes.value.data.summary);
      }
      if (payslipRes.status === 'fulfilled' && payslipRes.value?.data?.payslip) {
        setPayslip(payslipRes.value.data.payslip);
      }
      if (balanceRes.status === 'fulfilled' && balanceRes.value?.success) {
        setLeaveBal(balanceRes.value.data.balances);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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
      in_progress: 'في التنفيذ',
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
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark">
          مرحباً، {user?.name}
        </h1>
        <p className="text-gray-600 mt-2">هذه لوحة التحكم الخاصة بك</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link to="/my-tasks">
          <Card className="flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm">إجمالي المهام</p>
              <p className="text-2xl font-bold text-dark">{summary.total}</p>
            </div>
          </Card>
        </Link>

        <Link to="/my-tasks">
          <Card className="flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm">المهام المكتملة</p>
              <p className="text-2xl font-bold text-success">{summary.completed}</p>
            </div>
          </Card>
        </Link>

        <Link to="/my-tasks">
          <Card className="flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm">في التنفيذ</p>
              <p className="text-2xl font-bold text-warning">{summary.inProgress}</p>
            </div>
          </Card>
        </Link>

        <Link to="/my-tasks">
          <Card className="flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-interactive/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm">ساعات العمل</p>
              <p className="text-2xl font-bold text-interactive">{summary.totalHours}</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Payroll & Leave Summary */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link to="/payslip">
            <Card className="hover:shadow-xl transition-shadow cursor-pointer border-r-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-1">كشف الراتب الحالي</p>
                  {payslip ? (
                    <>
                      <p className="text-2xl font-bold text-blue-600">{payslip.totals?.net?.toFixed(2) || '0.00'} ريال</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(payslip.periodStart).toLocaleDateString('ar-EG')} - {new Date(payslip.periodEnd).toLocaleDateString('ar-EG')}
                      </p>
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold ${payslip.isDraft ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {payslip.isDraft ? 'مسودة' : 'معتمد'}
                      </span>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm">لا توجد فترة مفتوحة</p>
                  )}
                </div>
                <span className="text-4xl opacity-30">💰</span>
              </div>
            </Card>
          </Link>

          <Link to="/leave-management">
            <Card className="hover:shadow-xl transition-shadow cursor-pointer border-r-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-1">أرصدة الإجازات</p>
                  {leaveBal ? (
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-green-600">
                        سنوية: {leaveBal.annual?.remainingBalance ?? '--'} يوم
                      </p>
                      <p className="text-sm text-gray-500">
                        مرضية: {leaveBal.sick?.remainingBalance ?? '--'} يوم
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">جاري التحميل...</p>
                  )}
                </div>
                <span className="text-4xl opacity-30">📅</span>
              </div>
            </Card>
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link to="/add-task">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">➕</div>
            <h3 className="font-semibold text-dark">{user?.role === 'manager' ? 'مهمة جديدة لي' : 'إضافة مهمة جديدة'}</h3>
            <p className="text-sm text-gray-600">{user?.role === 'manager' ? 'أضف مهمة قمت بها' : 'أضف مهمة قمت بها اليوم'}</p>
          </Card>
        </Link>

        <Link to="/my-tasks">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">📋</div>
            <h3 className="font-semibold text-dark">مهماتي</h3>
            <p className="text-sm text-gray-600">عرض وإدارة مهامك</p>
          </Card>
        </Link>

        <Link to="/task-history">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">📜</div>
            <h3 className="font-semibold text-dark">سجل المهام</h3>
            <p className="text-sm text-gray-600">عرض تاريخ مهامك</p>
          </Card>
        </Link>

        <Link to="/leave-management">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">📝</div>
            <h3 className="font-semibold text-dark">طلب إجازة</h3>
            <p className="text-sm text-gray-600">تقديم طلب إجازة، مهمة، أو أجر إضافي</p>
          </Card>
        </Link>

        <Link to="/payslip">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">💰</div>
            <h3 className="font-semibold text-dark">كشف الراتب</h3>
            <p className="text-sm text-gray-600">عرض كشف الراتب وتفاصيل الإضافات والخصومات</p>
          </Card>
        </Link>
      </div>

      {/* Recent Tasks */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-dark">آخر المهام</h2>
          <Link to="/my-tasks" className="text-interactive hover:underline">
            عرض الكل
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد مهام حالياً</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div 
                key={task._id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    {task.isUnusual ? '⚠️' : '📝'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-dark">{task.title}</h4>
                    <p className="text-sm text-gray-500">{task.duration} ساعة</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {task.isUnusual && (
                    <span className="badge bg-warning text-white">غير عادية</span>
                  )}
                  {getStatusBadge(task.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmployeeDashboard;