import { Route } from 'react-router-dom';
import React from 'react';

const DeveloperPanel = React.lazy(() => import('../pages/Developer/DeveloperPanel'));
const AlertsPanel = React.lazy(() => import('../pages/Developer/AlertsPanel'));
const ResourceMonitor = React.lazy(() => import('../pages/Developer/ResourceMonitor'));
const VisitorMonitor = React.lazy(() => import('../pages/Developer/VisitorMonitor'));

export const developerRoutes = (
  <>
    <Route path="/developer" element={<DeveloperPanel />} />
    <Route path="/developer/alerts" element={<AlertsPanel />} />
    <Route path="/developer/resources" element={<ResourceMonitor />} />
    <Route path="/developer/visitors" element={<VisitorMonitor />} />
  </>
);
