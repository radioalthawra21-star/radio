import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import { PayrollRouteWrapper } from '../context/PayrollWrapper';
import React from 'react';

const PayrollManagement = React.lazy(() => import('../pages/Payroll/PayrollManagement'));
const PayrollPendingAssignments = React.lazy(() => import('../pages/PayrollPendingAssignments'));
const PayrollDashboard = React.lazy(() => import('../pages/PayrollDashboard'));
const PayrollProcessing = React.lazy(() => import('../pages/PayrollProcessing'));
const PayrollAudit = React.lazy(() => import('../pages/PayrollAudit'));
const PayrollWorkflow = React.lazy(() => import('../pages/PayrollWorkflow'));
const PayrollIntegration = React.lazy(() => import('../pages/PayrollIntegration'));
const PayslipView = React.lazy(() => import('../pages/Payroll/PayslipView'));
const PayslipDetail = React.lazy(() => import('../pages/Payroll/PayslipDetail'));
const ComprehensiveHRPayrollSystem = React.lazy(() => import('../pages/Payroll/ComprehensiveHRPayrollSystem'));

const PW = PayrollRouteWrapper;

export const payrollRoutes = (
  <>
    <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><PW><PayrollDashboard /></PW></ProtectedRoute>} />
    <Route path="/payroll/management" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><PW><PayrollManagement /></PW></ProtectedRoute>} />
    <Route path="/payroll/comprehensive" element={<ProtectedRoute allowedRoles={['admin']}><PW><ComprehensiveHRPayrollSystem /></PW></ProtectedRoute>} />
    <Route path="/payroll/pending" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><PW><PayrollPendingAssignments /></PW></ProtectedRoute>} />
    <Route path="/payroll/pending-assignments" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><PW><PayrollPendingAssignments /></PW></ProtectedRoute>} />
    <Route path="/payroll/processing" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><PW><PayrollProcessing /></PW></ProtectedRoute>} />
    <Route path="/payroll/workflow" element={<ProtectedRoute allowedRoles={['admin']}><PW><PayrollWorkflow /></PW></ProtectedRoute>} />
    <Route path="/payroll/integration" element={<ProtectedRoute allowedRoles={['admin']}><PW><PayrollIntegration /></PW></ProtectedRoute>} />

    <Route path="/payslip/:period" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><PayslipView /></ProtectedRoute>} />
    <Route path="/payslip/detail/:payrollId" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><PayslipDetail /></ProtectedRoute>} />
  </>
);
