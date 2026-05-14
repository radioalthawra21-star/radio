import { useState, useEffect } from 'react';
import { giveBonus, getAllBonuses, deleteBonus, approveBonus } from '../services/bonusService';
import { getAllUsers } from '../services/userService';
import { getStoredUser } from '../services/authService';
import BonusForm from './BonusForm';
import BonusList from './BonusList';

const BonusManagement = () => {
  const currentUser = getStoredUser();
  const userRole = currentUser?.role;
  const userDepartment = currentUser?.department;

  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [filteredBonuses, setFilteredBonuses] = useState([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({ employeeId: '', points: 10, reason: '', type: 'reward', criteria: '' });

  useEffect(() => {
    fetchData();
    const handler = () => fetchData();
    window.addEventListener('usersUpdated', handler);
    return () => window.removeEventListener('usersUpdated', handler);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      let usersData = [];
      try {
        const usersRes = await getAllUsers();
        if (usersRes) usersData = Array.isArray(usersRes) ? usersRes : Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.users || [];
        setAllEmployees(usersData);
        setEmployees(userRole === 'admin' ? usersData.filter(u => u && u.role !== 'admin') : usersData.filter(u => u && u.role === 'employee' && u.department === userDepartment));
      } catch { setEmployees([]) }

      let bonusesData = [];
      try {
        const bonusesRes = await getAllBonuses();
        if (bonusesRes) bonusesData = Array.isArray(bonusesRes) ? bonusesRes : Array.isArray(bonusesRes.data) ? bonusesRes.data : bonusesRes.data?.bonuses || [];
      } catch {}
      setBonuses(bonusesData);
      setFilteredBonuses(userRole === 'manager' ? bonusesData.filter(b => b?.givenBy?._id === currentUser?._id || b?.givenBy === currentUser?._id || b?.employee?.department === userDepartment) : bonusesData);
    } catch {} finally { setLoading(false) }
  };

  const handleEmployeeFilterChange = (e) => {
    const id = e.target.value;
    setSelectedEmployeeFilter(id);
    if (!id) setFilteredBonuses(userRole === 'manager' ? bonuses.filter(b => b?.givenBy?._id === currentUser?._id || b?.givenBy === currentUser?._id || b?.employee?.department === userDepartment) : bonuses);
    else setFilteredBonuses(bonuses.filter(b => b?.employee?._id === id || b?.employee === id));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: name === 'points' ? parseInt(value) || 0 : value };
      if (name === 'criteria' && value && value !== 'أخرى') updated.reason = `${value}: ${prev.reason}`;
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.reason || !formData.criteria) { setMessage({ type: 'error', text: 'يرجى ملء جميع الحقول المطلوبة' }); return }
    setSubmitting(true);
    try {
      const response = await giveBonus(formData);
      if (response.success) {
        setMessage({ type: 'success', text: 'تم إضافة المكافأة بنجاح' });
        setFormData({ employeeId: '', points: 10, reason: '', type: 'reward', criteria: '' });
        fetchData();
      } else setMessage({ type: 'error', text: response.message || 'حدث خطأ' });
    } catch { setMessage({ type: 'error', text: 'حدث خطأ في إضافة المكافأة' }) }
    finally { setSubmitting(false) }
  };

  const handleApprove = async (bonusId) => {
    if (!confirm('هل أنت موافق على هذه المكافأة؟')) return;
    try {
      const response = await approveBonus(bonusId);
      if (response.success) { setMessage({ type: 'success', text: 'تمت الموافقة بنجاح' }); fetchData() }
      else setMessage({ type: 'error', text: response.message || 'حدث خطأ' });
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ في الموافقة' }) }
  };

  const handleDelete = async (bonusId) => {
    if (!confirm('هل أنت متأكد من حذف هذه المكافأة؟')) return;
    try {
      const response = await deleteBonus(bonusId);
      if (response.success) { setMessage({ type: 'success', text: 'تم الحذف بنجاح' }); fetchData() }
      else setMessage({ type: 'error', text: response.message || 'حدث خطأ' });
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ في الحذف' }) }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#182E4E]"></div></div>;

  return (
    <div className="p-6" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">إدارة المكافآت</h2>
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          {message.text}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BonusForm formData={formData} employees={employees} submitting={submitting} onChange={handleChange} onSubmit={handleSubmit} />
        <BonusList bonuses={filteredBonuses} employees={employees} allEmployees={allEmployees}
          selectedEmployeeFilter={selectedEmployeeFilter} userRole={userRole} user={currentUser}
          onFilterChange={handleEmployeeFilterChange} onApprove={handleApprove} onDelete={handleDelete} />
      </div>
    </div>
  );
};

export default BonusManagement;
