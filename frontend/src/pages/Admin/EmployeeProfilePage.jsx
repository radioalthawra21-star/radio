import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const EmployeeProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/profile/${id}`);
      setEmployee(response.data.data.user);
      setFormData(response.data.data.user);
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في جلب بيانات الموظف' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put(`/users/profile/${id}`, formData);
      setEmployee(response.data.data.user);
      setFormData(response.data.data.user);
      setEditing(false);
      setMessage({ type: 'success', text: 'تم تحديث البيانات بنجاح' });
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في تحديث البيانات' });
    } finally {
      setSaving(false);
    }
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('cv', file);

    try {
      setUploadingCV(true);
      const response = await api.post(`/users/profile/${id}/cv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEmployee(prev => ({
        ...prev,
        cvUrl: response.data.data.cvUrl,
        cvFileName: response.data.data.cvFileName,
        cvUploadedAt: response.data.data.cvUploadedAt
      }));
      setMessage({ type: 'success', text: 'تم رفع السيرة الذاتية بنجاح' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'فشل في رفع السيرة الذاتية' });
    } finally {
      setUploadingCV(false);
      e.target.value = '';
    }
  };

  const handleCVDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف السيرة الذاتية؟')) return;

    try {
      await api.delete(`/users/profile/${id}/cv`);
      setEmployee(prev => ({
        ...prev,
        cvUrl: null,
        cvFileName: null,
        cvUploadedAt: null
      }));
      setMessage({ type: 'success', text: 'تم حذف السيرة الذاتية بنجاح' });
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في حذف السيرة الذاتية' });
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ar-SA');
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'المدير العام';
      case 'hr': return 'مسؤول الموارد البشرية';
      case 'manager': return 'مدير قسم';
      case 'employee': return 'موظف';
      default: return role;
    }
  };

  const getDepartmentLabel = (dept) => {
    const deptNames = {
      financial: 'المالي',
      it: 'تقنية المعلومات',
      marketing: 'التسويق',
      news: 'الأخبار',
      production: 'الإنتاج',
      live_broadcast: 'البث المباشر',
      hr: 'الموارد البشرية'
    };
    return deptNames[dept] || dept || '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#E3D4BE' }}>
        <div className="text-2xl" style={{ color: '#182E4E' }}>جاري التحميل...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#E3D4BE' }}>
        <div className="text-center">
          <div className="text-2xl mb-4" style={{ color: '#182E4E' }}>الموظف غير موجود</div>
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: '#CD6F13' }}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#E3D4BE', direction: 'rtl' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <span className="text-2xl" style={{ color: '#182E4E' }}>→</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#182E4E' }}>ملف الموظف: {employee.name}</h1>
              <p className="text-sm" style={{ color: '#182E4E80' }}>{getRoleLabel(employee.role)} - {getDepartmentLabel(employee.department)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#CD6F13' }}>
                تعديل البيانات
              </button>
            ) : (
              <>
                <button onClick={() => { setEditing(false); setFormData(employee); }} className="px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#182E4E' }}>
                  إلغاء
                </button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-50" style={{ backgroundColor: '#1C95A4' }}>
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {/* Profile Image & Basic Info */}
        <div className="rounded-lg p-6 mb-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: '#E3D4BE' }}>
              {employee.profileImage ? (
                <img src={employee.profileImage} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl" style={{ color: '#182E4E' }}>
                  {employee.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#182E4E' }}>{employee.name}</h2>
              <p style={{ color: '#182E4E80' }}>{employee.jobTitle || 'بدون مسمى وظيفي'}</p>
              <div className="flex gap-4 mt-2 text-sm" style={{ color: '#182E4E80' }}>
                <span>البريد: {employee.email}</span>
                <span>الهاتف: {employee.phone || '-'}</span>
                <span>تاريخ البدء: {formatDate(employee.startDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CV Section */}
        <div className="rounded-lg p-6 mb-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#182E4E' }}>السيرة الذاتية</h3>
          {employee.cvUrl ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 p-4 rounded-lg flex-1" style={{ backgroundColor: '#E3D4BE' }}>
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-medium" style={{ color: '#182E4E' }}>{employee.cvFileName}</p>
                  <p className="text-sm" style={{ color: '#182E4E80' }}>تم الرفع: {formatDate(employee.cvUploadedAt)}</p>
                </div>
              </div>
              <a href={employee.cvUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-white hover:opacity-90" style={{ backgroundColor: '#1C95A4' }}>
                عرض
              </a>
              <button onClick={handleCVDelete} className="px-4 py-2 rounded-lg text-white hover:opacity-90" style={{ backgroundColor: '#DC2626' }}>
                حذف
              </button>
            </div>
          ) : (
            <div className="text-center py-6" style={{ backgroundColor: '#E3D4BE', borderRadius: '0.5rem' }}>
              <p className="mb-4" style={{ color: '#182E4E80' }}>لم يتم رفع سيرة ذاتية بعد</p>
              <label className="inline-block px-4 py-2 rounded-lg text-white cursor-pointer hover:opacity-90" style={{ backgroundColor: '#CD6F13' }}>
                <span>{uploadingCV ? 'جاري الرفع...' : 'رفع سيرة ذاتية'}</span>
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={handleCVUpload} className="hidden" disabled={uploadingCV} />
              </label>
              <p className="text-xs mt-2" style={{ color: '#182E4E60' }}>الصيغ المسموحة: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (حد أقصى 10MB)</p>
            </div>
          )}
        </div>

        {/* Personal Information */}
        <div className="rounded-lg p-6 mb-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#182E4E' }}>البيانات الشخصية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="الرقم الوطني" name="nationalId" value={formData.nationalId} onChange={handleChange} editing={editing} />
            <FormField label="تاريخ الميلاد" name="dateOfBirth" value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''} onChange={handleChange} editing={editing} type="date" />
            <FormField label="مكان الميلاد" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} editing={editing} />
            <FormField label="الجنسية" name="nationality" value={formData.nationality} onChange={handleChange} editing={editing} />
            <FormField label="الجنس" name="gender" value={formData.gender} onChange={handleChange} editing={editing} select options={[{ value: '', label: '-' }, { value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }]} />
            <FormField label="الحالة الاجتماعية" name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} editing={editing} select options={[{ value: '', label: '-' }, { value: 'single', label: 'أعزب' }, { value: 'married', label: 'متزوج' }, { value: 'divorced', label: 'مطلق' }, { value: 'widowed', label: 'أرمل' }]} />
            <FormField label="العنوان" name="address" value={formData.address} onChange={handleChange} editing={editing} className="md:col-span-2" />
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-lg p-6 mb-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#182E4E' }}>بيانات الاتصال</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="رقم الهاتف" name="phone" value={formData.phone} onChange={handleChange} editing={editing} />
            <FormField label="البريد الإلكتروني" name="email" value={formData.email} disabled />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="rounded-lg p-6 mb-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#182E4E' }}>جهة اتصال للطوارئ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="اسم جهة الاتصال" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} editing={editing} />
            <FormField label="رقم الهاتف" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} editing={editing} />
            <FormField label="صلة القرابة" name="emergencyContactRelation" value={formData.emergencyContactRelation} onChange={handleChange} editing={editing} />
          </div>
        </div>

        {/* Education & Experience */}
        <div className="rounded-lg p-6 mb-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#182E4E' }}>التعليم والخبرة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="المؤهل العلمي" name="education" value={formData.education} onChange={handleChange} editing={editing} />
            <FormField label="التخصص" name="specialization" value={formData.specialization} onChange={handleChange} editing={editing} />
            <FormField label="سنوات الخبرة" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} editing={editing} type="number" />
            <FormField label="صاحب العمل السابق" name="previousEmployer" value={formData.previousEmployer} onChange={handleChange} editing={editing} className="md:col-span-2" />
          </div>
        </div>

        {/* Job Information */}
        <div className="rounded-lg p-6 mb-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#182E4E' }}>بيانات الوظيفة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="المسمى الوظيفي" name="jobTitle" value={formData.jobTitle} onChange={handleChange} editing={editing} />
            <FormField label="القسم" value={getDepartmentLabel(employee.department)} disabled />
            <FormField label="الدور" value={getRoleLabel(employee.role)} disabled />
            <FormField label="تاريخ البدء" value={formatDate(employee.startDate)} disabled />
          </div>
        </div>

        {/* Bank & Financial */}
        <div className="rounded-lg p-6 mb-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#182E4E' }}>البيانات المالية والبنكية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="اسم البنك" name="bankName" value={formData.bankName} onChange={handleChange} editing={editing} />
            <FormField label="رقم الحساب البنكي" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} editing={editing} />
            <FormField label="الرقم الضريبي" name="taxNumber" value={formData.taxNumber} onChange={handleChange} editing={editing} />
            <FormField label="رقم الضمان الاجتماعي" name="socialSecurityNumber" value={formData.socialSecurityNumber} onChange={handleChange} editing={editing} />
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-lg p-6 mb-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#182E4E' }}>ملاحظات</h3>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            disabled={!editing}
            rows={4}
            className="w-full p-3 rounded-lg border disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
            style={{ borderColor: '#E3D4BE' }}
          />
        </div>
      </div>
    </div>
  );
};

const FormField = ({ label, name, value, onChange, editing, type = 'text', select, options, disabled, className = '' }) => {
  if (select && editing) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium mb-1" style={{ color: '#182E4E' }}>{label}</label>
        <select name={name} value={value} onChange={onChange} className="w-full p-2 rounded-lg border" style={{ borderColor: '#E3D4BE' }}>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (editing && !disabled) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium mb-1" style={{ color: '#182E4E' }}>{label}</label>
        <input
          type={type}
          name={name}
          value={value || ''}
          onChange={onChange}
          className="w-full p-2 rounded-lg border"
          style={{ borderColor: '#E3D4BE' }}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1" style={{ color: '#182E4E80' }}>{label}</label>
      <div className="p-2 rounded-lg" style={{ backgroundColor: '#F5F5F5' }}>
        {type === 'date' ? (value ? new Date(value).toLocaleDateString('ar-SA') : '-') : (value || '-')}
      </div>
    </div>
  );
};

export default EmployeeProfilePage;
