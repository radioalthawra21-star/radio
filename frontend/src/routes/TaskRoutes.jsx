import { Route, Navigate, useParams } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import React from 'react';

const MyTasks = React.lazy(() => import('../pages/Employee/MyTasks'));
const AddTask = React.lazy(() => import('../pages/Employee/AddTask'));
const TaskHistory = React.lazy(() => import('../pages/Employee/TaskHistory'));
const AssignTasks = React.lazy(() => import('../pages/Manager/AssignTasks'));
const EvaluateTasks = React.lazy(() => import('../pages/Manager/EvaluateTasks'));
const TaskDetail = React.lazy(() => import('../pages/TaskDetail'));
const TaskManagement = React.lazy(() => import('../pages/Tasks/TaskManagement'));
const WorkflowTaskDetail = React.lazy(() => import('../pages/Workflow/WorkflowTaskDetail'));
const DepartmentTasks = React.lazy(() => import('../pages/Manager/DepartmentTasks'));

const TaskDetailRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/task/${id}`} replace />;
};

export const taskRoutes = (
  <>
    <Route path="/tasks" element={<ProtectedRoute><TaskManagement /></ProtectedRoute>} />
    <Route path="/my-tasks" element={<ProtectedRoute allowedRoles={['employee', 'office_manager']}><MyTasks /></ProtectedRoute>} />
    <Route path="/add-task" element={<ProtectedRoute allowedRoles={['employee', 'manager', 'office_manager']}><AddTask /></ProtectedRoute>} />
    <Route path="/task-history" element={<ProtectedRoute allowedRoles={['employee', 'office_manager']}><TaskHistory /></ProtectedRoute>} />
    <Route path="/manager/assign-tasks" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'office_manager']}><AssignTasks /></ProtectedRoute>} />
    <Route path="/manager/evaluate-tasks" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'office_manager']}><EvaluateTasks /></ProtectedRoute>} />
    <Route path="/manager/department-tasks" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'office_manager']}><DepartmentTasks /></ProtectedRoute>} />
    <Route path="/admin/assign-tasks" element={<ProtectedRoute allowedRoles={['admin']}><AssignTasks /></ProtectedRoute>} />
    <Route path="/task/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
    <Route path="/tasks/task/:id" element={<ProtectedRoute><TaskDetailRedirect /></ProtectedRoute>} />
    <Route path="/tasks/workflow-task/:id" element={<ProtectedRoute><WorkflowTaskDetail /></ProtectedRoute>} />
  </>
);
