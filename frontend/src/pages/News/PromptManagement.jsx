import { useState, useEffect, useMemo } from 'react';
import { getAllPrompts, updatePrompt, resetPrompts } from '../../services/promptService';

const STAGES = [
  { id: 1, name: 'تحسين البداية', desc: 'Lead Optimization - إعادة صياغة الفقرة الأولى' },
  { id: 2, name: 'التدقيق اللغوي والتحريري', desc: 'تصحيح الأخطاء وتحسين التراكيب' },
  { id: 3, name: 'ضبط النبرة والحزم', desc: 'نبرة رسمية مباشرة وجادة' },
  { id: 4, name: 'اللمسة الإنسانية المهنية', desc: 'تحسين السلاسة وإبراز الأثر' },
  { id: 5, name: 'فحص منع الإضافة', desc: 'التحقق من عدم إضافة معلومات' },
  { id: 6, name: 'الهوية التحريرية النهائية', desc: 'تنسيق النهائي بثلاث فقرات' },
];

const PromptManagement = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingStage, setEditingStage] = useState(null);
  const [editForm, setEditForm] = useState({ prompt: '', name: '', description: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedStage, setCopiedStage] = useState(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllPrompts();
      if (res.success) {
        setPrompts(res.data);
        if (!res.data || res.data.length === 0) {
          setError('لا توجد برومتات في قاعدة البيانات. استخدم زر "إعادة تعيين" لإنشاء البرومتات الافتراضية');
        }
      } else {
        setError(res.message || 'خطأ في تحميل البرومتات');
      }
    } catch (err) {
      setError(err.userMessage || 'خطأ في تحميل البرومتات');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (prompt) => {
    setEditingStage(prompt.stage);
    setEditForm({
      prompt: prompt.prompt,
      name: prompt.name,
      description: prompt.description
    });
  };

  const cancelEdit = () => {
    setEditingStage(null);
    setEditForm({ prompt: '', name: '', description: '' });
  };

  const handleSave = async (stage) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await updatePrompt(stage, editForm);
      if (res.success) {
        setSuccess('تم حفظ البرومت بنجاح');
        setPrompts(prev => prev.map(p => p.stage === stage ? res.data : p));
        setEditingStage(null);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.userMessage || 'خطأ في حفظ البرومت');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('هل أنت متأكد من إعادة تعيين جميع البرومتات إلى الإعدادات الافتراضية؟')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await resetPrompts();
      if (res.success) {
        setSuccess('تم إعادة تعيين البرومتات إلى الإعدادات الافتراضية');
        setPrompts(res.data);
        setEditingStage(null);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.userMessage || 'خطأ في إعادة تعيين البرومتات');
    } finally {
      setLoading(false);
    }
  };

  const getPromptForStage = (stageId) => {
    return prompts.find(p => p.stage === stageId);
  };

  const handleCopy = async (text, stageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStage(stageId);
      setTimeout(() => setCopiedStage(null), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedStage(stageId);
      setTimeout(() => setCopiedStage(null), 2000);
    }
  };

  const filteredStages = useMemo(() => {
    if (!searchQuery.trim()) return STAGES;
    const q = searchQuery.toLowerCase();
    return STAGES.filter(s =>
      s.name.includes(q) ||
      s.desc.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const stats = useMemo(() => ({
    total: STAGES.length,
    active: prompts.filter(p => p.isActive !== false).length,
    withContent: prompts.filter(p => p.prompt?.trim()).length,
  }), [prompts]);

  if (loading && prompts.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto" dir="rtl">
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة برومتات التحرير</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة التعليمات (البرومتات) لكل مرحلة من مراحل المسار التحريري</p>
        </div>
        <button
          onClick={handleReset}
          disabled={loading}
          className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium border border-orange-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          إعادة تعيين الكل
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">إجمالي المراحل</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-xs text-gray-500 mt-1">برومتات نشطة</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.withContent}</p>
          <p className="text-xs text-gray-500 mt-1">محتوى مكتمل</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={loadPrompts}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مرحلة..."
          className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm bg-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Stages */}
      {filteredStages.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>لا توجد نتائج مطابقة لبحثك</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStages.map((stage) => {
            const promptData = getPromptForStage(stage.id);
            const isEditing = editingStage === stage.id;
            const isActive = promptData?.isActive !== false;
            const charCount = (isEditing ? editForm.prompt : promptData?.prompt || '').length;

            return (
              <div
                key={stage.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-200 ${
                  isEditing ? 'border-primary ring-1 ring-primary/20' : isActive ? 'border-gray-100' : 'border-gray-100 opacity-75'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5 ${
                        isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {stage.id}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                          {promptData && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {isActive ? 'نشط' : 'غير نشط'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{stage.desc}</p>
                      </div>
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {promptData?.prompt && (
                          <button
                            onClick={() => handleCopy(promptData.prompt, stage.id)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title="نسخ البرومت"
                          >
                            {copiedStage === stage.id ? (
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(promptData || { stage: stage.id, prompt: '', name: stage.name, description: stage.desc })}
                          className="px-3 py-1.5 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium"
                        >
                          تعديل
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    <div className="space-y-3 mt-4 mr-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-gray-700">البرومت (التعليمات)</label>
                          <span className="text-xs text-gray-400">{charCount} حرف</span>
                        </div>
                        <textarea
                          value={editForm.prompt}
                          onChange={(e) => setEditForm(prev => ({ ...prev, prompt: e.target.value }))}
                          rows={8}
                          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm resize-y font-mono leading-relaxed"
                          placeholder="أدخل تعليمات البرومت لهذه المرحلة..."
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSave(stage.id)}
                          disabled={saving || !editForm.prompt.trim()}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          {saving ? (
                            <>
                              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              جاري الحفظ...
                            </>
                          ) : 'حفظ التغييرات'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 mr-12">
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 relative group">
                        {promptData?.prompt ? (
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                            {promptData.prompt}
                          </pre>
                        ) : (
                          <p className="text-sm text-gray-400 italic">لا يوجد برومت لهذه المرحلة</p>
                        )}
                      </div>
                      {promptData && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>آخر تحديث: {new Date(promptData.updatedAt).toLocaleDateString('ar-SA')}</span>
                          <span>{(promptData.prompt || '').length} حرف</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PromptManagement;
