import React, { useState } from 'react';
import { FaNetworkWired, FaDatabase, FaCloud, FaLock, FaChartBar, FaCheckCircle, FaTimesCircle, FaSyncAlt, FaShieldAlt } from 'react-icons/fa';
import './PayrollIntegration.css';

const PayrollIntegration = () => {
  const [integrations, setIntegrations] = useState([
    {
      id: 1,
      name: 'نظام الموارد البشرية (BambooHR)',
      type: 'بيانات الموظفين',
      status: 'online',
      lastSync: '2026-03-28T14:30:00Z',
      syncFrequency: 'في الوقت الفعلي',
      dataFlow: 'اتجاهين',
      records: 230,
      description: 'بيانات الموظفين الأساسية، تتبع الحضور، إدارة الإجازات'
    },
    {
      id: 2,
      name: 'نظام ERP (SAP)',
      type: 'مالي',
      status: 'online',
      lastSync: '2026-03-28T18:00:00Z',
      syncFrequency: 'يومياً',
      dataFlow: 'الرواتب → ERP',
      records: 156,
      description: 'القيود المحاسبية، تخصيص مراكز التكلفة'
    },
    {
      id: 3,
      name: 'النظام البنكي',
      type: 'مدفوعات',
      status: 'warning',
      lastSync: '2026-03-28T17:45:00Z',
      syncFrequency: 'في الوقت الفعلي',
      dataFlow: 'الرواتب → البنك',
      records: 230,
      description: 'تحويلات الرواتب، تأكيدات الدفع'
    },
    {
      id: 4,
      name: 'بوابة السلطات الضريبية',
      type: 'امتثال',
      status: 'online',
      lastSync: '2026-03-28T12:00:00Z',
      syncFrequency: 'شهرياً',
      dataFlow: 'الرواتب → الضرائب',
      records: 1,
      description: 'تقديم الضرائب، تقارير التأمين الاجتماعي'
    },
    {
      id: 5,
      name: 'نظام الحضور والانصراف',
      type: 'تشغيلي',
      status: 'offline',
      lastSync: '2026-03-27T23:59:00Z',
      syncFrequency: 'في الوقت الفعلي',
      dataFlow: 'الحضور والانصراف → الرواتب',
      records: 5000,
      description: 'بيانات البصمة البيومترية، سجلات الحضور'
    },
    {
      id: 6,
      name: 'إدارة المزايا',
      type: 'موارد بشرية',
      status: 'online',
      lastSync: '2026-03-28T09:00:00Z',
      syncFrequency: 'أسبوعياً',
      dataFlow: 'اتجاهين',
      records: 89,
      description: 'التأمين، التقاعد، تسجيل المزايا'
    }
  ]);

  const [securityMetrics, setSecurityMetrics] = useState({
    encryptionStatus: 'نشط',
    sslCertificate: 'صالح حتى 2027-06-15',
    lastSecurityAudit: '2026-01-15',
    failedLoginAttempts: 3,
    dataBreachIncidents: 0,
    complianceScore: 98.5
  });

  const [apiLogs, setApiLogs] = useState([
    {
      id: 1,
      timestamp: '2026-03-28T18:30:00Z',
      endpoint: '/api/payroll/process',
      method: 'POST',
      status: 200,
      responseTime: '245ms',
      records: 230
    },
    {
      id: 2,
      timestamp: '2026-03-28T18:00:00Z',
      endpoint: '/api/erp/journal',
      method: 'POST',
      status: 200,
      responseTime: '180ms',
      records: 1
    },
    {
      id: 3,
      timestamp: '2026-03-28T17:45:00Z',
      endpoint: '/api/bank/transfer',
      method: 'PUT',
      status: 200,
      responseTime: '520ms',
      records: 228
    },
    {
      id: 4,
      timestamp: '2026-03-28T14:30:00Z',
      endpoint: '/api/hris/sync',
      method: 'GET',
      status: 200,
      responseTime: '89ms',
      records: 5
    },
    {
      id: 5,
      timestamp: '2026-03-28T12:00:00Z',
      endpoint: '/api/tax/filing',
      method: 'POST',
      status: 201,
      responseTime: '1.2s',
      records: 1
    }
  ]);

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <FaCheckCircle className="h-4 w-4" />;
      case 'warning':
        return <FaSyncAlt className="h-4 w-4 animate-spin" />;
      case 'offline':
        return <FaTimesCircle className="h-4 w-4" />;
      default:
        return <FaCheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusCodeColor = (code) => {
    if (code >= 200 && code < 300) return 'bg-green-100 text-green-800';
    if (code >= 400 && code < 500) return 'bg-yellow-100 text-yellow-800';
    if (code >= 500) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="payroll-integration-page">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaNetworkWired className="h-8 w-8 mr-3 text-blue-600" />
              التكامل التقني
            </h1>
            <p className="text-gray-600 mt-1">اتصالات أنظمة HRIS و ERP والبنوك والامتثال</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <FaDatabase className="h-5 w-5 mr-2 text-green-600" />
            التكاملات النشطة
          </h2>
          
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div 
                key={integration.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-lg mr-3">
                      {integration.type.includes('مالي') ? <FaDatabase className="h-5 w-5 text-blue-600" /> :
                       integration.type.includes('مدفوعات') ? <FaCloud className="h-5 w-5 text-blue-600" /> :
                       integration.type.includes('امتثال') ? <FaLock className="h-5 w-5 text-blue-600" /> :
                       <FaNetworkWired className="h-5 w-5 text-blue-600" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                      <p className="text-xs text-gray-500">{integration.type}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(integration.status)}`}>
                    {getStatusIcon(integration.status)}
                    <span className="ml-1">{integration.status === 'online' ? 'نشط' : integration.status === 'warning' ? 'تحذير' : 'غير نشط'}</span>
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{integration.description}</p>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">آخر مزامنة:</span>
                    <span className="ml-1 font-medium">{formatDateTime(integration.lastSync)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">التكرار:</span>
                    <span className="ml-1 font-medium">{integration.syncFrequency}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">اتجاه البيانات:</span>
                    <span className="ml-1 font-medium">{integration.dataFlow}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">السجلات:</span>
                    <span className="ml-1 font-medium">{integration.records.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <FaLock className="h-5 w-5 mr-2 text-red-600" />
            الأمان والامتثال
          </h2>
          
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">مؤشر الامتثال</h3>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-blue-600">{securityMetrics.complianceScore}%</span>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">A+</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${securityMetrics.complianceScore}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <FaLock className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">حالة التشفير</span>
                </div>
                <span className="text-sm font-medium text-green-600">{securityMetrics.encryptionStatus}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <FaCloud className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">شهادة SSL</span>
                </div>
                <span className="text-sm font-medium text-blue-600">صالحة</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                    <FaShieldAlt className="h-4 w-4 text-yellow-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">محاولات تسجيل الدخول الفاشلة (24 ساعة)</span>
                </div>
                <span className="text-sm font-medium text-yellow-600">{securityMetrics.failedLoginAttempts}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <FaShieldAlt className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">حوادث اختراق البيانات</span>
                </div>
                <span className="text-sm font-medium text-green-600">{securityMetrics.dataBreachIncidents}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 mb-2">آخر تدقيق أمني: {new Date(securityMetrics.lastSecurityAudit).toLocaleDateString()}</p>
              <button className="w-full bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                تشغيل فحص أمان
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <FaNetworkWired className="h-5 w-5 mr-2 text-purple-600" />
          سجل نشاط الـ API
        </h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الوقت</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">النقطة النهائية</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الطريقة</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">وقت الاستجابة</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">السجلات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.endpoint}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                      log.method === 'POST' ? 'bg-green-100 text-green-800' :
                      log.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusCodeColor(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.responseTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.records.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <button className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow text-left">
          <div className="flex items-center mb-3">
            <FaSyncAlt className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="font-semibold text-gray-900">مزامنة يدوية</h3>
          </div>
          <p className="text-sm text-gray-600">فرض مزامنة جميع الأنظمة المتصلة</p>
        </button>
        
        <button className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow text-left">
          <div className="flex items-center mb-3">
            <FaLock className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="font-semibold text-gray-900">تحديث الشهادات</h3>
          </div>
          <p className="text-sm text-gray-600">تجديد شهادات SSL والمفاتيح الأمنية</p>
        </button>
        
        <button className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow text-left">
          <div className="flex items-center mb-3">
            <FaDatabase className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="font-semibold text-gray-900">اختبار الاتصال</h3>
          </div>
          <p className="text-sm text-gray-600">تحقق من جميع اتصالات النظام والنقاط النهائية</p>
        </button>
      </div>
    </div>
  );
};

export default PayrollIntegration;