# تقرير Datadog AI Observability
## دليل شامل للمشاكل والحلول والتوصيات

**تاريخ الإنشاء:** 11 يوليو 2026  
**الإصدار:** 1.0

---

## جدول المحتويات

1. [نظرة عامة](#1-نظرة-عامة)
2. [المكونات الرئيسية](#2-المكونات-الرئيسية)
3. [المشاكل والأخطاء الشائعة](#3-المشاكل-والأخطاء-الشائعة)
4. [حلول المشاكل](#4-حلول-المشاكل)
5. [خطة التنفيذ المقترحة](#5-خطة-التنفيذ-المقترحة)
6. [التسعير والتكاليف](#6-التسعير-والتكاليف)
7. [المقارنات مع البدائل](#7-المقارنات-مع-البدائل)
8. [التوصيات النهائية](#8-التوصيات-النهائية)

---

## 1. نظرة عامة

Datadog AI Observability (المسمى حالياً **Agent Observability**) هو منصة متكاملة لمراقبة وتحسين تطبيقات الذكاء الاصطناعي ونماذج LLM في بيئة الإنتاج.

### الميزات الأساسية:
- **Trace كامل لكل طلب LLM** - تتبع spans للـ LLM calls, tool invocations, retrieval, agent decisions
- **ykفيات مدمجة** - Redaction تلقائي للبيانات الحساسية + كشف prompt injection
- **دعم واسع** - OpenAI, Anthropic, Gemini, Vertex, Bedrock, LangChain, CrewAI, Pydantic, Strands
- **SDKs متعددة** - Python, Node.js, Java + OpenTelemetry + HTTP API
- **Agent Observability** - تتبع الأخطاء, latency, token usage, cost per request
- **LLM Experiments** - A/B testing للم深化改革 والأداء
- **Datasets من production** - تحويل traces الحقيقية إلى مجموعات بيانات قابلة للاختبار
- **Built-in Evaluators** - فحص Hallucination, Prompt Injection, PII Exposure
- **GPU Monitoring** - مراقبة أداء وتكلفة وحدات معالجة الرسومات

---

## 2. المكونات الرئيسية

### 2.1 LLM Observability SDK
```
- dd-trace (Python/Node.js/Java)
- OpenTelemetry integration
- HTTP API for custom environments
- Auto-instrumentation for major frameworks
```

### 2.2 Evaluation System
```
- Built-in evaluators (Hallucination, Toxicity, Relevance)
- Custom evaluator support
- Human annotation and review
- A/B experiment framework
```

### 2.3 Monitoring & Alerting
```
- Real-time metrics (span counts, errors, tokens, latency)
- Anomaly detection via Watchdog AI
- Custom monitors and alerts
- SLO tracking
```

### 2.4 Security Features
```
- Automatic PII scanning and redaction
- Prompt injection detection
- Role-based access control
- Compliance controls (SOC 2, HIPAA, GDPR)
```

---

## 3. المشاكل والأخطاء الشائعة

### 3.1 مشاكل التكامل والـ SDK

#### الخطأ #1: Agent Unavailable Crash (Node.js)
**المشكلة:** dd-trace يسبب crash للـ Node.js process إذا Datadog Agent غير متاح
```
Error: Cannot send LLM Observability data without a running agent
or without both a Datadog API key and site.
```

**السبب:** المكتبة ترمي unhandled exception بدلاً من graceful degradation

**الحلول:**
1. تثبيت uncaughtException handler في أعلى التطبيق
2. استخدام try/catch حول LLMObs initialization
3. التحقق من توفر Agent قبل تفعيل LLM Observability
4. تحديث dd-trace إلى الإصدار الأحدث (5.82+)

---

#### الخطأ #2: Missing API Key Configuration
**المشكلة:** بيانات الاعتماد غير مُعدّة بشكل صحيح
```
Error: DD_API_KEY and DD_SITE must be configured
```

**الحلول:**
```bash
# تعيين المتغيرات البيئية
export DD_API_KEY="your-api-key"
export DD_SITE="datadoghq.com"  # أو datadoghq.eu للمنطقة الأوروبية
export DD_SERVICE="your-service-name"
export DD_ENV="production"
export DD_VERSION="1.0.0"
```

---

#### الخطأ #3: High Span Volume Performance Impact
**المشكلة:** كمية كبيرة من spans تؤثر على أداء التطبيق

**الحلول:**
1. استخدام Sampling مخصص لتقليل spans غير الضرورية
2. تطبيق filtered tracing لاستبعاد endpoints غير مهمة
3. ضبط `DD_TRACE_SAMPLE_RATE` للتحكم في نسبة العينات
4. استخدام annotation contexts بدلاً من per-span annotation

---

### 3.2 مشاكل التكلفة

#### المشكلة #4: تجاوز التكلفة المتوقعة
**المشكلة:** التكلفة تتصاعد بسرعة غير متوقعة بسبب:
- Custom metrics عالية الـ cardinality
- Volume كبير من spans
- Data retention طويل
- Logs كثيرة

**المؤشرات:**
- GUIDs, Job IDs, User IDs كـ custom metrics
- Unbounded values في tags
- Logs غير مفلترة

**الحلول:**
```yaml
# 1. تقليل Custom Metrics عالية Cardinality
# نقل المعرفات الفريدة إلى logs أو traces بدلاً من metrics

# 2. تطبيق Filtering على المصدر
DD_TRACE_SAMPLE_RATE: 0.1  # 10% sampling rate

# 3. تقليل Data Retention
DD_LLM_OBS_RETENTION_DAYS: 15  # الحد الأدنى

# 4. استخدام Cost Management features
# تعيين alerts للتنبيه عند 80% من الحد
```

---

#### المشكلة #5: عدم وضوح تسعير LLM Observability
**المشكلة:** التسعير مبني على span ingestion وليس سعراً ثابتاً

**هيكل التسعير الحالي:**
| الخطة | LLM Spans | التكلفة الشهرية |
|--------|-----------|-----------------|
| Free | 40K spans | $0 |
| Pro | 100K spans | $160 |
| إضافي | >100K spans | $0.002/span |

**الحلول:**
1. مراقبة Usage عبر Cost Management features
2. تعيين alerts قبل تجاوز الحد
3. استخدام Volume discounts (500+ hosts)
4. التفاوض على contracts سنوية

---

### 3.3 مشاكل الأداء

#### المشكلة #6: Latency Spikes في Traces
**المشكلة:** ارتفاع مفاجئ في زمن الاستجابة

**التشخيص:**
- استخدام p50/p75/p90/p95/p99 للتمييز بين طلب بطيء واحد وإبطاء حقيقي
- فحص Distribution buckets
- تتبع traces المرتبطة

**الحلول:**
1. تحسين token optimization في prompts
2. التحقق من infrastructure scaling (CPU, GPU, Memory)
3. فحص third-party API latency
4. استخدام cachingwhere appropriate

---

#### المشكلة #7: Missing Traces في Distributed Systems
**المشكلة:** بعض traces تظهر كـ orphaned spans

**الحلول:**
1. التأكد من正确 propagation للـ trace context عبر services
2. استخدام W3C Trace Context standard
3. فحص dd-trace configuration في كل service
4. استخدام Service Catalog لربط services ببعضها

---

### 3.4 مشاكل الأمان

#### المشكلة #8: Prompt Injection Not Detected
**المشكلة:** بعض هجمات prompt injection لا تُكتشف تلقائياً

**الحلول:**
1. تفعيل managed evaluations للمراقبة
2. إنشاء custom evaluators للحالات الخاصة
3. استخدام PII scanning بشكل شامل
4. مراجعة alert rules بشكل دوري

---

#### المشكلة #9: Sensitive Data Exposure
**المشكلة:** بيانات حساسة تظهر في traces

**الحلول:**
```python
# تفعيل automatic redaction
from ddtrace.llmobs import LLMObs

LLMObs.enable(
    redact_pii=True,
    redact_pii_entities=["EMAIL", "PHONE", "SSN", "CREDIT_CARD"]
)

# أو استخدام manual redaction
LLMObs.annotate(
    tags={"user_input": "[REDACTED]"}
)
```

---

### 3.5 مشاكل التكامل مع الأطر

#### المشكلة #10: Lack of Native Framework Support
**المشكلة:** بعض الأطر (مثل LangChain, CrewAI) قد تحتاج تهيئة يدوية

**الحلول:**
```python
# Python - Auto-instrumentation
import ddtrace
ddtrace.patch_all()

# أو تهيئة يدوية
from ddtrace.llmobs import LLMObs

LLMObs.enable(
    ml_app="my-llm-app",
    integrations=["openai", "anthropic", "langchain"]
)
```

```javascript
// Node.js - Auto-instrumentation
require('dd-trace').init({
  llmobs: {
    mlAppName: 'my-llm-app',
    integrations: ['openai', 'anthropic']
  }
})
```

---

### 3.6 مشاكل GPU Monitoring

#### المشكلة #11: Inaccurate GPU Utilization Metrics
**المشكلة:** قياس غير دقيق لاستخدام GPU

**الحلول:**
1. التأكد من تثبيت NVIDIA monitoring tools
2. فحص DCGM (Data Center GPU Manager) integration
3. مراجعة GPU metrics في Fleet page
4. التحقق من pod scheduling وresource allocation

---

#### المشكلة #12: Zombie GPU Processes
**المشكلة:** عمليات GPU عالقة تستهلك موارد دون فائدة

**الحلول:**
```bash
# رصد العمليات العالقة
nvidia-smi --query-compute-apps=pid,name,used_memory --format=csv

# إنهاء العمليات العالقة
kill -9 <PID>

# منع المشكلة مستقبلاً باستخدام GPU Monitoring alerts
```

---

## 4. حلول المشاكل

### 4.1 حلول التكامل

#### التكامل مع Python Applications
```python
# 1. تثبيت المكتبات
# pip install ddtrace

# 2. تهيئة DDTrace
import ddtrace
from ddtrace.llmobs import LLMObs

ddtrace.patch_all()

LLMObs.enable(
    ml_app="my-production-app",
    integrations=["openai", "anthropic", "langchain"],
    redact_pii=True,
    site="datadoghq.com"
)

# 3. استخدام decorators
@LLMObs.llm(model_name="gpt-4", model_provider="openai")
def my_llm_function(prompt):
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content
```

#### التكامل مع Node.js Applications
```javascript
// 1. تهيئة dd-trace
const tracer = require('dd-trace').init({
  llmobs: {
    mlAppName: 'my-production-app',
    integrations: ['openai', 'anthropic']
  }
});

// 2. استخدام LLMObs
const { LLMObs } = require('ddtrace').llmobs;

async function myLLMFunction(prompt) {
  return LLMObs.trace(
    async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }]
      });
      return response.choices[0].message.content;
    },
    { kind: 'llm', modelName: 'gpt-4', modelProvider: 'openai' }
  );
}
```

#### التكامل مع OpenTelemetry
```python
# للبيئات التي تستخدم OpenTelemetry
from opentelemetry.sdk.trace import TracerProvider
from ddtrace.llmobs import LLMObs

# إعداد OTel provider
provider = TracerProvider()
LLMObs.enable(
    ml_app="my-otel-app",
    tracer_provider=provider
)
```

---

### 4.2 حلول التكلفة

#### استراتيجية لتقليل التكلفة
```yaml
# 1. Sampling Strategy
DD_TRACE_SAMPLE_RATE: 0.1  # 10% for production
DD_TRACE_SAMPLE_RATE_DEBUG: 0.01  # 1% for debug

# 2. Retention Policy
DD_LLM_OBS_RETENTION_DAYS: 15  # الحد الأدنى

# 3. Custom Metrics Filtering
DD_CUSTOM_METRICS_AGGREGATION_KEY: "team,service,environment"

# 4. Cost Alerts
# إعداد alerts في Datadog dashboard:
# - Warning at 80% of monthly limit
# - Critical at 95% of monthly limit
```

#### مراقبة التكلفة
```python
# استخدام cost_tags لتتبع التكلفة لكل فريق
LLMObs.annotate(
    metrics={
        "input_tokens": 50,
        "output_tokens": 120,
        "total_tokens": 170
    },
    tags={
        "team": "nlp",
        "customer_tier": "enterprise",
        "cost_center": "ai-research"
    },
    cost_tags=["team", "cost_center"]
)
```

---

### 4.3 حلول الأمان

#### تطبيق PII Protection
```python
from ddtrace.llmobs import LLMObs

# تفعيل الحماية التلقائية
LLMObs.enable(
    redact_pii=True,
    redact_pii_entities=[
        "EMAIL", "PHONE", "SSN", 
        "CREDIT_CARD", "IP_ADDRESS"
    ],
    custom_redaction_patterns=[
        r'\b\d{3}-\d{2}-\d{4}\b',  # SSN pattern
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'  # Email
    ]
)
```

#### مراقبة Prompt Injection
```python
# إعداد مراقبة الهجمات
LLMObs.evaluate(
    span,
    evaluators=["prompt_injection", "toxicity", "relevance"],
    metadata={"security_level": "high"}
)

# إعداد alerts للهجمات
# في Datadog Dashboard:
# Monitor > New Monitor > APM > LLM Observability
# Type: Anomaly Detection
# Metric: ml_obs.span.evaluations.prompt_injection
# Alert when: > 0
```

---

## 5. خطة التنفيذ المقترحة

### المرحلة 1: التأسيس (الأسبوع 1-2)
```markdown
- [ ] إنشاء حساب Datadog (Free tier للتجربة)
- [ ] تثبيت Datadog Agent على servers
- [ ] تهيئة dd-trace في applications
- [ ] اختبار basic tracing
- [ ] إعداد first dashboard
```

### المرحلة 2: التكامل الأساسي (الأسبوع 3-4)
```markdown
- [ ] تفعيل LLM Observability SDK
- [ ] إعداد auto-instrumentation للـ LLM calls
- [ ] تطبيق PII redaction
- [ ] إعداد basic monitors و alerts
- [ ] اختبار على staging environment
```

### المرحلة 3: التوسع (الأسبوع 5-8)
```markdown
- [ ] نشر على production
- [ ] إعداد custom evaluators
- [ ] تطبيق cost tracking و alerts
- [ ] إعداد SLOs للأداء
- [ ] تدريب الفريق على الأداة
```

### المرحلة 4: التحسين المستمر (مستمر)
```markdown
- [ ] مراجعة metrics أسبوعياً
- [ ] تحسين sampling strategy
- [ ] تحديث evaluators حسب الحاجة
- [ ] مراجعة التكلفة شهرياً
- [ ] تحديث documentation
```

---

## 6. التسعير والتكاليف

### التسعير الحالي (2026)

| المنتج | وحدة الفوترة | الفوترة السنوية | الفوترة الشهرية | الفوترة عند الطلب |
|--------|-------------|----------------|-----------------|-------------------|
| Infrastructure Pro | per host | $15/host | $18/host | $18/host |
| Infrastructure Enterprise | per host | $23/host | $27/host | $27/host |
| APM | per host | $31/host | $35/host | $35/host |
| **Agent Observability (LLM)** | **per LLM spans** | **$160/mo (100K)** | **$192/mo** | **$0.002/span** |

### ملاحظات التسعير:
1. **Free Tier**: حتى 40K spans/شهر مجاناً
2. **Pro Plan**: يبدأ من $160/شهر مع 100K spans
3. **Data Retention**: 15 يوم (Free/Pro), إضافات حتى 90 يوم
4. **Evaluations**: مجاناً بدون رسوم إضافية
5. **Volume Discounts**: متاحة للعقود الكبيرة (500+ hosts)
6. **Median Contract**: $152,340/سنة (بناءً على 1,023 عقد)

---

## 7. المقارنات مع البدائل

| الميزة | Datadog LLM Obs | LangSmith | Helicone | Arize AI |
|--------|-----------------|-----------|----------|----------|
| **Trace Length** | كامل | كامل | كامل | كامل |
| **Evaluations** | مدمجة + مخصصة | محدودة | محدودة | محدودة |
| **Prompt Injection** | ✓ | ✗ | ✗ | ✗ |
| **PII Redaction** | ✓ | ✗ | ✗ | ✗ |
| **GPU Monitoring** | ✓ | ✗ | ✗ | ✗ |
| **Cost Tracking** | ✓ | ✓ | ✓ | ✓ |
| **Free Tier** | 40K spans | محدود | محدود | محدود |
| **السعر الشهري** | $160+ | $0-399 | $0-200 | $0-500 |

### متى تختار Datadog؟
- ✅ تطبيق **enterprise-grade** مع compliance مطلوب
- ✅ تحتاج **unified platform** (Infrastructure + APM + LLM)
- ✅ تريد **GPU Monitoring** مدمج
- ✅ تريد **prompt injection detection** و **PII redaction**
- ❌ ميزانية محدودة جداً
- ❌ تطبيق صغير مع few LLM calls

---

## 8. التوصيات النهائية

### التوصيات التقنية:
1. **ابدأ بـ Free tier** لتجربة الميزات الأساسية
2. **استخدم auto-instrumentation** لتقليل Effort
3. **فعّل PII redaction** من اليوم الأول
4. **إعداد cost alerts** لتجنب المفاجآت
5. **استخدم sampling** بذكاء لتقليل التكلفة

### التوصيات التشغيلية:
1. **مراجعة metrics** أسبوعياً
2. **تحديث evaluators** حسب تطور التطبيق
3. **تدريب الفريق** على استخدام Dashboards
4. **توثيق** Procedures و Runbooks
5. **مراجعة التكلفة** شهرياً مع Finance team

### التوصيات الأمنية:
1. **تفعيل managed evaluations** للمراقبة
2. **إعداد alerts** للهجمات
3. **مراجعة** Security settings بشكل دوري
4. **تطبيق** Least privilege access
5. **توثيق** Incidents و Response plans

---

## مراجع رسمية

- [Datadog LLM Observability Docs](https://docs.datadoghq.com/llm_observability)
- [Agent Observability SDK Reference](https://docs.datadoghq.com/llm_observability/instrumentation/sdk)
- [Datadog Pricing](https://www.datadoghq.com/pricing/)
- [GPU Monitoring Docs](https://docs.datadoghq.com/gpu_monitoring/)
- [GitHub Issue #7370](https://github.com/DataDog/dd-trace-js/issues/7370)

---

**ملاحظة:** هذا التقرير مبني على معلومات متوفرة حتى يوليو 2026. يُنصح بمراجعة الوثائق الرسمية Datadog للحصول على أحدث المعلومات.
