import { FaClock, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';

const SAMPLE_EVENTS = [
  { time: '08:00', label: 'بداية الدوام', type: 'info' },
  { time: '09:00', label: 'بداية الحضور', type: 'info' },
  { time: '15:00', label: 'نهاية الدوام', type: 'info' },
];

const AttendanceTimeline = () => {
  return (
    <div>
      <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
        <FaClock className="text-primary" />
        الجدول الزمني
      </h3>
      <div className="space-y-3">
        {SAMPLE_EVENTS.map((event, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${
                event.type === 'info' ? 'bg-primary' : 'bg-secondary'
              }`} />
              {i < SAMPLE_EVENTS.length - 1 && (
                <div className="w-0.5 h-8 bg-gray-200" />
              )}
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-dark">{event.time}</span>
              <p className="text-xs text-gray-500">{event.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceTimeline;
