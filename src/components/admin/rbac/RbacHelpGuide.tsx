'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users,
  Shield,
  Key,
  Settings,
  Database,
  FileText,
  CheckCircle,
  ArrowRight,
  Info,
  Lightbulb,
  Target,
  Workflow,
  Eye,
  Lock,
  Unlock,
  UserCheck,
  BookOpen,
  Play,
  HelpCircle,
  ChevronRight,
  Star,
  AlertTriangle,
  ThumbsUp
} from 'lucide-react';

interface StepProps {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  isCompleted?: boolean;
}

function Step({ number, title, description, icon, isCompleted }: StepProps) {
  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg">
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
      }`}>
        {isCompleted ? <CheckCircle className="h-5 w-5" /> : <span className="font-semibold">{number}</span>}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h4 className="font-semibold">{title}</h4>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

interface ConceptCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  example: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
}

function ConceptCard({ icon, title, description, example, difficulty }: ConceptCardProps) {
  const difficultyColors = {
    Easy: 'bg-green-100 text-green-800 border-green-200',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Advanced: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-full">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{title}</h3>
            <Badge variant="outline" className={`text-xs ${difficultyColors[difficulty]}`}>
              {difficulty}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 mb-1">Example:</p>
          <p className="text-sm">{example}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function RbacHelpGuide() {
  const [activeProcess, setActiveProcess] = useState<string | null>(null);

  const concepts = [
    {
      icon: <Users className="h-5 w-5 text-blue-600" />,
      title: "Users",
      description: "People who can access your church management system. Each person has their own account.",
      example: "Pastor John, Secretary Mary, Volunteer Tom",
      difficulty: "Easy" as const
    },
    {
      icon: <Shield className="h-5 w-5 text-purple-600" />,
      title: "Roles",
      description: "Job titles or positions that determine what someone can do. Like job descriptions for your system.",
      example: "Pastor, Secretary, Volunteer, Financial Manager",
      difficulty: "Easy" as const
    },
    {
      icon: <Key className="h-5 w-5 text-green-600" />,
      title: "Permissions",
      description: "Specific things someone can do in the system. Like keys that unlock different doors.",
      example: "View Members, Edit Events, Manage Finances, Send Messages",
      difficulty: "Medium" as const
    },
    {
      icon: <Database className="h-5 w-5 text-orange-600" />,
      title: "Surfaces",
      description: "Different areas or pages of your church system. Think of them as different rooms in your church building.",
      example: "Member Directory, Event Calendar, Financial Reports, Message Center",
      difficulty: "Medium" as const
    },
    {
      icon: <Settings className="h-5 w-5 text-red-600" />,
      title: "Bindings",
      description: "Rules that connect roles to what they can access. Like assigning keys to different staff members.",
      example: "Pastors can access all areas, Volunteers can only access event planning",
      difficulty: "Advanced" as const
    },
    {
      icon: <FileText className="h-5 w-5 text-indigo-600" />,
      title: "Audit Logs",
      description: "A record of who did what and when. Like a security camera for your system changes.",
      example: "Pastor John gave Secretary Mary permission to edit events on March 15th",
      difficulty: "Easy" as const
    }
  ];

  const commonProcesses = [
    {
      id: 'add-user',
      title: 'Adding a New Staff Member',
      description: 'Step-by-step guide to add someone new to your church system',
      icon: <UserCheck className="h-5 w-5" />,
      steps: [
        {
          number: 1,
          title: 'Create User Account',
          description: 'Add their basic information: name, email, and contact details',
          icon: <Users className="h-4 w-4" />
        },
        {
          number: 2,
          title: 'Assign Role',
          description: 'Choose what job they\'ll do: Pastor, Secretary, Volunteer, etc.',
          icon: <Shield className="h-4 w-4" />
        },
        {
          number: 3,
          title: 'Set Permissions',
          description: 'Decide what parts of the system they can access and modify',
          icon: <Key className="h-4 w-4" />
        },
        {
          number: 4,
          title: 'Test Access',
          description: 'Have them log in and make sure everything works correctly',
          icon: <CheckCircle className="h-4 w-4" />
        }
      ]
    },
    {
      id: 'change-permissions',
      title: 'Changing Someone\'s Access',
      description: 'How to give someone more or less access to different areas',
      icon: <Key className="h-5 w-5" />,
      steps: [
        {
          number: 1,
          title: 'Find the Person',
          description: 'Look up their account in the user management section',
          icon: <Eye className="h-4 w-4" />
        },
        {
          number: 2,
          title: 'Review Current Access',
          description: 'See what they can currently do in the system',
          icon: <FileText className="h-4 w-4" />
        },
        {
          number: 3,
          title: 'Modify Permissions',
          description: 'Add or remove access to different areas as needed',
          icon: <Settings className="h-4 w-4" />
        },
        {
          number: 4,
          title: 'Notify the Person',
          description: 'Let them know about the changes to their access',
          icon: <CheckCircle className="h-4 w-4" />
        }
      ]
    },
    {
      id: 'security-review',
      title: 'Regular Security Check',
      description: 'Monthly review to ensure everyone has appropriate access',
      icon: <Shield className="h-5 w-5" />,
      steps: [
        {
          number: 1,
          title: 'Review All Users',
          description: 'Check who has access to your system and verify they still need it',
          icon: <Users className="h-4 w-4" />
        },
        {
          number: 2,
          title: 'Check Recent Changes',
          description: 'Look at the audit log to see what permissions have been modified',
          icon: <FileText className="h-4 w-4" />
        },
        {
          number: 3,
          title: 'Remove Unnecessary Access',
          description: 'Take away permissions that are no longer needed',
          icon: <Lock className="h-4 w-4" />
        },
        {
          number: 4,
          title: 'Document Changes',
          description: 'Keep a record of what you changed and why',
          icon: <BookOpen className="h-4 w-4" />
        }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <BookOpen className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">RBAC Help Guide</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Learn how to manage who can access what in your church management system.
          Everything explained in simple terms!
        </p>
      </div>

      <Tabs defaultValue="concepts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="concepts">Basic Concepts</TabsTrigger>
          <TabsTrigger value="processes">Common Tasks</TabsTrigger>
          <TabsTrigger value="security">Security Tips</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="concepts" className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>Think of RBAC like organizing your church building:</strong> Different people need access to different rooms based on their role.
              The pastor might have keys to everything, while volunteers only need access to specific areas.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {concepts.map((concept, index) => (
              <ConceptCard key={index} {...concept} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                How It All Works Together
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="text-center">
                  <div className="p-3 bg-blue-100 rounded-full mx-auto mb-2 w-fit">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="font-medium">Person joins church</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-center">
                  <div className="p-3 bg-purple-100 rounded-full mx-auto mb-2 w-fit">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="font-medium">Gets assigned a role</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-center">
                  <div className="p-3 bg-green-100 rounded-full mx-auto mb-2 w-fit">
                    <Key className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="font-medium">Role includes permissions</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-center">
                  <div className="p-3 bg-orange-100 rounded-full mx-auto mb-2 w-fit">
                    <Database className="h-6 w-6 text-orange-600" />
                  </div>
                  <p className="font-medium">Can access specific areas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processes" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {commonProcesses.map((process) => (
              <Card key={process.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      {process.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{process.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{process.description}</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        View Step-by-Step Guide
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {process.icon}
                          {process.title}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-gray-600">{process.description}</p>
                        <div className="space-y-3">
                          {process.steps.map((step, index) => (
                            <Step key={index} {...step} />
                          ))}
                        </div>
                        <Alert className="border-green-200 bg-green-50">
                          <ThumbsUp className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Pro Tip:</strong> Always test changes with the person before finalizing them.
                            This ensures they can do their job effectively!
                          </AlertDescription>
                        </Alert>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quick Reference: What Each Role Typically Needs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Church Leadership
                  </h4>
                  <div className="space-y-2">
                    <div className="p-3 border rounded-lg">
                      <p className="font-medium">Pastor</p>
                      <p className="text-sm text-gray-600">Full access to everything - they oversee all church operations</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="font-medium">Associate Pastor</p>
                      <p className="text-sm text-gray-600">Access to ministry areas, member info, but maybe not finances</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Support Staff
                  </h4>
                  <div className="space-y-2">
                    <div className="p-3 border rounded-lg">
                      <p className="font-medium">Church Secretary</p>
                      <p className="text-sm text-gray-600">Member directory, events, communications, basic reports</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="font-medium">Volunteer Coordinator</p>
                      <p className="text-sm text-gray-600">Volunteer management, event planning, group coordination</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Remember:</strong> Good security protects your church members&apos; privacy and keeps your systems safe.
              It&apos;s about being a good steward of the information people trust you with.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                  <div>
                    <p className="font-medium">Give only what's needed</p>
                    <p className="text-sm text-gray-600">People should only access what they need for their role</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                  <div>
                    <p className="font-medium">Review regularly</p>
                    <p className="text-sm text-gray-600">Check monthly to ensure access is still appropriate</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                  <div>
                    <p className="font-medium">Remove quickly</p>
                    <p className="text-sm text-gray-600">When someone leaves, remove their access immediately</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                  <div>
                    <p className="font-medium">Keep records</p>
                    <p className="text-sm text-gray-600">Document who has access and why</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Common Mistakes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium">Giving too much access</p>
                    <p className="text-sm text-gray-600">Don&apos;t make everyone an admin &quot;just in case&quot;</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium">Forgetting to remove access</p>
                    <p className="text-sm text-gray-600">Former volunteers shouldn&apos;t keep their access</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium">Sharing accounts</p>
                    <p className="text-sm text-gray-600">Each person should have their own login</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium">Never reviewing</p>
                    <p className="text-sm text-gray-600">Set it and forget it is dangerous</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Security Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Weekly</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Check recent login activity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Review failed login attempts</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Monthly</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Review all user accounts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Check permission changes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Remove inactive users</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Quarterly</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Full security audit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Update security policies</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Train staff on changes</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting" className="space-y-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Common Problems & Solutions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-blue-700">Someone can't access what they need</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Check their role and permissions. They might need additional access for their current tasks.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Check User Permissions
                  </Button>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-semibold text-yellow-700">Someone has too much access</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Review their role and remove unnecessary permissions. Follow the principle of least privilege.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Modify Access
                  </Button>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-semibold text-red-700">Suspicious activity in audit logs</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Review who made changes and when. Contact the person if needed to verify the changes.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <ChevronRight className="h-4 w-4 mr-1" />
                    View Audit Logs
                  </Button>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-green-700">New staff member needs access</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Create their account, assign appropriate role, and test their access before they start.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Add New User
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Help Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Technical Issues</h4>
                    <p className="text-sm text-gray-600">For login problems, system errors, or access issues</p>
                    <Button variant="outline" size="sm" className="mt-2">Contact IT Support</Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Security Concerns</h4>
                    <p className="text-sm text-gray-600">For suspected unauthorized access or policy questions</p>
                    <Button variant="outline" size="sm" className="mt-2">Contact Security Team</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}