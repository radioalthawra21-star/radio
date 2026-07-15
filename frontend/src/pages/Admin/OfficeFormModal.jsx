import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import { getStoredUser } from '../../services/authService';

export default function OfficeFormModal({ showModal, formData, setFormData, loading, error, isEdit, onSubmit, onClose, employees }) {
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);

  useEffect(() => {
    if (!showModal) {
      setEmployeeSearch('');
      setShowEmpDropdown(false);
    }
  }, [showModal]);

  if (!showModal) return null;

  const currentUser = getStoredUser();
  const selectedIds = formData.employees || [];
  const department = formData.department || currentUser?.department || '';

  const filteredEmployees = (employees || []).filter(emp => {
    const inDept = !department || emp.department === department;
    const notSelected = !selectedIds.includes(emp._id);
    const matchesSearch = !employeeSearch || emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) || emp.email?.toLowerCase().includes(employeeSearch.toLowerCase());
    return inDept && notSelected && matchesSearch;
  });

  const addEmployee = (emp) => {
    setFormData({ ...formData, employees: [...selectedIds, emp._id] });
    setEmployeeSearch('');
    setShowEmpDropdown(false);
  };

  const removeEmployee = (empId) => {
    setFormData({ ...formData, employees: selectedIds.filter(id => id !== empId) });
  };

  const selectedEmpDetails = (employees || []).filter(emp => selectedIds.includes(emp._id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4 modal-overlay">
      <Card className="w-full max-w-md mx-2 md:mx-4 modal-content max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-dark mb-4">
          {isEdit ? 'تعديل مكتب' : 'إضافة مكتب جديد'}
        </h2>
        <form onSubmit={onSubmit}>
          {error && (
            <div className="bg-primary/10 border border-primary text-primary p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="label">اسم المكتب</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input min-h-[48px]"
              placeholder="مثال: مكتب المبيعات"
              required
            />
          </div>
          <div className="mb-4">
            <label className="label">القسم</label>
            <input
              type="text"
              value={currentUser?.department || ''}
              className="input min-h-[48px] bg-gray-50"
              readOnly
            />
            <input
              type="hidden"
              name="department"
              value={currentUser?.department || ''}
            />
          </div>
          <div className="mb-4">
            <label className="label">الوصف (اختياري)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input min-h-[80px]"
              placeholder="وصف المكتب..."
            />
          </div>
          <div className="mb-4">
            <label className="label">الموظفون المُعيَّنون</label>
            {selectedEmpDetails.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedEmpDetails.map(emp => (
                  <span key={emp._id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                    {emp.name}
                    <button type="button" onClick={() => removeEmployee(emp._id)} className="hover:text-red-600 ml-1">✕</button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => { setEmployeeSearch(e.target.value); setShowEmpDropdown(true); }}
                onFocus={() => setShowEmpDropdown(true)}
                placeholder="ابحث عن موظف لإضافته..."
                className="input min-h-[48px]"
              />
              {showEmpDropdown && filteredEmployees.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                  {filteredEmployees.map(emp => (
                    <button
                      key={emp._id}
                      type="button"
                      onClick={() => addEmployee(emp)}
                      className="w-full text-right px-3 py-2 hover:bg-gray-50 text-sm flex items-center justify-between"
                    >
                      <span>{emp.name}</span>
                      <span className="text-gray-400 text-xs">{emp.jobTitle || emp.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {showEmpDropdown && employeeSearch && filteredEmployees.length === 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 p-3 text-center text-gray-400 text-sm shadow-lg">
                  لا يوجد موظفين مطابقين
                </div>
              )}
            </div>
            {selectedIds.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{selectedIds.length} موظف مُعيَّن</p>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <button type="submit" className="btn btn-primary flex-1 min-h-[48px]">
              {loading ? 'جاري الحفظ...' : isEdit ? 'تحديث' : 'إنشاء المكتب'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline flex-1 min-h-[48px]">إلغاء</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
