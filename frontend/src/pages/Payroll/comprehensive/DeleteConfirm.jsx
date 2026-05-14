import { FaTrash, FaTimes } from 'react-icons/fa';

export default function DeleteConfirm({
  columnToDelete, handleDeleteDynamicColumn, onClose
}) {
  if (!columnToDelete) return null;

  const onConfirm = () => {
    handleDeleteDynamicColumn(columnToDelete);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(e); }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>تأكيد الحذف</h2>
        <p>هل أنت متأكد من حذف عمود "{columnToDelete.label}"؟</p>
        <div className="modal-actions">
          <button onClick={onConfirm} className="btn-danger">
            <FaTrash /> حذف
          </button>
          <button onClick={onClose} className="btn-cancel">
            <FaTimes /> إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
