import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../services/authService';
import { getAllDepartments } from '../../services/departmentService';

const APP_LOGO_KEY = 'appLogo';
const APP_NAME_KEY = 'appName';

const Register = () => {
  const navigate = useNavigate();
  const [customDepartments, setCustomDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    confirmEmail: '',
    password: '',
    confirmPassword: '',
    department: '',
    role: 'employee'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [appLogo, setAppLogo] = useState(null);
  const [appName, setAppName] = useState(null);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await getAllDepartments();
        if (response.success) {
          setCustomDepartments(response.data.departments || []);
        }
      } catch (error) {
        console.error('Error loading departments:', error);
      } finally {
        setLoadingDepartments(false);
      }
    };
    loadDepartments();

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

    const { name, username, email, confirmEmail, password, confirmPassword, department, role } = formData;

    const cleanEmail = email.trim();
    const cleanUsername = username.trim();

    if (!department) {
      setError('يرجى اختيار القسم');
      setLoading(false);
      return;
    }

    if (cleanEmail !== confirmEmail.trim()) {
      setError('البريد الإلكتروني وتأكيده غير متطابقين');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمة المرور وتأكيدها غير متطابقتين');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
      setLoading(false);
      return;
    }

    try {
      const response = await register({
        name,
        username: cleanUsername,
        email: cleanEmail,
        password,
        confirmPassword: confirmPassword,
        department,
        role
      });

      if (response?.success || response?.data?.success) {
        setSuccess('تم التسجيل بنجاح! يرجى انتظار تفعيل حسابك من المدير العام.');
        setFormData({
          name: '',
          username: '',
          email: '',
          confirmEmail: '',
          password: '',
          confirmPassword: '',
          department: '',
          role: 'employee'
        });
      } else {
        setError(response?.message || 'فشل التسجيل');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ في التسجيل');
    } finally {
      setLoading(false);
    }
  };

  const displayName = appName || 'راديو Revolution';

  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          {appLogo ? (
            <img src={appLogo} alt='Logo' className='h-24 mx-auto mb-4' />
          ) : (
            <img src='/logo.png' alt='Logo' className='h-24 mx-auto mb-4' />
          )}
          <h1 className='text-3xl font-bold text-dark'>{displayName}</h1>
          <p className='text-gray-600 mt-2'>إنشاء حساب جديد</p>
        </div>

        <div className='card'>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className='bg-error/10 border border-error text-error p-3 rounded-lg mb-4'>
                {error}
              </div>
            )}

            {success && (
              <div className='bg-success/10 border border-success text-success p-3 rounded-lg mb-4'>
                {success}
              </div>
            )}

            <div className='mb-4'>
              <label className='label'>الاسم الكامل</label>
              <input
                type='text'
                name='name'
                value={formData.name}
                onChange={handleChange}
                className='input'
                placeholder='أدخل اسمك الكامل'
                required
              />
            </div>

            <div className='mb-4'>
              <label className='label'>اسم المستخدم</label>
              <input
                type='text'
                name='username'
                value={formData.username}
                onChange={handleChange}
                className='input'
                placeholder='أدخل اسم المستخدم'
                required
              />
            </div>

            <div className='mb-4'>
              <label className='label'>البريد الإلكتروني</label>
              <input
                type='email'
                name='email'
                value={formData.email}
                onChange={handleChange}
                className='input'
                placeholder='أدخل بريدك الإلكتروني'
                required
              />
            </div>

            <div className='mb-4'>
              <label className='label'>تأكيد البريد الإلكتروني</label>
              <input
                type='email'
                name='confirmEmail'
                value={formData.confirmEmail}
                onChange={handleChange}
                className='input'
                placeholder='أدخل بريدك الإلكتروني مرة أخرى'
                required
              />
            </div>

            <div className='mb-4'>
              <label className='label'>كلمة المرور</label>
              <input
                type='password'
                name='password'
                value={formData.password}
                onChange={handleChange}
                className='input'
                placeholder='أدخل كلمة المرور (6 أحرف على الأقل)'
                required
              />
            </div>

            <div className='mb-6'>
              <label className='label'>تأكيد كلمة المرور</label>
              <input
                type='password'
                name='confirmPassword'
                value={formData.confirmPassword}
                onChange={handleChange}
                className='input'
                placeholder='أدخل كلمة المرور مرة أخرى'
                required
              />
            </div>

            <div className='mb-4'>
              <label className='label'>القسم</label>
              {loadingDepartments ? (
                <div className="input flex items-center justify-center py-2">جاري تحميل الأقسام...</div>
              ) : (
                <select
                  name='department'
                  value={formData.department}
                  onChange={handleChange}
                  className='input flex-1'
                  required
                >
                  <option value=''>اختر القسم</option>
                  <option value='production'>الإنتاج</option>
                  <option value='news'>الأخبار</option>
                  <option value='marketing'>التسويق</option>
                  {customDepartments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className='mb-4'>
              <label className='label'>المنصب</label>
              <select
                name='role'
                value={formData.role}
                onChange={handleChange}
                className='input'
              >
                <option value='employee'>موظف</option>
                <option value='manager'>رئيس قسم</option>
              </select>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='btn btn-primary w-full'
            >
              {loading ? (
                <span className='flex items-center justify-center gap-2'>
                  <span className='animate-spin rounded-full h-4 w-4 border-t-2 border-white'></span>
                  جاري التسجيل...
                </span>
              ) : (
                'إنشاء حساب'
              )}
            </button>
          </form>

          <div className='mt-6 text-center'>
            <p className='text-gray-600'>
              لديك حساب بالفعل؟{' '}
              <Link to='/login' className='text-interactive hover:underline font-semibold'>
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;