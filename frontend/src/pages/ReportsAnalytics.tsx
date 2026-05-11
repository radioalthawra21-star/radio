import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, PieChart, TrendingUp, CreditCard, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const ReportsAnalytics: React.FC = () => {
  // Mock data for reports
  const monthlySummary = [
    { month: 'Jan', grossPay: 450000, netPay: 380000, taxes: 50000, deductions: 20000 },
    { month: 'Feb', grossPay: 460000, netPay: 385000, taxes: 52000, deductions: 23000 },
    { month: 'Mar', grossPay: 470000, netPay: 390000, taxes: 55000, deductions: 25000 },
    { month: 'Apr', grossPay: 480000, netPay: 395000, taxes: 58000, deductions: 27000 },
    { month: 'May', grossPay: 490000, netPay: 400000, taxes: 60000, deductions: 30000 }
  ];

  const laborCostByDept = [
    { name: 'Engineering', value: 35 },
    { name: 'Sales', value: 25 },
    { name: 'Marketing', value: 15 },
    { name: 'HR', value: 10 },
    { name: 'Operations', value: 10 },
    { name: 'Other', value: 5 }
  ];

  const budgetVariance = [
    { category: 'Salaries', budget: 500000, actual: 485000, variance: -15000 },
    { category: 'Bonuses', budget: 50000, actual: 52000, variance: 2000 },
    { category: 'Overtime', budget: 30000, actual: 35000, variance: 5000 },
    { category: 'Benefits', budget: 120000, actual: 118000, variance: -2000 }
  ];

  return (
    <div className="reports-analytics">
      <div className="reports-header">
        <h1>Reports & Analytics</h1>
        <p className="text-muted">Comprehensive payroll reports and analytics</p>
        <div className="flex items-center space-x-4">
          <Input 
            placeholder="Search reports..."
            className="w-48"
          />
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="default">
            Export Report
          </Button>
        </div>
      </div>
      
      <div className="reports-grid">
        {/* Monthly Payroll Summaries */}
        <Card className="monthly-summary-card">
          <CardHeader>
            <h2 className="card-title">
              <BarChart3 className="h-4 w-4 mr-2" /> Monthly Payroll Summary
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Chart placeholder */}
              <div className="h-96 bg-muted rounded">
                Chart will be displayed here
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Month
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gross Pay
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Pay
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Taxes
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deductions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {monthlySummary.map((row, index) => (
                      <tr key={index} className="bg-white">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${row.grossPay.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${row.netPay.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${row.taxes.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${row.deductions.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Labor Cost Analysis */}
        <Card className="labor-cost-card">
          <CardHeader>
            <h2 className="card-title">
              <PieChart className="h-4 w-4 mr-2" /> Labor Cost Analysis
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chart placeholder */}
              <div className="h-96 bg-muted rounded">
                Chart will be displayed here
              </div>
              
              <div className="space-y-4">
                {laborCostByDept.map((dept, index) => (
                  <div key={index} className="dept-item flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center bg-blue-100">
                        {/* We could use a different color for each, but for simplicity */}
                        <TrendingUp className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{dept.name}</h3>
                        <p className="text-sm text-muted">Department</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{dept.value}%</p>
                      <p className="text-sm text-muted">Of total labor cost</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Budget Variance Reports */}
        <Card className="budget-variance-card">
          <CardHeader>
            <h2 className="card-title">
              <TrendingUp className="h-4 w-4 mr-2" /> Budget Variance
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Chart placeholder */}
              <div className="h-96 bg-muted rounded">
                Chart will be displayed here
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Budget
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actual
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {budgetVariance.map((row, index) => (
                      <tr key={index} className="bg-white">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${row.budget.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${row.actual.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.variance >= 0 ? (
                            <span className="text-success">+${row.variance.toLocaleString()}</span>
                          ) : (
                            <span className="text-destructive">-${Math.abs(row.variance).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.variance >= 0 ? (
                            <span className="text-success">+{(row.variance / row.budget * 100).toFixed(1)}%</span>
                          ) : (
                            <span className="text-destructive">-${(Math.abs(row.variance) / row.budget * 100).toFixed(1)}%</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Cash Flow Forecasting */}
        <Card className="cash-flow-card">
          <CardHeader>
            <h2 className="card-title">
              <CreditCard className="h-4 w-4 mr-2" /> Cash Flow Forecasting
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Chart placeholder */}
              <div className="h-96 bg-muted rounded">
                Chart will be displayed here
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Next Payroll Date</h3>
                  <p className="text-sm text-muted">Projected cash outflow</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">$420,000</p>
                  <p className="text-sm text-muted">June 30, 2026</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-muted rounded">
                <p className="text-sm text-muted">
                  Forecast based on historical trends and upcoming payroll cycles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsAnalytics;