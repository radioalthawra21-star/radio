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
      <nav className="bg-white shadow-md px-3 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button onClick={onToggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0" aria-label="فتح القائمة">
            <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {appLogo ? (
              <img src={appLogo} alt="Logo" className="h-8 md:h-10 w-auto flex-shrink-0" />
            ) : (
              <img src="/logo.png" alt="Logo" className="h-8 md:h-10 w-auto flex-shrink-0" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <NotificationPanel />
          <UserMenu user={user} onLogout={onLogout} />
        </div>
      </nav>
    </>
  );
};

export default Navbar;
