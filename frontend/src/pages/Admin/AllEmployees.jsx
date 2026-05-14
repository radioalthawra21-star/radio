import { useState, useEffect } from 'react';
import { getAllEmployees, getAllManagers, getPendingUsers, getEmployeesByDepartment, createUser, updateUser, deleteUser, activateUser } from '../../services/userService';
import { getAllDepartments, createDepartment, deleteDepartment } from '../../services/departmentService';
import { getStoredUser } from '../../services/authService';
import { useDepartments } from '../../hooks/useDepartments';
import Card from '../../components/common/Card';
import UserFormModal from './UserFormModal';
import DeptFormModal from './DeptFormModal';

const roleNames = {
  employee: 'موظف', manager: 'مدير قسم', admin: 'المدير العام'
};

const AllEmployees = () => {
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const userDepartment = currentUser?.department;
  const { departments: hookDepartments, getDepartmentName } = useDepartments();

  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', username: '', email: '', password: '', role: 'employee', department: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customDepartments, setCustomDepartments] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', color: '#3B82F6' });
  const [deptLoading, setDeptLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const loadDepartments = async () => {
    try {
      const response = await getAllDepartments();
      if (response.success) {
        const depts = (response.data.departments || []).map(d => ({ id: d._id, name: d.name, color: d.color }));
        setCustomDepartments(depts);
      }
    } catch (error) { console.error('Error loading departments:', error); }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) { alert('الرجاء إدخال اسم القسم'); return; }
    setDeptLoading(true);
    try {
      const response = await createDepartment({ name: deptForm.name, color: deptForm.color });
      if (response.success) {
        await loadDepartments();
        setDeptForm({ name: '', color: '#3B82F6' });
        setShowDeptModal(false);
      } else { alert(response.message || 'حدث خطأ'); }
    } catch (error) { console.error('Error creating department:', error); alert('حدث خطأ في إنشاء القسم'); }
    finally { setDeptLoading(false); }
  };

  const handleDeleteDepartment = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    try { await deleteDepartment(id); loadDepartments(); }
    catch (error) { console.error('Error deleting department:', error); }
  };

  const getAllDepartmentsMap = () => Object.fromEntries(hookDepartments.map(d => [d._id || d.id, d.name]));
  const allDepartments = getAllDepartmentsMap();

  const fetchData = async () => {
    try {
      setLoading(true);
      await loadDepartments();
      if (isAdmin) {
        const empResponse = await getAllEmployees();
        if (empResponse.success) setEmployees(empResponse.data.employees);
        const mgrResponse = await getAllManagers();
        if (mgrResponse.success) setManagers(mgrResponse.data.managers);
        const pendingResponse = await getPendingUsers();
        if (pendingResponse.success) setPendingUsers(pendingResponse.data.users);
      } else if (isManager) {
        const empResponse = await getEmployeesByDepartment(userDepartment);
        if (empResponse.success) setEmployees(empResponse.data.employees);
        setManagers([]);
        setPendingUsers([]);
      }
    } catch (error) { console.error('Error fetching data:', error); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      let response;
      if (editingUser) response = await updateUser(editingUser._id, formData);
      else response = await createUser(formData);
      if (response.success) {
        setSuccess(editingUser ? 'تم تحديث المستخدم بنجاح' : 'تم إنشاء المستخدم بنجاح');
        setShowModal(false); setEditingUser(null);
        setFormData({ name: '', username: '', email: '', password: '', role: 'employee', department: '' });
        fetchData();
        window.dispatchEvent(new Event('usersUpdated'));
      } else { setError(response.message); }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.message || err.message || 'حدث خطأ');
    } finally { setLoading(false); }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name, username: user.username || '', email: user.email, password: '', role: user.role, department: user.department || '' });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      const response = await deleteUser(userId);
      if (response.success) { setSuccess('تم حذف المستخدم بنجاح'); fetchData(); window.dispatchEvent(new Event('usersUpdated')); }
    } catch (error) { console.error('Error deleting user:', error); }
  };

  const handleActivate = async (userId) => {
    try {
      const response = await activateUser(userId);
      if (response.success) { setSuccess('تم تفعيل الحساب بنجاح'); fetchData(); window.dispatchEvent(new Event('usersUpdated')); }
    } catch (error) { console.error('Error activating user:', error); }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: '', username: '', email: '', password: '', role: 'employee', department: isManager ? userDepartment : '' });
    setShowModal(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-dark">الموظفين</h1>
        <button onClick={openCreateModal} className="btn btn-primary">➕ إضافة مستخدم</button>
      </div>

      {isAdmin && (
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-dark">إدارة الأقسام</h2>
            <button onClick={() => setShowDeptModal(true)} className="btn btn-outline text-sm">➕ إضافة قسم</button>
          </div>
          {customDepartments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">لا توجد أقسام مخصصة</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {customDepartments.map((dept) => (
                <div key={dept.id} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }}></span>
                  <span className="font-medium text-dark">{dept.name}</span>
                  <button onClick={() => handleDeleteDepartment(dept.id)} className="text-error hover:text-red-700 ml-2">✕</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {success && (
        <div className="bg-secondary/10 border border-secondary text-secondary p-3 rounded-lg mb-4">{success}</div>
      )}

      {isAdmin && pendingUsers.length > 0 && (
        <Card className="mb-6 border-2 border-primary">
          <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
            ⚠️ طلبات الانضمام المعلقة <span className="badge bg-primary text-white">{pendingUsers.length}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="p-3">الاسم</th><th className="p-3">اسم المستخدم</th><th className="p-3">البريد الإلكتروني</th>
                  <th className="p-3">القسم</th><th className="p-3">المنصب</th><th className="p-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <tr key={user._id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">{user.name}</td>
                    <td className="p-3 text-gray-600">{user.username}</td>
                    <td className="p-3 text-gray-600">{user.email}</td>
                    <td className="p-3">{allDepartments[user.department] || '-'}</td>
                    <td className="p-3">{roleNames[user.role] || user.role}</td>
                    <td className="p-3"><button onClick={() => handleActivate(user._id)} className="btn btn-primary text-sm">✅ تفعيل</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isAdmin && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-dark mb-4">مديري الأقسام</h2>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div></div>
          ) : managers.length === 0 ? (
            <p className="text-center text-gray-500 py-4">لا يوجد مديرين</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="p-3">الاسم</th><th className="p-3">اسم المستخدم</th><th className="p-3">البريد الإلكتروني</th>
                    <th className="p-3">القسم</th><th className="p-3">الحالة</th><th className="p-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((mgr) => (
                    <tr key={mgr._id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-semibold">{mgr.name}</td>
                      <td className="p-3 text-gray-600">{mgr.username}</td>
                      <td className="p-3 text-gray-600">{mgr.email}</td>
                      <td className="p-3">{getDepartmentName(mgr.department)}</td>
                      <td className="p-3"><span className={`badge ${mgr.isActive ? 'bg-secondary text-white' : 'bg-dark text-white'}`}>{mgr.isActive ? 'نشط' : 'غير نشط'}</span></td>
                      <td className="p-3"><button onClick={() => handleEdit(mgr)} className="text-interactive hover:underline ml-2">تعديل</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold text-dark mb-4">الموظفين</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div></div>
        ) : employees.length === 0 ? (
          <p className="text-center text-gray-500 py-4">لا يوجد موظفين</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="p-3">الاسم</th><th className="p-3">اسم المستخدم</th><th className="p-3">البريد الإلكتروني</th>
                  <th className="p-3">القسم</th><th className="p-3">نقاط الأداء</th><th className="p-3">الحالة</th><th className="p-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">{emp.name}</td>
                    <td className="p-3 text-gray-600">{emp.username}</td>
                    <td className="p-3 text-gray-600">{emp.email}</td>
                    <td className="p-3">{getDepartmentName(emp.department)}</td>
                    <td className="p-3"><span className={`badge ${emp.performanceScore >= 70 ? 'bg-secondary text-white' : emp.performanceScore >= 40 ? 'bg-primary text-white' : 'bg-dark text-white'}`}>{emp.performanceScore || 0}</span></td>
                    <td className="p-3"><span className={`badge ${emp.isActive ? 'bg-secondary text-white' : 'bg-dark text-white'}`}>{emp.isActive ? 'نشط' : 'غير نشط'}</span></td>
                    <td className="p-3"><button onClick={() => handleEdit(emp)} className="text-interactive hover:underline ml-2">تعديل</button>
                    <button onClick={() => handleDelete(emp._id)} className="text-primary hover:underline">حذف</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UserFormModal
        showModal={showModal} editingUser={editingUser} formData={formData}
        error={error} loading={loading} handleChange={handleChange}
        handleSubmit={handleSubmit} isAdmin={isAdmin}
        onClose={() => setShowModal(false)} customDepartments={customDepartments}
      />
      <DeptFormModal
        showDeptModal={showDeptModal} deptForm={deptForm}
        setDeptForm={setDeptForm} deptLoading={deptLoading}
        handleAddDepartment={handleAddDepartment}
        onClose={() => setShowDeptModal(false)}
      />
    </div>
  );
};

export default AllEmployees;
