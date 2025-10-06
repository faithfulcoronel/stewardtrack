'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Rocket, CheckCircle2, Shield, Users } from 'lucide-react';

interface WelcomeStepProps {
  data: Record<string, any>;
  onNext: (data: any) => Promise<void>;
  onBack: () => void;
  onComplete: () => Promise<void>;
  isSaving: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export default function WelcomeStep({
  onNext,
  isSaving,
}: WelcomeStepProps) {
  async function handleContinue() {
    await onNext({ welcome_acknowledged: true });
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Rocket className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome to StewardTrack!
          </h2>
          <p className="text-muted-foreground text-lg">
            Let’s get your church management system set up in just a few minutes
          </p>
        </div>
      </div>

      <div className="grid gap-4 py-6">
        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              Complete Your Church Profile
            </h3>
            <p className="text-sm text-muted-foreground">
              Add essential details about your church including contact information, location, and branding
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              Set Up Your Team
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure roles and permissions to match your church’s organizational structure
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              Explore Features
            </h3>
            <p className="text-sm text-muted-foreground">
              Discover the powerful features available with your subscription plan
            </p>
          </div>
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm text-muted-foreground text-center">
          This process takes about 5 minutes. You can skip steps and complete them later from your dashboard.
        </p>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          disabled={isSaving}
          size="lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              Get Started
              <Rocket className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
