import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaEdit, FaSave, FaTimes, FaPlus, FaTrash, FaDownload, FaPrint, FaColumns } from 'react-icons/fa';
import DynamicNumber from '../../../components/DynamicNumber';
import { usePayroll } from '../hooks/usePayrollState.jsx';

const DEFAULT_COLUMNS = [
  { key: 'employeeName', label: 'الموظف', type: 'text', deletable: false, category: 'info' },
  { key: 'basicSalary', label: 'الراتب الأساسي', type: 'number', deletable: false, category: 'earning' },
  { key: 'housingAllowance', label: 'بدل السكن', type: 'number', deletable: true, category: 'earning' },
  { key: 'transportAllowance', label: 'بدل المواصلات', type: 'number', deletable: true, category: 'earning' },
  { key: 'foodAllowance', label: 'بدل الطعام', type: 'number', deletable: true, category: 'earning' },
  { key: 'communicationAllowance', label: 'بدل الاتصالات', type: 'number', deletable: true, category: 'earning' },
  { key: 'otherAllowances', label: 'بدل أخرى', type: 'number', deletable: true, category: 'earning' },
  { key: 'bonuses', label: 'المكافآت', type: 'number', deletable: true, category: 'earning' },
  { key: 'overtime', label: 'ساعات إضافية', type: 'number', deletable: true, category: 'earning' },
  { key: 'deductions', label: 'الخصومات', type: 'number', deletable: false, category: 'deduction' },
  { key: 'netPay', label: 'الراتب الصافي', type: 'calculated', deletable: false, category: 'calculated' },
];

const STORAGE_KEYS = {
  activeColumns: 'payroll_activeColumns',
  dynamicColumns: 'payroll_dynamicColumns',
};

const getAllDefaultKeys = () => DEFAULT_COLUMNS.map(c => c.key);

const loadFromStorage = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return fallback;
};

