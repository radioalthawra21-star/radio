import { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaDownload, FaCalendarAlt, FaIdBadge, FaCheckCircle, FaHourglassHalf, FaFileInvoiceDollar, FaUmbrellaBeach, FaHeartbeat, FaHome, FaBus, FaPlusCircle, FaStar, FaClock, FaShieldAlt, FaMoneyCheck, FaMinusCircle, FaHourglass } from 'react-icons/fa';
import { getCurrentPayslip, downloadPayslipPDF, getEmployeePayroll } from '../../services/payrollService';
import { getCurrentUser } from '../../services/authService';

const safeNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

const MySalary = () => {
  const [payslip, setPayslip] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [payslipRes, userRes] = await Promise.allSettled([
          getCurrentPayslip(),
          getCurrentUser(),
        ]);

        if (payslipRes.status === 'fulfilled' && payslipRes.value?.data?.payslip) {
          setPayslip(payslipRes.value.data.payslip);
        }
        if (userRes.status === 'fulfilled' && userRes.value?.data?.user) {
          const u = userRes.value.data.user;
          setUserProfile(u);
          const payrollRes = await getEmployeePayroll(u._id || u.id, { limit: 12 }).catch(() => null);
          if (payrollRes?.data?.payrolls) {
            setPayrollHistory(payrollRes.data.payrolls);
          }
        }
      } catch (e) {
        console.error('MySalary load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDownloadPDF = async () => {
    if (!payslip) return;
    setPdfLoading(true);
    try {
      await downloadPayslipPDF(payslip.payslipNumber, payslip);
    } catch (e) {
      console.error(e);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>جاري تحميل الراتب...</p>
      </div>
    );
  }

  return (
    <div className="payroll-mysalary-page">
      <div className="page-header mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark flex items-center">
              <FaMoneyBillWave className="h-8 w-8 ml-3 text-primary" />
              الراتب الخاص بي
            </h1>
            <p className="text-gray-600 mt-1">{userProfile?.name} — {userProfile?.department}</p>
          </div>
        </div>
      </div>

      {payslip ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900">كشف الراتب الحالي</h2>
              <span className="status-badge bg-blue-100 text-blue-800">
                <FaIdBadge className="h-3 w-3 ml-1" />
                {payslip.payslipNumber}
              </span>
              {payslip.isDraft && (
                <span className="status-badge bg-yellow-100 text-yellow-800">
                  <FaHourglassHalf className="h-3 w-3 ml-1" />
                  مسودة
                </span>
              )}
            </div>
            <button onClick={handleDownloadPDF} disabled={pdfLoading}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark text-sm disabled:opacity-50 transition-colors flex items-center gap-2">
              <FaDownload className="h-4 w-4" />
              {pdfLoading ? 'جاري التحميل...' : 'تحميل PDF'}
            </button>
          </div>

          <div className="section-card mb-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FaCalendarAlt className="h-3 w-3" />
              <span>الفترة: {new Date(payslip.periodStart).toLocaleDateString('ar-EG')} - {new Date(payslip.periodEnd).toLocaleDateString('ar-EG')}</span>
              <span className="mx-2">|</span>
              <span>الحالة: </span>
              <span className={`font-medium ${payslip.status === 'paid' ? 'text-green-600' : payslip.status === 'approved' ? 'text-blue-600' : 'text-yellow-600'}`}>
                {payslip.status === 'paid' ? 'مدفوع' : payslip.status === 'approved' ? 'معتمد' : 'قيد الانتظار'}
              </span>
            </div>
          </div>

          <div className="section-card mb-4">
            <div className="section-header">
              <FaFileInvoiceDollar className="h-4 w-4 ml-2 text-green-600" />
              <span>الدخل</span>
            </div>
            <div className="space-y-2">
              <div className="salary-item">
                <span className="text-gray-600">الراتب الأساسي</span>
                <span className="font-semibold">{payslip.income.baseSalary.toFixed(2)}</span>
              </div>
              {payslip.income.allowances.map((a, i) => (
                <div key={i} className="salary-item">
                  <span className="text-gray-600">{a.description || a.type}</span>
                  <span>{a.amount.toFixed(2)}</span>
                </div>
              ))}
              {payslip.income.bonuses.map((b, i) => (
                <div key={i} className="salary-item">
                  <span className="text-gray-600">{b.reason || b.type}</span>
                  <span className="text-green-600">+{b.amount.toFixed(2)}</span>
                </div>
              ))}
              {payslip.income.overtime.totalOvertimeAmount > 0 && (
                <div className="salary-item">
                  <span className="text-gray-600">ساعات إضافية</span>
                  <span className="text-green-600">+{payslip.income.overtime.totalOvertimeAmount.toFixed(2)}</span>
                </div>
              )}
              {payslip.income.missions.totalMissionAllowance > 0 && (
                <div className="salary-item">
                  <span className="text-gray-600">بدل مهمات</span>
                  <span className="text-green-600">+{payslip.income.missions.totalMissionAllowance.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="section-card mb-4">
            <div className="section-header">
              <FaFileInvoiceDollar className="h-4 w-4 ml-2 text-red-600" />
              <span>الخصومات</span>
            </div>
            <div className="space-y-2">
              {payslip.deductions.unpaidLeave.total > 0 && (
                <div className="salary-item">
                  <span className="text-gray-600">إجازات بدون راتب</span>
                  <span className="text-red-600">-{payslip.deductions.unpaidLeave.total.toFixed(2)}</span>
                </div>
              )}
              {payslip.deductions.hourlyShortfall.total > 0 && (
                <div className="salary-item">
                  <span className="text-gray-600">عجز في الرصيد السنوي</span>
                  <span className="text-red-600">-{payslip.deductions.hourlyShortfall.total.toFixed(2)}</span>
                </div>
              )}
              {payslip.deductions.hoursShortfall?.total > 0 && (
                <div className="salary-item">
                  <span className="flex items-center gap-2 text-gray-600"><FaHourglass className="h-3 w-3" />نقص ساعات العمل</span>
                  <span className="text-red-600">-{payslip.deductions.hoursShortfall.total.toFixed(2)}</span>
                </div>
              )}
              {payslip.deductions.otherDeductions.map((d, i) => (
                <div key={i} className="salary-item">
                  <span className="text-gray-600">{d.description || d.type}</span>
                  <span className="text-red-600">-{d.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card mb-4">
            <div className="salary-summary">
              <div className="salary-item">
                <span className="text-gray-600">إجمالي الدخل</span>
                <span>{payslip.totals.gross.toFixed(2)}</span>
              </div>
              <div className="salary-item">
                <span className="text-gray-600">إجمالي الخصومات</span>
                <span className="text-red-600">-{payslip.totals.deductions.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-gray-200 mt-2">
                <span className="font-bold text-gray-900 text-lg">صافي الراتب</span>
                <span className="font-bold text-secondary text-lg">{payslip.totals.net.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {(payslip.leaveBalances || payslip.sickLeaveBalance) && (
            <div className="section-card mb-4">
              <div className="section-header">
                <FaUmbrellaBeach className="h-4 w-4 ml-2 text-blue-600" />
                <span>أرصدة الإجازات</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <FaUmbrellaBeach className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600">إجازة سنوية</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{payslip.leaveBalances?.remainingBalance ?? '--'}</p>
                  <p className="text-xs text-gray-500">يوم متبقي</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <FaHeartbeat className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600">إجازة مرضية</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{payslip.sickLeaveBalance?.remainingBalance ?? '--'}</p>
                  <p className="text-xs text-gray-500">يوم متبقي</p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : userProfile ? (
        <div>
          <div className="section-card mb-4">
            <div className="section-header">
              <FaFileInvoiceDollar className="h-4 w-4 ml-2 text-green-600" />
              <span>بيانات الراتب الأساسية</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-500 block">القسم</span>
                <span className="font-semibold">{userProfile.department || '--'}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-500 block">تاريخ التعيين</span>
                <span className="font-semibold">{userProfile.startDate ? new Date(userProfile.startDate).toLocaleDateString('ar-EG') : '--'}</span>
              </div>
            </div>
          </div>

          <div className="section-card mb-4">
            <div className="section-header">
              <FaFileInvoiceDollar className="h-4 w-4 ml-2 text-green-600" />
              <span>الدخل</span>
            </div>
            <div className="space-y-2">
              <div className="salary-item">
                <span className="flex items-center gap-2 text-gray-600"><FaMoneyBillWave className="h-3 w-3" />الراتب الأساسي</span>
                <span className="font-semibold">{safeNum(userProfile.baseSalary).toFixed(2)}</span>
              </div>
              <div className="salary-item">
                <span className="flex items-center gap-2 text-gray-600"><FaHome className="h-3 w-3" />بدل سكن</span>
                <span>{safeNum(userProfile.housingAllowance).toFixed(2)}</span>
              </div>
              <div className="salary-item">
                <span className="flex items-center gap-2 text-gray-600"><FaBus className="h-3 w-3" />بدل نقل</span>
                <span>{safeNum(userProfile.transportAllowance).toFixed(2)}</span>
              </div>
              <div className="salary-item">
                <span className="flex items-center gap-2 text-gray-600"><FaPlusCircle className="h-3 w-3" />بدلات أخرى</span>
                <span>{safeNum(userProfile.otherAllowances).toFixed(2)}</span>
              </div>
              <div className="salary-item">
                <span className="flex items-center gap-2 text-gray-600"><FaStar className="h-3 w-3" />مكافأة</span>
                <span>{safeNum(userProfile.bonus).toFixed(2)}</span>
              </div>
              <div className="salary-item">
                <span className="flex items-center gap-2 text-gray-600"><FaClock className="h-3 w-3" />ساعات إضافية</span>
                <span>{safeNum(userProfile.overtime).toFixed(2)}</span>
              </div>
              <div className="salary-item border-t pt-2 mt-2">
                <span className="font-medium text-gray-700">إجمالي الدخل</span>
                <span className="font-bold text-green-700">
                  {(
                    safeNum(userProfile.baseSalary) +
                    safeNum(userProfile.housingAllowance) +
                    safeNum(userProfile.transportAllowance) +
                    safeNum(userProfile.otherAllowances) +
                    safeNum(userProfile.bonus) +
                    safeNum(userProfile.overtime)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="section-card mb-4">
            <div className="section-header">
              <FaFileInvoiceDollar className="h-4 w-4 ml-2 text-red-600" />
              <span>الخصومات</span>
            </div>
            <div className="space-y-2">
              <div className="salary-item">
                <span className="flex items-center gap-2 text-gray-600"><FaShieldAlt className="h-3 w-3" />تأمين اجتماعي</span>
                <span className="text-red-600">-{safeNum(userProfile.socialInsurance).toFixed(2)}</span>
              </div>
              <div className="salary-item">
                <span className="flex items-center gap-2 text-gray-600"><FaMoneyCheck className="h-3 w-3" />ضريبة</span>
                <span className="text-red-600">-{safeNum(userProfile.tax).toFixed(2)}</span>
              </div>
              <div className="salary-item">
                <span className="flex items-center gap-2 text-gray-600"><FaMinusCircle className="h-3 w-3" />استقطاعات أخرى</span>
                <span className="text-red-600">-{safeNum(userProfile.otherDeductions).toFixed(2)}</span>
              </div>
              {(safeNum(userProfile.hoursShortfall) > 0) && (
                <div className="salary-item">
                  <span className="flex items-center gap-2 text-gray-600"><FaHourglass className="h-3 w-3" />نقص ساعات العمل</span>
                  <span className="text-red-600">-{safeNum(userProfile.hoursShortfall).toFixed(2)}</span>
                </div>
              )}
              <div className="salary-item border-t pt-2 mt-2">
                <span className="font-medium text-gray-700">إجمالي الخصومات</span>
                <span className="font-bold text-red-700">
                  -{(
                    safeNum(userProfile.socialInsurance) +
                    safeNum(userProfile.tax) +
                    safeNum(userProfile.otherDeductions) +
                    safeNum(userProfile.hoursShortfall)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="section-card mb-4">
            <div className="flex justify-between items-center py-3 px-4">
              <span className="font-bold text-gray-900 text-lg">صافي الراتب التقديري</span>
              <span className="font-bold text-secondary text-lg">
                {(
                  safeNum(userProfile.baseSalary) +
                  safeNum(userProfile.housingAllowance) +
                  safeNum(userProfile.transportAllowance) +
                  safeNum(userProfile.otherAllowances) +
                  safeNum(userProfile.bonus) +
                  safeNum(userProfile.overtime) -
                  safeNum(userProfile.socialInsurance) -
                  safeNum(userProfile.tax) -
                  safeNum(userProfile.otherDeductions) -
                  safeNum(userProfile.hoursShortfall)
                ).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <FaFileInvoiceDollar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">لا توجد بيانات</h2>
          <p className="text-gray-500 text-sm">لم يتم إعداد بيانات الراتب لك بعد. يرجى التواصل مع الموارد البشرية.</p>
        </div>
      )}

      {payrollHistory.length > 0 && (
        <div className="section-card">
          <div className="section-header">
            <FaMoneyBillWave className="h-4 w-4 ml-2 text-primary" />
            <span>سجل الرواتب السابقة</span>
          </div>
          <div className="overflow-x-auto">
            <table className="payroll-table min-w-full">
              <thead>
                <tr>
                  <th>الفترة</th>
                  <th>الأساسي</th>
                  <th>الإجمالي</th>
                  <th>الصافي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {payrollHistory.filter(p => p._id !== payslip?._id).map((p) => (
                  <tr key={p._id}>
                    <td className="text-xs">{new Date(p.periodStart).toLocaleDateString('ar-EG')} - {new Date(p.periodEnd).toLocaleDateString('ar-EG')}</td>
                    <td className="text-xs">{p.baseSalary || 0}</td>
                    <td className="text-xs">{p.totals?.gross || 0}</td>
                    <td className="text-xs font-semibold">{p.totals?.net || 0}</td>
                    <td>
                      <span className={`status-badge ${
                        p.status === 'paid' ? 'bg-green-100 text-green-700' :
                        p.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status === 'paid' ? 'مدفوع' : p.status === 'approved' ? 'معتمد' : 'قيد الانتظار'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySalary;
