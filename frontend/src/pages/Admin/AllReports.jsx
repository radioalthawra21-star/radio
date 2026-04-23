/**
 * All Reports Page
 * Admin can view all reports across departments
 */

import { useState, useEffect } from 'react';
import { getTaskReports, getWeeklySummary, getDailySummary } from '../../services/taskService';
import { getDepartmentStats } from '../../services/userServiceEnhanced';  // ✅ Use enhanced service
import { getAllDepartments } from '../../services/departmentService';
import { useDepartments } from '../../hooks/useDepartments';
import Card from '../../components/common/Card';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatDateArabic } from '../../utils/dateUtils';

const AllReports = () => {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [deptStats, setDeptStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [filter, setFilter] = useState({
    department: '',
    startDate: '',
    endDate: ''
  });

  const { getDepartmentName } = useDepartments();

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await getAllDepartments();
        if (res.success) {
          setDepartments(res.data.departments);
        }
      } catch (err) { console.error(err); }
    };
    loadDepts();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Reset data on new fetch
      setDeptStats([]);
      
      // Fetch tasks
      const taskResponse = await getTaskReports(filter);
      if (taskResponse.success) {
        setTasks(taskResponse.data?.tasks || []);
      }

      // Fetch daily summary
      const summaryResponse = await getDailySummary();
      if (summaryResponse.success) {
        setSummary(summaryResponse.data?.summary || null);
      }

      // Fetch department stats
      try {
        const deptResponse = await getDepartmentStats();
        if (deptResponse.success && deptResponse.data) {
          // ✅ Handle multiple possible response formats
          const stats = deptResponse.data.stats || deptResponse.data.departments || deptResponse.data || [];
          setDeptStats(Array.isArray(stats) ? stats : []);
        } else {
          console.warn('Department stats response not successful:', deptResponse);
          setDeptStats([]);
        }
      } catch (deptError) {
        console.error('Department stats fetch failed:', deptError);
        setDeptStats([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Set RTL direction for Arabic text
    doc.setRtl(true);
    
    // Title
    doc.setFontSize(18);
    doc.text('تقرير شامل', 105, 20, { align: 'center' });
    
    // Date
    doc.setFontSize(12);
    doc.text(`تاريخ التقرير: ${formatDateArabic(new Date())}`, 105, 30, { align: 'center' });

    // Department Stats
    doc.setFontSize(14);
    doc.text('إحصائيات الأقسام', 14, 45);
    doc.setFontSize(10);
    
    let yPos = 55;
    deptStats.forEach((dept) => {
      const deptName = getDepartmentName(dept.department);
      doc.text(`${deptName}: ${dept.employeeCount} موظف، أداء: ${dept.averagePerformanceScore}`, 14, yPos);
      yPos += 8;
    });

    // Table
    doc.setRtl(false); // Switch to LTR for table
    
    const tableData = tasks.map(task => [
      task.title,
      task.assignedTo?.map(u => u.name).join(', ') || '-',
      getDepartmentName(task.assignedTo?.[0]?.department),
      task.duration?.toString() || '0',
<<<<<<< HEAD
      task.status === 'completed' ? 'مكتملة' : task.status === 'approved' || task.status === 'final_approved' ? 'موافقة' : 'قيد التنفيذ' ? 'قيد التنفيذ' : 'قيد الانتظار',
=======
      task.status === 'completed' ? 'مكتملة' : task.status === 'approved' ? 'معتمدة' : 'معلقة',
>>>>>>> 44ac23f3d46f7ffe4ac0f13b3250ed143fc32b60
      formatDateArabic(task.taskDate)
    ]);

    doc.autoTable({
      head: [['المهمة', 'الموظف', 'القسم', 'المدة', 'الحالة', 'التاريخ']],
      body: tableData,
      startY: yPos + 10,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        halign: 'center'
      },
      headStyles: {
        fillColor: [205, 111, 19],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });

    doc.save('report-all.pdf');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-dark">التقارير الشاملة</h1>
        <button onClick={exportToPDF} className="btn btn-primary">
          📥 تصدير PDF
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">القسم</label>
            <select
              className="input"
              value={filter.department}
              onChange={(e) => setFilter({ ...filter, department: e.target.value })}
            >
              <option value="">الكل</option>
              <option value="production">الإنتاج</option>
              <option value="news">الأخبار</option>
              <option value="marketing">التسويق</option>
              {departments.map(dept => (
                <option key={dept._id || dept.id} value={dept._id || dept.id}>
                  {dept.name}
                </option>
              ))}
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
          <div className="flex items-end">
            <button
              onClick={() => setFilter({ department: '', startDate: '', endDate: '' })}
              className="btn btn-outline w-full"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="text-center">
            <p className="text-gray-600 text-sm">إجمالي المهام</p>
            <p className="text-3xl font-bold text-dark">{summary.total}</p>
          </Card>
          <Card className="text-center">
            <p className="text-gray-600 text-sm">مكتملة</p>
            <p className="text-3xl font-bold text-success">{summary.completed}</p>
          </Card>
          <Card className="text-center">
            <p className="text-gray-600 text-sm">في التنفيذ</p>
            <p className="text-3xl font-bold text-warning">{summary.inProgress}</p>
          </Card>
          <Card className="text-center">
            <p className="text-gray-600 text-sm">غير عادية</p>
            <p className="text-3xl font-bold text-error">{summary.unusual}</p>
          </Card>
          <Card className="text-center">
            <p className="text-gray-600 text-sm">ساعات العمل</p>
            <p className="text-3xl font-bold text-interactive">{summary.totalHours}</p>
          </Card>
        </div>
      )}

      {/* Department Stats */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold text-dark mb-4">إحصائيات الأقسام</h2>
        {deptStats.length === 0 && !loading ? (
          <p className="text-center text-gray-500 py-4">لا توجد إحصائيات متاحة</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.isArray(deptStats) && deptStats.map((dept) => {
              // ✅ Safe dept destructuring with defaults
              const {
                department = '',
                employeeCount = 0,
                averagePerformanceScore = 0,
                totalTasks = 0,
                completedTasks = 0
              } = dept || {};
              
              return (
                <div key={department || Math.random()} className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-dark text-lg mb-2">
                    {getDepartmentName(department)}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">الموظفين</p>
                      <p className="font-bold text-dark">{employeeCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">معدل الأداء</p>
                      <p className="font-bold text-interactive">{averagePerformanceScore}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">إجمالي المهام</p>
                      <p className="font-bold text-dark">{totalTasks}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">مكتملة</p>
                      <p className="font-bold text-success">{completedTasks}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Tasks Table */}
      <Card>
        <h2 className="text-xl font-bold text-dark mb-4">المهام</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div>
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد مهام</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="p-3">المهمة</th>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">المدة</th>
                  <th className="p-3">الصعوبة</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">التقييم</th>
                  <th className="p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {task.isUnusual && <span>⚠️</span>}
                        <span>{task.title}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600">
                      {task.assignedTo?.map(u => u.name).join(', ')}
                    </td>
                    <td className="p-3">
                      {getDepartmentName(task.assignedTo?.[0]?.department)}
                    </td>
                    <td className="p-3">{task.duration} ساعة</td>
                    <td className="p-3">
                      <span className={`badge ${
                        task.difficulty === 100 ? 'bg-error' :
                        task.difficulty === 50 ? 'bg-warning' : 'bg-success'
                      } text-white`}>
                        {task.difficulty}%
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`badge ${
                        task.status === 'completed' || task.status === 'approved' || task.status === 'final_approved' ? 'bg-success' :
                        task.status === 'in_progress' ? 'bg-warning' : 'bg-gray-500'
                      } text-white`}>
                        {task.status === 'completed' ? 'مكتملة' :
                         task.status === 'approved' ? 'موافق عليها' :
                         task.status === 'final_approved' ? 'نهائية' :
                         task.status === 'in_progress' ? 'في التنفيذ' : 'قيد الانتظار'}
                      </span>
                    </td>
                    <td className="p-3">
                      {task.managerScore ? (
                        <span className="badge bg-info text-white">{task.managerScore}/100</span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-gray-600">
                      <span className="en-num">{formatDateArabic(task.taskDate)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AllReports;