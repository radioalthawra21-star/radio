import { formatDateArabic } from '../../utils/dateUtils';

const ACTION_LABELS = {
  created: 'إنشاء', stage_completed: 'إكمال مرحلة', stage_approved: 'موافقة مرحلة',
  stage_rejected: 'رفض مرحلة', stage_transitioned: 'تحويل مرحلة', commented: 'تعليق',
  attachment_added: 'إضافة مرفق', attachment_removed: 'حذف مرفق', task_updated: 'تحديث',
  task_completed: 'إكمال', task_approved: 'موافقة', task_rejected: 'رفض',
  priority_changed: 'تغيير أولوية', reassigned: 'إعادة إسناد', archived: 'أرشفة'
};

const ACTION_ICONS = {
  created: '🆕', stage_completed: '✅', stage_approved: '👍', stage_rejected: '❌',
  stage_transitioned: '🔄', commented: '💬', attachment_added: '📎', attachment_removed: '🗑️',
  task_updated: '✏️', task_completed: '✔️', task_approved: '👏', task_rejected: '🚫',
  priority_changed: '⚡', reassigned: '👤', archived: '📦'
};

const TimelineView = ({ timeline = [] }) => {
  if (!timeline.length) {
    return <p className="text-center text-gray-500 py-4">لا توجد أحداث في السجل الزمني</p>;
  }
  return (
    <div className="relative">
      <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      <div className="space-y-4">
        {timeline.map((entry) => (
          <div key={entry._id} className="flex items-start gap-4 relative">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-base z-10 shrink-0">
              {ACTION_ICONS[entry.action] || '📋'}
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-dark">
                  {entry.user?.name || 'النظام'}
                </span>
                <span className="text-xs text-gray-400 en-num">
                  {entry.createdAt ? formatDateArabic(entry.createdAt) : ''}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-primary">{ACTION_LABELS[entry.action] || entry.action}</span>
                {entry.description && <span>: {entry.description}</span>}
              </p>
              {entry.fromStage !== null && entry.toStage !== null && (
                <p className="text-xs text-gray-400 mt-1">
                  من المرحلة {entry.fromStage + 1} إلى المرحلة {entry.toStage + 1}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineView;
