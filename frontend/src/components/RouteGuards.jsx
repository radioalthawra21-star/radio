import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { isLoggedIn, getStoredUser } from '../services/authService';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(isLoggedIn());
    setChecking(false);
  }, []);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const user = getStoredUser();

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const NewsRoute = ({ children, allowedRoles = [] }) => {
  const user = getStoredUser();

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/not-authorized" replace />;
  }

  if (user.role !== 'admin') {
    const dept = (user.department || '').trim().toLowerCase();
    const isNewsDept = dept === 'news' || dept === 'الأخبار' || dept === 'تحرير' || dept.includes('news') || dept.includes('إعلام') || dept.includes('تحرير');
    if (!isNewsDept) {
      return <Navigate to="/not-authorized" replace />;
    }
  }

  return children;
};

export const HrDeptRoute = ({ children }) => {
  const user = getStoredUser();

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role?.toLowerCase() || '';
  const dept = (user?.department || '').toString().toLowerCase().trim();
  const isHrDept = dept === 'hr' || dept === 'الموارد البشرية' || dept.includes('موارد بشرية');

  if (role === 'admin' || role === 'hr' || (role === 'employee' && isHrDept)) {
    return children;
  }

  return <Navigate to="/" replace />;
};

export const PublicRoute = ({ children }) => {
  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  return children;
};
