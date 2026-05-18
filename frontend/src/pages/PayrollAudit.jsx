import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaChartBar, FaDatabase, FaNetworkWired, FaClock, FaSearch, FaArrowLeft } from 'react-icons/fa';

const STATUS_CONFIG = {
  success: { icon: FaCheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'نجاح' },
  warning: { icon: FaExclamationTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'تحذير' },
  failed: { icon: FaTimesCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'فشل' },
  matched: { icon: FaCheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'مطابق' },
  compliant: { icon: FaCheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'ممتثل' },
  review: { icon: FaExclamationTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'مراجعة' },
};

const PayrollAudit = () => {
  const navigate = useNavigate();
  const [auditData] = useState({
    totalTransactions: 228, verifiedTransactions: 226, pendingReview: 2,
    discrepancies: 0, accuracyRate: 99.1, lastAuditDate: '2026-03-15'
  });

  const [segregationOfDuties] = useState([
    { id: 1, process: 'تسجيل الحضور', responsibility: 'الموظف/المشرف', approval: 'معالج الرواتب', review: 'مدقق داخلي', status: 'compliant', risk: 'low' },
    { id: 2, process: 'حساب الرواتب', responsibility: 'أخصائي الرواتب', approval: 'مدير الرواتب', review: 'مدقق داخلي', status: 'compliant', risk: 'low' },
    { id: 3, process: 'المطابقة البنكية', responsibility: 'معالج الرواتب', approval: 'مدير الرواتب', review: 'مدقق داخلي', status: 'compliant', risk: 'medium' },
    { id: 4, process: 'تقديم الضرائب', responsibility: 'أخصائي الرواتب', approval: 'مدير الرواتب', review: 'مدقق خارجي', status: 'review', risk: 'high' },
    { id: 5, process: 'بيانات الموظفين الأساسية', responsibility: 'قسم الموارد البشرية', approval: 'مدير الرواتب', review: 'مدقق داخلي', status: 'compliant', risk: 'high' },
  ]);

  const [reconciliationData] = useState([
    { id: 1, account: 'نفقات الرواتب', systemAmount: 755000, bankAmount: 755000, difference: 0, status: 'matched', date: '2026-03-31' },
    { id: 2, account: 'الضرائب المستحقة', systemAmount: 113250, bankAmount: 113250, difference: 0, status: 'matched', date: '2026-03-31' },
    { id: 3, account: 'التأمين الاجتماعي المستحق', systemAmount: 67950, bankAmount: 67950, difference: 0, status: 'matched', date: '2026-03-31' },
    { id: 4, account: 'مزايا الموظفين', systemAmount: 22650, bankAmount: 22650, difference: 0, status: 'matched', date: '2026-03-31' },
  ]);

  const [auditTrail] = useState([
    { id: 1, action: 'تمت معالجة الرواتب لشهر مارس 2026', user: 'system@payroll.com', timestamp: '2026-03-28T18:30:00Z', status: 'success', details: 'الإجمالي: 755,000$، الصافي: 551,150$، الموظفون: 230' },
    { id: 2, action: 'اكتملت المطابقة البنكية', user: 'auditor@company.com', timestamp: '2026-03-28T16:45:00Z', status: 'success', details: 'طابقت جميع الحسابات، لا توجد اختلافات' },
    { id: 3, action: 'تم تحديث حساب الضرائب', user: 'payroll.manager@company.com', timestamp: '2026-03-27T14:20:00Z', status: 'warning', details: 'تم تطبيق شريحة ضريبية جديدة لعام 2026' },
    { id: 4, action: 'تمت الموافقة على تغيير بيانات الموظف', user: 'hr.director@company.com', timestamp: '2026-03-26T11:30:00Z', status: 'success', details: 'تمت الموافقة على تعديل الراتب' },
    { id: 5, action: 'مراجعة سجل الوصول', user: 'security.admin@company.com', timestamp: '2026-03-25T09:15:00Z', status: 'success', details: 'لم يتم اكتشاف أي وصول غير مصرح به' },
  ]);

  const [controls] = useState({
    accessControls: { status: 'active', lastReview: '2026-03-01' },
    dataEncryption: { status: 'active', algorithm: 'AES-256' },
    backupSystem: { status: 'active', lastBackup: '2026-03-28T02:00:00Z' },
    auditLogging: { status: 'active', retention: '7 سنوات' }
  });

  const riskColor = (risk) => risk === 'low' ? 'bg-green-100 text-green-800' : risk === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
  const riskLabel = (risk) => risk === 'low' ? 'منخفض' : risk === 'medium' ? 'متوسط' : 'عالي';

  return (
    <div className="payroll-audit-page">
      <div className="page-header mb-8">
        <div className="flex items-center justify-between">
          <div className="header-title-row">
            <button onClick={() => navigate('/payroll')} className="back-btn" title="العودة إلى لوحة الرواتب">
              <FaArrowLeft /> العودة
            </button>
            <div>
              <h1 className="text-3xl font-bold text-dark flex items-center">
                <FaShieldAlt className="h-8 w-8 ml-3 text-blue-600" />
                المراجعة الداخلية والضوابط
              </h1>
              <p className="text-gray-600 mt-1">فصل المهام، المطابقة، ومراقبة الامتثال</p>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#16A34A' }}><FaCheckCircle /></div>
          <div className="stat-info"><h3>دقة الرواتب</h3><p className="stat-value">{auditData.accuracyRate}%</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon employees"><FaDatabase /></div>
          <div className="stat-info"><h3>المطابقة</h3><p className="stat-value">{auditData.verifiedTransactions}/{auditData.totalTransactions}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EAB308' }}><FaChartBar /></div>
          <div className="stat-info"><h3>الاختلافات</h3><p className="stat-value">{auditData.discrepancies}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#8B5CF6' }}><FaNetworkWired /></div>
          <div className="stat-info"><h3>حالة الضوابط</h3><p className="stat-value">100%</p></div>
        </div>
      </div>

      <div className="section-card mb-8">
        <h2><FaShieldAlt className="text-secondary" /> مصفوفة فصل المهام</h2>
        <div className="overflow-x-auto">
          <table className="payroll-table">
            <thead><tr>
              <th>العملية</th><th>المسؤولية</th><th>الموافقة</th><th>المراجعة</th><th>مستوى المخاطرة</th><th>الحالة</th>
            </tr></thead>
            <tbody>
              {segregationOfDuties.map(item => {
                const StatusIcon = STATUS_CONFIG[item.status]?.icon || FaCheckCircle;
                return (
                  <tr key={item.id}>
                    <td className="font-medium text-dark">{item.process}</td>
                    <td className="text-gray-600">{item.responsibility}</td>
                    <td className="text-gray-600">{item.approval}</td>
                    <td className="text-gray-600">{item.review}</td>
                    <td><span className={`px-2 py-1 rounded-full text-xs font-medium ${riskColor(item.risk)}`}>{riskLabel(item.risk)}</span></td>
                    <td><StatusIcon className={`h-5 w-5 ${STATUS_CONFIG[item.status]?.color || 'text-gray-600'}`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="section-card">
          <h2><FaDatabase className="text-success" /> المطابقة البنكية</h2>
          <div className="overflow-x-auto">
            <table className="payroll-table">
              <thead><tr>
                <th>الحساب</th><th>النظام</th><th>البنك</th><th>الاختلاف</th><th>الحالة</th>
              </tr></thead>
              <tbody>
                {reconciliationData.map(item => (
                  <tr key={item.id}>
                    <td className="font-medium text-dark">{item.account}</td>
                    <td className="currency">{item.systemAmount.toLocaleString()} $</td>
                    <td className="currency">{item.bankAmount.toLocaleString()} $</td>
                    <td className={`currency ${item.difference === 0 ? 'text-success' : 'text-error'}`}>{item.difference.toLocaleString()} $</td>
                    <td><span className="status-badge paid">{item.status === 'matched' ? 'مطابق' : 'غير مطابق'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-card">
          <h2><FaShieldAlt className="text-error" /> حالة الضوابط الداخلية</h2>
          <div className="space-y-4">
            {Object.entries(controls).map(([key, control], i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="font-medium text-dark capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                  {control.lastReview && <p className="text-xs text-gray-500">آخر مراجعة: {new Date(control.lastReview).toLocaleDateString('ar-EG')}</p>}
                  {control.algorithm && <p className="text-xs text-gray-500">الخوارزمية: {control.algorithm}</p>}
                  {control.retention && <p className="text-xs text-gray-500">الاحتفاظ: {control.retention}</p>}
                </div>
                <div className="control-status">
                  <span className={`control-dot ${control.status === 'active' ? 'active' : 'inactive'}`}></span>
                  <span className={`text-sm font-medium ${control.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                    {control.status === 'active' ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-card">
        <h2><FaChartBar className="text-purple-600" /> سجل التدقيق</h2>
        <div className="space-y-4">
          {auditTrail.map(entry => {
            const config = STATUS_CONFIG[entry.status];
            const Icon = config?.icon || FaCheckCircle;
            return (
              <div key={entry.id} className={`flex items-start gap-4 p-4 rounded-xl border ${config?.bg || 'bg-gray-50 border-gray-200'} transition-colors`}>
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className={`h-5 w-5 ${config?.color || 'text-gray-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <FaClock className="text-xs" />
                      {new Date(entry.timestamp).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{entry.details}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <FaSearch className="text-xs" /> المستخدم: {entry.user}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PayrollAudit;
