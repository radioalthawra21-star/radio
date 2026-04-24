/**
 * Change Password Page
 * Allows authenticated users to change their password
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../../services/userService';
import { getStoredUser } from '../../services/authService';
import Card from '../../components/common/Card';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const user = getStoredUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    if (newPassword.length < 6) {
      setError('يجب أن تكون كلمة المرور الجديدة على الأقل 6 أحرف');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة وتأكيدها غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      const response = await changePassword({
        currentPassword,
        newPassword
      });

      if (response.success) {
        setSuccess('تم تغيير كلمة المرور بنجاح');
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Optionally redirect to dashboard after a delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        setError(response.message || 'فشل تغيير كلمة المرور');
      }
    } catch (err) {
      console.error('Change password error:', err);
      setError('حدث خطأ في الخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-[#182E4E] text-white py-6">
          <h1 className="text-2xl font-bold text-center">تغيير كلمة المرور</h1>
          <p className="text-center text-gray-300 mt-1">
            مرحباً, {user?.name}
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
              <p className="font-medium">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
              <p className="font-medium">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور الحالية
              </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#182E4E]"
                  disabled={loading}
                />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور الجديدة
              </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة (على الأقل 6 أحرف)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#182E4E]"
                  disabled={loading}
                />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تأكيد كلمة المرور الجديدة
              </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة للتأكيد"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#182E4E]"
                  disabled={loading}
                />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#182E4E] text-white py-2 px-4 rounded-md hover:bg-[#152842] focus:outline-none focus:ring-2 focus:ring-[#152842] focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'تغيير كلمة المرور'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => window.location.href = '/'}
              className="text-sm text-[#182E4E] hover:underline"
            >
              العودة إلى لوحة التحكم
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;