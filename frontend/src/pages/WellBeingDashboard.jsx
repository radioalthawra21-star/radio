/**
 * Well-Being Dashboard
 * HR and management dashboard for employee well-being insights
 */

import { useState, useEffect } from 'react';
import { getWellBeingStats, getWellBeingTrends, getBurnoutRisk } from '../services/wellBeingService';
import Card from '../components/common/Card';

const WellBeingDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [burnout, setBurnout] = useState(null);
  const [selectedDays, setSelectedDays] = useState(7);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, trendsRes, burnoutRes] = await Promise.all([
        getWellBeingStats(),
        getWellBeingTrends(selectedDays),
        getBurnoutRisk()
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (trendsRes.success) setTrends(trendsRes.data?.trendData || []);
      if (burnoutRes.success) setBurnout(burnoutRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (score) => {
    if (score >= 4.5) return '😃';
    if (score >= 3.5) return '🙂';
    if (score >= 2.5) return '😐';
    if (score >= 1.5) return '🙁';
    return '😞';
  };

  const getMoodColor = (score) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-lime-600';
    if (score >= 2.5) return 'text-yellow-600';
    if (score >= 1.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskBadge = (level) => {
    const badges = {
      low: { text: 'منخفض', bg: 'bg-green-100 text-green-700' },
      medium: { text: 'متوسط', bg: 'bg-yellow-100 text-yellow-700' },
      high: { text: 'مرتفع', bg: 'bg-red-100 text-red-700' },
      unknown: { text: 'غير معروف', bg: 'bg-gray-100 text-gray-700' }
    };
    return badges[level] || badges.unknown;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800"> تقارير الحالة اليومية</h2>
        <select
          value={selectedDays}
          onChange={(e) => {
            setSelectedDays(parseInt(e.target.value));
            fetchData();
          }}
          className="p-2 border rounded-lg bg-white"
        >
          <option value={7}>أسبوع</option>
          <option value={14}>أسبوعين</option>
          <option value={30}>شهر</option>
        </select>
      </div>

      {stats?.message && (
        <Card className="mb-6">
          <div className="text-center py-8">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-lg text-gray-600">{stats.message}</p>
          </div>
        </Card>
      )}

      {stats && !stats.message && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="text-center">
              <p className="text-sm text-gray-500 mb-2">متوسط المزاج</p>
              <div className="text-4xl mb-1">{getMoodEmoji(stats.avgMood)}</div>
              <p className={`text-2xl font-bold ${getMoodColor(stats.avgMood)}`}>
                {stats.avgMood}
              </p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500 mb-2">عدد المشاركين</p>
              <p className="text-3xl font-bold text-primary">{stats.responseCount}</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500 mb-2">يحتاجون دعم</p>
              <p className="text-3xl font-bold text-red-600">{stats.supportPercentage}%</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500 mb-2">مستوى المخاطر</p>
              <span className={`inline-block px-4 py-2 rounded-full font-semibold ${getRiskBadge(burnout?.level).bg}`}>
                {getRiskBadge(burnout?.level).text}
              </span>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <h3 className="text-lg font-semibold mb-4">توزيع المزاج</h3>
              <div className="space-y-3">
                {[
                  { label: 'ممتاز', count: stats.moodDistribution?.excellent || 0, color: 'bg-green-500' },
                  { label: 'جيد', count: stats.moodDistribution?.good || 0, color: 'bg-lime-500' },
                  { label: 'محايد', count: stats.moodDistribution?.neutral || 0, color: 'bg-yellow-500' },
                  { label: 'متوتر', count: stats.moodDistribution?.stressed || 0, color: 'bg-orange-500' },
                  { label: 'متوتر جداً', count: stats.moodDistribution?.veryStressed || 0, color: 'bg-red-500' }
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-600">{item.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full flex items-center justify-end pr-2`}
                        style={{ width: `${(item.count / stats.responseCount) * 100}%` }}
                      >
                        <span className="text-white text-xs font-bold">{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-4">توزيع عبء العمل</h3>
              <div className="space-y-3">
                {[
                  { label: 'كثيرة جداً', count: stats.workloadDistribution?.tooHeavy || 0, color: 'bg-red-500' },
                  { label: 'طبيعية', count: stats.workloadDistribution?.normal || 0, color: 'bg-green-500' },
                  { label: 'قليلة', count: stats.workloadDistribution?.light || 0, color: 'bg-blue-500' }
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-600">{item.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full flex items-center justify-end pr-2`}
                        style={{ width: `${(item.count / stats.responseCount) * 100}%` }}
                      >
                        <span className="text-white text-xs font-bold">{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-4">الاتجاه الأسبوعي</h3>
            <div className="flex items-end gap-2 h-40">
              {trends.map((day, i) => {
                const height = day.avgMood ? (day.avgMood / 5) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center h-32">
                      <div
                        className={`w-full rounded-t transition-all ${day.avgMood ? 'bg-primary/40' : 'bg-gray-200'}`}
                        style={{ height: `${height}%` }}
                      >
                        {day.avgMood && (
                          <span className="absolute top-0 left-1/2 -translate-x-1/2 text-xs font-bold">
                            {day.avgMood}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{day.date?.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {stats.comments && stats.comments.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">التعليقات ({stats.comments.length})</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {stats.comments.map((c, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {c}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default WellBeingDashboard;