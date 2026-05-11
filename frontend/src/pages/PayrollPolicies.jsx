import React, { useState, useEffect } from 'react';
import { FaCalculator, FaFileInvoice, FaMoneyBillWave, FaPercent, FaShieldAlt, FaCalendarAlt } from 'react-icons/fa';
import DynamicNumber from '../components/DynamicNumber';
import './PayrollPolicies.css';

const PayrollPolicies = () => {
  const [deductions, setDeductions] = useState({
    tax: { rate: 0.15, amount: 0, maxAnnual: 50000 },
    socialSecurity: { rate: 0.09, employee: 0.045, employer: 0.045, maxAnnual: 30000 },
    healthInsurance: { rate: 0.03, amount: 0 },
    pension: { rate: 0.05, amount: 0 },
    loan: { rate: 0, amount: 0, maxMonthly: 500 }
  });

  const [allowances, setAllowances] = useState({
    housing: { rate: 0.25, maxMonthly: 1000 },
    transport: { fixed: 200 },
    meal: { fixed: 150 },
    communication: { fixed: 100 }
  });

  const [sampleEmployee, setSampleEmployee] = useState({
    basicSalary: 5000,
    housingAllowance: 0,
    transportAllowance: 0,
    mealAllowance: 0,
    communicationAllowance: 0,
    overtimePay: 0,
    bonus: 0,
    grossPay: 0,
    totalDeductions: 0,
    netPay: 0
  });

  const [complianceRules, setComplianceRules] = useState([
    {
      id: 1,
      category: 'تقديم الضرائب',
      description: 'يجب تقديم الإقرارات الضريبية الشهرية بحلول اليوم 15 من الشهر التالي',
      deadline: 'يوم 15 من كل شهر',
      penalty: '5% من الضريبة المستحقة شهرياً',
      status: 'active'
    },
    {
      id: 2,
      category: 'التأمين الاجتماعي',
      description: 'يجب أن تتطابق مساهمات صاحب العمل والموظف ويتم تحويلها شهرياً',
      deadline: 'يوم 10 من كل شهر',
      penalty: 'رسوم تأخير + فوائد',
      status: 'active'
    },
    {
      id: 3,
      category: 'الاحتفاظ بالسجلات',
      description: 'يجب الاحتفاظ بجميع سجلات الرواتب لمدة لا تقل عن 7 سنوات',
      deadline: 'جارٍ',
      penalty: 'عقوبات قانونية لعدم الامتثال',
      status: 'active'
    },
    {
      id: 4,
      category: 'الحد الأدنى للأجور',
      description: 'يجب دفع جميع الموظفين بأجر يساوي أو يفوق الحد الأدنى للأجور',
      deadline: 'لكل فترة رواتب',
      penalty: 'سداد الأجور + غرامات',
      status: 'active'
    },
    {
      id: 5,
      category: 'حساب الساعات الإضافية',
      description: 'يجب حساب الساعات الإضافية بمعدل 1.5 مرة المعدل العادي لساعات العمل تتجاوز 40 ساعة/أسبوع',
      deadline: 'لكل فترة رواتب',
      penalty: 'مطالبات بالأجور + غرامات',
      status: 'active'
    }
  ]);

  const [deadlines, setDeadlines] = useState([
    {
      id: 1,
      task: 'تقديم الضرائب الشهرية',
      frequency: 'شهرياً',
      dueDate: 'يوم 15 من الشهر',
      responsible: 'مدير الرواتب',
      status: 'upcoming'
    },
    {
      id: 2,
      task: 'تحويل التأمين الاجتماعي',
      frequency: 'شهرياً',
      dueDate: 'يوم 10 من الشهر',
      responsible: 'أخصائي الرواتب',
      status: 'current'
    },
    {
      id: 3,
      task: 'المطابقة الضريبية للربع',
      frequency: 'ربع سنوي',
      dueDate: 'آخر يوم من الشهر التالي للربع',
      responsible: 'مدير الرواتب',
      status: 'upcoming'
    },
    {
      id: 4,
      task: 'نماذج الضرائب السنوية (W-2, 1099)',
      frequency: 'سنوياً',
      dueDate: '31 يناير',
      responsible: 'مدير الرواتب',
      status: 'scheduled'
    },
    {
      id: 5,
      task: 'فترة التسجيل في المزايا',
      frequency: 'سنوياً',
      dueDate: '1-30 نوفمبر',
      responsible: 'قسم الموارد البشرية',
      status: 'upcoming'
    }
  ]);

  useEffect(() => {
    calculatePayroll();
  }, [sampleEmployee.basicSalary]);

  const calculatePayroll = () => {
    const { basicSalary } = sampleEmployee;
    
    const housingAllowance = basicSalary * allowances.housing.rate;
    const cappedHousing = Math.min(housingAllowance, allowances.housing.maxMonthly);
    
    const grossPay = basicSalary + cappedHousing + 
                     allowances.transport.fixed + 
                     allowances.meal.fixed + 
                     allowances.communication.fixed;
    
    const taxDeduction = grossPay * deductions.tax.rate;
    const socialSecurityEmployee = grossPay * deductions.socialSecurity.employee;
    const healthInsuranceDeduction = grossPay * deductions.healthInsurance.rate;
    const pensionDeduction = grossPay * deductions.pension.rate;
    
    const totalDeductions = taxDeduction + socialSecurityEmployee + 
                           healthInsuranceDeduction + pensionDeduction;
    
    const netPay = grossPay - totalDeductions;
    
    setSampleEmployee(prev => ({
      ...prev,
      housingAllowance: cappedHousing,
      transportAllowance: allowances.transport.fixed,
      mealAllowance: allowances.meal.fixed,
      communicationAllowance: allowances.communication.fixed,
      grossPay,
      totalDeductions,
      netPay
    }));
  };

  const formatCurrency = (amount, size = 'normal') => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

    const fullText = `${formatted} $`;

    const sizeMap = {
      small: { base: '0.75rem', min: '0.5rem' },
      normal: { base: '0.875rem', min: '0.5rem' },
      large: { base: '1.125rem', min: '0.5625rem' },
      xl: { base: '1.25rem', min: '0.625rem' },
      xxl: { base: '1.5rem', min: '0.75rem' },
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

  const formatPercent = (value) => {
    return (value * 100).toFixed(1) + '%';
  };

  return (
    <div className="payroll-policies-page">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaFileInvoice className="h-8 w-8 mr-3 text-purple-600" />
              السياسات والإجراءات
            </h1>
            <p className="text-gray-600 mt-1">قواعد التعويضات، الخصومات، ومتطلبات الامتثال</p>
          </div>
        </div>
      </div>

      <div className="policies-main-grid">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <FaCalculator className="h-5 w-5 mr-2 text-blue-600" />
              حاسبة الرواتب
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">تعويضات الموظف</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الراتب الأساسي
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={sampleEmployee.basicSalary}
                      onChange={(e) => setSampleEmployee(prev => ({
                        ...prev,
                        basicSalary: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أدخل الراتب الأساسي"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-3">البدلات</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">بدل السكن</span>
                      <span className="font-medium">{formatCurrency(sampleEmployee.housingAllowance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">بدل المواصلات</span>
                      <span className="font-medium">{formatCurrency(sampleEmployee.transportAllowance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">بدل الطعام</span>
                      <span className="font-medium">{formatCurrency(sampleEmployee.mealAllowance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">بدل الاتصالات</span>
                      <span className="font-medium">{formatCurrency(sampleEmployee.communicationAllowance)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    العمل الإضافي
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={sampleEmployee.overtimePay}
                      onChange={(e) => setSampleEmployee(prev => ({
                        ...prev,
                        overtimePay: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أدخل العمل الإضافي"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المكافأة
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={sampleEmployee.bonus}
                      onChange={(e) => setSampleEmployee(prev => ({
                        ...prev,
                        bonus: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أدخل المكافأة"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">ملخص الراتب</h3>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-green-800">الراتب الإجمالي</span>
                    <span className="text-lg font-bold text-green-900">{formatCurrency(sampleEmployee.grossPay)}</span>
                  </div>
                  <div className="text-xs text-green-600">
                    الأساسي: {formatCurrency(sampleEmployee.basicSalary)} + البدلات: {formatCurrency(
                      sampleEmployee.housingAllowance + 
                      sampleEmployee.transportAllowance + 
                      sampleEmployee.mealAllowance + 
                      sampleEmployee.communicationAllowance
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">الخصومات</h4>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">ضريبة الدخل ({formatPercent(deductions.tax.rate)})</span>
                    <span className="text-red-600">-{formatCurrency(sampleEmployee.grossPay * deductions.tax.rate)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">التأمين الاجتماعي ({formatPercent(deductions.socialSecurity.employee)})</span>
                    <span className="text-red-600">-{formatCurrency(sampleEmployee.grossPay * deductions.socialSecurity.employee)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">التأمين الصحي ({formatPercent(deductions.healthInsurance.rate)})</span>
                    <span className="text-red-600">-{formatCurrency(sampleEmployee.grossPay * deductions.healthInsurance.rate)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">الصندوق التقاعدي ({formatPercent(deductions.pension.rate)})</span>
                    <span className="text-red-600">-{formatCurrency(sampleEmployee.grossPay * deductions.pension.rate)}</span>
                  </div>
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">إجمالي الخصومات</span>
                    <span className="text-red-600 font-bold">-{formatCurrency(sampleEmployee.totalDeductions)}</span>
                  </div>
                </div>

                <div className="bg-emerald-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-emerald-800">الراتب الصافي</span>
                    <span className="text-2xl font-bold text-emerald-900">{formatCurrency(sampleEmployee.netPay)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <FaShieldAlt className="h-5 w-5 mr-2 text-red-600" />
              قواعد الخصومات القانونية
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">ضريبة الدخل</h3>
                <p className="text-sm text-red-600 mb-2">المعدل: {formatPercent(deductions.tax.rate)}</p>
                <p className="text-xs text-red-500">شرائح ضريبية تصاعدية</p>
                <p className="text-xs text-red-500">الحد الأقصى السنوي: {formatCurrency(deductions.tax.maxAnnual)}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">التأمين الاجتماعي</h3>
                <p className="text-sm text-blue-600 mb-2">الموظف: {formatPercent(deductions.socialSecurity.employee)}</p>
                <p className="text-sm text-blue-600 mb-2">صاحب العمل: {formatPercent(deductions.socialSecurity.employer)}</p>
                <p className="text-xs text-blue-500">الحد الأقصى السنوي: {formatCurrency(deductions.socialSecurity.maxAnnual)}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">التأمين الصحي</h3>
                <p className="text-sm text-green-600 mb-2">المعدل: {formatPercent(deductions.healthInsurance.rate)}</p>
                <p className="text-xs text-green-500">خيارات تغطية العائلة متاحة</p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">الصندوق التقاعدي</h3>
                <p className="text-sm text-purple-600 mb-2">المعدل: {formatPercent(deductions.pension.rate)}</p>
                <p className="text-xs text-purple-500">يُضاف مساهمة صاحب العمل</p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2">قروض الموظفين</h3>
                <p className="text-sm text-orange-600 mb-2">الخصم الأقصى: {formatCurrency(deductions.loan.maxMonthly)}/شهرياً</p>
                <p className="text-xs text-orange-500">يتطلب تفويضاً خطياً</p>
              </div>

              <div className="bg-teal-50 p-4 rounded-lg">
                <h3 className="font-semibold text-teal-800 mb-2">البدلات</h3>
                <p className="text-sm text-teal-600 mb-2">السكن: {formatPercent(allowances.housing.rate)} (محدود)</p>
                <p className="text-xs text-teal-500">المواصلات، الطعام، والاتصالات متضمنة</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <FaShieldAlt className="h-5 w-5 mr-2 text-blue-600" />
              متطلبات الامتثال
            </h2>
            
            <div className="space-y-4">
              {complianceRules.map((rule) => (
                <div key={rule.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded-r-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{rule.category}</h4>
                      <p className="text-xs text-gray-600 mt-1">{rule.description}</p>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">{rule.deadline}</span>
                  </div>
                  <p className="text-xs text-red-600 mt-2">العقوبة: {rule.penalty}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <FaCalendarAlt className="h-5 w-5 mr-2 text-orange-600" />
              مواعيد التقديم
            </h2>
            
            <div className="space-y-3">
              {deadlines.map((deadline) => (
                <div key={deadline.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">{deadline.task}</h4>
                    <p className="text-xs text-gray-500">{deadline.frequency} - {deadline.responsible}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-orange-600">{deadline.dueDate}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      deadline.status === 'current' ? 'bg-blue-100 text-blue-800' :
                      deadline.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {deadline.status === 'current' ? 'جاري' : 
                       deadline.status === 'upcoming' ? 'قادم' : 'مجدول'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <FaPercent className="h-5 w-5 mr-2 text-purple-600" />
              مرجع سريع
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">37.5</p>
                <p className="text-xs text-gray-600">ساعات عمل/أسبوع القصوى</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">1.5x</p>
                <p className="text-xs text-gray-600">معدل العمل الإضافي</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">7</p>
                <p className="text-xs text-gray-600">سنوات الاحتفاظ بالسجلات</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">24</p>
                <p className="text-xs text-gray-600">فترات الرواتب/السنة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollPolicies;