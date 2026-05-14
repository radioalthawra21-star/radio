import { Route } from 'react-router-dom';
import DeveloperPanel from '../pages/Developer/DeveloperPanel';
import AlertsPanel from '../pages/Developer/AlertsPanel';
import ResourceMonitor from '../pages/Developer/ResourceMonitor';
import VisitorMonitor from '../pages/Developer/VisitorMonitor';

export const developerRoutes = (
  <>
    <Route path="/developer" element={<DeveloperPanel />} />
    <Route path="/developer/alerts" element={<AlertsPanel />} />
    <Route path="/developer/resources" element={<ResourceMonitor />} />
    <Route path="/developer/visitors" element={<VisitorMonitor />} />
  </>
);
