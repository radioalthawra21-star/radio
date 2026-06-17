import { useEffect } from 'react';

function getBackendUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;
  if (import.meta.env.PROD) return 'https://cc-backend-2ogh.onrender.com';
  return 'http://127.0.0.1:3000';
}

const TempSupervisor = () => {
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      const backendUrl = getBackendUrl();
      const url = `${backendUrl}/supervisor/supervisor.html?token=${encodeURIComponent(token)}`;
      window.open(url, '_blank');
      window.history.back();
    }
  }, [token]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', color: '#8b8fa3', flexDirection: 'column', gap: '16px'
    }}>
      <div style={{ fontSize: '48px' }}>🔄</div>
      <p>جاري فتح لوحة Temp-Supervisor في نافذة جديدة...</p>
      {!token && <p style={{ color: '#ef4444' }}>⚠️ يجب تسجيل الدخول أولاً</p>}
    </div>
  );
};

export default TempSupervisor;
