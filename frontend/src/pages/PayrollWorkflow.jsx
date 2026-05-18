import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTasks, FaCheckCircle, FaClock, FaExclamationTriangle, FaArrowRight, FaCalendarAlt, FaFlag, FaUserTie, FaFileAlt, FaArrowLeft } from 'react-icons/fa';

const WORKFLOW_STEPS = [
  {
    id: 1, title: 'تتبع الحضور والانصراف',
    description: 'تسجيل حضور الموظفين وساعات عملهم عبر أنظمة الحضور البيومترية أو الإدخال اليدوي',
    status: 'completed', deadline: 'يوم 1-25 من الشهر', responsible: 'الموارد البشرية/العمليات',
    documents: ['بطاقات الحضور', 'سجلات الحضور']
  },
  {
    id: 2, title: 'التحقق من البيانات',
    description: 'التحقق من جداول الحضور مقابل سجلات الحضور والإجازات المعتمدة',
    status: 'completed', deadline: 'اليوم 26', responsible: 'معالج الرواتب',
    documents: ['جداول الحضور المعتمدة', 'سجلات الإجازات']
  },
  {
    id: 3, title: 'معالجة المتغيرات',
    description: 'حساب الساعات الإضافية، المكافآت، العمولات، والمستحقات',
    status: 'completed', deadline: 'الأيام 27-28', responsible: 'أخصائي الرواتب',
    documents: ['تقارير الساعات الإضافية', 'حساب المكافآت', 'مستحقات التعويض']
  },
  {
    id: 4, title: 'حساب الراتب الإجمالي',
    description: 'حساب الراتب الأساسي بالإضافة إلى جميع العائدات والبدلات',
    status: 'active', deadline: 'اليوم 28', responsible: 'نظام الرواتب',
    documents: ['سجل الرواتب', 'ملخص العائدات']
  },
  {
    id: 5, title: 'معالجة الاستقطاعات',
    description: 'تطبيق الاستقطاعات القانونية والطوعية (ضرائب، تأمين، قروض)',
    status: 'pending', deadline: 'اليوم 29', responsible: 'أخصائي الرواتب',
    documents: ['نماذج الضرائب', 'خصومات التأمين', 'كشوف القروض']
  },
  {
    id: 6, title: 'حساب الراتب الصافي',
    description: 'الحساب النهائي للراتب الصافي بعد كل الاستقطاعات',
    status: 'pending', deadline: 'اليوم 29', responsible: 'نظام الرواتب',
    documents: ['سجل الرواتب', 'ملخص الراتب الصافي']
  },
  {
    id: 7, title: 'مراجعة الإدارة',
    description: 'مراجعة الموافقة على حسابات الرواتب من قبل المدير',
    status: 'pending', deadline: 'اليوم 30 (صباحاً)', responsible: 'مدير الرواتب',
    documents: ['تقرير ملخص الرواتب', 'نموذج الموافقة']
  },
  {
    id: 8, title: 'التحقق من المراجعة',
    description: 'فحص داخلي للدقة والامتثال',
    status: 'pending', deadline: 'اليوم 30 (عصراً)', responsible: 'مدقق داخلي',
    documents: ['قائمة التحقق من المراجعة', 'تقرير المطابقة']
  },
  {
    id: 9, title: 'توليد الرواتب',
    description: 'إنشاء كشوف الرواتب النهائية وتعليمات التحويل المصرفي',
    status: 'pending', deadline: 'اليوم 30 (مساءً)', responsible: 'نظام الرواتب',
    documents: ['كشوف الرواتب', 'ملف التحويل البنكي']
  },
  {
    id: 10, title: 'التحويل البنكي',
    description: 'تنفيذ تحويلات رواتب الموظفين إلى حساباتهم البنكية',
    status: 'pending', deadline: 'آخر يوم عمل', responsible: 'قسم الخزينة',
    documents: ['تأكيد البنك', 'إيصالات التحويل']
  }
];

const STATS = { totalSteps: 10, completed: 3, active: 1, pending: 6 };

const statusConfig = {
  completed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: FaCheckCircle, color: '#10b981', label: 'مكتمل' },
  active: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: FaClock, color: '#3b82f6', label: 'نشط' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: FaExclamationTriangle, color: '#f59e0b', label: 'معلق' },
};

