import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, HrDeptRoute } from '../components/RouteGuards';
import React from 'react';

const AllEmployees = React.lazy(() => import('../pages/Admin/AllEmployees'));
const AllReports = React.lazy(() => import('../pages/Admin/AllReports'));
const AttendanceReports = React.lazy(() => import('../pages/reports/AttendanceReports'));
const LeaveReports = React.lazy(() => import('../pages/reports/LeaveReports'));
const DepartmentReportView = React.lazy(() => import('../pages/reports/DepartmentReports'));
const RecruitmentReportsPage = React.lazy(() => import('../pages/reports/RecruitmentReports'));
const Settings = React.lazy(() => import('../pages/Admin/Settings'));
const Rankings = React.lazy(() => import('../pages/Admin/Rankings'));
const LeaveManagement = React.lazy(() => import('../pages/Admin/LeaveManagement'));
const GMApproveLeaves = React.lazy(() => import('../pages/Admin/GMApproveLeaves'));
const LeaveSettings = React.lazy(() => import('../pages/Admin/LeaveSettings'));
const AttendanceManagement = React.lazy(() => import('../pages/Admin/AttendanceManagement'));
const EmployeeAttendanceReport = React.lazy(() => import('../pages/Admin/EmployeeAttendanceReport'));
const BiometricManagement = React.lazy(() => import('../pages/Admin/BiometricManagement'));
const AuditLogs = React.lazy(() => import('../pages/Admin/AuditLogs'));
const BonusManagement = React.lazy(() => import('../components/BonusManagement'));
const HolidayManagement = React.lazy(() => import('../pages/Admin/HolidayManagement'));
const ManagerEvaluationDashboard = React.lazy(() => import('../pages/ManagerEvaluationDashboard'));
const WellBeingDashboard = React.lazy(() => import('../pages/WellBeingDashboard'));
const DepartmentReports = React.lazy(() => import('../pages/Manager/DepartmentReports'));
const RecruitmentPerformanceManagement = React.lazy(() => import('../pages/RecruitmentPerformanceManagement'));
const EmployeeProfilePage = React.lazy(() => import('../pages/Admin/EmployeeProfilePage'));
const TempSupervisorPage = React.lazy(() => import('../pages/Admin/TempSupervisorPage'));
const DailyReportsDashboard = React.lazy(() => import('../pages/Admin/DailyReportsDashboard'));
const DailyReportDetail = React.lazy(() => import('../pages/Admin/DailyReportDetail'));

export const adminRoutes = (
  <>
    
    <Route path="/admin/employees" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr', 'office_manager']}><AllEmployees /></ProtectedRoute>} />
    <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AllReports /></ProtectedRoute>} />
    <Route path="/admin/reports/attendance" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><AttendanceReports /></ProtectedRoute>} />
    <Route path="/admin/reports/leave" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><LeaveReports /></ProtectedRoute>} />
    <Route path="/admin/reports/department" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><DepartmentReportView /></ProtectedRoute>} />
    <Route path="/admin/reports/recruitment" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><RecruitmentReportsPage /></ProtectedRoute>} />
    <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
    <Route path="/admin/rankings" element={<ProtectedRoute allowedRoles={['admin']}><Rankings /></ProtectedRoute>} />
    <Route path="/admin/leave-management" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><LeaveManagement /></ProtectedRoute>} />
    <Route path="/admin/gm-approve-leaves" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><GMApproveLeaves /></ProtectedRoute>} />
    <Route path="/admin/leave-settings" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><LeaveSettings /></ProtectedRoute>} />
    <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><AttendanceManagement /></ProtectedRoute>} />
    <Route path="/admin/employee-attendance-report" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><Navigate to="/admin/attendance" replace /></ProtectedRoute>} />
    <Route path="/biometric" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><BiometricManagement /></ProtectedRoute>} />
    <Route path="/admin/attendance/employee/:employeeId" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><EmployeeAttendanceReport /></ProtectedRoute>} />
    <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
    <Route path="/admin/recruitment" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><RecruitmentPerformanceManagement /></ProtectedRoute>} />
    <Route path="/admin/bonuses" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'hr']}><BonusManagement /></ProtectedRoute>} />
    <Route path="/admin/manager-evaluation" element={<ProtectedRoute allowedRoles={['admin']}><ManagerEvaluationDashboard /></ProtectedRoute>} />
    <Route path="/admin/well-being" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><WellBeingDashboard /></ProtectedRoute>} />
    <Route path="/manager/reports" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><DepartmentReports /></ProtectedRoute>} />
    <Route path="/manager/bonus" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><BonusManagement /></ProtectedRoute>} />
    <Route path="/admin/employee-profile/:id" element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}><EmployeeProfilePage /></ProtectedRoute>} />
    <Route path="/admin/holidays" element={<HrDeptRoute><HolidayManagement /></HrDeptRoute>} />
    <Route path="/admin/supervisor" element={<HrDeptRoute><TempSupervisorPage /></HrDeptRoute>} />
    <Route path="/admin/daily-reports" element={<ProtectedRoute allowedRoles={['admin', 'developer', 'hr']}><DailyReportsDashboard /></ProtectedRoute>} />
    <Route path="/admin/daily-report/:id" element={<ProtectedRoute allowedRoles={['admin', 'developer', 'hr']}><DailyReportDetail /></ProtectedRoute>} />

  </>
);
