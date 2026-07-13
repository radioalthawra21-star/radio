import { Route } from 'react-router-dom';
import { PublicRoute, ProtectedRoute } from '../components/RouteGuards';
import React from 'react';

const Login = React.lazy(() => import('../pages/Auth/Login'));
const Register = React.lazy(() => import('../pages/Auth/Register'));
const NotAuthorized = React.lazy(() => import('../pages/Auth/NotAuthorized'));

export const authRoutes = (
  <>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/not-authorized" element={<ProtectedRoute><NotAuthorized /></ProtectedRoute>} />
  </>
);
