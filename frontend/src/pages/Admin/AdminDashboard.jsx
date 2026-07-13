/**
 * Admin Dashboard
 * Main dashboard for general manager (admin)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTasksToApprove, getDepartmentTasks, getTotalTasks } from '../../services/taskService';
import { getPendingLeaveRequests } from '../../services/leaveService';
import { getDepartmentStats, getRankings, getUserCounts } from '../../services/userService';
import { getAllDepartments } from '../../services/departmentService';
import { getStoredUser } from '../../services/authService';
import { useDepartments } from '../../hooks/useDepartments';
import Card from '../../components/common/Card';

const LEAVE_LABELS = {
  annual: 'إدارية', sick: 'مرضية', exceptional: 'استثنائية',
  death: 'وفاة', hourly: 'ساعية',
};

const AdminDashboard = () => {
  const user = getStoredUser();
  const [tasksToApprove, setTasksToApprove] = useState([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0 });
  const [deptStats, setDeptStats] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [userCounts, setUserCounts] = useState({ employees: 0, managers: 0 });
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [gmPendingLeaves, setGmPendingLeaves] = useState([]);
  const [selectedDept, setSelectedDept] = useState('all');
  const [deptTasks, setDeptTasks] = useState([]);
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);

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
       
      const [approveRes, deptRes, rankRes, countsRes, pendingLeavesRes, totalTasksRes] = await Promise.all([
        getTasksToApprove(),
        getDepartmentStats(),
        getRankings(),
        getUserCounts(),
        getPendingLeaveRequests(),
        getTotalTasks()
      ]);

      if (approveRes.success) {
        setTasksToApprove(approveRes.data.tasks);
      }

      if (deptRes.success) {
        setDeptStats(deptRes.data.stats);
      }

      if (totalTasksRes?.success) {
        setSummary({
          total: totalTasksRes.data.total || 0,
          completed: totalTasksRes.data.completed || 0
        });
      }

      if (rankRes.success) {
        setRankings(rankRes.data.rankings.slice(0, 5));
      }

      if (countsRes.success) {
        setUserCounts(countsRes.data);
      }
      if (pendingLeavesRes?.success) {
        const allPending = pendingLeavesRes.data?.leaveRequests || [];
        setPendingLeavesCount(allPending.length);
        setGmPendingLeaves(allPending.filter(r => r.status === 'pending_general_manager'));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load tasks for the selected department (GM monitoring)
  const loadDepartmentTasks = async (dept) => {
    try {
      setDeptLoading(true);
      const params = dept && dept !== 'all' ? { department: dept } : {};
      const res = await getDepartmentTasks(params);
      if (res.success) {
        setDeptTasks(res.data.tasks || []);
        setDeptEmployees(res.data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching department tasks:', error);
    } finally {
      setDeptLoading(false);
    }
  };

  useEffect(() => {
    loadDepartmentTasks(selectedDept);
  }, [selectedDept]);

  return (
    <div className="animate-fade-in">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark">
          مرحباً، {user?.name}
        </h1>
        <p className="text-gray-600 mt-2">{user?.role === 'hr' ? 'لوحة تحكم الموارد البشرية' : 'لوحة تحكم المدير العام'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link to="/tasks">
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

        <Link to="/tasks">
          <Card className="flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm">مكتملة</p>
              <p className="text-2xl font-bold text-success">{summary.completed}</p>
            </div>
          </Card>
        </Link>

        <Link to="/admin/employees">
          <Card className="flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm">الأقسام</p>
              <p className="text-2xl font-bold text-secondary">{departments.length}</p>
            </div>
          </Card>
        </Link>

        <Link to="/admin/employees">
          <Card className="flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-interactive/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm">الأعضاء</p>
              <p className="text-2xl font-bold text-interactive">{userCounts.employees + userCounts.managers}</p>
            </div>
          </Card>
        </Link>

        <Link to="/admin/leave-management">
          <Card className="flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm">إجازات معلقة</p>
              <p className="text-2xl font-bold text-warning">{pendingLeavesCount}</p>
            </div>
          </Card>
        </Link>

        <Link to="/payroll/pending-assignments">
          <Card className="flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-danger/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm">الرواتب</p>
              <p className="text-2xl font-bold text-danger">إدارة</p>
            </div>
          </Card>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link to="/admin/employees">
          <Card className="flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-[#182E4E]/20 rounded-full flex items-center justify-center text-2xl">👤</div>
            <div>
              <p className="text-gray-600 text-sm">الموظفين</p>
              <p className="text-2xl font-bold text-[#182E4E]">{userCounts.employees}</p>
            </div>
          </Card>
        </Link>
        <Link to="/admin/employees">
          <Card className="flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-2xl">👔</div>
            <div>
              <p className="text-gray-600 text-sm">رؤساء الأقسام</p>
              <p className="text-2xl font-bold text-purple-600">{userCounts.managers}</p>
            </div>
          </Card>
        </Link>
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

      {/* Department Task Monitoring (GM filter) */}
      <div className="mb-8">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-dark">📋 متابعة مهام الأقسام</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">القسم:</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="input w-56"
              >
                <option value="all">جميع الأقسام</option>
                {departments.map((d) => (
                  <option key={d._id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {deptLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div>
            </div>
          ) : (
            (() => {
              // Compute per-employee task stats from deptTasks
              const empMap = {};
              deptEmployees.forEach((e) => {
                empMap[e._id] = {
                  _id: e._id,
                  name: e.name,
                  department: e.department,
                  total: 0, completed: 0, inProgress: 0, pending: 0, rejected: 0
                };
              });
              let sumTotal = 0, sumCompleted = 0, sumInProgress = 0, sumPending = 0;
              deptTasks.forEach((t) => {
                const st = t.status;
                const isCompleted = st === 'completed' || st === 'approved' || st === 'final_approved';
                const isInProgress = st === 'in_progress';
                const isPending = st === 'pending';
                const isRejected = st === 'rejected';
                (t.assignedTo || []).forEach((a) => {
                  const id = a._id ? a._id.toString() : a.toString();
                  if (!empMap[id]) {
                    empMap[id] = {
                      _id: id,
                      name: a.name || '—',
                      department: a.department || '',
                      total: 0, completed: 0, inProgress: 0, pending: 0, rejected: 0
                    };
                  }
                  empMap[id].total += 1;
                  if (isCompleted) empMap[id].completed += 1;
                  else if (isInProgress) empMap[id].inProgress += 1;
                  else if (isPending) empMap[id].pending += 1;
                  else if (isRejected) empMap[id].rejected += 1;
                });
                sumTotal += 1;
                if (isCompleted) sumCompleted += 1;
                else if (isInProgress) sumInProgress += 1;
                else if (isPending) sumPending += 1;
              });

              const rows = Object.values(empMap).sort((a, b) => b.total - a.total);

              return (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-500 text-sm">إجمالي المهام</p>
                      <p className="text-2xl font-bold text-dark">{sumTotal}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-500 text-sm">مكتملة</p>
                      <p className="text-2xl font-bold text-success">{sumCompleted}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-500 text-sm">في التنفيذ</p>
                      <p className="text-2xl font-bold text-warning">{sumInProgress}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-500 text-sm">قيد الانتظار</p>
                      <p className="text-2xl font-bold text-interactive">{sumPending}</p>
                    </div>
                  </div>

                  {/* Per-employee table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="border-b-2 border-gray-300 text-sm text-gray-600">
                          <th className="p-3">الموظف</th>
                          <th className="p-3">القسم</th>
                          <th className="p-3">الإجمالي</th>
                          <th className="p-3">مكتملة</th>
                          <th className="p-3">في التنفيذ</th>
                          <th className="p-3">قيد الانتظار</th>
                          <th className="p-3">مرفوضة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr><td colSpan={7} className="text-center text-gray-500 py-6">لا توجد مهام</td></tr>
                        ) : rows.map((r) => (
                          <tr key={r._id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-semibold text-dark">{r.name}</td>
                            <td className="p-3 text-gray-600">{r.department}</td>
                            <td className="p-3 font-bold">{r.total}</td>
                            <td className="p-3 text-success">{r.completed}</td>
                            <td className="p-3 text-warning">{r.inProgress}</td>
                            <td className="p-3 text-interactive">{r.pending}</td>
                            <td className="p-3 text-danger">{r.rejected}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()
          )}
        </Card>
      </div>

      {gmPendingLeaves.length > 0 && (
        <div className="mb-8">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-dark">📝 إجازات تنتظر موافقتك</h2>
              <Link to="/admin/leave-management" className="text-sm text-primary hover:underline">
                عرض الكل →
              </Link>
            </div>
            <div className="space-y-3">
              {gmPendingLeaves.slice(0, 5).map((req) => (
                <div key={req._id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{LEAVE_LABELS[req.type] || req.type}</span>
                    <div>
                      <p className="font-semibold text-dark text-sm">{req.employee?.name}</p>
                      <p className="text-xs text-gray-500">{req.employee?.department} · {req.days} يوم</p>
                    </div>
                  </div>
                  <Link
                    to="/admin/leave-management"
                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors"
                  >
                    موافقة
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

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
