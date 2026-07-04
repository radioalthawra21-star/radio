import { useState } from 'react';
import { getStoredUser } from '../../services/authService';
import MyTasks from '../Employee/MyTasks';
import AddTask from '../Employee/AddTask';
import TaskHistory from '../Employee/TaskHistory';
import AssignTasks from '../Manager/AssignTasks';
import EvaluateTasks from '../Manager/EvaluateTasks';
import DepartmentTasks from '../Manager/DepartmentTasks';
import ProposalsList from '../../components/ProposalsList';
import KanbanBoard from '../Workflow/KanbanBoard';
import StageApproval from '../Workflow/StageApproval';
import WorkflowDashboard from '../Workflow/WorkflowDashboard';
import EmployeeWorkflowTasks from '../Workflow/EmployeeWorkflowTasks';

const TABS = {
  employee: [
    { key: 'my-tasks', label: 'مهماتي', icon: '📋' },
    { key: 'add-task', label: 'إضافة مهمة', icon: '➕' },
    { key: 'kanban', label: 'لوحة سير العمل', icon: '📌' },
    { key: 'task-history', label: 'سجل المهام', icon: '📜' },
  ],
  manager: [
    { key: 'my-tasks', label: 'مهماتي', icon: '📋' },
    { key: 'add-task', label: 'إضافة مهمة', icon: '➕' },
    { key: 'proposals', label: 'الاقتراحات', icon: '💡' },
    { key: 'assign-tasks', label: 'إسناد المهام', icon: '👥' },
    { key: 'department-tasks', label: 'مهام القسم', icon: '🏢' },
    { key: 'evaluate-tasks', label: 'تقييم المهام', icon: '⭐' },
    { key: 'kanban', label: 'لوحة سير العمل', icon: '📌' },
    { key: 'stage-approval', label: 'الموافقات', icon: '✅' },
    { key: 'workflow-dashboard', label: 'إحصائيات سير العمل', icon: '📊' },
  ],
  admin: [
    { key: 'proposals', label: 'الاقتراحات', icon: '💡' },
    { key: 'assign-tasks', label: 'إسناد المهام', icon: '👥' },
    { key: 'department-tasks', label: 'مهام القسم', icon: '🏢' },
    { key: 'kanban', label: 'لوحة سير العمل', icon: '📌' },
    { key: 'stage-approval', label: 'الموافقات', icon: '✅' },
    { key: 'workflow-dashboard', label: 'إحصائيات سير العمل', icon: '📊' },
    { key: 'task-history', label: 'سجل المهام', icon: '📜' },
  ],
  hr: [
    { key: 'kanban', label: 'لوحة سير العمل', icon: '📌' },
    { key: 'stage-approval', label: 'الموافقات', icon: '✅' },
    { key: 'workflow-dashboard', label: 'إحصائيات سير العمل', icon: '📊' },
  ]
};

const TaskManagement = () => {
  const user = getStoredUser();
  const role = user?.role || 'employee';
  const [activeTab, setActiveTab] = useState(TABS[role]?.[0]?.key || 'my-tasks');

  const tabItems = TABS[role] || TABS.employee;

  const renderContent = () => {
    switch (activeTab) {
      case 'my-tasks':
        return <MyTasks />;
      case 'add-task':
        return <AddTask />;
      case 'proposals':
        return <ProposalsList />;
      case 'assign-tasks':
        return <AssignTasks />;
      case 'evaluate-tasks':
        return <EvaluateTasks />;
      case 'department-tasks':
        return <DepartmentTasks />;
      case 'task-history':
        return <TaskHistory />;
      case 'kanban':
        return <KanbanBoard />;
      case 'stage-approval':
        return <StageApproval />;
      case 'workflow-dashboard':
        return <WorkflowDashboard />;
      case 'workflow-tasks':
        return <EmployeeWorkflowTasks />;
      default:
        return <MyTasks />;
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-6">المهام</h1>

      <div className="mb-6 md:overflow-x-auto md:-mx-3 md:px-3">
        <div className="flex flex-wrap md:flex-nowrap gap-2 border-b border-gray-200 pb-2">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 md:px-4 py-2 rounded-t-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-primary text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="ml-1" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default TaskManagement;
