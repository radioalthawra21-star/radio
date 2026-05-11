export interface PayrollStats {
  id: number;
  label: string;
  value: number | string;
  icon: any;
  trend: 'up' | 'down';
  change: number;
}

export interface OrgUnit {
  id: number;
  name: string;
  role: string;
  children?: OrgUnit[];
}

export interface AccountabilityMatrixItem {
  role: string;
  'Time Tracking': string;
  'Data Validation': string;
  'Payroll Calculation': string;
  'Approval': string;
  'Bank Transmission': string;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  period: string;
  status: 'pending' | 'approved' | 'processed';
}

export interface PayrollPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
}