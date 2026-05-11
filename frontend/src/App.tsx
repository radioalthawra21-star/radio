import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import { AuthProvider, ProtectedRoute, NewsRoute } from './context/AuthContext';
import { PayrollRouteWrapper } from './context/PayrollWrapper';
import './styles/global.css';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const EmployeeDashboard = lazy(() => import('./pages/Employee/EmployeeDashboard'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const ManagerDashboard = lazy(() => import('./pages/Manager/ManagerDashboard'));
const EmployeeListPage = lazy(() => import('./features/employee/pages/EmployeeList'));
const AttendancePage = lazy(() => import('./pages/Employee/Attendance'));
const LeaveManagementPage = lazy(() => import('./pages/Employee/LeaveRequest'));
const WellBeingCheckInPage = lazy(() => import('./pages/WellBeingCheckIn'));
const WellBeingDashboardPage = lazy(() => import('./pages/WellBeingDashboard'));
const ManagerEvaluationPage = lazy(() => import('./pages/ManagerEvaluation'));
const ManagerEvaluationDashboard = lazy(() => import('./pages/ManagerEvaluationDashboard'));
const MyTasks = lazy(() => import('./pages/Employee/MyTasks'));
const AddTask = lazy(() => import('./pages/Employee/AddTask'));
const TaskHistory = lazy(() => import('./pages/Employee/TaskHistory'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const EmployeeProfile = lazy(() => import('./features/employee/pages/EmployeeProfile'));
const ChangePassword = lazy(() => import('./pages/Employee/ChangePassword'));
const DocumentManagement = lazy(() => import('./features/employee/pages/DocumentManagement'));
const Messages = lazy(() => import('./pages/messages/Messages'));

// Payroll Pages
const PayrollManagement = lazy(() => import('./pages/PayrollManagement'));
const PayrollDashboard = lazy(() => import('./pages/PayrollDashboard'));
const PayslipView = lazy(() => import('./pages/Payroll/PayslipView'));
const PayslipDetail = lazy(() => import('./pages/Payroll/PayslipDetail'));
const PayrollWorkflow = lazy(() => import('./pages/PayrollWorkflow'));
const PayrollPolicies = lazy(() => import('./pages/PayrollPolicies'));
const PayrollAudit = lazy(() => import('./pages/PayrollAudit'));
const PayrollIntegration = lazy(() => import('./pages/PayrollIntegration'));
const PayrollReports = lazy(() => import('./pages/PayrollReports'));
const PayrollProcessing = lazy(() => import('./pages/PayrollProcessing'));
const PayrollPendingAssignments = lazy(() => import('./pages/PayrollPendingAssignments'));

// Admin Pages
const AuditLogs = lazy(() => import('./pages/Admin/AuditLogs'));
const AllReports = lazy(() => import('./pages/Admin/AllReports'));
const Settings = lazy(() => import('./pages/Admin/Settings'));
const Rankings = lazy(() => import('./pages/Admin/Rankings'));

// Manager Pages
const AssignTasks = lazy(() => import('./pages/Manager/AssignTasks'));
const EvaluateTasks = lazy(() => import('./pages/Manager/EvaluateTasks'));
const DepartmentReports = lazy(() => import('./pages/Manager/DepartmentReports'));

// News Pages
const NewsDashboard = lazy(() => import('./pages/News/NewsDashboard'));
const EditorialPipeline = lazy(() => import('./pages/News/EditorialPipeline'));
const PromptManagement = lazy(() => import('./pages/News/PromptManagement'));

// Shared Pages
const WorkflowManagement = lazy(() => import('./pages/WorkflowManagement'));
const PoliciesProcedures = lazy(() => import('./pages/PoliciesProcedures'));
const InternalControlsAudit = lazy(() => import('./pages/InternalControlsAudit'));
const TechnicalIntegrationPanel = lazy(() => import('./pages/TechnicalIntegrationPanel'));
const ReportsAnalytics = lazy(() => import('./pages/ReportsAnalytics'));
const PayrollProcessingInterface = lazy(() => import('./pages/PayrollProcessingInterface'));

// Auth Pages
const NotAuthorized = lazy(() => import('./pages/Auth/NotAuthorized'));

// Components
const BonusManagement = lazy(() => import('./components/BonusManagement'));

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/not-authorized" element={
            <ProtectedRoute>
              <NotAuthorized />
            </ProtectedRoute>
          } />
          
          {/* Protected Routes - Require Authentication */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            {/* Dashboard Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employee-dashboard" element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/manager/dashboard" element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <ManagerDashboard />
              </ProtectedRoute>
            } />
            
            {/* Tasks */}
            <Route path="/tasks" element={
              <ProtectedRoute>
                <MyTasks />
              </ProtectedRoute>
            } />
            <Route path="/tasks/add" element={
              <ProtectedRoute allowedRoles={['employee', 'manager']}>
                <AddTask />
              </ProtectedRoute>
            } />
            <Route path="/tasks/history" element={
              <ProtectedRoute>
                <TaskHistory />
              </ProtectedRoute>
            } />
            <Route path="/tasks/:id" element={
              <ProtectedRoute>
                <TaskDetail />
              </ProtectedRoute>
            } />
            
            {/* Profile */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <EmployeeProfile />
              </ProtectedRoute>
            } />
            <Route path="/change-password" element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            } />
            
            {/* Employees */}
            <Route path="/employees" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <EmployeeListPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/employees" element={
              <ProtectedRoute allowedRoles={['admin', 'general_manager', 'super_admin', 'manager']}>
                <EmployeeListPage />
              </ProtectedRoute>
            } />
            
            {/* Attendance */}
            <Route path="/attendance" element={
              <ProtectedRoute>
                <AttendancePage />
              </ProtectedRoute>
            } />
            <Route path="/admin/attendance" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AttendancePage />
              </ProtectedRoute>
            } />
            
            {/* Leave Management */}
            <Route path="/leave-management" element={
              <ProtectedRoute>
                <LeaveManagementPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/leave-management" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LeaveManagementPage />
              </ProtectedRoute>
            } />
            
            {/* Well-being */}
            <Route path="/well-being" element={
              <ProtectedRoute>
                <WellBeingCheckInPage />
              </ProtectedRoute>
            } />
            <Route path="/well-being/dashboard" element={
              <ProtectedRoute>
                <WellBeingDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/well-being" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <WellBeingDashboardPage />
              </ProtectedRoute>
            } />
            
            {/* Manager Evaluation */}
            <Route path="/manager-evaluation" element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <ManagerEvaluationPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/manager-evaluation" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ManagerEvaluationPage />
              </ProtectedRoute>
            } />
            <Route path="/manager-evaluation-dashboard" element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <ManagerEvaluationDashboard />
              </ProtectedRoute>
            } />
            
            {/* Employee Payslip */}
            <Route path="/payslip" element={
              <ProtectedRoute allowedRoles={['employee', 'manager', 'admin']}>
                <PayrollRouteWrapper>
                  <PayslipView />
                </PayrollRouteWrapper>
              </ProtectedRoute>
            } />
            <Route path="/payslip/:payrollId" element={
              <ProtectedRoute allowedRoles={['employee', 'manager', 'admin']}>
                <PayrollRouteWrapper>
                  <PayslipDetail />
                </PayrollRouteWrapper>
              </ProtectedRoute>
            } />

            {/* Payroll Routes - Individual Employee View */}
            <Route path="/employee/payroll" element={
              <ProtectedRoute allowedRoles={['employee']}>
                <PayrollRouteWrapper>
                  <PayrollManagement />
                </PayrollRouteWrapper>
              </ProtectedRoute>
            } />

             {/* Payroll Routes - Admin/Manager */}
             <Route path="/payroll" element={
               <ProtectedRoute allowedRoles={['admin', 'manager']}>
                 <PayrollRouteWrapper>
                   <PayrollManagement />
                 </PayrollRouteWrapper>
               </ProtectedRoute>
             } />
             <Route path="/payroll/pending-assignments" element={
               <ProtectedRoute allowedRoles={['admin', 'manager']}>
                 <PayrollRouteWrapper>
                   <PayrollPendingAssignments />
                 </PayrollRouteWrapper>
               </ProtectedRoute>
             } />
             <Route path="/payroll/dashboard" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <PayrollRouteWrapper>
                  <PayrollDashboard />
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
            <Route path="/payroll/policies" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PayrollRouteWrapper>
                  <PayrollPolicies />
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
            <Route path="/payroll/integration" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PayrollRouteWrapper>
                  <PayrollIntegration />
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
            <Route path="/payroll/processing" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <PayrollRouteWrapper>
                  <PayrollProcessing />
                </PayrollRouteWrapper>
              </ProtectedRoute>
            } />
            
            {/* Documents */}
            <Route path="/documents" element={
              <ProtectedRoute>
                <DocumentManagement />
              </ProtectedRoute>
            } />
            
            {/* Messages */}
            <Route path="/messages" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin/audit-logs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AuditLogs />
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
            
            {/* Bonus */}
            <Route path="/bonus" element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <BonusManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/bonuses" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <BonusManagement />
              </ProtectedRoute>
            } />
            
            {/* Recruitment Performance */}
            <Route path="/recruitment-performance" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <TaskDetail />
              </ProtectedRoute>
            } />
            
            {/* Original Routes (for backward compatibility) */}
            <Route path="/workflow" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <WorkflowManagement />
              </ProtectedRoute>
            } />
            <Route path="/policies" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <PoliciesProcedures />
              </ProtectedRoute>
            } />
            <Route path="/audit" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <InternalControlsAudit />
              </ProtectedRoute>
            } />
            <Route path="/integrations" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TechnicalIntegrationPanel />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <ReportsAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/payroll-processing" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <PayrollProcessingInterface />
              </ProtectedRoute>
            } />
            
            {/* News Department Routes */}
            <Route path="/news" element={
              <NewsRoute allowedRoles={['employee', 'manager', 'admin']}>
                <NewsDashboard />
              </NewsRoute>
            } />
            <Route path="/news/editorial-pipeline" element={
              <NewsRoute allowedRoles={['employee', 'manager', 'admin']}>
                <EditorialPipeline />
              </NewsRoute>
            } />
            <Route path="/news/prompts" element={
              <NewsRoute allowedRoles={['employee', 'manager', 'admin']}>
                <PromptManagement />
              </NewsRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;