import { useState, useEffect } from 'react';
import { FaCalculator, FaFileInvoice, FaMoneyBillWave, FaPercent, FaShieldAlt, FaCalendarAlt, FaHome, FaCar, FaUtensils, FaPhone, FaClock, FaGift, FaBriefcase, FaPiggyBank } from 'react-icons/fa';
import DynamicNumber from '../components/DynamicNumber';
import {
  defaultDeductions, defaultAllowances, defaultSampleEmployee,
  defaultComplianceRules, defaultDeadlines,
  calculatePayroll as calcPayroll, formatPercent, deadlineStatusLabel
} from '../utils/payrollPoliciesData';

const PayrollPolicies = () => {
  const [deductions] = useState(defaultDeductions);
  const [allowances] = useState(defaultAllowances);
  const [sampleEmployee, setSampleEmployee] = useState(defaultSampleEmployee);
  const [complianceRules] = useState(defaultComplianceRules);
  const [deadlines] = useState(defaultDeadlines);

  useEffect(() => {
    setSampleEmployee(prev => ({ ...prev, ...calcPayroll(prev, allowances, deductions) }));
  }, [sampleEmployee.basicSalary, allowances, deductions]);

  const formatCurrency = (amount, size = 'normal') => {
    const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    const fullText = `${formatted} $`;
    const sizes = { small: { base: '0.75rem', min: '0.5rem' }, normal: { base: '0.875rem', min: '0.5rem' }, large: { base: '1.125rem', min: '0.5625rem' }, xl: { base: '1.25rem', min: '0.625rem' } };
    const s = sizes[size] || sizes.normal;
    return <DynamicNumber value={fullText} baseSize={s.base} minSize={s.min} />;
  };

  return (
    <div className="payroll-policies-page">
      <div className="page-header mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark flex items-center">
            <FaFileInvoice className="h-8 w-8 ml-3 text-purple-600" />
            السياسات والإجراءات
          </h1>
          <p className="text-gray-600 mt-1">قواعد التعويضات، الخصومات، ومتطلبات الامتثال</p>
        </div>
      </div>

      <div className="policies-main-grid">
        <div className="lg:col-span-2">
          <div className="section-card mb-8">
            <h2><FaCalculator className="text-secondary" /> حاسبة الرواتب</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-dark">تعويضات الموظف</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الراتب الأساسي</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input type="number" value={sampleEmployee.basicSalary}
                      onChange={e => setSampleEmployee(prev => ({ ...prev, basicSalary: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 outline-none transition-all"
                      placeholder="أدخل الراتب الأساسي" />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl">
                  <h4 className="text-sm font-bold text-blue-800 mb-3">البدلات</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'بدل السكن', value: sampleEmployee.housingAllowance, icon: FaHome },
                      { label: 'بدل المواصلات', value: sampleEmployee.transportAllowance, icon: FaCar },
                      { label: 'بدل الطعام', value: sampleEmployee.mealAllowance, icon: FaUtensils },
                      { label: 'بدل الاتصالات', value: sampleEmployee.communicationAllowance, icon: FaPhone },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex justify-between text-sm items-center">
                          <span className="text-gray-600 flex items-center gap-2"><Icon className="text-blue-500 text-xs" /> {item.label}</span>
                          <span className="font-medium">{formatCurrency(item.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">العمل الإضافي</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input type="number" value={sampleEmployee.overtimePay}
                      onChange={e => setSampleEmployee(prev => ({ ...prev, overtimePay: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 outline-none transition-all"
                      placeholder="أدخل العمل الإضافي" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">المكافأة</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input type="number" value={sampleEmployee.bonus}
                      onChange={e => setSampleEmployee(prev => ({ ...prev, bonus: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 outline-none transition-all"
                      placeholder="أدخل المكافأة" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-dark">ملخص الراتب</h3>
                <div className="bg-gradient-to-l from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-green-800">الراتب الإجمالي</span>
                    <span className="text-lg font-bold text-green-900">{formatCurrency(sampleEmployee.grossPay)}</span>
                  </div>
                  <div className="text-xs text-green-600">
                    الأساسي: {formatCurrency(sampleEmployee.basicSalary, 'small')} + البدلات: {formatCurrency(
                      sampleEmployee.housingAllowance + sampleEmployee.transportAllowance +
                      sampleEmployee.mealAllowance + sampleEmployee.communicationAllowance, 'small'
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FaPiggyBank className="text-error" /> الخصومات</h4>
                  {[
                    { label: 'ضريبة الدخل', rate: deductions.tax.rate, icon: FaPercent },
                    { label: 'التأمين الاجتماعي', rate: deductions.socialSecurity.employee, icon: FaBriefcase },
                    { label: 'التأمين الصحي', rate: deductions.healthInsurance.rate, icon: FaBriefcase },
                    { label: 'الصندوق التقاعدي', rate: deductions.pension.rate, icon: FaPiggyBank },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{item.label} ({formatPercent(item.rate)})</span>
                      <span className="text-error font-medium">-{formatCurrency(sampleEmployee.grossPay * item.rate)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">إجمالي الخصومات</span>
                    <span className="text-error font-bold">-{formatCurrency(sampleEmployee.totalDeductions)}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-l from-emerald-50 to-green-50 p-5 rounded-xl border border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-emerald-800">الراتب الصافي</span>
                    <span className="text-2xl font-bold text-emerald-900">{formatCurrency(sampleEmployee.netPay, 'xl')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h2><FaShieldAlt className="text-error" /> قواعد الخصومات القانونية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: FaPercent, title: 'ضريبة الدخل', bg: 'bg-red-50', text: 'text-red-800', sub: 'text-red-600', muted: 'text-red-500',
                  lines: [`المعدل: ${formatPercent(deductions.tax.rate)}`, 'شرائح ضريبية تصاعدية', `الحد الأقصى: ${formatCurrency(deductions.tax.maxAnnual)}`] },
                { icon: FaBriefcase, title: 'التأمين الاجتماعي', bg: 'bg-blue-50', text: 'text-blue-800', sub: 'text-blue-600', muted: 'text-blue-500',
                  lines: [`الموظف: ${formatPercent(deductions.socialSecurity.employee)}`, `صاحب العمل: ${formatPercent(deductions.socialSecurity.employer)}`, `الحد الأقصى: ${formatCurrency(deductions.socialSecurity.maxAnnual)}`] },
                { icon: FaBriefcase, title: 'التأمين الصحي', bg: 'bg-green-50', text: 'text-green-800', sub: 'text-green-600', muted: 'text-green-500',
                  lines: [`المعدل: ${formatPercent(deductions.healthInsurance.rate)}`, 'خيارات تغطية العائلة متاحة'] },
                { icon: FaPiggyBank, title: 'الصندوق التقاعدي', bg: 'bg-purple-50', text: 'text-purple-800', sub: 'text-purple-600', muted: 'text-purple-500',
                  lines: [`المعدل: ${formatPercent(deductions.pension.rate)}`, 'يُضاف مساهمة صاحب العمل'] },
                { icon: FaMoneyBillWave, title: 'قروض الموظفين', bg: 'bg-orange-50', text: 'text-orange-800', sub: 'text-orange-600', muted: 'text-orange-500',
                  lines: [`الخصم الأقصى: ${formatCurrency(deductions.loan.maxMonthly)}/شهرياً`, 'يتطلب تفويضاً خطياً'] },
                { icon: FaHome, title: 'البدلات', bg: 'bg-teal-50', text: 'text-teal-800', sub: 'text-teal-600', muted: 'text-teal-500',
                  lines: [`السكن: ${formatPercent(allowances.housing.rate)}`, 'المواصلات، الطعام، والاتصالات متضمنة'] },
              ].map((card, i) => (
                <div key={i} className={`${card.bg} p-4 rounded-xl border border-transparent`}>
                  <h3 className={`font-bold ${card.text} mb-2 flex items-center gap-2`}><card.icon /> {card.title}</h3>
                  {card.lines.map((line, j) => (
                    <p key={j} className={`text-sm ${j < card.lines.length - 1 ? card.sub : card.muted}`}>{line}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="section-card">
            <h2><FaShieldAlt className="text-secondary" /> متطلبات الامتثال</h2>
            <div className="space-y-4">
              {complianceRules.map(rule => (
                <div key={rule.id} className="border-r-4 border-secondary pr-4 py-3 bg-blue-50 rounded-l-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-dark text-sm">{rule.category}</h4>
                      <p className="text-xs text-gray-600 mt-1">{rule.description}</p>
                    </div>
                    <span className="text-xs text-secondary font-medium">{rule.deadline}</span>
                  </div>
                  <p className="text-xs text-error mt-2">العقوبة: {rule.penalty}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <h2><FaCalendarAlt className="text-primary" /> مواعيد التقديم</h2>
            <div className="space-y-3">
              {deadlines.map(deadline => {
                const statusStyle = deadline.status === 'current' ? 'bg-blue-100 text-blue-800' : deadline.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
                return (
                  <div key={deadline.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <h4 className="font-medium text-dark text-sm">{deadline.task}</h4>
                      <p className="text-xs text-gray-500">{deadline.frequency} - {deadline.responsible}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-primary">{deadline.dueDate}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle}`}>{deadlineStatusLabel(deadline.status)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="section-card">
            <h2><FaPercent className="text-purple-600" /> مرجع سريع</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '37.5', label: 'ساعات عمل/أسبوع القصوى' },
                { value: '1.5x', label: 'معدل العمل الإضافي' },
                { value: '7', label: 'سنوات الاحتفاظ بالسجلات' },
                { value: '24', label: 'فترات الرواتب/السنة' },
              ].map((item, i) => (
                <div key={i} className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-dark">{item.value}</p>
                  <p className="text-xs text-gray-600 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollPolicies;
