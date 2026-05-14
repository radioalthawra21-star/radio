import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaFileInvoiceDollar, FaDownload, FaCalendarAlt, FaIdBadge, FaHourglassHalf, FaUserTie, FaBuilding, FaUmbrellaBeach, FaHeartbeat } from 'react-icons/fa';
import { getCurrentPayslip, downloadPayslipPDF } from '../../services/payrollService';

interface Allowance { type: string; amount: number; description?: string; }
interface Bonus { type: string; amount: number; reason?: string; }
interface PayrollItem { type: string; amount: number; payrollCode: string; description?: string; metadata?: any; }
interface Mission { _id: string; title: string; description?: string; }
interface PayslipData {
  payslipNumber: string;
  periodStart: string;
  periodEnd: string;
  employeeInfo: { name: string; department: string; email: string };
  income: {
    baseSalary: number;
    allowances: Allowance[];
    bonuses: Bonus[];
    overtime: { approved: PayrollItem[]; totalOvertimeAmount: number };
    missions: { approved: Mission[]; totalMissionAllowance: number };
    additionsTotal: number;
  };
  deductions: {
    unpaidLeave: { items: PayrollItem[]; total: number };
    hourlyShortfall: { items: PayrollItem[]; total: number };
    otherDeductions: any[];
    deductionsTotal: number;
  };
  totals: { gross: number; deductions: number; net: number };
  leaveBalances: { remainingBalance: number; totalBalance: number };
  sickLeaveBalance: { remainingBalance: number; totalBalance: number };
  status: string;
  isDraft: boolean;
}

const PayslipView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const period = searchParams.get('period');
  const [payslip, setPayslip] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    getCurrentPayslip(period).then(res => {
      if (res?.data?.payslip) setPayslip(res.data.payslip);
      else setError(res?.data?.message || 'لا توجد فترة رواتب مفتوحة حالياً');
    }).catch(() => setError('خطأ في تحميل كشف الراتب'))
    .finally(() => setLoading(false));
  }, [period]);

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
        <p>جاري تحميل كشف الراتب...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FaFileInvoiceDollar className="h-12 w-12 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!payslip) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="empty-state">
          <FaFileInvoiceDollar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">لا توجد فترة رواتب مفتوحة حالياً</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payroll-payslipview-page">
      <div className="page-header mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaFileInvoiceDollar className="h-8 w-8 text-secondary" />
            <div>
              <h1 className="text-3xl font-bold text-dark">كشف الراتب</h1>
              <p className="text-gray-500 text-sm">{payslip.payslipNumber}</p>
            </div>
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
      </div>

      <div className="section-card mb-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FaUserTie className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500 text-xs">الموظف</span>
              <p className="font-semibold text-gray-900">{payslip.employeeInfo.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FaBuilding className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500 text-xs">القسم</span>
              <p className="font-semibold text-gray-900">{payslip.employeeInfo.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500 text-xs">الفترة</span>
              <p className="font-semibold text-gray-900">
                {new Date(payslip.periodStart).toLocaleDateString('ar-EG')} - {new Date(payslip.periodEnd).toLocaleDateString('ar-EG')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="section-card mb-4">
        <div className="section-header">
          <FaFileInvoiceDollar className="h-4 w-4 ml-2 text-green-600" />
          <span>الدخل الأساسي</span>
        </div>
        <div className="space-y-2">
          <div className="salary-item">
            <span className="text-gray-600">الراتب الأساسي</span>
            <span className="font-semibold">{payslip.income.baseSalary.toFixed(2)} ريال</span>
          </div>
          {payslip.income.allowances.map((a, i) => (
            <div key={i} className="salary-item">
              <span className="text-gray-600">{a.description || a.type}</span>
              <span>{a.amount.toFixed(2)} ريال</span>
            </div>
          ))}
        </div>

        <div className="section-header mt-4">
          <FaFileInvoiceDollar className="h-4 w-4 ml-2 text-blue-600" />
          <span>المتغيرات (الإضافات)</span>
        </div>
        <div className="space-y-2">
          {payslip.income.overtime.approved.length > 0 && (
            <div className="salary-item">
              <span className="text-gray-600">ساعات إضافية معتمدة ({payslip.income.overtime.approved.length})</span>
              <span className="text-green-600 font-semibold">+{payslip.income.overtime.totalOvertimeAmount.toFixed(2)} ريال</span>
            </div>
          )}
          {payslip.income.missions.approved.length > 0 && (
            <div className="salary-item">
              <span className="text-gray-600">بدل مهمات خارجية ({payslip.income.missions.approved.length})</span>
              <span className="text-green-600 font-semibold">+{payslip.income.missions.totalMissionAllowance.toFixed(2)} ريال</span>
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
          {payslip.deductions.unpaidLeave.items.length > 0 && (
            <div className="salary-item">
              <span className="text-gray-600">إجازات بدون راتب ({payslip.deductions.unpaidLeave.items.length})</span>
              <span className="text-red-600 font-semibold">-{payslip.deductions.unpaidLeave.total.toFixed(2)} ريال</span>
            </div>
          )}
          {payslip.deductions.hourlyShortfall.items.length > 0 && (
            <div className="salary-item">
              <span className="text-gray-600">عجز في الرصيد السنوي (إجازات ساعية)</span>
              <span className="text-red-600 font-semibold">-{payslip.deductions.hourlyShortfall.total.toFixed(2)} ريال</span>
            </div>
          )}
          {payslip.deductions.otherDeductions.map((d: any, i: number) => (
            <div key={i} className="salary-item">
              <span className="text-gray-600">{d.description || d.type}</span>
              <span className="text-red-600 font-semibold">-{d.amount.toFixed(2)} ريال</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card mb-4">
        <div className="salary-summary">
          <div className="salary-item">
            <span className="text-gray-600">إجمالي الدخل</span>
            <span>{payslip.totals.gross.toFixed(2)} ريال</span>
          </div>
          <div className="salary-item">
            <span className="text-gray-600">إجمالي الخصومات</span>
            <span className="text-red-600">-{payslip.totals.deductions.toFixed(2)} ريال</span>
          </div>
          <div className="flex justify-between py-3 border-t-2 border-gray-200 mt-2">
            <span className="font-bold text-gray-900 text-lg">صافي الراتب</span>
            <span className="font-bold text-secondary text-lg">{payslip.totals.net.toFixed(2)} ريال</span>
          </div>
        </div>
      </div>

      <div className="section-card mb-4">
        <div className="section-header">
          <FaUmbrellaBeach className="h-4 w-4 ml-2 text-blue-600" />
          <span>ملخص أرصدة الإجازات</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <FaUmbrellaBeach className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">إجازة سنوية</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{payslip.leaveBalances?.remainingBalance ?? '--'}</p>
            <p className="text-xs text-gray-500">يوم متبقي من {payslip.leaveBalances?.totalBalance ?? '--'}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <FaHeartbeat className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">إجازة مرضية</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{payslip.sickLeaveBalance?.remainingBalance ?? '--'}</p>
            <p className="text-xs text-gray-500">يوم متبقي من {payslip.sickLeaveBalance?.totalBalance ?? '--'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipView;
