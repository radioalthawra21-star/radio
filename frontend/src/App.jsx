/**
 * Main App Component
 * Handles routing and layout
 */

import { TypographyProvider } from './context/TypographyContext';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { isLoggedIn, getStoredUser, logout } from './services/authService';
import Layout from './components/layout/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import EmployeeDashboard from './pages/Employee/EmployeeDashboard';
import MyTasks from './pages/Employee/MyTasks';
import AddTask from './pages/Employee/AddTask';
import TaskHistory from './pages/Employee/TaskHistory';
import ManagerDashboard from './pages/Manager/ManagerDashboard';
import AssignTasks from './pages/Manager/AssignTasks';
import EvaluateTasks from './pages/Manager/EvaluateTasks';
import DepartmentReports from './pages/Manager/DepartmentReports';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AllEmployees from './pages/Admin/AllEmployees';
import AllReports from './pages/Admin/AllReports';
import Settings from './pages/Admin/Settings';
import Rankings from './pages/Admin/Rankings';
import BonusManagement from './components/BonusManagement';
import DeveloperPanel from './pages/Developer/DeveloperPanel';
import TaskDetail from './pages/TaskDetail';
import Messages from './pages/Messages';

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = getStoredUser();
  
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Public route (redirect if logged in)
const PublicRoute = ({ children }) => {
  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }

    const storedLogo = localStorage.getItem('appLogo');
    const storedName = localStorage.getItem('appName');
    if (storedLogo) {
      document.documentElement.style.setProperty('--app-logo', storedLogo);
    }
    if (storedName) {
      document.documentElement.style.setProperty('--app-name', storedName);
      document.title = storedName;
    }

    setLoading(false);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <TypographyProvider>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />

        <Route 
          path="/developer" 
          element={
            <DeveloperPanel />
          }
        />

        {/* Protected Routes with Layout */}
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <Layout user={user} onLogout={handleLogout}>
                <Routes>
                  {/* Role-based Root Redirect */}
                  <Route path="/" element={
                    user?.role === 'admin' ? <AdminDashboard /> : 
                    user?.role === 'manager' ? <ManagerDashboard /> : 
                    <EmployeeDashboard />
                  } />

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                {/* Manager Routes */}
                <Route path="/manager" element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <ManagerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/my-tasks" element={
                  <ProtectedRoute allowedRoles={['employee']}>
                    <MyTasks />
                  </ProtectedRoute>
                } />
                <Route path="/add-task" element={
                  <ProtectedRoute allowedRoles={['employee']}>
                    <AddTask />
                  </ProtectedRoute>
                } />
                <Route path="/task-history" element={
                  <ProtectedRoute allowedRoles={['employee']}>
                    <TaskHistory />
                  </ProtectedRoute>
                } />

                {/* Manager Routes */}
                <Route path="/manager/assign-tasks" element={
                  <ProtectedRoute allowedRoles={['manager', 'admin']}>
                    <AssignTasks />
                  </ProtectedRoute>
                } />
                <Route path="/manager/evaluate-tasks" element={
                  <ProtectedRoute allowedRoles={['manager', 'admin']}>
                    <EvaluateTasks />
                  </ProtectedRoute>
                } />
                <Route path="/manager/reports" element={
                  <ProtectedRoute allowedRoles={['manager', 'admin']}>
                    <DepartmentReports />
                  </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin/assign-tasks" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AssignTasks />
                  </ProtectedRoute>
                } />
                <Route path="/admin/employees" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <AllEmployees />
                  </ProtectedRoute>
                } />
                <Route path="/admin/reports" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AllReports />
                  </ProtectedRoute>
                } />
                <Route path="/admin/settings" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/admin/rankings" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Rankings />
                  </ProtectedRoute>
                } />
<Route path="/admin/bonuses" element={
                   <ProtectedRoute allowedRoles={['manager', 'admin']}>
                     <BonusManagement />
                   </ProtectedRoute>
                 } />
                 <Route path="/manager/bonus" element={
                   <ProtectedRoute allowedRoles={['manager', 'admin']}>
                     <BonusManagement />
                   </ProtectedRoute>
                 } />
                  <Route path="/task/:id" element={
                    <ProtectedRoute>
                      <TaskDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/messages" element={
                    <ProtectedRoute>
                      <Messages />
                    </ProtectedRoute>
                  } />
               </Routes>
              </Layout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </TypographyProvider>
  );
}

export default App;