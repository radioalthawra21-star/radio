import { FaFileInvoice } from 'react-icons/fa';

const getStatusColor = (status) => {
  switch (status) {
    case 'paid':
    case 'completed': return 'bg-green-100 text-green-800';
    case 'approved': return 'bg-blue-100 text-blue-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
    case 'failed': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const statusLabel = (status) => {
  if (status === 'paid' || status === 'completed') return 'مكتمل';
  if (status === 'pending') return 'معلق';
  return 'فشل';
};

const RecentPaymentsTable = ({ payments, formatCurrency }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FaFileInvoice className="h-5 w-5 ml-2 text-green-600" />
          المدفوعات الأخيرة
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الموظف</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <FaFileInvoice className="h-8 w-8 text-gray-300" />
                      <p>لا توجد مدفوعات حديثة</p>
                      <p className="text-sm">عند إضافة رواتب الموظفين ستظهر هنا</p>
                    </div>
                  </td>
                </tr>
              ) : (payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.employee}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(payment.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                      {statusLabel(payment.status)}
                    </span>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecentPaymentsTable;
