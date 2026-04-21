/**
 * BonusManagement Component
 * Allows managers/admins to give bonus points to employees
 * Role-based filtering:
 * - Admin: sees all employees and managers
 * - Manager: sees only employees in their department
 */

import { useState, useEffect } from 'react';
import { giveBonus, getAllBonuses } from '../services/bonusService';
import { getAllUsers } from '../../services/userService';
import { getStoredUser } from '../../services/authService';
import { formatDateArabic } from '../../utils/dateUtils';

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
      
      // Fetch users
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
        
        // Store all employees for filtering
        setAllEmployees(usersData);
        
        // Filter based on role
        let filtered = [];
        
        if (userRole === 'admin') {
          // Admin sees all employees and managers (not admin)
          filtered = usersData.filter(u => u && u.role !== 'admin');
        } else if (userRole === 'manager') {
          // Manager sees only employees in their department
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
      
      // Fetch bonuses
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
      
      // Filter bonuses based on role
      let displayBonuses = bonusesData;
      if (userRole === 'manager') {
        // Manager sees only bonuses they created
        displayBonuses = bonusesData.filter(b => 
          b?.givenBy?._id === currentUser?._id || 
          b?.givenBy === currentUser?._id
        );
      }
      // Admin sees all bonuses
      
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
      // Show all based on role
      if (userRole === 'manager') {
        setFilteredBonuses(bonuses.filter(b => 
          b?.givenBy?._id === currentUser?._id || 
          b?.givenBy === currentUser?._id
        ));
      } else {
        setFilteredBonuses(bonuses);
      }
    } else {
      // Filter by selected employee
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

  const typeLabels = {
    reward: 'مكافأة',
    prize: 'جائزة',
    bonus: 'علاوة'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold">إدارة المكافآت</h2>
      
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-secondary/10 text-secondary' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Add Bonus Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">إضافة مكافأة</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">الموظف</label>
              <select
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              required
            >
              <option value="">اختر الموظف</option>
              {employees.length === 0 ? (
                <option value="" disabled>لا يوجد موظفون متاحون</option>
              ) : (
                employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} {emp.department ? `- ${emp.department.name || emp.department}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">النقاط (0-100)</label>
            <input
              type="number"
              dir="ltr"
              name="points"
              min="0"
              max="100"
              value={formData.points}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">نوع المكافأة</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="reward">مكافأة</option>
              <option value="prize">جائزة</option>
              <option value="bonus">علاوة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">نوع الوزن</label>
            <select
              name="criteria"
              value={formData.criteria || ''}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              required
            >
              <option value="">اختر نوع الوزن</option>
              <option value="إكمال المهام">إكمال المهام</option>
              <option value="جودة العمل">جودة العمل</option>
              <option value="العمل الجماعي">العمل الجماعي</option>
              <option value="المبادرة">المبادرة</option>
              <option value="الالتزام">الالتزام</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">السبب</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              placeholder="سبب منح المكافأة..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'جاري الإضافة...' : 'إضافة مكافأة'}
          </button>
        </form>
      </div>

      {/* Bonuses List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">سجل المكافآت</h3>
        
        {/* Employee Filter Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">فلترة حسب الموظف</label>
          <select
            value={selectedEmployeeFilter}
            onChange={handleEmployeeFilterChange}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">جميع المكافآت</option>
            {allEmployees.map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
        
        {filteredBonuses.length === 0 ? (
          <p className="text-gray-500">لا توجد مكافآت حتى الآن</p>
        ) : (
          <div className="space-y-3">
            {filteredBonuses.map(bonus => (
              <div key={bonus._id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{bonus.employee?.name || bonus.employee?.username || 'غير معروف'}</p>
                    <p className="text-sm text-gray-500">
                      من قبل: {bonus.givenBy?.name || 'غير معروف'}
                    </p>
                    <p className="text-sm mt-1">{bonus.reason}</p>
                  </div>
                  <div className="text-left">
                    <span className="inline-block bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm">
                      +{bonus.points} نقطة
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {typeLabels[bonus.type]}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 en-num">{formatDateArabic(bonus.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BonusManagement;