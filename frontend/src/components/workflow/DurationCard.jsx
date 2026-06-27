const DurationCard = ({ departmentDurations = [], userDurations = [], totalHours = 0 }) => {
  if (!departmentDurations.length && !userDurations.length && !totalHours) {
    return <p className="text-center text-gray-500 py-4">لا توجد بيانات مدة</p>;
  }

  return (
    <div className="space-y-4">
      {totalHours > 0 && (
        <div className="bg-primary/5 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-primary en-num">
            {totalHours.toFixed(1)}
          </p>
          <p className="text-sm text-gray-500">إجمالي عمر المهمة (ساعات)</p>
        </div>
      )}

      {departmentDurations.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-dark mb-2">المدة حسب القسم</h4>
          <div className="space-y-2">
            {departmentDurations.map((dd, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dd.department?.color || '#3B82F6' }}
                  ></div>
                  <span className="text-sm text-dark">{dd.department?.name || 'قسم غير معروف'}</span>
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-dark en-num">{dd.totalHours}</span>
                  <span className="text-xs text-gray-500 mr-1">ساعة</span>
                  <span className="text-xs text-gray-400 mr-2 en-num">({dd.entryCount} مرة)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {userDurations.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-dark mb-2">المدة حسب الموظف</h4>
          <div className="space-y-2">
            {userDurations.map((ud, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-dark">{ud.user?.name || 'موظف غير معروف'}</span>
                <div className="text-left">
                  <span className="text-sm font-bold text-dark en-num">{ud.totalHours}</span>
                  <span className="text-xs text-gray-500 mr-1">ساعة</span>
                  <span className="text-xs text-gray-400 mr-2 en-num">({ud.entryCount} مرة)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DurationCard;
