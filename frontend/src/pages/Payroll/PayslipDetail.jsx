/**
 * Payslip Detail Page
 * Display detailed payslip information with printable format
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
      console.error('Error fetching payslip:', err);
    } finally {
      setLoading(false);
    }
  };

  const printPayslip = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الكشف...</p>
        </div>
      </div>
    );
  }

  if (error || !payslipData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">{error}</p>
          <button
            onClick={() => navigate('/payroll')}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            العودة للرواتب
          </button>
        </div>
      </div>
    );
  }

  const { companyInfo, employeeInfo, payrollInfo, breakdown, totals, status } = payslipData;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">كشف المرتب</h1>
          <div className="flex gap-2">
            <button
              onClick={() => window.open(`/payroll`, '_self')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              العودة
            </button>
            <button
              onClick={printPayslip}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              طباعة
            </button>
          </div>
        </div>

        {/* Payslip Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 printable-area">
          {/* Company Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {companyInfo.name}
            </h2>
            <p className="text-gray-600">{companyInfo.address}</p>
            <p className="text-gray-600">{companyInfo.phone}</p>
          </div>

          {/* Payslip Title */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-blue-600">كشف المرتب</h3>
            <p className="text-gray-600">رقم الكشف: {payslipData.payslipNumber}</p>
            <p className="text-gray-600">
              الفترة من {formatDateArabic(payrollInfo.periodStart)} إلى {formatDateArabic(payrollInfo.periodEnd)}
            </p>
            <p className="text-gray-600">
              تاريخ الصرف: {formatDateArabic(payrollInfo.paymentDate)}
            </p>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-2">بيانات الموظف</h4>
              <p><span className="font-medium">الاسم:</span> {employeeInfo.name}</p>
              <p><span className="font-medium">رقم التعريف:</span> {employeeInfo.username}</p>
              <p><span className="font-medium">القسم:</span> {employeeInfo.department}</p>
              <p><span className="font-medium">البريد:</span> {employeeInfo.email}</p>
              <p><span className="font-medium">الجوال:</span> {employeeInfo.phone}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-2">معلومات الراتب</h4>
              <p><span className="font-medium">الراتب الأساسي:</span> {formatNumber(payrollInfo.baseSalary)}</p>
              <p><span className="font-medium">أيام العمل:</span> {payrollInfo.workingDays}</p>
              <p><span className="font-medium">الأيام الحاضرة:</span> {payrollInfo.daysWorked}</p>
              <p><span className="font-medium">نوع الراتب:</span> {payrollInfo.frequency}</p>
              <p>
                <span className="font-medium">الحالة:</span> 
                <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
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

          {/* Breakdown Table */}
          <div className="mb-8">
            <h4 className="text-lg font-bold text-gray-900 mb-4">تفصيل الراتب</h4>
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">البند</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الوصف</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {/* Base Salary */}
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">الراتب الأساسي</td>
                    <td className="px-4 py-3 text-sm text-gray-600"></td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-left">{formatNumber(payrollInfo.baseSalary)}</td>
                  </tr>

                  {/* Allowances */}
                  {breakdown.allowances?.map((allow, i) => (
                    <tr key={`allow-${i}`}>
                      <td className="px-4 py-3 text-sm text-green-700">علاوة</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{allow.type}</td>
                      <td className="px-4 py-3 text-sm text-green-700 text-left">+{formatNumber(allow.amount)}</td>
                    </tr>
                  ))}

                  {/* Bonuses */}
                  {breakdown.bonuses?.map((bonus, i) => (
                    <tr key={`bonus-${i}`}>
                      <td className="px-4 py-3 text-sm text-blue-700">مكافأة</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{bonus.reason}</td>
                      <td className="px-4 py-3 text-sm text-blue-700 text-left">+{formatNumber(bonus.amount)}</td>
                    </tr>
                  ))}

                  {/* Overtime */}
                  {breakdown.overtime?.hours > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm text-purple-700">ساعات إضافية</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {breakdown.overtime.hours} ساعة × {formatNumber(breakdown.overtime.hourlyRate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-purple-700 text-left">
                        +{formatNumber(breakdown.overtime.totalAmount)}
                      </td>
                    </tr>
                  )}

                  {/* Deductions */}
                  {breakdown.absences?.days > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm text-red-700">خصم غياب</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {breakdown.absences.days} يوم × {formatNumber(breakdown.absences.dailyRate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-700 text-left">
                        -{formatNumber(breakdown.absences.totalAmount)}
                      </td>
                    </tr>
                  )}

                  {breakdown.latePenalties?.occurrences > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm text-red-700">غرامة تأخير</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {breakdown.latePenalties.occurrences} مرة × {formatNumber(breakdown.latePenalties.amountPerOccurrence)}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-700 text-left">
                        -{formatNumber(breakdown.latePenalties.totalAmount)}
                      </td>
                    </tr>
                  )}

                  {breakdown.otherDeductions?.map((ded, i) => (
                    <tr key={`ded-${i}`}>
                      <td className="px-4 py-3 text-sm text-red-700">خصم</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{ded.type}</td>
                      <td className="px-4 py-3 text-sm text-red-700 text-left">
                        -{formatNumber(ded.amount)}
                      </td>
                    </tr>
                  ))}

                  {/* Totals */}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan="2" className="px-4 py-3 text-right text-gray-900">الإجمالي الصافي</td>
                    <td className="px-4 py-3 text-xl text-gray-900 text-left">{formatNumber(totals.net)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan="2" className="px-4 py-3 text-right text-gray-600">الإجمالي</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-left">{formatNumber(totals.gross)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan="2" className="px-4 py-3 text-right text-gray-600">إجمالي الخصومات</td>
                    <td className="px-4 py-3 text-sm text-red-600 text-left">{formatNumber(totals.deductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {payslipData.notes && (
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <h4 className="font-bold text-gray-900 mb-2">ملاحظات</h4>
              <p className="text-gray-700 whitespace-pre-line">{payslipData.notes}</p>
            </div>
          )}

          {/* Approved By */}
          {payslipData.approvedBy && (
            <div className="text-center text-sm text-gray-500">
              تمت الموافقة بواسطة: {payslipData.approvedBy.name} في {formatDateArabic(payslipData.approvedAt)}
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t-2 border-gray-200 text-gray-500 text-sm">
            <p>تم إنشاء هذا الكشف تلقائياً بواسطة نظام إدارة الموارد البشرية</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white;
            margin: 0;
            padding: 20px;
          }
          .printable-area {
            box-shadow: none;
            padding: 0;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
