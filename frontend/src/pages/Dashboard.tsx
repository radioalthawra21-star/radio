import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Clock, ShieldCheck, Organization, List } from 'lucide-react';
import { PayrollStats } from '@/types/payroll';

const Dashboard: React.FC = () => {
  // Mock data for dashboard
  const stats: PayrollStats[] = [
    {
      id: 1,
      label: 'Total Employees',
      value: 1245,
      icon: Users,
      trend: 'up',
      change: 12.5
    },
    {
      id: 2,
      label: 'Pending Approvals',
      value: 23,
      icon: Clock,
      trend: 'down',
      change: -5.2
    },
    {
      id: 3,
      label: 'This Month Payroll',
      value: '$2.4M',
      icon: BarChart3,
      trend: 'up',
      change: 8.3
    },
    {
      id: 4,
      label: 'Compliance Score',
      value: '98.5%',
      icon: ShieldCheck,
      trend: 'up',
      change: 1.2
    }
  ];

  // Organizational hierarchy data
  const orgUnits: OrgUnit[] = [
    {
      id: 1,
      name: 'Payroll Director',
      role: 'Director',
      children: [
        {
          id: 2,
          name: 'Senior Payroll Specialist',
          role: 'Senior Specialist',
          children: [
            {
              id: 3,
              name: 'Payroll Processor A',
              role: 'Processor'
            },
            {
              id: 4,
              name: 'Payroll Processor B',
              role: 'Processor'
            },
            {
              id: 5,
              name: 'Payroll Auditor',
              role: 'Auditor'
            }
          ]
        }
      ]
    }
  ];

  // Accountability matrix data (Segregation of Duties)
  const accountabilityMatrix: AccountabilityMatrixItem[] = [
    {
      role: 'Payroll Director',
      'Time Tracking': 'Review',
      'Data Validation': 'Review',
      'Payroll Calculation': 'Override',
      'Approval': 'Approve',
      'Bank Transmission': 'Review'
    },
    {
      role: 'Senior Specialist',
      'Time Tracking': 'Supervise',
      'Data Validation': 'Perform',
      'Payroll Calculation': 'Review',
      'Approval': 'Review',
      'Bank Transmission': 'Supervise'
    },
    {
      role: 'Processor',
      'Time Tracking': 'Perform',
      'Data Validation': 'Perform',
      'Payroll Calculation': 'Perform',
      'Approval': 'None',
      'Bank Transmission': 'Prepare'
    },
    {
      role: 'Auditor',
      'Time Tracking': 'Review',
      'Data Validation': 'Review',
      'Payroll Calculation': 'Review',
      'Approval': 'Review',
      'Bank Transmission': 'Review'
    }
  ];

  // Recursive function to render organizational tree
  const renderOrgTree = (units: OrgUnit[]) => (
    <ul className="space-y-2 pl-4">
      {units.map((unit) => (
        <li key={unit.id} className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
            <Organization className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold">{unit.name}</h4>
            <p className="text-sm text-muted">{unit.role}</p>
          </div>
          {unit.children && (
            <div className="ml-8">
              {renderOrgTree(unit.children)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Payroll Dashboard</h1>
        <p className="text-muted">Overview of payroll operations and key metrics</p>
      </div>
      
      <div className="stats-grid">
        {stats.map(stat => (
          <Card key={stat.id} className="stat-card">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <stat.icon className="h-5 w-5" />
                <h3 className="card-title">{stat.label}</h3>
              </div>
              <Badge variant={stat.trend === 'up' ? 'success' : 'destructive'}>
                {stat.trend === 'up' ? '▲' : '▼'} {Math.abs(stat.change)}%
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted">Last updated: Today</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="dashboard-content">
        <div className="org-hierarchy">
          <Card>
            <CardHeader>
              <h2 className="card-title">
                <Organization className="h-4 w-4 mr-2" /> Organizational Structure
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="org-tree">
                  {renderOrgTree(orgUnits)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="accountability-matrix">
          <Card>
            <CardHeader>
              <h2 className="card-title">
                <List className="h-4 w-4 mr-2" /> Accountability Matrix (Segregation of Duties)
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
                    {accountabilityMatrix.map((row, rowIndex) => (
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
        </div>
      </div>
    </div>
  );
};

// Define types
interface OrgUnit {
  id: number;
  name: string;
  role: string;
  children?: OrgUnit[];
}

interface AccountabilityMatrixItem {
  role: string;
  'Time Tracking': string;
  'Data Validation': string;
  'Payroll Calculation': string;
  'Approval': string;
  'Bank Transmission': string;
}

export default Dashboard;