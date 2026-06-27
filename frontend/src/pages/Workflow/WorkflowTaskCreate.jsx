import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getWorkflows } from '../../services/workflowService';
import { createWorkflowTask } from '../../services/workflowTaskService';
import { getAllEmployees } from '../../services/userService';
import Card from '../../components/common/Card';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'منخفضة' },
  { value: 'medium', label: 'متوسطة' },
  { value: 'high', label: 'عالية' },
  { value: 'urgent', label: 'عاجلة' }
];

const WorkflowTaskCreate = () => {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', workflowId: workflowId || '', assignedTo: [],
    priority: 'medium', dueDate: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [wfRes, empRes] = await Promise.all([
          getWorkflows({ isActive: true }),
          getAllEmployees()
        ]);
        if (wfRes.success) setWorkflows(wfRes.data.workflows);
        if (empRes.success) setEmployees(empRes.data.users || empRes.data.employees || []);
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  const selectedWorkflow = workflows.find(w => w._id === formData.workflowId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.workflowId || formData.assignedTo.length === 0) {
      alert('يرجى تعبئة الحقول المطلوبة');
      return;
    }
    setLoading(true);
    try {
      const res = await createWorkflowTask({
        title: formData.title,
        description: formData.description,
        workflowId: formData.workflowId,
        assignedTo: formData.assignedTo,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined
      });
      if (res.success) navigate(`/workflow/task/${res.data.task._id}`);
      else alert(res.message);
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء إنشاء المهمة');
    } finally { setLoading(false); }
  };

  const toggleEmployee = (empId) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(empId)
        ? prev.assignedTo.filter(id => id !== empId)
        : [...prev.assignedTo, empId]
    }));
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-dark mb-8">إنشاء مهمة سير عمل</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label">قالب سير العمل *</label>
            <select
              value={formData.workflowId}
              onChange={(e) => setFormData({ ...formData, workflowId: e.target.value })}
              className="input" required
            >
              <option value="">-- اختر قالباً --</option>
              {workflows.map(wf => (
                <option key={wf._id} value={wf._id}>{wf.name}</option>
              ))}
            </select>
          </div>

          {selectedWorkflow && (
            <div>
              <label className="label">مراحل سير العمل</label>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedWorkflow.stages.map((s, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/30">
                    {i + 1}. {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">عنوان المهمة *</label>
            <input type="text" value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input" required
            />
          </div>

          <div>
            <label className="label">الوصف</label>
            <textarea value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">الأولوية *</label>
              <select value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input"
              >
                {PRIORITY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">تاريخ الاستحقاق</label>
              <input type="date" value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="input en-num"
              />
            </div>
          </div>

          <div>
            <label className="label">الموظفون المسند إليهم *</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {employees.map(emp => (
                <label key={emp._id} className="flex items-center gap-2 text-sm p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" checked={formData.assignedTo.includes(emp._id)}
                    onChange={() => toggleEmployee(emp._id)}
                    className="rounded border-gray-300"
                  />
                  {emp.name}
                </label>
              ))}
              {employees.length === 0 && (
                <p className="text-gray-400 text-sm col-span-3 text-center py-2">لا يوجد موظفون</p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'جاري الإنشاء...' : 'إنشاء المهمة'}
            </button>
            <button type="button" onClick={() => navigate('/kanban')} className="btn btn-outline">إلغاء</button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default WorkflowTaskCreate;
