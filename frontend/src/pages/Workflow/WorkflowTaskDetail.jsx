import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTaskById } from '../../services/taskService';
import {
  getTaskTimeline, getComments, getAttachments,
  transitionTask, approveStage, rejectStage,
  addComment, uploadAttachment, deleteAttachment
} from '../../services/workflowTaskService';
import { formatDateArabic, formatDateTimeArabic } from '../../utils/dateUtils';
import Card from '../../components/common/Card';
import StageProgressBar from '../../components/workflow/StageProgressBar';
import TimelineView from '../../components/workflow/TimelineView';
import CommentSection from '../../components/workflow/CommentSection';
import AttachmentList from '../../components/workflow/AttachmentList';
import FileUpload from '../../components/workflow/FileUpload';
import StageTransitionModal from '../../components/workflow/StageTransitionModal';

const PRIORITY_LABELS = { urgent: 'عاجل', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };

const WorkflowTaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [taskRes, tlRes, commentsRes, attachRes] = await Promise.all([
        getTaskById(id),
        getTaskTimeline(id),
        getComments(id),
        getAttachments(id)
      ]);
      if (taskRes.success) {
        setTask(taskRes.data.task);
        if (taskRes.data.task.workflowId) setWorkflow(taskRes.data.task.workflowId);
      }
      if (tlRes.success) setTimeline(tlRes.data.timeline);
      if (commentsRes.success) setComments(commentsRes.data.comments);
      if (attachRes.success) setAttachments(attachRes.data.attachments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleTransition = async (note) => {
    setActionLoading(true);
    try {
      const res = await transitionTask(id, note);
      if (res.success) { await fetchAll(); }
    } finally { setActionLoading(false); }
  };

  const handleApprove = async (note) => {
    setActionLoading(true);
    try {
      const res = await approveStage(id, note);
      if (res.success) { await fetchAll(); }
    } finally { setActionLoading(false); }
  };

  const handleReject = async (note) => {
    setActionLoading(true);
    try {
      const res = await rejectStage(id, note);
      if (res.success) { await fetchAll(); }
    } finally { setActionLoading(false); }
  };

  const handleAddComment = async (content) => {
    try {
      const res = await addComment(id, content);
      if (res.success) {
        const updated = await getComments(id);
        if (updated.success) setComments(updated.data.comments);
      }
    } catch (err) { console.error(err); }
  };

  const handleUpload = async (file) => {
    try {
      const res = await uploadAttachment(id, file);
      if (res.success) {
        const updated = await getAttachments(id);
        if (updated.success) setAttachments(updated.data.attachments);
      }
    } catch (err) { alert(err.response?.data?.message || 'فشل رفع الملف'); }
  };

  const handleDeleteAttachment = async (attachId) => {
    if (!confirm('حذف المرفق؟')) return;
    try {
      await deleteAttachment(id, attachId);
      const updated = await getAttachments(id);
      if (updated.success) setAttachments(updated.data.attachments);
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="animate-fade-in">
        <Card><p className="text-center text-gray-500 py-8">المهمة غير موجودة</p></Card>
      </div>
    );
  }

  const isLastStage = workflow && task.currentStage >= (workflow.stages?.length || 0) - 1;
  const canAct = workflow && task.workflowStatus === 'in_progress';

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-dark">← العودة</button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark">{task.title}</h1>
          {workflow && <p className="text-sm text-gray-500">سير العمل: {workflow.name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge px-3 py-1 rounded-full text-sm font-medium ${
            task.workflowStatus === 'approved' ? 'bg-success text-white' :
            task.workflowStatus === 'rejected' ? 'bg-error text-white' :
            task.workflowStatus === 'in_progress' ? 'bg-warning text-dark' : 'bg-gray-200 text-gray-600'
          }`}>
            {task.workflowStatus === 'approved' ? 'معتمدة' :
             task.workflowStatus === 'rejected' ? 'مرفوضة' :
             task.workflowStatus === 'in_progress' ? 'قيد التنفيذ' : 'لم تبدأ'}
          </span>
          {task.priority && (
            <span className={`badge px-3 py-1 rounded-full text-sm font-medium ${
              task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
              task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
              task.priority === 'low' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
            }`}>
              {PRIORITY_LABELS[task.priority] || task.priority}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {workflow && (
            <Card>
              <h3 className="font-bold text-dark mb-3">مراحل سير العمل</h3>
              <StageProgressBar
                stages={workflow.stages}
                currentStage={task.currentStage}
                workflowStatus={task.workflowStatus}
              />
              {canAct && (
                <div className="mt-4">
                  <button onClick={() => setShowModal(true)} className="btn btn-primary text-sm">
                    إدارة المرحلة: {workflow.stages[task.currentStage]?.name || 'غير معروفة'}
                  </button>
                </div>
              )}
            </Card>
          )}

          <Card>
            <h3 className="font-bold text-dark mb-3">الوصف</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{task.description || 'لا يوجد وصف'}</p>
          </Card>

          <Card>
            <h3 className="font-bold text-dark mb-3">السجل الزمني</h3>
            <TimelineView timeline={timeline} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-bold text-dark mb-3">معلومات المهمة</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">المسند إلى</p>
                <p className="text-dark">{task.assignedTo?.map(u => u.name).join(', ') || 'غير معين'}</p>
              </div>
              <div>
                <p className="text-gray-500">تاريخ الإنشاء</p>
                <p className="text-dark en-num">{formatDateTimeArabic(task.createdAt)}</p>
              </div>
              {task.dueDate && (
                <div>
                  <p className="text-gray-500">تاريخ الاستحقاق</p>
                  <p className={`en-num ${new Date(task.dueDate) < new Date() && task.workflowStatus !== 'approved' ? 'text-error font-bold' : 'text-dark'}`}>
                    {formatDateArabic(task.dueDate)}
                    {new Date(task.dueDate) < new Date() && task.workflowStatus !== 'approved' && ' (متأخرة!)'}
                  </p>
                </div>
              )}
              {task.completedAt && (
                <div>
                  <p className="text-gray-500">تاريخ الإنجاز</p>
                  <p className="text-dark en-num">{formatDateTimeArabic(task.completedAt)}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-dark mb-3">المرفقات</h3>
            <AttachmentList
              attachments={attachments}
              onDelete={handleDeleteAttachment}
              loading={actionLoading}
            />
            <div className="mt-3">
              <FileUpload onUpload={handleUpload} />
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <h3 className="font-bold text-dark mb-3">التعليقات</h3>
        <CommentSection comments={comments} onAddComment={handleAddComment} loading={actionLoading} />
      </Card>

      {canAct && (
        <StageTransitionModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onApprove={handleApprove}
          onReject={handleReject}
          onTransition={handleTransition}
          stageName={workflow?.stages[task.currentStage]?.name || ''}
          isLastStage={isLastStage}
        />
      )}
    </div>
  );
};

export default WorkflowTaskDetail;
