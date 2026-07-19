import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import React from 'react';

const Messages = React.lazy(() => import('../pages/Messages'));
const ChatPage = React.lazy(() => import('../pages/Chat/ChatPage'));
const ManagerEvaluation = React.lazy(() => import('../pages/ManagerEvaluation'));
const WellBeingCheckIn = React.lazy(() => import('../pages/WellBeingCheckIn'));
const ChangePassword = React.lazy(() => import('../pages/Employee/ChangePassword'));
const Attendance = React.lazy(() => import('../pages/Employee/Attendance'));
const MonthlyTimesheet = React.lazy(() => import('../pages/Employee/MonthlyTimesheet'));
const LeaveRequest = React.lazy(() => import('../pages/Employee/LeaveRequest'));
const ApproveLeaves = React.lazy(() => import('../pages/Manager/ApproveLeaves'));
const DailyReport = React.lazy(() => import('../pages/DailyReport'));

export const selfServiceRoutes = (
  <>
    <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
    <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
    <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
    <Route path="/evaluate-manager" element={<ProtectedRoute><ManagerEvaluation /></ProtectedRoute>} />
    <Route path="/well-being" element={<ProtectedRoute><WellBeingCheckIn /></ProtectedRoute>} />
    <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
    <Route path="/timesheet" element={<ProtectedRoute><MonthlyTimesheet /></ProtectedRoute>} />
    <Route path="/timesheet/:employeeId" element={<ProtectedRoute><MonthlyTimesheet /></ProtectedRoute>} />
    <Route path="/leave-request" element={<ProtectedRoute><LeaveRequest /></ProtectedRoute>} />
    <Route path="/manager/approve-leaves" element={<ProtectedRoute allowedRoles={['manager']}><ApproveLeaves /></ProtectedRoute>} />
    <Route path="/office-manager/approve-leaves" element={<ProtectedRoute allowedRoles={['office_manager']}><ApproveLeaves /></ProtectedRoute>} />
    <Route path="/daily-report" element={<ProtectedRoute><DailyReport /></ProtectedRoute>} />
  </>
);
