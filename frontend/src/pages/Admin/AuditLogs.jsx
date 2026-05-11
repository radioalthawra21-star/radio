import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditLogs, exportAuditLogs, getAuditActions, getAuditEntities, getAuditLogStats } from '../../services/auditLogService';
import { getNotificationService } from '../../services/notificationService';

const AuditLogs = () => {
  const navigate = useNavigate();
  
  // State for audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for filters
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    entity: '',
    startDate: '',
    endDate: '',
    riskLevel: '',
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // State for pagination
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // State for filter options
  const [actions, setActions] = useState([]);
  const [entities, setEntities] = useState([]);
  
  // State for statistics
  const [stats, setStats] = useState(null);
  
  // State for export
  const [exporting, setExporting] = useState(false);
  
  // Fetch filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [actionsRes, entitiesRes] = await Promise.all([
          getAuditActions(),
          getAuditEntities()
        ]);
        
        if (actionsRes.success) setActions(actionsRes.data.actions);
        if (entitiesRes.success) setEntities(entitiesRes.data.entities);
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    };
    
    loadFilterOptions();
  }, []);
  
  // Fetch audit logs
  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAuditLogs(filters);
      if (response.success) {
        setAuditLogs(response.data.auditLogs);
        setTotalCount(response.data.pagination.total);
        setTotalPages(response.data.pagination.pages);
        
        // Load statistics
        const statsResponse = await getAuditLogStats({
          startDate: filters.startDate,
          endDate: filters.endDate
        });
        if (statsResponse.success) {
          setStats(statsResponse.data);
        }
      } else {
        setError(response.message || 'Failed to load audit logs');
      }
    } catch (err) {
      setError('Error loading audit logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Load initial data
  useEffect(() => {
    loadAuditLogs();
  }, [filters]);
  
  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filtering
    }));
  };
  
  // Handle date changes
  const handleDateChange = (field, date) => {
    setFilters(prev => ({
      ...prev,
      [field]: date ? date.toISOString().split('T')[0] : '',
      page: 1
    }));
  };
  
  // Handle page change
  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  };
  
  // Handle limit change
  const handleLimitChange = (limit) => {
    setFilters(prev => ({
      ...prev,
      limit,
      page: 1
    }));
  };
  
  // Handle sort change
  const handleSortChange = (sortBy, sortOrder) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder,
      page: 1
    }));
  };
  
  // Handle export
  const handleExport = async (format) => {
    setExporting(true);
    try {
      const response = await exportAuditLogs(filters, format);
      if (response) {
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        
        // Show success notification
        getNotificationService().showSuccess(`تم تصدير سجلات التدقيق بنجاح كملف ${format.toUpperCase()}`);
      }
    } catch (err) {
      getNotificationService().showError('فشل في تصدير سجلات التدقيق');
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  
  // Format datetime for display
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get risk level color
  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'bg-error/20 text-error';
      case 'high': return 'bg-warning/20 text-warning';
      case 'medium': return 'bg-info/20 text-info';
      case 'low': return 'bg-success/20 text-success';
      default: return 'bg-gray-200 text-gray-600';
    }
  };
  
  // Get action label
  const getActionLabel = (action) => {
    if (!action) return '-';
    return action
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">سجلات التدقيق</h1>
          <p className="text-gray-600 mt-1">مراجعة وتصفية أحداث النظام للأمان والامتثال</p>
        </div>
        
        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-dark mb-2">إجمالي السجلات</h3>
              <p className="text-2xl font-bold text-dark">{stats.totalCount.toLocaleString()}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-dark mb-2">اليوم</h3>
              <p className="text-2xl font-bold text-dark">
                {stats.dailyActivity.length > 0 ? stats.dailyActivity[0].count : 0}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-dark mb-2">هذا الأسبوع</h3>
              <p className="text-2xl font-bold text-dark">
                {stats.dailyActivity.slice(0, 7).reduce((sum, day) => sum + day.count, 0)}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-dark mb-2">هذا الشهر</h3>
              <p className="text-2xl font-bold text-dark">
                {stats.dailyActivity.slice(0, 30).reduce((sum, day) => sum + day.count, 0)}
              </p>
            </div>
          </div>
        )}
        
        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-dark mb-4">الفلاتر</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">المستخدم</label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="اسم المستخدم أو المعرف..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">الإجراء</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">كل الإجراءات</option>
                {actions.map(action => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Entity Filter */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">الكيان</label>
              <select
                value={filters.entity}
                onChange={(e) => handleFilterChange('entity', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">كل الكيانات</option>
                {entities.map(entity => (
                  <option key={entity.value} value={entity.value}>
                    {entity.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Risk Level Filter */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">مستوى المخاطر</label>
              <select
                value={filters.riskLevel}
                onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">كل المستويات</option>
                <option value="low">منخفض</option>
                <option value="medium">متوسط</option>
                <option value="high">عالي</option>
                <option value="critical">حرج</option>
              </select>
            </div>
            
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">من التاريخ</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleDateChange('startDate', e.target ? new Date(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">إلى التاريخ</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleDateChange('endDate', e.target ? new Date(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setFilters(prev => ({
                  ...prev,
                  userId: '',
                  action: '',
                  entity: '',
                  startDate: '',
                  endDate: '',
                  riskLevel: '',
                  page: 1
                }));
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              إعادة الضبط
            </button>
            <button
              onClick={loadAuditLogs}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              تطبيق الفلاتر
            </button>
          </div>
        </div>
        
        {/* Audit Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-dark">سجلات التدقيق</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className={`px-3 py-1.5 bg-success text-white rounded hover:bg-success-dark transition-colors ${
                    exporting ? 'opacity-70' : ''
                  }`}
                >
                  {exporting ? 'جاري التصدير...' : 'تصدير CSV'}
                </button>
                <button
                  onClick={() => handleExport('json')}
                  disabled={exporting}
                  className={`px-3 py-1.5 bg-info text-white rounded hover:bg-info-dark transition-colors ${
                    exporting ? 'opacity-70' : ''
                  }`}
                >
                  {exporting ? 'جاري التصدير...' : 'تصدير JSON'}
                </button>
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
              <button
                onClick={loadAuditLogs}
                className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>لا توجد سجلات تدقيق مطابقة للمعايير المحددة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التاريخ والوقت
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المستخدم
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراء
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الكيان
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      معرف الكيان
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      مستوى المخاطر
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الوصف
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map(log => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-dark">
                          {log.user?.name || 'نظام'}
                        </div>
                        {log.user?.username && (
                          <p className="text-xs text-gray-500">(@{log.user.username})</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getActionLabel(log.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.entity || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm break-all">
                        {log.entityId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getRiskLevelColor(log.riskLevel)}`}>
                          {log.riskLevel
                            ?.charAt(0).toUpperCase() + log.riskLevel?.slice(1)}
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
          
          {/* Pagination */}
          {auditLogs.length > 0 && (
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">
                عرض {(filters.page - 1) * filters.limit + 1}-{
                  Math.min(filters.page * filters.limit, totalCount)
                } من {totalCount.toLocaleString()} سجل
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                  className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  السابق
                </button>
                <span className="px-3 py-1.5 text-sm">
                  {filters.page} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === totalPages}
                  className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;