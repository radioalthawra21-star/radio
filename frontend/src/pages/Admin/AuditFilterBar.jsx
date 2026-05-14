export default function AuditFilterBar({ filters, actions, entities, onFilterChange, onDateChange, onReset, onApply }) {
  return (
    <div className="mb-6 bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-dark mb-4">الفلاتر</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium text-dark mb-2">المستخدم</label>
          <input type="text" value={filters.userId} onChange={e => onFilterChange('userId', e.target.value)}
            placeholder="اسم المستخدم أو المعرف..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-2">الإجراء</label>
          <select value={filters.action} onChange={e => onFilterChange('action', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <option value="">كل الإجراءات</option>
            {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-2">الكيان</label>
          <select value={filters.entity} onChange={e => onFilterChange('entity', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <option value="">كل الكيانات</option>
            {entities.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-2">مستوى المخاطر</label>
          <select value={filters.riskLevel} onChange={e => onFilterChange('riskLevel', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <option value="">كل المستويات</option>
            {['low', 'medium', 'high', 'critical'].map(l => (
              <option key={l} value={l}>{l === 'low' ? 'منخفض' : l === 'medium' ? 'متوسط' : l === 'high' ? 'عالي' : 'حرج'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-2">من التاريخ</label>
          <input type="date" value={filters.startDate}
            onChange={e => onDateChange('startDate', e.target ? new Date(e.target.value) : null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-2">إلى التاريخ</label>
          <input type="date" value={filters.endDate}
            onChange={e => onDateChange('endDate', e.target ? new Date(e.target.value) : null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <button onClick={onReset} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">إعادة الضبط</button>
        <button onClick={onApply} className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">تطبيق الفلاتر</button>
      </div>
    </div>
  );
}
