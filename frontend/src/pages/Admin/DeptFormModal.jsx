import Card from '../../components/common/Card';

const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function DeptFormModal({
  showDeptModal, deptForm, setDeptForm, deptLoading,
  handleAddDepartment, onClose
}) {
  if (!showDeptModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md m-4">
        <h2 className="text-xl font-bold text-dark mb-4">إضافة قسم جديد</h2>
        <form onSubmit={handleAddDepartment}>
          <div className="mb-4">
            <label className="label">اسم القسم</label>
            <input type="text" value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              className="input" placeholder="أدخل اسم القسم" required />
          </div>
          <div className="mb-4">
            <label className="label">اللون</label>
            <div className="flex flex-wrap gap-2">
              {defaultColors.map((color) => (
                <button key={color} type="button"
                  onClick={() => setDeptForm({ ...deptForm, color })}
                  className={`w-8 h-8 rounded-full transition-transform ${deptForm.color === color ? 'ring-2 ring-offset-2 ring-dark scale-110' : ''}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <button type={deptLoading ? 'button' : 'submit'}
              disabled={deptLoading}
              className={deptLoading ? 'btn btn-primary opacity-50' : 'btn btn-primary flex-1'}>
              {deptLoading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline flex-1">إلغاء</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
