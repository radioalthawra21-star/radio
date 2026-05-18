import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaBuilding, FaSpinner, FaSyncAlt, FaUserPlus, FaCheckCircle, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import { getPendingPayrollAssignments, assignSalaryToPendingPayroll } from '../services/payrollService';
import Card from '../components/common/Card';
import PendingAssignmentModal from './Payroll/PendingAssignmentModal';

const PayrollPendingAssignments = () => {
  const navigate = useNavigate();
  const [pendingEntries, setPendingEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [formData, setFormData] = useState({
    baseSalary: '', housingAllowance: '', transportAllowance: '',
    foodAllowance: '', communicationAllowance: '',
    periodStart: '', periodEnd: '', paymentDate: ''
  });

  const fetchPendingEntries = async (page = 1) => {
    try {
      setLoading(true); setError('');
      const response = await getPendingPayrollAssignments({ page, limit: 10 });
      if (response.success) {
        setPendingEntries(response.data.pendingPayrolls);
        setPagination(response.data.pagination);
      } else setError(response.message || 'حدث خطأ في جلب البيانات');
    } catch { setError('حدث خطأ في الاتصال بالخادم'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPendingEntries(); }, []);

  const handleOpenModal = (entry) => {
    setSelectedEntry(entry);
    const now = new Date();
    setFormData({
      baseSalary: '', housingAllowance: '', transportAllowance: '',
      foodAllowance: '', communicationAllowance: '',
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      paymentDate: new Date(now.getFullYear(), now.getMonth(), 25).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false); setSelectedEntry(null);
    setFormData({ baseSalary: '', housingAllowance: '', transportAllowance: '', foodAllowance: '', communicationAllowance: '', periodStart: '', periodEnd: '', paymentDate: '' });
  };

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.baseSalary || parseFloat(formData.baseSalary) <= 0) { alert('يرجى إدخال راتب أساسي صحيح'); return; }
    setSubmitting(true);
    const allowances = [];
    [['housing', 'بدل سكن'], ['transport', 'بدل نقل'], ['food', 'بدل غذاء'], ['communication', 'بدل اتصالات']].forEach(([type, desc]) => {
      const key = type + 'Allowance';
      if (formData[key] && parseFloat(formData[key]) > 0) allowances.push({ type, amount: parseFloat(formData[key]), description: desc });
    });
    try {
      const response = await assignSalaryToPendingPayroll(selectedEntry._id, {
        baseSalary: parseFloat(formData.baseSalary), allowances,
        periodStart: formData.periodStart, periodEnd: formData.periodEnd, paymentDate: formData.paymentDate
      });
      if (response.success) { alert('تم إدخال بيانات الراتب بنجاح'); handleCloseModal(); fetchPendingEntries(pagination.currentPage); }
      else alert(response.message || 'حدث خطأ أثناء الحفظ');
    } catch { alert('حدث خطأ في الاتصال بالخادم'); }
    finally { setSubmitting(false); }
  };

  const getDaysSince = (dateString) => {
    if (!dateString) return 0;
    const created = new Date(dateString);
    if (isNaN(created.getTime())) return 0;
    return Math.ceil(Math.abs(new Date() - created) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try { return new Date(dateString).toLocaleDateString('ar-EG'); }
    catch { return 'تاريخ غير صالح'; }
  };

  return (
    <div className="pending-payroll-page">
      <div className="page-header mb-8">
        <div className="flex justify-between items-center">
          <div className="header-title-row">
            <button onClick={() => navigate('/payroll')} className="back-btn" title="العودة إلى لوحة الرواتب">
              <FaArrowLeft /> العودة
            </button>
            <div>
              <h1 className="text-3xl font-bold text-dark mb-2">مراجعة بيانات الرواتب الجديدة</h1>
              <p className="text-gray-600">قائمة الموظفين الجدد بانتظار إدخال بيانات الراتب</p>
            </div>
          </div>
          <button onClick={() => fetchPendingEntries(pagination.currentPage)}
            className="btn-secondary flex items-center gap-2">
            <FaSyncAlt className={loading ? 'animate-spin' : ''} /> تحديث
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
          <FaExclamationTriangle className="flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
        </div>
      ) : pendingEntries.length === 0 ? (
        <div className="empty-state">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <FaCheckCircle className="text-4xl text-green-500" />
          </div>
          <h3>لا توجد بيانات بانتظار المراجعة</h3>
          <p>جميع الموظفين الجدد لديهم بيانات راتب مكتملة.</p>
        </div>
      ) : (
        <Card className="overflow-hidden rounded-xl shadow-md">
          <div className="overflow-x-auto">
            <table className="payroll-table">
              <thead><tr>
                {['الموظف', 'البريد الإلكتروني', 'القسم', 'تاريخ التسجيل', 'مدة الانتظار', 'الإجراءات'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-200">
                {pendingEntries.map(entry => {
                  const days = getDaysSince(entry.createdAt);
                  const dayColor = days > 7 ? 'bg-red-100 text-red-800' : days > 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
                  return (
                    <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                      <td>
                        <div className="employee-name-group">
                          <div className="employee-avatar">{entry.employee?.name?.charAt(0) || 'م'}</div>
                          <div className="name-details">
                            <span className="full-name">{entry.employee?.name || 'غير معروف'}</span>
                            <span className="username">{entry.employee?.username || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-600 text-sm">{entry.employee?.email || '—'}</td>
                      <td>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <FaBuilding className="text-xs" /> {entry.employee?.department || 'غير محدد'}
                        </span>
                      </td>
                      <td className="text-gray-600 text-sm">{formatDate(entry.employee?.startDate) || formatDate(entry.createdAt)}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${dayColor}`}>{days} يوم</span>
                      </td>
                      <td>
                        <button onClick={() => handleOpenModal(entry)}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2">
                          <FaMoneyBillWave /> إدخال الراتب
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-sm">
              <span className="text-gray-600">
                عرض {((pagination.currentPage - 1) * 10) + 1} - {Math.min(pagination.currentPage * 10, pagination.totalItems)} من {pagination.totalItems} سجل
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => fetchPendingEntries(pagination.currentPage - 1)} disabled={pagination.currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors">السابق</button>
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button key={i} onClick={() => fetchPendingEntries(i + 1)}
                    className={`w-8 h-8 rounded transition-colors ${pagination.currentPage === i + 1 ? 'bg-primary text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>{i + 1}</button>
                ))}
                <button onClick={() => fetchPendingEntries(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors">التالي</button>
              </div>
            </div>
          )}
        </Card>
      )}

      {showModal && selectedEntry && (
        <PendingAssignmentModal
          selectedEntry={selectedEntry} formData={formData} submitting={submitting}
          onClose={handleCloseModal} onChange={handleInputChange} onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default PayrollPendingAssignments;
