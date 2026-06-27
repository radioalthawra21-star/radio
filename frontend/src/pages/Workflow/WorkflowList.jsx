import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkflows, deleteWorkflow } from '../../services/workflowService';
import Card from '../../components/common/Card';

const WorkflowList = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await getWorkflows();
      if (res.success) setWorkflows(res.data.workflows);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من تعطيل سير العمل هذا؟')) return;
    try {
      await deleteWorkflow(id);
      fetchWorkflows();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-dark">قوالب سير العمل</h1>
        <button onClick={() => navigate('/workflows/new')} className="btn btn-primary">
          + إنشاء قالب
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div></div>
      ) : workflows.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-8">لا توجد قوالب سير عمل بعد</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((wf) => (
            <Card key={wf._id} className="hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-dark text-lg">{wf.name}</h3>
                  <p className="text-sm text-gray-500">{wf.description || 'لا يوجد وصف'}</p>
                </div>
                <span className={`badge ${wf.isActive ? 'bg-success' : 'bg-gray-400'} text-white`}>
                  {wf.isActive ? 'نشط' : 'معطل'}
                </span>
              </div>
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                {wf.stages?.map((s, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {s.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mb-3">{wf.stages?.length || 0} مرحلة</p>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/workflows/${wf._id}`)} className="btn btn-outline text-sm flex-1">تعديل</button>
                <button onClick={() => navigate(`/workflows/create-task/${wf._id}`)} className="btn btn-primary text-sm flex-1">استخدام</button>
                {wf.isActive && (
                  <button onClick={() => handleDelete(wf._id)} className="btn btn-outline text-sm text-error">تعطيل</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkflowList;
