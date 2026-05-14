import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import MyTasks from '../pages/Employee/MyTasks';
import AddTask from '../pages/Employee/AddTask';
import TaskHistory from '../pages/Employee/TaskHistory';
import AssignTasks from '../pages/Manager/AssignTasks';
import EvaluateTasks from '../pages/Manager/EvaluateTasks';
import TaskDetail from '../pages/TaskDetail';

export const taskRoutes = (
  <>
    <Route path="/my-tasks" element={<ProtectedRoute allowedRoles={['employee']}><MyTasks /></ProtectedRoute>} />
    <Route path="/add-task" element={<ProtectedRoute allowedRoles={['employee', 'manager']}><AddTask /></ProtectedRoute>} />
    <Route path="/task-history" element={<ProtectedRoute allowedRoles={['employee']}><TaskHistory /></ProtectedRoute>} />
    <Route path="/manager/assign-tasks" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><AssignTasks /></ProtectedRoute>} />
    <Route path="/manager/evaluate-tasks" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><EvaluateTasks /></ProtectedRoute>} />
    <Route path="/admin/assign-tasks" element={<ProtectedRoute allowedRoles={['admin']}><AssignTasks /></ProtectedRoute>} />
    <Route path="/task/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
  </>
);
