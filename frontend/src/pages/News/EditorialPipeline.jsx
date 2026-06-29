import { useState, useEffect } from 'react';
import { runSingleStage, checkAIConfig, getAIModels } from '../../services/editorialPipelineService';

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
  const [currentText, setCurrentText] = useState('');
  const [results, setResults] = useState({});
  const [processingStage, setProcessingStage] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('regex');
  const [aiConfigured, setAiConfigured] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    checkAIConfig().then(res => {
      if (res.success) setAiConfigured(res.data.configured);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === 'ai' && availableModels.length === 0 && !loadingModels) {
      setLoadingModels(true);
      getAIModels().then(res => {
        if (res.success && Array.isArray(res.data)) {
          setAvailableModels(res.data);
          if (res.data.length > 0 && !selectedModel) {
            setSelectedModel(res.data[0].name);
          }
        }
      }).catch(() => {}).finally(() => setLoadingModels(false));
    }
  }, [mode]);

  const handleRunStage = async (stage) => {
    const textToProcess = stage === 1 ? inputText : results[stage - 1]?.text || currentText;
    if (!textToProcess.trim()) {
      setError('لا يوجد نص للمعالجة');
      return;
    }
    setError('');
    setProcessingStage(stage);
    try {
      const response = await runSingleStage(textToProcess, stage, mode, mode === 'ai' ? selectedModel : null);
      if (response.success) {
        const stageResult = { text: response.data.text, prompt: response.data.prompt || '' };
        setResults(prev => ({ ...prev, [stage]: stageResult }));
        setCurrentText(response.data.text);
      } else {
        setError(response.message || 'حدث خطأ');
      }
    } catch (err) {
      setError(err.userMessage || 'حدث خطأ في الاتصال');
    } finally {
      setProcessingStage(null);
    }
  };

  const handleRunAll = async () => {
    if (!inputText.trim()) {
      setError('لا يوجد نص للمعالجة');
      return;
    }
    setError('');
    setResults({});
    setCurrentText('');
    setRunningAll(true);

    let current = inputText;
    for (let i = 1; i <= 6; i++) {
      if (!current.trim()) break;
      setProcessingStage(i);
      try {
        const response = await runSingleStage(current, i, mode, mode === 'ai' ? selectedModel : null);
        if (response.success) {
          const stageResult = { text: response.data.text, prompt: response.data.prompt || '' };
          setResults(prev => ({ ...prev, [i]: stageResult }));
          setCurrentText(response.data.text);
          current = response.data.text;
        } else {
          setError(`المرحلة ${i}: ${response.message || 'حدث خطأ'}`);
          break;
        }
      } catch (err) {
        setError(`المرحلة ${i}: ${err.userMessage || 'حدث خطأ في الاتصال'}`);
        break;
      } finally {
        setProcessingStage(null);
      }
    }
    setRunningAll(false);
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const isStageEnabled = (stage) => {
    if (processingStage || runningAll) return false;
    if (results[stage]) return false;
    if (stage === 1) return inputText.trim().length > 0;
    return !!results[stage - 1];
  };

  const isStageDone = (stage) => !!results[stage];

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">تحرير النصوص</h1>
        <p className="text-gray-500 text-sm">AI Editorial Pipeline - معالجة النصوص الإخبارية مرحلة بمرحلة</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setMode('regex')}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
            mode === 'regex'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          معالجة بالقواعد
        </button>
        <button
          onClick={() => setMode('ai')}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
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

      {mode === 'ai' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            نموذج الذكاء الاصطناعي
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 bg-white"
            dir="ltr"
          >
            {loadingModels ? (
              <option>جاري تحميل النماذج...</option>
            ) : availableModels.length === 0 ? (
              <option value="">لا توجد نماذج متوفرة</option>
            ) : (
              availableModels.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))
            )}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          النص الإخباري
        </label>
        <textarea
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setResults({});
            setCurrentText('');
          }}
          placeholder="الصق النص الإخباري هنا..."
          className="w-full h-48 p-4 border border-gray-200 rounded-lg resize-y focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-800 placeholder-gray-400"
          dir="rtl"
        />
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* Run All Button */}
      <div className="mb-6">
        <button
          onClick={handleRunAll}
          disabled={!inputText.trim() || runningAll || !!processingStage}
          className={`w-full px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 min-h-[48px] ${
            runningAll
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : inputText.trim() && !processingStage
                ? 'bg-purple-600 text-white shadow-sm hover:bg-purple-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          {runningAll ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              جاري معالجة جميع المراحل...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              تشغيل جميع المراحل دفعة واحدة
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {STAGES.map((s) => {
          const done = isStageDone(s.id);
          const enabled = isStageEnabled(s.id);
          const processing = processingStage === s.id;
          const stageResult = results[s.id];
          const isNext = !done && enabled && !processing;

          return (
            <div
              key={s.id}
              className={`bg-white rounded-xl shadow-sm border p-5 transition-all ${
                done ? 'border-green-200' : isNext ? 'border-primary/30' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className={`text-base font-bold ${done ? 'text-green-700' : 'text-gray-900'}`}>
                    <span className="ml-2">{done ? '✓' : s.id}</span>
                    {s.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
                <button
                  onClick={() => handleRunStage(s.id)}
                  disabled={!enabled || processing}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap min-h-[44px] ${
            done
              ? 'bg-green-50 text-green-600 border border-green-200'
              : enabled && !processing
                ? 'bg-primary text-white shadow-sm hover:bg-primary-dark'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      جاري المعالجة...
                    </span>
                  ) : done ? 'تمت ✓' : `تشغيل المرحلة ${s.id}`}
                </button>
              </div>

              {done && stageResult && (
                <div className="relative">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 min-h-[100px]">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {stageResult.text}
                    </pre>
                  </div>
                  <button
                    onClick={() => handleCopy(stageResult.text)}
                    className="absolute top-2 left-2 p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px]"
                    title="نسخ"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                  {stageResult.prompt && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">عرض البرومت</summary>
                      <p className="text-xs text-blue-600 mt-1 p-2 bg-blue-50 rounded">{stageResult.prompt}</p>
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {results[6] && (
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-green-800">النص النهائي</h3>
              <p className="text-sm text-green-600">بعد الهوية التحريرية النهائية</p>
            </div>
            <button
              onClick={() => handleCopy(results[6].text)}
              className="px-4 py-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium border border-green-200 min-h-[44px]"
            >
              نسخ النص النهائي
            </button>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
              {results[6].text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorialPipeline;
