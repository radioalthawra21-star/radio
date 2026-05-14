import { formatDateArabic } from '../utils/dateUtils';

const TYPE_LABELS = { reward: 'مكافأة', prize: 'جائزة', bonus: 'علاوة' };

export default function BonusList({ bonuses, employees, allEmployees, selectedEmployeeFilter, userRole, user, onFilterChange, onApprove, onDelete }) {
  const employeesForFilter = userRole === 'manager' ? employees : allEmployees;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">سجل المكافآت</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">فلترة حسب الموظف</label>
        <select value={selectedEmployeeFilter} onChange={onFilterChange}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#182E4E] focus:border-[#182E4E] bg-white">
          <option value="">-- جميع المكافآت --</option>
          {employeesForFilter.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
        </select>
      </div>

      {bonuses.length === 0 ? (
        <p className="text-gray-500 text-center py-8">لا توجد مكافآت</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {bonuses.map(bonus => {
            const hoursSince = (new Date() - new Date(bonus.createdAt)) / (1000 * 60 * 60);
            const canDelete = userRole === 'admin' || (userRole === 'manager' && bonus.givenBy?._id === user?._id && hoursSince <= 24);
            const canApprove = userRole === 'admin' && !bonus.isApproved;

            return (
              <div key={bonus._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{bonus.employee?.name || 'غير معروف'}</p>
                    <p className="text-sm text-gray-500">من: {bonus.givenBy?.name || 'غير معروف'}</p>
                    <p className="text-sm text-gray-700 mt-1">{bonus.reason}</p>
                  </div>
                  <div className="text-left mr-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      bonus.isApproved ? 'bg-[#CDD6E8] text-[#182E4E]' : 'bg-yellow-100 text-yellow-700'
                    }`}>{bonus.isApproved ? '✓ موافق عليها' : '⌛ في الانتظار'}</span>
                    <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium mt-1">+{bonus.points} نقطة</span>
                    <p className="text-xs text-gray-500 mt-1">{TYPE_LABELS[bonus.type]}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateArabic(bonus.createdAt)}</p>
                    <div className="flex gap-2 mt-2">
                      {canApprove && <button onClick={() => onApprove(bonus._id)} className="text-xs bg-[#182E4E] text-white px-2 py-1 rounded hover:bg-[#152842]">موافقة</button>}
                      {canDelete && <button onClick={() => onDelete(bonus._id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">حذف</button>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
