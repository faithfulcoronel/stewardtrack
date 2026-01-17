'use client';

import React, { useState, useCallback } from 'react';
import NextImage from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Users,
  Upload,
  Image,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

import { InviteTeamStep } from './steps/InviteTeamStep';
import { ImportMembersStep } from './steps/ImportMembersStep';
import { PersonalizeStep } from './steps/PersonalizeStep';
import { OnboardingProgress } from './OnboardingProgress';
import { CompletionCelebration } from './CompletionCelebration';

// ============================================================================
// Types
// ============================================================================

export interface OnboardingStepConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  optional: boolean;
}

export interface OnboardingWizardProps {
  tenantName?: string;
  onComplete: () => void;
  initialStep?: number;
}

// ============================================================================
// Step Configuration
// ============================================================================

const STEPS: OnboardingStepConfig[] = [
  {
    id: 'invite-team',
    title: 'Invite Your Team',
    description: 'Invite leadership members with pre-assigned roles',
    icon: <Users className="h-5 w-5" />,
    optional: true,
  },
  {
    id: 'import-members',
    title: 'Import Your Data',
    description: 'Bulk import members and financial data from Excel',
    icon: <Upload className="h-5 w-5" />,
    optional: true,
  },
  {
    id: 'personalize',
    title: 'Personalize',
    description: 'Upload your church image for the dashboard',
    icon: <Image className="h-5 w-5" />,
    optional: false,
  },
];

// ============================================================================
// Animation Variants
// ============================================================================

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
};

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function OnboardingWizard({
  tenantName,
  onComplete,
  initialStep = 0,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  const goToStep = useCallback((stepIndex: number) => {
    setDirection(stepIndex > currentStep ? 1 : -1);
    setCurrentStep(stepIndex);
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete();
    } else {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    if (step.optional) {
      setSkippedSteps((prev) => new Set([...prev, step.id]));
      handleNext();
    }
  }, [step, handleNext]);

  const markStepCompleted = useCallback((stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
    // Remove from skipped if previously skipped
    setSkippedSteps((prev) => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });
  }, []);

  // ============================================================================
  // Completion Handler
  // ============================================================================

  const handleComplete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Mark onboarding as complete
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      setIsCompleted(true);

      // Wait for celebration animation, then call onComplete
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still show completion even if API fails
      setIsCompleted(true);
      setTimeout(() => {
        onComplete();
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  }, [onComplete]);

  // ============================================================================
  // Render Step Content
  // ============================================================================

  const renderStepContent = () => {
    switch (step.id) {
      case 'invite-team':
        return (
          <InviteTeamStep
            onComplete={() => markStepCompleted(step.id)}
            onSkip={handleSkip}
          />
        );
      case 'import-members':
        return (
          <ImportMembersStep
            onComplete={() => markStepCompleted(step.id)}
            onSkip={handleSkip}
          />
        );
      case 'personalize':
        return (
          <PersonalizeStep
            onComplete={() => markStepCompleted(step.id)}
            tenantName={tenantName}
          />
        );
      default:
        return null;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isCompleted) {
    return <CompletionCelebration tenantName={tenantName} />;
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-background to-muted/30"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="flex flex-col items-center gap-3 mb-6"
          >
            <div className="relative w-48 h-12">
              <NextImage
                src="/landing_logo_with_name.svg"
                alt="StewardTrack"
                fill
                className="object-contain"
                priority
              />
            </div>
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {tenantName ? `Set Up ${tenantName}` : 'Set Up Your Church'}
          </h1>
          <p className="text-muted-foreground text-lg">
            Let's get you started with a few quick steps
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <OnboardingProgress
            steps={STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
            skippedSteps={skippedSteps}
            onStepClick={goToStep}
          />
          <Progress value={progress} className="mt-4 h-2" />
        </div>

        {/* Step Content */}
        <div className="bg-card rounded-2xl shadow-lg border overflow-hidden">
          {/* Step Header */}
          <div className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                completedSteps.has(step.id)
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-primary/10 text-primary'
              )}>
                {completedSteps.has(step.id) ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{step.title}</h2>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              {step.optional && (
                <span className="ml-auto text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                  Optional
                </span>
              )}
            </div>
          </div>

          {/* Step Content with Animation */}
          <div className="p-6 min-h-[400px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step.id}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Footer */}
          <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
            <div>
              {!isFirstStep && (
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step.optional && !completedSteps.has(step.id) && (
                <Button variant="ghost" onClick={handleSkip}>
                  Skip for now
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="gap-2"
                disabled={isSubmitting}
              >
                {isLastStep ? (
                  <>
                    {isSubmitting ? 'Completing...' : 'Complete Setup'}
                    <CheckCircle className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          You can always complete these steps later from your dashboard
        </p>
      </div>
    </motion.div>
  );
}
