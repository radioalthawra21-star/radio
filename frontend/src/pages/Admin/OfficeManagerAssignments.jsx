import { useState, useEffect, useCallback } from 'react';
import Card from '../../components/common/Card';
import { getOfficeManagersInDepartment, getTeamAssignments, updateUser, createOffice, updateOffice, deleteOffice, getOffices, assignToOfficeManager, unassignFromOfficeManager, assignEmployeesToOffice, removeEmployeeFromOffice } from '../../services/userService';
import { getStoredUser } from '../../services/authService';
import { useDepartments } from '../../hooks/useDepartments';

const OfficeManagerAssignments = ({ employees, offices: initialOffices, userDepartment, onSuccess }) => {
  const currentUser = getStoredUser();
  const { getDepartmentName } = useDepartments();
  const isManager = currentUser?.role === 'manager';
  const isAdmin = currentUser?.role === 'admin';
  const isHR = currentUser?.role === 'hr';
  const canEdit = isAdmin || isHR || isManager;

  const [loading, setLoading] = useState(true);
  const [officeManagers, setOfficeManagers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [officesList, setOfficesList] = useState(initialOffices || []);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [newOfficeName, setNewOfficeName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [editingOffice, setEditingOffice] = useState(null);
  const [editOfficeName, setEditOfficeName] = useState('');
  const [editOfficeDesc, setEditOfficeDesc] = useState('');

  const [expandedOM, setExpandedOM] = useState(null);
  const [showAssignDropdown, setShowAssignDropdown] = useState(null);
  const [assignSearch, setAssignSearch] = useState('');

  const [showOfficeEmpDropdown, setShowOfficeEmpDropdown] = useState(null);
  const [officeEmpSearch, setOfficeEmpSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [omRes, taRes, offRes] = await Promise.all([
        getOfficeManagersInDepartment(),
        getTeamAssignments(),
        getOffices()
      ]);
      if (omRes.success) setOfficeManagers(omRes.data.officeManagers || []);
      if (taRes.success) {
        setAssignments(taRes.data.assignments || []);
      }
      if (offRes.success) setOfficesList(offRes.data.offices || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setMessage({ type: 'error', text: 'حدث خطأ في تحميل البيانات' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const refreshAfterAction = async () => {
    await loadData();
    if (onSuccess) onSuccess('تمت العملية بنجاح');
  };

  const handleCreateOffice = async (e) => {
    e.preventDefault();
    if (!newOfficeName.trim()) return;
    try {
      setCreateLoading(true);
      const res = await createOffice({
        name: newOfficeName.trim(),
        department: userDepartment || '',
        description: ''
      });
      if (res.success) {
        setNewOfficeName('');
        setMessage({ type: 'success', text: 'تم إنشاء المكتب بنجاح' });
        await loadData();
        if (onSuccess) onSuccess('تم إنشاء المكتب بنجاح');
      } else {
        setMessage({ type: 'error', text: res.message || 'حدث خطأ' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ' });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditOffice = (office) => {
    setEditingOffice(office);
    setEditOfficeName(office.name);
    setEditOfficeDesc(office.description || '');
  };

  const handleSaveEditOffice = async () => {
    if (!editOfficeName.trim()) return;
    try {
      setActionLoading(true);
      const res = await updateOffice(editingOffice._id, { name: editOfficeName.trim(), description: editOfficeDesc });
      if (res.success) {
        setMessage({ type: 'success', text: 'تم تحديث المكتب بنجاح' });
        setEditingOffice(null);
        await loadData();
        if (onSuccess) onSuccess('تم تحديث المكتب بنجاح');
      } else {
        setMessage({ type: 'error', text: res.message || 'حدث خطأ' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOffice = async (officeId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المكتب؟ سيتم إلغاء تعيين الموظفين المرتبطين.')) return;
    try {
      setActionLoading(true);
      const res = await deleteOffice(officeId);
      if (res.success) {
        setMessage({ type: 'success', text: 'تم حذف المكتب بنجاح' });
        await loadData();
        if (onSuccess) onSuccess('تم حذف المكتب بنجاح');
      } else {
        setMessage({ type: 'error', text: res.message || 'حدث خطأ' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignToOffice = async (officeId, empId) => {
    try {
      setActionLoading(true);
      const res = await assignEmployeesToOffice(officeId, [empId]);
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'تم نقل الموظف للمكتب' });
        setShowOfficeEmpDropdown(null);
        setOfficeEmpSearch('');
        await loadData();
        if (onSuccess) onSuccess('تم نقل الموظف للمكتب');
      } else {
        setMessage({ type: 'error', text: res.message || 'حدث خطأ' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFromOffice = async (officeId, empId) => {
    try {
      setActionLoading(true);
      const res = await removeEmployeeFromOffice(officeId, empId);
      if (res.success) {
        setMessage({ type: 'success', text: 'تم إزالة الموظف من المكتب' });
        await loadData();
        if (onSuccess) onSuccess('تم إزالة الموظف من المكتب');
      } else {
        setMessage({ type: 'error', text: res.message || 'حدث خطأ' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ' });
    } finally {
      setActionLoading(false);
    }
  };

  const getAvailableEmployeesForOffice = (office) => {
    const officeEmpIds = (office.employees || []).map(e => (e._id || e).toString());
    return (employees || []).filter(emp =>
      emp.role === 'employee' &&
      emp.department === office.department &&
      !officeEmpIds.includes(emp._id)
    );
  };

  const getFilteredAvailableForOffice = (office) => {
    const available = getAvailableEmployeesForOffice(office);
    if (!officeEmpSearch) return available;
    const term = officeEmpSearch.toLowerCase();
    return available.filter(e =>
      e.name?.toLowerCase().includes(term) || e.email?.toLowerCase().includes(term)
    );
  };

  const handleRevertToEmployee = async (om) => {
    if (!confirm(`هل أنت متأكد من إرجاع "${om.name}" كموظف عادي؟`)) return;
    try {
      setActionLoading(true);
      const res = await updateUser(om._id, { role: 'employee' });
      if (res.success) {
        setMessage({ type: 'success', text: `تم إرجاع ${om.name} كموظف عادي` });
        await refreshAfterAction();
      } else {
        setMessage({ type: 'error', text: res.message || 'حدث خطأ' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignEmployee = async (omId, empId) => {
    try {
      setActionLoading(true);
      const res = await assignToOfficeManager([empId], omId);
      if (res.success) {
        setMessage({ type: 'success', text: 'تم تعيين الموظف' });
        setShowAssignDropdown(null);
        setAssignSearch('');
        await refreshAfterAction();
      } else {
        setMessage({ type: 'error', text: res.message || 'حدث خطأ' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnassignEmployee = async (empId) => {
    try {
      setActionLoading(true);
      const res = await unassignFromOfficeManager([empId]);
      if (res.success) {
        setMessage({ type: 'success', text: 'تم إلغاء تعيين الموظف' });
        await refreshAfterAction();
      } else {
        setMessage({ type: 'error', text: res.message || 'حدث خطأ' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ' });
    } finally {
      setActionLoading(false);
    }
  };

  const getTeamMembers = (omId) => {
    const assignment = assignments.find(a => a.officeManager._id === omId);
    return assignment ? assignment.teamMembers : [];
  };

  const getUnassignedEmployees = () => {
    return (employees || []).filter(emp =>
      emp.role === 'employee' && !emp.supervisedBy
    );
  };

  const getFilteredUnassigned = () => {
    const unassigned = getUnassignedEmployees();
    if (!assignSearch) return unassigned;
    const term = assignSearch.toLowerCase();
    return unassigned.filter(e =>
      e.name?.toLowerCase().includes(term) || e.email?.toLowerCase().includes(term)
    );
  };

  const getLinkedOffice = (omId) => {
    return (officesList || []).find(o => o.manager === omId);
  };

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-lg ${message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-secondary/10 text-secondary border border-secondary/30'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-left ml-2 text-gray-500 hover:text-gray-700">✕</button>
        </div>
      )}

      {/* Create Office - Inline */}
      {canEdit && (
        <Card>
          <h2 className="text-lg font-bold text-dark mb-3">إنشاء مكتب جديد</h2>
          <form onSubmit={handleCreateOffice} className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={newOfficeName}
              onChange={(e) => setNewOfficeName(e.target.value)}
              placeholder="اسم المكتب..."
              className="flex-1 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            <span className="flex items-center text-sm text-gray-500 px-3">
              القسم: {getDepartmentName(userDepartment) || userDepartment || '—'}
            </span>
            <button
              type="submit"
              disabled={createLoading || !newOfficeName.trim()}
              className="btn btn-primary text-sm disabled:opacity-50"
            >
              {createLoading ? 'جاري...' : 'إنشاء مكتب'}
            </button>
          </form>
        </Card>
      )}

      {/* Offices Table */}
      <Card>
        <h2 className="text-lg font-bold text-dark mb-4">المكاتب</h2>
        {officesList.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">لا توجد مكاتب في قسمك بعد</p>
            <p className="text-xs text-gray-400">يمكنك إنشاء مكتب جديد من النموذج أعلاه</p>
          </div>
        ) : (
          <div className="space-y-3">
            {officesList.map(office => {
              const isExpanded = expandedOM === `office-${office._id}`;
              const officeEmps = office.employees || [];

              return (
                <div key={office._id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Office Header */}
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setExpandedOM(isExpanded ? null : `office-${office._id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {office.name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-dark">{editingOffice?._id === office._id ? (
                          <input
                            type="text"
                            value={editOfficeName}
                            onChange={(e) => setEditOfficeName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary outline-none"
                            autoFocus
                          />
                        ) : office.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{getDepartmentName(office.department) || office.department}</span>
                          {office.manager && <span className="text-primary">— مدير: {office.manager.name}</span>}
                        </div>
                        {editingOffice?._id === office._id && (
                          <input
                            type="text"
                            value={editOfficeDesc}
                            onChange={(e) => setEditOfficeDesc(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 p-1 border border-gray-200 rounded text-xs w-full focus:ring-2 focus:ring-primary outline-none"
                            placeholder="الوصف..."
                          />
                        )}
                        {editingOffice?._id !== office._id && office.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{office.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-medium">
                        {officeEmps.length} موظف
                      </span>
                      {canEdit && editingOffice?._id !== office._id && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditOffice(office); }}
                            className="text-xs text-interactive hover:underline border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors"
                          >
                            تعديل
                          </button>
                          {(isAdmin || isHR) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteOffice(office._id); }}
                              disabled={actionLoading}
                              className="text-xs text-primary hover:underline border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 transition-colors"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      )}
                      {editingOffice?._id === office._id && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSaveEditOffice(); }}
                            disabled={actionLoading || !editOfficeName.trim()}
                            className="text-xs text-secondary hover:underline border border-secondary/30 rounded-lg px-2 py-1 hover:bg-secondary/5 transition-colors"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingOffice(null); }}
                            className="text-xs text-gray-500 hover:underline border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded: Office Employees + Assign Dropdown */}
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-100">
                      {officeEmps.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-3">لا يوجد موظفين في هذا المكتب</p>
                      ) : (
                        <div className="space-y-2 mb-3">
                          {officeEmps.map(emp => {
                            const empData = typeof emp === 'object' ? emp : null;
                            return (
                              <div key={empData?._id || emp} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                                  <span className="text-sm font-medium text-dark">{empData?.name || emp}</span>
                                  {empData?.jobTitle && <span className="text-xs text-gray-400">({empData.jobTitle})</span>}
                                </div>
                                {canEdit && (
                                  <button
                                    onClick={() => handleRemoveFromOffice(office._id, empData?._id || emp)}
                                    disabled={actionLoading}
                                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                                  >
                                    إزالة
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add employee to this office */}
                      {canEdit && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {showOfficeEmpDropdown === office._id ? (
                            <div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={officeEmpSearch}
                                  onChange={(e) => setOfficeEmpSearch(e.target.value)}
                                  placeholder="ابحث عن موظف لنقله للمكتب..."
                                  className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() => { setShowOfficeEmpDropdown(null); setOfficeEmpSearch(''); }}
                                  className="text-xs text-gray-500 hover:text-gray-700 px-2"
                                >
                                  إلغاء
                                </button>
                              </div>
                              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-100 rounded-lg">
                                {getFilteredAvailableForOffice(office).length === 0 ? (
                                  <p className="text-center text-xs text-gray-400 py-3">لا يوجد موظفين متاحين للنقل</p>
                                ) : (
                                  getFilteredAvailableForOffice(office).map(emp => (
                                    <button
                                      key={emp._id}
                                      onClick={() => handleAssignToOffice(office._id, emp._id)}
                                      disabled={actionLoading}
                                      className="w-full text-right px-3 py-2 hover:bg-primary/5 text-sm flex items-center justify-between border-b border-gray-50 last:border-0"
                                    >
                                      <span>{emp.name}</span>
                                      <span className="text-xs text-gray-400">{emp.jobTitle || emp.email}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setShowOfficeEmpDropdown(office._id); setOfficeEmpSearch(''); }}
                              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
                            >
                              + نقل موظف لهذا المكتب
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Office Managers + their teams */}
      <Card>
        <h2 className="text-lg font-bold text-dark mb-4">مديرو المكاتب وموظفهم</h2>
        {officeManagers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">لا يوجد مديرو مكاتب في قسمك بعد</p>
            <p className="text-xs text-gray-400">يمكنك تعيين أي موظف كمدير مكتب من تبويب "الموظفين"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {officeManagers.map(om => {
              const teamMembers = getTeamMembers(om._id);
              const linkedOffice = getLinkedOffice(om._id);
              const isExpanded = expandedOM === om._id;

              return (
                <div key={om._id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Office Manager Header */}
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setExpandedOM(isExpanded ? null : om._id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {om.name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-dark">{om.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{getDepartmentName(om.department)}</span>
                          {linkedOffice && <span className="text-primary">— {linkedOffice.name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-medium">
                        {teamMembers.length} موظف
                      </span>
                      {canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRevertToEmployee(om); }}
                          disabled={actionLoading}
                          className="text-xs text-amber-600 hover:text-amber-800 border border-amber-200 rounded-lg px-2 py-1 hover:bg-amber-50 transition-colors"
                        >
                          إرجاع لموظف
                        </button>
                      )}
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Team Members - Expandable */}
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-100">
                      {teamMembers.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-3">لا يوجد موظفين معيّنين</p>
                      ) : (
                        <div className="space-y-2">
                          {teamMembers.map(tm => (
                            <div key={tm._id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                                <span className="text-sm font-medium text-dark">{tm.name}</span>
                                {tm.jobTitle && <span className="text-xs text-gray-400">({tm.jobTitle})</span>}
                              </div>
                              {canEdit && (
                                <button
                                  onClick={() => handleUnassignEmployee(tm._id)}
                                  disabled={actionLoading}
                                  className="text-xs text-red-500 hover:text-red-700 hover:underline"
                                >
                                  إلغاء التعيين
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add employee to this office manager */}
                      {canEdit && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {showAssignDropdown === om._id ? (
                            <div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={assignSearch}
                                  onChange={(e) => setAssignSearch(e.target.value)}
                                  placeholder="ابحث عن موظف..."
                                  className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() => { setShowAssignDropdown(null); setAssignSearch(''); }}
                                  className="text-xs text-gray-500 hover:text-gray-700 px-2"
                                >
                                  إلغاء
                                </button>
                              </div>
                              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-100 rounded-lg">
                                {getFilteredUnassigned().length === 0 ? (
                                  <p className="text-center text-xs text-gray-400 py-3">لا يوجد موظفين بدون تعيين</p>
                                ) : (
                                  getFilteredUnassigned().map(emp => (
                                    <button
                                      key={emp._id}
                                      onClick={() => handleAssignEmployee(om._id, emp._id)}
                                      disabled={actionLoading}
                                      className="w-full text-right px-3 py-2 hover:bg-primary/5 text-sm flex items-center justify-between border-b border-gray-50 last:border-0"
                                    >
                                      <span>{emp.name}</span>
                                      <span className="text-xs text-gray-400">{emp.jobTitle || emp.email}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setShowAssignDropdown(om._id); setAssignSearch(''); }}
                              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
                            >
                              + إضافة موظف
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default OfficeManagerAssignments;
