import { useState, useEffect } from 'react';
import { processPipeline, checkAIConfig } from '../../services/editorialPipelineService';

const STAGES = [
  { id: 1, name: 'تحسين البداية', desc: 'Lead Optimization - إعادة صياغة الفقرة الأولى' },
  { id: 2, name: 'التدقيق اللغوي والتحريري', desc: 'تصحيح الأخطاء وتحسين التراكيب' },
  { id: 3, name: 'ضبط النبرة والحزم', desc: 'نبرة رسمية مباشرة وجادة' },
  { id: 4, name: 'اللمسة الإنسانية المهنية', desc: 'تحسين السلاسة وإبراز الأثر' },
  { id: 5, name: 'فحص منع الإضافة', desc: 'التحقق من عدم إضافة معلومات' },
  { id: 6, name: 'الهوية التحريرية النهائية', desc: 'تنسيق النهائي بثلاث فقرات' },
];

const EditorialPipeline = () => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stages, setStages] = useState(null);
  const [finalText, setFinalText] = useState('');
  const [activeTab, setActiveTab] = useState(null);
  const [error, setError] = useState('');
  const [showPrompt, setShowPrompt] = useState({});
  const [mode, setMode] = useState('regex');
  const [aiConfigured, setAiConfigured] = useState(false);

  useEffect(() => {
    checkAIConfig().then(res => {
      if (res.success) setAiConfigured(res.data.configured);
    }).catch(() => {});
  }, []);

  const handleProcess = async () => {
    if (!inputText.trim()) {
      setError('الرجاء إدخال النص المطلوب معالجته');
      return;
    }
    setError('');
    setIsProcessing(true);
    setStages(null);
    setFinalText('');
    setActiveTab(null);

    try {
      const response = await processPipeline(inputText, mode);
      if (response.success) {
        setStages(response.data.stages);
        setFinalText(response.data.finalText);
        setActiveTab(6);
      } else {
        setError(response.message || 'حدث خطأ أثناء المعالجة');
      }
    } catch (err) {
      setError(err.userMessage || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">تحرير النصوص</h1>
        <p className="text-gray-500 text-sm">AI Editorial Pipeline - معالجة النصوص الإخبارية عبر 6 مراحل تحريرية</p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setMode('regex')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'regex'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          معالجة بالقواعد
        </button>
        <button
          onClick={() => setMode('ai')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'ai'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          معالجة بالذكاء الاصطناعي {aiConfigured ? '🧠' : '⚠️'}
        </button>
        {mode === 'ai' && !aiConfigured && (
          <span className="text-xs text-orange-500">(ضبط مفتاح API في .env)</span>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          النص الإخباري
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="الصق النص الإخباري هنا..."
          className="w-full h-48 p-4 border border-gray-200 rounded-lg resize-y focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-800 placeholder-gray-400"
          dir="rtl"
        />
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
        <button
          onClick={handleProcess}
          disabled={isProcessing || !inputText.trim()}
          className="mt-4 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              جاري المعالجة...
            </span>
          ) : 'تشغيل المسار التحريري'}
        </button>
      </div>

      {stages && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-bold text-gray-700 mb-3">مراحل التحرير</h2>
              <div className="space-y-2">
                {STAGES.map((s) => {
                  const stageData = stages.find(st => st.stage === s.id);
                  const isComplete = stageData && stageData.text;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveTab(s.id)}
                      className={`w-full text-right p-3 rounded-lg transition-all duration-150 ${
                        activeTab === s.id
                          ? 'bg-primary/10 border border-primary/30 text-primary'
                          : 'hover:bg-gray-50 border border-transparent text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          isComplete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isComplete ? '✓' : s.id}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${activeTab === s.id ? 'text-primary/70' : 'text-gray-400'}`}>
                        {s.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              {activeTab && (() => {
                const stageData = stages.find(s => s.stage === activeTab);
                if (!stageData) return null;
                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          المرحلة {activeTab}: {STAGES[activeTab - 1].name}
                        </h3>
                        <p className="text-sm text-gray-500">{STAGES[activeTab - 1].desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {stageData.prompt && (
                          <button
                            onClick={() => setShowPrompt(prev => ({ ...prev, [activeTab]: !prev[activeTab] }))}
                            className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                          >
                            {showPrompt[activeTab] ? 'إخفاء البرومت' : 'عرض البرومت'}
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(stageData.text)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="نسخ"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {showPrompt[activeTab] && stageData.prompt && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-xs font-medium text-blue-700 mb-1">البرومت المستخدم:</p>
                        <p className="text-xs text-blue-600 leading-relaxed whitespace-pre-wrap">{stageData.prompt}</p>
                      </div>
                    )}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 min-h-[200px]">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {stageData.text || 'لم يتم إنتاج نص في هذه المرحلة'}
                      </pre>
                    </div>
                    {activeTab === 5 && stageData.checkResult && !stageData.checkResult.passed && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-700 font-medium">تحذير: تم العثور على معلومات إضافية</p>
                        {stageData.checkResult.issues.map((issue, i) => (
                          <p key={i} className="text-xs text-yellow-600 mt-1">{issue}</p>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {finalText && (
              <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-green-800">النص النهائي</h3>
                    <p className="text-sm text-green-600">بعد الهوية التحريرية النهائية</p>
                  </div>
                  <button
                    onClick={() => handleCopy(finalText)}
                    className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium border border-green-200"
                  >
                    نسخ النص النهائي
                  </button>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {finalText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorialPipeline;
