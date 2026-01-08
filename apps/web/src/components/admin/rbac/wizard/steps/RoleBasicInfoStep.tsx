'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Church, Users, Lightbulb, HandshakeIcon } from 'lucide-react';
import type { RoleWizardData } from '../RoleWizard';

interface RoleBasicInfoStepProps {
  data: RoleWizardData;
  onUpdate: (data: Partial<RoleWizardData>) => void;
  readOnly?: boolean;
}

const SCOPE_OPTIONS = [
  {
    value: 'tenant',
    label: 'Organization',
    description: 'Church-wide access across all campuses and ministries',
    icon: Building,
    color: 'bg-primary/10 text-primary border-primary/20',
  },
  {
    value: 'campus',
    label: 'Campus',
    description: 'Access limited to a specific campus location',
    icon: Church,
    color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
  },
  {
    value: 'ministry',
    label: 'Ministry',
    description: 'Access limited to a specific ministry or department',
    icon: Users,
    color: 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400',
  },
] as const;

export function RoleBasicInfoStep({ data, onUpdate, readOnly = false }: RoleBasicInfoStepProps) {
  const selectedScope = SCOPE_OPTIONS.find((s) => s.value === data.scope);

  return (
    <div className="space-y-6">
      {/* Role Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Role Name {!readOnly && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="name"
          placeholder="e.g., Finance Manager, Campus Leader, Worship Team"
          value={data.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full"
          autoFocus={!readOnly}
          readOnly={readOnly}
          disabled={readOnly}
        />
        {!readOnly && (
          <p className="text-xs text-muted-foreground">
            Choose a clear, descriptive name that reflects the role&apos;s purpose
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder={readOnly ? 'No description' : "Describe the responsibilities and purpose of this role..."}
          value={data.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          className="w-full resize-none"
          readOnly={readOnly}
          disabled={readOnly}
        />
        {!readOnly && (
          <p className="text-xs text-muted-foreground">
            Help administrators understand when to assign this role
          </p>
        )}
      </div>

      {/* Scope Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Scope</Label>

        {readOnly ? (
          /* Read-only: Show selected scope as a card */
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
            {selectedScope && (
              <>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedScope.color}`}>
                  <selectedScope.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedScope.label}</p>
                  <p className="text-xs text-muted-foreground">{selectedScope.description}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: Dropdown Select */}
            <div className="sm:hidden">
              <Select
                value={data.scope}
                onValueChange={(value: 'tenant' | 'campus' | 'ministry') =>
                  onUpdate({ scope: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedScope && (
                <p className="mt-2 text-xs text-muted-foreground">{selectedScope.description}</p>
              )}
            </div>

            {/* Desktop: Card Selection */}
            <div className="hidden sm:grid sm:grid-cols-3 gap-3">
              {SCOPE_OPTIONS.map((option) => {
                const isSelected = data.scope === option.value;
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onUpdate({ scope: option.value })}
                    className={`
                      relative p-4 rounded-lg border-2 text-left transition-all
                      hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20
                      ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className="flex flex-col gap-2">
                      <div
                        className={`
                          w-10 h-10 rounded-lg flex items-center justify-center
                          ${isSelected ? option.color : 'bg-muted'}
                        `}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="default" className="text-xs px-1.5 py-0.5">
                          Selected
                        </Badge>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Delegatable Toggle */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-muted flex-shrink-0">
              <HandshakeIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="delegatable" className="text-sm font-medium cursor-pointer">
                    Allow Delegation
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Users with this role can delegate it to other users within their scope
                  </p>
                </div>
                {readOnly ? (
                  <Badge variant={data.is_delegatable ? 'default' : 'secondary'}>
                    {data.is_delegatable ? 'Enabled' : 'Disabled'}
                  </Badge>
                ) : (
                  <Switch
                    id="delegatable"
                    checked={data.is_delegatable}
                    onCheckedChange={(checked) => onUpdate({ is_delegatable: checked })}
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card - Only show in edit/create mode */}
      {!readOnly && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-sm text-primary">Quick Tips</p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Use descriptive names like &quot;Worship Leader&quot; instead of abbreviations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Organization scope is best for church-wide administrative roles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">-</span>
                    <span>Enable delegation for team leads who need to assign temporary access</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
