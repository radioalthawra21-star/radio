import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';

const APP_LOGO_KEY = 'appLogo';
const APP_NAME_KEY = 'appName';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appLogo, setAppLogo] = useState(null);
  const [appName, setAppName] = useState(null);

  useEffect(() => {
    const logo = localStorage.getItem(APP_LOGO_KEY);
    const name = localStorage.getItem(APP_NAME_KEY);
    if (logo) setAppLogo(logo);
    if (name) setAppName(name);

    const handleStorageChange = () => {
      const logo = localStorage.getItem(APP_LOGO_KEY);
      const name = localStorage.getItem(APP_NAME_KEY);
      setAppLogo(logo || null);
      setAppName(name || null);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appBrandingUpdate', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appBrandingUpdate', handleStorageChange);
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanData = {
        username: formData.username.trim(),
        password: formData.password
      };

      const response = await login(cleanData);

      const success =
        response?.success || response?.data?.success;

      if (!success) {
        setError(response?.message || 'فشل تسجيل الدخول');
        return;
      }

      const user = response?.data?.user;

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', response?.data?.token);

      navigate('/', { replace: true });

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'حدث خطأ في تسجيل الدخول';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const displayName = appName || 'راديو الثورة';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {appLogo ? (
            <img src={appLogo} alt="Logo" className="w-20 h-20 mx-auto mb-4" />
          ) : (
            <img src="/logo.png" alt="Logo" className="w-20 h-20 mx-auto mb-4" />
          )}
          <h1 className="text-3xl font-bold text-dark">{displayName}</h1>
          <p className="text-gray-600 mt-2">تسجيل الدخول إلى حسابك</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-error/10 border border-error text-error p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="label">اسم المستخدم</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input"
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>

            <div className="mb-6">
              <label className="label">كلمة المرور</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input"
                placeholder="أدخل كلمة المرور"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></span>
                  جاري التسجيل...
                </span>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              ليس لديك حساب؟{' '}
              <Link to="/register" className="text-interactive hover:underline font-semibold">
                إنشاء حساب جديد
              </Link>
            </p>
          </div>

          <div className="mt-4 p-3 bg-info/10 rounded-lg">
            <p className="text-sm text-dark font-semibold mb-2">بيانات الدخول للتجربة:</p>
            <p className="text-sm text-gray-600">المدير العام: admin / admin</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;