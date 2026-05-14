import { useState } from 'react';
import { FaNetworkWired, FaDatabase, FaCloud, FaLock, FaShieldAlt, FaCheckCircle, FaTimesCircle, FaSyncAlt, FaServer, FaExchangeAlt, FaHistory, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

const defaultIntegrations = [
  { id: 1, name: 'نظام الموارد البشرية (BambooHR)', type: 'بيانات الموظفين', status: 'online', lastSync: '2026-03-28T14:30:00Z', syncFrequency: 'في الوقت الفعلي', dataFlow: 'اتجاهين', records: 230, description: 'بيانات الموظفين الأساسية، تتبع الحضور، إدارة الإجازات' },
  { id: 2, name: 'نظام ERP (SAP)', type: 'مالي', status: 'online', lastSync: '2026-03-28T18:00:00Z', syncFrequency: 'يومياً', dataFlow: 'الرواتب ← ERP', records: 156, description: 'القيود المحاسبية، تخصيص مراكز التكلفة' },
  { id: 3, name: 'النظام البنكي', type: 'مدفوعات', status: 'warning', lastSync: '2026-03-28T17:45:00Z', syncFrequency: 'في الوقت الفعلي', dataFlow: 'الرواتب ← البنك', records: 230, description: 'تحويلات الرواتب، تأكيدات الدفع' },
  { id: 4, name: 'بوابة السلطات الضريبية', type: 'امتثال', status: 'online', lastSync: '2026-03-28T12:00:00Z', syncFrequency: 'شهرياً', dataFlow: 'الرواتب ← الضرائب', records: 1, description: 'تقديم الضرائب، تقارير التأمين الاجتماعي' },
  { id: 5, name: 'نظام الحضور والانصراف', type: 'تشغيلي', status: 'offline', lastSync: '2026-03-27T23:59:00Z', syncFrequency: 'في الوقت الفعلي', dataFlow: 'الحضور ← الرواتب', records: 5000, description: 'بيانات البصمة البيومترية، سجلات الحضور' },
  { id: 6, name: 'إدارة المزايا', type: 'موارد بشرية', status: 'online', lastSync: '2026-03-28T09:00:00Z', syncFrequency: 'أسبوعياً', dataFlow: 'اتجاهين', records: 89, description: 'التأمين، التقاعد، تسجيل المزايا' },
];

const apiLogsData = [
  { id: 1, timestamp: '2026-03-28T18:30:00Z', endpoint: '/api/payroll/process', method: 'POST', status: 200, responseTime: '245ms', records: 230 },
  { id: 2, timestamp: '2026-03-28T18:00:00Z', endpoint: '/api/erp/journal', method: 'POST', status: 200, responseTime: '180ms', records: 1 },
  { id: 3, timestamp: '2026-03-28T17:45:00Z', endpoint: '/api/bank/transfer', method: 'PUT', status: 200, responseTime: '520ms', records: 228 },
  { id: 4, timestamp: '2026-03-28T14:30:00Z', endpoint: '/api/hris/sync', method: 'GET', status: 200, responseTime: '89ms', records: 5 },
  { id: 5, timestamp: '2026-03-28T12:00:00Z', endpoint: '/api/tax/filing', method: 'POST', status: 201, responseTime: '1.2s', records: 1 },
];

const formatDateTime = (dt) =>
  new Date(dt).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const statusMeta = {
  online: { bg: 'bg-green-100', text: 'text-green-800', label: 'نشط', icon: FaCheckCircle },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'تحذير', icon: FaSyncAlt },
  offline: { bg: 'bg-red-100', text: 'text-red-800', label: 'غير نشط', icon: FaTimesCircle },
};

const methodColors = { GET: 'bg-blue-100 text-blue-800', POST: 'bg-green-100 text-green-800', PUT: 'bg-yellow-100 text-yellow-800' };

