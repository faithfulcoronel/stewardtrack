'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Shield,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  Pencil,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { RoleBasicInfoStep } from './steps/RoleBasicInfoStep';
import { RolePermissionsStep } from './steps/RolePermissionsStep';
import { RoleReviewStep } from './steps/RoleReviewStep';

export interface RoleWizardData {
  id?: string;
  name: string;
  description: string;
  scope: 'tenant' | 'campus' | 'ministry';
  is_delegatable: boolean;
  is_system?: boolean;
  selectedPermissions: string[];
}

export type WizardMode = 'create' | 'edit' | 'view';

interface RoleWizardProps {
  mode?: WizardMode;
  roleId?: string;
  initialData?: Partial<RoleWizardData>;
}

const getSteps = (mode: WizardMode) => [
  {
    id: 1,
    name: 'Basic Info',
    shortName: 'Info',
    description: mode === 'view' ? 'Role name, scope, and settings' : 'Role name, scope, and settings',
  },
  {
    id: 2,
    name: 'Permissions',
    shortName: 'Perms',
    description: mode === 'view' ? 'Permissions assigned to this role' : 'Assign permissions to this role',
  },
  {
    id: 3,
    name: 'Review',
    shortName: 'Review',
    description: mode === 'view' ? 'Role summary' : mode === 'edit' ? 'Review and save changes' : 'Review and create the role',
  },
];

