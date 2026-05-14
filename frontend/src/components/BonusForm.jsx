const CRITERIA_OPTIONS = ['إكمال المهام', 'جودة العمل', 'العمل الجماعي', 'المبادرة', 'الالتزام', 'أخرى'];

export default function BonusForm({ formData, employees, submitting, onChange, onSubmit }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">إضافة مكافأة جديدة</h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">الموظف</label>
          <select name="employeeId" value={formData.employeeId} onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E] bg-white" required>
            <option value="">-- اختر الموظف --</option>
            {employees.length === 0
              ? <option value="" disabled>لا يوجد موظفون</option>
              : employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)
            }
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">النقاط (0-100)</label>
          <input type="number" dir="ltr" name="points" min="0" max="100" value={formData.points} onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E]" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">نوع المكافأة</label>
          <select name="type" value={formData.type} onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E] bg-white">
            <option value="reward">مكافأة</option>
            <option value="prize">جائزة</option>
            <option value="bonus">علاوة</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">نوع التقييم</label>
          <select name="criteria" value={formData.criteria || ''} onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E] bg-white" required>
            <option value="">-- اختر نوع التقييم --</option>
            {CRITERIA_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">السبب</label>
          <textarea name="reason" value={formData.reason} onChange={onChange} rows="3"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E]"
            placeholder="اكتب سبب منح المكافأة..." required />
        </div>

        <button type="submit" disabled={submitting}
          className="w-full bg-[#182E4E] text-white py-3 rounded-lg hover:bg-[#152842] disabled:opacity-50 disabled:cursor-not-allowed font-medium">
          {submitting ? 'جاري الإضافة...' : 'إضافة المكافأة'}
        </button>
      </form>
    </div>
  );
}
