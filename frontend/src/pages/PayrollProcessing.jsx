import React, { useState, useEffect } from 'react';
import { FaCalculator, FaMoneyBillWave, FaCheckCircle, FaTimesCircle, FaClock, FaDownload, FaPrint, FaEye, FaFileInvoice } from 'react-icons/fa';
import DynamicNumber from '../components/DynamicNumber';
import { getAllPayrolls } from '../services/payrollService';
import api from '../services/api';
import './PayrollProcessing.css';

const PayrollProcessing = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getAllPayrolls({ limit: 200 });
        if (response.success) {
          setPayrolls(response.data?.payrolls || []);
        }
      } catch (err) {
        console.error('Error loading payrolls:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pendingPayrolls = payrolls.filter(p => p.status === 'pending');
  const approvedPayrolls = payrolls.filter(p => p.status === 'approved');
  const paidPayrolls = payrolls.filter(p => p.status === 'paid');

  const totalGross = payrolls.reduce((s, p) => s + (p.totals?.gross || 0), 0);
  const totalDeductions = payrolls.reduce((s, p) => s + (p.totals?.deductions || 0), 0);
  const totalNet = payrolls.reduce((s, p) => s + (p.totals?.net || 0), 0);

  const formatCurrency = (amount, size = 'normal') => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    const fullText = `${formatted} $`;

    const sizeMap = {
      small: { base: '0.75rem', min: '0.5rem' },
      normal: { base: '0.875rem', min: '0.5rem' },
      large: { base: '1.125rem', min: '0.5625rem' },
      xl: { base: '1.5rem', min: '0.625rem' },
      xxl: { base: '1.875rem', min: '0.75rem' },
    };

    const s = sizeMap[size] || sizeMap.normal;
    return (
      <DynamicNumber
        value={fullText}
        baseSize={s.base}
        minSize={s.min}
      />
    );
  };

  const handleApprove = async (payrollId) => {
    try {
      await api.put(`/payroll/${payrollId}/approve`);
      setPayrolls(prev =>
        prev.map(p => p._id === payrollId ? { ...p, status: 'approved' } : p)
      );
    } catch (err) {
      console.error('Error approving payroll:', err);
      alert('فشل في اعتماد كشف الراتب');
    }
  };

  const handlePay = async (payrollId) => {
    try {
      await api.put(`/payroll/${payrollId}/pay`);
      setPayrolls(prev =>
        prev.map(p => p._id === payrollId ? { ...p, status: 'paid' } : p)
      );
    } catch (err) {
      console.error('Error marking as paid:', err);
      alert('فشل في تسجيل الدفع');
    }
  };

  const handleApproveAll = async () => {
    if (pendingPayrolls.length === 0) return;
    if (!window.confirm(`هل أنت متأكد من اعتماد ${pendingPayrolls.length} كشف راتب؟`)) return;

    setProcessing(true);
    for (const p of pendingPayrolls) {
      try {
        await api.put(`/payroll/${p._id}/approve`);
      } catch (err) {
        console.error(`Failed to approve ${p._id}:`, err);
      }
    }
    setPayrolls(prev =>
      prev.map(p => p.status === 'pending' ? { ...p, status: 'approved' } : p)
    );
    setProcessing(false);
  };

  const statusLabels = {
    pending: 'معلق',
    approved: 'معتمد',
    paid: 'مدفوع',
    draft: 'مسودة',
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="payroll-processing-page">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaCalculator className="h-8 w-8 ml-3 text-purple-600" />
              معالجة الرواتب
            </h1>
            <p className="text-gray-600 mt-1">اعتماد وتسجيل كشوف رواتب الموظفين</p>
          </div>
          <div className="flex gap-3">
            {pendingPayrolls.length > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={processing}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-purple-700 disabled:opacity-50"
              >
                <FaCheckCircle className="h-4 w-4 ml-2" />
                {processing ? 'جاري الاعتماد...' : `اعتماد الكل (${pendingPayrolls.length})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ملخص سريع */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-yellow-100 p-2 rounded-lg"><FaClock className="h-5 w-5 text-yellow-600" /></div>
            <span className="text-sm text-gray-500">معلقة</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{pendingPayrolls.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-lg"><FaCheckCircle className="h-5 w-5 text-blue-600" /></div>
            <span className="text-sm text-gray-500">معتمدة</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{approvedPayrolls.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 p-2 rounded-lg"><FaMoneyBillWave className="h-5 w-5 text-green-600" /></div>
            <span className="text-sm text-gray-500">مدفوعة</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{paidPayrolls.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-100 p-2 rounded-lg"><FaCalculator className="h-5 w-5 text-purple-600" /></div>
            <span className="text-sm text-gray-500">الإجمالي</span>
          </div>
          <p className="text-xl font-bold text-purple-700">{payrolls.length} كشف</p>
        </div>
      </div>

      {/* كشوف معلقة */}
      {pendingPayrolls.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FaClock className="h-5 w-5 ml-2 text-yellow-600" />
            كشوف معلقة للاعتماد
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الموظف</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفترة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجمالي</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخصومات</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصافي</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingPayrolls.map(p => (
                  <tr key={p._id} className="bg-yellow-50/30">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {p.employee?.name || 'غير معروف'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {p.periodStart ? new Date(p.periodStart).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-cell">{formatCurrency(p.totals?.gross || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-cell">{formatCurrency(p.totals?.deductions || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-cell font-semibold text-green-700">{formatCurrency(p.totals?.net || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPayroll(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="عرض التفاصيل"
                        >
                          <FaEye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleApprove(p._id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="اعتماد"
                        >
                          <FaCheckCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* كشوف معتمدة */}
      {approvedPayrolls.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FaCheckCircle className="h-5 w-5 ml-2 text-blue-600" />
            كشوف معتمدة بانتظار الدفع
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الموظف</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفترة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصافي</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {approvedPayrolls.map(p => (
                  <tr key={p._id} className="bg-blue-50/30">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {p.employee?.name || 'غير معروف'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {p.periodStart ? new Date(p.periodStart).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-cell font-semibold text-green-700">{formatCurrency(p.totals?.net || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handlePay(p._id)}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        تسجيل الدفع
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* جميع الكشوف */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FaFileInvoice className="h-5 w-5 ml-2 text-purple-600" />
          جميع كشوف الرواتب
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الموظف</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفترة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجمالي</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصافي</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    لا توجد كشوف رواتب
                  </td>
                </tr>
              ) : (
                payrolls.slice(0, 100).map(p => (
                  <tr key={p._id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {p.employee?.name || 'غير معروف'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {p.periodStart ? new Date(p.periodStart).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-cell">{formatCurrency(p.totals?.gross || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-cell font-semibold text-green-700">{formatCurrency(p.totals?.net || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[p.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedPayroll(p)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="عرض التفاصيل"
                      >
                        <FaEye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {payrolls.length > 100 && (
          <p className="text-sm text-gray-500 mt-4 text-center">
            عرض أول 100 من أصل {payrolls.length} كشف
          </p>
        )}
      </div>

      {/* عرض تفاصيل كشف راتب */}
      {selectedPayroll && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPayroll(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  كشف راتب - {selectedPayroll.employee?.name || 'غير معروف'}
                </h2>
                <button
                  onClick={() => setSelectedPayroll(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <FaTimesCircle className="h-5 w-5" />
                </button>
              </div>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedPayroll.status] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[selectedPayroll.status] || selectedPayroll.status}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">الفترة:</span>
                  <p className="font-medium">
                    {selectedPayroll.periodStart ? new Date(selectedPayroll.periodStart).toLocaleDateString('ar-EG') : '-'} - {selectedPayroll.periodEnd ? new Date(selectedPayroll.periodEnd).toLocaleDateString('ar-EG') : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">الراتب الأساسي:</span>
                  <p className="font-medium">{formatCurrency(selectedPayroll.baseSalary || 0)}</p>
                </div>
              </div>

              {selectedPayroll.components?.allowances?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">البدلات</h3>
                  <div className="space-y-1">
                    {selectedPayroll.components.allowances.map((a, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{a.type === 'housing' ? 'بدل السكن' : a.type === 'transport' ? 'بدل المواصلات' : a.type === 'food' ? 'بدل الطعام' : a.type === 'communication' ? 'بدل الاتصالات' : a.type}</span>
                        <span className="font-medium">{formatCurrency(a.amount || 0, 'small')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>الإجمالي</span>
                  <span className="text-blue-600">{formatCurrency(selectedPayroll.totals?.gross || 0, 'large')}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-1">
                  <span>الخصومات</span>
                  <span className="text-red-600">{formatCurrency(selectedPayroll.totals?.deductions || 0, 'large')}</span>
                </div>
                <div className="flex justify-between font-bold text-xl mt-2 text-green-700">
                  <span>الصافي</span>
                  <span>{formatCurrency(selectedPayroll.totals?.net || 0, 'xl')}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              {selectedPayroll.status === 'pending' && (
                <button
                  onClick={() => { handleApprove(selectedPayroll._id); setSelectedPayroll(null); }}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  اعتماد
                </button>
              )}
              {selectedPayroll.status === 'approved' && (
                <button
                  onClick={() => { handlePay(selectedPayroll._id); setSelectedPayroll(null); }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  تسجيل الدفع
                </button>
              )}
              <button
                onClick={() => setSelectedPayroll(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollProcessing;
