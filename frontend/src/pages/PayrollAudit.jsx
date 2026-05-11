import React, { useState } from 'react';
import { FaShieldAlt, FaCheckCircle, FaTimesCircle, FaChartBar, FaDatabase, FaNetworkWired } from 'react-icons/fa';
import DynamicNumber from '../components/DynamicNumber';
import './PayrollAudit.css';

const PayrollAudit = () => {
  const [auditData, setAuditData] = useState({
    totalTransactions: 228,
    verifiedTransactions: 226,
    pendingReview: 2,
    discrepancies: 0,
    accuracyRate: 99.1,
    lastAuditDate: '2026-03-15'
  });

  const [segregationOfDuties, setSegregationOfDuties] = useState([
    {
      id: 1,
      process: 'تسجيل الحضور',
      responsibility: 'الموظف/المشرف',
      approval: 'معالج الرواتب',
      review: 'مدقق داخلي',
      status: 'compliant',
      risk: 'low'
    },
    {
      id: 2,
      process: 'حساب الرواتب',
      responsibility: 'أخصائي الرواتب',
      approval: 'مدير الرواتب',
      review: 'مدقق داخلي',
      status: 'compliant',
      risk: 'low'
    },
    {
      id: 3,
      process: 'المطابقة البنكية',
      responsibility: 'معالج الرواتب',
      approval: 'مدير الرواتب',
      review: 'مدقق داخلي',
      status: 'compliant',
      risk: 'medium'
    },
    {
      id: 4,
      process: 'تقديم الضرائب',
      responsibility: 'أخصائي الرواتب',
      approval: 'مدير الرواتب',
      review: 'مدقق خارجي',
      status: 'review',
      risk: 'high'
    },
    {
      id: 5,
      process: 'بيانات الموظفين الأساسية',
      responsibility: 'قسم الموارد البشرية',
      approval: 'مدير الرواتب',
      review: 'مدقق داخلي',
      status: 'compliant',
      risk: 'high'
    }
  ]);

  const [reconciliationData, setReconciliationData] = useState([
    {
      id: 1,
      account: 'نفقات الرواتب',
      systemAmount: 755000,
      bankAmount: 755000,
      difference: 0,
      status: 'matched',
      date: '2026-03-31'
    },
    {
      id: 2,
      account: 'الضرائب المستحقة',
      systemAmount: 113250,
      bankAmount: 113250,
      difference: 0,
      status: 'matched',
      date: '2026-03-31'
    },
    {
      id: 3,
      account: 'التأمين الاجتماعي المستحق',
      systemAmount: 67950,
      bankAmount: 67950,
      difference: 0,
      status: 'matched',
      date: '2026-03-31'
    },
    {
      id: 4,
      account: 'مزايا الموظفين',
      systemAmount: 22650,
      bankAmount: 22650,
      difference: 0,
      status: 'matched',
      date: '2026-03-31'
    }
  ]);

  const [auditTrail, setAuditTrail] = useState([
    {
      id: 1,
      action: 'تمت معالجة الرواتب لشهر مارس 2026',
      user: 'system@payroll.com',
      timestamp: '2026-03-28T18:30:00Z',
      status: 'success',
      details: 'الإجمالي: 755,000$، الصافي: 551,150$، الموظفون: 230'
    },
    {
      id: 2,
      action: 'اكتملت المطابقة البنكية',
      user: 'auditor@company.com',
      timestamp: '2026-03-28T16:45:00Z',
      status: 'success',
      details: 'طابقت جميع الحسابات، لا توجد اختلافات'
    },
    {
      id: 3,
      action: 'تم تحديث حساب الضرائب',
      user: 'payroll.manager@company.com',
      timestamp: '2026-03-27T14:20:00Z',
      status: 'warning',
      details: 'تم تطبيق شريحة ضريبية جديدة لعام 2026'
    },
    {
      id: 4,
      action: 'تمت الموافقة على تغيير بيانات الموظف',
      user: 'hr.director@company.com',
      timestamp: '2026-03-26T11:30:00Z',
      status: 'success',
      details: 'تمت الموافقة على تعديل راتب جون سميث'
    },
    {
      id: 5,
      action: 'مراجعة سجل الوصول',
      user: 'security.admin@company.com',
      timestamp: '2026-03-25T09:15:00Z',
      status: 'success',
      details: 'لم يتم اكتشاف أي وصول غير مصرح به'
    }
  ]);

  const [controls, setControls] = useState({
    accessControls: { status: 'active', lastReview: '2026-03-01' },
    dataEncryption: { status: 'active', algorithm: 'AES-256' },
    backupSystem: { status: 'active', lastBackup: '2026-03-28T02:00:00Z' },
    auditLogging: { status: 'active', retention: '7 سنوات' }
  });

  const formatCurrency = (amount, size = 'normal') => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
      case 'matched':
      case 'compliant':
        return <FaCheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
      case 'review':
        return <FaShieldAlt className="h-5 w-5 text-yellow-600" />;
      case 'failed':
      case 'discrepancy':
        return <FaTimesCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FaCheckCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
      case 'matched':
      case 'compliant':
        return 'bg-green-100 text-green-800';
      case 'warning':
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'discrepancy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="payroll-audit-page">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaShieldAlt className="h-8 w-8 mr-3 text-blue-600" />
              المراجعة الداخلية والضوابط
            </h1>
            <p className="text-gray-600 mt-1">فصل المهام، المطابقة، ومراقبة الامتثال</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <FaCheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-green-500 text-sm font-medium">+0.2%</span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">دقة الرواتب</h3>
          <p className="text-2xl font-bold text-gray-900">{auditData.accuracyRate}%</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FaDatabase className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-green-500 text-sm font-medium">100%</span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">المطابقة</h3>
          <p className="text-2xl font-bold text-gray-900">
            {auditData.verifiedTransactions}/{auditData.totalTransactions}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FaChartBar className="h-6 w-6 text-yellow-600" />
            </div>
            <span className="text-red-500 text-sm font-medium">0 مشاكل</span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">الاختلافات</h3>
          <p className="text-2xl font-bold text-gray-900">{auditData.discrepancies}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <FaNetworkWired className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-green-500 text-sm font-medium">نشط</span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium mb-1">حالة الضوابط</h3>
          <p className="text-2xl font-bold text-gray-900">100%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <FaShieldAlt className="h-5 w-5 mr-2 text-blue-600" />
          مصفوفة فصل المهام
        </h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">العملية</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">المسؤولية</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الموافقة</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">المراجعة</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">مستوى المخاطرة</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {segregationOfDuties.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.process}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.responsibility}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.approval}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.review}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskColor(item.risk)}`}>
                      {item.risk === 'low' ? 'منخفض' : item.risk === 'medium' ? 'متوسط' : 'عالي'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusIcon(item.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <FaDatabase className="h-5 w-5 mr-2 text-green-600" />
            المطابقة البنكية
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الحساب</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">النظام</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">البنك</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الاختلاف</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reconciliationData.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.account}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.systemAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.bankAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {item.difference === 0 ? (
                        <span className="text-green-600">{formatCurrency(item.difference)}</span>
                      ) : (
                        <span className="text-red-600">{formatCurrency(item.difference)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status === 'matched' ? 'مطابق' : 'غير مطابق'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <FaShieldAlt className="h-5 w-5 mr-2 text-red-600" />
            حالة الضوابط الداخلية
          </h2>
          
          <div className="space-y-4">
            {Object.entries(controls).map(([key, control], index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  {control.lastReview && (
                    <p className="text-xs text-gray-500">آخر مراجعة: {new Date(control.lastReview).toLocaleDateString()}</p>
                  )}
                  {control.algorithm && (
                    <p className="text-xs text-gray-500">الخوارزمية: {control.algorithm}</p>
                  )}
                  {control.retention && (
                    <p className="text-xs text-gray-500">الاحتفاظ: {control.retention}</p>
                  )}
                </div>
                <div className="flex items-center">
                  <span className={`w-3 h-3 rounded-full mr-2 ${
                    control.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span className={`text-sm font-medium ${
                    control.status === 'active' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {control.status === 'active' ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <FaChartBar className="h-5 w-5 mr-2 text-purple-600" />
          سجل التدقيق
        </h2>
        
        <div className="space-y-4">
          {auditTrail.map((entry) => (
            <div key={entry.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0">
                {getStatusIcon(entry.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleString('ar-EG')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{entry.details}</p>
                <p className="text-xs text-gray-500 mt-1">المستخدم: {entry.user}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PayrollAudit;