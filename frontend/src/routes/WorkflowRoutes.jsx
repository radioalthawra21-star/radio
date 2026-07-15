import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import React from 'react';

const WorkflowList = React.lazy(() => import('../pages/Workflow/WorkflowList'));
const WorkflowForm = React.lazy(() => import('../pages/Workflow/WorkflowForm'));
const WorkflowTaskCreate = React.lazy(() => import('../pages/Workflow/WorkflowTaskCreate'));
const KanbanBoard = React.lazy(() => import('../pages/Workflow/KanbanBoard'));
const EmployeeWorkflowTasks = React.lazy(() => import('../pages/Workflow/EmployeeWorkflowTasks'));
const StageApproval = React.lazy(() => import('../pages/Workflow/StageApproval'));
const WorkflowDashboard = React.lazy(() => import('../pages/Workflow/WorkflowDashboard'));
const WorkflowTaskDetail = React.lazy(() => import('../pages/Workflow/WorkflowTaskDetail'));

export const workflowRoutes = (
  <>
    <Route path="/workflows" element={<ProtectedRoute><WorkflowList /></ProtectedRoute>} />
    <Route path="/workflows/new" element={<ProtectedRoute><WorkflowForm /></ProtectedRoute>} />
    <Route path="/workflows/:id" element={<ProtectedRoute><WorkflowForm /></ProtectedRoute>} />
    <Route path="/workflows/create-task/:workflowId" element={<ProtectedRoute><WorkflowTaskCreate /></ProtectedRoute>} />
    <Route path="/kanban" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'hr', 'general_manager']}><KanbanBoard /></ProtectedRoute>} />
    <Route path="/workflow/tasks/mine" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'hr', 'general_manager']}><EmployeeWorkflowTasks /></ProtectedRoute>} />
    <Route path="/workflow/stage-approval" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'hr', 'general_manager']}><StageApproval /></ProtectedRoute>} />
    <Route path="/workflow/dashboard" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'hr', 'general_manager']}><WorkflowDashboard /></ProtectedRoute>} />
    <Route path="/workflow/task/:id" element={<ProtectedRoute><WorkflowTaskDetail /></ProtectedRoute>} />
  </>
);
