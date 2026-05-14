export default function DeleteColumnModal({ columnToDelete, onConfirm, onClose }) {
  if (columnToDelete === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">تأكيد حذف العمود</h3>
        <p className="text-sm text-gray-600 mb-6">
          هل أنت متأكد من حذف هذا العمود؟ سيتم إزالة العمود وجميع قيمه من جميع الموظفين.
        </p>
        <div className="flex justify-left space-x-3">
          <button onClick={() => onConfirm(columnToDelete)}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
            حذف
          </button>
          <button onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
