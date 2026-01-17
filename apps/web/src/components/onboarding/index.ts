/**
 * Onboarding Components
 *
 * Re-exports all onboarding-related components for the new
 * streamlined 3-step onboarding wizard.
 */

export { OnboardingWizard } from './OnboardingWizard';
export type { OnboardingStepConfig, OnboardingWizardProps } from './OnboardingWizard';

export { OnboardingProgress } from './OnboardingProgress';
export { CompletionCelebration } from './CompletionCelebration';

// Step Components
export { InviteTeamStep } from './steps/InviteTeamStep';
export { ImportMembersStep } from './steps/ImportMembersStep';
export { PersonalizeStep } from './steps/PersonalizeStep';
