export const JOB_GRADES = {
  'متدرب - Trainee': { baseSalary: 3000, housing: 500, transport: 300, other: 0, grade: 1 },
  'موظف - Junior': { baseSalary: 5000, housing: 800, transport: 500, other: 200, grade: 2 },
  'موظف - Mid-Level': { baseSalary: 8000, housing: 1200, transport: 700, other: 500, grade: 3 },
  'موظف - Senior': { baseSalary: 12000, housing: 1800, transport: 1000, other: 800, grade: 4 },
  'محترف - Specialist': { baseSalary: 15000, housing: 2200, transport: 1200, other: 1000, grade: 5 },
  'فريق - Team Lead': { baseSalary: 18000, housing: 2500, transport: 1500, other: 1500, grade: 6 },
  'مدير - Manager': { baseSalary: 25000, housing: 3500, transport: 2000, other: 2000, grade: 7 },
  'مدير عام - Director': { baseSalary: 35000, housing: 5000, transport: 3000, other: 3000, grade: 8 },
  'نائب الرئيس - VP': { baseSalary: 50000, housing: 7000, transport: 4000, other: 5000, grade: 9 }
};

export const DEDUCTION_RATES = {
  socialInsurance: 0.09,
  tax: 0.15,
  other: 0.02
};

export const ALL_COLUMNS = [
  { key: 'baseSalary', label: 'الراتب الأساسي', type: 'number', deletable: false, category: 'earning' },
  { key: 'housingAllowance', label: 'بدل السكن', type: 'number', deletable: true, category: 'earning' },
  { key: 'transportAllowance', label: 'بدل النقل', type: 'number', deletable: true, category: 'earning' },
  { key: 'otherAllowances', label: 'بدلات أخرى', type: 'number', deletable: true, category: 'earning' },
  { key: 'bonus', label: 'المكافآت', type: 'number', deletable: true, category: 'earning' },
  { key: 'overtime', label: 'ساعات إضافية', type: 'number', deletable: true, category: 'earning' },
  { key: 'socialInsurance', label: 'التأمينات الاجتماعية', type: 'number', deletable: true, category: 'deduction' },
  { key: 'tax', label: 'الضريبة', type: 'number', deletable: true, category: 'deduction' },
  { key: 'otherDeductions', label: 'استقطاعات أخرى', type: 'number', deletable: true, category: 'deduction' },
  { key: 'hoursShortfall', label: 'نقص ساعات العمل', type: 'number', deletable: true, category: 'deduction' },
];

export const ALL_COLUMN_KEYS = ALL_COLUMNS.map(c => c.key);

export const DEFAULT_SALARIES = {
  'موظف': 6000,
  'محترف': 12000,
  'فريق lead': 18000,
  'مدير': 25000,
  'مدير عام': 35000
};

export const DEPARTMENTS = {
  financial: { name: 'المالي', manager: 'المدير المالي', budget: 200000 },
  it: { name: 'تقنية المعلومات', manager: 'مدير تقنية المعلومات', budget: 200000 },
  marketing: { name: 'التسويق', manager: 'مدير التسويق', budget: 250000 },
  news: { name: 'الأخبار', manager: 'مدير الأخبار', budget: 300000 },
  production: { name: 'الإنتاج', manager: 'مدير الإنتاج', budget: 500000 },
  live_broadcast: { name: 'البث المباشر', manager: 'مدير البث المباشر', budget: 300000 },
  hr: { name: 'الموارد البشرية', manager: 'مدير الموارد البشرية', budget: 150000 }
};

// Reverse map: Arabic name → key
export const DEPARTMENT_BY_NAME = Object.fromEntries(
  Object.entries(DEPARTMENTS).map(([key, dept]) => [dept.name, key])
);

export const getDeptName = (dept) => {
  if (!dept) return '--';
  if (DEPARTMENTS[dept]) return DEPARTMENTS[dept].name;
  return dept;
};

export const getDeptKey = (dept) => {
  if (!dept) return null;
  if (DEPARTMENTS[dept]) return dept;
  if (DEPARTMENT_BY_NAME[dept]) return DEPARTMENT_BY_NAME[dept];
  return dept;
};

export const ROLE_LABELS = {
  employee: 'موظف',
  manager: 'مدير',
  admin: 'المدير العام',
};
