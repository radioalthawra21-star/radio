import { useState, useEffect } from 'react';
import WellBeingBanner from './WellBeingBanner';
import NotificationPanel from './NotificationPanel';
import UserMenu from './UserMenu';

const APP_LOGO_KEY = 'appLogo';
const APP_NAME_KEY = 'appName';

const Navbar = ({ user, onLogout, onToggleSidebar }) => {
  const [appLogo, setAppLogo] = useState(null);
  const [appName, setAppName] = useState(null);

  useEffect(() => {
    const logo = localStorage.getItem(APP_LOGO_KEY);
    const name = localStorage.getItem(APP_NAME_KEY);
    if (logo) setAppLogo(logo);
    if (name) setAppName(name);
    const handleStorageChange = () => {
      setAppLogo(localStorage.getItem(APP_LOGO_KEY) || null);
      setAppName(localStorage.getItem(APP_NAME_KEY) || null);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appBrandingUpdate', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appBrandingUpdate', handleStorageChange);
    };
  }, []);

  const displayName = appName || 'راديو الثورة';

  return (
    <>
      <WellBeingBanner />
      <nav className="bg-white shadow-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onToggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            {appLogo ? (
              <img src={appLogo} alt="Logo" className="h-10 w-auto" />
            ) : (
              <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
            )}
            <h2 className="text-xl font-bold text-dark">{displayName}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <NotificationPanel />
          <UserMenu user={user} onLogout={onLogout} />
        </div>
      </nav>
    </>
  );
};

export default Navbar;
