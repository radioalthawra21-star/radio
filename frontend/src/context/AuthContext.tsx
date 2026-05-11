import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { logout as apiLogout } from '../services/authService';

// TypeScript interfaces
interface User {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: any) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  userRole: string;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on initial load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

   const login = (userData: any) => {
     setUser(userData);
   };

  const logout = async () => {
    // Call backend logout to invalidate token
    await apiLogout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    userRole: user?.role || 'employee'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Protected Route Component
export const ProtectedRoute = ({ children, allowedRoles = [] }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has one of the allowed roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Log the redirect for debugging
    console.log('ProtectedRoute: Redirecting - user.role:', user.role, 'allowedRoles:', allowedRoles, 'location:', location.pathname);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Protected Route for News Department - checks role AND department
export const NewsRoute = ({ children, allowedRoles = [] }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/not-authorized" replace />;
  }

  if (user.department !== 'news') {
    console.log('NewsRoute: Redirecting - user.department:', user.department, 'path requires news department');
    return <Navigate to="/not-authorized" replace />;
  }

  return children;
};

// Route wrapper for role-based access
export const RoleBasedRoute = ({ children, allowedRoles = [] }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Don't render anything while loading
  }

  if (!allowedRoles.length) {
    return children; // No role restriction
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null; // Don't render if no access
  }

  return children;
};