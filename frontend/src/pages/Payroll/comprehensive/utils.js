import { getAllUsers } from '../../../services/userService';
import DynamicNumber from '../../../components/DynamicNumber';
import { JOB_GRADES, DEDUCTION_RATES, DEFAULT_SALARIES, DEPARTMENTS, ALL_COLUMNS, getDeptName, getDeptKey } from './config';

export const safeNum = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const parsed = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isNaN(parsed) ? 0 : parsed;
};

export const generateMockEmployees = (currentUser = null) => {
  const firstNames = ['أحمد', 'محمد', 'علي', 'فاطمة', 'سارة', 'عمر', 'خالد', 'منى', 'يوسف', 'نور'];
  const lastNames = ['محمد', 'أحمد', 'علي', 'حسن', 'إبراهيم', 'عبدالعزيز', 'سالم'];
  const jobTitles = ['موظف', 'محترف', 'فريق lead', 'مدير'];
  const deptKeys = Object.keys(DEPARTMENTS);

  const count = currentUser ? 1 : 15;
  return Array.from({ length: count }, (_, i) => {
    const firstName = currentUser?.name?.split(' ')[0] || firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = currentUser?.name?.split(' ')[1] || lastNames[Math.floor(Math.random() * lastNames.length)];
    const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];
    const deptKey = currentUser?.department || deptKeys[Math.floor(Math.random() * deptKeys.length)];

    const baseSalary = DEFAULT_SALARIES[jobTitle] || 8000;
    const variance = () => (Math.random() - 0.5) * 0.1;

    return {
      _id: currentUser?._id || `emp_${Date.now()}_${i}`,
      id: currentUser?.id || `EMP${String(i + 1001).padStart(4, '0')}`,
      name: currentUser?.name || `${firstName} ${lastName}`,
      department: deptKey,
      jobTitle,
      role: jobTitle,
      baseSalary: Math.round(baseSalary * (1 + variance())),
      housingAllowance: Math.round(baseSalary * 0.15 * (1 + variance())),
      transportAllowance: Math.round(baseSalary * 0.1 * (1 + variance())),
      otherAllowances: 0,
      bonus: 0,
      overtime: 0,
      socialInsurance: Math.round(baseSalary * DEDUCTION_RATES.socialInsurance),
      tax: Math.round(baseSalary * DEDUCTION_RATES.tax),
      otherDeductions: 0,
      hireDate: new Date(2020 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 12), 1).toISOString().split('T')[0],
      status: 'active'
    };
  }).map(emp => {
    const totalEarnings = emp.baseSalary + emp.housingAllowance + emp.transportAllowance + emp.otherAllowances + emp.bonus + emp.overtime;
    const totalDeductions = emp.socialInsurance + emp.tax + emp.otherDeductions;
    return {
      ...emp,
      totalEarnings,
      totalDeductions,
      grossSalary: totalEarnings,
      netSalary: totalEarnings - totalDeductions
    };
  });
};

export const fetchFromApi = async (isEmployeeView, currentUser) => {
  try {
    const usersRes = await getAllUsers();
    let users = usersRes?.data?.users || usersRes?.data || [];

    users = users.map(user => {
      const baseSalary = user.baseSalary || (user.role === 'manager' ? 25000 : user.role === 'admin' ? 35000 : 8000);
      return {
        ...user,
        department: getDeptKey(user.department) || user.department,
        baseSalary,
        housingAllowance: user.housingAllowance || Math.round(baseSalary * 0.15),
        transportAllowance: user.transportAllowance || Math.round(baseSalary * 0.1),
        otherAllowances: user.otherAllowances || 0,
        bonus: user.bonus || 0,
        overtime: user.overtime || 0,
        socialInsurance: user.socialInsurance || Math.round(baseSalary * DEDUCTION_RATES.socialInsurance),
        tax: user.tax || Math.round(baseSalary * DEDUCTION_RATES.tax),
        otherDeductions: user.otherDeductions || 0,
        hoursShortfall: user.hoursShortfall || 0
      };
    });

    if (isEmployeeView) {
      users = users.filter(u => u._id === currentUser?._id || u.id === currentUser?.id);
    }

    return users;
  } catch (err) {
    console.error('Error fetching users:', err);
    return null;
  }
};

export const exportToExcel = (filteredEmployees, allVisibleColumns, DEPARTMENTS) => {
  const headers = ['ID', 'الموظف', 'القسم', 'الوظيفة', ...allVisibleColumns.map(col => col.label), 'الإجمالي', 'الخصومات', 'الصافي'];
  const rows = filteredEmployees.map(emp => [
    emp._id || emp.id,
    emp.name,
    getDeptName(emp.department),
    emp.jobTitle || emp.role || 'موظف',
    ...allVisibleColumns.map(col => safeNum(emp[col.key])),
    safeNum(emp.grossSalary),
    safeNum(emp.totalDeductions),
    safeNum(emp.netSalary),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `HR_Payroll_Export_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};
