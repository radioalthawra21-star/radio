import { formatDateArabic } from '../../utils/dateUtils';

const AttachmentList = ({ attachments = [], onDelete, loading }) => {
  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      {attachments.map((att) => (
        <div key={att._id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">📎</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-dark truncate">{att.originalName}</p>
              <p className="text-xs text-gray-400">
                {att.uploadedBy?.name} · {formatSize(att.fileSize)} · <span className="en-num">{att.createdAt ? formatDateArabic(att.createdAt) : ''}</span>
              </p>
            </div>
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(att._id)}
              disabled={loading}
              className="text-error hover:bg-error/10 p-1 rounded text-sm"
            >
              حذف
            </button>
          )}
        </div>
      ))}
      {attachments.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">لا توجد مرفقات</p>
      )}
    </div>
  );
};

export default AttachmentList;
