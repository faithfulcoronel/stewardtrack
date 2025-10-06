'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, PartyPopper, ArrowRight, Calendar, Users, Settings, BarChart } from 'lucide-react';

interface CompleteStepProps {
  data: Record<string, any>;
  onNext: (data: any) => Promise<void>;
  onBack: () => void;
  onComplete: () => Promise<void>;
  isSaving: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export default function CompleteStep({
  onComplete,
  isSaving,
}: CompleteStepProps) {
  async function handleFinish() {
    await onComplete();
  }

  const quickActions = [
    {
      icon: Users,
      title: 'Manage Members',
      description: 'Add and organize your church members',
      href: '/admin/members',
      color: 'text-blue-500',
    },
    {
      icon: Calendar,
      title: 'Schedule Events',
      description: 'Create and manage church events',
      href: '/admin/events',
      color: 'text-green-500',
    },
    {
      icon: Settings,
      title: 'Configure RBAC',
      description: 'Fine-tune roles and permissions',
      href: '/admin/rbac',
      color: 'text-purple-500',
    },
    {
      icon: BarChart,
      title: 'View Analytics',
      description: 'Track engagement and growth',
      href: '/admin/analytics',
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <PartyPopper className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            You’re All Set!
          </h2>
          <p className="text-muted-foreground text-lg">
            Your church management system is ready to use
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6 text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          Welcome to your church management journey!
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          You can now access all the features included in your plan. Let’s explore what you can do next.
        </p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-4">
          Quick Actions to Get Started
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="py-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0 ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold">
                      {action.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {action.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          Need Help Getting Started?
        </h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Check out our documentation for detailed guides</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Watch video tutorials in the Help Center</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Contact support if you have any questions</span>
          </li>
        </ul>
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={handleFinish}
          disabled={isSaving}
          size="lg"
          className="min-w-[200px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Finishing...
            </>
          ) : (
            <>
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
