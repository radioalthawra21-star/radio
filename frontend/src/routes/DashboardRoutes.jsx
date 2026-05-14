import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import AdminDashboard from '../pages/Admin/AdminDashboard';
import EmployeeDashboard from '../pages/Employee/EmployeeDashboard';
import ManagerDashboard from '../pages/Manager/ManagerDashboard';

export const dashboardRoutes = ({ user }) => (
  <>
    <Route path="/" element={
      user?.role === 'admin' ? <AdminDashboard /> :
      user?.role === 'manager' ? <ManagerDashboard /> :
      <EmployeeDashboard />
    } />
    <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
    <Route path="/manager" element={<ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute>} />
  </>
);
