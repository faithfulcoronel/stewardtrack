'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Import step components
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import ChurchDetailsStep from '@/components/onboarding/ChurchDetailsStep';
import RBACSetupStep from '@/components/onboarding/RBACSetupStep';
import FeatureTourStep from '@/components/onboarding/FeatureTourStep';
import CompleteStep from '@/components/onboarding/CompleteStep';

const STEPS = [
  { id: 'welcome', title: 'Welcome', component: WelcomeStep },
  { id: 'church-details', title: 'Church Details', component: ChurchDetailsStep },
  { id: 'rbac-setup', title: 'Team Setup', component: RBACSetupStep },
  { id: 'feature-tour', title: 'Feature Tour', component: FeatureTourStep },
  { id: 'complete', title: 'Complete', component: CompleteStep },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [onboardingData, setOnboardingData] = useState<Record<string, any>>({});

  const CurrentStepComponent = STEPS[currentStep].component;
  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;

  async function saveProgress(stepData: any) {
    try {
      const response = await fetch('/api/onboarding/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: STEPS[currentStep].id,
          data: stepData,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save progress');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      throw error;
    }
  }

  async function handleNext(stepData: any) {
    setIsSaving(true);

    try {
      // Save step data to state
      const updatedData = { ...onboardingData, ...stepData };
      setOnboardingData(updatedData);

      // Save progress to server
      await saveProgress(stepData);

      // Move to next step
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error('Error handling next:', error);
      toast.error('Failed to save progress. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  async function handleComplete() {
    setIsSaving(true);

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Onboarding completed! Redirecting to dashboard...');
        router.push('/admin');
      } else {
        throw new Error(result.error || 'Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to StewardTrack
          </h1>
          <p className="text-muted-foreground">
            Let's get your church management system set up
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-8">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex flex-col items-center gap-2 ${
                index <= currentStep ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  index < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index === currentStep
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              <span className="text-xs text-center hidden sm:block max-w-[80px]">
                {step.title}
              </span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{STEPS[currentStep].title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CurrentStepComponent
              data={onboardingData}
              onNext={handleNext}
              onBack={handleBack}
              onComplete={handleComplete}
              isSaving={isSaving}
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
            />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep || isSaving}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Button variant="ghost" onClick={() => router.push('/admin')} disabled={isSaving}>
            Skip for now
          </Button>

          {!isLastStep && (
            <Button onClick={() => handleNext({})} disabled={isSaving}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
