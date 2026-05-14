import Card from '../../components/common/Card';

const roleNames = {
  employee: 'موظف', manager: 'مدير قسم', admin: 'المدير العام'
};

export default function UserFormModal({
  showModal, editingUser, formData, error, loading,
  handleChange, handleSubmit, isAdmin, onClose,
  customDepartments
}) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md m-4">
        <h2 className="text-xl font-bold text-dark mb-4">
          {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم'}
        </h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-primary/10 border border-primary text-primary p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="label">الاسم</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="input" required />
          </div>
          <div className="mb-4">
            <label className="label">اسم المستخدم</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} className="input" required />
          </div>
          <div className="mb-4">
            <label className="label">البريد الإلكتروني</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="input" required />
          </div>
          <div className="mb-4">
            <label className="label">{editingUser ? 'كلمة المرور (اتركها فارغة إذا لا تريد تغييرها)' : 'كلمة المرور'}</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange}
              className="input" required={!editingUser} />
          </div>

          {isAdmin && (
            <div className="mb-4">
              <label className="label">الدور</label>
              <select name="role" value={formData.role} onChange={handleChange} className="input">
                <option value="employee">موظف</option>
                <option value="manager">مدير قسم</option>
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="label">القسم</label>
            <select name="department" value={formData.department} onChange={handleChange} className="input">
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

          <div className="flex gap-4">
            <button type="submit" className="btn btn-primary flex-1">
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline flex-1">إلغاء</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