const EditablePayrollTable = ({ data = [], onSave, onDelete, onAdd, onBulkUpdate }) => {
  const { isEditMode, isAddingNew, canEdit, canCreate, canDelete, toggleEditMode, startAddingNew, cancelEditing } = usePayroll();
  const [editingRows, setEditingRows] = useState({});
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState(null);
  const [newColumnForm, setNewColumnForm] = useState({ label: '', defaultValue: '', category: 'allowance' });

  const [activeColumns, setActiveColumns] = useState(() =>
    loadFromStorage(STORAGE_KEYS.activeColumns, getAllDefaultKeys())
  );

  const [dynamicColumns, setDynamicColumns] = useState(() =>
    loadFromStorage(STORAGE_KEYS.dynamicColumns, [])
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.activeColumns, JSON.stringify(activeColumns));
  }, [activeColumns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.dynamicColumns, JSON.stringify(dynamicColumns));
  }, [dynamicColumns]);

  const allColumns = useMemo(() => {
    const filteredDefaults = DEFAULT_COLUMNS.filter(col => activeColumns.includes(col.key));
    const dynamicMapped = dynamicColumns.map((dc, idx) => ({
      key: `dynamic_${dc.id}`,
      label: dc.label,
      type: 'number',
      deletable: true,
      category: dc.category === 'allowance' ? 'earning' : 'deduction',
      isDynamic: true,
      dynamicId: dc.id,
      defaultValue: dc.defaultValue,
    }));
    const info = filteredDefaults.filter(c => c.category === 'info');
    const earning = filteredDefaults.filter(c => c.category === 'earning');
    const dynamicEarning = dynamicMapped.filter(c => c.category === 'earning');
    const deduction = filteredDefaults.filter(c => c.category === 'deduction');
    const dynamicDeduction = dynamicMapped.filter(c => c.category === 'deduction');
    const calculated = filteredDefaults.filter(c => c.category === 'calculated');
    return [...info, ...earning, ...dynamicEarning, ...deduction, ...dynamicDeduction, ...calculated];
  }, [activeColumns, dynamicColumns]);

  const safeParse = (value) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculateNetPay = (row) => {
    let gross = 0;
    let totalDeductions = 0;
    allColumns.forEach(col => {
      if (col.category === 'earning') {
        gross += safeParse(row[col.key]);
      } else if (col.category === 'deduction') {
        totalDeductions += safeParse(row[col.key]);
      }
    });
    return (gross - totalDeductions).toFixed(2);
  };

  const getDynamicColumnsForRow = (row) => {
    const result = {};
    dynamicColumns.forEach(dc => {
      const key = `dynamic_${dc.id}`;
      if (row[key] !== undefined) {
        result[key] = row[key];
      }
    });
    return result;
  };

  const handleInputChange = (rowId, field, value) => {
    setEditingRows(prev => {
      const currentRow = prev[rowId] || {};
      const updatedRow = { ...currentRow, [field]: value };
      return {
        ...prev,
        [rowId]: {
          ...updatedRow,
          netPay: calculateNetPay(updatedRow),
        }
      };
    });
  };

  const handleNewRowChange = (field, value) => {
    setNewRow(prev => {
      const updated = { ...prev, [field]: value };
      updated.netPay = calculateNetPay(updated);
      return updated;
    });
  };

  const [newRow, setNewRow] = useState(() => {
    const initial = { employeeName: '', netPay: '' };
    allColumns.forEach(col => {
      if (col.type === 'number' && col.key !== 'netPay') {
        initial[col.key] = '';
      }
    });
    return initial;
  });

  const resetNewRow = useCallback(() => {
    const initial = { employeeName: '', netPay: '' };
    allColumns.forEach(col => {
      if (col.type === 'number' && col.key !== 'netPay') {
        initial[col.key] = '';
      }
    });
    setNewRow(initial);
  }, [allColumns]);

  const startEditing = (row) => {
    const rowData = { ...row };
    dynamicColumns.forEach(dc => {
      const key = `dynamic_${dc.id}`;
      if (rowData[key] === undefined) {
        rowData[key] = dc.defaultValue !== undefined && dc.defaultValue !== '' ? Number(dc.defaultValue) : 0;
      }
    });
    setEditingRows(prev => ({
      ...prev,
      [row.id]: rowData,
    }));
  };

  const saveRow = (rowId) => {
    if (onSave && editingRows[rowId]) {
      onSave(rowId, editingRows[rowId]);
      setEditingRows(prev => {
        const newState = { ...prev };
        delete newState[rowId];
        return newState;
      });
    }
  };

  const cancelEditingRow = (rowId) => {
    setEditingRows(prev => {
      const newState = { ...prev };
      delete newState[rowId];
      return newState;
    });
  };

  const handleAddNew = () => {
    if (onAdd && newRow.employeeName) {
      const rowData = { ...newRow, id: Date.now(), netPay: calculateNetPay(newRow) };
      dynamicColumns.forEach(dc => {
        const key = `dynamic_${dc.id}`;
        if (rowData[key] === undefined || rowData[key] === '') {
          rowData[key] = dc.defaultValue !== undefined && dc.defaultValue !== '' ? Number(dc.defaultValue) : 0;
        }
      });
      onAdd(rowData);
      resetNewRow();
    }
  };

  useEffect(() => {
    if (!isEditMode) {
      setEditingRows({});
    }
  }, [isEditMode]);

  useEffect(() => {
    if (!isAddingNew) {
      resetNewRow();
    }
  }, [isAddingNew, resetNewRow]);

  const toggleColumnVisibility = (colKey) => {
    const col = DEFAULT_COLUMNS.find(c => c.key === colKey);
    if (col && !col.deletable) return;
    setActiveColumns(prev => {
      if (prev.includes(colKey)) {
        return prev.filter(k => k !== colKey);
      }
      return [...prev, colKey];
    });
  };

  const handleAddDynamicColumn = () => {
    if (!newColumnForm.label.trim()) return;
    const newCol = {
      id: Date.now(),
      label: newColumnForm.label.trim(),
      defaultValue: newColumnForm.defaultValue !== '' ? Number(newColumnForm.defaultValue) : 0,
      category: newColumnForm.category,
    };
    const key = `dynamic_${newCol.id}`;
    if (onBulkUpdate) {
      const updates = {};
      data.forEach(row => {
        updates[row.id] = { [key]: newCol.defaultValue };
      });
      onBulkUpdate(updates);
    }
    setDynamicColumns(prev => [...prev, newCol]);
    setNewColumnForm({ label: '', defaultValue: '', category: 'allowance' });
  };

  const handleDeleteDynamicColumn = (colId) => {
    const key = `dynamic_${colId}`;
    if (onBulkUpdate) {
      const updates = {};
      data.forEach(row => {
        updates[row.id] = { [key]: undefined };
      });
      onBulkUpdate(updates);
    }
    setDynamicColumns(prev => prev.filter(dc => dc.id !== colId));
    setColumnToDelete(null);
  };

  const getEditableColumns = () => allColumns.filter(col => col.key !== 'netPay' && col.key !== 'employeeName');

  const exportToExcel = () => {
    const headers = allColumns.map(col => col.label);
    const rows = data.map(row =>
      allColumns.map(col => row[col.key] !== undefined ? row[col.key] : '')
    );
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Payroll_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printTable = () => {
    window.print();
  };

  const getColCategory = (col) => {
    if (col.isDynamic) return col.category === 'earning' ? 'allowance' : 'deduction';
    return col.category;
  };

  const inputClass = "w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm";
  const inputEditClass = "w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm";

  const renderCell = (row, col, isEditing) => {
    if (!isEditing) {
      if (col.key === 'employeeName') {
        return <span className="font-medium text-gray-900">{row[col.key]}</span>;
      }
      if (col.key === 'netPay') {
        return <DynamicNumber value={row[col.key]} />;
      }
      return <DynamicNumber value={row[col.key]} className="text-gray-900" />;
    }

    const val = row[col.key] !== undefined ? row[col.key] : '';
    if (col.key === 'employeeName') {
      return (
        <input
          type="text"
          value={val}
          onChange={(e) => handleInputChange(row.id, col.key, e.target.value)}
          className={inputEditClass}
        />
      );
    }
    if (col.key === 'netPay') {
      return (
        <span className="bg-emerald-50 px-3 py-1 rounded-lg">
          <DynamicNumber value={calculateNetPay(row)} />
        </span>
      );
    }
    return (
      <input
        type="number"
        value={val}
        onChange={(e) => handleInputChange(row.id, col.key, e.target.value)}
        className={inputEditClass}
      />
    );
  };

  const renderNewRowCell = (col) => {
    const val = newRow[col.key] !== undefined ? newRow[col.key] : '';
    if (col.key === 'employeeName') {
      return (
        <input
          type="text"
          value={val}
          onChange={(e) => handleNewRowChange(col.key, e.target.value)}
          placeholder="اسم الموظف"
          className={inputClass}
        />
      );
    }
    if (col.key === 'netPay') {
      return (
        <DynamicNumber value={newRow.netPay} />
      );
    }
    return (
      <input
        type="number"
        value={val}
        onChange={(e) => handleNewRowChange(col.key, e.target.value)}
        className={inputClass}
        placeholder="0"
      />
    );
  };

  const colSpan = allColumns.length + ((isEditMode || isAddingNew) ? 1 : 0);

  return (
    <div className="payroll-table-container" dir="rtl">
      <div className="flex justify-between items-center mb-6 p-4 bg-white rounded-lg shadow-sm">
        <div className="flex space-x-3">
          {canEdit && (
            <button
              onClick={toggleEditMode}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                isEditMode
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <FaEdit className="h-4 w-4 ml-1" />
              <span>{isEditMode ? 'إنهاء التعديل' : 'تعديل'}</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={startAddingNew}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FaPlus className="h-4 w-4 ml-1" />
              <span>إضافة جديد</span>
            </button>
          )}

          {isEditMode && (
            <button
              onClick={() => setShowColumnManager(true)}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FaColumns className="h-4 w-4 ml-1" />
              <span>إدارة الأعمدة</span>
            </button>
          )}

          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaDownload className="h-4 w-4 ml-1" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={printTable}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaPrint className="h-4 w-4 ml-1" />
            <span>طباعة</span>
          </button>
        </div>

        <div className="text-sm text-gray-600">
          وضع التشغيل: <span className={`font-semibold ${
            isEditMode ? 'text-orange-600' : 'text-green-600'
          }`}>
            {isEditMode ? 'وضع التعديل' : 'وضع القراءة'}
          </span>
        </div>
      </div>

      {/* Column Manager Modal */}
      {showColumnManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowColumnManager(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">إدارة الأعمدة</h3>
              <button onClick={() => setShowColumnManager(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Default columns toggles */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">الأعمدة الأساسية</h4>
                <div className="space-y-2">
                  {DEFAULT_COLUMNS.filter(c => c.key !== 'netPay').map(col => (
                    <div key={col.key} className="flex items-center justify-between py-1">
                      <span className={`text-sm ${!col.deletable ? 'text-gray-400' : 'text-gray-700'}`}>
                        {col.label}
                        <span className="text-xs text-gray-400 mr-2">({getColCategory(col)})</span>
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={activeColumns.includes(col.key)}
                          onChange={() => toggleColumnVisibility(col.key)}
                          disabled={!col.deletable}
                        />
                        <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 ${!col.deletable ? 'opacity-50' : ''}`}></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic columns */}
              {dynamicColumns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">الأعمدة المضافة</h4>
                  <div className="space-y-2">
                    {dynamicColumns.map(dc => (
                      <div key={dc.id} className="flex items-center justify-between py-1 px-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="text-sm text-gray-700">{dc.label}</span>
                          <span className="text-xs text-gray-400 mr-2">
                            ({dc.category === 'allowance' ? 'بدل' : 'خصم'} - القيمة الافتراضية: {dc.defaultValue})
                          </span>
                        </div>
                        <button
                          onClick={() => setColumnToDelete(dc.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="حذف العمود"
                        >
                          <FaTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new column form */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">إضافة عمود جديد</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">اسم العمود</label>
                    <input
                      type="text"
                      value={newColumnForm.label}
                      onChange={e => setNewColumnForm(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="مثال: بدل السكن الإضافي"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">القيمة الافتراضية</label>
                    <input
                      type="number"
                      value={newColumnForm.defaultValue}
                      onChange={e => setNewColumnForm(prev => ({ ...prev, defaultValue: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">الفئة</label>
                    <select
                      value={newColumnForm.category}
                      onChange={e => setNewColumnForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    >
                      <option value="allowance">بدل / إضافة</option>
                      <option value="deduction">خصم</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddDynamicColumn}
                    disabled={!newColumnForm.label.trim()}
                    className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-lg text-sm transition-colors"
                  >
                    <FaPlus className="h-3.5 w-3.5 inline ml-1" />
                    إضافة العمود
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {columnToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">تأكيد حذف العمود</h3>
            <p className="text-sm text-gray-600 mb-6">
              هل أنت متأكد من حذف هذا العمود؟ سيتم إزالة العمود وجميع قيمه من جميع الموظفين.
            </p>
            <div className="flex justify-left space-x-3">
              <button
                onClick={() => handleDeleteDynamicColumn(columnToDelete)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
              >
                حذف
              </button>
              <button
                onClick={() => setColumnToDelete(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <tr>
                {allColumns.map(col => (
                  <th key={col.key} className="px-6 py-4 text-right text-sm font-semibold uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
                {(isEditMode || isAddingNew) && (
                  <th className="px-6 py-4 text-right text-sm font-semibold uppercase tracking-wider">إجراءات</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white">
              {/* New row */}
              {(isEditMode && isAddingNew) && (
                <tr className="bg-emerald-50 border-l-4 border-emerald-400">
                  {allColumns.map(col => (
                    <td key={col.key} className={`px-6 py-4 ${col.key === 'netPay' ? 'font-semibold text-emerald-600 bg-emerald-50' : ''}`}>
                      {renderNewRowCell(col)}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddNew}
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors" title="حفظ">
                        <FaSave className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors" title="إلغاء">
                        <FaTimes className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Existing data */}
              {data.map((row) => {
                const isEditingRow = editingRows[row.id] && isEditMode && canEdit;
                const displayRow = isEditingRow ? editingRows[row.id] : row;
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      isEditingRow ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                    }`}
                  >
                    {allColumns.map(col => (
                      <td key={col.key} className={`px-6 py-4 whitespace-nowrap ${
                        col.key === 'netPay' ? 'font-semibold text-emerald-600' : ''
                      }`}>
                        {renderCell({ ...displayRow, id: row.id }, col, isEditingRow)}
                      </td>
                    ))}
                    {(isEditMode || isAddingNew) && (
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          {isEditMode && canEdit && (
                            <>
                              {!isEditingRow ? (
                                <button
                                  onClick={() => startEditing(row)}
                                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="تعديل">
                                  <FaEdit className="h-4 w-4" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => saveRow(row.id)}
                                    className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="حفظ">
                                    <FaSave className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => cancelEditingRow(row.id)}
                                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="إلغاء">
                                    <FaTimes className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => onDelete && onDelete(row.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف">
                              <FaTrash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {data.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <p className="text-lg font-medium">لا توجد بيانات حالياً</p>
                      {canCreate && (
                        <button
                          onClick={startAddingNew}
                          className="text-blue-500 hover:text-blue-600 font-medium flex items-center space-x-1">
                          <FaPlus className="h-4 w-4 ml-1" />
                          <span>إضافة أول سجل</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hint */}
      {isEditMode && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
          </svg>
          <div className="text-sm text-blue-700">
            أنت الآن في وضع التعديل. يمكنك تعديل البيانات مباشرة في الجدول أو إدارة الأعمدة عبر زر "إدارة الأعمدة".
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(EditablePayrollTable);
