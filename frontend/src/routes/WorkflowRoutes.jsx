import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import WorkflowList from '../pages/Workflow/WorkflowList';
import WorkflowForm from '../pages/Workflow/WorkflowForm';
import WorkflowTaskCreate from '../pages/Workflow/WorkflowTaskCreate';
import KanbanBoard from '../pages/Workflow/KanbanBoard';
import EmployeeWorkflowTasks from '../pages/Workflow/EmployeeWorkflowTasks';
import StageApproval from '../pages/Workflow/StageApproval';
import WorkflowDashboard from '../pages/Workflow/WorkflowDashboard';
import WorkflowTaskDetail from '../pages/Workflow/WorkflowTaskDetail';

export const workflowRoutes = (
  <>
    <Route path="/workflows" element={<ProtectedRoute><WorkflowList /></ProtectedRoute>} />
    <Route path="/workflows/new" element={<ProtectedRoute><WorkflowForm /></ProtectedRoute>} />
    <Route path="/workflows/:id" element={<ProtectedRoute><WorkflowForm /></ProtectedRoute>} />
    <Route path="/workflows/create-task/:workflowId" element={<ProtectedRoute><WorkflowTaskCreate /></ProtectedRoute>} />
    <Route path="/kanban" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><KanbanBoard /></ProtectedRoute>} />
    <Route path="/workflow/tasks/mine" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><EmployeeWorkflowTasks /></ProtectedRoute>} />
    <Route path="/workflow/stage-approval" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><StageApproval /></ProtectedRoute>} />
    <Route path="/workflow/dashboard" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><WorkflowDashboard /></ProtectedRoute>} />
    <Route path="/workflow/task/:id" element={<ProtectedRoute><WorkflowTaskDetail /></ProtectedRoute>} />
  </>
);
