import { useState, useEffect } from 'react';

const LEAVE_SETTINGS = [
  { key: 'leaveAnnualDays', label: 'الإجازة الإدارية', unit: 'يوم', icon: '🏖️', default: 30 },
  { key: 'leaveDeathDays', label: 'إجازة الوفاة (عام)', unit: 'يوم', icon: '🕊️', default: 7 },
  { key: 'leaveDeathFirstDegreeDays', label: 'الوفاة - الدرجة الأولى', unit: 'يوم', icon: '🕊️', default: 3 },
  { key: 'leaveDeathSecondDegreeDays', label: 'الوفاة - الدرجة الثانية', unit: 'يوم', icon: '🕊️', default: 2 },
  { key: 'leaveDeathThirdDegreeDays', label: 'الوفاة - الدرجة الثالثة', unit: 'يوم', icon: '🕊️', default: 1 },
  { key: 'leaveMaternityDays', label: 'إجازة الوضع', unit: 'يوم', icon: '👶', default: 90 },
  { key: 'leaveHajjDays', label: 'إجازة الحج', unit: 'يوم', icon: '🕋', default: 30 },
  { key: 'leaveDevelopmentHoursPerWeek', label: 'إجازة تطوير أسبوعياً', unit: 'ساعة', icon: '📚', default: 6 },
];

const LeaveSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const token = JSON.parse(localStorage.getItem('user') || '{}').token;
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const filtered = {};
        LEAVE_SETTINGS.forEach(s => {
          filtered[s.key] = data.data.settings[s.key] !== undefined ? data.data.settings[s.key] : s.default;
        });
        setSettings(filtered);
      }
    } catch (err) {
      setError('خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    const num = parseInt(value) || 0;
    setSettings(prev => ({ ...prev, [key]: Math.max(0, num) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = JSON.parse(localStorage.getItem('user') || '{}').token;
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('تم حفظ إعدادات الإجازات بنجاح');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'فشل الحفظ');
      }
    } catch (err) {
      setError('خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" dir="rtl">
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">إعدادات أنواع الإجازات</h1>
        <p className="text-gray-500 text-xs md:text-sm mt-1">تحديد عدد الأيام السنوية لكل نوع إجازة</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LEAVE_SETTINGS.map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-400">العدد السنوي</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={settings[item.key] ?? item.default}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                    className="w-20 p-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  <span className="text-sm text-gray-500">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">ملاحظات مهمة:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>هذه الإعدادات تؤثر على رصيد الإجازات المتاح لكل موظف</li>
          <li>إجازة الوفاة - الدرجة الأولى: 3 أيام (والد، والدة، زوج/ة، ولد)</li>
          <li>إجازة الوفاة - الدرجة الثانية: يومان (أخ، أخت، جد، جدة)</li>
          <li>إجازة الوفاة - الدرجة الثالثة: يوم واحد (خال، خالة، عم، عمة)</li>
          <li>إجازة التطوير: 6 ساعات أسبوعياً كحد أقصى، لا تتراكم، تنتهي بانتهاء الأسبوع</li>
          <li>إجازة الحج: تحتاج موافقة المدير العام</li>
        </ul>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium min-h-[48px]"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
};

export default LeaveSettings;