import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSearch, FaFilter, FaDownload, FaMoneyBillWave } from 'react-icons/fa';
import * as financialMiscService from '../../services/financialMiscService';

const initialForm = { description: '', date: new Date().toISOString().split('T')[0], amount: '', notes: '' };

const formatCurrency = (n) => {
  if (n == null || isNaN(n)) return '0.00';
  return new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function FinancialMiscPage({ readOnly: routeReadOnly }) {
  const role = JSON.parse(localStorage.getItem('user') || '{}')?.role;
  const isReportView = routeReadOnly || false;
  const isReadOnly = isReportView || role === 'admin' || role === 'manager';
  const canEdit = !isReadOnly && (role === 'hr' || role === 'employee');

  const [items, setItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (monthFilter) {
        const d = new Date(monthFilter);
        params.startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        params.endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();
      }
      const res = await financialMiscService.getFinancialMiscList(params);
      if (res.data?.success) {
        setItems(res.data.data.items || []);
        setTotalAmount(res.data.data.totalAmount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [monthFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    setSubmitting(true);
    try {
      const payload = {
        description: form.description,
        date: form.date,
        amount: Number(form.amount),
        notes: form.notes || ''
      };
      if (editingId) {
        await financialMiscService.updateFinancialMisc(editingId, payload);
      } else {
        await financialMiscService.createFinancialMisc(payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      description: item.description,
      date: item.date ? item.date.split('T')[0] : '',
      amount: item.amount,
      notes: item.notes || ''
    });
    setEditingId(item._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await financialMiscService.deleteFinancialMisc(id);
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = items.filter(i =>
    !search || i.description?.includes(search) || i.notes?.includes(search) || String(i.number).includes(search)
  );

  const exportCSV = () => {
    const rows = [['الرقم', 'البيان', 'التاريخ', 'المبلغ', 'ملاحظات']];
    filtered.forEach(i => rows.push([i.number, i.description, formatDate(i.date), i.amount, i.notes || '']));
    const bom = '\uFEFF';
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'متفرقات_مالية.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-2 sm:p-4 max-w-6xl mx-auto" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaMoneyBillWave className="text-green-600" /> متفرقات مالية
            {isReportView && <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">تقرير - قراءة فقط</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{isReportView ? 'تقرير مفصل لجميع القيود المالية' : 'إدارة الإيرادات والمصروفات المتنوعة'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV} className="btn btn-ghost btn-sm flex items-center gap-1 text-gray-600">
            <FaDownload /> تصدير
          </button>
          {canEdit && (
            <button onClick={() => { setForm(initialForm); setEditingId(null); setShowForm(true); }}
              className="btn btn-primary btn-sm flex items-center gap-1 shadow-lg shadow-primary/30">
              <FaPlus /> إضافة جديد
            </button>
          )}
        </div>
      </div>

      {/* Total Card */}
      <div className="bg-gradient-to-l from-green-500 to-emerald-600 rounded-2xl p-5 mb-6 text-white shadow-lg">
        <div className="text-sm opacity-80 mb-1">إجمالي المبالغ</div>
        <div className="text-3xl font-bold">{formatCurrency(totalAmount)}</div>
        <div className="text-xs opacity-60 mt-1">عدد القيود: {items.length}</div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث في البيان أو الملاحظات..."
            className="input input-bordered w-full pr-10"
          />
        </div>
        <div className="relative">
          <FaFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="input input-bordered pr-10"
          />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">{editingId ? 'تعديل' : 'إضافة'} قيد مالي</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full"><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">البيان *</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input input-bordered w-full" required placeholder="وصف القيد" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">التاريخ *</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="input input-bordered w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">المبلغ *</label>
                  <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="input input-bordered w-full" required placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="textarea textarea-bordered w-full" rows={3} placeholder="أي ملاحظات إضافية..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="btn btn-ghost">إلغاء</button>
                <button type="submit" disabled={submitting}
                  className="btn btn-primary">
                  {submitting ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table - Desktop */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-16">#</th>
                <th>البيان</th>
                <th className="w-28">التاريخ</th>
                <th className="w-32 text-left">المبلغ</th>
                <th className="hidden lg:table-cell">ملاحظات</th>
                {!isReadOnly && <th className="w-24"></th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto"></div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  لا توجد بيانات
                </td></tr>
              ) : filtered.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="font-mono text-gray-500">{item.number}</td>
                  <td className="font-medium">{item.description}</td>
                  <td className="text-gray-600 text-sm">{formatDate(item.date)}</td>
                  <td className={`text-left font-bold tabular-nums ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="text-gray-500 text-sm hidden lg:table-cell max-w-xs truncate">{item.notes || '-'}</td>
                  {!isReadOnly && (
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(item)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600" title="تعديل"><FaEdit /></button>
                        <button onClick={() => handleDelete(item._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600" title="حذف"><FaTrash /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">لا توجد بيانات</div>
        ) : filtered.map((item) => (
          <div key={item._id} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-mono">#{item.number}</span>
              <span className="text-xs text-gray-500">{formatDate(item.date)}</span>
            </div>
            <p className="font-medium text-sm mb-2">{item.description}</p>
            <div className="flex items-center justify-between">
              <span className={`text-lg font-bold tabular-nums ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(item.amount)}
              </span>
              {!isReadOnly && (
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"><FaEdit /></button>
                  <button onClick={() => handleDelete(item._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600"><FaTrash /></button>
                </div>
              )}
            </div>
            {item.notes && <p className="text-xs text-gray-400 mt-2">{item.notes}</p>}
          </div>
        ))}
      </div>

      {/* Bottom Total - Mobile */}
      {filtered.length > 0 && (
        <div className="md:hidden mt-4 bg-gradient-to-l from-green-500 to-emerald-600 rounded-xl p-4 text-white text-center shadow-lg">
          <div className="text-xs opacity-80">الإجمالي</div>
          <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
        </div>
      )}

      {/* Future Extension Note */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
        <p className="font-medium mb-1">🧩 قابل للتوسعة</p>
        <p className="text-xs opacity-75">هذه الصفحة مصممة لتستقبل حقول وأعمدة إضافية في المستقبل. يمكن إضافة تصنيفات، أقسام فرعية، أنواع (إيراد/مصروف)، مرفقات، والمزيد بسهولة.</p>
      </div>
    </div>
  );
}
