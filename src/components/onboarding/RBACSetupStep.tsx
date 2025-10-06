'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Shield, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface RBACSetupStepProps {
  data: Record<string, any>;
  onNext: (data: any) => Promise<void>;
  onBack: () => void;
  onComplete: () => Promise<void>;
  isSaving: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  scope: string;
  user_count?: number;
}

export default function RBACSetupStep({
  onNext,
  isSaving,
}: RBACSetupStepProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDefaultRoles();
  }, []);

  async function loadDefaultRoles() {
    try {
      const response = await fetch('/api/rbac/roles');
      const result = await response.json();

      if (result.success) {
        setRoles(result.data || []);
      } else {
        toast.error('Failed to load roles');
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleContinue() {
    await onNext({ rbac_setup_data: { roles_reviewed: true } });
  }

  function getRoleIcon(roleCode: string) {
    switch (roleCode) {
      case 'tenant_admin':
        return <Shield className="h-5 w-5 text-primary" />;
      case 'staff':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'volunteer':
        return <Users className="h-5 w-5 text-green-500" />;
      case 'member':
        return <Users className="h-5 w-5 text-gray-500" />;
      default:
        return <Users className="h-5 w-5 text-muted-foreground" />;
    }
  }

  function getRoleBadgeVariant(roleCode: string): "default" | "secondary" | "outline" {
    switch (roleCode) {
      case 'tenant_admin':
        return 'default';
      case 'staff':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3 pb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Your Team Roles
            </h3>
            <p className="text-sm text-muted-foreground">
              We’ve set up default roles for your church. You can customize these later.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    {getRoleIcon(role.code)}
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {role.name}
                      {role.code === 'tenant_admin' && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {role.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={getRoleBadgeVariant(role.code)}>
                  {role.scope}
                </Badge>
              </div>
            </CardHeader>

            {role.code === 'tenant_admin' && (
              <CardContent className="pt-0">
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                  <p className="text-xs text-muted-foreground">
                    You have been automatically assigned this role as the church administrator.
                    This gives you full access to manage your church’s account.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <h4 className="text-sm font-semibold text-foreground">What’s next?</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Invite team members and assign them roles</li>
          <li>Customize role permissions from the RBAC settings</li>
          <li>Create custom roles specific to your church structure</li>
        </ul>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>Continue</>
          )}
        </Button>
      </div>
    </div>
  );
}
