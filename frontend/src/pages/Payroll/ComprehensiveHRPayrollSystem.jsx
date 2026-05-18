import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaMoneyBillWave, FaCalculator, FaDownload, FaPrint, FaSync, FaPlus, FaEdit, FaTrash, FaColumns, FaExchangeAlt, FaCog, FaSearch, FaFilter, FaTimes, FaUsers, FaBalanceScale, FaArrowLeft } from 'react-icons/fa';
import DynamicNumber from '../../components/DynamicNumber';
import { JOB_GRADES, DEDUCTION_RATES, ALL_COLUMNS, ALL_COLUMN_KEYS, DEPARTMENTS, getDeptName, getDeptKey, ROLE_LABELS } from './comprehensive/config';
import { safeNum, generateMockEmployees, fetchFromApi, exportToExcel } from './comprehensive/utils';
import { createUser, updateUser, deleteUser } from '../../services/userService';
import EditModal from './comprehensive/EditModal';
import ColumnManager from './comprehensive/ColumnManager';
import DeleteConfirm from './comprehensive/DeleteConfirm';

const STORAGE = {
  activeColumns: 'hr_activeColumns',
  dynamicColumns: 'hr_dynamicColumns',
  employees: 'hr_employees',
  currency: 'payroll_currency',
  exchangeRate: 'payroll_exchange_rate',
};

const loadJSON = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
      if (!Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return fallback;
};

