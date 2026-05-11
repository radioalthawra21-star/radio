import React, { useState, useEffect, useMemo } from 'react';

const ALERT_TYPES = {
  error:   { styles: 'bg-red-50 border-red-200 text-red-800',       icon: '❌', label: 'خطأ' },
  warning: { styles: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: '⚠️', label: 'تحذير' },
  info:    { styles: 'bg-blue-50 border-blue-200 text-blue-800',    icon: 'ℹ️', label: 'معلومة' },
};

const DEFAULT_ALERTS = [
  { id: 1, type: 'warning', message: 'تحذير: استخدام الذاكرة مرتفع (>80%)', timestamp: new Date().toISOString() },
  { id: 2, type: 'error',   message: 'خطأ: فشل الاتصال بالخادم الخارجي',   timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, type: 'info',    message: 'معلومة: تم تحديث إعدادات الخطوط بنجاح', timestamp: new Date(Date.now() - 7200000).toISOString() },
];

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('developerAlerts');
      return saved ? JSON.parse(saved) : DEFAULT_ALERTS;
    } catch {
      return DEFAULT_ALERTS;
    }
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    localStorage.setItem('developerAlerts', JSON.stringify(alerts));
  }, [alerts]);

  const filteredAlerts = useMemo(
    () => (filter === 'all' ? alerts : alerts.filter((a) => a.type === filter)),
    [alerts, filter]
  );

  const counts = useMemo(
    () => ({
      all: alerts.length,
      error: alerts.filter((a) => a.type === 'error').length,
      warning: alerts.filter((a) => a.type === 'warning').length,
      info: alerts.filter((a) => a.type === 'info').length,
    }),
    [alerts]
  );

  const handleDeleteAlert = (id) =>
    setAlerts((prev) => prev.filter((a) => a.id !== id));

  const handleClearAll = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع التحذيرات؟')) setAlerts([]);
  };

  const handleAddTestAlert = () => {
    const types = ['warning', 'error', 'info'];
    const messages = [
      'تحذير: وقت استجابة بطيء',
      'خطأ: فشل في تحميل المورد',
      'معلومة: تم الحفظ تلقائياً',
    ];
    const i = Math.floor(Math.random() * 3);
    setAlerts((prev) => [
      { id: Date.now(), type: types[i], message: messages[i], timestamp: new Date().toISOString() },
      ...prev,
    ]);
  };

  return (
    <div dir="rtl" className="p-5 bg-[#E3D4BE] rounded-xl border border-[#CD6F13] shadow-md">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h3 className="text-[#182E4E] font-bold text-xl flex items-center gap-2">
          <span className="w-2 h-6 bg-[#1C95A4] rounded-full" aria-hidden="true"></span>
          لوحة التحذيرات
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleAddTestAlert}
            className="px-3 py-1 bg-[#1C95A4] hover:bg-[#1C95A4]/90 text-white rounded text-xs font-medium transition-colors"
          >
            + تحذير تجريبي
          </button>
          <button
            onClick={handleClearAll}
            disabled={alerts.length === 0}
            className="px-3 py-1 bg-[#CD6F13] hover:bg-[#CD6F13]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
          >
            مسح الكل
          </button>
        </div>
      </div>

      {/* فلاتر */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'error', 'warning', 'info'].map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filter === key
                ? 'bg-[#182E4E] text-white border-[#182E4E]'
                : 'bg-white/70 text-[#182E4E] border-[#CD6F13]/30 hover:bg-[#CD6F13]/10'
            }`}
          >
            {key === 'all' ? 'الكل' : ALERT_TYPES[key].label} ({counts[key]})
          </button>
        ))}
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="p-8 text-center text-[#182E4E]/50 italic">
          لا توجد تحذيرات حالياً 🎉
        </div>
      ) : (
        <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {filteredAlerts.map((alert) => {
            const cfg = ALERT_TYPES[alert.type] ?? ALERT_TYPES.info;
            return (
              <li
                key={alert.id}
                className={`p-3 rounded-lg border flex justify-between items-start ${cfg.styles}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span aria-hidden="true">{cfg.icon}</span>
                    <span className="font-medium">{cfg.label}</span>
                    <span className="text-xs opacity-70 mr-auto">
                      {new Date(alert.timestamp).toLocaleTimeString('ar-SA')}
                    </span>
                  </div>
                  <div className="text-sm">{alert.message}</div>
                </div>
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  aria-label="حذف التحذير"
                  className="mr-3 px-2 py-1 text-xs opacity-60 hover:opacity-100 hover:bg-black/5 rounded transition-opacity"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}