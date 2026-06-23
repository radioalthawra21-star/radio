const PROVIDERS = [
  {
    name: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, ''),
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free',
  },
];

const resolveConfig = (model) => {
  for (const p of PROVIDERS) {
    if (!p.apiKey) continue;
    if (model && model === p.model) return p;
    if (!model && p.apiKey) return p;
  }
  for (const p of PROVIDERS) {
    if (p.apiKey) return p;
  }
  return PROVIDERS[0];
};

const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT) || 600000;

const executeWithFetch = async (systemPrompt, userText, model) => {
  const cfg = resolveConfig(model);
  const effectiveModel = model || cfg.model;
  const isGemini = cfg.baseUrl.includes('googleapis.com');

  const url = isGemini
    ? `${cfg.baseUrl}/chat/completions?key=${cfg.apiKey}`
    : `${cfg.baseUrl}/chat/completions`;

  const headers = { 'Content-Type': 'application/json' };
  if (!isGemini) {
    headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  }

  const controller = new AbortController();
  const timeoutMs = AI_TIMEOUT;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: effectiveModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText }
        ],
        temperature: 0.3,
        max_tokens: 4096,
      })
    });
  } catch (fetchErr) {
    clearTimeout(timer);
    if (fetchErr.name === 'AbortError') {
      throw new Error(`انتهت مهلة الاتصال بالذكاء الاصطناعي بعد ${timeoutMs / 1000} ثانية. النموذج كبير جداً أو الخادم بطيء.`);
    }
    throw new Error(`فشل الاتصال بخادم الذكاء الاصطناعي: ${fetchErr.message}`);
  }

  clearTimeout(timer);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
};

exports.processWithPrompt = async (systemPrompt, userText, model) => {
  const cfg = resolveConfig(model);
  if (!cfg.apiKey) {
    throw new Error('مفتاح API للذكاء الاصطناعي غير مضبوط في ملف .env');
  }
  return executeWithFetch(systemPrompt, userText, model);
};

exports.isAIConfigured = () => {
  return PROVIDERS.some(p => !!p.apiKey);
};

exports.fetchAvailableModels = async () => {
  const models = [];

  const orCfg = PROVIDERS.find(p => p.name === 'openrouter');
  if (orCfg && orCfg.apiKey && orCfg.model) {
    models.push({
      name: orCfg.model,
      provider: 'openrouter',
      size: null,
      details: {}
    });
  }

  return models;
};

exports.getAIConfig = () => {
  const configured = PROVIDERS.some(p => !!p.apiKey);
  const activeProvider = PROVIDERS.find(p => p.apiKey) || PROVIDERS[0];
  return {
    configured,
    model: activeProvider.model,
    baseUrl: activeProvider.baseUrl,
    models: [],
  };
};
