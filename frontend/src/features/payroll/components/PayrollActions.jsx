// frontend/src/features/payroll/components/PayrollActions.jsx

import React from 'react';
import { FaDownload, FaPrint, FaFileExcel, FaFilePdf, FaPlus, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

const PayrollActions = ({ 
  onExportExcel, 
  onExportPDF, 
  onPrint, 
  onAddNew, 
  onSaveAll, 
  onCancelAll,
  onStartEdit,
  isEditing,
  canEdit,
  canCreate,
  canExport 
}) => {
  return (
    <div className="payroll-actions flex flex-wrap gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      
      {/* زر التعديل/إنهاء التعديل */}
      {canEdit && (
        <button
          onClick={isEditing ? onCancelAll : onStartEdit}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isEditing
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isEditing ? <FaTimes className="h-4 w-4 mr-2" /> : <FaEdit className="h-4 w-4 mr-2" />}
          {isEditing ? 'إنهاء التعديل' : 'تعديل البيانات'}
        </button>
      )}

      {/* زر الحفظ الشامل */}
      {isEditing && canEdit && (
        <button
          onClick={onSaveAll}
          className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FaSave className="h-4 w-4 mr-2" />
          حفظ التغييرات
        </button>
      )}

      {/* زر إضافة جديد */}
      {canCreate && !isEditing && (
        <button
          onClick={onAddNew}
          className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FaPlus className="h-4 w-4 mr-2" />
          إضافة سجل جديد
        </button>
      )}

      {/* زر تصدير Excel */}
      {canExport && (
        <button
          onClick={onExportExcel}
          className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FaFileExcel className="h-4 w-4 mr-2" />
          تصدير Excel
        </button>
      )}

      {/* زر تصدير PDF */}
      {canExport && (
        <button
          onClick={onExportPDF}
          className="flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FaFilePdf className="h-4 w-4 mr-2" />
          تصدير PDF
        </button>
      )}

      {/* زر الطباعة */}
      <button
        onClick={onPrint}
        className="flex items-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <FaPrint className="h-4 w-4 mr-2" />
        طباعة
      </button>

      {/* زر التنزيل العام */}
      <button
        onClick={onExportExcel}
        className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <FaDownload className="h-4 w-4 mr-2" />
        تنزيل
      </button>

    </div>
  );
};

export default PayrollActions;