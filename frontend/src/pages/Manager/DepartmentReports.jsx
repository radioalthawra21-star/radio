/**
 * Department Reports Page
 * Managers can view department reports
 */

import { useState, useEffect } from 'react';
import { getTaskReports, getWeeklySummary } from '../../services/taskService';
import { getEmployeesByDepartment } from '../../services/userService';
import { getStoredUser } from '../../services/authService';
import Card from '../../components/common/Card';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatDateArabic } from '../../utils/dateUtils';

const departmentNames = {
  production: 'الإنتاج',
  news: 'الأخبار',
  marketing: 'التسويق'
};

const DepartmentReports = () => {
  const user = getStoredUser();
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch employees
      const empResponse = await getEmployeesByDepartment(user.department);
      if (empResponse.success) {
        setEmployees(empResponse.data.employees);
      }

      // Fetch tasks
      const taskResponse = await getTaskReports(filter);
      if (taskResponse.success) {
        setTasks(taskResponse.data.tasks);
      }

      // Fetch weekly summary
      const summaryResponse = await getWeeklySummary();
      if (summaryResponse.success) {
        setSummary(summaryResponse.data.summary);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(`تقرير قسم ${departmentNames[user.department]}`, 105, 20, { align: 'center' });
    
    // Date
    doc.setFontSize(12);
    doc.text(`تاريخ التقرير: ${formatDateArabic(new Date())}`, 105, 30, { align: 'center' });

    // Summary
    if (summary) {
      doc.setFontSize(14);
      doc.text('ملخص الأسبوع', 14, 45);
      doc.setFontSize(10);
      doc.text(`إجمالي المهام: ${summary.total}`, 14, 55);
      doc.text(`مكتملة: ${summary.completed}`, 14, 62);
      doc.text(`قيد التنفيذ: ${summary.inProgress}`, 14, 69);
      doc.text(`ساعات العمل: ${summary.totalHours}`, 14, 76);
    }

    // Table
    const tableData = tasks.map(task => [
      task.title,
      task.assignedTo?.map(u => u.name).join(', ') || '-',
      task.duration,
      task.status === 'completed' ? 'مكتملة' : task.status,
formatDateArabic(task.taskDate)
    ]);

    doc.autoTable({
      head: [['المهمة', 'الموظف', 'المدة', 'الحالة', 'التاريخ']],
      body: tableData,
      startY: 85,
      dir: 'rtl'
    });

    doc.save(`report-${departmentNames[user.department]}.pdf`);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-dark">تقارير القسم</h1>
        <button onClick={exportToPDF} className="btn btn-primary">
          📥 تصدير PDF
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="text-center">
            <p className="text-gray-600 text-sm">إجمالي المهام</p>
            <p className="text-3xl font-bold text-dark">{summary.total}</p>
          </Card>
          <Card className="text-center">
            <p className="text-gray-600 text-sm">مكتملة</p>
            <p className="text-3xl font-bold text-success">{summary.completed}</p>
          </Card>
          <Card className="text-center">
            <p className="text-gray-600 text-sm">قيد التنفيذ</p>
            <p className="text-3xl font-bold text-warning">{summary.inProgress}</p>
          </Card>
          <Card className="text-center">
            <p className="text-gray-600 text-sm">ساعات العمل</p>
            <p className="text-3xl font-bold text-interactive">{summary.totalHours}</p>
          </Card>
        </div>
      )}

      {/* Employees Table */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold text-dark mb-4">الموظفين في القسم</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="p-3">الاسم</th>
                  <th className="p-3">البريد الإلكتروني</th>
                  <th className="p-3">نقاط الأداء</th>
                  <th className="p-3">تاريخ التعيين</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{emp.name}</td>
                    <td className="p-3 text-gray-600">{emp.email}</td>
                    <td className="p-3">
                      <span className={`badge ${emp.performanceScore >= 70 ? 'bg-success' : emp.performanceScore >= 40 ? 'bg-warning' : 'bg-error'} text-white`}>
                        {emp.performanceScore || 0}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">
                      <span className="en-num">{formatDateArabic(emp.startDate)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <th className="p-3">المدة</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{task.title}</td>
                    <td className="p-3 text-gray-600">
                      {task.assignedTo?.map(u => u.name).join(', ')}
                    </td>
                    <td className="p-3">{task.duration} ساعة</td>
                    <td className="p-3">
                      <span className={`badge ${
                        task.status === 'completed' || task.status === 'approved' ? 'bg-success' :
                        task.status === 'in_progress' ? 'bg-warning' : 'bg-gray-500'
                      } text-white`}>
                        {task.status === 'completed' ? 'مكتملة' :
                         task.status === 'approved' ? 'موافق عليها' :
                         task.status === 'in_progress' ? 'قيد التنفيذ' : 'قيد الانتظار'}
                      </span>
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

export default DepartmentReports;