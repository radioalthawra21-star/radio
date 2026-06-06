import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaCheck, FaSearch, FaDownload, FaMoneyBillWave, FaUndo, FaArrowUp, FaArrowDown, FaDollarSign, FaExchangeAlt, FaCog, FaFilePdf, FaArchive, FaHistory } from 'react-icons/fa';
import Card from '../../components/common/Card';
import * as financialMiscService from '../../services/financialMiscService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const emptyRow = { _id: null, type: 'expense', description: '', date: new Date().toISOString().split('T')[0], amount: '', notes: '', _new: true };

const typeOptions = [
  { value: 'income', label: 'إيراد', icon: '📈', color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'expense', label: 'مصروف', icon: '📉', color: 'text-red-600', bg: 'bg-red-100' }
];

const getTypeMeta = (t) => typeOptions.find(o => o.value === t) || typeOptions[1];
const getItemType = (item) => item.type || item.meta?.type || 'expense';

const RATE_KEY = 'financialMiscExchangeRate';
const CURRENCY_KEY = 'financialMiscCurrency';

const loadRate = () => {
  try { return Number(localStorage.getItem(RATE_KEY)) || 25000; } catch { return 25000; }
};

const loadCurrency = () => {
  try { return localStorage.getItem(CURRENCY_KEY) || 'USD'; } catch { return 'USD'; }
};

const formatCurrency = (n, currency = 'USD', rate = 25000) => {
  if (n == null || isNaN(n)) return '';
  const value = currency === 'SYP' ? n * rate : n;
  const locale = currency === 'SYP' ? 'ar-SA' : 'en-US';
  const symbol = currency === 'SYP' ? ' ل.س' : ' $';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: currency === 'SYP' ? 0 : 2, maximumFractionDigits: currency === 'SYP' ? 0 : 2 }).format(value) + symbol;
};

