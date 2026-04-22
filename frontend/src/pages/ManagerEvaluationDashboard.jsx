/**
 * Manager Evaluation Dashboard
 * Admin dashboard for viewing evaluation results
 */

import { useState, useEffect } from 'react';
import { getResults, getManagerResults, getTrends } from '../services/managerEvaluationService';
import Card from '../components/common/Card';

const ManagerEvaluationDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedManager, setSelectedManager] = useState(null);
  const [managerDetails, setManagerDetails] = useState(null);
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    if (selectedManager) {
      fetchManagerDetails(selectedManager._id);
      fetchTrends(selectedManager._id);
    }
  }, [selectedManager]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await getResults();
      if (response.success) {
        setResults(response.data?.results || []);
        setAvailablePeriods(response.data?.periods || []);
        if (!selectedPeriod && response.data?.period) {
          setSelectedPeriod(response.data.period);
        }
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagerDetails = async (managerId) => {
    try {
      const response = await getManagerResults(managerId, selectedPeriod);
      if (response.success && response.data?.detailedResults) {
        setManagerDetails(response.data);
      } else {
        setManagerDetails(null);
      }
    } catch (error) {
      console.error('Error fetching manager details:', error);
    }
  };

  const fetchTrends = async (managerId) => {
    try {
      const response = await getTrends(managerId);
      if (response.success) {
        setTrends(response.data?.trends || []);
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  const getScoreColor = (score) => {
    const s = parseFloat(score);
    if (s >= 4.5) return 'text-green-600 bg-green-100';
    if (s >= 3.5) return 'text-lime-600 bg-lime-100';
    if (s >= 2.5) return 'text-yellow-600 bg-yellow-100';
    if (s >= 1.5) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score) => {
    const s = parseFloat(score);
    if (s >= 4.5) return 'ممتاز';
    if (s >= 3.5) return 'جيد جداً';
    if (s >= 2.5) return 'مقبول';
    if (s >= 1.5) return 'ضعيف';
    return 'ضعيف جداً';
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
        <h2 className="text-2xl font-bold text-gray-800">تقارير تقييم المديرين</h2>
        {availablePeriods.length > 0 && (
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="p-2 border rounded-lg bg-white"
          >
            {availablePeriods.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-lg font-semibold mb-4">النتائج الإجمالية</h3>
            
            {results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-4">📊</p>
                <p>لا توجد نتائج كافية للعرض</p>
                <p className="text-sm mt-2">الحد الأدنى: 5 تقييمات</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((r, index) => (
                  <div
                    key={r.manager.id}
                    onClick={() => setSelectedManager(r.manager)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedManager?.id === r.manager.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800">{r.manager.name}</p>
                          <p className="text-sm text-gray-500">{r.manager.department}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className={`inline-block px-3 py-1 rounded-full text-lg font-bold ${getScoreColor(r.overallAverage)}`}>
                          {r.overallAverage}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {r.responseCount} تقييم
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <h3 className="text-lg font-semibold mb-4">تفاصيل التقييم</h3>
            
            {!selectedManager ? (
              <div className="text-center py-8 text-gray-500">
                <p>اختر مديراً لعرض التفاصيل</p>
              </div>
            ) : !managerDetails ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-4">🔒</p>
                <p>لا توجد بيانات كافية</p>
                <p className="text-sm mt-2">الحد الأدنى: 5 تقييمات</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">التقييم الإجمالي</p>
                  <p className={`text-4xl font-bold ${getScoreColor(managerDetails.overallAverage)}`}>
                    {managerDetails.overallAverage}
                  </p>
                  <p className="text-lg font-semibold text-gray-700">
                    {getScoreLabel(managerDetails.overallAverage)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    بناءً على {managerDetails.responseCount} تقييم
                  </p>
                </div>

                <div className="space-y-2">
                  {managerDetails.detailedResults?.map(d => (
                    <div key={d.questionId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700 flex-1">{d.questionAr}</span>
                      <span className={`px-2 py-1 rounded text-sm font-semibold ${getScoreColor(d.average)}`}>
                        {d.average}
                      </span>
                    </div>
                  ))}
                </div>

                {managerDetails.comments && managerDetails.comments.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">التعليقات</h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {managerDetails.comments.map((c, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded text-sm">
                          {c.strengths && (
                            <p className="text-green-700 mb-1">
                              <strong>✓</strong> {c.strengths}
                            </p>
                          )}
                          {c.improvements && (
                            <p className="text-orange-700">
                              <strong>→</strong> {c.improvements}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {selectedManager && trends.length > 0 && (
            <Card className="mt-6">
              <h3 className="text-lg font-semibold mb-4">التطور عبر الفترات</h3>
              <div className="flex items-end gap-2 h-32">
                {trends.map((t, i) => {
                  const max = Math.max(...trends.map(tr => parseFloat(tr.overallAverage)));
                  const height = (parseFloat(t.overallAverage) / 5) * 100;
                  return (
                    <div key={t.period} className="flex-1 flex flex-col items-center gap-1">
                      <div className="relative w-full flex items-end justify-center" style={{ height: '100px' }}>
                        <div
                          className="w-full bg-primary/30 rounded-t"
                          style={{ height: `${height}%` }}
                        >
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold">
                            {t.overallAverage}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{t.period}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerEvaluationDashboard;