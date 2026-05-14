import { Route } from 'react-router-dom';
import { NewsRoute } from '../components/RouteGuards';
import NewsDashboard from '../pages/News/NewsDashboard';
import EditorialPipeline from '../pages/News/EditorialPipeline';
import CoupletPipeline from '../pages/News/CoupletPipeline';
import PromptManagement from '../pages/News/PromptManagement';
import CoupletPromptManagement from '../pages/News/CoupletPromptManagement';

export const newsRoutes = (
  <>
    <Route path="/news" element={<NewsRoute><NewsDashboard /></NewsRoute>} />
    <Route path="/news/editorial-pipeline" element={<NewsRoute><EditorialPipeline /></NewsRoute>} />
    <Route path="/news/prompts" element={<NewsRoute><PromptManagement /></NewsRoute>} />
    <Route path="/news/couplet-pipeline" element={<NewsRoute><CoupletPipeline /></NewsRoute>} />
    <Route path="/news/couplet-prompts" element={<NewsRoute><CoupletPromptManagement /></NewsRoute>} />
  </>
);
