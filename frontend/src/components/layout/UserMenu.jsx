import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadProfileImage } from '../../services/authService';
import { UPLOADS_URL } from '../../services/api';

const departmentNames = {
  financial: 'المالي', it: 'تقنية المعلومات', marketing: 'التسويق',
  news: 'الأخبار', production: 'الإنتاج', live_broadcast: 'البث المباشر',
  hr: 'الموارد البشرية', المالي: 'المالي', 'تقنية المعلومات': 'تقنية المعلومات',
  التسويق: 'التسويق', الأخبار: 'الأخبار', الإنتاج: 'الإنتاج',
  'البث المباشر': 'البث المباشر', 'الموارد البشرية': 'الموارد البشرية'
};

const UserMenu = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleLabel = () => {
    if (!user) return '';
    if (user.role === 'admin') return 'المدير العام';
    if (user.role === 'manager') return `مدير ${departmentNames[user.department] || ''}`;
    return 'موظف';
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { alert('نوع الملف غير صالح. الأنواع المسموحة: JPG، PNG، WEBP'); return; }
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) { alert('حجم الملف كبير جداً. الحد الأقصى المسموح: 2 ميجابايت'); return; }
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('profileImage', file);
    try {
      const response = await uploadProfileImage(formData);
      if (response.success) {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        storedUser.profileImage = response.data.user.profileImage;
        localStorage.setItem('user', JSON.stringify(storedUser));
        if (user) user.profileImage = response.data.user.profileImage;
        alert('تم تحديث صورة الملف الشخصي بنجاح ✓');
        window.dispatchEvent(new Event('storage'));
      } else alert(response.message || 'حدث خطأ في رفع الصورة');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      alert('حدث خطأ في رفع الصورة. تأكد من أن الملف صورة صالحة.');
    } finally { setUploadingImage(false); }
  };

  return (
    <div className="relative" ref={userMenuRef}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {user?.profileImage ? (
              <img
                src={user.profileImage?.startsWith('http') ? user.profileImage : `${UPLOADS_URL}${user.profileImage}`}
                alt={user?.name}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0) || 'م'}
              </div>
            )}
            <span className="text-dark font-medium whitespace-nowrap hidden md:inline">{user?.name}</span>
            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <label
            className={`absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-dark transition-colors shadow-md ${uploadingImage ? 'opacity-50' : ''}`}
            title="تغيير الصورة الشخصية"
          >
            {uploadingImage ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" disabled={uploadingImage} />
          </label>
        </div>
      </div>

      {showUserMenu && (
        <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 animate-fade-in">
          <div className="p-3 border-b">
            <p className="font-semibold text-dark">{user?.name}</p>
            <p className="text-sm text-gray-500">{getRoleLabel()}</p>
          </div>
          <div className="p-2">
            <button onClick={() => navigate('/change-password')} className="w-full text-right p-2 hover:bg-gray-100 rounded-lg">
              تغيير كلمة المرور
            </button>
          </div>
          <div className="p-2">
            <button onClick={onLogout} className="w-full text-right p-2 hover:bg-gray-100 rounded-lg text-error">
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
