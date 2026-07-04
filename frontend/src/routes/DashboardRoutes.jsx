import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import AdminDashboard from '../pages/Admin/AdminDashboard';
import EmployeeDashboard from '../pages/Employee/EmployeeDashboard';
import ManagerDashboard from '../pages/Manager/ManagerDashboard';
import { getStoredUser } from '../services/authService';

export const dashboardRoutes = ({ user }) => {
  const resolvedUser = user || getStoredUser();
  return (
    <>
      <Route path="/" element={
        resolvedUser?.role === 'admin' || resolvedUser?.role === 'hr' ? <AdminDashboard /> :
        resolvedUser?.role === 'manager' ? <ManagerDashboard /> :
        <EmployeeDashboard />
      } />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/manager" element={<ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute>} />
    </>
  );
};
