/**
 * BonusManagement Component
 * Allows managers/admins to give bonus points to employees
 * Role-based filtering:
 * - Admin: sees all employees and managers
 * - Manager: sees only employees in their department
 */

import { useState, useEffect } from 'react';
import { giveBonus, getAllBonuses, deleteBonus, approveBonus } from '../services/bonusService';
import { getAllUsers } from '../services/userService';
import { getStoredUser } from '../services/authService';
import { formatDateArabic } from '../utils/dateUtils';

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
  
  const [formData, setFormData] = useState({
    employeeId: '',
    points: 10,
    reason: '',
    type: 'reward',
    criteria: ''
  });

  useEffect(() => {
    fetchData();
    
    const handleUsersUpdate = () => {
      fetchData();
    };
    
    window.addEventListener('usersUpdated', handleUsersUpdate);
    return () => {
      window.removeEventListener('usersUpdated', handleUsersUpdate);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let usersData = [];
      try {
        const usersRes = await getAllUsers();
        
        if (usersRes) {
          if (Array.isArray(usersRes)) {
            usersData = usersRes;
          } else if (Array.isArray(usersRes.data)) {
            usersData = usersRes.data;
          } else if (usersRes.data && Array.isArray(usersRes.data.users)) {
            usersData = usersRes.data.users;
          }
        }
        
        setAllEmployees(usersData);
        
        let filtered = [];
        
        if (userRole === 'admin') {
          filtered = usersData.filter(u => u && u.role !== 'admin');
        } else if (userRole === 'manager') {
          filtered = usersData.filter(u => 
            u && 
            u.role === 'employee' && 
            u.department === userDepartment
          );
        }
        
        setEmployees(filtered);
      } catch (userError) {
        console.error('Error fetching users:', userError);
        setEmployees([]);
      }
      
      let bonusesData = [];
      try {
        const bonusesRes = await getAllBonuses();
        
        if (bonusesRes) {
          if (Array.isArray(bonusesRes)) {
            bonusesData = bonusesRes;
          } else if (Array.isArray(bonusesRes.data)) {
            bonusesData = bonusesRes.data;
          } else if (bonusesRes.data && Array.isArray(bonusesRes.data.bonuses)) {
            bonusesData = bonusesRes.data.bonuses;
          }
        }
      } catch (bonusError) {
        console.error('Error fetching bonuses:', bonusError);
      }
      
setBonuses(bonusesData);
        
        let displayBonuses = bonusesData;
        if (userRole === 'manager') {
          displayBonuses = bonusesData.filter(b => 
            (b?.givenBy?._id === currentUser?._id || 
            b?.givenBy === currentUser?._id ||
            b?.employee?.department === userDepartment)
          );
        }
        
        setFilteredBonuses(displayBonuses);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeFilterChange = (e) => {
    const selectedId = e.target.value;
    setSelectedEmployeeFilter(selectedId);
    
    if (selectedId === '') {
      if (userRole === 'manager') {
        setFilteredBonuses(bonuses.filter(b => 
          b?.givenBy?._id === currentUser?._id || 
          b?.givenBy === currentUser?._id ||
          b?.employee?.department === userDepartment
        ));
      } else {
        setFilteredBonuses(bonuses);
      }
    } else {
      setFilteredBonuses(bonuses.filter(b => 
        b?.employee?._id === selectedId || 
        b?.employee === selectedId
      ));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: name === 'points' ? parseInt(value) || 0 : value
      };
      
      if (name === 'criteria') {
        if (value && value !== 'أخرى') {
          updated.reason = `${value}: ${prev.reason}`;
        } else if (value === 'أخرى') {
          updated.reason = prev.reason;
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.reason || !formData.criteria) {
      setMessage({ type: 'error', text: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }

    try {
      setSubmitting(true);
      const response = await giveBonus(formData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'تم إضافة المكافأة بنجاح' });
        setFormData({
          employeeId: '',
          points: 10,
          reason: '',
          type: 'reward',
          criteria: ''
        });
        fetchData();
      } else {
        setMessage({ type: 'error', text: response.message || 'حدث خطأ' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ في إضافة المكافأة' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (bonusId) => {
    if (!confirm('هل أنت موافق على هذه المكافأة؟')) return;
    try {
      const response = await approveBonus(bonusId);
      console.log('Approve response:', response);
      if (response.success) {
        setMessage({ type: 'success', text: 'تمت الموافقة بنجاح' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: response.message || 'حدث خطأ' });
      }
    } catch (error) {
      console.error('Approve error:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'حدث خطأ في الموافقة' });
    }
  };

  const handleDelete = async (bonusId) => {
    if (!confirm('هل أنت متأكد من حذف هذه المكافأة؟')) return;
    try {
      const response = await deleteBonus(bonusId);
      console.log('Delete response:', response);
      if (response.success) {
        setMessage({ type: 'success', text: 'تم الحذف بنجاح' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: response.message || 'حدث خطأ' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'حدث خطأ في الحذف' });
    }
  };

  const typeLabels = {
    reward: 'مكافأة',
    prize: 'جائزة',
    bonus: 'علاوة'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#182E4E]"></div>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">إدارة المكافآت</h2>
      
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Bonus Form */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">إضافة مكافأة جديدة</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الموظف</label>
              <select
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E] bg-white"
                required
              >
                <option value="">-- اختر الموظف --</option>
                {employees.length === 0 ? (
                  <option value="" disabled>لا يوجد موظفون</option>
                ) : (
                  employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">النقاط (0-100)</label>
              <input
                type="number"
                dir="ltr"
                name="points"
                min="0"
                max="100"
                value={formData.points}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع المكافأة</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E] bg-white"
              >
                <option value="reward">مكافأة</option>
                <option value="prize">جائزة</option>
                <option value="bonus">علاوة</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع التقييم</label>
              <select
                name="criteria"
                value={formData.criteria || ''}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E] bg-white"
                required
              >
                <option value="">-- اختر نوع التقييم --</option>
                <option value="إكمال المهام">إكمال المهام</option>
                <option value="جودة العمل">جودة العمل</option>
                <option value="العمل الجماعي">العمل الجماعي</option>
                <option value="المبادرة">المبادرة</option>
                <option value="الالتزام">الالتزام</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">السبب</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E]"
                placeholder="اكتب سبب منح المكافأة..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#182E4E] text-white py-3 rounded-lg hover:bg-[#152842] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'جاري الإضافة...' : 'إضافة المكافأة'}
            </button>
          </form>
        </div>

        {/* Bonuses List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">سجل المكافآت</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">فلترة حسب الموظف</label>
              <select
                value={selectedEmployeeFilter}
                onChange={handleEmployeeFilterChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E] bg-white"
              >
              <option value="">-- جميع المكافآت --</option>
              {(userRole === 'manager' ? employees : allEmployees).map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>
          
          {filteredBonuses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">لا توجد مكافآت</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredBonuses.map(bonus => {
                const bonusDate = new Date(bonus.createdAt);
                const now = new Date();
                const hoursSince = (now - bonusDate) / (1000 * 60 * 60);
                const canDelete = userRole === 'admin' || 
                  (userRole === 'manager' && bonus.givenBy?._id === currentUser?._id && hoursSince <= 24);
                const canApprove = userRole === 'admin' && !bonus.isApproved;
                
                return (
                  <div key={bonus._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">{bonus.employee?.name || 'غير معروف'}</p>
                        <p className="text-sm text-gray-500">من: {bonus.givenBy?.name || 'غير معروف'}</p>
                        <p className="text-sm text-gray-700 mt-1">{bonus.reason}</p>
                      </div>
                      <div className="text-left mr-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          bonus.isApproved ? 'bg-[#CDD6E8] text-[#182E4E]' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {bonus.isApproved ? '✓ موافق عليها' : '⌛ في الانتظار'}
                        </span>
                        <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium mt-1">
                          +{bonus.points} نقطة
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{typeLabels[bonus.type]}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDateArabic(bonus.createdAt)}</p>
                        <div className="flex gap-2 mt-2">
                          {canApprove && (
                            <button
                              onClick={() => handleApprove(bonus._id)}
                               className="text-xs bg-[#182E4E] text-white px-2 py-1 rounded hover:bg-[#152842]"
                            >
                              موافقة
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(bonus._id)}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BonusManagement;