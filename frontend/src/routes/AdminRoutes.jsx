import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import AllEmployees from '../pages/Admin/AllEmployees';
import AllReports from '../pages/Admin/AllReports';
import AttendanceReports from '../pages/reports/AttendanceReports';
import LeaveReports from '../pages/reports/LeaveReports';
import DepartmentReportView from '../pages/reports/DepartmentReports';
import RecruitmentReportsPage from '../pages/reports/RecruitmentReports';
import Settings from '../pages/Admin/Settings';
import Rankings from '../pages/Admin/Rankings';
import LeaveManagement from '../pages/Admin/LeaveManagement';
import GMApproveLeaves from '../pages/Admin/GMApproveLeaves';
import AttendanceManagement from '../pages/Admin/AttendanceManagement';
import AuditLogs from '../pages/Admin/AuditLogs';
import BonusManagement from '../components/BonusManagement';
import ManagerEvaluationDashboard from '../pages/ManagerEvaluationDashboard';
import WellBeingDashboard from '../pages/WellBeingDashboard';
import DepartmentReports from '../pages/Manager/DepartmentReports';
import RecruitmentPerformanceManagement from '../pages/RecruitmentPerformanceManagement';
import EmployeeProfilePage from '../pages/Admin/EmployeeProfilePage';

export const adminRoutes = (
  <>
    <Route path="/admin/employees" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><AllEmployees /></ProtectedRoute>} />
    <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AllReports /></ProtectedRoute>} />
    <Route path="/admin/reports/attendance" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><AttendanceReports /></ProtectedRoute>} />
    <Route path="/admin/reports/leave" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><LeaveReports /></ProtectedRoute>} />
    <Route path="/admin/reports/department" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><DepartmentReportView /></ProtectedRoute>} />
    <Route path="/admin/reports/recruitment" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><RecruitmentReportsPage /></ProtectedRoute>} />
    <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
    <Route path="/admin/rankings" element={<ProtectedRoute allowedRoles={['admin']}><Rankings /></ProtectedRoute>} />
    <Route path="/admin/leave-management" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><LeaveManagement /></ProtectedRoute>} />
    <Route path="/admin/gm-approve-leaves" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><GMApproveLeaves /></ProtectedRoute>} />
    <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><AttendanceManagement /></ProtectedRoute>} />
    <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
    <Route path="/admin/recruitment" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><RecruitmentPerformanceManagement /></ProtectedRoute>} />
    <Route path="/admin/bonuses" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'hr']}><BonusManagement /></ProtectedRoute>} />
    <Route path="/admin/manager-evaluation" element={<ProtectedRoute allowedRoles={['admin']}><ManagerEvaluationDashboard /></ProtectedRoute>} />
    <Route path="/admin/well-being" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><WellBeingDashboard /></ProtectedRoute>} />
    <Route path="/manager/reports" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><DepartmentReports /></ProtectedRoute>} />
    <Route path="/manager/bonus" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><BonusManagement /></ProtectedRoute>} />
    <Route path="/admin/employee-profile/:id" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><EmployeeProfilePage /></ProtectedRoute>} />
  </>
);
