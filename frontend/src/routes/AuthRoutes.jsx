import { Route } from 'react-router-dom';
import { PublicRoute, ProtectedRoute } from '../components/RouteGuards';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import NotAuthorized from '../pages/Auth/NotAuthorized';

export const authRoutes = (
  <>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/not-authorized" element={<ProtectedRoute><NotAuthorized /></ProtectedRoute>} />
  </>
);
