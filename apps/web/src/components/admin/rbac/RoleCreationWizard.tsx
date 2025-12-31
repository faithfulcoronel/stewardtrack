'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { BasicInfoStep } from './wizard/BasicInfoStep';
import { PermissionsStep } from './wizard/PermissionsStep';
import { UsersStep } from './wizard/UsersStep';
import { ReviewStep } from './wizard/ReviewStep';

export interface RoleFormData {
  name: string;
  description: string;
  scope: 'system' | 'tenant' | 'campus' | 'ministry';
  is_delegatable: boolean;
  selectedPermissions: string[];
  selectedUsers: string[];
}

interface RoleCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function RoleCreationWizard({ isOpen, onClose, onComplete }: RoleCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    scope: 'tenant',
    is_delegatable: false,
    selectedPermissions: [],
    selectedUsers: [],
  });

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Role name and details' },
    { number: 2, title: 'Permissions', description: 'Assign permissions' },
    { number: 3, title: 'Users', description: 'Link users (optional)' },
    { number: 4, title: 'Review', description: 'Review and create' },
  ];

  const updateFormData = (data: Partial<RoleFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Create role
      const roleResponse = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          scope: formData.scope,
          is_delegatable: formData.is_delegatable,
        }),
      });

      if (!roleResponse.ok) {
        throw new Error('Failed to create role');
      }

      const { data: role } = await roleResponse.json();

      // Assign permissions to role
      if (formData.selectedPermissions.length > 0) {
        await fetch(`/api/rbac/roles/${role.id}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permission_ids: formData.selectedPermissions,
          }),
        });
      }

      // Assign users to role
      if (formData.selectedUsers.length > 0) {
        await Promise.all(
          formData.selectedUsers.map(userId =>
            fetch(`/api/rbac/users/${userId}/roles`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role_id: role.id }),
            })
          )
        );
      }

      // Success
      onComplete();
      handleClose();
    } catch (error) {
      console.error('Error creating role:', error);
      alert('Failed to create role. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      name: '',
      description: '',
      scope: 'tenant',
      is_delegatable: false,
      selectedPermissions: [],
      selectedUsers: [],
    });
    onClose();
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.selectedPermissions.length > 0;
      case 3:
        return true; // Optional step
      case 4:
        return true;
      default:
        return false;
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Role</DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-gray-600">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex items-center gap-2 ${
                  currentStep === step.number
                    ? 'text-blue-600 font-semibold'
                    : currentStep > step.number
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                {currentStep > step.number ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-current text-xs">
                    {step.number}
                  </span>
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="py-6">
          {currentStep === 1 && (
            <BasicInfoStep formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 2 && (
            <PermissionsStep formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 3 && (
            <UsersStep formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 4 && <ReviewStep formData={formData} />}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>

            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={!isStepValid() || isSubmitting}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!isStepValid() || isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Role'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
