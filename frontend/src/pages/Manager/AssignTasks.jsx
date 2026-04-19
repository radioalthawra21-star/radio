/**
 * Assign Tasks Page
 * Managers can assign tasks to employees
 */

import { useState, useEffect } from 'react';
import { createTask } from '../../services/taskService';
import { playTaskAssignedSound } from '../../utils/audioUtils';
import { getEmployeesByDepartment } from '../../services/userService';
import { getStoredUser } from '../../services/authService';
import Card from '../../components/common/Card';

const departmentNames = {
  production: 'الإنتاج',
  news: 'الأخبار',
  marketing: 'التسويق'
};

const AssignTasks = () => {
  const user = getStoredUser();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: [],
    difficulty: 50,
    duration: 1,
    dueDate: '',
    isUnusual: false
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setFetchingEmployees(true);
      const response = await getEmployeesByDepartment(user.department);
      if (response.success) {
        setEmployees(response.data.employees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setFetchingEmployees(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
    setError('');
  };

  const handleEmployeeSelect = (employeeId) => {
    setFormData(prev => {
      const selected = prev.assignedTo.includes(employeeId)
        ? prev.assignedTo.filter(id => id !== employeeId)
        : [...prev.assignedTo, employeeId];
      return { ...prev, assignedTo: selected };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.assignedTo.length === 0) {
      setError('يرجى اختيار موظف واحد على الأقل');
      setLoading(false);
      return;
    }

    try {
      const response = await createTask(formData);
      if (response.success) {
        setSuccess('تم إسناد المهمة بنجاح');
        playTaskAssignedSound();
        setFormData({
          title: '',
          description: '',
          assignedTo: [],
          difficulty: 50,
          duration: 1,
          dueDate: '',
          isUnusual: false
        });
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ في إسناد المهمة');
    } finally {
      setLoading(false);
    }
  };

  const difficultyOptions = [
    { value: 20, label: 'سهل (20%)' },
    { value: 50, label: 'متوسط (50%)' },
    { value: 100, label: 'صعب (100%)' }
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-8">إسناد المهام</h1>

      <Card>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-error/10 border border-error text-error p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-success/10 border border-success text-success p-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          {/* Task Title */}
          <div className="mb-4">
            <label className="label">عنوان المهمة *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="input"
              placeholder="أدخل عنوان المهمة"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="label">الوصف</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input min-h-[100px]"
              placeholder="أدخل وصف المهمة"
            />
          </div>

          {/* Select Employees */}
          <div className="mb-4">
            <label className="label">اختر الموظفين *</label>
            {fetchingEmployees ? (
              <p className="text-gray-500">جاري تحميل الموظفين...</p>
            ) : employees.length === 0 ? (
              <p className="text-gray-500">لا يوجد موظفين في هذا القسم</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                {employees.map((emp) => (
                  <label
                    key={emp._id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.assignedTo.includes(emp._id)
                        ? 'border-interactive bg-interactive/10'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.assignedTo.includes(emp._id)}
                      onChange={() => handleEmployeeSelect(emp._id)}
                      className="w-5 h-5 text-interactive rounded focus:ring-interactive"
                    />
                    <div>
                      <p className="font-semibold text-dark">{emp.name}</p>
                      <p className="text-sm text-gray-500">{emp.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Difficulty & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">مستوى الصعوبة</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="input"
              >
                {difficultyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">مدة العمل (ساعات)</label>
              <input
                type="number"
                dir="ltr"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="input"
                min="0.5"
                step="0.5"
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="mb-4">
            <label className="label">تاريخ الاستحقاق</label>
            <input
              type="date"
              lang="en"
              dir="ltr"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="input"
            />
          </div>

          {/* Unusual Task */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isUnusual"
                checked={formData.isUnusual}
                onChange={handleChange}
                className="w-5 h-5 text-interactive rounded focus:ring-interactive"
              />
              <span className="text-dark font-semibold">مهمة غير عادية</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'جاري الإسناد...' : 'إسناد المهمة'}
          </button>
        </form>
      </Card>
    </div>
  );
};

export default AssignTasks;
