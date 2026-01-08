'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { RoleBasicInfoStep } from './steps/RoleBasicInfoStep';
import { RolePermissionsStep } from './steps/RolePermissionsStep';
import { RoleReviewStep } from './steps/RoleReviewStep';

export interface RoleWizardData {
  name: string;
  description: string;
  scope: 'tenant' | 'campus' | 'ministry';
  is_delegatable: boolean;
  selectedPermissions: string[];
}

const STEPS = [
  {
    id: 1,
    name: 'Basic Info',
    shortName: 'Info',
    description: 'Role name, scope, and settings',
  },
  {
    id: 2,
    name: 'Permissions',
    shortName: 'Perms',
    description: 'Assign permissions to this role',
  },
  {
    id: 3,
    name: 'Review',
    shortName: 'Review',
    description: 'Review and create the role',
  },
];

export function RoleCreationWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [wizardData, setWizardData] = useState<RoleWizardData>({
    name: '',
    description: '',
    scope: 'tenant',
    is_delegatable: false,
    selectedPermissions: [],
  });

  const updateWizardData = (data: Partial<RoleWizardData>) => {
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
    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Create the role
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
      const roleId = roleResult.data?.id;

      if (!roleId) {
        throw new Error('Role created but no ID returned');
      }

      // Step 2: Assign permissions to the role (with retry logic)
      if (wizardData.selectedPermissions.length > 0) {
        // Small delay to ensure role is fully propagated in database
        await new Promise(resolve => setTimeout(resolve, 500));

        const assignPermissions = async (retryCount = 0): Promise<void> => {
          const permResponse = await fetch(`/api/rbac/roles/${roleId}/permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              permission_ids: wizardData.selectedPermissions,
            }),
          });

          if (!permResponse.ok) {
            const errorData = await permResponse.json();
            // Retry once if role not found (timing issue)
            if (retryCount < 2 && errorData.error?.includes('not found')) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              return assignPermissions(retryCount + 1);
            }
            throw new Error(errorData.error || 'Failed to assign permissions to role');
          }
        };

        await assignPermissions();
      }

      // Success!
      setSuccess(true);
      toast({
        title: 'Role Created',
        description: `Successfully created role "${wizardData.name}" with ${wizardData.selectedPermissions.length} permissions.`,
      });

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin/security/rbac/roles');
      }, 2000);
    } catch (err: unknown) {
      console.error('Error creating role:', err);
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
        return <RoleBasicInfoStep data={wizardData} onUpdate={updateWizardData} />;
      case 2:
        return <RolePermissionsStep data={wizardData} onUpdate={updateWizardData} />;
      case 3:
        return <RoleReviewStep data={wizardData} />;
      default:
        return null;
    }
  };

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
                Role Created Successfully!
              </h2>
              <p className="text-green-700 dark:text-green-300 mb-4">
                Your new role &quot;{wizardData.name}&quot; has been created with{' '}
                {wizardData.selectedPermissions.length} permissions.
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
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create New Role</h1>
            <p className="text-muted-foreground">
              Define a new role with permissions for access control
            </p>
          </div>
        </div>
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
                      <div
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          text-sm font-semibold transition-all duration-200
                          ${
                            isCompleted
                              ? 'bg-green-600 text-white'
                              : isActive
                              ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                              : 'bg-muted text-muted-foreground'
                          }
                        `}
                      >
                        {isCompleted ? <Check className="h-5 w-5" /> : step.id}
                      </div>
                      {/* Step Name - Hidden on mobile, shown on tablet+ */}
                      <span
                        className={`
                          mt-2 text-xs font-medium text-center
                          hidden sm:block
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
                      {/* Short Name - Shown on mobile only */}
                      <span
                        className={`
                          mt-2 text-xs font-medium text-center
                          sm:hidden
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
                Cancel
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

            {/* Right Side - Next/Create */}
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
                  disabled={!isStepValid() || isSubmitting}
                  className="w-full sm:w-auto"
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Create Role
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
