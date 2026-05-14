// frontend/src/features/payroll/hooks/usePayrollState.jsx

import { useState, useEffect, createContext, useContext } from 'react';

const PayrollContext = createContext();

export const PayrollProvider = ({ children, userRole = 'employee' }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [payrollData, setPayrollData] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);

   useEffect(() => {
     // Map actual user role to payroll permissions matching backend RBAC
     const rolePermissions = {
      admin: ['payroll:view', 'payroll:edit', 'payroll:create', 'payroll:delete', 'payroll:approve'],
      super_admin: ['payroll:view', 'payroll:edit', 'payroll:create', 'payroll:delete', 'payroll:approve'],
      general_manager: ['payroll:view', 'payroll:edit', 'payroll:create', 'payroll:approve'],
      manager: ['payroll:view', 'payroll:edit', 'payroll:create'],
      employee: ['payroll:view'],
      // Fallback for unknown roles
      default: ['payroll:view']
     };
     
     // Normalize role string (handle potential uppercase or special values)
     const normalizedRole = (userRole || '').toLowerCase().replace(/\s+/g, '_');
     const permissions = rolePermissions[normalizedRole] || rolePermissions.default;
     
     setUserPermissions(permissions);
   }, [userRole]);

  const canEdit = userPermissions.includes('payroll:edit') || userPermissions.includes('payroll:create');
  const canCreate = userPermissions.includes('payroll:create');
  const canDelete = userPermissions.includes('payroll:delete');
  const canApprove = userPermissions.includes('payroll:approve');
  const canExport = userPermissions.includes('payroll:export') || userPermissions.includes('payroll:view');

  const toggleEditMode = () => {
    if (canEdit) {
      setIsEditMode(!isEditMode);
      if (!isEditMode) setIsAddingNew(false);
    }
  };

  const startAddingNew = () => {
    if (canCreate) {
      setIsAddingNew(true);
      setIsEditMode(true);
    }
  };

  const cancelEditing = () => {
    setIsEditMode(false);
    setIsAddingNew(false);
    setSelectedEmployee(null);
  };

  return (
    <PayrollContext.Provider value={{
      isEditMode,
      isAddingNew,
      selectedEmployee,
      payrollData,
      userPermissions,
      canEdit,
      canCreate,
      canDelete,
      canApprove,
      canExport,
      toggleEditMode,
      startAddingNew,
      cancelEditing,
      setSelectedEmployee,
      setPayrollData
    }}
    >
      {children}
    </PayrollContext.Provider>
  );
};

export const usePayroll = () => {
  const context = useContext(PayrollContext);
  if (!context) {
    throw new Error('usePayroll must be used within a PayrollProvider');
  }
  return context;
};

// مكون الغلاف العالي للتطبيق
export const withPayrollProvider = (Component, userRole) => {
  return (props) => (
    <PayrollProvider userRole={userRole}>
      <Component {...props} />
    </PayrollProvider>
  );
};
