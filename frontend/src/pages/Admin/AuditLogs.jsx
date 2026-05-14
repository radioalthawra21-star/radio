import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditLogs, exportAuditLogs, getAuditActions, getAuditEntities, getAuditLogStats } from '../../services/auditLogService';
import { getNotificationService } from '../../services/notificationService';
import { formatDateTime, getRiskLevelColor, getActionLabel } from './auditLogUtils';
import AuditFilterBar from './AuditFilterBar';

const AuditLogs = () => {
  const navigate = useNavigate();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ userId: '', action: '', entity: '', startDate: '', endDate: '', riskLevel: '', page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actions, setActions] = useState([]);
  const [entities, setEntities] = useState([]);
  const [stats, setStats] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const [actionsRes, entitiesRes] = await Promise.all([getAuditActions(), getAuditEntities()]);
      if (actionsRes.success) setActions(actionsRes.data.actions);
      if (entitiesRes.success) setEntities(entitiesRes.data.entities);
    })();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true); setError(null);
    try {
      const response = await getAuditLogs(filters);
      if (response.success) {
        setAuditLogs(response.data.auditLogs);
        setTotalCount(response.data.pagination.total);
        setTotalPages(response.data.pagination.pages);
        const statsResponse = await getAuditLogStats({ startDate: filters.startDate, endDate: filters.endDate });
        if (statsResponse.success) setStats(statsResponse.data);
      } else setError(response.message || 'Failed to load audit logs');
    } catch (err) { setError('Error loading audit logs: ' + err.message) }
    finally { setLoading(false) }
  };

  useEffect(() => { loadAuditLogs() }, [filters]);

  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  const handleDateChange = (field, date) => setFilters(prev => ({ ...prev, [field]: date ? date.toISOString().split('T')[0] : '', page: 1 }));
  const handlePageChange = (page) => setFilters(prev => ({ ...prev, page }));
  const handleReset = () => setFilters(prev => ({ ...prev, userId: '', action: '', entity: '', startDate: '', endDate: '', riskLevel: '', page: 1 }));

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const response = await exportAuditLogs(filters, format);
      if (response) {
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement('a');
        link.href = url; link.setAttribute('download', `audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`);
        document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
        getNotificationService().showSuccess(`تم تصدير سجلات التدقيق بنجاح كملف ${format.toUpperCase()}`);
      }
    } catch (err) { getNotificationService().showError('فشل في تصدير سجلات التدقيق') }
    finally { setExporting(false) }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">سجلات التدقيق</h1>
          <p className="text-gray-600 mt-1">مراجعة وتصفية أحداث النظام للأمان والامتثال</p>
        </div>

        {stats && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{ label: 'إجمالي السجلات', value: stats.totalCount.toLocaleString() },
              { label: 'اليوم', value: stats.dailyActivity.length > 0 ? stats.dailyActivity[0].count : 0 },
              { label: 'هذا الأسبوع', value: stats.dailyActivity.slice(0, 7).reduce((s, d) => s + d.count, 0) },
              { label: 'هذا الشهر', value: stats.dailyActivity.slice(0, 30).reduce((s, d) => s + d.count, 0) },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-medium text-dark mb-2">{s.label}</h3>
                <p className="text-2xl font-bold text-dark">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <AuditFilterBar filters={filters} actions={actions} entities={entities}
          onFilterChange={handleFilterChange} onDateChange={handleDateChange}
          onReset={handleReset} onApply={loadAuditLogs} />

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-dark">سجلات التدقيق</h2>
              <div className="flex gap-2">
                {['csv', 'json'].map(f => (
                  <button key={f} onClick={() => handleExport(f)} disabled={exporting}
                    className={`px-3 py-1.5 ${f === 'csv' ? 'bg-success' : 'bg-info'} text-white rounded hover:opacity-90 transition-colors ${exporting ? 'opacity-70' : ''}`}>
                    {exporting ? 'جاري التصدير...' : `تصدير ${f.toUpperCase()}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 mx-auto mb-4 border-t-4 border-primary"></div>
              <p className="text-gray-500">جاري تحميل سجلات التدقيق...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-error">
              <p>{error}</p>
              <button onClick={loadAuditLogs} className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">إعادة المحاولة</button>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-500"><p>لا توجد سجلات تدقيق مطابقة للمعايير المحددة</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['التاريخ والوقت', 'المستخدم', 'الإجراء', 'الكيان', 'معرف الكيان', 'مستوى المخاطر', 'الوصف'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map(log => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(log.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-dark">{log.user?.name || 'نظام'}</div>
                        {log.user?.username && <p className="text-xs text-gray-500">(@{log.user.username})</p>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{getActionLabel(log.action)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{log.entity || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm break-all">{log.entityId || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getRiskLevelColor(log.riskLevel)}`}>
                          {log.riskLevel?.charAt(0).toUpperCase() + log.riskLevel?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {auditLogs.length > 0 && (
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">
                عرض {(filters.page - 1) * filters.limit + 1}-{Math.min(filters.page * filters.limit, totalCount)} من {totalCount.toLocaleString()} سجل
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePageChange(filters.page - 1)} disabled={filters.page === 1}
                  className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">السابق</button>
                <span className="px-3 py-1.5 text-sm">{filters.page} / {totalPages}</span>
                <button onClick={() => handlePageChange(filters.page + 1)} disabled={filters.page === totalPages}
                  className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">التالي</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
