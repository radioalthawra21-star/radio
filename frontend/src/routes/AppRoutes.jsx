import { Routes, Route } from 'react-router-dom';
import { Suspense } from 'react';
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
import { financialMiscRoutes } from './FinancialMiscRoutes';
import { workflowRoutes } from './WorkflowRoutes';

const Loading = <div className="p-8 text-center">جاري التحميل...</div>;

export default function AppRoutes({ user, onLogout }) {
  return (
    <Suspense fallback={Loading}>
    <Routes>
      {authRoutes}
      {developerRoutes}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout user={user} onLogout={onLogout}>
            <Suspense fallback={Loading}>
            <Routes>
              {dashboardRoutes({ user })}
              {taskRoutes}
              {adminRoutes}
              {payrollRoutes}
              {newsRoutes}
              {selfServiceRoutes}
              {financialMiscRoutes}
              {workflowRoutes}
            </Routes>
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
    </Suspense>
  );
}
