/**
 * Employee Profile Page
 * Comprehensive employee information management
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getUserById, 
  updateUser, 
  getAllEmployees,
  getAllManagers,
  getEmployeesByDepartment 
} from '../../../services/userService';
import { getAllDepartments } from '../../../services/departmentService';
import { getTasksByEmployee } from '../../../services/taskService';
import { uploadProfileImage } from '../../../services/authService';
import { getStoredUser } from '../../../services/authService';
import Card from '../../../components/common/Card';
import './EmployeeProfile.css';
import RoleBadge from '../../../components/common/RoleBadge';
import StatusBadge from '../../../components/common/StatusBadge';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const fileInputRef = useRef(null);

  // State management
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    department: '',
    role: 'employee',
    startDate: '',
    isActive: true
  });

  // Additional data
  const [allDepartments, setAllDepartments] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [allManagers, setAllManagers] = useState([]);
  const [employeeTasks, setEmployeeTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Permissions
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isOwnProfile = currentUser?._id === id;
  const canEdit = isAdmin || isOwnProfile;
  const canChangeRole = isAdmin;
  const canChangeDepartment = isAdmin || (isManager && isOwnProfile);

  // Load initial data
  useEffect(() => {
    loadEmployeeData();
    loadDepartments();
    loadUsers();
  }, [id]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get employee details
      const employeeResponse = await getUserById(id);
      if (!employeeResponse.success) {
        throw new Error(employeeResponse.message || 'فشل في تحميل بيانات الموظف');
      }

      const empData = employeeResponse.data.user;
      setEmployee(empData);

      // Initialize form data
      setFormData({
        name: empData.name || '',
        username: empData.username || '',
        email: empData.email || '',
        phone: empData.phone || '',
        department: empData.department || '',
        role: empData.role || 'employee',
        startDate: empData.startDate ? new Date(empData.startDate).toISOString().split('T')[0] : '',
        isActive: empData.isActive !== undefined ? empData.isActive : true
      });

      // Load employee tasks
      loadEmployeeTasks(empData._id);
    } catch (err) {
      console.error('Error loading employee data:', err);
      setError(err.message || 'حدث خطأ في تحميل بيانات الموظف');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeTasks = async (employeeId) => {
    try {
      setTasksLoading(true);
      const tasksResponse = await getTasksByEmployee(employeeId);
      if (tasksResponse.success) {
        setEmployeeTasks(tasksResponse.data.tasks || []);
      }
    } catch (err) {
      console.error('Error loading employee tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await getAllDepartments();
      if (response.success) {
        setAllDepartments(response.data.departments || []);
      }
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const [employeesResponse, managersResponse] = await Promise.all([
        getAllEmployees(),
        getAllManagers()
      ]);

      if (employeesResponse.success) {
        setAllEmployees(employeesResponse.data.employees || []);
      }
      if (managersResponse.success) {
        setAllManagers(managersResponse.data.managers || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Prepare update data
      const updateData = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        isActive: formData.isActive
      };

      // Only include role if admin is changing it
      if (canChangeRole && formData.role !== employee.role) {
        updateData.role = formData.role;
      }

      const response = await updateUser(id, updateData);
      if (response.success) {
        setSuccess('تم تحديث بيانات الموظف بنجاح');
        setEmployee(response.data.user);
        setEditMode(false);
        
        // Update local storage if it's the current user
        if (isOwnProfile) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } else {
        throw new Error(response.message || 'فشل في تحديث البيانات');
      }
    } catch (err) {
      console.error('Error updating employee:', err);
      setError(err.message || 'حدث خطأ في تحديث البيانات');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('يرجى اختيار صورة بصيغة JPEG, JPG, PNG أو GIF');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await fetch('/api/auth/profile-image', {
        method: 'PUT',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'فشل في رفع الصورة');
      }

      setEmployee(data.data.user);
      setSuccess('تم تحديث صورة الملف الشخصي بنجاح');
      
      // Update local storage
      localStorage.setItem('user', JSON.stringify(data.data.user));
    } catch (err) {
      console.error('Error uploading profile image:', err);
      setError(err.message || 'حدث خطأ في رفع الصورة');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setError('');
    setSuccess('');
    // Reset form to current employee data
    if (employee) {
      setFormData({
        name: employee.name || '',
        username: employee.username || '',
        email: employee.email || '',
        phone: employee.phone || '',
        department: employee.department || '',
        role: employee.role || 'employee',
        startDate: employee.startDate ? new Date(employee.startDate).toISOString().split('T')[0] : '',
        isActive: employee.isActive !== undefined ? employee.isActive : true
      });
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive 
      ? '<span class="px-2 py-1 text-xs rounded-full bg-secondary-20 text-secondary">✅ نشط</span>'
      : '<span class="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">❌ غير نشط</span>';
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: {
        label: 'مدير عام',
        badgeClass: 'bg-red-100 text-red-700',
        icon: '👨‍💼'
      },
      manager: {
        label: 'مدير قسم',
        badgeClass: 'bg-blue-100 text-blue-700',
        icon: '👔'
      },
      employee: {
        label: 'موظف',
        badgeClass: 'bg-green-100 text-green-700',
        icon: '👷'
      },
      general_manager: {
        label: 'مدير عام',
        badgeClass: 'bg-purple-100 text-purple-700',
        icon: '👨‍💼'
      },
      super_admin: {
        label: 'المالك الرئيسي',
        badgeClass: 'bg-indigo-100 text-indigo-700',
        icon: '👑'
      }
    };

    const config = roleConfig[role] || roleConfig.employee;
    return (
      <span className="px-2 py-1 text-xs rounded-full">
        <span className={config.badgeClass}>
          {config.icon} {config.label}
        </span>
      </span>
    );
  };

  const getPerformanceColor = (score) => {
    if (score >= 70) return 'bg-secondary-20 text-secondary';
    if (score >= 40) return 'bg-primary-20 text-primary';
    return 'bg-gray-200 text-gray-700';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDepartmentName = (deptName) => {
    const translations = {
      'financial': 'المالي',
      'it': 'تقنية المعلومات',
      'marketing': 'التسويق',
      'news': 'الأخبار',
      'production': 'الإنتاج',
      'live_broadcast': 'البث المباشر',
      'hr': 'الموارد البشرية'
    };
    return translations[deptName?.toLowerCase()] || deptName || '-';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="text-center p-8">
          <p className="text-gray-500 text-lg">لم يتم العثور على بيانات الموظف</p>
          <button 
            onClick={() => navigate('/admin/employees')}
            className="mt-4 btn btn-primary"
          >
            العودة للقائمة
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="employee-profile-page animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-dark mb-2">
              ملف الموظف
            </h1>
            <p className="text-gray-600">
              عرض وتعديل بيانات الموظف الشاملة
            </p>
          </div>
          <div className="flex gap-3">
            {canEdit && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="btn btn-primary"
              >
                ✏️ تعديل البيانات
              </button>
            )}
            <button
              onClick={() => navigate('/admin/employees')}
              className="btn btn-outline"
            >
              ← العودة للقائمة
            </button>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {(error || success) && (
        <div className={`p-4 rounded-lg mb-6 ${
          error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {error || success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <Card className="text-center">
            {/* Profile Image */}
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-5xl font-bold mx-auto overflow-hidden">
                {employee.profileImage ? (
                  <img 
                    src={`${import.meta.env.VITE_API_BASE_URL || ''}${employee.profileImage}`}
                    alt={employee.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.textContent = employee.name.charAt(0).toUpperCase();
                    }}
                  />
                ) : (
                  employee.name.charAt(0).toUpperCase()
                )}
              </div>
              {canEdit && (
                <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-white cursor-pointer hover:bg-primary-dark transition-colors">
                  📷
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProfileImageUpload}
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {uploading && (
              <div className="mb-4">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">جاري الرفع...</p>
              </div>
            )}

            <h2 className="text-xl font-bold text-dark mb-1">{employee.name}</h2>
            <p className="text-gray-600 text-sm mb-3">@{employee.username}</p>
            
            <div className="flex justify-center gap-2 mb-4">
              {getRoleBadge(employee.role)}
              {getStatusBadge(employee.isActive)}
            </div>

            {employee.email && (
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">📧</span> {employee.email}
              </div>
            )}

            {employee.phone && (
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">📞</span> {employee.phone}
              </div>
            )}

            <div className="text-sm text-gray-600 mb-2">
              <span className="font-medium">🏢</span> {getDepartmentName(employee.department)}
            </div>

            {employee.startDate && (
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">📅</span> بدء العمل: {formatDate(employee.startDate)}
              </div>
            )}

            {employee.performanceScore !== undefined && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">معدل الأداء</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getPerformanceColor(employee.performanceScore)}`}>
                    ⭐ {employee.performanceScore}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(employee.performanceScore, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6">
            <h3 className="text-lg font-bold text-dark mb-4">إحصائيات سريعة</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">المهام المكتملة</span>
                <span className="font-bold text-success">
                  {employeeTasks.filter(t => 
                    ['completed', 'approved', 'final_approved'].includes(t.status)
                  ).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">المهام الجارية</span>
                <span className="font-bold text-warning">
                  {employeeTasks.filter(t => t.status === 'in_progress').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">إجمالي المهام</span>
                <span className="font-bold text-dark">{employeeTasks.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ساعات العمل</span>
                <span className="font-bold text-interactive">
                  {employeeTasks.reduce((sum, t) => sum + (t.duration || 0), 0)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Edit Form / Details */}
        <div className="lg:col-span-2">
          {editMode ? (
            <Card>
              <h3 className="text-xl font-bold text-dark mb-6">تعديل بيانات الموظف</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم الكامل *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم المستخدم *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      البريد الإلكتروني *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      القسم
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={saving || !canChangeDepartment}
                    >
                      <option value="">اختر القسم</option>
                      {allDepartments.map(dept => (
                        <option key={dept._id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الدور
                    </label>
                     <select
                       name="role"
                       value={formData.role}
                       onChange={handleInputChange}
                       className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                       disabled={saving || !canChangeRole}
                     >
                       <option value="employee">موظف</option>
                       <option value="manager">مدير قسم</option>
                       <option value="admin">مدير عام</option>
                       <option value="general_manager">مدير عام</option>
                       <option value="super_admin">المالك الرئيسي</option>
                     </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ بدء العمل
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                        disabled={saving}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        حساب نشط
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={saving}
                  >
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="btn btn-outline flex-1"
                    disabled={saving}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Employee Details Card */}
              <Card>
                <h3 className="text-xl font-bold text-dark mb-6">تفاصيل الموظف</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-primary text-lg">👤</span>
                      <div>
                        <p className="text-sm text-gray-600">الاسم الكامل</p>
                        <p className="font-semibold text-dark">{employee.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-primary text-lg">@</span>
                      <div>
                        <p className="text-sm text-gray-600">اسم المستخدم</p>
                        <p className="font-semibold text-dark">{employee.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-primary text-lg">📧</span>
                      <div>
                        <p className="text-sm text-gray-600">البريد الإلكتروني</p>
                        <p className="font-semibold text-dark">{employee.email}</p>
                      </div>
                    </div>

                    {employee.phone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-primary text-lg">📞</span>
                        <div>
                          <p className="text-sm text-gray-600">رقم الهاتف</p>
                          <p className="font-semibold text-dark">{employee.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-primary text-lg">🏢</span>
                      <div>
                        <p className="text-sm text-gray-600">القسم</p>
                        <p className="font-semibold text-dark">
                          {getDepartmentName(employee.department)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-primary text-lg">💼</span>
                         <div>
                           <p className="text-sm text-gray-600">الدور</p>
                           <RoleBadge role={employee.role} />
                         </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-primary text-lg">📅</span>
                      <div>
                        <p className="text-sm text-gray-600">تاريخ بدء العمل</p>
                        <p className="font-semibold text-dark">
                          {formatDate(employee.startDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-primary text-lg">🔄</span>
                         <div>
                           <p className="text-sm text-gray-600">الحالة</p>
                           <StatusBadge isActive={employee.isActive} />
                         </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Performance Score Card */}
              {employee.performanceScore !== undefined && (
                <Card>
                  <h3 className="text-xl font-bold text-dark mb-6">تقييم الأداء</h3>
                  
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-3xl font-bold mb-4">
                      {employee.performanceScore}
                    </div>
                    <p className="text-lg text-gray-600">
                      {employee.performanceScore >= 70 ? 'أداء ممتاز' :
                       employee.performanceScore >= 40 ? 'أداء جيد' :
                       'يحتاج إلى تحسين'}
                    </p>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
                    <div 
                      className="bg-gradient-to-r from-primary to-secondary h-4 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(employee.performanceScore, 100)}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {employeeTasks.filter(t => 
                          ['completed', 'approved', 'final_approved'].includes(t.status)
                        ).length}
                      </p>
                      <p className="text-sm text-gray-600">مهمة مكتملة</p>
                    </div>
                    <div className="p-3 bg-warning/10 rounded-lg">
                      <p className="text-2xl font-bold text-warning">
                        {employeeTasks.filter(t => t.status === 'in_progress').length}
                      </p>
                      <p className="text-sm text-gray-600">قيد التنفيذ</p>
                    </div>
                    <div className="p-3 bg-interactive/10 rounded-lg">
                      <p className="text-2xl font-bold text-interactive">
                        {employeeTasks.reduce((sum, t) => sum + (t.duration || 0), 0)}
                      </p>
                      <p className="text-sm text-gray-600">ساعات العمل</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Tasks History */}
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-dark">سجل المهام</h3>
                  <button
                    onClick={() => navigate(`/task-history?employee=${employee._id}`)}
                    className="text-primary hover:underline text-sm"
                  >
                    عرض الكل
                  </button>
                </div>

                {tasksLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div>
                  </div>
                ) : employeeTasks.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">لا توجد مهام مسجلة</p>
                ) : (
                  <div className="space-y-3">
                    {employeeTasks.slice(0, 5).map((task) => (
                      <div
                        key={task._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => navigate(`/task/${task._id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            {task.isUnusual ? '⚠️' : '📝'}
                          </div>
                          <div>
                            <h4 className="font-semibold text-dark">{task.title}</h4>
                            <p className="text-sm text-gray-600">
                              {task.duration} ساعة | {new Date(task.taskDate).toLocaleDateString('ar-EG')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.managerScore && (
                            <span className="px-2 py-1 text-xs rounded-full bg-info text-white">
                              {task.managerScore}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            task.status === 'completed' || task.status === 'approved' || task.status === 'final_approved'
                              ? 'bg-success text-white'
                              : task.status === 'in_progress'
                              ? 'bg-warning text-white'
                              : 'bg-gray-500 text-white'
                          }`}>
                            {task.status === 'completed' ? 'مكتملة' :
                             task.status === 'approved' ? 'موافقة المدير' :
                             task.status === 'final_approved' ? 'موافقة نهائية' :
                             task.status === 'in_progress' ? 'قيد التنفيذ' : 'قيد الانتظار'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;