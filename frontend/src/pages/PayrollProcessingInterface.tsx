import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, List, TrendingUp, Zap, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const PayrollProcessingInterface: React.FC = () => {
  // Form state
  const [formState, setFormState] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    payPeriod: '',
    regularHours: 0,
    overtimeHours: 0,
    hourlyRate: 0,
    bonus: 0,
    otherEarnings: 0,
    federalTax: 0,
    stateTax: 0,
    socialSecurity: 0,
    medicare: 0,
    retirement: 0,
    healthInsurance: 0,
    otherDeductions: 0
  });

  // Calculated values
  const calculateGrossPay = () => {
    const regularPay = formState.regularHours * formState.hourlyRate;
    const overtimePay = formState.overtimeHours * formState.hourlyRate * 1.5;
    return regularPay + overtimePay + formState.bonus + formState.otherEarnings;
  };

  const calculateTotalDeductions = () => {
    const gross = calculateGrossPay();
    const federalTaxAmt = gross * (formState.federalTax / 100);
    const stateTaxAmt = gross * (formState.stateTax / 100);
    const socialSecurityAmt = gross * (formState.socialSecurity / 100);
    const medicareAmt = gross * (formState.medicare / 100);
    const retirementAmt = gross * (formState.retirement / 100);
    return federalTaxAmt + stateTaxAmt + socialSecurityAmt + medicareAmt + retirementAmt + formState.healthInsurance + formState.otherDeductions;
  };

  const calculateNetPay = () => calculateGrossPay() - calculateTotalDeductions();

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would submit to a backend for processing
    alert('Payroll processed successfully!');
  };

  // Simulate approval workflow
  const [approvalStep, setApprovalStep] = useState(0);
  const approvalSteps = ['Processor Review', 'Supervisor Approval', 'Audit Review', 'Final Approval'];

  const handleApprove = () => {
    if (approvalStep < approvalSteps.length - 1) {
      setApprovalStep(approvalStep + 1);
    }
  };

  const handleReject = () => {
    setApprovalStep(0);
    alert('Payroll rejected and returned to processor');
  };

  // Simulate bank file generation
  const generateBankFile = () => {
    alert('Bank file generated successfully!');
  };

  return (
    <div className="payroll-processing-interface">
      <div className="processing-header">
        <h1>Payroll Processing Interface</h1>
        <p className="text-muted">Process payroll with real-time calculations and approval workflow</p>
      </div>
      
      <div className="processing-grid">
        {/* Employee Information and Time Tracking */}
        <Card className="employee-info-card">
          <CardHeader>
            <h2 className="card-title">
              <List className="h-4 w-4 mr-2" /> Employee Information
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee ID</label>
                  <Input 
                    placeholder="Enter employee ID"
                    name="employeeId"
                    value={formState.employeeId}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employee Name</label>
                  <Input 
                    placeholder="Enter employee name"
                    name="employeeName"
                    value={formState.employeeName}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <Input 
                    placeholder="Enter department"
                    name="department"
                    value={formState.department}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pay Period</label>
                  <Input 
                    placeholder="Select pay period"
                    name="payPeriod"
                    value={formState.payPeriod}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Regular Hours</label>
                  <Input 
                    type="number"
                    placeholder="0"
                    name="regularHours"
                    value={formState.regularHours}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Overtime Hours</label>
                  <Input 
                    type="number"
                    placeholder="0"
                    name="overtimeHours"
                    value={formState.overtimeHours}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Hourly Rate ($)</label>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    name="hourlyRate"
                    value={formState.hourlyRate}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bonus ($)</label>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    name="bonus"
                    value={formState.bonus}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Other Earnings ($)</label>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    name="otherEarnings"
                    value={formState.otherEarnings}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pay Date</label>
                  <Input 
                    type="date"
                    name="payDate"
                    value="" // We don't have this in state, but we can add if needed
                    onChange={handleChange}
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Earnings and Deductions */}
        <Card className="earnings-deductions-card">
          <CardHeader>
            <h2 className="card-title">
              <TrendingUp className="h-4 w-4 mr-2" /> Earnings & Deductions
            </h2>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              {/* Earnings Summary */}
              <div className="earnings-summary">
                <h3 className="font-semibold mb-2">Earnings Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted">Regular Pay</p>
                    <p className="text-lg font-bold">${((formState.regularHours || 0) * (formState.hourlyRate || 0)).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Overtime Pay</p>
                    <p className="text-lg font-bold">${((formState.overtimeHours || 0) * (formState.hourlyRate || 0) * 1.5).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Bonus</p>
                    <p className="text-lg font-bold">${(formState.bonus || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Other Earnings</p>
                    <p className="text-lg font-bold">${(formState.otherEarnings || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t">
                  <p className="text-sm text-muted">Gross Pay</p>
                  <p className="text-2xl font-bold">${calculateGrossPay().toFixed(2)}</p>
                </div>
              </div>
              
              {/* Deductions */}
              <div className="deductions-section">
                <h3 className="font-semibold mb-2">Deductions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Federal Tax (%)</label>
                    <Input 
                      type="number"
                      placeholder="0"
                      step="0.01"
                      name="federalTax"
                      value={formState.federalTax}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">State Tax (%)</label>
                    <Input 
                      type="number"
                      placeholder="0"
                      step="0.01"
                      name="stateTax"
                      value={formState.stateTax}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Social Security (%)</label>
                    <Input 
                      type="number"
                      placeholder="6.2"
                      step="0.01"
                      name="socialSecurity"
                      value={formState.socialSecurity}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Medicare (%)</label>
                    <Input 
                      type="number"
                      placeholder="1.45"
                      step="0.01"
                      name="medicare"
                      value={formState.medicare}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Retirement (%)</label>
                    <Input 
                      type="number"
                      placeholder="0"
                      step="0.01"
                      name="retirement"
                      value={formState.retirement}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Health Insurance ($)</label>
                    <Input 
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      name="healthInsurance"
                      value={formState.healthInsurance}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Other Deductions ($)</label>
                    <Input 
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      name="otherDeductions"
                      value={formState.otherDeductions}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t">
                  <p className="text-sm text-muted">Total Deductions</p>
                  <p className="text-2xl font-bold text-destructive">${calculateTotalDeductions().toFixed(2)}</p>
                </div>
              </div>
              
              {/* Net Pay */}
              <div className="net-pay-summary mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted">Net Pay</p>
                    <p className="text-3xl font-bold">${calculateNetPay().toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary">Calculated</Badge>
                    <Button variant="outline" size="sm" onClick={() => setFormState({
                      employeeId: '',
                      employeeName: '',
                      department: '',
                      payPeriod: '',
                      regularHours: 0,
                      overtimeHours: 0,
                      hourlyRate: 0,
                      bonus: 0,
                      otherEarnings: 0,
                      federalTax: 0,
                      stateTax: 0,
                      socialSecurity: 0,
                      medicare: 0,
                      retirement: 0,
                      healthInsurance: 0,
                      otherDeductions: 0
                    })}>
                      Clear Form
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Approval Workflow and Actions */}
        <Card className="approval-actions-card">
          <CardHeader>
            <h2 className="card-title">
              <Check className="h-4 w-4 mr-2" /> Approval Workflow
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Approval Steps */}
              <div className="approval-steps">
                {approvalSteps.map((step, index) => (
                  <div key={index} className={`approval-step flex items-center space-x-3 ${index < approvalStep ? 'completed' : index === approvalStep ? 'current' : 'pending'}`}>
                    <div className="w-8 h-8 rounded flex items-center justify-center">
                      {index < approvalStep ? (
                        <Check className="text-green-600" />
                      ) : index === approvalStep ? (
                        <Clock className="text-yellow-600" />
                      ) : (
                        <div className="text-muted">○</div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{step}</h3>
                      <p className="text-sm text-muted">Step {index + 1} of {approvalSteps.length}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Action Buttons */}
              <div className="approval-actions">
                {approvalStep < approvalSteps.length - 1 ? (
                  <>
                    <Button variant="outline" onClick={handleReject}>
                      Reject
                    </Button>
                    <Button variant="default" ml-2 onClick={handleApprove}>
                      Approve
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleReject}>
                      Reject
                    </Button>
                    <Button variant="default" ml-2 onClick={generateBankFile}>
                      Generate Bank File
                    </Button>
                  </>
                )}
              </div>
              
              {/* Bank File Generation (if approved) */}
              {approvalStep === approvalSteps.length - 1 && (
                <div className="bank-file-section mt-4 p-3 bg-muted rounded">
                  <h3 className="font-semibold mb-2">Bank File Generation</h3>
                  <p className="text-sm text-muted">
                    The payroll has been approved and is ready for bank transmission.
                  </p>
                  <Button variant="default" mt-2 onClick={generateBankFile}>
                    <Banknote className="h-4 w-4 mr-2" /> Generate ACH File
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayrollProcessingInterface;