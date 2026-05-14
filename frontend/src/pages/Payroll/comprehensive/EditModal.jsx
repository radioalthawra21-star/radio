import { useEffect, useCallback } from 'react';
import { FaSave, FaTimes, FaMoneyBillWave, FaCalculator, FaArrowLeft } from 'react-icons/fa';
import DynamicNumber from '../../../components/DynamicNumber';
import { JOB_GRADES, DEDUCTION_RATES, DEPARTMENTS } from './config';
import { safeNum } from './utils';

export default function EditModal({
  isEditing, editMode, bulkEditMode, setBulkEditMode,
  formData, setFormData, dynamicColumns,
  handleSave, onClose, formatCurrency, formatCurrencyStr
}) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditing, handleKeyDown]);

  if (!isEditing) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-dark mb-0">{editMode === 'add' ? 'إضافة موظف جديد' : 'تعديل بيانات الموظف'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="إغلاق (Esc)">
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
        {editMode !== 'add' && (
          <div className="bulk-toggle-container">
            <button onClick={() => setBulkEditMode(!bulkEditMode)}
              className={bulkEditMode ? 'btn-danger' : 'btn-secondary'}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {bulkEditMode ? <><FaArrowLeft /> العودة للتعديل الفردي</> : <>➡️ تطبيق على كل الموظفين</>}
            </button>
          </div>
        )}
        {bulkEditMode && (
          <div className="bulk-warning">⚠️ سيتم تطبيق القيم المدخلة على <strong>جميع الموظفين</strong></div>
        )}
        <div className="form-grid">
          {editMode === 'add' && (
            <>
              <div className="form-group">
                <label>البريد الإلكتروني *</label>
                <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>اسم المستخدم *</label>
                <input type="text" value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>كلمة المرور *</label>
                <input type="password" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} required />
              </div>
            </>
          )}
          <div className="form-group">
            <label>ID</label>
            <input type="text" value={formData._id || formData.id || ''} readOnly placeholder={editMode === 'add' ? 'يُولد تلقائياً' : ''} />
          </div>
          <div className="form-group">
            <label>الاسم الكامل *</label>
            <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>القسم</label>
            <select value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})}>
              <option value="">اختر القسم</option>
              {Object.entries(DEPARTMENTS).map(([key, dept]) => (
                <option key={key} value={key}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>المسمى الوظيفي</label>
            <select value={formData.jobTitle || ''} onChange={e => setFormData({...formData, jobTitle: e.target.value, grade: JOB_GRADES[e.target.value]?.grade || 1})}>
              <option value="">اختر الوظيفة</option>
              {Object.keys(JOB_GRADES).map(title => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>تاريخ التعيين</label>
            <input type="date" value={formData.hireDate || ''} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
          </div>

          <div className="section-header">
            <h3><FaMoneyBillWave /> المستحقات (Earnings)</h3>
          </div>
          {[
            ['baseSalary', 'الراتب الأساسي'],
            ['housingAllowance', 'بدل السكن'],
            ['transportAllowance', 'بدل النقل'],
            ['otherAllowances', 'بدلات أخرى'],
            ['bonus', 'المكافآت'],
            ['overtime', 'ساعات إضافية'],
          ].map(([key, label]) => (
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input type="number" value={safeNum(formData[key])} onChange={e => setFormData({ ...formData, [key]: e.target.value })} />
            </div>
          ))}
          {dynamicColumns.filter(dc => dc.category === 'earning').map(dc => (
            <div className="form-group" key={`dynamic_${dc.id}`}>
              <label>{dc.label}</label>
              <input type="number" value={safeNum(formData[`dynamic_${dc.id}`])} onChange={e => setFormData({ ...formData, [`dynamic_${dc.id}`]: e.target.value })} />
            </div>
          ))}

          <div className="section-header">
            <h3><FaCalculator /> الاستقطاعات (Deductions)</h3>
          </div>
          {[
            ['socialInsurance', `التأمينات الاجتماعية (${DEDUCTION_RATES.socialInsurance * 100}%)`],
            ['tax', `الضريبة (${DEDUCTION_RATES.tax * 100}%)`],
            ['otherDeductions', 'استقطاعات أخرى'],
          ].map(([key, label]) => (
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input type="number" value={safeNum(formData[key])} onChange={e => setFormData({ ...formData, [key]: e.target.value })} />
            </div>
          ))}
          {dynamicColumns.filter(dc => dc.category === 'deduction').map(dc => (
            <div className="form-group" key={`dynamic_${dc.id}`}>
              <label>{dc.label}</label>
              <input type="number" value={safeNum(formData[`dynamic_${dc.id}`])} onChange={e => setFormData({ ...formData, [`dynamic_${dc.id}`]: e.target.value })} />
            </div>
          ))}

          <div className="section-header">
            <h3>النتائج المحسوبة تلقائياً</h3>
          </div>
          <div className="form-group readonly">
            <label>إجمالي المستحقات</label>
            <input type="text" readOnly value={formatCurrencyStr(
              safeNum(formData.baseSalary) + safeNum(formData.housingAllowance) +
              safeNum(formData.transportAllowance) + safeNum(formData.otherAllowances) +
              safeNum(formData.bonus) + safeNum(formData.overtime) +
              dynamicColumns.filter(dc => dc.category === 'earning').reduce((sum, dc) => sum + safeNum(formData[`dynamic_${dc.id}`]), 0)
            )} />
          </div>
          <div className="form-group readonly">
            <label>صافي الراتب</label>
            <input type="text" readOnly value={formatCurrencyStr(
              (safeNum(formData.baseSalary) + safeNum(formData.housingAllowance) +
               safeNum(formData.transportAllowance) + safeNum(formData.otherAllowances) +
               safeNum(formData.bonus) + safeNum(formData.overtime) +
               dynamicColumns.filter(dc => dc.category === 'earning').reduce((sum, dc) => sum + safeNum(formData[`dynamic_${dc.id}`]), 0)) -
              (safeNum(formData.socialInsurance) + safeNum(formData.tax) +
               safeNum(formData.otherDeductions) +
               dynamicColumns.filter(dc => dc.category === 'deduction').reduce((sum, dc) => sum + safeNum(formData[`dynamic_${dc.id}`]), 0))
            )} />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={handleSave} className="btn-save"><FaSave /> حفظ</button>
          <button onClick={onClose} className="btn-cancel"><FaTimes /> إلغاء</button>
        </div>
      </div>
    </div>
  );
}
