import React, { useState } from 'react';
import { FaTasks, FaCheckCircle, FaClock, FaExclamationTriangle, FaArrowRight, FaCalendarAlt } from 'react-icons/fa';
import './PayrollWorkflow.css';

const PayrollWorkflow = () => {
  const [workflowSteps, setWorkflowSteps] = useState([
    {
      id: 1,
      title: 'تتبع الحضور والانصراف',
      description: 'تسجيل حضور الموظفين وساعات عملهم عبر أنظمة الحضور البيومترية أو الإدخال اليدوي',
      status: 'completed',
      deadline: 'يوم 1-25 من الشهر',
      responsible: 'الموارد البشرية/العمليات',
      documents: ['بطاقات الحضور', 'سجلات الحضور']
    },
    {
      id: 2,
      title: 'التحقق من البيانات',
      description: 'التحقق من جداول الحضور مقابل سجلات الحضور والإجازات المعتمدة',
      status: 'completed',
      deadline: 'اليوم 26',
      responsible: 'معالج الرواتب',
      documents: ['جداول الحضور المعتمدة', 'سجلات الإجازات']
    },
    {
      id: 3,
      title: 'معالجة المتغيرات',
      description: 'حساب الساعات الإضافية، المكافآت، العمولات، والمستحقات',
      status: 'completed',
      deadline: 'الأيام 27-28',
      responsible: 'أخصائي الرواتب',
      documents: ['تقارير الساعات الإضافية', 'حساب المكافآت', 'مستحقات التعويض']
    },
    {
      id: 4,
      title: 'حساب الراتب الإجمالي',
      description: 'حساب الراتب الأساسي بالإضافة إلى جميع العائدات والبدلات',
      status: 'active',
      deadline: 'اليوم 28',
      responsible: 'نظام الرواتب',
      documents: ['سجل الرواتب', 'ملخص العائدات']
    },
    {
      id: 5,
      title: 'معالجة الاستقطاعات',
      description: 'تطبيق الاستقطاعات القانونية والطوعية (ضرائب، تأمين، قروض)',
      status: 'pending',
      deadline: 'اليوم 29',
      responsible: 'أخصائي الرواتب',
      documents: ['نماذج الضرائب', 'خصومات التأمين', 'كشوف القروض']
    },
    {
      id: 6,
      title: 'حساب الراتب الصافي',
      description: 'الحساب النهائي للراتب الصافي بعد كل الاستقطاعات',
      status: 'pending',
      deadline: 'اليوم 29',
      responsible: 'نظام الرواتب',
      documents: ['سجل الرواتب', 'ملخص الراتب الصافي']
    },
    {
      id: 7,
      title: 'مراجعة الإدارة',
      description: 'مراجعة الموافقة على حسابات الرواتب من قبل المدير',
      status: 'pending',
      deadline: 'اليوم 30 (صباحاً)',
      responsible: 'مدير الرواتب',
      documents: ['تقرير ملخص الرواتب', 'نموذج الموافقة']
    },
    {
      id: 8,
      title: 'التحقق من المراجعة',
      description: 'فحص داخلي للدقة والامتثال',
      status: 'pending',
      deadline: 'اليوم 30 (عصراً)',
      responsible: 'مدقق داخلي',
      documents: ['قائمة التحقق من المراجعة', 'تقرير المطابقة']
    },
    {
      id: 9,
      title: 'توليد الرواتب',
      description: 'إنشاء كشوف الرواتب النهائية وتعليمات التحويل المصرفي',
      status: 'pending',
      deadline: 'اليوم 30 (مساءً)',
      responsible: 'نظام الرواتب',
      documents: ['كشوف الرواتب', 'ملف التحويل البنكي']
    },
    {
      id: 10,
      title: 'التحويل البنكي',
      description: 'تنفيذ تحويلات رواتب الموظفين إلى حساباتهم البنكية',
      status: 'pending',
      deadline: 'آخر يوم عمل',
      responsible: 'قسم الخزينة',
      documents: ['تأكيد البنك', 'إيصالات التحويل']
    }
  ]);

  const [workflowStats, setWorkflowStats] = useState({
    totalSteps: 10,
    completed: 3,
    active: 1,
    pending: 6
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <FaCheckCircle className="h-5 w-5 text-green-600" />;
      case 'active': return <FaClock className="h-5 w-5 text-blue-600" />;
      case 'pending': return <FaExclamationTriangle className="h-5 w-5 text-yellow-600" />;
      default: return <FaExclamationTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="workflow-page">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaTasks className="h-8 w-8 mr-3 text-blue-600" />
              سير عمل الرواتب
            </h1>
            <p className="text-gray-600 mt-1">مسار معالجة الرواتب من البداية للنهاية وتتبع المواعيد النهائية</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-gray-100 p-3 rounded-lg">
              <FaTasks className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">إجمالي الخطوات</p>
              <p className="text-2xl font-bold text-gray-900">{workflowStats.totalSteps}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <FaCheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">مكتملة</p>
              <p className="text-2xl font-bold text-green-600">{workflowStats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FaClock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">نشطة</p>
              <p className="text-2xl font-bold text-blue-600">{workflowStats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">معلقة</p>
              <p className="text-2xl font-bold text-yellow-600">{workflowStats.pending}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <FaArrowRight className="h-5 w-5 mr-2 text-blue-600 transform rotate-45" />
          مسار المعالجة
        </h2>
        
        <div className="relative">
          <div className="absolute right-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-blue-500 to-yellow-500"></div>
          
          {workflowSteps.map((step, index) => (
            <div key={step.id} className="relative mb-8 last:mb-0">
              <div className="flex items-start">
                <div className="absolute right-8 w-4 h-4 rounded-full border-4 border-white z-10"
                     style={{
                       backgroundColor: step.status === 'completed' ? '#10b981' : 
                                       step.status === 'active' ? '#3b82f6' : '#f59e0b',
                       boxShadow: '0 0 0 2px ' + 
                                  (step.status === 'completed' ? '#d1fae5' : 
                                   step.status === 'active' ? '#dbeafe' : '#fef3c7')
                     }}
                ></div>
                
                <div className="mr-16 flex-1 bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-4 ${getStatusColor(step.status)}`}>
                        {getStatusIcon(step.status)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">الخطوة {step.id}: {step.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(step.status)}`}>
                      {step.status === 'completed' ? 'مكتمل' : step.status === 'active' ? 'نشط' : 'معلق'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <span className="text-xs text-gray-500">الموعد النهائي</span>
                      <p className="text-sm font-medium text-gray-900">{step.deadline}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">المسؤول</span>
                      <p className="text-sm font-medium text-gray-900">{step.responsible}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">المستندات</span>
                      <p className="text-sm text-gray-900">{step.documents.join(', ')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">المواعيد النهائية الحرجة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">اليوم 30 صباحاً</p>
                <p className="text-xs text-red-700">موعد مراجعة الإدارة</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaClock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">اليوم 29</p>
                <p className="text-xs text-yellow-700">معالجة الاستقطاعات</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaCalendarAlt className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">آخر يوم عمل</p>
                <p className="text-xs text-blue-700">تنفيذ التحويل البنكي</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollWorkflow;