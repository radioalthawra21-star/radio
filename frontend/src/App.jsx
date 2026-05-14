import { TypographyProvider } from './context/TypographyContext';
import { useState, useEffect } from 'react';
import { getStoredUser, logout } from './services/authService';
import AppRoutes from './routes/AppRoutes';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }

    const storedLogo = localStorage.getItem('appLogo');
    const storedName = localStorage.getItem('appName');
    if (storedLogo) {
      document.documentElement.style.setProperty('--app-logo', storedLogo);
    }
    if (storedName) {
      document.documentElement.style.setProperty('--app-name', storedName);
      document.title = storedName;
    }

    setLoading(false);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <TypographyProvider>
      <AppRoutes user={user} onLogout={handleLogout} />
    </TypographyProvider>
  );
}

export default App;
