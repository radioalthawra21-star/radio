import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import FinancialMiscPage from '../pages/FinancialMisc/FinancialMiscPage';

export const financialMiscRoutes = (
  <>
    <Route path="/financial-misc" element={
      <ProtectedRoute allowedRoles={['admin', 'manager', 'hr', 'employee']}>
        <FinancialMiscPage />
      </ProtectedRoute>
    } />
    <Route path="/financial-misc/report" element={
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <FinancialMiscPage readOnly={true} />
      </ProtectedRoute>
    } />
  </>
);
