import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPrint, FaArrowRight, FaFileInvoiceDollar, FaUserTie, FaBuilding, FaEnvelope, FaPhone, FaCalendarAlt, FaIdBadge, FaMoneyBillWave } from 'react-icons/fa';
import { generatePayslip } from '../../services/payrollService';
import { formatDateArabic } from '../../utils/dateUtils';
import { formatNumber } from '../../utils/numberUtils';

export default function PayslipDetail() {
  const { payrollId } = useParams();
  const navigate = useNavigate();
  const [payslipData, setPayslipData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPayslip();
  }, [payrollId]);

  const fetchPayslip = async () => {
    try {
      setLoading(true);
      const res = await generatePayslip(payrollId);
      if (res?.data?.payslip) {
        setPayslipData(res.data.payslip);
      } else {
        setError('لم يتم العثور على الكشف');
      }
    } catch (err) {
      setError('خطأ في جلب بيانات الكشف');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const printPayslip = () => window.print();

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>جاري تحميل الكشف...</p>
      </div>
    );
  }

  if (error || !payslipData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FaFileInvoiceDollar className="h-12 w-12 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-medium mb-4">{error}</p>
          <button onClick={() => navigate('/payroll')} className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors">
            العودة للرواتب
          </button>
        </div>
      </div>
    );
  }

  const { companyInfo, employeeInfo, payrollInfo, breakdown, totals, status } = payslipData;

  return (
    <div className="payroll-payslipdetail-page">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-dark flex items-center">
            <FaFileInvoiceDollar className="h-8 w-8 ml-3 text-secondary" />
            كشف المرتب
          </h1>
          <div className="flex gap-2">
            <button onClick={() => navigate('/payroll')} className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors text-sm flex items-center gap-2">
              <FaArrowRight className="h-3 w-3" />
              العودة
            </button>
            <button onClick={printPayslip} className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors text-sm flex items-center gap-2">
              <FaPrint className="h-3 w-3" />
              طباعة
            </button>
          </div>
        </div>

        <div className="section-card printable-area">
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
            <h2 className="text-2xl font-bold text-dark mb-2">{companyInfo.name}</h2>
            <p className="text-gray-600 text-sm">{companyInfo.address}</p>
            <p className="text-gray-600 text-sm">{companyInfo.phone}</p>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-secondary">كشف المرتب</h3>
            <p className="text-gray-600 text-sm">رقم الكشف: {payslipData.payslipNumber}</p>
            <p className="text-gray-600 text-sm">الفترة من {formatDateArabic(payrollInfo.periodStart)} إلى {formatDateArabic(payrollInfo.periodEnd)}</p>
            <p className="text-gray-600 text-sm">تاريخ الصرف: {formatDateArabic(payrollInfo.paymentDate)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 p-5 rounded-xl">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FaUserTie className="h-4 w-4 text-secondary" />
                بيانات الموظف
              </h4>
              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2">
                  <FaIdBadge className="h-3 w-3 text-gray-400" />
                  <span className="font-medium">الاسم:</span> {employeeInfo.name}
                </p>
                <p><span className="font-medium">رقم التعريف:</span> {employeeInfo.username}</p>
                <p className="flex items-center gap-2">
                  <FaBuilding className="h-3 w-3 text-gray-400" />
                  <span className="font-medium">القسم:</span> {employeeInfo.department}
                </p>
                <p className="flex items-center gap-2">
                  <FaEnvelope className="h-3 w-3 text-gray-400" />
                  <span className="font-medium">البريد:</span> {employeeInfo.email}
                </p>
                <p className="flex items-center gap-2">
                  <FaPhone className="h-3 w-3 text-gray-400" />
                  <span className="font-medium">الجوال:</span> {employeeInfo.phone}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FaMoneyBillWave className="h-4 w-4 text-primary" />
                معلومات الراتب
              </h4>
              <div className="space-y-1.5 text-sm">
                <p><span className="font-medium">الراتب الأساسي:</span> {formatNumber(payrollInfo.baseSalary)}</p>
                <p><span className="font-medium">أيام العمل:</span> {payrollInfo.workingDays}</p>
                <p><span className="font-medium">الأيام الحاضرة:</span> {payrollInfo.daysWorked}</p>
                <p><span className="font-medium">نوع الراتب:</span> {payrollInfo.frequency}</p>
                <p className="flex items-center gap-2">
                  <span className="font-medium">الحالة:</span>
                  <span className={`status-badge ${
                    status === 'paid' ? 'bg-green-100 text-green-800' :
                    status === 'approved' ? 'bg-blue-100 text-blue-800' :
                    status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {status === 'paid' ? 'تم الدفع' :
                     status === 'approved' ? 'تمت الموافقة' :
                     status === 'pending' ? 'قيد المراجعة' : 'ملغي'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-lg font-bold text-gray-900 mb-4">تفصيل الراتب</h4>
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="payroll-table min-w-full">
                <thead>
                  <tr>
                    <th>البند</th>
                    <th>الوصف</th>
                    <th>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium text-gray-900">الراتب الأساسي</td>
                    <td className="text-gray-600"></td>
                    <td className="text-left font-medium">{formatNumber(payrollInfo.baseSalary)}</td>
                  </tr>

                  {breakdown.allowances?.map((allow, i) => (
                    <tr key={`allow-${i}`}>
                      <td className="text-green-700 font-medium">علاوة</td>
                      <td className="text-gray-600">{allow.type}</td>
                      <td className="text-left text-green-700">+{formatNumber(allow.amount)}</td>
                    </tr>
                  ))}

                  {breakdown.bonuses?.map((bonus, i) => (
                    <tr key={`bonus-${i}`}>
                      <td className="text-blue-700 font-medium">مكافأة</td>
                      <td className="text-gray-600">{bonus.reason}</td>
                      <td className="text-left text-blue-700">+{formatNumber(bonus.amount)}</td>
                    </tr>
                  ))}

                  {breakdown.overtime?.hours > 0 && (
                    <tr>
                      <td className="text-purple-700 font-medium">ساعات إضافية</td>
                      <td className="text-gray-600">{breakdown.overtime.hours} ساعة × {formatNumber(breakdown.overtime.hourlyRate)}</td>
                      <td className="text-left text-purple-700">+{formatNumber(breakdown.overtime.totalAmount)}</td>
                    </tr>
                  )}

                  {breakdown.absences?.days > 0 && (
                    <tr>
                      <td className="text-red-700 font-medium">خصم غياب</td>
                      <td className="text-gray-600">{breakdown.absences.days} يوم × {formatNumber(breakdown.absences.dailyRate)}</td>
                      <td className="text-left text-red-700">-{formatNumber(breakdown.absences.totalAmount)}</td>
                    </tr>
                  )}

                  {breakdown.latePenalties?.occurrences > 0 && (
                    <tr>
                      <td className="text-red-700 font-medium">غرامة تأخير</td>
                      <td className="text-gray-600">{breakdown.latePenalties.occurrences} مرة × {formatNumber(breakdown.latePenalties.amountPerOccurrence)}</td>
                      <td className="text-left text-red-700">-{formatNumber(breakdown.latePenalties.totalAmount)}</td>
                    </tr>
                  )}

                  {breakdown.otherDeductions?.map((ded, i) => (
                    <tr key={`ded-${i}`}>
                      <td className="text-red-700 font-medium">خصم</td>
                      <td className="text-gray-600">{ded.type}</td>
                      <td className="text-left text-red-700">-{formatNumber(ded.amount)}</td>
                    </tr>
                  ))}

                  <tr className="bg-gray-50 font-bold">
                    <td colSpan="2" className="text-right text-dark">الإجمالي الصافي</td>
                    <td className="text-left text-xl text-dark">{formatNumber(totals.net)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan="2" className="text-right text-gray-600">الإجمالي</td>
                    <td className="text-left text-sm text-gray-600">{formatNumber(totals.gross)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan="2" className="text-right text-gray-600">إجمالي الخصومات</td>
                    <td className="text-left text-sm text-red-600">{formatNumber(totals.deductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {payslipData.notes && (
            <div className="bg-yellow-50 p-4 rounded-xl mb-6">
              <h4 className="font-bold text-gray-900 mb-2">ملاحظات</h4>
              <p className="text-gray-700 whitespace-pre-line text-sm">{payslipData.notes}</p>
            </div>
          )}

          {payslipData.approvedBy && (
            <div className="text-center text-sm text-gray-500">
              تمت الموافقة بواسطة: {payslipData.approvedBy.name} في {formatDateArabic(payslipData.approvedAt)}
            </div>
          )}

          <div className="text-center mt-8 pt-6 border-t-2 border-gray-200 text-gray-500 text-xs">
            <p>تم إنشاء هذا الكشف تلقائياً بواسطة نظام إدارة الموارد البشرية</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; margin: 0; padding: 20px; }
          .printable-area { box-shadow: none; padding: 0; }
          .payroll-payslipdetail-page button { display: none !important; }
          .payroll-payslipdetail-page .page-header { display: none; }
        }
      `}</style>
    </div>
  );
}
