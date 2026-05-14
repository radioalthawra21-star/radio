import { Navigate } from 'react-router-dom';
import { isLoggedIn, getStoredUser } from '../services/authService';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = getStoredUser();

  if (!isLoggedIn()) {
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
    const isNewsDept = dept === 'news' || dept === 'الأخبار' || dept.includes('news') || dept.includes('إعلام');
    if (!isNewsDept) {
      return <Navigate to="/not-authorized" replace />;
    }
  }

  return children;
};

export const PublicRoute = ({ children }) => {
  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  return children;
};