const ComprehensiveHRPayrollSystem = () => {
  const navigate = useNavigate();
  const fetchDataRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState('view');
  const [formData, setFormData] = useState({});
  const [filterDept, setFilterDept] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [activeColumns, setActiveColumns] = useState(() => {
    const saved = loadJSON(STORAGE.activeColumns, null);
    if (saved) {
      const nonDeletable = ALL_COLUMNS.filter(c => !c.deletable).map(c => c.key);
      return [...new Set([...saved, ...nonDeletable])];
    }
    return ALL_COLUMN_KEYS;
  });

  const [dynamicColumns, setDynamicColumns] = useState(() => loadJSON(STORAGE.dynamicColumns, []));

  const [showColumnManager, setShowColumnManager] = useState(false);
  const [newColumnForm, setNewColumnForm] = useState({ label: '', defaultValue: '', category: 'allowance' });
  const [columnToDelete, setColumnToDelete] = useState(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);

  const [currency, setCurrency] = useState(() => localStorage.getItem(STORAGE.currency) || 'SYP');
  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = localStorage.getItem(STORAGE.exchangeRate);
    return saved ? parseFloat(saved) : 13000;
  });
  const [showExchangeRate, setShowExchangeRate] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE.currency, currency); }, [currency]);
  useEffect(() => { localStorage.setItem(STORAGE.exchangeRate, exchangeRate.toString()); }, [exchangeRate]);
  useEffect(() => { localStorage.setItem(STORAGE.activeColumns, JSON.stringify(activeColumns)); }, [activeColumns]);
  useEffect(() => { localStorage.setItem(STORAGE.dynamicColumns, JSON.stringify(dynamicColumns)); }, [dynamicColumns]);
  useEffect(() => {
    if (employees.length > 0) {
      localStorage.setItem(STORAGE.employees, JSON.stringify(employees));
    }
  }, [employees]);

  const normalizedEmployees = useMemo(() =>
    employees.map(emp => ({ ...emp, department: getDeptKey(emp.department) || emp.department })),
    [employees]
  );

  const clearMockData = () => {
    try {
      const saved = localStorage.getItem(STORAGE.employees);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some(e => e._id && typeof e._id === 'string' && e._id.startsWith('emp_'))) {
          localStorage.removeItem(STORAGE.employees);
        }
      }
    } catch {}
  };

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (!forceRefresh) {
        clearMockData();
        const saved = loadJSON(STORAGE.employees, []);
        if (saved.length > 0) {
          setEmployees(saved);
          setLoading(false);
          return;
        }
      }
      const apiUsers = await fetchFromApi(false, null);
      if (apiUsers?.length > 0) {
        const existingData = loadJSON(STORAGE.employees, []);
        const merged = apiUsers.map(apiUser => {
          const existing = existingData.find(e => e._id === apiUser._id || e.id === apiUser.id);
          if (existing) {
            const dynamicFields = {};
            Object.keys(existing).forEach(k => { if (k.startsWith('dynamic_')) dynamicFields[k] = existing[k]; });
            return { ...apiUser, ...dynamicFields };
          }
          return apiUser;
        });
        setEmployees(merged);
      } else {
        setEmployees([]);
      }
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!isEditing) setBulkEditMode(false); }, [isEditing]);

  const allVisibleColumns = useMemo(() => {
    const baseEarning = ALL_COLUMNS.filter(c => c.category === 'earning' && activeColumns.includes(c.key));
    const baseDeduction = ALL_COLUMNS.filter(c => c.category === 'deduction' && activeColumns.includes(c.key));
    const dynamicCols = dynamicColumns.map(dc => ({
      key: `dynamic_${dc.id}`, label: dc.label, type: 'number', deletable: true,
      category: dc.category === 'allowance' ? 'earning' : 'deduction'
    }));
    return [...baseEarning, ...dynamicCols.filter(c => c.category === 'earning'), ...baseDeduction, ...dynamicCols.filter(c => c.category === 'deduction')];
  }, [activeColumns, dynamicColumns]);

  const filteredEmployees = useMemo(() => {
    if (!normalizedEmployees.length) return [];
    return normalizedEmployees.filter(emp => {
      const empDeptKey = getDeptKey(emp.department);
      const matchesDept = filterDept === 'all' || empDeptKey === filterDept || emp.department === filterDept;
      const term = searchTerm.toLowerCase();
      const name = (emp.name || '').toLowerCase();
      const id = (emp._id || emp.id || '').toLowerCase();
      const role = (emp.jobTitle || emp.role || '').toLowerCase();
      return matchesDept && (name.includes(term) || id.includes(term) || role.includes(term));
    });
  }, [normalizedEmployees, filterDept, searchTerm]);

  const summary = useMemo(() => {
    if (!filteredEmployees.length) {
      return { employeeCount: 0, avgGross: 0, avgNet: 0, totalGross: 0, totalNet: 0, totalDeductions: 0, totalBase: 0 };
    }
    const totals = filteredEmployees.reduce((acc, emp) => {
      const baseSalary = safeNum(emp.baseSalary);
      let gross = baseSalary + safeNum(emp.housingAllowance) + safeNum(emp.transportAllowance) + safeNum(emp.otherAllowances) + safeNum(emp.bonus) + safeNum(emp.overtime);
      dynamicColumns.filter(dc => dc.category === 'earning').forEach(dc => { gross += safeNum(emp[`dynamic_${dc.id}`]); });
      let deductions = safeNum(emp.socialInsurance) + safeNum(emp.tax) + safeNum(emp.otherDeductions) + safeNum(emp.hoursShortfall);
      dynamicColumns.filter(dc => dc.category === 'deduction').forEach(dc => { deductions += safeNum(emp[`dynamic_${dc.id}`]); });
      acc.totalGross += gross;
      acc.totalNet += gross - deductions;
      acc.totalDeductions += deductions;
      acc.totalBase += baseSalary;
      return acc;
    }, { totalGross: 0, totalNet: 0, totalDeductions: 0, totalBase: 0 });
    return {
      ...totals,
      employeeCount: filteredEmployees.length,
      avgGross: Math.round(totals.totalGross / filteredEmployees.length),
      avgNet: Math.round(totals.totalNet / filteredEmployees.length),
    };
  }, [filteredEmployees, dynamicColumns]);

  const columnTotals = useMemo(() => {
    return allVisibleColumns.reduce((acc, col) => {
      acc[col.key] = filteredEmployees.reduce((sum, emp) => sum + safeNum(emp[col.key]), 0);
      return acc;
    }, {});
  }, [filteredEmployees, allVisibleColumns]);

  const buildFormData = (employee) => {
    const fields = {
      baseSalary: 0, housingAllowance: 0, transportAllowance: 0, otherAllowances: 0,
      bonus: 0, overtime: 0, socialInsurance: 0, tax: 0, otherDeductions: 0, hoursShortfall: 0
    };
    const data = { ...employee };
    Object.entries(fields).forEach(([k]) => { data[k] = safeNum(employee[k]); });
    dynamicColumns.forEach(dc => { data[`dynamic_${dc.id}`] = safeNum(employee[`dynamic_${dc.id}`]); });
    return data;
  };

  const handleEdit = (employee) => {
    setFormData(buildFormData(employee));
    setSelectedEmployee(employee);
    setEditMode('edit');
    setIsEditing(true);
    setBulkEditMode(false);
  };

  const handleAdd = () => {
    const empty = { id: '', _id: '', name: '', email: '', username: '', password: '', department: '', jobTitle: '', grade: 1, hireDate: new Date().toISOString().split('T')[0], status: 'active', baseSalary: 5000, housingAllowance: 800, transportAllowance: 500, otherAllowances: 200, bonus: 0, overtime: 0, socialInsurance: 0, tax: 0, otherDeductions: 0, hoursShortfall: 0 };
    dynamicColumns.forEach(dc => { empty[`dynamic_${dc.id}`] = safeNum(dc.defaultValue); });
    setFormData(empty);
    setSelectedEmployee(null);
    setEditMode('add');
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const numbers = {};
      ['baseSalary', 'housingAllowance', 'transportAllowance', 'otherAllowances', 'bonus', 'overtime', 'socialInsurance', 'tax', 'otherDeductions', 'hoursShortfall'].forEach(k => { numbers[k] = safeNum(formData[k]); });
      let totalEarnings = numbers.baseSalary + numbers.housingAllowance + numbers.transportAllowance + numbers.otherAllowances + numbers.bonus + numbers.overtime;
      let totalDeductions = numbers.socialInsurance + numbers.tax + numbers.otherDeductions + numbers.hoursShortfall;
      dynamicColumns.forEach(dc => {
        const val = safeNum(formData[`dynamic_${dc.id}`]);
        if (dc.category === 'earning') totalEarnings += val;
        else totalDeductions += val;
        numbers[`dynamic_${dc.id}`] = val;
      });
      const updatedEmployee = { ...formData, ...numbers, totalEarnings, totalDeductions, grossSalary: totalEarnings, netSalary: totalEarnings - totalDeductions };

      if (editMode === 'add') {
        try {
          const created = await createUser({
            username: formData.username, email: formData.email, password: formData.password,
            name: formData.name, department: formData.department, role: 'employee', baseSalary: numbers.baseSalary,
          });
          if (created?.data?.user) updatedEmployee._id = created.data.user.id || created.data.user._id;
        } catch (e) {
          alert('فشل إنشاء المستخدم في الخادم: ' + (e.response?.data?.message || e.message));
          return;
        }
        setEmployees(prev => [...prev, updatedEmployee]);
      } else if (bulkEditMode) {
        const fieldKeys = Object.keys(updatedEmployee).filter(k => !['_id', 'id', 'name', 'department', 'jobTitle', 'grade', 'hireDate', 'status', 'role'].includes(k));
        setEmployees(prev => prev.map(emp => {
          const merged = { ...emp };
          fieldKeys.forEach(k => { merged[k] = updatedEmployee[k]; });
          merged.totalEarnings = totalEarnings;
          merged.totalDeductions = totalDeductions;
          merged.grossSalary = totalEarnings;
          merged.netSalary = totalEarnings - totalDeductions;
          if (emp._id?.length === 24) {
            updateUser(emp._id, { baseSalary: numbers.baseSalary, housingAllowance: numbers.housingAllowance, transportAllowance: numbers.transportAllowance, otherAllowances: numbers.otherAllowances, bonus: numbers.bonus, overtime: numbers.overtime, socialInsurance: numbers.socialInsurance, tax: numbers.tax, otherDeductions: numbers.otherDeductions, hoursShortfall: numbers.hoursShortfall }).catch(() => {});
          }
          return merged;
        }));
      } else {
        const targetId = formData._id || formData.id;
        if (!targetId) { alert('خطأ: لم يتم العثور على معرف الموظف'); return; }
        try {
          await updateUser(targetId, {
            baseSalary: numbers.baseSalary, housingAllowance: numbers.housingAllowance, transportAllowance: numbers.transportAllowance,
            otherAllowances: numbers.otherAllowances, bonus: numbers.bonus, overtime: numbers.overtime,
            socialInsurance: numbers.socialInsurance, tax: numbers.tax, otherDeductions: numbers.otherDeductions, hoursShortfall: numbers.hoursShortfall,
          });
        } catch {}
        setEmployees(prev => prev.map(emp => {
          if (emp._id === targetId || emp.id === targetId) return updatedEmployee;
          return emp;
        }));
      }
      setIsEditing(false);
      setBulkEditMode(false);
    } catch (error) {
      alert('حدث خطأ في حفظ البيانات');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    try { if (id?.length === 24) await deleteUser(id); } catch {}
    setEmployees(prev => prev.filter(emp => emp._id !== id && emp.id !== id));
  };

  const handleRecalculateAll = () => {
    setEmployees(prev => prev.map(emp => {
      const baseSalary = safeNum(emp.baseSalary);
      let totalEarnings = baseSalary + safeNum(emp.housingAllowance) + safeNum(emp.transportAllowance) + safeNum(emp.otherAllowances) + safeNum(emp.bonus) + safeNum(emp.overtime);
      dynamicColumns.filter(dc => dc.category === 'earning').forEach(dc => { totalEarnings += safeNum(emp[`dynamic_${dc.id}`]); });
      const socialInsurance = Math.round(baseSalary * DEDUCTION_RATES.socialInsurance);
      const tax = Math.round(baseSalary * DEDUCTION_RATES.tax);
      const otherDeductions = Math.round(baseSalary * DEDUCTION_RATES.other);
      const hoursShortfall = safeNum(emp.hoursShortfall);
      let totalDeductions = socialInsurance + tax + otherDeductions + hoursShortfall;
      dynamicColumns.filter(dc => dc.category === 'deduction').forEach(dc => { totalDeductions += safeNum(emp[`dynamic_${dc.id}`]); });
      return { ...emp, socialInsurance, tax, otherDeductions, hoursShortfall, totalEarnings, totalDeductions, grossSalary: totalEarnings, netSalary: totalEarnings - totalDeductions };
    }));
  };

  const toggleColumnVisibility = (key) => {
    const col = ALL_COLUMNS.find(c => c.key === key);
    if (col && !col.deletable) return;
    setActiveColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleAddDynamicColumn = () => {
    if (!newColumnForm.label.trim()) return;
    const id = Date.now();
    const key = `dynamic_${id}`;
    const defaultValue = safeNum(newColumnForm.defaultValue);
    const category = newColumnForm.category === 'allowance' ? 'earning' : 'deduction';
    setDynamicColumns(prev => [...prev, { id, label: newColumnForm.label.trim(), defaultValue, category }]);
    setActiveColumns(prev => [...prev, key]);
    setEmployees(prev => prev.map(emp => ({ ...emp, [key]: defaultValue })));
    setNewColumnForm({ label: '', defaultValue: '', category: 'allowance' });
  };

  const handleDeleteDynamicColumn = (col) => {
    const key = `dynamic_${col.id}`;
    setDynamicColumns(prev => prev.filter(c => c.id !== col.id));
    setActiveColumns(prev => prev.filter(k => k !== key));
    setEmployees(prev => prev.map(emp => { const { [key]: _, ...rest } = emp; return rest; }));
  };

  const formatCurrencyStr = useCallback((amount) => {
    const num = safeNum(amount);
    const displayAmount = currency === 'SYP' ? num * exchangeRate : num;
    const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayAmount);
    return `${formatted}${currency === 'USD' ? ' $' : ' ل.س'}`;
  }, [currency, exchangeRate]);

  const formatCurrency = useCallback((amount, size = 'normal') => {
    const fullText = formatCurrencyStr(amount);
    const sizes = { small: '0.75rem', normal: '0.875rem', large: '1.125rem', xl: '1.5rem', xxl: '1.875rem' };
    const baseSize = sizes[size] || sizes.normal;
    return <DynamicNumber value={fullText} baseSize={baseSize} minSize="0.5rem" maxLen={currency === 'SYP' ? 18 : 14} />;
  }, [currency, exchangeRate, formatCurrencyStr]);

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
      <div className="system-header">
        <div className="header-content">
          <div className="header-title-row">
            <button onClick={() => navigate('/payroll')} className="back-btn" title="العودة إلى لوحة الرواتب">
              <FaArrowLeft /> العودة
            </button>
            <div className="header-title">
              <h1><FaUser className="icon" />نظام الموارد البشرية والرواتب المتكامل</h1>
              <p>إدارة شاملة للموظفين وكشوف الرواتب مع حسابات تلقائية</p>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={() => setShowColumnManager(true)} className="btn-secondary" title="إدارة الأعمدة">
              <FaColumns /> إدارة الأعمدة
            </button>
            <button onClick={() => setCurrency(c => c === 'SYP' ? 'USD' : 'SYP')} className="btn-secondary"
              title={`التبديل إلى ${currency === 'SYP' ? 'دولار أمريكي' : 'ليرة سورية'}`}>
              <FaExchangeAlt /> {currency === 'SYP' ? 'USD' : 'SYP'}
            </button>
            <button onClick={() => setShowExchangeRate(v => !v)} className="btn-secondary" title="إعدادات سعر الصرف">
              <FaCog />
            </button>
            <button onClick={() => fetchDataRef.current?.(true)} className="btn-secondary" disabled={loading}>
              <FaSync className={loading ? 'spinning' : ''} />{loading ? 'جاري التحديث...' : 'تحديث'}
            </button>
            <button onClick={handleAdd} className="btn-primary"><FaPlus /> إضافة موظف</button>
            <button onClick={handleRecalculateAll} className="btn-secondary"><FaCalculator /> إعادة حساب الكل</button>
            <button onClick={() => exportToExcel(filteredEmployees, allVisibleColumns, DEPARTMENTS)} className="btn-success"><FaDownload /> تصدير Excel</button>
            <button onClick={() => window.print()} className="btn-info"><FaPrint /> طباعة</button>
          </div>
        </div>
      </div>

      {showExchangeRate && (
        <div className="exchange-rate-panel">
          <h3><FaCog /> إعدادات سعر الصرف</h3>
          <div className="exchange-rate-input-group">
            <label>1 USD = </label>
            <input type="number" value={exchangeRate}
              onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) setExchangeRate(v); }}
              min="1" step="1" className="rate-input" />
            <span> ل.س</span>
          </div>
          <p className="rate-hint">الرواتب بالدولار تُعرض بالليرة السورية بناءً على هذا السعر</p>
        </div>
      )}

      <div className="currency-indicator">
        <span className={`currency-badge ${currency.toLowerCase()}`}>{currency}</span>
        {currency === 'SYP' && (
          <span className="rate-label">كل واحد دولار يساوي {exchangeRate.toLocaleString('en-US')} ليرة سورية</span>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon employees"><FaUsers /></div>
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
          <div className="stat-icon deductions"><FaBalanceScale /></div>
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

      <div className="filters-section">
        <div className="filter-group">
          <label><FaFilter /> القسم:</label>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="all">جميع الأقسام</option>
            {Object.entries(DEPARTMENTS).map(([key, dept]) => (
              <option key={key} value={key}>{dept.name} ({key})</option>
            ))}
          </select>
        </div>
        <div className="filter-group search">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="بحث بالاسم، الرقم الوظيفي، أو الوظيفة..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}><FaTimes /></button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table className="payroll-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الموظف</th>
              <th>القسم</th>
              <th>الوظيفة</th>
              {allVisibleColumns.map(col => <th key={col.key}>{col.label}</th>)}
              <th>الإجمالي</th>
              <th>الخصومات</th>
              <th>الصافي</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp, index) => (
              <tr key={emp._id || emp.id || index} className={selectedEmployee?._id === emp._id ? 'selected' : ''}>
                <td>{index + 1}</td>
                <td>
                  <div className="employee-info">
                    <strong>{emp.name}</strong>
                    <small>{emp._id || emp.id || '---'}</small>
                  </div>
                </td>
                <td><span className="dept-badge">{getDeptName(emp.department)}</span></td>
                <td>{ROLE_LABELS[emp.role] || emp.jobTitle || emp.role || 'موظف'}</td>
                {allVisibleColumns.map(col => (
                  <td key={col.key} className="currency">{formatCurrency(emp[col.key])}</td>
                ))}
                <td className="gross">{formatCurrency(emp.grossSalary || 0)}</td>
                <td className="deductions">{formatCurrency(emp.totalDeductions || 0)}</td>
                <td className="net">{formatCurrency(emp.netSalary || 0)}</td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => handleEdit(emp)} className="edit-btn" title="تعديل"><FaEdit /></button>
                    <button onClick={() => handleDelete(emp._id || emp.id)} className="delete-btn" title="حذف"><FaTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {filteredEmployees.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td colSpan={4}><strong>الإجمالي العام</strong></td>
                {allVisibleColumns.map(col => (
                  <td key={col.key} className="currency"><strong>{formatCurrency(columnTotals[col.key])}</strong></td>
                ))}
                <td className="gross"><strong>{formatCurrency(summary.totalGross)}</strong></td>
                <td className="deductions"><strong>{formatCurrency(summary.totalDeductions)}</strong></td>
                <td className="net"><strong>{formatCurrency(summary.totalNet)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <EditModal
        isEditing={isEditing} editMode={editMode} bulkEditMode={bulkEditMode}
        setBulkEditMode={setBulkEditMode} formData={formData} setFormData={setFormData}
        dynamicColumns={dynamicColumns} handleSave={handleSave}
        onClose={() => setIsEditing(false)} formatCurrency={formatCurrency}
        formatCurrencyStr={formatCurrencyStr}
      />
      <ColumnManager
        showColumnManager={showColumnManager} activeColumns={activeColumns}
        dynamicColumns={dynamicColumns} newColumnForm={newColumnForm}
        setNewColumnForm={setNewColumnForm} toggleColumnVisibility={toggleColumnVisibility}
        handleAddDynamicColumn={handleAddDynamicColumn} setColumnToDelete={setColumnToDelete}
        onClose={() => setShowColumnManager(false)}
      />
      <DeleteConfirm
        columnToDelete={columnToDelete} handleDeleteDynamicColumn={handleDeleteDynamicColumn}
        onClose={() => setColumnToDelete(null)}
      />

      <div className="legend">
        <div className="legend-item"><span className="legend-color gross"></span> الإجمالي</div>
        <div className="legend-item"><span className="legend-color deductions"></span> الخصومات</div>
        <div className="legend-item"><span className="legend-color net"></span> الصافي</div>
      </div>
    </div>
  );
};

export default ComprehensiveHRPayrollSystem;
