'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { BasicInfoStep } from './wizard/BasicInfoStep';
import { PermissionDefinitionStep } from './wizard/PermissionDefinitionStep';
import { RoleTemplateStep } from './wizard/RoleTemplateStep';
import { ReviewStep } from './wizard/ReviewStep';

export interface WizardData {
  // Step 1: Basic Info
  name: string;
  description: string;
  tier: 'essential' | 'professional' | 'enterprise' | 'premium';
  category: string;
  feature_code?: string;  // NEW: Feature code for metadata mapping

  // Step 2: Permissions
  permissions: Array<{
    permission_code: string;
    display_name: string;
    description: string;
    is_required: boolean;
    display_order: number;
  }>;

  // Step 3: Role Templates (per permission)
  roleTemplates: Record<string, Array<{
    role_key: string;
    is_recommended: boolean;
    reason?: string;
  }>>;
}

const STEPS = [
  { id: 1, name: 'Basic Info', description: 'Feature details and tier' },
  { id: 2, name: 'Permissions', description: 'Define permission codes' },
  { id: 3, name: 'Role Templates', description: 'Assign default roles' },
  { id: 4, name: 'Review', description: 'Review and create' },
];

export type WizardMode = 'create' | 'edit' | 'view';

interface FeaturePermissionWizardProps {
  mode?: WizardMode;
  featureId?: string;
  onComplete: (data: WizardData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<WizardData>;
}

export function FeaturePermissionWizard({
  mode = 'create',
  featureId,
  onComplete,
  onCancel,
  initialData,
}: FeaturePermissionWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardData, setWizardData] = useState<WizardData>({
    name: '',
    description: '',
    tier: 'professional',
    category: '',
    feature_code: '',
    permissions: [],
    roleTemplates: {},
    ...initialData,
  });

  const isReadOnly = mode === 'view';
  const isEditMode = mode === 'edit';

  // Update wizard data when initialData changes (for edit/view modes)
  useEffect(() => {
    if (initialData) {
      setWizardData((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData]);

  const updateWizardData = (data: Partial<WizardData>) => {
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

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(wizardData);
    } catch (error) {
      console.error('Error completing wizard:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={handleNext}
            mode={mode}
          />
        );
      case 2:
        return (
          <PermissionDefinitionStep
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={handleNext}
            onBack={handleBack}
            mode={mode}
          />
        );
      case 3:
        return (
          <RoleTemplateStep
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={handleNext}
            onBack={handleBack}
            mode={mode}
          />
        );
      case 4:
        return (
          <ReviewStep
            data={wizardData}
            onSubmit={handleComplete}
            onBack={handleBack}
            isSubmitting={isSubmitting}
            mode={mode}
          />
        );
      default:
        return null;
    }
  };

  const getWizardTitle = () => {
    switch (mode) {
      case 'view':
        return 'View Feature with Permissions';
      case 'edit':
        return 'Edit Feature with Permissions';
      default:
        return 'Create Feature with Permissions';
    }
  };

  const getWizardDescription = () => {
    switch (mode) {
      case 'view':
        return 'Review feature details, permission structure, and role templates';
      case 'edit':
        return 'Update feature with permission structure and role templates';
      default:
        return 'Define a new feature with permission structure and role templates';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getWizardTitle()}</CardTitle>
        <CardDescription>
          {getWizardDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    step.id === currentStep
                      ? 'text-primary'
                      : step.id < currentStep
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                      step.id === currentStep
                        ? 'bg-primary text-primary-foreground'
                        : step.id < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current Step Description */}
          <div className="mb-6 text-center">
            <h3 className="text-lg font-semibold">
              {STEPS[currentStep - 1].name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {STEPS[currentStep - 1].description}
            </p>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">{renderStep()}</div>

          {/* Cancel/Close Button */}
          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              {isReadOnly ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}
