import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowRightLeft, Check, Clock, Zap } from 'lucide-react';

const WorkflowManagement: React.FC = () => {
  const workflowSteps = [
    { id: 1, name: 'Time Tracking', icon: Clock, status: 'completed', deadline: 'Today 5:00 PM' },
    { id: 2, name: 'Data Validation', icon: Zap, status: 'in-progress', deadline: 'Tomorrow 10:00 AM' },
    { id: 3, name: 'Payroll Calculation', icon: ArrowRightLeft, status: 'pending', deadline: 'Tomorrow 3:00 PM' },
    { id: 4, name: 'Approval Review', icon: Check, status: 'pending', deadline: 'Day After Tomorrow 10:00 AM' },
    { id: 5, name: 'Bank Transmission', icon: Zap, status: 'pending', deadline: 'Day After Tomorrow 3:00 PM' },
    { id: 6, name: 'Payment Confirmation', icon: Check, status: 'pending', deadline: 'Day After Tomorrow 5:00 PM' }
  ];

  return (
    <div className="workspace-management">
      <div className="workspace-header">
        <h1>Payroll Workflow Management</h1>
        <p className="text-muted">Interactive visualization of the complete payroll cycle</p>
      </div>
      
      <div className="workspace-controls">
        <button className="btn-primary">Export Workflow</button>
        <button className="btn-secondary">View Timeline</button>
        <button className="btn-outline">Set Deadlines</button>
      </div>
      
      <div className="workspace-diagram">
        <div className="workspace-path">
          {workflowSteps.map((step, index) => (
            <div key={step.id} className={`workspace-step ${step.status}`}>
              <div className="workspace-step-icon">
                <step.icon className="h-6 w-6" />
              </div>
              <div className="workspace-step-content">
                <h3 className="workspace-step-title">{step.name}</h3>
                <p className="workspace-step-deadline">Deadline: {step.deadline}</p>
                <Badge variant={step.status === 'completed' ? 'success' : step.status === 'in-progress' ? 'warning' : 'secondary'}>
                  {step.status}
                </Badge>
              </div>
              {index < workflowSteps.length - 1 && (
                <div className="workspace-connector">
                  <div className="workspace-connector-line"></div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="workspace-details">
          <Card>
            <CardHeader>
              <CardTitle>Step Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted">Select a workflow step to view details</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WorkflowManagement;
