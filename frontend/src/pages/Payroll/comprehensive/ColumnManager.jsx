import { FaColumns, FaTrash, FaPlus, FaSave } from 'react-icons/fa';
import { ALL_COLUMNS } from './config';

export default function ColumnManager({
  showColumnManager, activeColumns, dynamicColumns,
  newColumnForm, setNewColumnForm,
  toggleColumnVisibility, handleAddDynamicColumn,
  setColumnToDelete, onClose
}) {
  if (!showColumnManager) return null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(e); }}>
      <div className="modal-content column-manager-modal" onClick={e => e.stopPropagation()}>
        <h2><FaColumns /> إدارة الأعمدة</h2>

        <div className="column-manager-section">
          <h3>الأعمدة الأساسية</h3>
          {ALL_COLUMNS.map(col => (
            <div key={col.key} className="column-toggle-row">
              <label>{col.label}</label>
              <input
                type="checkbox"
                checked={activeColumns.includes(col.key)}
                disabled={!col.deletable}
                onChange={() => toggleColumnVisibility(col.key)}
              />
            </div>
          ))}
        </div>

        <div className="column-manager-section">
          <h3>الأعمدة المخصصة</h3>
          {dynamicColumns.length === 0 && <p className="no-columns-msg">لا توجد أعمدة مخصصة بعد</p>}
          {dynamicColumns.map(dc => (
            <div key={dc.id} className="column-toggle-row">
              <span>{dc.label} ({dc.category === 'earning' ? 'بدل' : 'خصم'})</span>
              <button onClick={() => setColumnToDelete(dc)} className="btn-delete-small" title="حذف العمود">
                <FaTrash />
              </button>
            </div>
          ))}
        </div>

        <div className="column-manager-section">
          <h3>إضافة عمود جديد</h3>
          <div className="add-column-form">
            <input
              type="text"
              placeholder="اسم العمود"
              value={newColumnForm.label}
              onChange={e => setNewColumnForm({ ...newColumnForm, label: e.target.value })}
            />
            <input
              type="number"
              placeholder="القيمة الافتراضية"
              value={newColumnForm.defaultValue}
              onChange={e => setNewColumnForm({ ...newColumnForm, defaultValue: e.target.value })}
            />
            <select
              value={newColumnForm.category}
              onChange={e => setNewColumnForm({ ...newColumnForm, category: e.target.value })}
            >
              <option value="allowance">بدل</option>
              <option value="deduction">خصم</option>
            </select>
            <button onClick={handleAddDynamicColumn} className="btn-primary">
              <FaPlus /> إضافة
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-save"><FaSave /> تم</button>
        </div>
      </div>
    </div>
  );
}