const formatNumber = (n) => {
  if (n == null || isNaN(n)) return '';
  return new Intl.NumberFormat('ar-SA').format(n);
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function FinancialMiscPage({ readOnly: routeReadOnly }) {
  const isReadOnly = routeReadOnly;
  const canEdit = !isReadOnly;

  const [items, setItems] = useState([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [netTotal, setNetTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [newRows, setNewRows] = useState([]);
  const [currency, setCurrency] = useState(loadCurrency);
  const [exchangeRate, setExchangeRate] = useState(loadRate);
  const [showRatePanel, setShowRatePanel] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const persistRate = (rate) => {
    const v = Number(rate) || 25000;
    setExchangeRate(v);
    localStorage.setItem(RATE_KEY, v);
  };

  const toggleCurrency = () => {
    const next = currency === 'USD' ? 'SYP' : 'USD';
    setCurrency(next);
    localStorage.setItem(CURRENCY_KEY, next);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (monthFilter) {
        const d = new Date(monthFilter);
        params.startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        params.endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();
      }
      if (typeFilter) params.type = typeFilter;
      if (showArchived) params.archived = 'true';
      const res = await financialMiscService.getFinancialMiscList(params);
      if (res.data?.success) {
        const d = res.data.data;
        const list = d.items || [];
        setItems(list);
        if (d.incomeTotal !== undefined) {
          setIncomeTotal(d.incomeTotal);
          setExpenseTotal(d.expenseTotal);
          setNetTotal(d.netTotal);
        } else {
          const inc = list.filter(i => getItemType(i) === 'income').reduce((s, i) => s + (i.amount || 0), 0);
          const exp = list.filter(i => getItemType(i) === 'expense').reduce((s, i) => s + (i.amount || 0), 0);
          setIncomeTotal(inc);
          setExpenseTotal(exp);
          setNetTotal(inc - exp);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [monthFilter, typeFilter, showArchived]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addNewRow = () => {
    const row = { ...emptyRow, _tempId: Date.now() + Math.random() };
    setNewRows(prev => [...prev, row]);
    setTimeout(() => {
      const inputs = document.querySelectorAll('.new-row-input');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 100);
  };

  const handleNewRowChange = (tempId, field, value) => {
    setNewRows(prev => prev.map(r => r._tempId === tempId ? { ...r, [field]: value } : r));
  };

  const saveNewRow = async (row) => {
    if (!row.description || !row.amount) return;
    setSavingId(row._tempId);
    try {
      await financialMiscService.createFinancialMisc({
        type: row.type,
        meta: { type: row.type },
        description: row.description,
        date: row.date,
        amount: Number(row.amount),
        notes: row.notes || ''
      });
      setNewRows(prev => prev.filter(r => r._tempId !== row._tempId));
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const cancelNewRow = (tempId) => {
    setNewRows(prev => prev.filter(r => r._tempId !== tempId));
  };

  const startEdit = (item) => {
    setEditId(item._id);
    setEditForm({
      type: getItemType(item),
      description: item.description,
      date: item.date ? item.date.split('T')[0] : '',
      amount: item.amount,
      notes: item.notes || ''
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({});
  };

  const saveEdit = async (id) => {
    if (!editForm.description || !editForm.amount) return;
    setSavingId(id);
    try {
      await financialMiscService.updateFinancialMisc(id, {
        type: editForm.type,
        meta: { type: editForm.type },
        description: editForm.description,
        date: editForm.date,
        amount: Number(editForm.amount),
        notes: editForm.notes || ''
      });
      setEditId(null);
      setEditForm({});
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
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

  const handleArchiveMonth = async () => {
    const month = monthFilter || new Date().toISOString().slice(0, 7);
    if (!window.confirm(`هل أنت متأكد من أرشفة شهر ${new Date(month + '-01').toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })}؟`)) return;
    setArchiving(true);
    try {
      const res = await financialMiscService.archiveMonth(month + '-01');
      if (res.data?.success) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setArchiving(false);
    }
  };

  const f = (n) => formatCurrency(n, currency, exchangeRate);
  const fn = (n) => formatNumber(n);

  const filtered = items.filter(i =>
    !search || i.description?.includes(search) || i.notes?.includes(search) || String(i.number).includes(search)
  );
  const displayItems = [...newRows, ...filtered];

  const exportPDF = async () => {
    setPdfLoading(true);
    try {
      const container = document.createElement('div');
      Object.assign(container.style, {
        position: 'absolute', left: '-9999px', top: '0',
        width: '190mm', padding: '10mm', background: 'white',
        direction: 'rtl', textAlign: 'right',
        fontFamily: 'Arial, sans-serif'
      });

      const tot = (n) => currency === 'SYP'
        ? (n * exchangeRate).toLocaleString('ar-SA') + ' ل.س'
        : n.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' $';

      const monthName = monthFilter
        ? new Date(monthFilter + '-01').toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })
        : '';

      const pdfTitle = showArchived
        ? (monthName ? `تقرير أرشيف شهر ${monthName}` : 'تقرير أرشيف متفرقات مالية')
        : (monthName ? `تقرير متفرقات مالية - شهر ${monthName}` : 'تقرير متفرقات مالية');

      const filterLabel = monthName
        ? `<p style="margin:2px 0;font-size:10px;color:#666;">${showArchived ? 'الأرشيف' : 'الشهر'}: ${monthName}</p>`
        : '';

      const filename = (showArchived ? 'أرشيف_' : '') + (monthName ? monthName.replace(/[\/\s]/g, '_') + '_' : '') + 'متفرقات_مالية.pdf';

      container.innerHTML = `
        <div style="text-align:center;margin-bottom:12px;">
          <h1 style="margin:0;font-size:18px;">${pdfTitle}</h1>
          <p style="margin:2px 0;font-size:10px;color:#666;">تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
          ${filterLabel}
        </div>
        <div style="display:flex;justify-content:space-around;margin-bottom:12px;font-size:11px;">
          <div style="text-align:center;"><span style="color:#16a34a;font-weight:bold;">إجمالي الإيرادات</span><br><b style="color:#16a34a;">${tot(incomeTotal)}</b></div>
          <div style="text-align:center;"><span style="color:#dc2626;font-weight:bold;">إجمالي المصروفات</span><br><b style="color:#dc2626;">${tot(expenseTotal)}</b></div>
          <div style="text-align:center;"><span style="font-weight:bold;">الصافي</span><br><b style="color:${netTotal < 0 ? '#dc2626' : '#16a34a'};">${tot(netTotal)}</b></div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:9px;" dir="rtl">
          <thead>
            <tr style="background:#182e4e;color:#fff;">
              <th style="padding:5px;border:1px solid #ccc;text-align:right;">#</th>
              <th style="padding:5px;border:1px solid #ccc;text-align:right;">النوع</th>
              <th style="padding:5px;border:1px solid #ccc;text-align:right;">البيان</th>
              <th style="padding:5px;border:1px solid #ccc;text-align:right;">التاريخ</th>
              <th style="padding:5px;border:1px solid #ccc;text-align:left;">المبلغ (${currency})</th>
              <th style="padding:5px;border:1px solid #ccc;text-align:right;">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(i => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:4px;border:1px solid #eee;">${i.number || '-'}</td>
                <td style="padding:4px;border:1px solid #eee;color:${getItemType(i) === 'income' ? '#16a34a' : '#dc2626'};">${getTypeMeta(getItemType(i)).label}</td>
                <td style="padding:4px;border:1px solid #eee;">${i.description || '-'}</td>
                <td style="padding:4px;border:1px solid #eee;">${formatDate(i.date)}</td>
                <td style="padding:4px;border:1px solid #eee;text-align:left;direction:ltr;font-family:monospace;">${currency === 'SYP' ? (i.amount * exchangeRate).toLocaleString('ar-SA') + ' ل.س' : i.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' $'}</td>
                <td style="padding:4px;border:1px solid #eee;">${i.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="text-align:center;font-size:8px;color:#999;margin-top:10px;">
          سعر الصرف: 1$ = ${exchangeRate.toLocaleString('ar-SA')} ل.س
        </div>
      `;

      document.body.appendChild(container);
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(container, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: '#ffffff',
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgH = pageW * ratio;

      if (imgH <= pageH) {
        doc.addImage(imgData, 'PNG', 0, 0, pageW, imgH);
      } else {
        const rowsPerPage = Math.floor(pageH / (imgH / filtered.length));
        let start = 0;
        let page = 0;
        while (start < filtered.length) {
          if (page > 0) doc.addPage();
          const end = Math.min(start + Math.max(rowsPerPage, 1), filtered.length);
          const slice = filtered.slice(start, end);
          const tmp = document.createElement('div');
          Object.assign(tmp.style, {
            position: 'absolute', left: '-9999px', top: '0',
            width: '190mm', padding: '10mm', background: 'white',
            direction: 'rtl', textAlign: 'right',
            fontFamily: 'Arial, sans-serif'
          });
          tmp.innerHTML = container.innerHTML.replace(
            /<tbody>[\s\S]*?<\/tbody>/,
            '<tbody>' + slice.map(i => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:4px;border:1px solid #eee;">${i.number || '-'}</td>
                <td style="padding:4px;border:1px solid #eee;color:${getItemType(i) === 'income' ? '#16a34a' : '#dc2626'};">${getTypeMeta(getItemType(i)).label}</td>
                <td style="padding:4px;border:1px solid #eee;">${i.description || '-'}</td>
                <td style="padding:4px;border:1px solid #eee;">${formatDate(i.date)}</td>
                <td style="padding:4px;border:1px solid #eee;text-align:left;direction:ltr;font-family:monospace;">${currency === 'SYP' ? (i.amount * exchangeRate).toLocaleString('ar-SA') + ' ل.س' : i.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' $'}</td>
                <td style="padding:4px;border:1px solid #eee;">${i.notes || '-'}</td>
              </tr>
            `).join('') +
            '</tbody>'
          );
          document.body.appendChild(tmp);
          await new Promise(r => setTimeout(r, 100));
          const sliceCanvas = await html2canvas(tmp, {
            scale: 2, useCORS: true, logging: false,
            backgroundColor: '#ffffff',
            width: tmp.scrollWidth, height: tmp.scrollHeight
          });
          document.body.removeChild(tmp);
          const sliceData = sliceCanvas.toDataURL('image/png');
          const sliceRatio = sliceCanvas.height / sliceCanvas.width;
          const sliceH = pageW * sliceRatio;
          doc.addImage(sliceData, 'PNG', 0, 0, pageW, sliceH);
          start = end;
          page++;
        }
      }

      doc.save(filename);
    } catch (err) {
      console.error('PDF Error:', err);
      alert('حدث خطأ في تصدير PDF: ' + err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
            <FaMoneyBillWave className="text-primary" /> متفرقات مالية
            {isReadOnly &&
              <span className="bg-warning/20 text-warning text-xs px-3 py-1 rounded-full font-medium">
                تقرير - قراءة فقط
              </span>
            }
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isReadOnly ? 'تقرير مفصل لجميع القيود المالية' : 'إدارة الإيرادات والمصروفات المتنوعة'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowArchived(p => !p)} className={`btn flex items-center gap-1 ${showArchived ? 'btn-interactive' : 'btn-outline'}`}>
            <FaHistory /> {showArchived ? 'الأرشيف' : 'الحالي'}
          </button>
          <button onClick={() => setShowRatePanel(p => !p)} className="btn btn-outline flex items-center gap-1" title="سعر الصرف">
            <FaCog /> {fn(exchangeRate)}
          </button>
          <button onClick={toggleCurrency} className={`btn flex items-center gap-1 ${currency === 'SYP' ? 'btn-interactive' : 'btn-success'}`}>
            <FaExchangeAlt /> {currency === 'USD' ? 'ل.س' : '$'}
          </button>
          <button onClick={exportPDF} disabled={pdfLoading} className="btn btn-outline flex items-center gap-1">
            <FaFilePdf /> {pdfLoading ? '...' : 'PDF'}
          </button>
          {canEdit && !showArchived && (
            <button onClick={addNewRow} className="btn btn-primary flex items-center gap-1">
              <FaPlus /> إضافة سطر
            </button>
          )}
          {canEdit && !showArchived && (
            <button onClick={handleArchiveMonth} disabled={archiving}
              className="btn btn-outline flex items-center gap-1 text-warning border-warning hover:bg-warning hover:text-white">
              <FaArchive /> {archiving ? '...' : 'أرشفة الشهر'}
            </button>
          )}
        </div>
      </div>

      {/* Exchange Rate Panel */}
      {showRatePanel && (
        <div className="exchange-rate-panel">
          <h3><FaDollarSign /> سعر الصرف</h3>
          <div className="exchange-rate-input-group">
            <label>1 دولار أمريكي =</label>
            <input type="number" value={exchangeRate} onChange={e => persistRate(e.target.value)}
              className="rate-input" min="1" />
            <label>ل.س</label>
            <button onClick={() => setShowRatePanel(false)} className="btn btn-cancel text-sm py-1 px-3">حفظ</button>
          </div>
          <p className="rate-hint">يتم حفظ سعر الصرف محلياً في المتصفح</p>
        </div>
      )}

      {/* Totals Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-xs text-green-700 mb-1 flex items-center justify-center gap-1">
            <FaArrowUp /> إجمالي الإيرادات
          </div>
          <div className="text-2xl font-bold text-green-700">{f(incomeTotal)}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-xs text-red-700 mb-1 flex items-center justify-center gap-1">
            <FaArrowDown /> إجمالي المصروفات
          </div>
          <div className="text-2xl font-bold text-red-700">{f(expenseTotal)}</div>
        </div>
        <div className={`rounded-xl p-4 text-center shadow-md ${showArchived ? 'bg-gradient-to-l from-gray-500 to-gray-700' : 'bg-gradient-to-l from-green-500 to-green-700'} text-white`}>
          <div className="text-xs opacity-80 mb-1">{showArchived ? 'إجمالي الأرشيف' : 'الصافي'}</div>
          <div className="text-2xl font-bold">{f(netTotal)}</div>
          <div className="text-xs opacity-60 mt-1">
            {showArchived ? 'أرشيف' : 'حالي'} | عدد القيود: {items.length} | السعر: {fn(exchangeRate)}
          </div>
        </div>
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
          <label>النوع</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">الكل</option>
            <option value="income">إيراد</option>
            <option value="expense">مصروف</option>
          </select>
        </div>
        <div className="filter-group">
          <label>الشهر</label>
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
        </div>
      </div>

      {/* Table - Desktop */}
      <div className="table-container hidden md:block">
        <table className="w-full text-right" dir="rtl">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="p-3 w-16">#</th>
              <th className="p-3 w-20">النوع</th>
              <th className="p-3">البيان</th>
              <th className="p-3 w-28">التاريخ</th>
              <th className="p-3 w-36 text-left">المبلغ</th>
              <th className="p-3 hidden lg:table-cell">ملاحظات</th>
              {!isReadOnly && <th className="p-3 w-28"></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12">
                <div className="spinner mx-auto"></div>
              </td></tr>
            ) : displayItems.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                لا توجد بيانات - أضف سطراً جديداً
              </td></tr>
            ) : displayItems.map((item) => {
              const isNew = item._new;
              const isEditing = editId === item._id && !isNew;
              const isSaving = savingId === (isNew ? item._tempId : item._id);
              const itemType = isNew ? item.type : getItemType(item);
              const meta = getTypeMeta(itemType);

              return (
                <tr key={isNew ? item._tempId : item._id} className={`border-b hover:bg-gray-50 ${isNew ? 'bg-blue-50' : ''}`}>
                  {/* رقم */}
                  <td className="p-3">
                    {isNew ? (
                      <span className="text-interactive font-bold">+</span>
                    ) : (
                      <span className="font-mono text-gray-500">{item.number}</span>
                    )}
                  </td>

                  {/* النوع */}
                  <td className="p-3">
                    {isNew || isEditing ? (
                      <select
                        value={isNew ? item.type : editForm.type}
                        onChange={e => {
                          if (isNew) handleNewRowChange(item._tempId, 'type', e.target.value);
                          else setEditForm({ ...editForm, type: e.target.value });
                        }}
                        className="input w-full"
                      >
                        <option value="expense">مصروف</option>
                        <option value="income">إيراد</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${meta.bg} ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                    )}
                  </td>

                  {/* البيان */}
                  <td className="p-3">
                    {isNew || isEditing ? (
                      <input
                        type="text"
                        value={isNew ? item.description : editForm.description}
                        onChange={e => {
                          if (isNew) handleNewRowChange(item._tempId, 'description', e.target.value);
                          else setEditForm({ ...editForm, description: e.target.value });
                        }}
                        className="input w-full new-row-input" placeholder="البيان"
                        onKeyDown={e => { if (e.key === 'Enter') { isNew ? saveNewRow(item) : saveEdit(item._id); } }}
                      />
                    ) : (
                      <span className="font-medium flex items-center gap-2">
                        {item.description}
                        {showArchived && <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">مؤرشف</span>}
                      </span>
                    )}
                  </td>

                  {/* التاريخ */}
                  <td className="p-3">
                    {isNew || isEditing ? (
                      <input
                        type="date"
                        value={isNew ? item.date : editForm.date}
                        onChange={e => {
                          if (isNew) handleNewRowChange(item._tempId, 'date', e.target.value);
                          else setEditForm({ ...editForm, date: e.target.value });
                        }}
                        className="input w-28"
                      />
                    ) : (
                      <span className="text-gray-600 text-sm">{formatDate(item.date)}</span>
                    )}
                  </td>

                  {/* المبلغ */}
                  <td className="p-3">
                    {isNew || isEditing ? (
                      <input
                        type="number" step="0.01"
                        value={isNew ? item.amount : editForm.amount}
                        onChange={e => {
                          if (isNew) handleNewRowChange(item._tempId, 'amount', e.target.value);
                          else setEditForm({ ...editForm, amount: e.target.value });
                        }}
                        className="input w-32 text-left" placeholder="0.00"
                        onKeyDown={e => { if (e.key === 'Enter') { isNew ? saveNewRow(item) : saveEdit(item._id); } }}
                      />
                    ) : (
                      <div>
                        <span className={`text-left block font-bold tabular-nums ${meta.color}`}>
                          {f(item.amount)}
                        </span>
                        {currency === 'SYP' && (
                          <span className="text-left block text-[10px] text-gray-400 tabular-nums">
                            {formatCurrency(item.amount, 'USD', 1)}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* ملاحظات */}
                  <td className="p-3 hidden lg:table-cell">
                    {isNew || isEditing ? (
                      <input
                        type="text"
                        value={isNew ? item.notes : editForm.notes}
                        onChange={e => {
                          if (isNew) handleNewRowChange(item._tempId, 'notes', e.target.value);
                          else setEditForm({ ...editForm, notes: e.target.value });
                        }}
                        className="input" placeholder="ملاحظات"
                      />
                    ) : (
                      <span className="text-gray-500 text-sm max-w-xs truncate block">{item.notes || '-'}</span>
                    )}
                  </td>

                  {/* أزرار */}
                  {!isReadOnly && (
                    <td className="p-3">
                      {isNew ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveNewRow(item)} disabled={isSaving || !item.description || !item.amount}
                            className={`p-2 rounded-lg ${isSaving || !item.description || !item.amount ? 'text-gray-300' : 'text-success hover:bg-green-50'}`}
                            title="حفظ">
                            {isSaving ? <div className="spinner w-4 h-4 border-2"></div> : <FaCheck />}
                          </button>
                          <button onClick={() => cancelNewRow(item._tempId)} className="p-2 rounded-lg text-error hover:bg-red-50" title="إلغاء">
                            <FaTimes />
                          </button>
                        </div>
                      ) : isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(item._id)} disabled={isSaving || !editForm.description || !editForm.amount}
                            className={`p-2 rounded-lg ${isSaving || !editForm.description || !editForm.amount ? 'text-gray-300' : 'text-success hover:bg-green-50'}`}
                            title="حفظ">
                            {isSaving ? <div className="spinner w-4 h-4 border-2"></div> : <FaCheck />}
                          </button>
                          <button onClick={cancelEdit} className="p-2 rounded-lg text-error hover:bg-red-50" title="إلغاء">
                            <FaUndo />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          {!showArchived && (
                            <button onClick={() => startEdit(item)} className="p-2 rounded-lg text-info hover:bg-blue-50" title="تعديل"><FaEdit /></button>
                          )}
                          <button onClick={() => handleDelete(item._id)} className="p-2 rounded-lg text-error hover:bg-red-50" title="حذف"><FaTrash /></button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12"><div className="spinner mx-auto"></div></div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400">لا توجد بيانات - أضف سطراً جديداً</div>
        ) : displayItems.map((item) => {
          const isNew = item._new;
          const isEditing = editId === item._id && !isNew;
          const isSaving = savingId === (isNew ? item._tempId : item._id);
          const itemTypeM = isNew ? item.type : getItemType(item);
          const meta = getTypeMeta(itemTypeM);

          if (isNew) {
            return (
              <Card key={item._tempId} className="border-2 border-interactive/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-interactive font-bold text-sm">➕ سطر جديد</span>
                  <button onClick={() => cancelNewRow(item._tempId)} className="p-1 rounded-lg text-error hover:bg-red-50"><FaTimes /></button>
                </div>
                <div className="space-y-3">
                  <select value={item.type} onChange={e => handleNewRowChange(item._tempId, 'type', e.target.value)}
                    className="input">
                    <option value="expense">مصروف</option>
                    <option value="income">إيراد</option>
                  </select>
                  <input type="text" value={item.description} onChange={e => handleNewRowChange(item._tempId, 'description', e.target.value)}
                    className="input" placeholder="البيان *" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={item.date} onChange={e => handleNewRowChange(item._tempId, 'date', e.target.value)}
                      className="input" />
                    <input type="number" step="0.01" value={item.amount} onChange={e => handleNewRowChange(item._tempId, 'amount', e.target.value)}
                      className="input text-left" placeholder="المبلغ *" />
                  </div>
                  <input type="text" value={item.notes} onChange={e => handleNewRowChange(item._tempId, 'notes', e.target.value)}
                    className="input" placeholder="ملاحظات" />
                  <button onClick={() => saveNewRow(item)} disabled={isSaving || !item.description || !item.amount}
                    className="btn btn-primary w-full">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </Card>
            );
          }

          if (isEditing) {
            return (
              <Card key={item._id} className="border-2 border-info/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-info font-bold text-sm">✏️ تعديل</span>
                  <button onClick={cancelEdit} className="p-1 rounded-lg text-error hover:bg-red-50"><FaTimes /></button>
                </div>
                <div className="space-y-3">
                  <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                    className="input">
                    <option value="expense">مصروف</option>
                    <option value="income">إيراد</option>
                  </select>
                  <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    className="input" placeholder="البيان *" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                      className="input" />
                    <input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                      className="input text-left" placeholder="المبلغ *" />
                  </div>
                  <input type="text" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                    className="input" placeholder="ملاحظات" />
                  <button onClick={() => saveEdit(item._id)} disabled={isSaving || !editForm.description || !editForm.amount}
                    className="btn btn-success w-full">
                    {isSaving ? 'جاري الحفظ...' : 'تحديث'}
                  </button>
                </div>
              </Card>
            );
          }

          return (
            <Card key={item._id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-mono">#{item.number}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>
              </div>
              <p className="font-medium text-sm mb-2">{item.description}</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-lg font-bold tabular-nums ${meta.color}`}>{f(item.amount)}</span>
                  {currency === 'SYP' && (
                    <div className="text-[10px] text-gray-400 tabular-nums">{formatCurrency(item.amount, 'USD', 1)}</div>
                  )}
                </div>
                <span className="text-xs text-gray-500">{formatDate(item.date)}</span>
              </div>
              {!isReadOnly && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                  {!showArchived && (
                    <button onClick={() => startEdit(item)} className="btn btn-info flex-1 text-xs flex items-center justify-center gap-1"><FaEdit /> تعديل</button>
                  )}
                  <button onClick={() => handleDelete(item._id)} className="btn btn-danger flex-1 text-xs flex items-center justify-center gap-1"><FaTrash /> حذف</button>
                </div>
              )}
              {item.notes && <p className="text-xs text-gray-400 mt-2">{item.notes}</p>}
            </Card>
          );
        })}

        {canEdit && (
          <button onClick={addNewRow} className="btn btn-outline w-full flex items-center justify-center gap-2 mt-2">
            <FaPlus /> إضافة سطر جديد
          </button>
        )}
      </div>
    </div>
  );
}