import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import React from 'react';
import { getStoredUser } from '../services/authService';

const AdminDashboard = React.lazy(() => import('../pages/Admin/AdminDashboard'));
const EmployeeDashboard = React.lazy(() => import('../pages/Employee/EmployeeDashboard'));
const ManagerDashboard = React.lazy(() => import('../pages/Manager/ManagerDashboard'));

export const dashboardRoutes = ({ user }) => {
  const resolvedUser = user || getStoredUser();
  return (
    <>
      <Route path="/" element={
        resolvedUser?.role === 'admin' || resolvedUser?.role === 'hr' ? <AdminDashboard /> :
        resolvedUser?.role === 'manager' ? <ManagerDashboard /> :
        resolvedUser?.role === 'office_manager' ? <ManagerDashboard /> :
        <EmployeeDashboard />
      } />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/manager" element={<ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute>} />
    </>
  );
};
