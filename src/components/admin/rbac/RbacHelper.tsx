'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  HelpCircle,
  Info,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Users,
  Shield,
  Key,
  Database,
  Settings,
  FileText,
  Eye,
  Lock,
  UserCheck,
  Star
} from 'lucide-react';

interface HelperTooltipProps {
  title: string;
  description: string;
  example?: string;
  difficulty?: 'Easy' | 'Medium' | 'Advanced';
  children: React.ReactNode;
}

export function HelperTooltip({ title, description, example, difficulty, children }: HelperTooltipProps) {
  const difficultyColors = {
    Easy: 'bg-green-100 text-green-800 border-green-200',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Advanced: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{title}</h4>
              {difficulty && (
                <Badge variant="outline" className={`text-xs ${difficultyColors[difficulty]}`}>
                  {difficulty}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{description}</p>
            {example && (
              <div className="p-2 bg-gray-50 rounded text-xs">
                <span className="font-medium">Example: </span>
                {example}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface HelpDialogProps {
  title: string;
  triggerText: string;
  children: React.ReactNode;
}

export function HelpDialog({ title, triggerText, children }: HelpDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface QuickTipProps {
  type: 'info' | 'warning' | 'success' | 'tip';
  title: string;
  description: string;
}

export function QuickTip({ type, title, description }: QuickTipProps) {
  const configs = {
    info: {
      icon: <Info className="h-4 w-4" />,
      className: 'border-blue-200 bg-blue-50'
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4" />,
      className: 'border-yellow-200 bg-yellow-50'
    },
    success: {
      icon: <CheckCircle className="h-4 w-4" />,
      className: 'border-green-200 bg-green-50'
    },
    tip: {
      icon: <Lightbulb className="h-4 w-4" />,
      className: 'border-purple-200 bg-purple-50'
    }
  };

  const config = configs[type];

  return (
    <Alert className={config.className}>
      {config.icon}
      <AlertDescription>
        <strong>{title}:</strong> {description}
      </AlertDescription>
    </Alert>
  );
}

// Predefined help content for common RBAC concepts
export const RbacHelpContent = {
  users: {
    title: "Users",
    description: "People who can log into your church management system. Each person should have their own unique account.",
    example: "Pastor John, Secretary Mary, Volunteer Tom",
    difficulty: "Easy" as const
  },
  roles: {
    title: "Roles",
    description: "Job titles or positions that determine what someone can do. Think of them as job descriptions for your system.",
    example: "Pastor, Secretary, Volunteer, Financial Manager",
    difficulty: "Easy" as const
  },
  permissions: {
    title: "Permissions",
    description: "Specific things someone can do in the system. Like keys that unlock different features or areas.",
    example: "View Members, Edit Events, Manage Finances, Send Messages",
    difficulty: "Medium" as const
  },
  surfaces: {
    title: "Surfaces",
    description: "Different areas or pages of your church system. Think of them as different rooms in your church building.",
    example: "Member Directory, Event Calendar, Financial Reports, Message Center",
    difficulty: "Medium" as const
  },
  bindings: {
    title: "Surface Bindings",
    description: "Rules that connect roles to what they can access. Like assigning keys to different staff members for specific rooms.",
    example: "Pastors can access all areas, Volunteers can only access event planning",
    difficulty: "Advanced" as const
  },
  auditLogs: {
    title: "Audit Logs",
    description: "A record of who did what and when in your system. Like a security camera for your system changes.",
    example: "Pastor John gave Secretary Mary permission to edit events on March 15th",
    difficulty: "Easy" as const
  },
  createRole: {
    title: "Create Role",
    description: "Set up a new job position with specific permissions. Define what someone in this role can do in your church system.",
    example: "Create a 'Youth Pastor' role with access to youth events, member directory (youth only), and communication tools",
    difficulty: "Medium" as const
  },
  composeBundle: {
    title: "Permission Bundles",
    description: "Group related permissions together for easy reuse. Think of it as creating a key ring with multiple keys.",
    example: "Create an 'Event Management' bundle that includes: Create Events, Edit Events, View Attendees, Send Invitations",
    difficulty: "Medium" as const
  },
  manageBindings: {
    title: "Surface Bindings",
    description: "Connect roles to specific areas of your system. Decide which roles can access which pages or features.",
    example: "Bind the 'Secretary' role to the Member Directory page so secretaries can view and edit member information",
    difficulty: "Advanced" as const
  },
  delegatedConsole: {
    title: "Delegated Console",
    description: "Give ministry leaders control over their own areas. Let them manage their team's access without affecting the whole church.",
    example: "Let the Youth Pastor manage access for youth volunteers without giving them control over the main church systems",
    difficulty: "Advanced" as const
  },
  viewAudit: {
    title: "View Audit Log",
    description: "See a record of all RBAC changes made in your system. Track who made changes and when for security and accountability.",
    example: "See that Pastor John added a new volunteer role on March 15th at 2:30 PM",
    difficulty: "Easy" as const
  },
  systemSettings: {
    title: "System Settings",
    description: "Configure how RBAC works in your church system. Adjust security policies and system-wide permissions.",
    example: "Set password requirements, session timeouts, and default permissions for new users",
    difficulty: "Advanced" as const
  },
  multiRole: {
    title: "Multi-Role Assignment",
    description: "Give someone multiple roles at once while checking for permission conflicts. Useful for staff with multiple responsibilities.",
    example: "Assign someone both 'Secretary' and 'Treasurer' roles, with automatic conflict detection if permissions overlap",
    difficulty: "Medium" as const
  },
  delegationPermissions: {
    title: "Delegation Permissions",
    description: "Control which ministry leaders can manage access for their teams. Set limits on what they can delegate.",
    example: "Allow Youth Pastor to assign volunteer roles but not access financial information",
    difficulty: "Advanced" as const
  },
  visualEditor: {
    title: "Visual Editor",
    description: "Use a drag-and-drop interface to connect roles with system areas. Makes complex bindings easier to understand.",
    example: "Drag the 'Volunteer' role to the 'Event Planning' area to give volunteers access to event management",
    difficulty: "Medium" as const
  },
  permissionMapper: {
    title: "Permission Mapper",
    description: "Visual tool to see all permissions and how they connect. Helps identify gaps or overlaps in your access setup.",
    example: "See a visual map showing which roles have access to member information and identify any missing permissions",
    difficulty: "Medium" as const
  },
  publishingControls: {
    title: "Publishing Controls",
    description: "Manage how RBAC changes are compiled and deployed to your live system. Control when and how access changes take effect.",
    example: "Compile and publish role changes so they become active across all church systems",
    difficulty: "Advanced" as const
  }
};

interface ContextualHelpProps {
  section: keyof typeof RbacHelpContent;
  children: React.ReactNode;
}

export function ContextualHelp({ section, children }: ContextualHelpProps) {
  const content = RbacHelpContent[section];

  return (
    <HelperTooltip {...content}>
      {children}
    </HelperTooltip>
  );
}

interface ProcessGuideProps {
  steps: Array<{
    title: string;
    description: string;
    icon?: React.ReactNode;
  }>;
}

export function ProcessGuide({ steps }: ProcessGuideProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
            {index + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {step.icon}
              <h4 className="font-semibold">{step.title}</h4>
            </div>
            <p className="text-sm text-gray-600">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Common process guides
export const ProcessGuides = {
  addNewUser: [
    {
      title: 'Create User Account',
      description: 'Add their basic information: name, email, and contact details',
      icon: <Users className="h-4 w-4" />
    },
    {
      title: 'Assign Role',
      description: 'Choose what job they\'ll do: Pastor, Secretary, Volunteer, etc.',
      icon: <Shield className="h-4 w-4" />
    },
    {
      title: 'Set Permissions',
      description: 'Decide what parts of the system they can access and modify',
      icon: <Key className="h-4 w-4" />
    },
    {
      title: 'Test Access',
      description: 'Have them log in and make sure everything works correctly',
      icon: <CheckCircle className="h-4 w-4" />
    }
  ],
  changePermissions: [
    {
      title: 'Find the Person',
      description: 'Look up their account in the user management section',
      icon: <Eye className="h-4 w-4" />
    },
    {
      title: 'Review Current Access',
      description: 'See what they can currently do in the system',
      icon: <FileText className="h-4 w-4" />
    },
    {
      title: 'Modify Permissions',
      description: 'Add or remove access to different areas as needed',
      icon: <Settings className="h-4 w-4" />
    },
    {
      title: 'Test Changes',
      description: 'Verify the changes work as expected',
      icon: <CheckCircle className="h-4 w-4" />
    }
  ],
  securityReview: [
    {
      title: 'Review All Users',
      description: 'Check who has access to your system and verify they still need it',
      icon: <Users className="h-4 w-4" />
    },
    {
      title: 'Check Recent Changes',
      description: 'Look at the audit log to see what permissions have been modified',
      icon: <FileText className="h-4 w-4" />
    },
    {
      title: 'Remove Unnecessary Access',
      description: 'Take away permissions that are no longer needed',
      icon: <Lock className="h-4 w-4" />
    },
    {
      title: 'Document Changes',
      description: 'Keep a record of what you changed and why',
      icon: <FileText className="h-4 w-4" />
    }
  ]
};

interface RoleDescriptionProps {
  role: string;
}

export function RoleDescription({ role }: RoleDescriptionProps) {
  const descriptions = {
    pastor: "Church leader with full access to oversee all operations and make important decisions.",
    'associate-pastor': "Assistant pastor with access to ministry areas and member information, may have limited financial access.",
    secretary: "Administrative staff with access to member directory, events, communications, and basic reports.",
    treasurer: "Financial manager with access to giving records, financial reports, and budget management.",
    volunteer: "Community member helping with specific tasks, limited access to relevant areas only.",
    'volunteer-coordinator': "Manages volunteers and events, access to volunteer management and event planning.",
    'worship-leader': "Leads music ministry, access to worship planning, song database, and team coordination.",
    'youth-pastor': "Youth ministry leader with access to youth programs, events, and member information for youth.",
    elder: "Church elder with oversight responsibilities, broad access but may not include day-to-day administration."
  };

  const description = descriptions[role.toLowerCase() as keyof typeof descriptions] ||
    "Custom role - access determined by specific permissions assigned.";

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Star className="h-4 w-4 text-yellow-500" />
        <span className="font-medium">Role Description</span>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

const RbacHelperExports = {
  HelperTooltip,
  HelpDialog,
  QuickTip,
  ContextualHelp,
  ProcessGuide,
  ProcessGuides,
  RoleDescription,
  RbacHelpContent
};

export default RbacHelperExports;