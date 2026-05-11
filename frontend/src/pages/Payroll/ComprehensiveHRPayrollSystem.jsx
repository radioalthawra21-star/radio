/**
 * Comprehensive HR & Payroll Management System
 * Employee Master Data + Dynamic Payroll Calculations + API Integration
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FaUser, FaBuilding, FaMoneyBillWave, FaCalculator, FaDownload, FaFileExcel, FaPrint, FaSync, FaPlus, FaEdit, FaTrash, FaChartBar, FaFileInvoice, FaSave, FaTimes, FaExchangeAlt, FaCog, FaColumns } from 'react-icons/fa';
import { getStoredUser } from '../../services/authService';
import { getAllUsers } from '../../services/userService';
import DynamicNumber from '../../components/DynamicNumber';
import './ComprehensiveHRPayrollSystem.css';

// Job Grades Configuration
const JOB_GRADES = {
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

// Deduction rates
const DEDUCTION_RATES = {
  socialInsurance: 0.09,
  tax: 0.15,
  other: 0.02
};

const ALL_COLUMNS = [
  { key: 'baseSalary', label: 'الراتب الأساسي', type: 'number', deletable: false, category: 'earning' },
  { key: 'housingAllowance', label: 'بدل السكن', type: 'number', deletable: true, category: 'earning' },
  { key: 'transportAllowance', label: 'بدل النقل', type: 'number', deletable: true, category: 'earning' },
  { key: 'otherAllowances', label: 'بدلات أخرى', type: 'number', deletable: true, category: 'earning' },
  { key: 'bonus', label: 'المكافآت', type: 'number', deletable: true, category: 'earning' },
  { key: 'overtime', label: 'ساعات إضافية', type: 'number', deletable: true, category: 'earning' },
  { key: 'socialInsurance', label: 'التأمينات الاجتماعية', type: 'number', deletable: true, category: 'deduction' },
  { key: 'tax', label: 'الضريبة', type: 'number', deletable: true, category: 'deduction' },
  { key: 'otherDeductions', label: 'استقطاعات أخرى', type: 'number', deletable: true, category: 'deduction' },
];
const ALL_COLUMN_KEYS = ALL_COLUMNS.map(c => c.key);

// Default salary ranges by job title
const DEFAULT_SALARIES = {
  'موظف': 6000,
  'محترف': 12000,
  'فريق lead': 18000,
  'مدير': 25000,
  'مدير عام': 35000
};

// Departments - راديو الثورة (مؤسسة إعلامية غير ربحية)
const DEPARTMENTS = {
  financial: { name: 'المالي', manager: 'المدير المالي', budget: 200000 },
  it: { name: 'تقنية المعلومات', manager: 'مدير تقنية المعلومات', budget: 200000 },
  marketing: { name: 'التسويق', manager: 'مدير التسويق', budget: 250000 },
  news: { name: 'الأخبار', manager: 'مدير الأخبار', budget: 300000 },
  production: { name: 'الإنتاج', manager: 'مدير الإنتاج', budget: 500000 },
  live_broadcast: { name: 'البث المباشر', manager: 'مدير البث المباشر', budget: 300000 },
  hr: { name: 'الموارد البشرية', manager: 'مدير الموارد البشرية', budget: 150000 }
};

// Generate realistic mock employee data (fallback if API fails)
const generateMockEmployees = (currentUser = null) => {
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

const ComprehensiveHRPayrollSystem = () => {
  const currentUser = useMemo(() => getStoredUser(), []);
  const isEmployeeView = currentUser?.role === 'employee';
  const isAdminOrManager = ['admin', 'manager'].includes(currentUser?.role);
  const fetchDataRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState('view');
  const [formData, setFormData] = useState({});
  const [filterDept, setFilterDept] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Column management state
  const [activeColumns, setActiveColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_activeColumns');
      if (saved) {
        const parsed = JSON.parse(saved);
        const nonDeletable = ALL_COLUMNS.filter(c => !c.deletable).map(c => c.key);
        return [...new Set([...parsed, ...nonDeletable])];
      }
    } catch {}
    return ALL_COLUMN_KEYS;
  });
  const [dynamicColumns, setDynamicColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_dynamicColumns');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [newColumnForm, setNewColumnForm] = useState({ label: '', defaultValue: '', category: 'allowance' });
  const [columnToDelete, setColumnToDelete] = useState(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);

  // Currency toggle & exchange rate configuration
  const [currency, setCurrency] = useState(() => localStorage.getItem('payroll_currency') || 'SYP');
  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = localStorage.getItem('payroll_exchange_rate');
    return saved ? parseFloat(saved) : 13000;
  });
  const [showExchangeRate, setShowExchangeRate] = useState(false);

  // Save currency preference to localStorage
  useEffect(() => {
    localStorage.setItem('payroll_currency', currency);
  }, [currency]);

  // Save exchange rate to localStorage
  useEffect(() => {
    localStorage.setItem('payroll_exchange_rate', exchangeRate.toString());
  }, [exchangeRate]);

  // Persist column management state
  useEffect(() => {
    localStorage.setItem('hr_activeColumns', JSON.stringify(activeColumns));
  }, [activeColumns]);

  useEffect(() => {
    localStorage.setItem('hr_dynamicColumns', JSON.stringify(dynamicColumns));
  }, [dynamicColumns]);

  // Save employees to localStorage whenever they change (persist across refresh)
  useEffect(() => {
    if (employees.length > 0) {
      localStorage.setItem('hr_employees', JSON.stringify(employees));
    }
  }, [employees]);

  const fetchFromApi = useCallback(async () => {
    // Try API first, fallback to mock data
    try {
      const usersRes = await getAllUsers();
      let users = usersRes?.data?.users || usersRes?.data || [];

      users = users.map(user => ({
        ...user,
        baseSalary: user.baseSalary || (user.role === 'manager' ? 25000 : user.role === 'admin' ? 35000 : 8000),
        housingAllowance: user.housingAllowance || Math.round((user.baseSalary || 8000) * 0.15),
        transportAllowance: user.transportAllowance || Math.round((user.baseSalary || 8000) * 0.1),
        otherAllowances: user.otherAllowances || 0,
        bonus: user.bonus || 0,
        overtime: user.overtime || 0,
        socialInsurance: user.socialInsurance || Math.round((user.baseSalary || 8000) * DEDUCTION_RATES.socialInsurance),
        tax: user.tax || Math.round((user.baseSalary || 8000) * DEDUCTION_RATES.tax),
        otherDeductions: user.otherDeductions || 0
      }));

      if (isEmployeeView) {
        users = users.filter(u => u._id === currentUser?._id || u.id === currentUser?.id);
      }

      return users;
    } catch (err) {
      console.error('Error fetching users:', err);
      return null;
    }
  }, [isEmployeeView, currentUser]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);

      if (!forceRefresh) {
        // Load from localStorage first (user's saved changes)
        try {
          const saved = localStorage.getItem('hr_employees');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const data = isEmployeeView
                ? parsed.filter(u => u._id === currentUser?._id || u.id === currentUser?.id)
                : parsed;
              if (data.length > 0) {
                setEmployees(data);
                setLoading(false);
                return;
              }
            }
          }
        } catch {}
      }

      // Fallback to API (or force from API)
      const apiUsers = await fetchFromApi();
      if (apiUsers && apiUsers.length > 0) {
        // Merge with existing stored data to preserve dynamic column values
        const existingData = (() => {
          try {
            const saved = localStorage.getItem('hr_employees');
            return saved ? JSON.parse(saved) : [];
          } catch { return []; }
        })();
        const merged = apiUsers.map(apiUser => {
          const existing = existingData.find(
            e => e._id === apiUser._id || e.id === apiUser.id
          );
          if (existing) {
            // Preserve dynamic column fields and any local-only fields
            const dynamicFields = {};
            Object.keys(existing).forEach(k => {
              if (k.startsWith('dynamic_')) {
                dynamicFields[k] = existing[k];
              }
            });
            return { ...apiUser, ...dynamicFields };
          }
          return apiUser;
        });
        setEmployees(merged);
      } else {
        const mockEmployees = generateMockEmployees(isEmployeeView ? currentUser : null);
        setEmployees(mockEmployees);
      }
    } catch (error) {
      console.error('Error initializing ', error);
      const mockEmployees = generateMockEmployees(isEmployeeView ? currentUser : null);
      setEmployees(mockEmployees);
    } finally {
      setLoading(false);
    }
  }, [isEmployeeView, currentUser, fetchFromApi]);

  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset bulk edit mode when closing the modal
  useEffect(() => {
    if (!isEditing) setBulkEditMode(false);
  }, [isEditing]);

  // Safe numeric parser: handles empty, null, NaN, and string inputs
  const safeNum = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const parsed = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  // All visible columns (base + dynamic, ordered by category)
  const allVisibleColumns = useMemo(() => {
    const baseEarning = ALL_COLUMNS.filter(c => c.category === 'earning' && activeColumns.includes(c.key));
    const baseDeduction = ALL_COLUMNS.filter(c => c.category === 'deduction' && activeColumns.includes(c.key));
    const dynamicCols = dynamicColumns.map(dc => ({
      key: `dynamic_${dc.id}`,
      label: dc.label,
      type: 'number',
      deletable: true,
      category: dc.category === 'allowance' ? 'earning' : 'deduction'
    }));
    const dynamicEarning = dynamicCols.filter(c => c.category === 'earning');
    const dynamicDeduction = dynamicCols.filter(c => c.category === 'deduction');
    return [...baseEarning, ...dynamicEarning, ...baseDeduction, ...dynamicDeduction];
  }, [activeColumns, dynamicColumns]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    if (!employees || employees.length === 0) return [];

    // If employee view, show only self
    let baseList = isEmployeeView
      ? employees.filter(emp => emp._id === currentUser?._id || emp.id === currentUser?.id)
      : employees;

    return baseList.filter(emp => {
      const matchesDept = filterDept === 'all' || emp.department === filterDept;
      const name = emp.name || '';
      const id = emp._id || emp.id || '';
      const jobTitle = emp.jobTitle || emp.role || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [employees, filterDept, searchTerm, isEmployeeView, currentUser]);

  // Summary statistics
  const summary = useMemo(() => {
    if (filteredEmployees.length === 0) {
      return { employeeCount: 0, avgGross: 0, avgNet: 0, totalGross: 0, totalNet: 0, totalDeductions: 0, totalBase: 0 };
    }

    const totals = filteredEmployees.reduce((acc, emp) => {
      const baseSalary = emp.baseSalary || 0;
      const housing = emp.housingAllowance || 0;
      const transport = emp.transportAllowance || 0;
      const other = emp.otherAllowances || 0;
      const bonus = emp.bonus || 0;
      const overtime = emp.overtime || 0;

      let gross = baseSalary + housing + transport + other + bonus + overtime;
      dynamicColumns.filter(dc => dc.category === 'earning').forEach(dc => {
        gross += safeNum(emp[`dynamic_${dc.id}`]);
      });
      let deductions = (emp.socialInsurance || 0) + (emp.tax || 0) + (emp.otherDeductions || 0);
      dynamicColumns.filter(dc => dc.category === 'deduction').forEach(dc => {
        deductions += safeNum(emp[`dynamic_${dc.id}`]);
      });
      const net = gross - deductions;

      acc.totalGross += gross;
      acc.totalNet += net;
      acc.totalDeductions += deductions;
      acc.totalBase += baseSalary;
      return acc;
    }, { totalGross: 0, totalNet: 0, totalDeductions: 0, totalBase: 0 });

    return {
      employeeCount: filteredEmployees.length,
      avgGross: Math.round(totals.totalGross / filteredEmployees.length),
      avgNet: Math.round(totals.totalNet / filteredEmployees.length),
      totalGross: totals.totalGross,
      totalNet: totals.totalNet,
      totalDeductions: totals.totalDeductions,
      totalBase: totals.totalBase
    };
  }, [filteredEmployees, dynamicColumns]);

  // Column totals for footer
  const columnTotals = useMemo(() => {
    return allVisibleColumns.reduce((acc, col) => {
      acc[col.key] = filteredEmployees.reduce((sum, emp) => sum + safeNum(emp[col.key]), 0);
      return acc;
    }, {});
  }, [filteredEmployees, allVisibleColumns]);

  // Handlers
  const handleEdit = (employee) => {
    const empData = {
      ...employee,
      // Map backend field names to form fields
      baseSalary: employee.baseSalary || 0,
      housingAllowance: employee.housingAllowance || 0,
      transportAllowance: employee.transportAllowance || 0,
      otherAllowances: employee.otherAllowances || 0,
      bonus: employee.bonus || 0,
      overtime: employee.overtime || 0,
      socialInsurance: employee.socialInsurance || 0,
      tax: employee.tax || 0,
      otherDeductions: employee.otherDeductions || 0
    };
    // Include dynamic column values
    dynamicColumns.forEach(dc => {
      const key = `dynamic_${dc.id}`;
      empData[key] = employee[key] || 0;
    });
    setFormData(empData);
    setSelectedEmployee(employee);
    setEditMode('edit');
    setIsEditing(true);
    setBulkEditMode(false);
  };

  const handleAdd = () => {
    const emptyEmployee = {
      id: '',
      _id: '',
      name: '',
      department: '',
      jobTitle: '',
      grade: 1,
      hireDate: new Date().toISOString().split('T')[0],
      status: 'active',
      baseSalary: 5000,
      housingAllowance: 800,
      transportAllowance: 500,
      otherAllowances: 200,
      bonus: 0,
      overtime: 0,
      socialInsurance: 0,
      tax: 0,
      otherDeductions: 0
    };
    // Include dynamic column default values
    dynamicColumns.forEach(dc => {
      emptyEmployee[`dynamic_${dc.id}`] = safeNum(dc.defaultValue);
    });
    setFormData(emptyEmployee);
    setSelectedEmployee(null);
    setEditMode('add');
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // Debug: log current state
      console.log('[handleSave] formData._id:', formData._id, 'formData.id:', formData.id, 'editMode:', editMode, 'bulkEditMode:', bulkEditMode);

      // Use safeNum for all monetary fields to handle strings, nulls, empty values
      const baseSalary = safeNum(formData.baseSalary);
      const housingAllowance = safeNum(formData.housingAllowance);
      const transportAllowance = safeNum(formData.transportAllowance);
      const otherAllowances = safeNum(formData.otherAllowances);
      const bonus = safeNum(formData.bonus);
      const overtime = safeNum(formData.overtime);
      const socialInsurance = safeNum(formData.socialInsurance);
      const tax = safeNum(formData.tax);
      const otherDeductions = safeNum(formData.otherDeductions);

      // Recalculate totals from cleaned numeric values
      let totalEarnings = baseSalary + housingAllowance + transportAllowance + otherAllowances + bonus + overtime;
      dynamicColumns.filter(dc => dc.category === 'earning').forEach(dc => {
        totalEarnings += safeNum(formData[`dynamic_${dc.id}`]);
      });
      let totalDeductions = socialInsurance + tax + otherDeductions;
      dynamicColumns.filter(dc => dc.category === 'deduction').forEach(dc => {
        totalDeductions += safeNum(formData[`dynamic_${dc.id}`]);
      });
      const grossSalary = totalEarnings;
      const netSalary = grossSalary - totalDeductions;

      const updatedEmployee = {
        ...formData,
        baseSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        bonus,
        overtime,
        socialInsurance,
        tax,
        otherDeductions,
        totalEarnings,
        totalDeductions,
        grossSalary,
        netSalary
      };

      // Preserve dynamic column values
      dynamicColumns.forEach(dc => {
        const key = `dynamic_${dc.id}`;
        updatedEmployee[key] = safeNum(formData[key]);
      });

      if (editMode === 'add') {
        const newId = `EMP${String(employees.length + 1001).padStart(4, '0')}`;
        updatedEmployee.id = newId;
        updatedEmployee._id = newId;
        setEmployees((prev) => [...prev, updatedEmployee]);
      } else if (bulkEditMode) {
        const fields = Object.keys(updatedEmployee).filter(k => k !== '_id' && k !== 'id' && k !== 'name' && k !== 'department' && k !== 'jobTitle' && k !== 'grade' && k !== 'hireDate' && k !== 'status' && k !== 'role');
        setEmployees((prev) => prev.map(emp => {
          const merged = { ...emp };
          fields.forEach(k => { merged[k] = updatedEmployee[k]; });
          merged.totalEarnings = updatedEmployee.totalEarnings;
          merged.totalDeductions = updatedEmployee.totalDeductions;
          merged.grossSalary = updatedEmployee.grossSalary;
          merged.netSalary = updatedEmployee.netSalary;
          return merged;
        }));
      } else {
        const targetId = formData._id || formData.id;
        console.log('[handleSave] targetId:', targetId);
        if (!targetId) {
          console.warn('[handleSave] No target ID found, cannot save individual edit');
          alert('خطأ: لم يتم العثور على معرف الموظف');
          return;
        }
        setEmployees((prev) => prev.map((emp) => {
          // Match by _id first; fall back to id only if formData.id is defined
          // (avoids matching all employees when API doesn't return an `id` field)
          if (emp._id === targetId) return updatedEmployee;
          if (formData.id && emp.id === formData.id) return updatedEmployee;
          return emp;
        }));
      }

      setIsEditing(false);
      setBulkEditMode(false);
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('حدث خطأ في حفظ البيانات');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
      try {
        setEmployees((prev) => prev.filter((emp) => emp._id !== id && emp.id !== id));
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  const handleRecalculateAll = () => {
    const recalculated = employees.map((emp) => {
      const baseSalary = safeNum(emp.baseSalary);
      const housing = safeNum(emp.housingAllowance);
      const transport = safeNum(emp.transportAllowance);
      const other = safeNum(emp.otherAllowances);
      const bonus = safeNum(emp.bonus);
      const overtime = safeNum(emp.overtime);

      let totalEarnings = baseSalary + housing + transport + other + bonus + overtime;
      dynamicColumns.filter(dc => dc.category === 'earning').forEach(dc => {
        totalEarnings += safeNum(emp[`dynamic_${dc.id}`]);
      });
      const socialInsurance = Math.round(baseSalary * DEDUCTION_RATES.socialInsurance);
      const tax = Math.round(baseSalary * DEDUCTION_RATES.tax);
      const otherDeductions = Math.round(baseSalary * DEDUCTION_RATES.other);
      let totalDeductions = socialInsurance + tax + otherDeductions;
      dynamicColumns.filter(dc => dc.category === 'deduction').forEach(dc => {
        totalDeductions += safeNum(emp[`dynamic_${dc.id}`]);
      });

      return {
        ...emp,
        socialInsurance,
        tax,
        otherDeductions,
        totalEarnings,
        totalDeductions,
        grossSalary: totalEarnings,
        netSalary: totalEarnings - totalDeductions
      };
    });
    setEmployees(recalculated);
  };

  const exportToExcel = () => {
    const baseHeaders = ['ID', 'Name', 'Department', 'Job Title', 'Base Salary', 'Housing', 'Transport', 'Other Allowances'];
    const dynHeaders = allVisibleColumns.map(col => col.label);
    const headers = [...baseHeaders, ...dynHeaders, 'Gross', 'Deductions', 'Net'];
    const rows = filteredEmployees.map(emp => {
      const base = [
        emp._id || emp.id,
        emp.name,
        DEPARTMENTS[emp.department]?.name || emp.department,
        emp.jobTitle || emp.role,
        emp.baseSalary || 0,
        emp.housingAllowance || 0,
        emp.transportAllowance || 0,
        emp.otherAllowances || 0
      ];
      const dyn = allVisibleColumns.map(col => emp[col.key] ?? 0);
      return [...base, ...dyn, emp.grossSalary || 0, emp.totalDeductions || 0, emp.netSalary || 0];
    });

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

  const printPayroll = () => {
    window.print();
  };

  // Format currency: salaries stored in USD, convert to SYP when needed
  const formatCurrency = useCallback((amount, size = 'normal') => {
    const num = safeNum(amount);
    const displayAmount = currency === 'SYP' ? num * exchangeRate : num;

    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(displayAmount);

    const suffix = currency === 'USD' ? ' $' : ' ل.س';
    const fullText = `${formatted}${suffix}`;

    const sizeMap = {
      small: { base: '0.75rem', min: '0.5rem' },
      normal: { base: '0.875rem', min: '0.5rem' },
      large: { base: '1.125rem', min: '0.5625rem' },
      xl: { base: '1.5rem', min: '0.625rem' },
      xxl: { base: '1.875rem', min: '0.75rem' },
    };

    const s = sizeMap[size] || sizeMap.normal;
    return (
      <DynamicNumber
        value={fullText}
        baseSize={s.base}
        minSize={s.min}
        maxLen={currency === 'SYP' ? 18 : 14}
      />
    );
  }, [currency, exchangeRate]);

  // Column management handlers
  const toggleColumnVisibility = (key) => {
    const col = ALL_COLUMNS.find(c => c.key === key);
    if (col && !col.deletable) return;
    setActiveColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleAddDynamicColumn = () => {
    if (!newColumnForm.label.trim()) return;
    const id = Date.now();
    const key = `dynamic_${id}`;
    const defaultValue = safeNum(newColumnForm.defaultValue);
    const category = newColumnForm.category === 'allowance' ? 'earning' : 'deduction';

    const newCol = { id, label: newColumnForm.label.trim(), defaultValue, category };

    setDynamicColumns(prev => [...prev, newCol]);
    setActiveColumns(prev => [...prev, key]);

    setEmployees(prev => prev.map(emp => ({
      ...emp,
      [key]: defaultValue
    })));

    setNewColumnForm({ label: '', defaultValue: '', category: 'allowance' });
  };

  const handleDeleteDynamicColumn = (col) => {
    const key = `dynamic_${col.id}`;
    setDynamicColumns(prev => prev.filter(c => c.id !== col.id));
    setActiveColumns(prev => prev.filter(k => k !== key));

    setEmployees(prev => prev.map(emp => {
      const { [key]: _, ...rest } = emp;
      return rest;
    }));
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="hr-payroll-system">
      {/* Header */}
      <div className="system-header">
        <div className="header-content">
          <div className="header-title">
            <h1>
              <FaUser className="icon" />
              {isEmployeeView ? 'رواتبي' : 'نظام الموارد البشرية والرواتب المتكامل'}
            </h1>
            <p>{isEmployeeView ? 'عرض وإدارة بياناتك الشخصية والراتب' : 'إدارة شاملة للموظفين وكشوف الرواتب مع حسابات تلقائية'}</p>
          </div>
          {!isEmployeeView && (
            <div className="header-actions">
              {/* Column Manager Button */}
              <button onClick={() => setShowColumnManager(true)} className="btn-secondary" title="إدارة الأعمدة">
                <FaColumns /> إدارة الأعمدة
              </button>
              {/* Currency toggle: SYP <-> USD */}
              <button
                onClick={() => setCurrency((c) => c === 'SYP' ? 'USD' : 'SYP')}
                className="btn-secondary"
                title={`التبديل إلى ${currency === 'SYP' ? 'دولار أمريكي' : 'ليرة سورية'}`}
              >
                <FaExchangeAlt /> {currency === 'SYP' ? 'USD' : 'SYP'}
              </button>
              {/* Exchange rate settings toggle */}
              <button
                onClick={() => setShowExchangeRate((v) => !v)}
                className="btn-secondary"
                title="إعدادات سعر الصرف"
              >
                <FaCog />
              </button>
              <button
                onClick={() => fetchDataRef.current?.(true)}
                className="btn-secondary"
                disabled={loading}
                title="تحديث البيانات"
              >
                <FaSync className={loading ? 'spinning' : ''} />
                {loading ? 'جاري التحديث...' : 'تحديث'}
              </button>
              <button onClick={handleAdd} className="btn-primary">
                <FaPlus /> إضافة موظف
              </button>
              <button onClick={handleRecalculateAll} className="btn-secondary">
                <FaCalculator /> إعادة حساب الكل
              </button>
              <button onClick={exportToExcel} className="btn-success">
                <FaDownload /> تصدير Excel
              </button>
              <button onClick={printPayroll} className="btn-info">
                <FaPrint /> طباعة
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exchange Rate Configuration Panel */}
      {showExchangeRate && !isEmployeeView && (
        <div className="exchange-rate-panel">
          <h3><FaCog /> إعدادات سعر الصرف</h3>
          <div className="exchange-rate-input-group">
            <label>1 USD = </label>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) setExchangeRate(val);
              }}
              min="1"
              step="1"
              className="rate-input"
            />
            <span> ل.س</span>
          </div>
          <p className="rate-hint">الرواتب بالدولار تُعرض بالليرة السورية بناءً على هذا السعر</p>
        </div>
      )}

      {/* Currency indicator */}
      <div className="currency-indicator">
        <span className={`currency-badge ${currency.toLowerCase()}`}>{currency}</span>
        {currency === 'SYP' && <span className="rate-label">كل واحد دولار يساوي {exchangeRate.toLocaleString('en-US')} ليرة سورية</span>}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon employees"><FaUser /></div>
          <div className="stat-info">
            <h3>إجمالي الموظفين</h3>
            <p className="stat-value">{summary.employeeCount}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gross"><FaMoneyBillWave /></div>
          <div className="stat-info">
            <h3>إجمالي الرواتب الإجمالي</h3>
            <p className="stat-value">{formatCurrency(summary.totalGross)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon deductions"><FaCalculator /></div>
          <div className="stat-info">
            <h3>إجمالي الخصومات</h3>
            <p className="stat-value">{formatCurrency(summary.totalDeductions)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon net"><FaMoneyBillWave /></div>
          <div className="stat-info">
            <h3>صافي الرواتب</h3>
            <p className="stat-value">{formatCurrency(summary.totalNet)}</p>
          </div>
        </div>
      </div>

      {/* Filters (Admin/Manager only) */}
      {!isEmployeeView && (
        <div className="filters-section">
          <div className="filter-group">
            <label>القسم:</label>
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
              <option value="all">جميع الأقسام</option>
              {Object.entries(DEPARTMENTS).map(([key, dept]) => (
                <option key={key} value={key}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group search">
            <input
              type="text"
              placeholder="بحث بالاسم، الرقم الوظيفي، أو الوظيفة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Employee Data Table */}
      <div className="table-container">
        <table className="payroll-table">
          <thead>
            <tr>
              {!isEmployeeView && <th>#</th>}
              <th>الموظف</th>
              {!isEmployeeView && <th>القسم</th>}
              <th>الوظيفة</th>
              {allVisibleColumns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
              <th>الإجمالي</th>
              <th>الخصومات</th>
              <th>الصافي</th>
              {!isEmployeeView && <th>الإجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp, index) => (
              <tr key={emp._id || emp.id} className={selectedEmployee?._id === emp._id ? 'selected' : ''}>
                {!isEmployeeView && <td>{index + 1}</td>}
                <td>
                  <div className="employee-info">
                    <strong>{emp.name}</strong>
                    <small>{emp._id || emp.id}</small>
                  </div>
                </td>
                {!isEmployeeView && (
                  <td>
                    <span className="dept-badge">
                      {DEPARTMENTS[emp.department]?.name || emp.department}
                    </span>
                  </td>
                )}
                <td>{emp.role || emp.jobTitle || 'موظف'}</td>
                {allVisibleColumns.map(col => (
                  <td key={col.key} className="currency">{formatCurrency(emp[col.key])}</td>
                ))}
                <td className="gross">{formatCurrency(emp.grossSalary || 0)}</td>
                <td className="deductions">{formatCurrency(emp.totalDeductions || 0)}</td>
                <td className="net">{formatCurrency(emp.netSalary || 0)}</td>
                {!isEmployeeView && (
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => handleEdit(emp)} className="edit-btn" title="تعديل">
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDelete(emp._id || emp.id)} className="delete-btn" title="حذف">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              {!isEmployeeView && <td><strong>#</strong></td>}
              <td><strong>الإجمالي</strong></td>
              {!isEmployeeView && <td><strong>القسم</strong></td>}
              <td></td>
              {allVisibleColumns.map(col => (
                <td key={col.key} className="currency"><strong>{formatCurrency(columnTotals[col.key])}</strong></td>
              ))}
              <td className="gross"><strong>{formatCurrency(summary.totalGross)}</strong></td>
              <td className="deductions"><strong>{formatCurrency(summary.totalDeductions)}</strong></td>
              <td className="net"><strong>{formatCurrency(summary.totalNet)}</strong></td>
              {!isEmployeeView && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editMode === 'add' ? 'إضافة موظف جديد' : 'تعديل بيانات الموظف'}</h2>
            {editMode !== 'add' && (
              <div className="bulk-toggle-container" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'left' }}>
                <button
                  onClick={() => setBulkEditMode(!bulkEditMode)}
                  className={bulkEditMode ? 'btn-danger' : 'btn-secondary'}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {bulkEditMode ? '⬅️ العودة للتعديل الفردي' : '➡️ تطبيق على كل الموظفين'}
                </button>
              </div>
            )}
            {bulkEditMode && (
              <div className="bulk-warning" style={{ marginBottom: '15px', padding: '10px 15px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', color: '#856404', fontSize: '0.875rem' }}>
                ⚠️ سيتم تطبيق القيم المدخلة على <strong>جميع الموظفين</strong>
              </div>
            )}
            <div className="form-grid">
              <div className="form-group">
                <label>ID</label>
                <input type="text" value={formData._id || formData.id || ''} readOnly placeholder="يُولد تلقائياً" />
              </div>
              <div className="form-group">
                <label>الاسم الكامل *</label>
                <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>القسم</label>
                <select value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})}>
                  <option value="">اختر القسم</option>
                  {Object.entries(DEPARTMENTS).map(([key, dept]) => (
                    <option key={key} value={key}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>المسمى الوظيفي</label>
                <select value={formData.jobTitle || ''} onChange={e => setFormData({...formData, jobTitle: e.target.value, grade: JOB_GRADES[e.target.value]?.grade || 1})}>
                  <option value="">اختر الوظيفة</option>
                  {Object.keys(JOB_GRADES).map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>تاريخ التعيين</label>
                <input type="date" value={formData.hireDate || ''} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
              </div>

              <div className="section-header" style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                <h3><FaMoneyBillWave /> المستحقات (Earnings)</h3>
              </div>
              <div className="form-group">
                <label>الراتب الأساسي</label>
                <input type="number" value={safeNum(formData.baseSalary)} onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })} />
              </div>
              <div className="form-group">
                <label>بدل السكن</label>
                <input type="number" value={safeNum(formData.housingAllowance)} onChange={(e) => setFormData({ ...formData, housingAllowance: e.target.value })} />
              </div>
              <div className="form-group">
                <label>بدل النقل</label>
                <input type="number" value={safeNum(formData.transportAllowance)} onChange={(e) => setFormData({ ...formData, transportAllowance: e.target.value })} />
              </div>
              <div className="form-group">
                <label>بدلات أخرى</label>
                <input type="number" value={safeNum(formData.otherAllowances)} onChange={(e) => setFormData({ ...formData, otherAllowances: e.target.value })} />
              </div>
              <div className="form-group">
                <label>المكافآت</label>
                <input type="number" value={safeNum(formData.bonus)} onChange={(e) => setFormData({ ...formData, bonus: e.target.value })} />
              </div>
              <div className="form-group">
                <label>ساعات إضافية</label>
                <input type="number" value={safeNum(formData.overtime)} onChange={(e) => setFormData({ ...formData, overtime: e.target.value })} />
              </div>
              {/* Dynamic earning columns in edit form */}
              {dynamicColumns.filter(dc => dc.category === 'earning').map(dc => {
                const key = `dynamic_${dc.id}`;
                return (
                  <div className="form-group" key={key}>
                    <label>{dc.label}</label>
                    <input type="number" value={safeNum(formData[key])} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
                  </div>
                );
              })}

              <div className="section-header" style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                <h3><FaCalculator /> الاستقطاعات (Deductions)</h3>
              </div>
              <div className="form-group">
                <label>التأمينات الاجتماعية ({DEDUCTION_RATES.socialInsurance * 100}%)</label>
                <input type="number" value={safeNum(formData.socialInsurance)} onChange={(e) => setFormData({ ...formData, socialInsurance: e.target.value })} />
              </div>
              <div className="form-group">
                <label>الضريبة ({DEDUCTION_RATES.tax * 100}%)</label>
                <input type="number" value={safeNum(formData.tax)} onChange={(e) => setFormData({ ...formData, tax: e.target.value })} />
              </div>
              <div className="form-group">
                <label>استقطاعات أخرى</label>
                <input type="number" value={safeNum(formData.otherDeductions)} onChange={(e) => setFormData({ ...formData, otherDeductions: e.target.value })} />
              </div>
              {/* Dynamic deduction columns in edit form */}
              {dynamicColumns.filter(dc => dc.category === 'deduction').map(dc => {
                const key = `dynamic_${dc.id}`;
                return (
                  <div className="form-group" key={key}>
                    <label>{dc.label}</label>
                    <input type="number" value={safeNum(formData[key])} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
                  </div>
                );
              })}

              <div className="section-header" style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                <h3>النتائج المحسوبة تلقائياً</h3>
              </div>
              <div className="form-group readonly">
                <label>إجمالي المستحقات</label>
                <input type="text" readOnly value={formatCurrency(
                  safeNum(formData.baseSalary) +
                  safeNum(formData.housingAllowance) +
                  safeNum(formData.transportAllowance) +
                  safeNum(formData.otherAllowances) +
                  safeNum(formData.bonus) +
                  safeNum(formData.overtime) +
                  dynamicColumns.filter(dc => dc.category === 'earning').reduce((sum, dc) => sum + safeNum(formData[`dynamic_${dc.id}`]), 0)
                )} />
              </div>
              <div className="form-group readonly">
                <label>صافي الراتب</label>
                <input type="text" readOnly value={formatCurrency(
                  (safeNum(formData.baseSalary) +
                   safeNum(formData.housingAllowance) +
                   safeNum(formData.transportAllowance) +
                   safeNum(formData.otherAllowances) +
                   safeNum(formData.bonus) +
                   safeNum(formData.overtime) +
                   dynamicColumns.filter(dc => dc.category === 'earning').reduce((sum, dc) => sum + safeNum(formData[`dynamic_${dc.id}`]), 0)) -
                  (safeNum(formData.socialInsurance) +
                   safeNum(formData.tax) +
                   safeNum(formData.otherDeductions) +
                   dynamicColumns.filter(dc => dc.category === 'deduction').reduce((sum, dc) => sum + safeNum(formData[`dynamic_${dc.id}`]), 0))
                )} />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleSave} className="btn-save"><FaSave /> حفظ</button>
              <button onClick={() => setIsEditing(false)} className="btn-cancel"><FaTimes /> إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Column Manager Modal */}
      {showColumnManager && (
        <div className="modal-overlay" onClick={() => setShowColumnManager(false)}>
          <div className="modal-content column-manager-modal" onClick={e => e.stopPropagation()}>
            <h2><FaColumns /> إدارة الأعمدة</h2>

            <div className="column-manager-section">
              <h3>الأعمدة الأساسية</h3>
              {ALL_COLUMNS.map(col => (
                <div key={col.key} className="column-toggle-row">
                  <label>{col.label}</label>
                  <input
                    type="checkbox"
                    checked={activeColumns.includes(col.key)}
                    disabled={!col.deletable}
                    onChange={() => toggleColumnVisibility(col.key)}
                  />
                </div>
              ))}
            </div>

            <div className="column-manager-section">
              <h3>الأعمدة المخصصة</h3>
              {dynamicColumns.length === 0 && <p className="no-columns-msg">لا توجد أعمدة مخصصة بعد</p>}
              {dynamicColumns.map(dc => (
                <div key={dc.id} className="column-toggle-row">
                  <span>{dc.label} ({dc.category === 'earning' ? 'بدل' : 'خصم'})</span>
                  <button onClick={() => setColumnToDelete(dc)} className="btn-delete-small" title="حذف العمود">
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>

            <div className="column-manager-section">
              <h3>إضافة عمود جديد</h3>
              <div className="add-column-form">
                <input
                  type="text"
                  placeholder="اسم العمود"
                  value={newColumnForm.label}
                  onChange={e => setNewColumnForm({ ...newColumnForm, label: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="القيمة الافتراضية"
                  value={newColumnForm.defaultValue}
                  onChange={e => setNewColumnForm({ ...newColumnForm, defaultValue: e.target.value })}
                />
                <select
                  value={newColumnForm.category}
                  onChange={e => setNewColumnForm({ ...newColumnForm, category: e.target.value })}
                >
                  <option value="allowance">بدل</option>
                  <option value="deduction">خصم</option>
                </select>
                <button onClick={handleAddDynamicColumn} className="btn-primary">
                  <FaPlus /> إضافة
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowColumnManager(false)} className="btn-save"><FaSave /> تم</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Column Confirmation Modal */}
      {columnToDelete && (
        <div className="modal-overlay" onClick={() => setColumnToDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>تأكيد الحذف</h2>
            <p>هل أنت متأكد من حذف عمود "{columnToDelete.label}"؟</p>
            <div className="modal-actions">
              <button
                onClick={() => { handleDeleteDynamicColumn(columnToDelete); setColumnToDelete(null); }}
                className="btn-danger"
              >
                <FaTrash /> حذف
              </button>
              <button onClick={() => setColumnToDelete(null)} className="btn-cancel">
                <FaTimes /> إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="legend">
        <div className="legend-item"><span className="legend-color gross"></span> الإجمالي</div>
        <div className="legend-item"><span className="legend-color deductions"></span> الخصومات</div>
        <div className="legend-item"><span className="legend-color net"></span> الصافي</div>
      </div>
    </div>
  );
};

export default ComprehensiveHRPayrollSystem;
