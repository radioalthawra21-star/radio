import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';

const WEIGHTS_KEY = 'evaluationWeights';

const DEFAULT_WEIGHTS = {
  taskCompletion: 25,
  quality: 25,
  teamwork: 15,
  initiative: 15,
  adherence: 20
};

const WEIGHT_RANGES = {
  taskCompletion: { min: 0, max: 40, label: 'إكمال المهام' },
  quality: { min: 0, max: 40, label: 'جودة العمل' },
  teamwork: { min: 0, max: 20, label: 'العمل الجماعي' },
  initiative: { min: 0, max: 20, label: 'المبادرة' },
  adherence: { min: 0, max: 30, label: 'الالتزام' }
};

const Settings = () => {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(WEIGHTS_KEY);
    if (stored) {
      try {
        setWeights(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading weights:', e);
      }
    }
  }, []);

  const handleWeightChange = (key, value) => {
    setWeights(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
    setSaved(false);
  };

  const getTotalWeight = () => {
    return Object.values(weights).reduce((sum, val) => sum + val, 0);
  };

  const handleSave = () => {
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من إعادة تعيين الأوزان الافتراضية؟')) {
      setWeights(DEFAULT_WEIGHTS);
      localStorage.removeItem(WEIGHTS_KEY);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const totalWeight = getTotalWeight();

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-8">أوزان التقييم</h1>

      {saved && (
        <div className="bg-success/10 border border-success text-success p-3 rounded-lg mb-4">
          تم حفظ الأوزان بنجاح
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-bold text-dark mb-6">توزيع الأوزان</h2>
          <div className="space-y-6">
            {Object.entries(WEIGHT_RANGES).map(([key, config]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-700 font-medium">{config.label}</label>
                  <span className="text-primary font-bold">{weights[key]}%</span>
                </div>
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  value={weights[key]}
                  onChange={(e) => handleWeightChange(key, e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{config.min}</span>
                  <span>{config.max}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-dark mb-6">ملخص التوزيع</h2>
          <div className="space-y-4">
            {Object.entries(WEIGHT_RANGES).map(([key, config]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{config.label}</span>
                <span className="font-bold text-primary">{weights[key]}%</span>
              </div>
            ))}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                <span className="font-bold text-lg">المجموع</span>
                <span className={`font-bold text-lg ${totalWeight === 100 ? 'text-success' : 'text-red-500'}`}>
                  {totalWeight}%
                </span>
              </div>
              {totalWeight !== 100 && (
                <p className="text-red-500 text-sm mt-2">يجب أن يساوي المجموع 100%</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 mt-8">
        <button onClick={handleSave} className="btn btn-primary">
          حفظ الأوزان
        </button>
        <button onClick={handleReset} className="btn btn-outline">
          إعادة تعيين
        </button>
      </div>
    </div>
  );
};

export default Settings;