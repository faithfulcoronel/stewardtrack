'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Key,
  Users,
  Building,
  Church,
  Globe,
  Info,
  BookOpen,
  Shield,
  Settings,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Permission, CreatePermissionBundleDto } from '@/models/rbac.model';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface BundleTemplate {
  id: string;
  name: string;
  description: string;
  scope: string;
  targetSize: 'small' | 'medium' | 'large';
  modules: string[];
  permissions: string[];
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'template',
    title: 'Choose Template',
    description: 'Select a pre-built template or start from scratch',
    icon: <BookOpen className="h-5 w-5" />
  },
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Define bundle name, scope, and description',
    icon: <Info className="h-5 w-5" />
  },
  {
    id: 'permissions',
    title: 'Select Permissions',
    description: 'Choose permissions for your bundle',
    icon: <Key className="h-5 w-5" />
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Review your bundle and create it',
    icon: <Check className="h-5 w-5" />
  }
];

const BUNDLE_TEMPLATES: BundleTemplate[] = [
  {
    id: 'worship-leader',
    name: 'Worship Leader',
    description: 'Permissions for managing worship services and music ministry',
    scope: 'ministry',
    targetSize: 'small',
    modules: ['worship', 'events', 'media'],
    permissions: ['worship.songs.view', 'worship.setlists.manage', 'events.services.view', 'media.upload']
  },
  {
    id: 'volunteer-coordinator',
    name: 'Volunteer Coordinator',
    description: 'Manage volunteers and service assignments across ministries',
    scope: 'campus',
    targetSize: 'medium',
    modules: ['volunteers', 'members', 'events', 'scheduling'],
    permissions: ['volunteers.manage', 'members.view', 'events.volunteer.assign', 'scheduling.create']
  },
  {
    id: 'campus-pastor',
    name: 'Campus Pastor',
    description: 'Full campus management with limited financial access',
    scope: 'campus',
    targetSize: 'large',
    modules: ['members', 'events', 'small-groups', 'volunteers', 'reporting'],
    permissions: ['members.manage', 'events.manage', 'groups.manage', 'volunteers.manage', 'reports.view']
  },
  {
    id: 'financial-admin',
    name: 'Financial Administrator',
    description: 'Comprehensive financial management and reporting',
    scope: 'tenant',
    targetSize: 'medium',
    modules: ['finance', 'reporting', 'donors', 'budgets'],
    permissions: ['finance.manage', 'reports.financial', 'donors.view', 'budgets.manage']
  },
  {
    id: 'youth-leader',
    name: 'Youth Ministry Leader',
    description: 'Youth-specific ministry management',
    scope: 'ministry',
    targetSize: 'small',
    modules: ['youth', 'events', 'members', 'communication'],
    permissions: ['youth.manage', 'events.youth.manage', 'members.youth.view', 'communication.youth.send']
  }
];

