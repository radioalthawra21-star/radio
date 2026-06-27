import { formatDateArabic } from '../../utils/dateUtils';

const ACTION_LABELS = {
  created: 'إنشاء',
  transferred: 'تحويل',
  reassigned: 'إعادة إسناد',
  department_changed: 'تغيير القسم',
  employee_changed: 'تغيير الموظف',
  status_changed: 'تغيير الحالة',
  stage_transitioned: 'تحويل مرحلة',
  stage_approved: 'موافقة مرحلة',
  stage_rejected: 'رفض مرحلة',
  task_completed: 'إكمال',
  task_evaluated: 'تقييم',
  task_approved: 'موافقة',
  task_final_approved: 'موافقة نهائية',
  returned: 'إعادة',
  commented: 'تعليق',
  attachment_added: 'إضافة مرفق',
  attachment_removed: 'حذف مرفق',
  task_updated: 'تحديث',
  archived: 'أرشفة'
};

const ACTION_ICONS = {
  created: '🆕',
  transferred: '🔄',
  reassigned: '👤',
  department_changed: '🏢',
  employee_changed: '👤',
  status_changed: '📌',
  stage_transitioned: '⏩',
  stage_approved: '✅',
  stage_rejected: '❌',
  task_completed: '✔️',
  task_evaluated: '⭐',
  task_approved: '👏',
  task_final_approved: '🎯',
  returned: '↩️',
  commented: '💬',
  attachment_added: '📎',
  attachment_removed: '🗑️',
  task_updated: '✏️',
  archived: '📦'
};

const JourneyTree = ({ journey = [] }) => {
  if (!journey.length) {
    return <p className="text-center text-gray-500 py-8">لا توجد بيانات رحلة للمهمة</p>;
  }

  return (
    <div className="relative py-4" dir="ltr">
      <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      <div className="space-y-0">
        {journey.map((step, index) => {
          const isLast = index === journey.length - 1;
          const deptName = step.department?.name || step.department?.label || '';
          const deptColor = step.department?.color || '#3B82F6';
          const userName = step.user?.name || '';

          return (
            <div key={step._id || index} className="flex items-start gap-4 relative">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base z-10 shrink-0"
                style={{
                  backgroundColor: deptColor ? `${deptColor}20` : '#182E4E20',
                  border: `2px solid ${deptColor || '#182E4E'}`,
                  color: deptColor || '#182E4E'
                }}
              >
                {ACTION_ICONS[step.actionType] || '📋'}
              </div>
              <div className="flex-1 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-dark">
                      {ACTION_LABELS[step.actionType] || step.actionType}
                    </span>
                    {deptName && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${deptColor}20`,
                          color: deptColor
                        }}
                      >
                        {deptName}
                      </span>
                    )}
                    {userName && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                        {userName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 en-num shrink-0">
                    {step.timestamp ? formatDateArabic(step.timestamp) : ''}
                  </span>
                </div>
                {step.performedBy && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    بواسطة: {step.performedBy.name}
                  </p>
                )}
                {step.notes && (
                  <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">
                    {step.notes}
                  </p>
                )}
              </div>
              {!isLast && (
                <div className="absolute right-4 top-10 bottom-0 w-0.5 bg-gray-200"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JourneyTree;
