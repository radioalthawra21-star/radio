import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import Messages from '../pages/Messages';
import ChatPage from '../pages/Chat/ChatPage';
import ManagerEvaluation from '../pages/ManagerEvaluation';
import WellBeingCheckIn from '../pages/WellBeingCheckIn';
import ChangePassword from '../pages/Employee/ChangePassword';
import Attendance from '../pages/Employee/Attendance';
import MonthlyTimesheet from '../pages/Employee/MonthlyTimesheet';
import LeaveRequest from '../pages/Employee/LeaveRequest';
import ApproveLeaves from '../pages/Manager/ApproveLeaves';

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
  </>
);