export function RoleWizard({ mode = 'create', roleId, initialData }: RoleWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(mode !== 'create');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [wizardData, setWizardData] = useState<RoleWizardData>({
    name: '',
    description: '',
    scope: 'tenant',
    is_delegatable: false,
    is_system: false,
    selectedPermissions: [],
    ...initialData,
  });

  const STEPS = getSteps(mode);
  const isReadOnly = mode === 'view';
  const isEditMode = mode === 'edit';

  // Load role data when in edit or view mode
  useEffect(() => {
    if ((mode === 'edit' || mode === 'view') && roleId) {
      loadRoleData();
    }
  }, [mode, roleId]);

  const loadRoleData = async () => {
    if (!roleId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch role details
      const roleResponse = await fetch(`/api/rbac/roles/${roleId}`);
      if (!roleResponse.ok) {
        throw new Error('Failed to load role');
      }
      const roleResult = await roleResponse.json();
      const role = roleResult.data;

      // Fetch role permissions
      const permResponse = await fetch(`/api/rbac/roles/${roleId}/permissions`);
      let permissionIds: string[] = [];
      if (permResponse.ok) {
        const permResult = await permResponse.json();
        permissionIds = (permResult.data || []).map((p: { id: string }) => p.id);
      }

      setWizardData({
        id: role.id,
        name: role.name,
        description: role.description || '',
        scope: role.scope,
        is_delegatable: role.is_delegatable || false,
        is_system: role.is_system || false,
        selectedPermissions: permissionIds,
      });
    } catch (err) {
      console.error('Error loading role:', err);
      setError(err instanceof Error ? err.message : 'Failed to load role data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateWizardData = (data: Partial<RoleWizardData>) => {
    if (isReadOnly) return;
    setWizardData((prev) => ({ ...prev, ...data }));
  };

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCancel = () => {
    router.push('/admin/security/rbac/roles');
  };

  const isStepValid = (): boolean => {
    if (isReadOnly) return true;
    switch (currentStep) {
      case 1:
        return wizardData.name.trim().length >= 2;
      case 2:
        return wizardData.selectedPermissions.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (isReadOnly) {
      router.push('/admin/security/rbac/roles');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode && roleId) {
        // Update existing role
        const roleResponse = await fetch(`/api/rbac/roles/${roleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: wizardData.name,
            description: wizardData.description,
            scope: wizardData.scope,
            is_delegatable: wizardData.is_delegatable,
          }),
        });

        if (!roleResponse.ok) {
          const errorData = await roleResponse.json();
          throw new Error(errorData.error || 'Failed to update role');
        }

        // Update permissions (replace all)
        const permResponse = await fetch(`/api/rbac/roles/${roleId}/permissions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permission_ids: wizardData.selectedPermissions,
          }),
        });

        if (!permResponse.ok) {
          const errorData = await permResponse.json();
          throw new Error(errorData.error || 'Failed to update permissions');
        }

        setSuccess(true);
        toast({
          title: 'Role Updated',
          description: `Successfully updated role "${wizardData.name}".`,
        });
      } else {
        // Create new role
        const roleResponse = await fetch('/api/rbac/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: wizardData.name,
            description: wizardData.description,
            scope: wizardData.scope,
            is_delegatable: wizardData.is_delegatable,
          }),
        });

        if (!roleResponse.ok) {
          const errorData = await roleResponse.json();
          throw new Error(errorData.error || 'Failed to create role');
        }

        const roleResult = await roleResponse.json();
        const newRoleId = roleResult.data?.id;

        if (!newRoleId) {
          throw new Error('Role created but no ID returned');
        }

        // Assign permissions to the role (with retry logic)
        if (wizardData.selectedPermissions.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));

          const assignPermissions = async (retryCount = 0): Promise<void> => {
            const permResponse = await fetch(`/api/rbac/roles/${newRoleId}/permissions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                permission_ids: wizardData.selectedPermissions,
              }),
            });

            if (!permResponse.ok) {
              const errorData = await permResponse.json();
              if (retryCount < 2 && errorData.error?.includes('not found')) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return assignPermissions(retryCount + 1);
              }
              throw new Error(errorData.error || 'Failed to assign permissions to role');
            }
          };

          await assignPermissions();
        }

        setSuccess(true);
        toast({
          title: 'Role Created',
          description: `Successfully created role "${wizardData.name}" with ${wizardData.selectedPermissions.length} permissions.`,
        });
      }

      setTimeout(() => {
        router.push('/admin/security/rbac/roles');
      }, 2000);
    } catch (err: unknown) {
      console.error('Error saving role:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <RoleBasicInfoStep
            data={wizardData}
            onUpdate={updateWizardData}
            readOnly={isReadOnly}
          />
        );
      case 2:
        return (
          <RolePermissionsStep
            data={wizardData}
            onUpdate={updateWizardData}
            readOnly={isReadOnly}
          />
        );
      case 3:
        return <RoleReviewStep data={wizardData} mode={mode} />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'view':
        return 'View Role';
      case 'edit':
        return 'Edit Role';
      default:
        return 'Create New Role';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'view':
        return 'Review role details and permissions';
      case 'edit':
        return 'Modify role settings and permissions';
      default:
        return 'Define a new role with permissions for access control';
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'view':
        return <Eye className="h-6 w-6 text-primary" />;
      case 'edit':
        return <Pencil className="h-6 w-6 text-primary" />;
      default:
        return <Shield className="h-6 w-6 text-primary" />;
    }
  };

  const getSubmitLabel = () => {
    if (isSubmitting) {
      return isEditMode ? 'Saving...' : 'Creating...';
    }
    switch (mode) {
      case 'view':
        return 'Close';
      case 'edit':
        return 'Save Changes';
      default:
        return 'Create Role';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">Loading role data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-green-100 dark:bg-green-900/50 p-3">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
                {isEditMode ? 'Role Updated Successfully!' : 'Role Created Successfully!'}
              </h2>
              <p className="text-green-700 dark:text-green-300 mb-4">
                {isEditMode
                  ? `Role "${wizardData.name}" has been updated.`
                  : `Your new role "${wizardData.name}" has been created with ${wizardData.selectedPermissions.length} permissions.`}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Redirecting to roles list...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            {getIcon()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{getTitle()}</h1>
            <p className="text-muted-foreground">{getDescription()}</p>
          </div>
        </div>
        {wizardData.is_system && (
          <Alert className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              This is a system role. {isEditMode ? 'Some fields may be restricted.' : 'System roles are managed by platform administrators.'}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-auto p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Wizard Card */}
      <Card>
        <CardHeader className="pb-4">
          {/* Progress Section */}
          <div className="space-y-4">
            {/* Step Indicators */}
            <div className="flex justify-between items-center">
              {STEPS.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;

                return (
                  <div key={step.id} className="flex items-center flex-1">
                    {/* Step Circle */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(step.id)}
                        disabled={!isCompleted && !isActive}
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          text-sm font-semibold transition-all duration-200
                          ${isCompleted ? 'cursor-pointer hover:ring-2 hover:ring-green-400' : ''}
                          ${
                            isCompleted
                              ? 'bg-green-600 text-white'
                              : isActive
                              ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                          }
                        `}
                      >
                        {isCompleted ? <Check className="h-5 w-5" /> : step.id}
                      </button>
                      <span
                        className={`
                          mt-2 text-xs font-medium text-center hidden sm:block
                          ${
                            isActive
                              ? 'text-primary'
                              : isCompleted
                              ? 'text-green-600'
                              : 'text-muted-foreground'
                          }
                        `}
                      >
                        {step.name}
                      </span>
                      <span
                        className={`
                          mt-2 text-xs font-medium text-center sm:hidden
                          ${
                            isActive
                              ? 'text-primary'
                              : isCompleted
                              ? 'text-green-600'
                              : 'text-muted-foreground'
                          }
                        `}
                      >
                        {step.shortName}
                      </span>
                    </div>

                    {/* Connector Line */}
                    {index < STEPS.length - 1 && (
                      <div
                        className={`
                          flex-1 h-0.5 mx-2 sm:mx-4 transition-colors duration-200
                          ${isCompleted ? 'bg-green-600' : 'bg-muted'}
                        `}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <Progress value={progress} className="h-2" />

            {/* Current Step Description */}
            <div className="text-center pt-2">
              <CardTitle className="text-lg">{STEPS[currentStep - 1].name}</CardTitle>
              <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Step Content */}
          <div className="min-h-[400px] py-4">{renderStep()}</div>

          {/* Navigation Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 border-t">
            {/* Left Side - Cancel/Back */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none"
              >
                {isReadOnly ? 'Close' : 'Cancel'}
              </Button>
              {currentStep > 1 && (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
            </div>

            {/* Right Side - Next/Submit */}
            <div>
              {currentStep < STEPS.length ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid() || isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={(!isStepValid() || isSubmitting) && !isReadOnly}
                  className="w-full sm:w-auto"
                  variant={isReadOnly ? 'outline' : 'default'}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">
                        <svg
                          className="h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </span>
                      {getSubmitLabel()}
                    </>
                  ) : (
                    <>
                      {!isReadOnly && <Check className="h-4 w-4 mr-1" />}
                      {getSubmitLabel()}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