const criticalDeadlines = [
  { day: 'اليوم 30 صباحاً', task: 'موعد مراجعة الإدارة', color: 'red' },
  { day: 'اليوم 29', task: 'معالجة الاستقطاعات', color: 'yellow' },
  { day: 'آخر يوم عمل', task: 'تنفيذ التحويل البنكي', color: 'blue' },
];

const PayrollWorkflow = () => {
  const navigate = useNavigate();
  const [steps] = useState(WORKFLOW_STEPS);

  return (
    <div className="payroll-workflow-page">
      <div className="page-header mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark flex items-center">
              <FaTasks className="h-8 w-8 ml-3 text-secondary" />
              سير عمل الرواتب
            </h1>
            <p className="text-gray-600 mt-1">مسار معالجة الرواتب من البداية للنهاية وتتبع المواعيد النهائية</p>
          </div>
          <button onClick={() => navigate('/payroll')}
            className="bg-white border border-gray-300 px-4 py-2 rounded-lg flex items-center text-gray-700 hover:bg-gray-50 transition-colors">
            <FaArrowRight className="h-4 w-4 ml-2" /> العودة إلى لوحة الرواتب
          </button>
        </div>
      </div>

      <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-icon bg-gray-100"><FaTasks className="h-5 w-5 text-gray-600" /></div>
          <div>
            <p className="text-xs text-gray-500">إجمالي الخطوات</p>
            <p className="stat-value">{STATS.totalSteps}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-green-100"><FaCheckCircle className="h-5 w-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">مكتملة</p>
            <p className="stat-value text-green-600">{STATS.completed}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-blue-100"><FaClock className="h-5 w-5 text-blue-600" /></div>
          <div>
            <p className="text-xs text-gray-500">نشطة</p>
            <p className="stat-value text-blue-600">{STATS.active}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-yellow-100"><FaExclamationTriangle className="h-5 w-5 text-yellow-600" /></div>
          <div>
            <p className="text-xs text-gray-500">معلقة</p>
            <p className="stat-value text-yellow-600">{STATS.pending}</p>
          </div>
        </div>
      </div>

      <div className="section-card mb-8">
        <div className="section-header">
          <FaArrowRight className="h-4 w-4 ml-2 text-secondary transform rotate-45" />
          <span>مسار المعالجة</span>
        </div>

        <div className="relative">
          <div className="absolute right-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-blue-500 to-yellow-500"></div>

          {steps.map((step) => {
            const cfg = statusConfig[step.status] || statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <div key={step.id} className="relative mb-6 last:mb-0">
                <div className="flex items-start">
                  <div className="absolute right-[26px] w-[14px] h-[14px] rounded-full border-[3px] border-white z-10"
                    style={{ backgroundColor: cfg.color, boxShadow: `0 0 0 2px ${cfg.color}22` }}
                  ></div>

                  <div className="mr-16 flex-1 bg-gray-50 rounded-xl p-5 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${cfg.bg} ${cfg.text}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">الخطوة {step.id}: {step.title}</h3>
                          <p className="text-xs text-gray-600 mt-0.5">{step.description}</p>
                        </div>
                      </div>
                      <span className={`status-badge ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-200 text-xs">
                      <div className="flex items-center gap-1.5">
                        <FaCalendarAlt className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">الموعد:</span>
                        <span className="font-medium text-gray-900">{step.deadline}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FaUserTie className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">المسؤول:</span>
                        <span className="font-medium text-gray-900">{step.responsible}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FaFileAlt className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">المستندات:</span>
                        <span className="text-gray-900">{step.documents.join('، ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <FaFlag className="h-4 w-4 ml-2 text-red-500" />
          <span>المواعيد النهائية الحرجة</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {criticalDeadlines.map((d) => (
            <div key={d.day} className={`bg-${d.color}-50 border-r-4 border-${d.color}-500 p-4 rounded-lg`}>
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className={`h-4 w-4 text-${d.color}-600`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.day}</p>
                  <p className="text-xs text-gray-600">{d.task}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PayrollWorkflow;
