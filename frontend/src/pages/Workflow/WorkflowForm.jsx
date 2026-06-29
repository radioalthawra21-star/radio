import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createWorkflow, getWorkflowById, updateWorkflow } from '../../services/workflowService';
import { getAllDepartments } from '../../services/departmentService';
import Card from '../../components/common/Card';

const ROLE_OPTIONS = [
  { value: '', label: 'اختياري' },
  { value: 'admin', label: 'المدير العام' },
  { value: 'hr', label: 'الموارد البشرية' },
  { value: 'manager', label: 'مدير القسم' },
  { value: 'financial', label: 'المالية' },
  { value: 'employee', label: 'موظف' },
  { value: 'observer', label: 'مراقب' }
];

const WorkflowForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', stages: [{ name: '', order: 1, department: '', role: '', canApprove: true, canReject: true, color: '#3B82F6', notifyOnArrival: true }]
  });

  useEffect(() => {
    const load = async () => {
      try {
        const deptRes = await getAllDepartments();
        if (deptRes.success) setDepartments(deptRes.data.departments || []);
        if (isEdit) {
          const wfRes = await getWorkflowById(id);
          if (wfRes.success) setFormData(wfRes.data.workflow);
        }
      } catch (err) { console.error(err); }
    };
    load();
  }, [id]);

  const updateField = (field, value) => setFormData({ ...formData, [field]: value });

  const updateStage = (index, field, value) => {
    const stages = [...formData.stages];
    stages[index] = { ...stages[index], [field]: value };
    updateField('stages', stages);
  };

  const addStage = () => {
    updateField('stages', [...formData.stages, { name: '', order: formData.stages.length + 1, department: '', role: '', canApprove: true, canReject: true, color: '#3B82F6', notifyOnArrival: true }]);
  };

  const removeStage = (index) => {
    if (formData.stages.length <= 1) return;
    const stages = formData.stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    updateField('stages', stages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = isEdit ? await updateWorkflow(id, formData) : await createWorkflow(formData);
      if (res.success) navigate('/workflows');
      else alert(res.message);
    } catch (err) { alert(err.response?.data?.message || 'حدث خطأ'); }
    finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-dark mb-8">{isEdit ? 'تعديل قالب سير العمل' : 'إنشاء قالب سير عمل جديد'}</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label">اسم سير العمل *</label>
            <input type="text" value={formData.name} onChange={(e) => updateField('name', e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">الوصف</label>
            <textarea value={formData.description} onChange={(e) => updateField('description', e.target.value)} className="input min-h-[80px]" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">مراحل سير العمل</label>
              <button type="button" onClick={addStage} className="btn btn-outline text-sm">+ إضافة مرحلة</button>
            </div>
            <div className="space-y-4">
              {formData.stages.map((stage, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-dark">المرحلة {index + 1}</span>
                    <button type="button" onClick={() => removeStage(index)} className="text-error text-sm">✕ حذف</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">الاسم *</label>
                      <input type="text" value={stage.name} onChange={(e) => updateStage(index, 'name', e.target.value)} className="input text-sm" required />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">الصلاحية</label>
                      <select value={stage.role} onChange={(e) => updateStage(index, 'role', e.target.value)} className="input text-sm">
                        {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">القسم</label>
                      <select value={stage.department} onChange={(e) => updateStage(index, 'department', e.target.value)} className="input text-sm">
                        <option value="">-- الكل --</option>
                        {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">اللون</label>
                      <input type="color" value={stage.color} onChange={(e) => updateStage(index, 'color', e.target.value)} className="input h-9 p-1" />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={stage.canApprove} onChange={(e) => updateStage(index, 'canApprove', e.target.checked)} /> موافقة</label>
                    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={stage.canReject} onChange={(e) => updateStage(index, 'canReject', e.target.checked)} /> رفض</label>
                    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={stage.notifyOnArrival} onChange={(e) => updateStage(index, 'notifyOnArrival', e.target.checked)} /> إشعار</label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={loading} className="btn btn-primary min-h-[44px]">{loading ? 'جاري الحفظ...' : (isEdit ? 'تحديث' : 'إنشاء')}</button>
            <button type="button" onClick={() => navigate('/workflows')} className="btn btn-outline min-h-[44px]">إلغاء</button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default WorkflowForm;