const PayrollIntegration = () => {
  const [integrations] = useState(defaultIntegrations);
  const [apiLogs] = useState(apiLogsData);

  const getStatusCodeColor = (code) => {
    if (code >= 200 && code < 300) return 'bg-green-100 text-green-800';
    if (code >= 400 && code < 500) return 'bg-yellow-100 text-yellow-800';
    if (code >= 500) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type) => {
    if (type.includes('مالي')) return FaDatabase;
    if (type.includes('مدفوعات')) return FaCloud;
    if (type.includes('امتثال')) return FaLock;
    return FaNetworkWired;
  };

  return (
    <div className="payroll-integration-page">
      <div className="page-header mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark flex items-center">
              <FaNetworkWired className="h-8 w-8 ml-3 text-secondary" />
              التكامل التقني
            </h1>
            <p className="text-gray-600 mt-1">اتصالات أنظمة HRIS و ERP والبنوك والامتثال</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="section-card">
          <div className="section-header">
            <FaDatabase className="h-4 w-4 ml-2 text-green-600" />
            <span>التكاملات النشطة</span>
          </div>

          <div className="space-y-3">
            {integrations.map((item) => {
              const meta = statusMeta[item.status] || statusMeta.offline;
              const Icon = meta.icon;
              const TypeIcon = getTypeIcon(item.type);
              return (
                <div key={item.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <TypeIcon className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                        <p className="text-xs text-gray-500">{item.type}</p>
                      </div>
                    </div>
                    <span className={`status-badge ${meta.bg} ${meta.text}`}>
                      <Icon className={`h-3 w-3 ml-1 ${item.status === 'warning' ? 'spinning' : ''}`} />
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{item.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <FaHistory className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-500">آخر مزامنة:</span>
                      <span className="font-medium">{formatDateTime(item.lastSync)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaSyncAlt className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-500">التكرار:</span>
                      <span className="font-medium">{item.syncFrequency}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaExchangeAlt className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-500">اتجاه البيانات:</span>
                      <span className="font-medium">{item.dataFlow}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaServer className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-500">السجلات:</span>
                      <span className="font-medium">{item.records.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="section-card">
          <div className="section-header">
            <FaLock className="h-4 w-4 ml-2 text-red-600" />
            <span>الأمان والامتثال</span>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-l from-blue-50 to-purple-50 p-4 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">مؤشر الامتثال</h3>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-secondary">98.5%</span>
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-secondary font-bold text-sm">A+</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div className="bg-primary h-2 rounded-full" style={{ width: '98.5%' }}></div>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { icon: FaLock, bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600', label: 'حالة التشفير', value: 'نشط', valueColor: 'text-green-600' },
                { icon: FaCloud, bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', label: 'شهادة SSL', value: 'صالح حتى 2027-06-15', valueColor: 'text-blue-600' },
                { icon: FaShieldAlt, bg: 'bg-yellow-50', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', label: 'محاولات تسجيل الدخول الفاشلة (24 ساعة)', value: '3', valueColor: 'text-yellow-600' },
                { icon: FaShieldAlt, bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600', label: 'حوادث اختراق البيانات', value: '0', valueColor: 'text-green-600' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className={`flex items-center justify-between p-3 ${item.bg} rounded-xl`}>
                    <div className="flex items-center gap-3">
                      <div className={`${item.iconBg} p-2 rounded-lg`}>
                        <Icon className={`h-4 w-4 ${item.iconColor}`} />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    </div>
                    <span className={`text-xs font-medium ${item.valueColor}`}>{item.value}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-3">آخر تدقيق أمني: 2026-01-15</p>
              <button className="w-full bg-red-600 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
                تشغيل فحص أمان
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="section-card mb-8">
        <div className="section-header">
          <FaNetworkWired className="h-4 w-4 ml-2 text-purple-600" />
          <span>سجل نشاط الـ API</span>
        </div>

        <div className="overflow-x-auto">
          <table className="payroll-table min-w-full">
            <thead>
              <tr>
                <th>الوقت</th>
                <th>النقطة النهائية</th>
                <th>الطريقة</th>
                <th>الحالة</th>
                <th>وقت الاستجابة</th>
                <th>السجلات</th>
              </tr>
            </thead>
            <tbody>
              {apiLogs.map((log) => (
                <tr key={log.id}>
                  <td className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</td>
                  <td className="text-xs font-medium text-gray-900 dir-ltr">{log.endpoint}</td>
                  <td>
                    <span className={`status-badge ${methodColors[log.method] || 'bg-gray-100 text-gray-800'}`}>{log.method}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusCodeColor(log.status)}`}>{log.status}</span>
                  </td>
                  <td className="text-xs text-gray-500">{log.responseTime}</td>
                  <td className="text-xs text-gray-500">{log.records.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: FaSyncAlt, color: 'text-secondary', label: 'مزامنة يدوية', desc: 'فرض مزامنة جميع الأنظمة المتصلة' },
          { icon: FaLock, color: 'text-green-600', label: 'تحديث الشهادات', desc: 'تجديد شهادات SSL والمفاتيح الأمنية' },
          { icon: FaServer, color: 'text-purple-600', label: 'اختبار الاتصال', desc: 'تحقق من جميع اتصالات النظام والنقاط النهائية' },
        ].map((btn, i) => {
          const Icon = btn.icon;
          return (
            <button key={i} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow text-right">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-5 w-5 ${btn.color}`} />
                <h3 className="font-semibold text-gray-900 text-sm">{btn.label}</h3>
              </div>
              <p className="text-xs text-gray-600">{btn.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PayrollIntegration;
