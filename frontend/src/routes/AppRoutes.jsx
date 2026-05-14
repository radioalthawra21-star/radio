import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import Layout from '../components/layout/Layout';
import { authRoutes } from './AuthRoutes';
import { developerRoutes } from './DeveloperRoutes';
import { dashboardRoutes } from './DashboardRoutes';
import { taskRoutes } from './TaskRoutes';
import { adminRoutes } from './AdminRoutes';
import { payrollRoutes } from './PayrollRoutes';
import { newsRoutes } from './NewsRoutes';
import { selfServiceRoutes } from './SelfServiceRoutes';

export default function AppRoutes({ user, onLogout }) {
  return (
    <Routes>
      {authRoutes}
      {developerRoutes}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout user={user} onLogout={onLogout}>
            <Routes>
              {dashboardRoutes({ user })}
              {taskRoutes}
              {adminRoutes}
              {payrollRoutes}
              {newsRoutes}
              {selfServiceRoutes}
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
