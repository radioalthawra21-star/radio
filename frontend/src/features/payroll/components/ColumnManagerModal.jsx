import { FaTimes, FaTrash, FaPlus } from 'react-icons/fa';
import { DEFAULT_COLUMNS } from './payrollTableUtils';

export default function ColumnManagerModal({
  show, onClose, activeColumns, dynamicColumns,
  newColumnForm, setNewColumnForm, toggleColumnVisibility,
  handleAddDynamicColumn, setColumnToDelete
}) {
  if (!show) return null;

  const getColCategory = (col) => {
    if (col.isDynamic) return col.category === 'earning' ? 'allowance' : 'deduction';
    return col.category;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">إدارة الأعمدة</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">الأعمدة الأساسية</h4>
            <div className="space-y-2">
              {DEFAULT_COLUMNS.filter(c => c.key !== 'netPay').map(col => (
                <div key={col.key} className="flex items-center justify-between py-1">
                  <span className={`text-sm ${!col.deletable ? 'text-gray-400' : 'text-gray-700'}`}>
                    {col.label}
                    <span className="text-xs text-gray-400 mr-2">({getColCategory(col)})</span>
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer"
                      checked={activeColumns.includes(col.key)}
                      onChange={() => toggleColumnVisibility(col.key)}
                      disabled={!col.deletable} />
                    <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 ${!col.deletable ? 'opacity-50' : ''}`}></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {dynamicColumns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">الأعمدة المضافة</h4>
              <div className="space-y-2">
                {dynamicColumns.map(dc => (
                  <div key={dc.id} className="flex items-center justify-between py-1 px-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm text-gray-700">{dc.label}</span>
                      <span className="text-xs text-gray-400 mr-2">
                        ({dc.category === 'allowance' ? 'بدل' : 'خصم'} - القيمة الافتراضية: {dc.defaultValue})
                      </span>
                    </div>
                    <button onClick={() => setColumnToDelete(dc.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors" title="حذف العمود">
                      <FaTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">إضافة عمود جديد</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">اسم العمود</label>
                <input type="text" value={newColumnForm.label}
                  onChange={e => setNewColumnForm(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="مثال: بدل السكن الإضافي"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">القيمة الافتراضية</label>
                <input type="number" value={newColumnForm.defaultValue}
                  onChange={e => setNewColumnForm(prev => ({ ...prev, defaultValue: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">الفئة</label>
                <select value={newColumnForm.category}
                  onChange={e => setNewColumnForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm">
                  <option value="allowance">بدل / إضافة</option>
                  <option value="deduction">خصم</option>
                </select>
              </div>
              <button onClick={handleAddDynamicColumn}
                disabled={!newColumnForm.label.trim()}
                className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-lg text-sm transition-colors">
                <FaPlus className="h-3.5 w-3.5 inline ml-1" /> إضافة العمود
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
