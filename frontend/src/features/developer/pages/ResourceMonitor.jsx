import React, { useState, useEffect, useCallback } from 'react';

const THRESHOLDS = {
  cpu: { warn: 50, danger: 80, max: 100, unit: '%' },
  memory: { warn: 250, danger: 400, max: 512, unit: 'MB' },
  latency: { warn: 80, danger: 150, max: 200, unit: 'ms' },
};

export default function ResourceMonitor() {
  const [metrics, setMetrics] = useState({ cpu: 0, memory: 0, latency: 0 });

  // استخدام Performance API الحقيقي للذاكرة عند الإمكان
  const readRealMemory = useCallback(() => {
    if (performance?.memory?.usedJSHeapSize) {
      return Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
    }
    return Math.floor(Math.random() * 300) + 100;
  }, []);

  useEffect(() => {
    const update = () => {
      setMetrics({
        cpu: Math.floor(Math.random() * 40) + 10,
        memory: readRealMemory(),
        latency: Math.floor(Math.random() * 100) + 20,
      });
    };

    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, [readRealMemory]);

  return (
    <div dir="rtl" className="p-5 bg-[#E3D4BE] rounded-xl border border-[#CD6F13] shadow-md">
      <h3 className="text-[#182E4E] font-bold text-xl mb-6 flex items-center gap-2">
        <span className="w-2 h-6 bg-[#1C95A4] rounded-full" aria-hidden="true"></span>
        مراقبة الموارد
      </h3>

      <div className="space-y-4">
        <MetricBar label="استخدام المعالج" value={metrics.cpu} config={THRESHOLDS.cpu} pad={3} />
        <MetricBar label="استخدام الذاكرة" value={metrics.memory} config={THRESHOLDS.memory} pad={4} />
        <MetricBar label="زمن الاستجابة الشبكي" value={metrics.latency} config={THRESHOLDS.latency} pad={3} />
      </div>
    </div>
  );
}

function MetricBar({ label, value, config, pad }) {
  const { warn, danger, max, unit } = config;
  const percent = Math.min((value / max) * 100, 100);

  const barColor =
    value > danger ? 'bg-red-500' : value > warn ? 'bg-yellow-500' : 'bg-green-500';
  const textColor =
    value > danger ? 'text-red-600' : value > warn ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="p-4 bg-white/70 rounded-lg border border-[#CD6F13]/30">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-[#182E4E]/70">{label}</span>
        <span className={`font-mono font-bold ${textColor}`}>
          {value.toString().padStart(pad, '0')} {unit}
        </span>
      </div>
      <div
        className="w-full bg-gray-200 rounded-full h-3"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}