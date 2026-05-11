import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, List, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const PoliciesProcedures: React.FC = () => {
  const [deductionForm] = useState({
    employeeId: '',
    grossPay: 0,
    federalTax: 0,
    stateTax: 0,
    socialSecurity: 0,
    medicare: 0,
    retirement: 0,
    healthInsurance: 0,
    otherDeductions: 0
  });

  const [benefitForm] = useState({
    benefitType: '',
    provider: '',
    employeeCost: 0,
    employerCost: 0,
    effectiveDate: '',
    notes: ''
  });

  const calculateNetPay = (gross: number, deductions: number) => gross - deductions;

  const handleDeductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Calculation logic would go here
    alert('Deduction calculation processed!');
  };

  const handleBenefitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Benefit saving logic would go here
    alert('Benefit configuration saved!');
  };

  return (
    <div className="policies-procedures">
      <div className="policies-header">
        <h1>Policies & Procedures (SOP)</h1>
        <p className="text-muted">Standard operating procedures for payroll processing</p>
      </div>
      
      <div className="policies-grid">
        {/* Deductions Calculator */}
        <Card className="deductions-card">
          <CardHeader>
            <h2 className="card-title">
              <Calculator className="h-4 w-4 mr-2" /> Deductions Calculator
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeductionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee ID</label>
                  <Input 
                    placeholder="Enter employee ID"
                    value={deductionForm.employeeId}
                    onChange={(e) => deductionForm.employeeId = e.target.value}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gross Pay ($)</label>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={deductionForm.grossPay.toString()}
                    onChange={(e) => deductionForm.grossPay = parseFloat(e.target.value) || 0}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Federal Tax (%)</label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={deductionForm.federalTax.toString()}
                    onChange={(e) => deductionForm.federalTax = parseFloat(e.target.value) || 0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State Tax (%)</label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={deductionForm.stateTax.toString()}
                    onChange={(e) => deductionForm.stateTax = parseFloat(e.target.value) || 0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Social Security (%)</label>
                  <Input 
                    type="number"
                    placeholder="6.2"
                    value={deductionForm.socialSecurity.toString()}
                    onChange={(e) => deductionForm.socialSecurity = parseFloat(e.target.value) || 0}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Medicare (%)</label>
                  <Input 
                    type="number"
                    placeholder="1.45"
                    value={deductionForm.medicare.toString()}
                    onChange={(e) => deductionForm.medicare = parseFloat(e.target.value) || 0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Retirement (%)</label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={deductionForm.retirement.toString()}
                    onChange={(e) => deductionForm.retirement = parseFloat(e.target.value) || 0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Health Insurance ($)</label>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={deductionForm.healthInsurance.toString()}
                    onChange={(e) => deductionForm.healthInsurance = parseFloat(e.target.value) || 0}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6">
                <div>
                  <Button type="submit" variant="default">
                    Calculate Deductions
                  </Button>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Net Pay: $0.00</h3>
                  <p className="text-sm text-muted">After all deductions</p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Benefit Configurations */}
        <Card className="benefits-card">
          <CardHeader>
            <h2 className="card-title">
              <List className="h-4 w-4 mr-2" /> Benefit Configurations
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBenefitSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Benefit Type</label>
                  <Select 
                    value={benefitForm.benefitType}
                    onValueChange={(value) => benefitForm.benefitType = value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select benefit type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="health">Health Insurance</SelectItem>
                      <SelectItem value="dental">Dental Insurance</SelectItem>
                      <SelectItem value="vision">Vision Insurance</SelectItem>
                      <SelectItem value="life">Life Insurance</SelectItem>
                      <SelectItem value="disability">Disability Insurance</SelectItem>
                      <SelectItem value="retirement">Retirement Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Provider</label>
                  <Input 
                    placeholder="Enter provider name"
                    value={benefitForm.provider}
                    onChange={(e) => benefitForm.provider = e.target.value}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee Cost ($)</label>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={benefitForm.employeeCost.toString()}
                    onChange={(e) => benefitForm.employeeCost = parseFloat(e.target.value) || 0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employer Cost ($)</label>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={benefitForm.employerCost.toString()}
                    onChange={(e) => benefitForm.employerCost = parseFloat(e.target.value) || 0}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Effective Date</label>
                  <Input 
                    type="date"
                    value={benefitForm.effectiveDate}
                    onChange={(e) => benefitForm.effectiveDate = e.target.value}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Select 
                    value={benefitForm.status || 'active'}
                    onValueChange={(value) => benefitForm.status = value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="form-group">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Textarea 
                  placeholder="Enter any additional notes or conditions"
                  value={benefitForm.notes}
                  onChange={(e) => benefitForm.notes = e.target.value}
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end mt-6">
                <Button type="submit" variant="default">
                  Save Benefit Configuration
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Deadline Management */}
        <Card className="deadline-card">
          <CardHeader>
            <h2 className="card-title">
              <Clock className="h-4 w-4 mr-2" /> Deadline Management
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="deadline-item">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Monthly Payroll Processing</h3>
                    <p className="text-sm text-muted">Processing deadline for monthly payroll</p>
                  </div>
                  <Badge variant="warning">Due in 3 days</Badge>
                </div>
                <div className="progress-wrapper">
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: '60%' }}></div>
                  </div>
                  <div className="progress-text">60% Complete</div>
                </div>
              </div>
              
              <div className="deadline-item">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Tax Filing Deadline</h3>
                    <p className="text-sm text-muted">Quarterly tax submission deadline</p>
                  </div>
                  <Badge variant="destructive">Overdue</Badge>
                </div>
                <div className="progress-wrapper">
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: '100%' }}></div>
                  </div>
                  <div className="progress-text">Overdue by 2 days</div>
                </div>
              </div>
              
              <div className="deadline-item">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Benefits Open Enrollment</h3>
                    <p className="text-sm text-muted">Annual benefits enrollment period</p>
                  </div>
                  <Badge variant="success">Upcoming</Badge>
                </div>
                <div className="progress-wrapper">
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: '0%' }}></div>
                  </div>
                  <div className="progress-text">Not Started</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PoliciesProcedures;