export function BundleComposer() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<BundleTemplate | null>(null);
  const [bundleData, setBundleData] = useState<CreatePermissionBundleDto>({
    name: '',
    description: '',
    scope: 'tenant',
    is_template: false,
    permission_ids: []
  });
  const [permissionsByModule, setPermissionsByModule] = useState<Record<string, Permission[]>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, warnings: [], suggestions: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [churchSize, setChurchSize] = useState<'small' | 'medium' | 'large'>('medium');

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    validateBundle();
  }, [bundleData, selectedPermissions]);

  const loadPermissions = async () => {
    try {
      const response = await fetch('/api/rbac/permissions?groupByModule=true');
      const result = await response.json();

      if (result.success) {
        setPermissionsByModule(result.data);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('Failed to load permissions');
    }
  };

  const validateBundle = () => {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for conflicting permissions
    const sensitiveModules = ['admin', 'finance', 'security'];
    const hasFinancialPerms = Array.from(selectedPermissions).some(id => {
      const permission = Object.values(permissionsByModule).flat().find(p => p.id === id);
      return permission && sensitiveModules.includes(permission.module);
    });

    if (hasFinancialPerms && bundleData.scope !== 'tenant') {
      warnings.push('Financial permissions should typically be limited to tenant scope');
    }

    // Check bundle size
    if (selectedPermissions.size > 15 && bundleData.scope === 'ministry') {
      warnings.push('Large number of permissions for ministry scope may indicate overly broad access');
    }

    // Provide suggestions based on church size
    if (churchSize === 'small' && selectedPermissions.size > 10) {
      suggestions.push('Consider creating simpler bundles for small church management');
    }

    if (churchSize === 'large' && selectedPermissions.size < 5) {
      suggestions.push('Large churches may benefit from more comprehensive permission bundles');
    }

    setValidation({
      isValid: warnings.length === 0,
      warnings,
      suggestions
    });
  };

  const handleTemplateSelect = (template: BundleTemplate | null) => {
    setSelectedTemplate(template);

    if (template) {
      setBundleData({
        name: template.name,
        description: template.description,
        scope: template.scope as any,
        is_template: false,
        permission_ids: []
      });

      // Select template permissions
      const templatePermissionIds = new Set(template.permissions);
      const availableIds = new Set(Object.values(permissionsByModule).flat().map(p => p.id));
      const validIds = new Set([...templatePermissionIds].filter(id => availableIds.has(id)));

      setSelectedPermissions(validIds);
    }
  };

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    const newSelected = new Set(selectedPermissions);

    if (checked) {
      newSelected.add(permissionId);
    } else {
      newSelected.delete(permissionId);
    }

    setSelectedPermissions(newSelected);
  };

  const handleModuleToggle = (module: string, permissions: Permission[], checked: boolean) => {
    const newSelected = new Set(selectedPermissions);

    permissions.forEach(permission => {
      if (checked) {
        newSelected.add(permission.id);
      } else {
        newSelected.delete(permission.id);
      }
    });

    setSelectedPermissions(newSelected);
  };

  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validation.isValid) {
      toast.error('Please resolve validation issues before creating the bundle');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/rbac/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bundleData,
          permission_ids: Array.from(selectedPermissions)
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Permission bundle created successfully!');
        // Reset wizard
        setCurrentStep(0);
        setSelectedTemplate(null);
        setBundleData({
          name: '',
          description: '',
          scope: 'tenant',
          is_template: false,
          permission_ids: []
        });
        setSelectedPermissions(new Set());
      } else {
        toast.error(result.error || 'Failed to create bundle');
      }
    } catch (error) {
      console.error('Error creating bundle:', error);
      toast.error('Failed to create permission bundle');
    } finally {
      setIsLoading(false);
    }
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'system': return <Globe className="h-4 w-4" />;
      case 'tenant': return <Building className="h-4 w-4" />;
      case 'campus': return <Church className="h-4 w-4" />;
      case 'ministry': return <Users className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'system': return 'bg-red-100 text-red-800 border-red-200';
      case 'tenant': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'campus': return 'bg-green-100 text-green-800 border-green-200';
      case 'ministry': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2
              ${index <= currentStep
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-100 text-gray-400 border-gray-300'
              }
            `}>
              {index < currentStep ? (
                <Check className="h-5 w-5" />
              ) : (
                step.icon
              )}
            </div>
            <div className="text-center">
              <p className={`text-sm font-medium ${index <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.title}
              </p>
              <p className="text-xs text-gray-500 max-w-24">
                {step.description}
              </p>
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div className={`
                hidden md:block absolute top-5 left-1/2 w-full h-0.5 -z-10
                ${index < currentStep ? 'bg-blue-600' : 'bg-gray-300'}
              `} style={{ transform: 'translateX(-50%)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderTemplateStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Church Size Context</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant={churchSize === 'small' ? 'default' : 'outline'}
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => setChurchSize('small')}
            >
              <Church className="h-6 w-6" />
              <div className="text-center">
                <p className="font-medium">Small Church</p>
                <p className="text-xs opacity-75">Under 200 members</p>
              </div>
            </Button>

            <Button
              variant={churchSize === 'medium' ? 'default' : 'outline'}
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => setChurchSize('medium')}
            >
              <Building className="h-6 w-6" />
              <div className="text-center">
                <p className="font-medium">Medium Church</p>
                <p className="text-xs opacity-75">200-1000 members</p>
              </div>
            </Button>

            <Button
              variant={churchSize === 'large' ? 'default' : 'outline'}
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => setChurchSize('large')}
            >
              <Globe className="h-6 w-6" />
              <div className="text-center">
                <p className="font-medium">Large/Multi-site</p>
                <p className="text-xs opacity-75">1000+ members</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Choose a Template</h3>
          <Button
            variant="outline"
            onClick={() => handleTemplateSelect(null)}
            className={!selectedTemplate ? 'border-blue-500 text-blue-600' : ''}
          >
            Start from Scratch
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BUNDLE_TEMPLATES
            .filter(template => !churchSize || template.targetSize === churchSize || template.targetSize === 'medium')
            .map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-colors hover:border-blue-300 ${
                  selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleTemplateSelect(template)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{template.name}</h4>
                    <Badge variant="outline" className={getScopeColor(template.scope)}>
                      <span className="flex items-center gap-1">
                        {getScopeIcon(template.scope)}
                        {template.scope}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.modules.slice(0, 3).map((module) => (
                      <Badge key={module} variant="secondary" className="text-xs">
                        {module}
                      </Badge>
                    ))}
                    {template.modules.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{template.modules.length - 3} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );

  const renderBasicInfoStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bundle Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bundle-name">Bundle Name *</Label>
            <Input
              id="bundle-name"
              value={bundleData.name}
              onChange={(e) => setBundleData({ ...bundleData, name: e.target.value })}
              placeholder="Enter a descriptive name for this bundle"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="bundle-description">Description</Label>
            <Textarea
              id="bundle-description"
              value={bundleData.description}
              onChange={(e) => setBundleData({ ...bundleData, description: e.target.value })}
              placeholder="Describe what this bundle is intended for and who should use it"
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="bundle-scope">Scope *</Label>
            <Select
              value={bundleData.scope}
              onValueChange={(value: any) => setBundleData({ ...bundleData, scope: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Tenant</p>
                      <p className="text-xs text-gray-500">Organization-wide access</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="campus">
                  <div className="flex items-center gap-2">
                    <Church className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Campus</p>
                      <p className="text-xs text-gray-500">Single campus or site</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="ministry">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Ministry</p>
                      <p className="text-xs text-gray-500">Specific ministry or department</p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-template"
              checked={bundleData.is_template}
              onCheckedChange={(checked) => setBundleData({ ...bundleData, is_template: !!checked })}
            />
            <Label htmlFor="is-template" className="text-sm">
              Make this a template bundle (can be reused across tenants)
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPermissionsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Select Permissions ({selectedPermissions.size} selected)
        </h3>
        <div className="text-sm text-gray-500">
          Organize permissions by module for better management
        </div>
      </div>

      <Tabs defaultValue={Object.keys(permissionsByModule)[0]} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {Object.keys(permissionsByModule).slice(0, 6).map((module) => (
            <TabsTrigger key={module} value={module} className="text-xs">
              {module}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(permissionsByModule).map(([module, permissions]) => (
          <TabsContent key={module} value={module}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base capitalize">{module} Module</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`select-all-${module}`}
                      checked={permissions.every(p => selectedPermissions.has(p.id))}
                      onCheckedChange={(checked) => handleModuleToggle(module, permissions, !!checked)}
                    />
                    <Label htmlFor={`select-all-${module}`} className="text-sm">
                      Select All
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.has(permission.id)}
                        onCheckedChange={(checked) => handlePermissionToggle(permission.id, !!checked)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={permission.id} className="font-medium text-sm cursor-pointer">
                          {permission.name}
                        </Label>
                        {permission.description && (
                          <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {permission.code}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {permission.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Validation Alerts */}
      {validation.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warnings:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.suggestions.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Suggestions:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {validation.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm">{suggestion}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Bundle Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Bundle Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Name</Label>
              <p className="text-sm text-gray-900">{bundleData.name || 'Unnamed Bundle'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Scope</Label>
              <Badge variant="outline" className={getScopeColor(bundleData.scope)}>
                <span className="flex items-center gap-1">
                  {getScopeIcon(bundleData.scope)}
                  {bundleData.scope}
                </span>
              </Badge>
            </div>
          </div>

          {bundleData.description && (
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-gray-600">{bundleData.description}</p>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">
              Permissions ({selectedPermissions.size} total)
            </Label>
            <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg">
              {Object.entries(permissionsByModule).map(([module, permissions]) => {
                const modulePermissions = permissions.filter(p => selectedPermissions.has(p.id));
                if (modulePermissions.length === 0) return null;

                return (
                  <div key={module} className="p-3 border-b last:border-b-0">
                    <h4 className="font-medium text-sm capitalize mb-2">{module} Module</h4>
                    <div className="space-y-1">
                      {modulePermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between text-sm">
                          <span>{permission.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {permission.code}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {renderProgressBar()}

      <div className="min-h-[600px]">
        {currentStep === 0 && renderTemplateStep()}
        {currentStep === 1 && renderBasicInfoStep()}
        {currentStep === 2 && renderPermissionsStep()}
        {currentStep === 3 && renderReviewStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="text-sm text-gray-500">
          Step {currentStep + 1} of {WIZARD_STEPS.length}
        </div>

        {currentStep < WIZARD_STEPS.length - 1 ? (
          <Button
            onClick={nextStep}
            disabled={
              (currentStep === 1 && !bundleData.name) ||
              (currentStep === 2 && selectedPermissions.size === 0)
            }
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!validation.isValid || selectedPermissions.size === 0 || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Bundle'}
            <Check className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}