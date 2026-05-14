import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWellBeingStatus } from '../../services/wellBeingService';

const WellBeingBanner = () => {
  const navigate = useNavigate();
  const [showWellBeingReminder, setShowWellBeingReminder] = useState(false);

  useEffect(() => {
    const checkWellBeingStatus = async () => {
      try {
        const stored = localStorage.getItem('wellBeingDismissedDate');
        const today = new Date().toDateString();
        if (stored === today) return;
        const response = await getWellBeingStatus();
        if (response.success && !response.data.hasSubmitted) {
          setShowWellBeingReminder(true);
        }
      } catch (error) {
        console.error('Error checking well-being:', error);
      }
    };
    checkWellBeingStatus();
  }, []);

  const dismissReminder = () => {
    localStorage.setItem('wellBeingDismissedDate', new Date().toDateString());
    setShowWellBeingReminder(false);
  };

  if (!showWellBeingReminder) return null;

  return (
    <div className="bg-primary text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">😊</span>
        <span className="font-medium">تقرير الحالة اليومية - كيف تشعر اليوم؟</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/well-being')}
          className="px-4 py-1 bg-white text-primary rounded-full font-semibold hover:bg-gray-100 transition-colors"
        >
          إكمال الآن
        </button>
        <button
          onClick={dismissReminder}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default WellBeingBanner;
