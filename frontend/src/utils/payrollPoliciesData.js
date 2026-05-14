export const defaultDeductions = {
  tax: { rate: 0.15, amount: 0, maxAnnual: 50000 },
  socialSecurity: { rate: 0.09, employee: 0.045, employer: 0.045, maxAnnual: 30000 },
  healthInsurance: { rate: 0.03, amount: 0 },
  pension: { rate: 0.05, amount: 0 },
  loan: { rate: 0, amount: 0, maxMonthly: 500 }
};

export const defaultAllowances = {
  housing: { rate: 0.25, maxMonthly: 1000 },
  transport: { fixed: 200 },
  meal: { fixed: 150 },
  communication: { fixed: 100 }
};

export const defaultSampleEmployee = {
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
};

export const defaultComplianceRules = [
  { id: 1, category: 'تقديم الضرائب', description: 'يجب تقديم الإقرارات الضريبية الشهرية بحلول اليوم 15 من الشهر التالي', deadline: 'يوم 15 من كل شهر', penalty: '5% من الضريبة المستحقة شهرياً', status: 'active' },
  { id: 2, category: 'التأمين الاجتماعي', description: 'يجب أن تتطابق مساهمات صاحب العمل والموظف ويتم تحويلها شهرياً', deadline: 'يوم 10 من كل شهر', penalty: 'رسوم تأخير + فوائد', status: 'active' },
  { id: 3, category: 'الاحتفاظ بالسجلات', description: 'يجب الاحتفاظ بجميع سجلات الرواتب لمدة لا تقل عن 7 سنوات', deadline: 'جارٍ', penalty: 'عقوبات قانونية لعدم الامتثال', status: 'active' },
  { id: 4, category: 'الحد الأدنى للأجور', description: 'يجب دفع جميع الموظفين بأجر يساوي أو يفوق الحد الأدنى للأجور', deadline: 'لكل فترة رواتب', penalty: 'سداد الأجور + غرامات', status: 'active' },
  { id: 5, category: 'حساب الساعات الإضافية', description: 'يجب حساب الساعات الإضافية بمعدل 1.5 مرة المعدل العادي لساعات العمل تتجاوز 40 ساعة/أسبوع', deadline: 'لكل فترة رواتب', penalty: 'مطالبات بالأجور + غرامات', status: 'active' }
];

export const defaultDeadlines = [
  { id: 1, task: 'تقديم الضرائب الشهرية', frequency: 'شهرياً', dueDate: 'يوم 15 من الشهر', responsible: 'مدير الرواتب', status: 'upcoming' },
  { id: 2, task: 'تحويل التأمين الاجتماعي', frequency: 'شهرياً', dueDate: 'يوم 10 من الشهر', responsible: 'أخصائي الرواتب', status: 'current' },
  { id: 3, task: 'المطابقة الضريبية للربع', frequency: 'ربع سنوي', dueDate: 'آخر يوم من الشهر التالي للربع', responsible: 'مدير الرواتب', status: 'upcoming' },
  { id: 4, task: 'نماذج الضرائب السنوية (W-2, 1099)', frequency: 'سنوياً', dueDate: '31 يناير', responsible: 'مدير الرواتب', status: 'scheduled' },
  { id: 5, task: 'فترة التسجيل في المزايا', frequency: 'سنوياً', dueDate: '1-30 نوفمبر', responsible: 'قسم الموارد البشرية', status: 'upcoming' }
];

export const calculatePayroll = (sampleEmployee, allowances, deductions) => {
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
  return {
    housingAllowance: cappedHousing,
    transportAllowance: allowances.transport.fixed,
    mealAllowance: allowances.meal.fixed,
    communicationAllowance: allowances.communication.fixed,
    grossPay,
    totalDeductions,
    netPay
  };
};

export const formatPercent = (value) => (value * 100).toFixed(1) + '%';

export const deadlineStatusLabel = (status) => {
  switch (status) {
    case 'current': return 'جاري';
    case 'upcoming': return 'قادم';
    case 'scheduled': return 'مجدول';
    default: return status;
  }
};
