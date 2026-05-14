import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import { PayrollRouteWrapper } from '../context/PayrollWrapper';
import PayrollManagement from '../pages/Payroll/PayrollManagement';
import PayrollPendingAssignments from '../pages/PayrollPendingAssignments';
import PayrollDashboard from '../pages/PayrollDashboard';
import PayrollProcessing from '../pages/PayrollProcessing';
import PayrollReports from '../pages/PayrollReports';
import PayrollAudit from '../pages/PayrollAudit';
import PayrollPolicies from '../pages/PayrollPolicies';
import PayrollWorkflow from '../pages/PayrollWorkflow';
import PayrollIntegration from '../pages/PayrollIntegration';
import PayslipView from '../pages/Payroll/PayslipView';
import PayslipDetail from '../pages/Payroll/PayslipDetail';
import ComprehensiveHRPayrollSystem from '../pages/Payroll/ComprehensiveHRPayrollSystem';
import MySalary from '../pages/Payroll/MySalary';

const PW = PayrollRouteWrapper;

export const payrollRoutes = (
  <>
    <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PW><PayrollDashboard /></PW></ProtectedRoute>} />
    <Route path="/payroll/management" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PW><PayrollManagement /></PW></ProtectedRoute>} />
    <Route path="/payroll/comprehensive" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PW><ComprehensiveHRPayrollSystem /></PW></ProtectedRoute>} />
    <Route path="/payroll/pending" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><PW><PayrollPendingAssignments /></PW></ProtectedRoute>} />
    <Route path="/payroll/pending-assignments" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'hr']}><PW><PayrollPendingAssignments /></PW></ProtectedRoute>} />
    <Route path="/payroll/processing" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PW><PayrollProcessing /></PW></ProtectedRoute>} />
    <Route path="/payroll/reports" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PW><PayrollReports /></PW></ProtectedRoute>} />
    <Route path="/payroll/audit" element={<ProtectedRoute allowedRoles={['admin']}><PW><PayrollAudit /></PW></ProtectedRoute>} />
    <Route path="/payroll/policies" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PW><PayrollPolicies /></PW></ProtectedRoute>} />
    <Route path="/payroll/workflow" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PW><PayrollWorkflow /></PW></ProtectedRoute>} />
    <Route path="/payroll/integration" element={<ProtectedRoute allowedRoles={['admin']}><PW><PayrollIntegration /></PW></ProtectedRoute>} />
    <Route path="/payroll/my-salary" element={<ProtectedRoute allowedRoles={['employee']}><MySalary /></ProtectedRoute>} />
    <Route path="/payslip/:period" element={<ProtectedRoute><PayslipView /></ProtectedRoute>} />
    <Route path="/payslip/detail/:payrollId" element={<ProtectedRoute><PayslipDetail /></ProtectedRoute>} />
  </>
);
