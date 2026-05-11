// App.tsx dependent component type declarations
// These provide TypeScript type safety for JSX components imported into TSX files

import React from 'react';

// Dashboard
export { default as Dashboard } from './pages/Dashboard';

// Auth pages
export { default as Login } from './pages/Auth/Login';
export { default as Register } from './pages/Auth/Register';

// Employee pages
export { default as EmployeeDashboard } from './pages/Employee/EmployeeDashboard';
export { default as AttendancePage } from './pages/Employee/Attendance';
export { default as LeaveManagementPage } from './pages/Employee/LeaveRequest';

// Well-being pages
export { default as WellBeingCheckInPage } from './pages/WellBeingCheckIn';
export { default as WellBeingDashboardPage } from './pages/WellBeingDashboard';

// Manager Evaluation pages
export { default as ManagerEvaluationPage } from './pages/ManagerEvaluation';
export { default as ManagerEvaluationDashboard } from './pages/ManagerEvaluationDashboard';

// Task pages
export { default as MyTasks } from './pages/Employee/MyTasks';
export { default as AddTask } from './pages/Employee/AddTask';
export { default as TaskHistory } from './pages/Employee/TaskHistory';
export { default as TaskDetail } from './pages/TaskDetail';

// Employee pages (features)
export { default as EmployeeProfile } from './features/employee/pages/EmployeeProfile';
export { default as ChangePassword } from './pages/Employee/ChangePassword';
export { default as DocumentManagement } from './features/employee/pages/DocumentManagement';

// Messages
export { default as Messages } from './pages/messages/Messages';

// Payroll pages
export { default as PayrollManagement } from './pages/PayrollManagement';
export { default as PayrollDashboard } from './pages/PayrollDashboard';
export { default as PayrollWorkflow } from './pages/PayrollWorkflow';
export { default as PayrollPolicies } from './pages/PayrollPolicies';
export { default as PayrollAudit } from './pages/PayrollAudit';
export { default as PayrollIntegration } from './pages/PayrollIntegration';
export { default as PayrollReports } from './pages/PayrollReports';
export { default as PayrollProcessing } from './pages/PayrollProcessing';

// Admin pages
export { default as AuditLogs } from './pages/Admin/AuditLogs';
export { default as AllReports } from './pages/Admin/AllReports';
export { default as Settings } from './pages/Admin/Settings';
export { default as Rankings } from './pages/Admin/Rankings';

// Manager pages
export { default as AssignTasks } from './pages/Manager/AssignTasks';
export { default as EvaluateTasks } from './pages/Manager/EvaluateTasks';
export { default as DepartmentReports } from './pages/Manager/DepartmentReports';

// Admin pages
export { default as EmployeeListPage } from './features/employee/pages/EmployeeList';

// Components
export { default as BonusManagement } from './components/BonusManagement';