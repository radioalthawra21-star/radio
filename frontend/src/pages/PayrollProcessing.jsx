import { useState, useEffect } from 'react';
import { FaCalculator, FaMoneyBillWave, FaCheckCircle, FaTimesCircle, FaClock, FaEye, FaFileInvoice, FaCheckDouble, FaSpinner } from 'react-icons/fa';
import DynamicNumber from '../components/DynamicNumber';
import { getAllPayrolls } from '../services/payrollService';
import api from '../services/api';

const STATUS = {
  labels: { pending: 'معلق', approved: 'معتمد', paid: 'مدفوع', draft: 'مسودة' },
  colors: { pending: 'status-badge pending', approved: 'status-badge approved', paid: 'status-badge paid', draft: 'status-badge draft' },
};

const PayrollProcessing = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getAllPayrolls({ limit: 200 });
        if (response.success) setPayrolls(response.data?.payrolls || []);
      } catch {} finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const pendingPayrolls = payrolls.filter(p => p.status === 'pending');
  const approvedPayrolls = payrolls.filter(p => p.status === 'approved');
  const paidPayrolls = payrolls.filter(p => p.status === 'paid');

  const totalGross = payrolls.reduce((s, p) => s + (p.totals?.gross || 0), 0);
  const totalNet = payrolls.reduce((s, p) => s + (p.totals?.net || 0), 0);

  const formatCurrency = (amount, size = 'normal') => {
    const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    const fullText = `${formatted} $`;
    const sizes = { small: { base: '0.75rem', min: '0.5rem' }, normal: { base: '0.875rem', min: '0.5rem' }, large: { base: '1.125rem', min: '0.5625rem' }, xl: { base: '1.5rem', min: '0.625rem' } };
    return <DynamicNumber value={fullText} baseSize={(sizes[size] || sizes.normal).base} minSize={(sizes[size] || sizes.normal).min} />;
  };

  const handleApprove = async (payrollId) => {
    try { await api.put(`/payroll/${payrollId}/approve`); setPayrolls(prev => prev.map(p => p._id === payrollId ? { ...p, status: 'approved' } : p)); }
    catch { alert('فشل في اعتماد كشف الراتب'); }
  };

  const handlePay = async (payrollId) => {
    try { await api.put(`/payroll/${payrollId}/pay`); setPayrolls(prev => prev.map(p => p._id === payrollId ? { ...p, status: 'paid' } : p)); }
    catch { alert('فشل في تسجيل الدفع'); }
  };

  const handleApproveAll = async () => {
    if (!pendingPayrolls.length) return;
    if (!window.confirm(`هل أنت متأكد من اعتماد ${pendingPayrolls.length} كشف راتب؟`)) return;
    setProcessing(true);
    for (const p of pendingPayrolls) { try { await api.put(`/payroll/${p._id}/approve`); } catch {} }
    setPayrolls(prev => prev.map(p => p.status === 'pending' ? { ...p, status: 'approved' } : p));
    setProcessing(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-EG') : '-';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="payroll-processing-page">
      <div className="page-header mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark flex items-center">
              <FaCalculator className="h-8 w-8 ml-3 text-purple-600" />
              معالجة الرواتب
            </h1>
            <p className="text-gray-600 mt-1">اعتماد وتسجيل كشوف رواتب الموظفين</p>
          </div>
          {pendingPayrolls.length > 0 && (
            <button onClick={handleApproveAll} disabled={processing}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-purple-700 disabled:opacity-50 transition-colors">
              <FaCheckDouble className="h-4 w-4 ml-2" />
              {processing ? 'جاري الاعتماد...' : `اعتماد الكل (${pendingPayrolls.length})`}
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EAB308' }}><FaClock /></div>
          <div className="stat-info"><h3>معلقة</h3><p className="stat-value" style={{ color: '#EAB308' }}>{pendingPayrolls.length}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3B82F6' }}><FaCheckCircle /></div>
          <div className="stat-info"><h3>معتمدة</h3><p className="stat-value" style={{ color: '#3B82F6' }}>{approvedPayrolls.length}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#16A34A' }}><FaMoneyBillWave /></div>
          <div className="stat-info"><h3>مدفوعة</h3><p className="stat-value" style={{ color: '#16A34A' }}>{paidPayrolls.length}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#8B5CF6' }}><FaCalculator /></div>
          <div className="stat-info"><h3>الإجمالي</h3><p className="stat-value" style={{ color: '#8B5CF6' }}>{payrolls.length} كشف</p></div>
        </div>
      </div>

      {pendingPayrolls.length > 0 && (
        <div className="section-card mb-8">
          <h2><FaClock className="text-yellow-600" /> كشوف معلقة للاعتماد</h2>
          <div className="overflow-x-auto">
            <table className="payroll-table">
              <thead><tr>
                <th>الموظف</th><th>الفترة</th><th>الإجمالي</th><th>الخصومات</th><th>الصافي</th><th>إجراء</th>
              </tr></thead>
              <tbody>
                {pendingPayrolls.map(p => (
                  <tr key={p._id} className="bg-yellow-50/30">
                    <td><span className="font-medium text-dark">{p.employee?.name || 'غير معروف'}</span></td>
                    <td className="text-gray-500">{formatDate(p.periodStart)}</td>
                    <td className="currency">{formatCurrency(p.totals?.gross || 0)}</td>
                    <td className="currency">{formatCurrency(p.totals?.deductions || 0)}</td>
                    <td className="net">{formatCurrency(p.totals?.net || 0)}</td>
                    <td><div className="flex gap-2">
                      <button onClick={() => setSelectedPayroll(p)} className="edit-btn" title="عرض التفاصيل"><FaEye /></button>
                      <button onClick={() => handleApprove(p._id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="اعتماد"><FaCheckCircle /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {approvedPayrolls.length > 0 && (
        <div className="section-card mb-8">
          <h2><FaCheckCircle className="text-blue-600" /> كشوف معتمدة بانتظار الدفع</h2>
          <div className="overflow-x-auto">
            <table className="payroll-table">
              <thead><tr>
                <th>الموظف</th><th>الفترة</th><th>الصافي</th><th>إجراء</th>
              </tr></thead>
              <tbody>
                {approvedPayrolls.map(p => (
                  <tr key={p._id} className="bg-blue-50/30">
                    <td><span className="font-medium text-dark">{p.employee?.name || 'غير معروف'}</span></td>
                    <td className="text-gray-500">{formatDate(p.periodStart)}</td>
                    <td className="net">{formatCurrency(p.totals?.net || 0)}</td>
                    <td><button onClick={() => handlePay(p._id)} className="px-3 py-1.5 bg-success text-white text-sm rounded-lg hover:bg-green-700 transition-colors">تسجيل الدفع</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="section-card">
        <h2><FaFileInvoice className="text-purple-600" /> جميع كشوف الرواتب</h2>
        <div className="overflow-x-auto">
          <table className="payroll-table">
            <thead><tr>
              <th>الموظف</th><th>الفترة</th><th>الإجمالي</th><th>الصافي</th><th>الحالة</th><th>إجراء</th>
            </tr></thead>
            <tbody>
              {payrolls.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">لا توجد كشوف رواتب</td></tr>
              ) : payrolls.slice(0, 100).map(p => (
                <tr key={p._id}>
                  <td><span className="font-medium text-dark">{p.employee?.name || 'غير معروف'}</span></td>
                  <td className="text-gray-500">{formatDate(p.periodStart)}</td>
                  <td className="currency">{formatCurrency(p.totals?.gross || 0)}</td>
                  <td className="net">{formatCurrency(p.totals?.net || 0)}</td>
                  <td><span className={STATUS.colors[p.status] || 'status-badge draft'}>{STATUS.labels[p.status] || p.status}</span></td>
                  <td><button onClick={() => setSelectedPayroll(p)} className="edit-btn" title="عرض التفاصيل"><FaEye /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payrolls.length > 100 && <p className="text-sm text-gray-500 mt-4 text-center">عرض أول 100 من أصل {payrolls.length} كشف</p>}
      </div>

      {selectedPayroll && (() => {
        const p = selectedPayroll;
        return (
          <div className="detail-overlay" onClick={e => { if (e.target === e.currentTarget) setSelectedPayroll(null); }}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
              <div className="detail-header flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-dark">كشف راتب - {p.employee?.name || 'غير معروف'}</h2>
                  <span className={STATUS.colors[p.status] || 'status-badge draft'}>{STATUS.labels[p.status] || p.status}</span>
                </div>
                <button onClick={() => setSelectedPayroll(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><FaTimesCircle className="h-5 w-5" /></button>
              </div>
              <div className="detail-body">
                <div className="detail-grid">
                  <div><span className="text-gray-500">الفترة:</span><p className="font-medium">{formatDate(p.periodStart)} - {formatDate(p.periodEnd)}</p></div>
                  <div><span className="text-gray-500">الراتب الأساسي:</span><p className="font-medium">{formatCurrency(p.baseSalary || 0)}</p></div>
                </div>
                {p.components?.allowances?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-dark mb-2">البدلات</h3>
                    {p.components.allowances.map((a, i) => (
                      <div key={i} className="flex justify-between text-sm py-1">
                        <span className="text-gray-600">{a.type === 'housing' ? 'بدل السكن' : a.type === 'transport' ? 'بدل المواصلات' : a.type === 'food' ? 'بدل الطعام' : a.type === 'communication' ? 'بدل الاتصالات' : a.type}</span>
                        <span className="font-medium">{formatCurrency(a.amount || 0, 'small')}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between font-bold text-lg"><span>الإجمالي</span><span className="text-secondary">{formatCurrency(p.totals?.gross || 0, 'large')}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>الخصومات</span><span className="text-error">{formatCurrency(p.totals?.deductions || 0, 'large')}</span></div>
                  <div className="flex justify-between font-bold text-xl mt-2 text-success"><span>الصافي</span><span>{formatCurrency(p.totals?.net || 0, 'xl')}</span></div>
                </div>
              </div>
              <div className="detail-footer">
                {p.status === 'pending' && <button onClick={() => { handleApprove(p._id); setSelectedPayroll(null); }} className="flex-1 bg-success text-white py-2 rounded-lg hover:bg-green-700 transition-colors">اعتماد</button>}
                {p.status === 'approved' && <button onClick={() => { handlePay(p._id); setSelectedPayroll(null); }} className="flex-1 bg-secondary text-white py-2 rounded-lg hover:bg-secondary/80 transition-colors">تسجيل الدفع</button>}
                <button onClick={() => setSelectedPayroll(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors">إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PayrollProcessing;
