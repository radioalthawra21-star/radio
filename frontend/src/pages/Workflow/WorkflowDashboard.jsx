import { useState, useEffect } from 'react';
import {
  getDashboardStats, getEmployeePerformance, getDepartmentPerformance,
  getBottleneckStages, getAvgCompletionTime
} from '../../services/dashboardService';
import Card from '../../components/common/Card';

const WorkflowDashboard = () => {
  const [stats, setStats] = useState(null);
  const [employeePerf, setEmployeePerf] = useState([]);
  const [departmentPerf, setDepartmentPerf] = useState([]);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [avgTime, setAvgTime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, eRes, dRes, bRes, aRes] = await Promise.all([
          getDashboardStats(), getEmployeePerformance(),
          getDepartmentPerformance(), getBottleneckStages(),
          getAvgCompletionTime()
        ]);
        if (sRes.success) setStats(sRes.data);
        if (eRes.success) setEmployeePerf(eRes.data.performance || []);
        if (dRes.success) setDepartmentPerf(dRes.data.departments || []);
        if (bRes.success) setBottlenecks(bRes.data.bottlenecks || []);
        if (aRes.success) setAvgTime(aRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  const statCards = stats ? [
    { label: 'إجمالي المهام', value: stats.totalTasks, color: 'bg-primary' },
    { label: 'قيد التنفيذ', value: stats.openTasks, color: 'bg-warning' },
    { label: 'مكتملة', value: stats.completedTasks, color: 'bg-success' },
    { label: 'متأخرة', value: stats.overdueTasks, color: 'bg-error' },
    { label: 'مهام سير عمل', value: stats.workflowTasks, color: 'bg-info' },
    { label: 'مرفوضة', value: stats.rejectedTasks, color: 'bg-gray-500' },
    { label: 'معدل الإنجاز', value: `${stats.completionRate}%`, color: 'bg-dark' },
    { label: 'منشأة اليوم', value: stats.todayCreated, color: 'bg-secondary' },
  ] : [];

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold text-dark mb-6 md:mb-8">لوحة إحصائيات سير العمل</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {statCards.map((card, i) => (
          <div key={i} className={`bg-white rounded-xl shadow-lg p-3 md:p-4 ${card.color === 'bg-primary' ? 'border-r-4 border-[#CD6F13]' : card.color === 'bg-warning' ? 'border-r-4 border-[#CD6F13]' : card.color === 'bg-success' ? 'border-r-4 border-[#16A34A]' : card.color === 'bg-error' ? 'border-r-4 border-[#DC2626]' : card.color === 'bg-info' ? 'border-r-4 border-[#1C95A4]' : card.color === 'bg-gray-500' ? 'border-r-4 border-[#6B7280]' : card.color === 'bg-dark' ? 'border-r-4 border-[#182E4E]' : card.color === 'bg-secondary' ? 'border-r-4 border-[#1C95A4]' : 'border-r-4 border-primary'}`}>
            <p className="text-xs md:text-sm text-gray-500">{card.label}</p>
            <p className="text-xl md:text-3xl font-bold text-dark mt-1 en-num">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="font-bold text-dark mb-4">أداء الموظفين</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-responsive-cards">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-right py-2">الموظف</th>
                  <th className="text-center py-2">الإجمالي</th>
                  <th className="text-center py-2">مكتمل</th>
                  <th className="text-center py-2">متأخر</th>
                  <th className="text-center py-2">معدل الإنجاز</th>
                </tr>
              </thead>
              <tbody>
                {employeePerf.slice(0, 10).map((emp, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium text-dark" data-label="الموظف">{emp.user?.name}</td>
                    <td className="text-center en-num" data-label="الإجمالي">{emp.total}</td>
                    <td className="text-center en-num text-success" data-label="مكتمل">{emp.completed}</td>
                    <td className="text-center en-num text-error" data-label="متأخر">{emp.overdue}</td>
                    <td className="text-center en-num" data-label="معدل الإنجاز">{emp.completionRate}%</td>
                  </tr>
                ))}
                {employeePerf.length === 0 && (
                  <tr><td colSpan="5" className="text-center text-gray-400 py-4">لا توجد بيانات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-dark mb-4">أداء الأقسام</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-responsive-cards">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-right py-2">القسم</th>
                  <th className="text-center py-2">الموظفون</th>
                  <th className="text-center py-2">المهام</th>
                  <th className="text-center py-2">مكتمل</th>
                  <th className="text-center py-2">معدل الإنجاز</th>
                </tr>
              </thead>
              <tbody>
                {departmentPerf.map((dept, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium text-dark" data-label="القسم">{dept.department}</td>
                    <td className="text-center en-num" data-label="الموظفون">{dept.employeeCount}</td>
                    <td className="text-center en-num" data-label="المهام">{dept.total}</td>
                    <td className="text-center en-num text-success" data-label="مكتمل">{dept.completed}</td>
                    <td className="text-center en-num" data-label="معدل الإنجاز">{dept.completionRate}%</td>
                  </tr>
                ))}
                {departmentPerf.length === 0 && (
                  <tr><td colSpan="5" className="text-center text-gray-400 py-4">لا توجد بيانات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-dark mb-4">اختناقات المراحل</h3>
          <div className="space-y-3">
            {bottlenecks.map((b, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-dark text-sm">{b.workflowName} → {b.stageName}</span>
                  <span className="text-sm font-bold text-warning en-num">{b.activeTasks} نشط</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-warning h-2 rounded-full" style={{
                    width: b.totalTasks > 0 ? `${(b.activeTasks / b.totalTasks) * 100}%` : '0%'
                  }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {b.completedTasks} مكتملة من أصل {b.totalTasks}
                </p>
              </div>
            ))}
            {bottlenecks.length === 0 && (
              <p className="text-center text-gray-400 py-4">لا توجد اختناقات</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-dark mb-4">متوسط وقت الإنجاز</h3>
          {avgTime ? (
            <div className="text-center py-8">
              <p className="text-5xl font-bold text-primary en-num">{avgTime.avgCompletionHours}</p>
              <p className="text-gray-500 mt-2">ساعة متوسط وقت إنجاز المهمة</p>
              <p className="text-sm text-gray-400 mt-1">بناءً على <span className="en-num font-bold">{avgTime.totalCompleted}</span> مهمة مكتملة</p>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">لا توجد بيانات كافية</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default WorkflowDashboard;
