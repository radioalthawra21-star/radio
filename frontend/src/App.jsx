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
import AlertsPanel from './pages/Developer/AlertsPanel';
import ResourceMonitor from './pages/Developer/ResourceMonitor';
import VisitorMonitor from './pages/Developer/VisitorMonitor';
import TaskDetail from './pages/TaskDetail';
import Messages from './pages/Messages';
import ManagerEvaluation from './pages/ManagerEvaluation';
import ManagerEvaluationDashboard from './pages/ManagerEvaluationDashboard';
import WellBeingCheckIn from './pages/WellBeingCheckIn';
import WellBeingDashboard from './pages/WellBeingDashboard';
import ChangePassword from './pages/Employee/ChangePassword';
import Attendance from './pages/Employee/Attendance';
import LeaveRequest from './pages/Employee/LeaveRequest';
import LeaveManagement from './pages/Admin/LeaveManagement';
import AttendanceManagement from './pages/Admin/AttendanceManagement';
import AuditLogs from './pages/Admin/AuditLogs';
import RecruitmentPerformanceManagement from './pages/RecruitmentPerformanceManagement';
import NotAuthorized from './pages/Auth/NotAuthorized';

// Payroll pages
import PayrollManagement from './pages/Payroll/PayrollManagement';
import PayrollPendingAssignments from './pages/PayrollPendingAssignments';
import PayrollDashboard from './pages/PayrollDashboard';
import PayrollProcessing from './pages/PayrollProcessing';
import PayrollReports from './pages/PayrollReports';
import PayrollAudit from './pages/PayrollAudit';
import PayrollPolicies from './pages/PayrollPolicies';
import PayrollWorkflow from './pages/PayrollWorkflow';
import PayrollIntegration from './pages/PayrollIntegration';
import PayslipView from './pages/Payroll/PayslipView';
import PayslipDetail from './pages/Payroll/PayslipDetail';
import ComprehensiveHRPayrollSystem from './pages/Payroll/ComprehensiveHRPayrollSystem';
import { PayrollRouteWrapper } from './context/PayrollWrapper';

// News pages
import NewsDashboard from './pages/News/NewsDashboard';
import EditorialPipeline from './pages/News/EditorialPipeline';
import CoupletPipeline from './pages/News/CoupletPipeline';
import PromptManagement from './pages/News/PromptManagement';
import CoupletPromptManagement from './pages/News/CoupletPromptManagement';

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

// News department route - only for news department staff and admins
const NewsRoute = ({ children, allowedRoles = [] }) => {
  const user = getStoredUser();

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/not-authorized" replace />;
  }

  // Department check: must be 'news' or Arabic equivalents OR role 'admin'
  if (user.role !== 'admin') {
    const dept = (user.department || '').trim().toLowerCase();
    const isNewsDept = dept === 'news' || dept === 'الأخبار' || dept.includes('news') || dept.includes('إعلام');
    if (!isNewsDept) {
      return <Navigate to="/not-authorized" replace />;
    }
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
          path="/not-authorized" 
          element={
            <ProtectedRoute>
              <NotAuthorized />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/developer" 
          element={
            <DeveloperPanel />
          }
        />
        <Route 
          path="/developer/alerts" 
          element={
            <AlertsPanel />
          }
        />
        <Route 
          path="/developer/resources" 
          element={
            <ResourceMonitor />
          }
        />
        <Route 
          path="/developer/visitors" 
          element={
            <VisitorMonitor />
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
                  <ProtectedRoute allowedRoles={['employee', 'manager']}>
                    <AddTask />
                  </ProtectedRoute>
                } />
                 <Route path="/task-history" element={
                   <ProtectedRoute allowedRoles={['employee']}>
                     <TaskHistory />
                   </ProtectedRoute>
                 } />
                 <Route path="/change-password" element={
                   <ProtectedRoute>
                     <ChangePassword />
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
                <Route path="/admin/leave-management" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <LeaveManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/attendance" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <AttendanceManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/audit-logs" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AuditLogs />
                  </ProtectedRoute>
                } />
                <Route path="/admin/recruitment" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <RecruitmentPerformanceManagement />
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
                   <Route path="/evaluate-manager" element={
                     <ProtectedRoute>
                       <ManagerEvaluation />
                     </ProtectedRoute>
                   } />
                   <Route path="/admin/manager-evaluation" element={
                     <ProtectedRoute allowedRoles={['admin']}>
                       <ManagerEvaluationDashboard />
                     </ProtectedRoute>
                   } />
                   <Route path="/well-being" element={
                     <ProtectedRoute>
                       <WellBeingCheckIn />
                     </ProtectedRoute>
                   } />
                   <Route path="/admin/well-being" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager']}>
                        <WellBeingDashboard />
                      </ProtectedRoute>
                    } />

                    {/* Employee self-service */}
                    <Route path="/attendance" element={
                      <ProtectedRoute>
                        <Attendance />
                      </ProtectedRoute>
                    } />
                    <Route path="/leave-request" element={
                      <ProtectedRoute>
                        <LeaveRequest />
                      </ProtectedRoute>
                    } />

                    {/* Payroll Routes */}
                    <Route path="/payroll" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager']}>
                        <PayrollRouteWrapper>
                          <PayrollDashboard />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll/management" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager']}>
                        <PayrollRouteWrapper>
                          <PayrollManagement />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll/comprehensive" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager']}>
                        <PayrollRouteWrapper>
                          <ComprehensiveHRPayrollSystem />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll/pending" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}>
                        <PayrollRouteWrapper>
                          <PayrollPendingAssignments />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll/pending-assignments" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}>
                        <PayrollRouteWrapper>
                          <PayrollPendingAssignments />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll/processing" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager']}>
                        <PayrollRouteWrapper>
                          <PayrollProcessing />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll/reports" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager']}>
                        <PayrollRouteWrapper>
                          <PayrollReports />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll/audit" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <PayrollRouteWrapper>
                          <PayrollAudit />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll/policies" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager']}>
                        <PayrollRouteWrapper>
                          <PayrollPolicies />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll/workflow" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager']}>
                        <PayrollRouteWrapper>
                          <PayrollWorkflow />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="/payslip/:period" element={
                      <ProtectedRoute>
                        <PayslipView />
                      </ProtectedRoute>
                    } />
                    <Route path="/payslip/detail/:payrollId" element={
                      <ProtectedRoute>
                        <PayslipDetail />
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll/integration" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <PayrollRouteWrapper>
                          <PayrollIntegration />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll/my-salary" element={
                      <ProtectedRoute allowedRoles={['employee']}>
                        <PayrollRouteWrapper>
                          <PayrollManagement />
                        </PayrollRouteWrapper>
                      </ProtectedRoute>
                    } />

                    {/* News Routes - News Department & Admin Only */}
                    <Route path="/news" element={
                      <NewsRoute>
                        <NewsDashboard />
                      </NewsRoute>
                    } />
                    <Route path="/news/editorial-pipeline" element={
                      <NewsRoute>
                        <EditorialPipeline />
                      </NewsRoute>
                    } />
                    <Route path="/news/prompts" element={
                      <NewsRoute>
                        <PromptManagement />
                      </NewsRoute>
                    } />
                    <Route path="/news/couplet-pipeline" element={
                      <NewsRoute>
                        <CoupletPipeline />
                      </NewsRoute>
                    } />
                    <Route path="/news/couplet-prompts" element={
                      <NewsRoute>
                        <CoupletPromptManagement />
                      </NewsRoute>
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