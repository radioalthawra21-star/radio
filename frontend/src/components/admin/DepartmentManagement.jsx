import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import { getAllDepartments, createDepartment, deleteDepartment, updateDepartment } from '../../services/departmentService';
import api from '../../services/api';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptColor, setNewDeptColor] = useState('#3B82F6');
  const [editingDept, setEditingDept] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const res = await getAllDepartments();
      if (res.success) {
        setDepartments(res.data.departments || []);
      }
    } catch (err) {
      console.error('Error loading departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) {
      alert('يرجى إسم القسم');
      return;
    }
    try {
      const res = await createDepartment({ 
        name: newDeptName.trim(), 
        color: newDeptColor 
      });
      if (res.success) {
        setNewDeptName('');
        setNewDeptColor('#3B82F6');
        loadDepartments();
      }
    } catch (err) {
      console.error('Error creating department:', err);
    }
  };

  const handleUpdateDepartment = async (id) => {
    const currentDept = departments.find(d => d._id === id);
    if (!currentDept) return;

    const updateData = { color: editColor };

    // For non-system departments, name is required and can be changed
    if (!currentDept.isSystem) {
      if (!editName.trim()) {
        alert('يرجى إسم القسم');
        return;
      }
      updateData.name = editName.trim();
    } else {
      // For system departments, name field is not sent (prevents name change)
      // Only color will be updated
    }

    try {
      const res = await api.put(`/departments/${id}`, updateData);
      if (res.data.success) {
        setEditingDept(null);
        loadDepartments();
      }
    } catch (err) {
      console.error('Error updating department:', err);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    try {
      const res = await deleteDepartment(id);
      if (res.success) {
        loadDepartments();
      }
    } catch (err) {
      console.error('Error deleting department:', err);
    }
  };

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-dark mb-6">إدارة الأقسام</h2>

      {/* Add New Department */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-dark mb-4">إضافة قسم جديد</h3>
        <div className="flex gap-4 items-center">
          <input
            type="text"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            placeholder="اسم القسم"
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
           <div className="flex items-center gap-2">
             <label className="text-sm text-gray-600">اللون:</label>
             <input
               type="color"
               value={newDeptColor}
               onChange={(e) => setNewDeptColor(e.target.value)}
               className="w-10 h-10 border rounded cursor-pointer p-0"
               title="اختر لون القسم"
               style={{ height: '40px', width: '40px', padding: 0 }}
             />
             <input
               type="text"
               value={newDeptColor}
               onChange={(e) => setNewDeptColor(e.target.value)}
               className="w-24 p-1 border rounded text-sm font-mono"
               placeholder="#3B82F6"
             />
           </div>
          <button
            onClick={handleAddDepartment}
            className="btn btn-primary whitespace-nowrap"
          >
            إضافة
          </button>
        </div>
      </Card>

      {/* Departments List */}
      <Card>
        <h3 className="text-lg font-semibold text-dark mb-4">الأقسام الحالية</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div>
          </div>
        ) : departments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد أقسام مضافة</p>
        ) : (
          <div className="space-y-3">
            {departments.map((dept) => (
              <div
                key={dept._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                {editingDept === dept._id ? (
                  <div className="flex gap-4 flex-1 items-center">
                    {!dept.isSystem && (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 p-2 border rounded-lg"
                        autoFocus
                        disabled={dept.isSystem}
                        placeholder="اسم القسم"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">اللون:</label>
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-10 h-10 border rounded cursor-pointer"
                        title="اختر لون القسم"
                      />
                      <span className="text-sm text-gray-500 font-mono">{editColor}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateDepartment(dept._id)}
                        className="btn btn-primary"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingDept(null)}
                        className="btn btn-outline"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                 ) : (
                   <>
                     <div className="flex items-center gap-3">
                       <div 
                         className="w-6 h-6 rounded-full border-2 border-gray-300"
                         style={{ backgroundColor: dept.color || '#3B82F6' }}
                       />
                       <span className="font-medium text-dark">{dept.name}</span>
                     </div>
                     <div className="flex gap-2">
                       <button
                         onClick={() => {
                           setEditingDept(dept._id);
                           setEditName(dept.name);
                           setEditColor(dept.color || '#3B82F6');
                         }}
                         className="text-blue-600 hover:text-blue-800"
                         title="تعديل"
                       >
                         ✏️
                       </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept._id)}
                        className="text-red-600 hover:text-red-800"
                        title="حذف"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DepartmentManagement;
