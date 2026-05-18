/**
 * Main Entry Point
 * React application bootstrap
 */

// المسار الفعّال: main.jsx → App.jsx
// ملاحظة: يوجد App.tsx كمرجع للمستقبل (يتطلب lazy loading ومسارات مختلفة)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { SocketProvider } from './context/SocketContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SocketProvider>
        <App />
      </SocketProvider>
    </BrowserRouter>
  </React.StrictMode>
);
