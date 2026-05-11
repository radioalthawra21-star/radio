/**
 * Department Management Page
 * Complete CRUD operations for departments with RBAC
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../../../services/departmentService';
import { getAllEmployees, getAllManagers } from '../../../services/userService';
import { getStoredUser } from '../../../services/authService';
import Card from '../../../components/common/Card';
import './DepartmentManagement.css';

const DepartmentManagement = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === 'admin';
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isGeneralManager = currentUser?.role === 'general_manager';
  const isManager = currentUser?.role === 'manager';
  const canModifyDepartments = isAdmin || isSuperAdmin; // Only admin and super_admin can modify departments
  const canAccessAllDepartments = isAdmin || isSuperAdmin || isGeneralManager; // These roles can access all departments

  // State
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    managerId: '',
    description: ''
  });

  // Statistics
  const [departmentStats, setDepartmentStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadDepartments();
    loadUsers();
  }, []);

   const loadDepartments = useCallback(async () => {
     try {
       setLoading(true);
       setError('');
       const response = await getAllDepartments();
       if (response.success) {
         let departments = response.data.departments || [];
         // Filter departments based on user role
         if (!canAccessAllDepartments) {
           // Manager or employee can only see their own department
           departments = departments.filter(dept => dept.name === currentUser?.department);
         }
         setDepartments(departments);
       }
     } catch (err) {
       console.error('Error loading departments:', err);
       setError('حدث خطأ في تحميل الأقسام');
     } finally {
       setLoading(false);
     }
   }, [currentUser?.department, canAccessAllDepartments]);

  const loadUsers = useCallback(async () => {
    try {
      const [empResponse, mgrResponse] = await Promise.all([
        getAllEmployees(),
        getAllManagers()
      ]);

      if (empResponse.success) {
        setEmployees(empResponse.data.employees || []);
      }
      if (mgrResponse.success) {
        setManagers(mgrResponse.data.managers || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  }, []);

  const loadDepartmentStats = useCallback(async (deptName) => {
    try {
      setStatsLoading(true);
      // In a real app, this would call a dedicated stats endpoint
      const deptEmployees = employees.filter(
        emp => emp.department === deptName
      );

      const completedTasks = deptEmployees.reduce((sum, emp) => {
        // This would normally come from backend
        return sum + (emp.performanceScore || 0);
      }, 0);

      const avgPerformance = deptEmployees.length > 0
        ? completedTasks / deptEmployees.length
        : 0;

      setDepartmentStats({
        employeeCount: deptEmployees.length,
        activeCount: deptEmployees.filter(e => e.isActive).length,
        avgPerformance: Math.round(avgPerformance * 10) / 10,
        totalTasks: deptEmployees.length * 5, // Mock data
        completedTasks: Math.round(deptEmployees.length * 5 * 0.7) // Mock 70% completion
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [employees]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('غير مصرح لك بإنشاء أقسام');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    if (!canModifyDepartments || !selectedDepartment) {
      setError('غير مصرح لك بتعديل الأقسام');
      return;
    }
    } catch (err) {
      console.error('Error creating department:', err);
      setError(err.message || 'حدث خطأ في إنشاء القسم');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!isAdmin || !selectedDepartment) {
      setError('غير مصرح لك بتعديل الأقسام');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await updateDepartment(selectedDepartment._id, {
        name: formData.name.trim(),
        color: formData.color
      });

      if (response.success) {
        setSuccess('تم تحديث القسم بنجاح');
        setShowEditModal(false);
        setSelectedDepartment(null);
        setFormData({ name: '', color: '#3B82F6', managerId: '', description: '' });
        loadDepartments();
      } else {
        throw new Error(response.message || 'فشل في تحديث القسم');
      }
    } catch (err) {
      console.error('Error updating department:', err);
      setError(err.message || 'حدث خطأ في تحديث القسم');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canModifyDepartments || !selectedDepartment) {
      setError('غير مصرح لك بحذف الأقسام');
      return;
    }

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const response = await deleteDepartment(selectedDepartment._id);

      if (response.success) {
        setSuccess('تم حذف القسم بنجاح');
        setShowDeleteModal(false);
        setSelectedDepartment(null);
        loadDepartments();
        loadUsers();
      } else {
        throw new Error(response.message || 'فشل في حذف القسم');
      }
    } catch (err) {
      console.error('Error deleting department:', err);
      setError(err.message || 'حدث خطأ في حذف القسم');
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (dept) => {
    setSelectedDepartment(dept);
    setFormData({
      name: dept.name,
      color: dept.color || '#3B82F6',
      managerId: dept.managerId || '',
      description: dept.description || ''
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const openDeleteModal = (dept) => {
    setSelectedDepartment(dept);
    setShowDeleteModal(true);
    setError('');
    setSuccess('');
  };

  const openStatsModal = async (dept) => {
    setSelectedDepartment(dept);
    setShowStatsModal(true);
    await loadDepartmentStats(dept.name);
  };

  const getDepartmentManager = (deptName) => {
    return managers.find(mgr => mgr.department === deptName);
  };

  const getDepartmentEmployees = (deptName) => {
    return employees.filter(emp => emp.department === deptName && emp.role === 'employee');
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('ar-EG').format(num);
  };

  if (loading) {
    return (
      <div className="department-management-page min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="department-management-page min-h-screen bg-background p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-dark mb-2">إدارة الأقسام</h1>
            <p className="text-gray-600">إدارة وتنظيم أقسام المؤسسة والموظفين</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setError('');
                setSuccess('');
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <span>+</span>
              إنشاء قسم جديد
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {(error || success) && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className={`p-4 rounded-lg ${error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
            {error || success}
          </div>
        </div>
      )}

      {/* Statistics Overview */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="text-center">
            <div className="w-12 h-12 bg-primary-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl text-primary">🏢</span>
            </div>
            <h3 className="text-2xl font-bold text-dark">{departments.length}</h3>
            <p className="text-gray-600">إجمالي الأقسام</p>
          </Card>
          <Card className="text-center">
            <div className="w-12 h-12 bg-secondary-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl text-secondary">👥</span>
            </div>
            <h3 className="text-2xl font-bold text-dark">{employees.length}</h3>
            <p className="text-gray-600">إجمالي الموظفين</p>
          </Card>
          <Card className="text-center">
            <div className="w-12 h-12 bg-warning-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl text-warning">💼</span>
            </div>
            <h3 className="text-2xl font-bold text-dark">{managers.length}</h3>
            <p className="text-gray-600">المدراء</p>
          </Card>
          <Card className="text-center">
            <div className="w-12 h-12 bg-success-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl text-success">✅</span>
            </div>
            <h3 className="text-2xl font-bold text-dark">
              {employees.filter(e => e.isActive).length}
            </h3>
            <p className="text-gray-600">موظفون نشطون</p>
          </Card>
        </div>
      </div>

      {/* Departments List */}
      <div className="max-w-7xl mx-auto">
        <Card>
          <h2 className="text-xl font-bold text-dark mb-6">الأقسام</h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div>
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              لا توجد أقسام متاحة
              {isAdmin && (
                <p className="mt-2">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-primary hover:underline"
                  >
                    أنشئ قسماً الآن
                  </button>
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {departments.map((dept) => {
                const manager = getDepartmentManager(dept.name);
                const deptEmployees = getDepartmentEmployees(dept.name);
                const isSystem = dept.isSystem;

                return (
                  <div
                    key={dept._id}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 bg-white"
                  >
                    {/* Department Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: dept.color || '#3B82F6' }}
                        >
                          {dept.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-dark text-lg">{dept.name}</h3>
                          {isSystem && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              نظامي
                            </span>
                          )}
                        </div>
                      </div>
                      {isAdmin && !isSystem && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditModal(dept)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => openDeleteModal(dept)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Department Info */}
                    <div className="space-y-3 mb-4">
                      {dept.description && (
                        <p className="text-sm text-gray-600">{dept.description}</p>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>👥</span>
                        <span>{deptEmployees.length} موظف</span>
                      </div>

                      {manager && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>💼</span>
                          <span>مدير القسم: {manager.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className={`w-2 h-2 rounded-full ${deptEmployees.some(e => e.isActive) ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        <span>{deptEmployees.filter(e => e.isActive).length} نشط</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => openStatsModal(dept)}
                        className="flex-1 btn btn-outline text-sm py-2"
                      >
                        إحصائيات
                      </button>
                       {canAccessAllDepartments && (
                         <button
                           onClick={() => navigate(`/admin/departments/${dept._id}/assign-manager`)}
                           className="flex-1 btn btn-primary text-sm py-2"
                         >
                           تعيين مدير
                         </button>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Create Department Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold text-dark mb-6">إنشاء قسم جديد</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم القسم *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={saving}
                    placeholder="مثال: التسويق"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    لون القسم
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="color"
                      value={formData.color}
                      onChange={handleInputChange}
                      className="w-12 h-12 rounded-lg cursor-pointer"
                      disabled={saving}
                    />
                    <span
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: formData.color }}
                    ></span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    وصف القسم
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows="3"
                    disabled={saving}
                    placeholder="وصف مختصر لعمل القسم..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={saving}
                >
                  {saving ? 'جاري الإنشاء...' : 'إنشاء القسم'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', color: '#3B82F6', managerId: '', description: '' });
                  }}
                  className="btn btn-outline flex-1"
                  disabled={saving}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold text-dark mb-6">تعديل القسم</h2>
            <form onSubmit={handleEdit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم القسم *
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
                    لون القسم
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="color"
                      value={formData.color}
                      onChange={handleInputChange}
                      className="w-12 h-12 rounded-lg cursor-pointer"
                      disabled={saving}
                    />
                    <span
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: formData.color }}
                    ></span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={saving}
                >
                  {saving ? 'جاري التحديث...' : 'تحديث القسم'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedDepartment(null);
                    setFormData({ name: '', color: '#3B82F6', managerId: '', description: '' });
                  }}
                  className="btn btn-outline flex-1"
                  disabled={saving}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-dark mb-2">تأكيد الحذف</h2>
              <p className="text-gray-600 mb-6">
                هل أنت متأكد من حذف قسم "{selectedDepartment.name}"؟
                <br />
                <span className="text-sm text-red-600">
                  لا يمكن التراجع عن هذا الإجراء
                </span>
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDelete}
                  className="btn btn-primary flex-1 bg-red-600 hover:bg-red-700"
                  disabled={deleting}
                >
                  {deleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedDepartment(null);
                  }}
                  className="btn btn-outline flex-1"
                  disabled={deleting}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Department Statistics Modal */}
      {showStatsModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-dark">
                إحصائيات قسم {selectedDepartment.name}
              </h2>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {statsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="text-center">
                    <div className="text-2xl font-bold text-dark">
                      {departmentStats.employeeCount || 0}
                    </div>
                    <div className="text-sm text-gray-600">إجمالي الموظفين</div>
                  </Card>
                  <Card className="text-center">
                    <div className="text-2xl font-bold text-success">
                      {departmentStats.activeCount || 0}
                    </div>
                    <div className="text-sm text-gray-600">موظفون نشطون</div>
                  </Card>
                  <Card className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {departmentStats.avgPerformance || 0}
                    </div>
                    <div className="text-sm text-gray-600">متوسط الأداء</div>
                  </Card>
                  <Card className="text-center">
                    <div className="text-2xl font-bold text-secondary">
                      {departmentStats.completedTasks || 0}
                    </div>
                    <div className="text-sm text-gray-600">مهام مكتملة</div>
                  </Card>
                </div>

                {/* Manager Info */}
                {getDepartmentManager(selectedDepartment.name) && (
                  <Card>
                    <h3 className="font-semibold text-dark mb-3">مدير القسم</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary-20 flex items-center justify-center text-secondary font-bold">
                        {getDepartmentManager(selectedDepartment.name).name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-dark">
                          {getDepartmentManager(selectedDepartment.name).name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {getDepartmentManager(selectedDepartment.name).email}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
