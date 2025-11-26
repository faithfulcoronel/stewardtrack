'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import type { RoleFormData } from '../RoleCreationWizard';

interface BasicInfoStepProps {
  formData: RoleFormData;
  updateFormData: (data: Partial<RoleFormData>) => void;
}

export function BasicInfoStep({ formData, updateFormData }: BasicInfoStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Provide the basic details for this role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Role Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Finance Manager, Campus Leader"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              className="max-w-md"
            />
            <p className="text-sm text-gray-500">
              Choose a clear, descriptive name for this role
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose and responsibilities of this role..."
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              rows={4}
            />
            <p className="text-sm text-gray-500">
              Help users understand when to assign this role
            </p>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label htmlFor="scope">Scope</Label>
            <Select
              value={formData.scope}
              onValueChange={(value: 'system' | 'tenant' | 'campus' | 'ministry') =>
                updateFormData({ scope: value })
              }
            >
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System - Available across all tenants</SelectItem>
                <SelectItem value="tenant">Tenant - Church-wide access</SelectItem>
                <SelectItem value="campus">Campus - Single campus scope</SelectItem>
                <SelectItem value="ministry">Ministry - Specific ministry team</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Determines where this role can be assigned
            </p>
          </div>

          {/* Delegatable */}
          <div className="flex items-center justify-between max-w-md p-4 border rounded-lg">
            <div className="flex-1">
              <Label htmlFor="delegatable" className="text-base font-medium">
                Delegatable Role
              </Label>
              <p className="text-sm text-gray-500">
                Allow users with this role to delegate it to others
              </p>
            </div>
            <Switch
              id="delegatable"
              checked={formData.is_delegatable}
              onCheckedChange={(checked) => updateFormData({ is_delegatable: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Tip */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-900">
              <p className="font-medium">Quick Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Use clear, recognizable names (e.g., "Worship Leader" not "WL01")</li>
                <li>Tenant scope is most common for church-wide roles</li>
                <li>Campus/Ministry scopes are for location or team-specific roles</li>
                <li>Enable delegation for leadership roles that need to assign access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
