'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Shield,
  Key,
  Database,
  Settings,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  Play,
  BookOpen,
  Target,
  Star,
  Zap
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action?: () => void;
}

interface RbacOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function RbacOnboarding({ isOpen, onClose, onComplete }: RbacOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to RBAC',
      description: 'Learn how to manage who can access what in your church management system',
      icon: <Shield className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'concepts',
      title: 'Understanding the Basics',
      description: 'Learn about Users, Roles, Permissions, and how they work together',
      icon: <Lightbulb className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'navigation',
      title: 'Dashboard Overview',
      description: 'Get familiar with the main dashboard and where to find things',
      icon: <Target className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'first-steps',
      title: 'Your First Actions',
      description: 'Learn what to do first when setting up RBAC for your church',
      icon: <Play className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'resources',
      title: 'Getting Help',
      description: 'Know where to find help when you need it',
      icon: <BookOpen className="h-6 w-6" />,
      completed: false
    }
  ];

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const nextStep = () => {
    markStepCompleted(steps[currentStep].id);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep + 1) / steps.length * 100;

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="p-4 bg-blue-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
              <Shield className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to RBAC!</h2>
              <p className="text-gray-600 mb-4">
                RBAC (Role-Based Access Control) helps you manage who can access different parts of your church management system.
              </p>
              <Alert className="border-blue-200 bg-blue-50 text-left">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>Think of it like your church building:</strong> Different people need keys to different rooms based on their role.
                  The pastor has keys to everything, while volunteers might only have keys to specific areas.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );

      case 'concepts':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Key Concepts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold">Users</h3>
                  </div>
                  <p className="text-sm text-gray-600">People who can log into your system. Each person should have their own account.</p>
                  <p className="text-xs text-blue-600 mt-2">Example: Pastor John, Secretary Mary</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold">Roles</h3>
                  </div>
                  <p className="text-sm text-gray-600">Job titles that determine what someone can do. Like job descriptions.</p>
                  <p className="text-xs text-purple-600 mt-2">Example: Pastor, Secretary, Volunteer</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Key className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold">Permissions</h3>
                  </div>
                  <p className="text-sm text-gray-600">Specific things someone can do. Like keys that unlock different features.</p>
                  <p className="text-xs text-green-600 mt-2">Example: View Members, Edit Events</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <Database className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="font-semibold">Surfaces</h3>
                  </div>
                  <p className="text-sm text-gray-600">Different areas of your system. Like rooms in your church building.</p>
                  <p className="text-xs text-orange-600 mt-2">Example: Member Directory, Events</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="text-center">
                <Users className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <span>Person</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="text-center">
                <Shield className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                <span>gets Role</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="text-center">
                <Key className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <span>with Permissions</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="text-center">
                <Database className="h-6 w-6 mx-auto mb-1 text-orange-600" />
                <span>to access Surfaces</span>
              </div>
            </div>
          </div>
        );

      case 'navigation':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Dashboard Overview</h2>
            <div className="space-y-4">
              <Card className="border-l-4 border-blue-500">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">📊 Statistics Cards</h3>
                  <p className="text-sm text-gray-600">
                    Quick overview of your current setup. Hover over the help icons (?) to learn what each number means.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-green-500">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">📋 Tabs</h3>
                  <p className="text-sm text-gray-600">
                    <strong>Overview:</strong> Current status and key metrics<br/>
                    <strong>Phases:</strong> Implementation progress (all complete!)<br/>
                    <strong>Activity:</strong> Recent changes and actions<br/>
                    <strong>Quick Actions:</strong> Common tasks you might need
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-purple-500">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">🎯 Action Buttons</h3>
                  <p className="text-sm text-gray-600">
                    Each card has a button that takes you to the management area for that feature.
                    Look for &quot;Manage Roles&quot;, &quot;Manage Bundles&quot;, etc.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Alert className="border-yellow-200 bg-yellow-50">
              <Star className="h-4 w-4" />
              <AlertDescription>
                <strong>Pro Tip:</strong> Use the "Help Guide" button in the top-right corner anytime you need detailed explanations or step-by-step instructions.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'first-steps':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Your First Steps</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Review Current Setup</h3>
                  <p className="text-sm text-gray-600">
                    Look at the Overview tab to see what's already configured. The system comes with basic roles and permissions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Identify Your Church Roles</h3>
                  <p className="text-sm text-gray-600">
                    Think about the different jobs people do: Pastor, Secretary, Treasurer, Volunteer Coordinator, etc.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Start with One Person</h3>
                  <p className="text-sm text-gray-600">
                    Pick one staff member and practice assigning them a role and permissions. Test that it works.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold text-sm">
                  4
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Gradually Add Others</h3>
                  <p className="text-sm text-gray-600">
                    Once you're comfortable, add other staff members one by one. Take your time!
                  </p>
                </div>
              </div>
            </div>

            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Remember:</strong> You can always undo changes. It's better to start with less access and add more as needed.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Getting Help</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Help Guide</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Comprehensive guide with explanations, examples, and step-by-step instructions.
                  </p>
                  <Button variant="outline" size="sm">
                    Open Help Guide
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-4">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Quick Start</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Step-by-step guides for common tasks like adding users and changing permissions.
                  </p>
                  <Button variant="outline" size="sm">
                    Quick Start Guide
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-4">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Tooltips</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Hover over any help icon (?) to get instant explanations.
                  </p>
                  <Button variant="outline" size="sm">
                    Try Hovering
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-red-100 rounded-full w-fit mx-auto mb-4">
                    <Settings className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Support</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Need more help? Contact your IT support team or system administrator.
                  </p>
                  <Button variant="outline" size="sm">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Take your time!</strong> RBAC is powerful but can seem complex at first.
                Don't hesitate to use the help resources whenever you need them.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" widthMode='content'>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            RBAC Onboarding
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{currentStep + 1} of {steps.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Skip for now
              </Button>
              <Button
                onClick={nextStep}
                className="bg-primary hover:bg-primary/90"
              >
                {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
                {currentStep < steps.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to detect if user is new to RBAC
export function useRbacOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const seen = localStorage.getItem('rbac-onboarding-completed');
    if (!seen) {
      setShowOnboarding(true);
    }
    setHasSeenOnboarding(!!seen);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('rbac-onboarding-completed', 'true');
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('rbac-onboarding-completed');
    setHasSeenOnboarding(false);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    hasSeenOnboarding,
    setShowOnboarding,
    completeOnboarding,
    resetOnboarding
  };
}