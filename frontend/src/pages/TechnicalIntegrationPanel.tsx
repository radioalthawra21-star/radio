import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Github, Database, Zap, Shield, Settings, Server, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const TechnicalIntegrationPanel: React.FC = () => {
  // Mock integration status data
  const integrations = [
    { 
      name: 'HRIS System (Workday)', 
      status: 'connected', 
      lastSync: '2026-05-03 08:30:00', 
      details: 'Employee master data sync' 
    },
    { 
      name: 'ERP System (SAP)', 
      status: 'connected', 
      lastSync: '2026-05-03 07:45:00', 
      details: 'Financial journal entry sync' 
    },
    { 
      name: 'Banking Interface (ACH)', 
      status: 'connected', 
      lastSync: '2026-05-02 16:00:00', 
      details: 'Direct deposit file transmission' 
    },
    { 
      name: 'Time Tracking System', 
      status: 'warning', 
      lastSync: '2026-05-02 20:15:00', 
      details: 'Hours data import - minor delays' 
    },
    { 
      name: 'Benefits Provider (Aetna)', 
      status: 'disconnected', 
      lastSync: '2026-05-01 14:30:00', 
      details: 'Benefits deductions sync - connection error' 
    }
  ];

  // Mock security configurations
  const securityConfigs = [
    { 
      name: 'Multi-Factor Authentication', 
      status: 'enabled', 
      description: 'Required for all admin and payroll processing users' 
    },
    { 
      name: 'Data Encryption at Rest', 
      status: 'enabled', 
      description: 'AES-256 encryption for all sensitive payroll data' 
    },
    { 
      name: 'Data Encryption in Transit', 
      status: 'enabled', 
      description: 'TLS 1.3 for all API communications' 
    },
    { 
      name: 'Role-Based Access Control', 
      status: 'enabled', 
      description: 'Fine-grained permissions based on job functions' 
    },
    { 
      name: 'Session Timeout', 
      status: 'enabled', 
      description: 'Automatic logout after 30 minutes of inactivity' 
    },
    { 
      name: 'Audit Logging', 
      status: 'enabled', 
      description: 'Complete audit trail for all system activities' 
    }
  ];

  return (
    <div className="technical-integration-panel">
      <div className="integration-header">
        <h1>Technical Integration Panel</h1>
        <p className="text-muted">System architecture, integration status, and security configurations</p>
      </div>
      
      <div className="integration-grid">
        {/* System Architecture Visualization */}
        <Card className="architecture-card">
          <CardHeader>
            <h2 className="card-title">
              <Server className="h-4 w-4 mr-2" /> System Architecture
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="architecture-item">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <Server className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Application Layer</h3>
                    <p className="text-sm text-muted">React frontend with Node.js/Express backend</p>
                  </div>
                </div>
              </div>
              
              <div className="architecture-item">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                    <Database className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Data Layer</h3>
                    <p className="text-sm text-muted">PostgreSQL database with read replicas</p>
                  </div>
                </div>
              </div>
              
              <div className="architecture-item">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded flex items-center justify-center">
                    <Zap className="text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Integration Layer</h3>
                    <p className="text-sm text-muted">REST APIs and SFTP for external systems</p>
                  </div>
                </div>
              </div>
              
              <div className="architecture-item">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                    <Shield className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Security Layer</h3>
                    <p className="text-sm text-muted">OAuth2, JWT, and encryption protocols</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Integration Status */}
        <Card className="integration-status-card">
          <CardHeader>
            <h2 className="card-title">
              <Github className="h-4 w-4 mr-2" /> Integration Status
            </h2>
            <div className="flex items-center space-x-2">
              <Input 
                placeholder="Search integrations..."
                className="w-48"
              />
              <Button variant="outline" size="sm">
                <Zap className="h-4 w-4 mr-2" /> Test Connections
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div key={integration.name} className="integration-item p-4 border rounded">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center">
                        {integration.status === 'connected' ? (
                          <Database className="text-green-600" />
                        ) : integration.status === 'warning' ? (
                          <Zap className="text-yellow-600" />
                        ) : (
                          <Server className="text-red-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{integration.name}</h3>
                        <p className="text-sm text-muted">{integration.details}</p>
                      </div>
                    </div>
                    <div className="text-right space-x-2">
                      <Badge 
                        variant={integration.status === 'connected' ? 'success' : integration.status === 'warning' ? 'warning' : 'destructive'}
                      >
                        {integration.status.toUpperCase()}
                      </Badge>
                      <p className="text-xs text-muted mt-1">
                        Last sync: {integration.lastSync}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-end mt-6">
                <Button variant="default">
                  Add New Integration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Security Configurations */}
        <Card className="security-card">
          <CardHeader>
            <h2 className="card-title">
              <Shield className="h-4 w-4 mr-2" /> Security Configurations
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityConfigs.map((config) => (
                <div key={config.name} className="security-item flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center">
                      {config.status === 'enabled' ? (
                        <Check className="text-green-600" />
                      ) : (
                        <X className="text-red-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{config.name}</h3>
                      <p className="text-sm text-muted">{config.description}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={config.status === 'enabled' ? 'success' : 'destructive'}
                  >
                    {config.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TechnicalIntegrationPanel;