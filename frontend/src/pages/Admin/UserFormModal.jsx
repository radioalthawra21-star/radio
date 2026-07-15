import Card from '../../components/common/Card';

const roleNames = {
  employee: 'موظف', office_manager: 'مدير مكتب', manager: 'مدير قسم', hr: 'مسؤول الموارد البشرية', admin: 'المدير العام'
};

export default function UserFormModal({
  showModal, editingUser, formData, error, loading,
  handleChange, handleSubmit, isAdmin, isManager, onClose,
  customDepartments
}) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4 modal-overlay">
      <Card className="w-full max-w-md mx-2 md:mx-4 modal-content">
        <h2 className="text-xl font-bold text-dark mb-4">
          {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم'}
        </h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-amber-50 border border-amber-400 text-amber-800 p-3 rounded-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="mb-4">
            <label className="label">الاسم</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="input min-h-[48px]" required />
          </div>
          <div className="mb-4">
            <label className="label">اسم المستخدم</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} className="input min-h-[48px]" required />
          </div>
          <div className="mb-4">
            <label className="label">البريد الإلكتروني</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="input min-h-[48px]" required />
          </div>
          <div className="mb-4">
            <label className="label">{editingUser ? 'كلمة المرور (اتركها فارغة إذا لا تريد تغييرها)' : 'كلمة المرور'}</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange}
              className="input min-h-[48px]" required={!editingUser} />
          </div>

          {(isAdmin || isManager) && (
            <div className="mb-4">
              <label className="label">الدور</label>
              <select name="role" value={formData.role} onChange={handleChange} className="input min-h-[48px]">
                {isAdmin ? (
                  <>
                    <option value="employee">موظف</option>
                    <option value="office_manager">مدير مكتب</option>
                    <option value="manager">مدير قسم</option>
                    <option value="hr">مسؤول الموارد البشرية</option>
                  </>
                ) : (
                  <>
                    <option value="employee">موظف</option>
                    <option value="office_manager">مدير مكتب</option>
                  </>
                )}
              </select>
            </div>
          )}

          {formData.role !== 'manager' && (
            <div className="mb-4">
              <label className="label">المسمى الوظيفي</label>
              <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleChange} className="input min-h-[48px]" placeholder="أدخل المسمى الوظيفي" />
            </div>
          )}

          <div className="mb-4">
            <label className="label">القسم</label>
            <select name="department" value={formData.department} onChange={handleChange} className="input min-h-[48px]">
              <option value="">اختر القسم</option>
              {customDepartments.length > 0 ? (
                customDepartments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))
              ) : (
                <>
                  <option value="production">الإنتاج</option>
                  <option value="news">الأخبار</option>
                  <option value="marketing">التسويق</option>
                </>
              )}
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <button type="submit" className="btn btn-primary flex-1 min-h-[48px]">
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline flex-1 min-h-[48px]">إلغاء</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
