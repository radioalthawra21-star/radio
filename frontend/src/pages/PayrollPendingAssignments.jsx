import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaCalendarAlt, FaBuilding, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { getPendingPayrollAssignments, assignSalaryToPendingPayroll } from '../services/payrollService';
import Card from '../components/common/Card';
import './PayrollPendingAssignments.css';

const PayrollPendingAssignments = () => {
  const [pendingEntries, setPendingEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });

  // Form state
  const [formData, setFormData] = useState({
    baseSalary: '',
    housingAllowance: '',
    transportAllowance: '',
    foodAllowance: '',
    communicationAllowance: '',
    periodStart: '',
    periodEnd: '',
    paymentDate: ''
  });

  const fetchPendingEntries = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const response = await getPendingPayrollAssignments({ page, limit: 10 });
      if (response.success) {
        setPendingEntries(response.data.pendingPayrolls);
        setPagination(response.data.pagination);
      } else {
        setError(response.message || 'حدث خطأ في جلب البيانات');
      }
    } catch (err) {
      console.error('Error fetching pending payroll assignments:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEntries();
  }, []);

  const handleOpenModal = (entry) => {
    setSelectedEntry(entry);
    // Pre-fill period dates with current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const paymentDate = new Date(now.getFullYear(), now.getMonth(), 25);

    setFormData({
      baseSalary: '',
      housingAllowance: '',
      transportAllowance: '',
      foodAllowance: '',
      communicationAllowance: '',
      periodStart: startOfMonth.toISOString().split('T')[0],
      periodEnd: endOfMonth.toISOString().split('T')[0],
      paymentDate: paymentDate.toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEntry(null);
    setFormData({
      baseSalary: '',
      housingAllowance: '',
      transportAllowance: '',
      foodAllowance: '',
      communicationAllowance: '',
      periodStart: '',
      periodEnd: '',
      paymentDate: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.baseSalary || parseFloat(formData.baseSalary) <= 0) {
      alert('يرجى إدخال راتب أساسي صحيح');
      return;
    }

    setSubmitting(true);

    // Build allowances array
    const allowances = [];
    if (formData.housingAllowance && parseFloat(formData.housingAllowance) > 0) {
      allowances.push({ type: 'housing', amount: parseFloat(formData.housingAllowance), description: 'بدل سكن' });
    }
    if (formData.transportAllowance && parseFloat(formData.transportAllowance) > 0) {
      allowances.push({ type: 'transport', amount: parseFloat(formData.transportAllowance), description: 'بدل نقل' });
    }
    if (formData.foodAllowance && parseFloat(formData.foodAllowance) > 0) {
      allowances.push({ type: 'food', amount: parseFloat(formData.foodAllowance), description: 'بدل غذاء' });
    }
    if (formData.communicationAllowance && parseFloat(formData.communicationAllowance) > 0) {
      allowances.push({ type: 'communication', amount: parseFloat(formData.communicationAllowance), description: 'بدل اتصالات' });
    }

    try {
      const response = await assignSalaryToPendingPayroll(selectedEntry._id, {
        baseSalary: parseFloat(formData.baseSalary),
        allowances,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        paymentDate: formData.paymentDate
      });

      if (response.success) {
        alert('تم إدخال بيانات الراتب بنجاح');
        handleCloseModal();
        fetchPendingEntries(pagination.currentPage);
      } else {
        alert(response.message || 'حدث خطأ أثناء الحفظ');
      }
    } catch (err) {
      console.error('Error assigning salary:', err);
      alert('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysSince = (dateString) => {
    if (!dateString) return 0;
    const created = new Date(dateString);
    if (isNaN(created.getTime())) return 0;
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('ar-EG');
    } catch (e) {
      return 'تاريخ غير صالح';
    }
  };

  return (
    <div className="pending-payroll-page animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2">
            مراجعة بيانات الرواتب الجديدة
          </h1>
          <p className="text-gray-600">
            قائمة الموظفين الجدد بانتظار إدخال بيانات الراتب
          </p>
        </div>
        <button
          onClick={() => fetchPendingEntries(pagination.currentPage)}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
        >
          <FaSpinner className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
        </div>
      ) : pendingEntries.length === 0 ? (
        /* Empty State */
        <Card className="p-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <span className="text-4xl">✅</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-xl">
            لا توجد بيانات بانتظار المراجعة
          </h3>
          <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
            جميع الموظفين الجدد لديهم بيانات راتب مكتملة. سيتم إضافة أي موظف جديد تلقائياً إلى هذه القائمة.
          </p>
        </Card>
      ) : (
        /* Pending Entries Table */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-right font-bold text-gray-700">الموظف</th>
                  <th className="p-4 text-right font-bold text-gray-700">البريد الإلكتروني</th>
                  <th className="p-4 text-right font-bold text-gray-700">القسم</th>
                  <th className="p-4 text-right font-bold text-gray-700">تاريخ التسجيل</th>
                  <th className="p-4 text-right font-bold text-gray-700">مدة الانتظار</th>
                  <th className="p-4 text-right font-bold text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {entry.employee?.name?.charAt(0) || 'م'}
                        </div>
                        <div>
                          <div className="font-semibold text-dark">
                            {entry.employee?.name || 'غير معروف'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.employee?.username || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">
                      {entry.employee?.email || '—'}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <FaBuilding className="ml-1 text-xs" />
                        {entry.employee?.department || 'غير محدد'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">
                      {formatDate(entry.employee?.startDate) || formatDate(entry.createdAt)}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getDaysSince(entry.createdAt) > 7
                          ? 'bg-red-100 text-red-800'
                          : getDaysSince(entry.createdAt) > 3
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {getDaysSince(entry.createdAt)} يوم
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleOpenModal(entry)}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                        title="إدخال بيانات الراتب"
                      >
                        <FaMoneyBillWave />
                        إدخال الراتب
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-sm">
              <div className="text-gray-600">
                عرض {((pagination.currentPage - 1) * 10) + 1} - {Math.min(pagination.currentPage * 10, pagination.totalItems)} من {pagination.totalItems} سجل
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchPendingEntries(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  السابق
                </button>
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => fetchPendingEntries(i + 1)}
                    className={`w-8 h-8 rounded ${pagination.currentPage === i + 1 ? 'bg-primary text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => fetchPendingEntries(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

       {/* Modal for Salary Assignment */}
       {showModal && selectedEntry && (
         <div className="modal-overlay" onClick={handleCloseModal}>
           <div className="modal-content" onClick={e => e.stopPropagation()}>
             {/* Modal Header */}
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold text-dark flex items-center gap-3">
                 <FaMoneyBillWave className="text-primary" />
                 إدخال بيانات الراتب
               </h2>
               <button
                 onClick={handleCloseModal}
                 className="text-gray-400 hover:text-gray-600 text-2xl"
               >
                 ×
               </button>
             </div>

             {/* Employee Info Summary */}
             <div className="bg-gray-50 rounded-lg p-4 mb-6">
               <h3 className="font-semibold text-dark mb-2">معلومات الموظف</h3>
               <div className="grid grid-cols-2 gap-4 text-sm">
                 <div>
                   <span className="text-gray-600">الاسم:</span>
                   <span className="font-medium mr-2">{selectedEntry.employee?.name}</span>
                 </div>
                 <div>
                   <span className="text-gray-600">البريد:</span>
                   <span className="font-medium mr-2">{selectedEntry.employee?.email}</span>
                 </div>
                 <div>
                   <span className="text-gray-600">القسم:</span>
                   <span className="font-medium mr-2">{selectedEntry.employee?.department}</span>
                 </div>
                 <div>
                   <span className="text-gray-600">تاريخ التعيين:</span>
                   <span className="font-medium mr-2">{formatDate(selectedEntry.employee?.startDate)}</span>
                 </div>
               </div>
             </div>

             {/* Salary Entry Form */}
             <form onSubmit={handleSubmit}>
               <div className="space-y-4">
                 {/* Base Salary - Required */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     الراتب الأساسي <span className="text-red-500">*</span>
                   </label>
                   <input
                     type="number"
                     name="baseSalary"
                     value={formData.baseSalary}
                     onChange={handleInputChange}
                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                     placeholder="أدخل الراتب الأساسي"
                     required
                     min="0"
                     step="0.01"
                   />
                 </div>

                 {/* Allowances */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     البدلات
                   </label>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">بدل سكن</label>
                       <input
                         type="number"
                         name="housingAllowance"
                         value={formData.housingAllowance}
                         onChange={handleInputChange}
                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                         placeholder="0"
                         min="0"
                       />
                     </div>
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">بدل نقل</label>
                       <input
                         type="number"
                         name="transportAllowance"
                         value={formData.transportAllowance}
                         onChange={handleInputChange}
                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                         placeholder="0"
                         min="0"
                       />
                     </div>
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">بدل غذاء</label>
                       <input
                         type="number"
                         name="foodAllowance"
                         value={formData.foodAllowance}
                         onChange={handleInputChange}
                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                         placeholder="0"
                         min="0"
                       />
                     </div>
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">بدل اتصالات</label>
                       <input
                         type="number"
                         name="communicationAllowance"
                         value={formData.communicationAllowance}
                         onChange={handleInputChange}
                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                         placeholder="0"
                         min="0"
                       />
                     </div>
                   </div>
                 </div>

                 {/* Period Dates */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     فترة الدفع
                   </label>
                   <div className="grid grid-cols-3 gap-4">
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">تاريخ البداية</label>
                       <input
                         type="date"
                         name="periodStart"
                         value={formData.periodStart}
                         onChange={handleInputChange}
                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                         required
                       />
                     </div>
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">تاريخ النهاية</label>
                       <input
                         type="date"
                         name="periodEnd"
                         value={formData.periodEnd}
                         onChange={handleInputChange}
                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                         required
                       />
                     </div>
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">تاريخ الدفع</label>
                       <input
                         type="date"
                         name="paymentDate"
                         value={formData.paymentDate}
                         onChange={handleInputChange}
                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                         required
                       />
                     </div>
                   </div>
                 </div>

                 {/* Form Actions */}
                 <div className="flex justify-end gap-3 pt-4">
                   <button
                     type="button"
                     onClick={handleCloseModal}
                     className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                   >
                     إلغاء
                   </button>
                   <button
                     type="submit"
                     disabled={submitting}
                     className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                   >
                     {submitting ? (
                       <>
                         <FaSpinner className="animate-spin" />
                         جاري الحفظ...
                       </>
                     ) : (
                       <>
                         <FaCheckCircle />
                         حفظ وإكمال
                       </>
                     )}
                   </button>
                 </div>
               </div>
             </form>
           </div>
         </div>
       )}
    </div>
  );
};

export default PayrollPendingAssignments;
