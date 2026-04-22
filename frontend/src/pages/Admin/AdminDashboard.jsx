/**
 * Admin Dashboard
 * Main dashboard for general manager (admin)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTasksToApprove } from '../../services/taskService';
import { getDepartmentStats, getRankings, getUserCounts } from '../../services/userService';
import { getAllDepartments } from '../../services/departmentService';
import { getStoredUser } from '../../services/authService';
import { useDepartments } from '../../hooks/useDepartments';
import Card from '../../components/common/Card';

const AdminDashboard = () => {
  const user = getStoredUser();
  const [tasksToApprove, setTasksToApprove] = useState([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0 });
  const [deptStats, setDeptStats] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [userCounts, setUserCounts] = useState({ employees: 0, managers: 0 });

  const { getDepartmentName } = useDepartments();

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await getAllDepartments();
        if (res.success) {
          setDepartments(res.data.departments || []);
        }
      } catch (err) { console.error(err); }
    };
    loadDepts();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [approveRes, deptRes, rankRes, countsRes] = await Promise.all([
        getTasksToApprove(),
        getDepartmentStats(),
        getRankings(),
        getUserCounts()
      ]);

      if (approveRes.success) {
        setTasksToApprove(approveRes.data.tasks);
      }

      if (deptRes.success) {
        setDeptStats(deptRes.data.stats);
        const totalFromDepts = deptRes.data.stats.reduce((sum, d) => sum + d.totalTasks, 0);
        const completedFromDepts = deptRes.data.stats.reduce((sum, d) => sum + d.completedTasks, 0);
        setSummary({ total: totalFromDepts, completed: completedFromDepts });
      }

      if (rankRes.success) {
        setRankings(rankRes.data.rankings.slice(0, 5));
      }

      if (countsRes.success) {
        setUserCounts(countsRes.data);
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
        <p className="text-gray-600 mt-2">لوحة تحكم المدير العام</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <p className="text-gray-600 text-sm">إجمالي المهام</p>
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
          <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">👥</span>
          </div>
          <div>
            <p className="text-gray-600 text-sm">الأقسام</p>
            <p className="text-2xl font-bold text-secondary">{departments.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-interactive/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <div>
            <p className="text-gray-600 text-sm">await الموافقة</p>
            <p className="text-2xl font-bold text-interactive">{tasksToApprove.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-2xl">👤</div>
          <div>
            <p className="text-gray-600 text-sm">الموظفين</p>
            <p className="text-2xl font-bold text-blue-600">{userCounts.employees}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-2xl">👔</div>
          <div>
            <p className="text-gray-600 text-sm">رؤساء الأقسام</p>
            <p className="text-2xl font-bold text-purple-600">{userCounts.managers}</p>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Link to="/admin/employees">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">👥</div>
            <h3 className="font-semibold text-dark">الموظفين</h3>
            <p className="text-sm text-gray-600">إدارة الموظفين</p>
          </Card>
        </Link>

        <Link to="/admin/reports">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="font-semibold text-dark">التقارير</h3>
            <p className="text-sm text-gray-600">عرض جميع التقارير</p>
          </Card>
        </Link>

        <Link to="/admin/rankings">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="font-semibold text-dark">الترتيب</h3>
            <p className="text-sm text-gray-600">ترتيب الموظفين</p>
          </Card>
        </Link>

        <Link to="/admin/bonuses">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">🎁</div>
            <h3 className="font-semibold text-dark">المكافآت</h3>
            <p className="text-sm text-gray-600">إدارة المكافآت</p>
          </Card>
        </Link>

        <Link to="/admin/settings">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer text-center">
            <div className="text-4xl mb-2">⚙️</div>
            <h3 className="font-semibold text-dark">الإعدادات</h3>
            <p className="text-sm text-gray-600">إعدادات النظام</p>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Stats */}
        <Card>
          <h2 className="text-xl font-bold text-dark mb-4">إحصائيات الأقسام</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {deptStats.map((dept) => (
                <div key={dept.department} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-dark">
                      {getDepartmentName(dept.department)}
                    </h3>
                    <span className="badge bg-secondary text-white">
                      {dept.employeeCount} موظف
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <p className="text-gray-500">الأداء</p>
                      <p className="font-bold text-dark">{dept.averagePerformanceScore || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">المهام</p>
                      <p className="font-bold text-dark">{dept.totalTasks}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">مكتملة</p>
                      <p className="font-bold text-success">{dept.completedTasks}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Employees */}
        <Card>
          <h2 className="text-xl font-bold text-dark mb-4">أفضل الموظفين</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div>
            </div>
          ) : rankings.length === 0 ? (
            <p className="text-center text-gray-500 py-8">لا توجد بيانات</p>
          ) : (
            <div className="space-y-3">
              {rankings.map((rank) => (
                <div 
                  key={rank.user._id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      rank.rank === 1 ? 'bg-yellow-400 text-white' :
                      rank.rank === 2 ? 'bg-gray-400 text-white' :
                      rank.rank === 3 ? 'bg-yellow-600 text-white' :
                      'bg-gray-300 text-dark'
                    }`}>
                      {rank.rank}
                    </div>
                    <div>
                      <p className="font-semibold text-dark">{rank.user.name}</p>
                      <p className="text-sm text-gray-500">
                        {getDepartmentName(rank.user.department)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-interactive">{rank.performanceScore}</p>
                    <p className="text-xs text-gray-500">نقطة</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
