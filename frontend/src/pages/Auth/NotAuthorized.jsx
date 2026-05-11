import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getStoredUser } from '../../services/authService';

const NotAuthorized = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  // Auto-redirect to home after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg text-center">
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح بالوصول</h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          عذراً، ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة.
          {user && (
            <span className="block mt-2 text-sm text-gray-500">
              دورك الحالي: <strong>{user.role === 'admin' ? 'مدير عام' : user.role === 'manager' ? `مدير ${user.department || ''}` : 'موظف'}</strong>
            </span>
          )}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
          >
            العودة للصفحة السابقة
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            العودة للرئيسية
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          ستتم إعادتك تلقائياً للرئيسية خلال 5 ثواني...
        </p>
      </div>
    </div>
  );
};

export default NotAuthorized;
