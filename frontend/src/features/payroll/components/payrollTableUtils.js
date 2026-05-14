export const DEFAULT_COLUMNS = [
  { key: 'employeeName', label: 'الموظف', type: 'text', deletable: false, category: 'info' },
  { key: 'basicSalary', label: 'الراتب الأساسي', type: 'number', deletable: false, category: 'earning' },
  { key: 'housingAllowance', label: 'بدل السكن', type: 'number', deletable: true, category: 'earning' },
  { key: 'transportAllowance', label: 'بدل المواصلات', type: 'number', deletable: true, category: 'earning' },
  { key: 'foodAllowance', label: 'بدل الطعام', type: 'number', deletable: true, category: 'earning' },
  { key: 'communicationAllowance', label: 'بدل الاتصالات', type: 'number', deletable: true, category: 'earning' },
  { key: 'otherAllowances', label: 'بدل أخرى', type: 'number', deletable: true, category: 'earning' },
  { key: 'bonuses', label: 'المكافآت', type: 'number', deletable: true, category: 'earning' },
  { key: 'overtime', label: 'ساعات إضافية', type: 'number', deletable: true, category: 'earning' },
  { key: 'deductions', label: 'الخصومات', type: 'number', deletable: false, category: 'deduction' },
  { key: 'netPay', label: 'الراتب الصافي', type: 'calculated', deletable: false, category: 'calculated' },
];

export const STORAGE_KEYS = {
  activeColumns: 'payroll_activeColumns',
  dynamicColumns: 'payroll_dynamicColumns',
};

export const getAllDefaultKeys = () => DEFAULT_COLUMNS.map(c => c.key);

export const loadFromStorage = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return fallback;
};

export const safeParse = (value) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};
