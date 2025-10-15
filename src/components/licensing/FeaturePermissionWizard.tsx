'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { BasicInfoStep } from './wizard/BasicInfoStep';
import { SurfaceAssociationStep } from './wizard/SurfaceAssociationStep';
import { PermissionDefinitionStep } from './wizard/PermissionDefinitionStep';
import { RoleTemplateStep } from './wizard/RoleTemplateStep';
import { ReviewStep } from './wizard/ReviewStep';

export interface WizardData {
  // Step 1: Basic Info
  name: string;
  description: string;
  tier: 'essential' | 'professional' | 'enterprise' | 'premium';
  category: string;

  // Step 2: Surface Association
  surface_id: string;
  surface_type: 'page' | 'dashboard' | 'wizard' | 'manager' | 'console' | 'audit' | 'overlay';
  module: string;

  // Step 3: Permissions
  permissions: Array<{
    permission_code: string;
    display_name: string;
    description: string;
    is_required: boolean;
    display_order: number;
  }>;

  // Step 4: Role Templates (per permission)
  roleTemplates: Record<string, Array<{
    role_key: string;
    is_recommended: boolean;
    reason?: string;
  }>>;
}

const STEPS = [
  { id: 1, name: 'Basic Info', description: 'Feature details and tier' },
  { id: 2, name: 'Surface', description: 'Associate with metadata surface' },
  { id: 3, name: 'Permissions', description: 'Define permission codes' },
  { id: 4, name: 'Role Templates', description: 'Assign default roles' },
  { id: 5, name: 'Review', description: 'Review and create' },
];

interface FeaturePermissionWizardProps {
  onComplete: (data: WizardData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<WizardData>;
}

export function FeaturePermissionWizard({
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
    surface_id: '',
    surface_type: 'page',
    module: '',
    permissions: [],
    roleTemplates: {},
    ...initialData,
  });

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
          />
        );
      case 2:
        return (
          <SurfaceAssociationStep
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <PermissionDefinitionStep
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <RoleTemplateStep
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <ReviewStep
            data={wizardData}
            onSubmit={handleComplete}
            onBack={handleBack}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Feature with Permissions</CardTitle>
          <CardDescription>
            Define a new feature with surface association and permission structure
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

          {/* Cancel Button */}
          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
