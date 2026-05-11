import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, List, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const InternalControlsAudit: React.FC = () => {
  // Mock data for segregation of duties matrix
  const sodMatrix = [
    { role: 'Payroll Director', 'Time Tracking': 'Review', 'Data Validation': 'Review', 'Payroll Calculation': 'Override', 'Approval': 'Approve', 'Bank Transmission': 'Review' },
    { role: 'Senior Specialist', 'Time Tracking': 'Supervise', 'Data Validation': 'Perform', 'Payroll Calculation': 'Review', 'Approval': 'Review', 'Bank Transmission': 'Supervise' },
    { role: 'Processor', 'Time Tracking': 'Perform', 'Data Validation': 'Perform', 'Payroll Calculation': 'Perform', 'Approval': 'None', 'Bank Transmission': 'Prepare' },
    { role: 'Auditor', 'Time Tracking': 'Review', 'Data Validation': 'Review', 'Payroll Calculation': 'Review', 'Approval': 'Review', 'Bank Transmission': 'Review' }
  ];

  // Mock audit trail data
  const auditTrail = [
    { id: 1, user: 'john.doe@company.com', action: 'Approved payroll for Department A', timestamp: '2026-05-03 10:30:00', ip: '192.168.1.100' },
    { id: 2, user: 'jane.smith@company.com', action: 'Updated tax rates for state CA', timestamp: '2026-05-03 09:15:00', ip: '192.168.1.101' },
    { id: 3, user: 'admin@company.com', action: 'Exported payroll report Q2 2026', timestamp: '2026-05-02 16:45:00', ip: '192.168.1.102' }
  ];

  // Mock reconciliation data
  const reconciliationItems = [
    { id: 1, description: 'Payroll Register vs General Ledger', status: 'matched', variance: 0 },
    { id: 2, description: 'Bank Transmission File vs Payroll Register', status: 'matched', variance: 0 },
    { id: 3, description: 'Tax Liabilities vs Tax Payments', status: 'variance', variance: 250.00 }
  ];

  // Mock KPI data
  const kpis = [
    { label: 'Payroll Accuracy', value: '99.8%', target: '99.5%', trend: 'up' },
    { label: 'On-time Processing', value: '98.2%', target: '97.0%', trend: 'up' },
    { label: 'Audit Findings', value: '2', target: '0', trend: 'down' },
    { label: 'Compliance Score', value: '98.5%', target: '98.0%', trend: 'up' }
  ];

  return (
    <div className="internal-controls-audit">
      <div className="audit-header">
        <h1>Internal Controls & Audit</h1>
        <p className="text-muted">Monitor controls, audit trails, and compliance metrics</p>
      </div>
      
      <div className="audit-grid">
        {/* Segregation of Duties Matrix */}
        <Card className="sod-card">
          <CardHeader>
            <h2 className="card-title">
              <ShieldCheck className="h-4 w-4 mr-2" /> Segregation of Duties Matrix
            </h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    {['Time Tracking', 'Data Validation', 'Payroll Calculation', 'Approval', 'Bank Transmission'].map((task) => (
                      <th key={task} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {task}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sodMatrix.map((row, rowIndex) => (
                    <tr key={rowIndex} className="bg-white">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.role}
                      </td>
                      {['Time Tracking', 'Data Validation', 'Payroll Calculation', 'Approval', 'Bank Transmission'].map((task, colIndex) => (
                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row[task]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Audit Trail */}
        <Card className="audit-trail-card">
          <CardHeader>
            <h2 className="card-title">
              <List className="h-4 w-4 mr-2" /> Audit Trail
            </h2>
            <div className="flex items-center space-x-2">
              <Input 
                placeholder="Search audit trail..."
                className="w-48"
              />
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditTrail.map((entry) => (
                <div key={entry.id} className="audit-entry border-b py-3 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{entry.action}</p>
                      <p className="text-sm text-muted">
                        By {entry.user} • {entry.timestamp}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted">
                      {entry.ip}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Reconciliation Tools */}
        <Card className="reconciliation-card">
          <CardHeader>
            <h2 className="card-title">
              <TrendingUp className="h-4 w-4 mr-2" /> Reconciliation Tools
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reconciliationItems.map((item) => (
                <div key={item.id} className="reconciliation-item flex items-center justify-between p-3 border rounded">
                  <div>
                    <h3 className="font-semibold">{item.description}</h3>
                    <p className="text-sm text-muted">
                      Status: {item.status === 'matched' ? 'Matched' : 'Variance Detected'}
                    </p>
                  </div>
                  <div className="text-right">
                    {item.status === 'matched' ? (
                      <Badge variant="secondary">Matched</Badge>
                    ) : (
                      <>
                        <Badge variant="destructive">Variance</Badge>
                        <span className="ml-2 font-medium">${Math.abs(item.variance).toFixed(2)}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="flex justify-end mt-6">
                <Button variant="default">
                  Run Reconciliation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* KPI Monitoring */}
        <Card className="kpi-card">
          <CardHeader>
            <h2 className="card-title">
              <TrendingUp className="h-4 w-4 mr-2" /> KPI Monitoring
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="kpi-item p-3 border rounded">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                      <p className="text-2xl font-bold">{kpi.value}</p>
                    </div>
                    <Badge 
                      variant={kpi.trend === 'up' ? 'success' : 'destructive'} 
                      className="ml-2"
                    >
                      {kpi.trend === 'up' ? '▲' : '▼'} 
                      {kpi.trend === 'up' ? 'Improving' : 'Declining'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Target: {kpi.target}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InternalControlsAudit;