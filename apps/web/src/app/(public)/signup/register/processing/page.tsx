'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  User,
  Building2,
  Shield,
  Key,
  Users,
  Settings,
  ArrowRight,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Registration Step Definition
 */
interface RegistrationStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  estimatedSeconds: number; // Estimated time for this step
}

/**
 * Registration Steps - mirrors the backend RegistrationService steps
 * Estimated times are based on typical backend processing durations
 */
const REGISTRATION_STEPS: RegistrationStep[] = [
  {
    id: 'validate',
    label: 'Validating Information',
    description: 'Checking your details',
    icon: Shield,
    estimatedSeconds: 1,
  },
  {
    id: 'auth',
    label: 'Creating Account',
    description: 'Setting up your login credentials',
    icon: User,
    estimatedSeconds: 2,
  },
  {
    id: 'tenant',
    label: 'Setting Up Organization',
    description: 'Creating your church workspace',
    icon: Building2,
    estimatedSeconds: 2,
  },
  {
    id: 'encryption',
    label: 'Securing Your Data',
    description: 'Generating encryption keys',
    icon: Key,
    estimatedSeconds: 3,
  },
  {
    id: 'features',
    label: 'Activating Features',
    description: 'Provisioning your plan features',
    icon: Settings,
    estimatedSeconds: 4,
  },
  {
    id: 'roles',
    label: 'Configuring Access',
    description: 'Setting up user roles and permissions',
    icon: Users,
    estimatedSeconds: 8,
  },
];

// Calculate total estimated time
const TOTAL_ESTIMATED_SECONDS = REGISTRATION_STEPS.reduce((sum, step) => sum + step.estimatedSeconds, 0);

type StepStatus = 'pending' | 'processing' | 'completed' | 'error';

interface StepState {
  status: StepStatus;
  message?: string;
}

function RegistrationProgressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get registration data from URL params (base64 encoded)
  const encodedData = searchParams.get('data');

  const [stepStates, setStepStates] = useState<Record<string, StepState>>(() => {
    const initial: Record<string, StepState> = {};
    REGISTRATION_STEPS.forEach((step) => {
      initial[step.id] = { status: 'pending' };
    });
    return initial;
  });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [overallStatus, setOverallStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] = useState<{
    userId: string;
    tenantId: string;
    subdomain: string;
  } | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(TOTAL_ESTIMATED_SECONDS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Timer for both elapsed and remaining time
  useEffect(() => {
    if (overallStatus !== 'processing' || !hasStarted) return;

    // Set start time when processing begins
    if (!startTime) {
      setStartTime(Date.now());
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [overallStatus, hasStarted, startTime]);

  // Update remaining time when step changes
  useEffect(() => {
    if (overallStatus !== 'processing') return;

    // Calculate remaining time from current step onwards
    const remainingSteps = REGISTRATION_STEPS.slice(currentStepIndex);
    const remaining = remainingSteps.reduce((sum, step) => sum + step.estimatedSeconds, 0);
    setRemainingSeconds(remaining);
  }, [currentStepIndex, overallStatus]);

  /**
   * Format seconds to human readable time
   */
  const formatRemainingTime = (seconds: number): string => {
    if (seconds <= 0) return 'Almost done...';
    if (seconds < 60) return `~${seconds} second${seconds !== 1 ? 's' : ''} remaining`;
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  };

  /**
   * Format elapsed time in MM:SS format
   */
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Decode registration data on mount
  useEffect(() => {
    console.log('[Processing] Page loaded, encodedData:', encodedData ? 'present' : 'missing');

    if (encodedData) {
      try {
        // Decode UTF-8 safe base64 (reverse of TextEncoder + btoa)
        const binaryString = atob(encodedData);
        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        const decoder = new TextDecoder();
        const decoded = JSON.parse(decoder.decode(bytes));
        console.log('[Processing] Successfully decoded registration data');
        setRegistrationData(decoded);
      } catch (err) {
        console.error('[Processing] Failed to decode registration data:', err);
        setErrorMessage('Invalid registration data. Please try again.');
        setOverallStatus('error');
      }
    } else {
      console.log('[Processing] No encoded data in URL');
      setErrorMessage('No registration data found. Redirecting...');
      setOverallStatus('error');
      setTimeout(() => router.push('/signup'), 2000);
    }
  }, [encodedData, router]);

  /**
   * Update step state with animation timing
   */
  const updateStep = useCallback((stepId: string, state: StepState) => {
    setStepStates((prev) => ({
      ...prev,
      [stepId]: state,
    }));
  }, []);

  /**
   * Simulate step progress with realistic timing
   */
  const simulateStepProgress = useCallback(async (stepIndex: number): Promise<boolean> => {
    const step = REGISTRATION_STEPS[stepIndex];
    if (!step) return false;

    // Mark step as processing
    updateStep(step.id, { status: 'processing' });
    setCurrentStepIndex(stepIndex);

    // Simulate processing time (300-800ms per step for visual feedback)
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));

    return true;
  }, [updateStep]);

  /**
   * Execute registration with step-by-step feedback
   */
  const executeRegistration = useCallback(async () => {
    if (!registrationData || hasStarted) return;
    setHasStarted(true);

    try {
      // Step 1: Validate (simulated since validation happens on submit)
      await simulateStepProgress(0);
      updateStep('validate', { status: 'completed' });

      // Step 2: Auth - Start processing
      await simulateStepProgress(1);

      // Step 3-6: Make the actual API call (backend handles all steps)
      // We'll use streaming/polling in the future, but for now we simulate progress
      const registrationPromise = fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      // Simulate remaining steps while API processes
      const stepPromises = [
        new Promise<void>(async (resolve) => {
          await new Promise((r) => setTimeout(r, 600));
          updateStep('auth', { status: 'completed' });
          resolve();
        }),
        new Promise<void>(async (resolve) => {
          await simulateStepProgress(2);
          await new Promise((r) => setTimeout(r, 500));
          updateStep('tenant', { status: 'completed' });
          resolve();
        }),
        new Promise<void>(async (resolve) => {
          await simulateStepProgress(3);
          await new Promise((r) => setTimeout(r, 400));
          updateStep('encryption', { status: 'completed' });
          resolve();
        }),
        new Promise<void>(async (resolve) => {
          await simulateStepProgress(4);
          await new Promise((r) => setTimeout(r, 500));
          updateStep('features', { status: 'completed' });
          resolve();
        }),
        new Promise<void>(async (resolve) => {
          await simulateStepProgress(5);
          resolve();
        }),
      ];

      // Wait for API response
      const [response] = await Promise.all([
        registrationPromise,
        ...stepPromises,
      ]);

      const result = await response.json();

      if (result.success) {
        // Mark final step as completed
        updateStep('roles', { status: 'completed' });
        setCurrentStepIndex(REGISTRATION_STEPS.length);
        setOverallStatus('success');
        setRegistrationResult({
          userId: result.data.userId,
          tenantId: result.data.tenantId,
          subdomain: result.data.subdomain,
        });

        // Determine next route based on offering type
        const isFreeOrTrial =
          registrationData.isTrial ||
          registrationData.isFree ||
          registrationData.priceIsZero;

        // Auto-redirect after showing success
        setTimeout(() => {
          if (isFreeOrTrial) {
            router.push('/onboarding');
          } else {
            // Paid plan - go to checkout
            const checkoutParams = new URLSearchParams({
              tenant_id: result.data.tenantId,
              offering_id: registrationData.offeringId,
              email: registrationData.email,
              name: `${registrationData.firstName} ${registrationData.lastName}`.trim(),
            });
            // Include coupon information if present
            if (registrationData.couponCode) {
              checkoutParams.set('coupon_code', registrationData.couponCode);
            }
            if (registrationData.couponDiscountId) {
              checkoutParams.set('coupon_discount_id', registrationData.couponDiscountId);
            }
            if (registrationData.couponDurationBillingCycles) {
              checkoutParams.set('coupon_duration_billing_cycles', registrationData.couponDurationBillingCycles.toString());
            }
            router.push(`/signup/checkout?${checkoutParams.toString()}`);
          }
        }, 2000);
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);

      // Mark current step as error
      const currentStep = REGISTRATION_STEPS[currentStepIndex];
      if (currentStep) {
        updateStep(currentStep.id, {
          status: 'error',
          message: error instanceof Error ? error.message : 'An error occurred',
        });
      }

      setOverallStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    }
  }, [registrationData, hasStarted, simulateStepProgress, updateStep, currentStepIndex, router]);

  // Start registration when data is ready
  useEffect(() => {
    if (registrationData && !hasStarted) {
      executeRegistration();
    }
  }, [registrationData, hasStarted, executeRegistration]);

  /**
   * Handle retry - redirect back to register page with data preserved
   */
  const handleRetry = () => {
    if (registrationData?.offeringId) {
      router.push(`/signup/register?offering=${registrationData.offeringId}`);
    } else {
      router.push('/signup');
    }
  };

  /**
   * Get step icon component with proper styling
   */
  const getStepIcon = (step: RegistrationStep, state: StepState) => {
    const IconComponent = step.icon;

    if (state.status === 'completed') {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="rounded-full bg-green-500 p-2"
        >
          <CheckCircle2 className="size-5 text-white" />
        </motion.div>
      );
    }

    if (state.status === 'error') {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="rounded-full bg-red-500 p-2"
        >
          <XCircle className="size-5 text-white" />
        </motion.div>
      );
    }

    if (state.status === 'processing') {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="rounded-full bg-[#179a65] p-2"
        >
          <Loader2 className="size-5 text-white" />
        </motion.div>
      );
    }

    // Pending
    return (
      <div className="rounded-full bg-gray-200 dark:bg-gray-700 p-2">
        <IconComponent className="size-5 text-gray-400 dark:text-gray-500" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center size-16 rounded-full bg-[#179a65]/10 dark:bg-[#179a65]/20 mb-4"
          >
            {overallStatus === 'success' ? (
              <CheckCircle2 className="size-8 text-[#179a65]" />
            ) : overallStatus === 'error' ? (
              <XCircle className="size-8 text-red-500" />
            ) : (
              <Building2 className="size-8 text-[#179a65]" />
            )}
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {overallStatus === 'success'
              ? 'Account Created!'
              : overallStatus === 'error'
                ? 'Registration Failed'
                : 'Setting Up Your Account'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {overallStatus === 'success'
              ? 'Your organization is ready to use'
              : overallStatus === 'error'
                ? errorMessage || 'Something went wrong'
                : 'Please wait while we prepare everything for you'}
          </p>
          {overallStatus === 'processing' && hasStarted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 space-y-1"
            >
              <p className="text-sm text-[#179a65] dark:text-green-400 font-medium">
                {formatRemainingTime(remainingSeconds)}
              </p>
              <p
                className="text-xs text-gray-400 dark:text-gray-500 font-mono"
                data-testid="elapsed-time"
              >
                Elapsed: {formatElapsedTime(elapsedSeconds)}
              </p>
            </motion.div>
          )}
          {overallStatus === 'success' && elapsedSeconds > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-mono"
              data-testid="total-elapsed-time"
            >
              Completed in {formatElapsedTime(elapsedSeconds)}
            </motion.p>
          )}
        </div>

        {/* Steps Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Progress Bar */}
          <div className="h-1 bg-gray-100 dark:bg-gray-700">
            <motion.div
              className="h-full bg-[#179a65]"
              initial={{ width: '0%' }}
              animate={{
                width:
                  overallStatus === 'success'
                    ? '100%'
                    : `${((currentStepIndex + 1) / REGISTRATION_STEPS.length) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Steps List */}
          <div className="p-6 space-y-4">
            <AnimatePresence mode="popLayout">
              {REGISTRATION_STEPS.map((step, index) => {
                const state = stepStates[step.id];
                const isActive = index === currentStepIndex && overallStatus === 'processing';

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-[#179a65]/5 dark:bg-[#179a65]/10'
                        : state.status === 'completed'
                          ? 'bg-green-50 dark:bg-green-900/10'
                          : state.status === 'error'
                            ? 'bg-red-50 dark:bg-red-900/10'
                            : ''
                    }`}
                  >
                    {getStepIcon(step, state)}

                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-medium text-sm ${
                          state.status === 'completed'
                            ? 'text-green-700 dark:text-green-400'
                            : state.status === 'error'
                              ? 'text-red-700 dark:text-red-400'
                              : isActive
                                ? 'text-[#179a65] dark:text-green-400'
                                : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {step.label}
                      </h3>
                      <p
                        className={`text-xs truncate ${
                          state.status === 'error' && state.message
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {state.status === 'error' && state.message
                          ? state.message
                          : step.description}
                      </p>
                    </div>

                    {/* Status indicator */}
                    {state.status === 'processing' && (
                      <span className="text-xs font-medium text-[#179a65] dark:text-green-400 whitespace-nowrap">
                        ~{step.estimatedSeconds}s
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="p-6 pt-0">
            {overallStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Redirecting you automatically...
                </div>
                <Button
                  onClick={() => {
                    const isFreeOrTrial =
                      registrationData?.isTrial ||
                      registrationData?.isFree ||
                      registrationData?.priceIsZero;
                    if (isFreeOrTrial) {
                      router.push('/onboarding');
                    } else {
                      const checkoutParams = new URLSearchParams({
                        tenant_id: registrationResult?.tenantId || '',
                        offering_id: registrationData?.offeringId || '',
                        email: registrationData?.email || '',
                        name: `${registrationData?.firstName || ''} ${registrationData?.lastName || ''}`.trim(),
                      });
                      // Include coupon information if present
                      if (registrationData?.couponCode) {
                        checkoutParams.set('coupon_code', registrationData.couponCode);
                      }
                      if (registrationData?.couponDiscountId) {
                        checkoutParams.set('coupon_discount_id', registrationData.couponDiscountId);
                      }
                      if (registrationData?.couponDurationBillingCycles) {
                        checkoutParams.set('coupon_duration_billing_cycles', registrationData.couponDurationBillingCycles.toString());
                      }
                      router.push(`/signup/checkout?${checkoutParams.toString()}`);
                    }
                  }}
                  className="w-full bg-[#179a65] hover:bg-green-600"
                >
                  Continue
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {overallStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <Button onClick={handleRetry} className="w-full" variant="default">
                  <RefreshCcw className="size-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => router.push('/signup')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Plans
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Having trouble?{' '}
          <a
            href="mailto:support@stewardtrack.com"
            className="text-[#179a65] hover:underline"
          >
            Contact Support
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default function RegistrationProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <div className="text-center">
            <Loader2 className="size-8 animate-spin text-[#179a65] mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <RegistrationProgressContent />
    </Suspense>
  );
}
