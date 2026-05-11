import React, { useState, useEffect, useMemo, useRef } from 'react';

export default function VisitorMonitor() {
  const [totalVisitors, setTotalVisitors] = useState(() => {
    return parseInt(localStorage.getItem('totalVisitors') || '0', 10);
  });
  const [activeVisitors, setActiveVisitors] = useState(0);
  const hasIncrementedRef = useRef(false);

  // توليد بيانات الرسم البياني مرة واحدة (ثابتة عبر re-renders)
  const chartData = useMemo(
    () => Array.from({ length: 12 }, () => Math.floor(Math.random() * 80) + 20),
    []
  );

  useEffect(() => {
    // منع الزيادة المتكررة بسبب StrictMode أو re-renders
    if (hasIncrementedRef.current) return;
    hasIncrementedRef.current = true;

    setTotalVisitors((prev) => {
      const newTotal = prev + 1;
      localStorage.setItem('totalVisitors', newTotal.toString());
      return newTotal;
    });

    const interval = setInterval(() => {
      setActiveVisitors(Math.floor(Math.random() * 50) + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div dir="rtl" className="p-5 bg-[#E3D4BE] rounded-xl border border-[#CD6F13] shadow-md">
      <h3 className="text-[#182E4E] font-bold text-xl mb-6 flex items-center gap-2">
        <span className="w-2 h-6 bg-[#1C95A4] rounded-full" aria-hidden="true"></span>
        مراقبة الزوار
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          label="إجمالي الزوار"
          value={totalVisitors.toString().padStart(6, '0')}
          valueColor="text-[#182E4E]"
        />
        <div className="p-4 bg-white/70 rounded-lg border border-[#CD6F13]/30">
          <div className="text-sm text-[#182E4E]/70 mb-1">الزوار النشطون الآن</div>
          <div className="text-3xl font-bold text-[#1C95A4] font-mono">
            {activeVisitors.toString().padStart(3, '0')}
          </div>
          <div
            className="mt-2 w-full bg-gray-200 rounded-full h-2"
            role="progressbar"
            aria-valuenow={activeVisitors}
            aria-valuemin={0}
            aria-valuemax={50}
          >
            <div
              className="bg-[#1C95A4] h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(activeVisitors * 2, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-white/70 rounded-lg border border-[#CD6F13]/30">
        <div className="text-sm text-[#182E4E]/70 mb-3">نشاط الزوار آخر ساعة (محاكاة)</div>
        <div className="flex items-end justify-between h-24 gap-1">
          {chartData.map((height, i) => (
            <div
              key={i}
              className="bg-[#CD6F13]/60 hover:bg-[#CD6F13] transition-colors rounded-t flex-1"
              style={{ height: `${height}%` }}
              title={`الفترة ${i + 1}: ${height}%`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, valueColor }) {
  return (
    <div className="p-4 bg-white/70 rounded-lg border border-[#CD6F13]/30">
      <div className="text-sm text-[#182E4E]/70 mb-1">{label}</div>
      <div className={`text-3xl font-bold font-mono ${valueColor}`}>{value}</div>
    </div>
  );
}