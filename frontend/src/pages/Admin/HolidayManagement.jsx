import { useState, useEffect } from 'react';
import { FaCalendarAlt, FaPlus, FaTrash } from 'react-icons/fa';
import { getHolidays, createHoliday, deleteHoliday } from '../../services/holidayService';

const HOLIDAY_TYPES = [
  { value: 'public_holiday', label: 'عطلة رسمية' },
  { value: 'religious', label: 'عطلة دينية' },
  { value: 'national', label: 'عطلة وطنية' },
  { value: 'other', label: 'أخرى' },
];

const TYPE_COLORS = {
  public_holiday: 'bg-red-100 text-red-700 border-red-200',
  religious: 'bg-green-100 text-green-700 border-green-200',
  national: 'bg-blue-100 text-blue-700 border-blue-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

const TYPE_LABELS = {
  public_holiday: 'رسمية',
  religious: 'دينية',
  national: 'وطنية',
  other: 'أخرى',
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const diffDays = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0,0,0,0);
  e.setHours(0,0,0,0);
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
};

const HolidayManagement = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ startDate: '', endDate: '', name: '', type: 'public_holiday' });

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const res = await getHolidays(year);
      if (res.success) setHolidays(res.data);
    } catch (err) {
      setError('حدث خطأ في تحميل الإجازات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHolidays(); }, [year]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.name) return;
    try {
      setError('');
      setSuccess('');
      const payload = {
        startDate: form.startDate,
        name: form.name,
        type: form.type,
      };
      if (form.endDate) payload.endDate = form.endDate;
      const res = await createHoliday(payload);
      if (res.success) {
        const days = form.endDate ? diffDays(form.startDate, form.endDate) : 1;
        setSuccess(`تم إضافة "${form.name}" (${days} يوم) بنجاح`);
        setShowForm(false);
        setForm({ startDate: '', endDate: '', name: '', type: 'public_holiday' });
        loadHolidays();
      } else {
        setError(res.message || 'فشل الإضافة');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;
    try {
      const res = await deleteHoliday(id);
      if (res.success) {
        setSuccess(`تم حذف "${name}"`);
        loadHolidays();
      }
    } catch (err) {
      setError('حدث خطأ في الحذف');
    }
  };

  const years = [];
  for (let y = new Date().getFullYear() - 1; y <= new Date().getFullYear() + 3; y++) {
    years.push(y);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#DC2626' }}>
            <FaCalendarAlt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#182E4E' }}>إدارة الإجازات والعطل الرسمية</h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>أضف العطل الرسمية والدينية والوطنية لتستثنى من كشف الحضور</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-4 text-sm">
          {success} <button onClick={() => setSuccess('')} className="mr-2 font-bold">&times;</button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4 text-sm">
          {error} <button onClick={() => setError('')} className="mr-2 font-bold">&times;</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium" style={{ color: '#374151' }}>السنة</label>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            style={{ color: '#182E4E' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
          <FaPlus className="w-4 h-4" />
          إضافة عطلة
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-md p-5 mb-6 border border-red-100">
          <h3 className="font-bold mb-4" style={{ color: '#182E4E' }}>إضافة عطلة جديدة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>تاريخ البداية *</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                style={{ color: '#182E4E' }} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>تاريخ النهاية</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                style={{ color: '#182E4E' }} />
              <p className="text-[10px] text-gray-400 mt-1">اتركه فارغاً ليوم واحد</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>نوع العطلة</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                style={{ color: '#182E4E' }}>
                {HOLIDAY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>اسم العطلة *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: عيد الفطر، اليوم الوطني..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                style={{ color: '#182E4E' }} required />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
              حفظ
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : holidays.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-10 text-center">
          <p className="text-gray-400 text-lg mb-2">لا توجد عطل مضافة لهذه السنة</p>
          <p className="text-gray-400 text-sm">أضف العطل الرسمية والدينية لتظهر هنا</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#182E4E' }}>
                  <th className="px-4 py-3 text-white font-semibold text-xs text-right">المدة</th>
                  <th className="px-4 py-3 text-white font-semibold text-xs text-right">اسم العطلة</th>
                  <th className="px-4 py-3 text-white font-semibold text-xs text-right">النوع</th>
                  <th className="px-4 py-3 text-white font-semibold text-xs text-center">عدد الأيام</th>
                  <th className="px-4 py-3 text-white font-semibold text-xs text-center">حذف</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => {
                  const days = diffDays(h.startDate, h.endDate);
                  const isMulti = days > 1;
                  return (
                    <tr key={h._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 align-middle">
                        <span className="font-medium text-xs whitespace-nowrap" style={{ color: '#182E4E' }}>
                          {isMulti ? (
                            <span>{formatDate(h.startDate)} <span className="text-gray-400">→</span> {formatDate(h.endDate)}</span>
                          ) : (
                            formatDate(h.startDate)
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="font-semibold text-xs" style={{ color: '#182E4E' }}>{h.name}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${TYPE_COLORS[h.type] || TYPE_COLORS.other}`}>
                          {TYPE_LABELS[h.type] || h.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-center">
                        <span className="text-xs font-bold" style={{ color: '#DC2626' }}>{days}</span>
                      </td>
                      <td className="px-4 py-3 align-middle text-center">
                        <button onClick={() => handleDelete(h._id, h.name)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                          title="حذف">
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 text-xs text-gray-400 text-center border-t border-gray-100">
            إجمالي {holidays.length} عطلة
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayManagement;
