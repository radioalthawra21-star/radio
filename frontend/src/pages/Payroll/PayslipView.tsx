import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
      console.error('PDF download error:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (error) return <div className="p-6 text-red-600 text-center">{error}</div>;
  if (!payslip) return <div className="p-6 text-gray-500 text-center">لا توجد فترة رواتب مفتوحة حالياً</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">كشف الراتب</h1>
          <p className="text-gray-500 text-sm">{payslip.payslipNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          {payslip.isDraft && <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">مسودة</span>}
          <button onClick={handleDownloadPDF} disabled={pdfLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
            {pdfLoading ? 'جاري التحميل...' : '📥 تحميل PDF'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500">الموظف:</span> <strong>{payslip.employeeInfo.name}</strong></div>
          <div><span className="text-gray-500">القسم:</span> <strong>{payslip.employeeInfo.department}</strong></div>
          <div><span className="text-gray-500">الفترة:</span> <strong>{new Date(payslip.periodStart).toLocaleDateString('ar-EG')} - {new Date(payslip.periodEnd).toLocaleDateString('ar-EG')}</strong></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <h2 className="font-bold text-gray-900 mb-3 text-lg">الدخل الأساسي</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-600">الراتب الأساسي</span>
            <span className="font-semibold">{payslip.income.baseSalary.toFixed(2)} ريال</span>
          </div>
          {payslip.income.allowances.map((a, i) => (
            <div key={i} className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">{a.description || a.type}</span>
              <span>{a.amount.toFixed(2)} ريال</span>
            </div>
          ))}
        </div>

        <h2 className="font-bold text-gray-900 mt-4 mb-3 text-lg">المتغيرات (الإضافات)</h2>
        <div className="space-y-2 text-sm">
          {payslip.income.overtime.approved.length > 0 && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">ساعات إضافية معتمدة ({payslip.income.overtime.approved.length})</span>
              <span className="text-green-600 font-semibold">+{payslip.income.overtime.totalOvertimeAmount.toFixed(2)} ريال</span>
            </div>
          )}
          {payslip.income.missions.approved.length > 0 && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">بدل مهمات خارجية ({payslip.income.missions.approved.length})</span>
              <span className="text-green-600 font-semibold">+{payslip.income.missions.totalMissionAllowance.toFixed(2)} ريال</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <h2 className="font-bold text-gray-900 mb-3 text-lg">الخصومات</h2>
        <div className="space-y-2 text-sm">
          {payslip.deductions.unpaidLeave.items.length > 0 && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">إجازات بدون راتب ({payslip.deductions.unpaidLeave.items.length})</span>
              <span className="text-red-600 font-semibold">-{payslip.deductions.unpaidLeave.total.toFixed(2)} ريال</span>
            </div>
          )}
          {payslip.deductions.hourlyShortfall.items.length > 0 && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">عجز في الرصيد السنوي (إجازات ساعية)</span>
              <span className="text-red-600 font-semibold">-{payslip.deductions.hourlyShortfall.total.toFixed(2)} ريال</span>
            </div>
          )}
          {payslip.deductions.otherDeductions.map((d: any, i: number) => (
            <div key={i} className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">{d.description || d.type}</span>
              <span className="text-red-600 font-semibold">-{d.amount.toFixed(2)} ريال</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-gray-600">إجمالي الدخل</span>
            <span>{payslip.totals.gross.toFixed(2)} ريال</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">إجمالي الخصومات</span>
            <span className="text-red-600">-{payslip.totals.deductions.toFixed(2)} ريال</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-gray-200 text-lg">
            <span className="font-bold text-gray-900">صافي الراتب</span>
            <span className="font-bold text-blue-600">{payslip.totals.net.toFixed(2)} ريال</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <h2 className="font-bold text-gray-900 mb-3 text-lg">ملخص أرصدة الإجازات</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="text-gray-600">إجازة سنوية</span>
            <div className="mt-1"><strong>{payslip.leaveBalances?.remainingBalance ?? '--'}</strong> يوم متبقي من {payslip.leaveBalances?.totalBalance ?? '--'}</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <span className="text-gray-600">إجازة مرضية</span>
            <div className="mt-1"><strong>{payslip.sickLeaveBalance?.remainingBalance ?? '--'}</strong> يوم متبقي من {payslip.sickLeaveBalance?.totalBalance ?? '--'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipView;
