import { Route } from 'react-router-dom';
import { NewsRoute } from '../components/RouteGuards';
import React from 'react';

const NewsDashboard = React.lazy(() => import('../pages/News/NewsDashboard'));
const EditorialPipeline = React.lazy(() => import('../pages/News/EditorialPipeline'));
const CoupletPipeline = React.lazy(() => import('../pages/News/CoupletPipeline'));
const PromptManagement = React.lazy(() => import('../pages/News/PromptManagement'));
const CoupletPromptManagement = React.lazy(() => import('../pages/News/CoupletPromptManagement'));

export const newsRoutes = (
  <>
    <Route path="/news" element={<NewsRoute><NewsDashboard /></NewsRoute>} />
    <Route path="/news/editorial-pipeline" element={<NewsRoute><EditorialPipeline /></NewsRoute>} />
    <Route path="/news/prompts" element={<NewsRoute allowedRoles={['admin', 'manager']}><PromptManagement /></NewsRoute>} />
    <Route path="/news/couplet-pipeline" element={<NewsRoute><CoupletPipeline /></NewsRoute>} />
    <Route path="/news/couplet-prompts" element={<NewsRoute allowedRoles={['admin', 'manager']}><CoupletPromptManagement /></NewsRoute>} />
  </>
);
