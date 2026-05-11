import React from 'react';
import { getStoredUser } from '../services/authService';
import { PayrollProvider } from '../features/payroll/hooks/usePayrollState';

// Get user role from localStorage (same approach as App.jsx)
const getUserRole = () => {
  const user = getStoredUser();
  return user?.role || 'employee';
};

// Higher-Order Component to wrap components with PayrollProvider
export const withPayrollProvider = (Component) => {
  return (props) => {
    const userRole = getUserRole();
    
    return (
      <PayrollProvider userRole={userRole}>
        <Component {...props} />
      </PayrollProvider>
    );
  };
};

// Alternative: Direct wrapper component
export const PayrollRouteWrapper = ({ children }) => {
  const userRole = getUserRole();
  
  return (
    <PayrollProvider userRole={userRole}>
      {children}
    </PayrollProvider>
  );
};
