import { useState } from 'react';

const StageTransitionModal = ({ isOpen, onClose, onApprove, onReject, onTransition, stageName, isLastStage }) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAction = async (action) => {
    setLoading(true);
    try {
      if (action === 'approve') await onApprove(note);
      else if (action === 'reject') await onReject(note);
      else if (action === 'transition') await onTransition(note);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-dark mb-4">إدارة المرحلة: {stageName}</h3>
        <div className="mb-4">
          <label className="label">ملاحظات (اختياري)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input min-h-[80px]"
            placeholder="أضف ملاحظات للمرحلة..."
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleAction('approve')}
            disabled={loading}
            className="btn btn-success flex-1"
          >
            {isLastStage ? '✅ موافقة نهائية' : '👍 موافقة'}
          </button>
          {!isLastStage && (
            <button
              onClick={() => handleAction('transition')}
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              🔄 تحويل
            </button>
          )}
          <button
            onClick={() => handleAction('reject')}
            disabled={loading}
            className="btn btn-error flex-1"
          >
            ❌ رفض
          </button>
        </div>
        <button onClick={onClose} className="mt-3 text-sm text-gray-500 hover:text-dark w-full text-center">
          إلغاء
        </button>
      </div>
    </div>
  );
};

export default StageTransitionModal;
