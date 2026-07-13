import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/RouteGuards';
import React from 'react';

const FinancialMiscPage = React.lazy(() => import('../pages/FinancialMisc/FinancialMiscPage'));

export const financialMiscRoutes = (
  <>
    <Route path="/financial-misc" element={
      <ProtectedRoute allowedRoles={['admin']}>
        <FinancialMiscPage />
      </ProtectedRoute>
    } />
    <Route path="/financial-misc/report" element={
      <ProtectedRoute allowedRoles={['admin']}>
        <FinancialMiscPage readOnly={true} />
      </ProtectedRoute>
    } />
  </>
);
