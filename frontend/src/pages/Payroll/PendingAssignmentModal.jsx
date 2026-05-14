import { FaMoneyBillWave, FaCheckCircle, FaSpinner } from 'react-icons/fa';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try { return new Date(dateString).toLocaleDateString('ar-EG'); }
  catch { return 'تاريخ غير صالح'; }
};

export default function PendingAssignmentModal({
  selectedEntry, formData, submitting, onClose, onChange, onSubmit
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-dark flex items-center gap-3">
            <FaMoneyBillWave className="text-primary" />
            إدخال بيانات الراتب
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-dark mb-2">معلومات الموظف</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-600">الاسم:</span><span className="font-medium mr-2">{selectedEntry.employee?.name}</span></div>
            <div><span className="text-gray-600">البريد:</span><span className="font-medium mr-2">{selectedEntry.employee?.email}</span></div>
            <div><span className="text-gray-600">القسم:</span><span className="font-medium mr-2">{selectedEntry.employee?.department}</span></div>
            <div><span className="text-gray-600">تاريخ التعيين:</span><span className="font-medium mr-2">{formatDate(selectedEntry.employee?.startDate)}</span></div>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الراتب الأساسي <span className="text-red-500">*</span>
              </label>
              <input type="number" name="baseSalary" value={formData.baseSalary} onChange={onChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="أدخل الراتب الأساسي" required min="0" step="0.01" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">البدلات</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'housingAllowance', label: 'بدل سكن' },
                  { name: 'transportAllowance', label: 'بدل نقل' },
                  { name: 'foodAllowance', label: 'بدل غذاء' },
                  { name: 'communicationAllowance', label: 'بدل اتصالات' },
                ].map(f => (
                  <div key={f.name}>
                    <label className="block text-xs text-gray-600 mb-1">{f.label}</label>
                    <input type="number" name={f.name} value={formData[f.name]} onChange={onChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="0" min="0" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">فترة الدفع</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'periodStart', label: 'تاريخ البداية' },
                  { name: 'periodEnd', label: 'تاريخ النهاية' },
                  { name: 'paymentDate', label: 'تاريخ الدفع' },
                ].map(f => (
                  <div key={f.name}>
                    <label className="block text-xs text-gray-600 mb-1">{f.label}</label>
                    <input type="date" name={f.name} value={formData[f.name]} onChange={onChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" required />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                إلغاء
              </button>
              <button type="submit" disabled={submitting}
                className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50">
                {submitting ? (
                  <><FaSpinner className="animate-spin" /> جاري الحفظ...</>
                ) : (
                  <><FaCheckCircle /> حفظ وإكمال</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
