'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { CheckCircle, Circle, SkipForward } from 'lucide-react';
import type { OnboardingStepConfig } from './OnboardingWizard';

// ============================================================================
// Types
// ============================================================================

interface OnboardingProgressProps {
  steps: OnboardingStepConfig[];
  currentStep: number;
  completedSteps: Set<string>;
  skippedSteps: Set<string>;
  onStepClick?: (index: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export function OnboardingProgress({
  steps,
  currentStep,
  completedSteps,
  skippedSteps,
  onStepClick,
}: OnboardingProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = completedSteps.has(step.id);
        const isSkipped = skippedSteps.has(step.id);
        const isPast = index < currentStep;
        const canNavigate = isPast || isCompleted || isSkipped;

        return (
          <React.Fragment key={step.id}>
            {/* Step Indicator */}
            <motion.button
              type="button"
              onClick={() => canNavigate && onStepClick?.(index)}
              disabled={!canNavigate}
              className={cn(
                'relative flex flex-col items-center gap-2 p-2 rounded-lg transition-colors',
                canNavigate && 'cursor-pointer hover:bg-muted/50',
                !canNavigate && 'cursor-default'
              )}
              whileHover={canNavigate ? { scale: 1.05 } : undefined}
              whileTap={canNavigate ? { scale: 0.95 } : undefined}
            >
              {/* Icon Circle */}
              <div
                className={cn(
                  'relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                  isActive && 'border-primary bg-primary text-primary-foreground scale-110',
                  isCompleted && 'border-green-500 bg-green-500 text-white',
                  isSkipped && 'border-muted-foreground/50 bg-muted text-muted-foreground',
                  !isActive && !isCompleted && !isSkipped && 'border-muted-foreground/30 bg-background text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <CheckCircle className="h-5 w-5" />
                  </motion.div>
                ) : isSkipped ? (
                  <SkipForward className="h-4 w-4" />
                ) : isActive ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    {step.icon}
                  </motion.div>
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}

                {/* Active Ring Animation */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}
              </div>

              {/* Step Title (hidden on mobile) */}
              <span
                className={cn(
                  'hidden md:block text-xs font-medium max-w-[80px] text-center truncate',
                  isActive && 'text-primary',
                  isCompleted && 'text-green-600 dark:text-green-400',
                  isSkipped && 'text-muted-foreground',
                  !isActive && !isCompleted && !isSkipped && 'text-muted-foreground'
                )}
              >
                {step.title}
              </span>
            </motion.button>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 bg-muted-foreground/20 relative max-w-[60px] md:max-w-[100px]">
                <motion.div
                  className={cn(
                    'absolute inset-0 h-full',
                    isCompleted || isPast ? 'bg-green-500' : 'bg-transparent'
                  )}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isCompleted || isPast ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ transformOrigin: 'left' }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
