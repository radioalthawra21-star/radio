import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSearch, FaDownload, FaMoneyBillWave } from 'react-icons/fa';
import Card from '../../components/common/Card';
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
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
            <FaMoneyBillWave className="text-primary" /> متفرقات مالية
            {isReportView &&
              <span className="bg-warning/20 text-warning text-xs px-3 py-1 rounded-full font-medium">
                تقرير - قراءة فقط
              </span>
            }
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isReportView ? 'تقرير مفصل لجميع القيود المالية' : 'إدارة الإيرادات والمصروفات المتنوعة'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV} className="btn btn-outline flex items-center gap-1">
            <FaDownload /> تصدير
          </button>
          {canEdit && (
            <button onClick={() => { setForm(initialForm); setEditingId(null); setShowForm(true); }}
              className="btn btn-primary flex items-center gap-1">
              <FaPlus /> إضافة جديد
            </button>
          )}
        </div>
      </div>

      {/* Total Card */}
      <div className="bg-gradient-to-l from-green-500 to-green-700 text-white rounded-xl shadow-md p-6 mb-6">
        <div className="text-sm opacity-80 mb-1">إجمالي المبالغ</div>
        <div className="text-3xl font-bold">{formatCurrency(totalAmount)}</div>
        <div className="text-xs opacity-60 mt-1">عدد القيود: {items.length}</div>
      </div>

      {/* Search & Filter */}
      <div className="filters-section">
        <div className="filter-group search">
          <FaSearch className="search-icon" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث في البيان أو الملاحظات..."
          />
        </div>
        <div className="filter-group">
          <label htmlFor="monthFilter">الشهر</label>
          <input
            id="monthFilter"
            type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-dark">
                {editingId ? 'تعديل' : 'إضافة'} قيد مالي
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="label">البيان *</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input" required placeholder="وصف القيد" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">التاريخ *</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="input" required />
                </div>
                <div>
                  <label className="label">المبلغ *</label>
                  <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="input" required placeholder="0.00" />
                </div>
              </div>
              <div className="mb-4">
                <label className="label">ملاحظات</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="input" placeholder="أي ملاحظات إضافية..." />
              </div>
              <div className="flex gap-4">
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'إضافة'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline flex-1">
                  إلغاء
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Table - Desktop */}
      <div className="table-container hidden md:block">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="p-3 w-16">#</th>
              <th className="p-3">البيان</th>
              <th className="p-3 w-28">التاريخ</th>
              <th className="p-3 w-32 text-left">المبلغ</th>
              <th className="p-3 hidden lg:table-cell">ملاحظات</th>
              {!isReadOnly && <th className="p-3 w-24"></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12">
                <div className="spinner mx-auto"></div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                لا توجد بيانات
              </td></tr>
            ) : filtered.map((item) => (
              <tr key={item._id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono text-gray-500">{item.number}</td>
                <td className="p-3 font-medium">{item.description}</td>
                <td className="p-3 text-gray-600 text-sm">{formatDate(item.date)}</td>
                <td className={`p-3 text-left font-bold tabular-nums ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(item.amount)}
                </td>
                <td className="p-3 text-gray-500 text-sm hidden lg:table-cell max-w-xs truncate">{item.notes || '-'}</td>
                {!isReadOnly && (
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(item)} className="p-2 hover:bg-blue-50 rounded-lg text-info" title="تعديل"><FaEdit /></button>
                      <button onClick={() => handleDelete(item._id)} className="p-2 hover:bg-red-50 rounded-lg text-error" title="حذف"><FaTrash /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12"><div className="spinner mx-auto"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">لا توجد بيانات</div>
        ) : filtered.map((item) => (
          <Card key={item._id}>
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
                  <button onClick={() => handleEdit(item)} className="p-2 hover:bg-blue-50 rounded-lg text-info"><FaEdit /></button>
                  <button onClick={() => handleDelete(item._id)} className="p-2 hover:bg-red-50 rounded-lg text-error"><FaTrash /></button>
                </div>
              )}
            </div>
            {item.notes && <p className="text-xs text-gray-400 mt-2">{item.notes}</p>}
          </Card>
        ))}
      </div>

      {/* Bottom Total - Mobile */}
      {filtered.length > 0 && (
        <div className="md:hidden mt-4 bg-gradient-to-l from-green-500 to-green-700 rounded-xl p-4 text-white text-center shadow-md">
          <div className="text-xs opacity-80">الإجمالي</div>
          <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
        </div>
      )}
    </div>
  );
}