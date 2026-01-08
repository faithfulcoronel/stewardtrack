'use client';

import { useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Search,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Key,
  Filter,
  X,
  ChevronDown,
} from 'lucide-react';
import type { RoleWizardData } from '../RoleWizard';
import type { Permission } from '@/models/rbac.model';

interface RolePermissionsStepProps {
  data: RoleWizardData;
  onUpdate: (data: Partial<RoleWizardData>) => void;
  readOnly?: boolean;
}

export function RolePermissionsStep({ data, onUpdate, readOnly = false }: RolePermissionsStepProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rbac/permissions');
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }
      const result = await response.json();
      setPermissions(result.data || []);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError('Failed to load permissions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    return permissions.reduce(
      (acc, permission) => {
        const module = permission.module || 'other';
        if (!acc[module]) {
          acc[module] = [];
        }
        acc[module].push(permission);
        return acc;
      },
      {} as Record<string, Permission[]>
    );
  }, [permissions]);

  const modules = useMemo(() => Object.keys(groupedPermissions).sort(), [groupedPermissions]);

  // Filter permissions based on search and module
  const filteredPermissions = useMemo(() => {
    return permissions.filter((permission) => {
      const matchesSearch =
        searchQuery === '' ||
        permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        permission.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        permission.code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesModule =
        selectedModule === 'all' || permission.module === selectedModule;

      return matchesSearch && matchesModule;
    });
  }, [permissions, searchQuery, selectedModule]);

  // Group filtered permissions by module
  const filteredGroupedPermissions = useMemo(() => {
    return filteredPermissions.reduce(
      (acc, permission) => {
        const module = permission.module || 'other';
        if (!acc[module]) {
          acc[module] = [];
        }
        acc[module].push(permission);
        return acc;
      },
      {} as Record<string, Permission[]>
    );
  }, [filteredPermissions]);

  const filteredModules = useMemo(
    () => Object.keys(filteredGroupedPermissions).sort(),
    [filteredGroupedPermissions]
  );

  const togglePermission = (permissionId: string) => {
    if (readOnly) return;
    const newSelected = data.selectedPermissions.includes(permissionId)
      ? data.selectedPermissions.filter((id) => id !== permissionId)
      : [...data.selectedPermissions, permissionId];
    onUpdate({ selectedPermissions: newSelected });
  };

  const selectAllInModule = (module: string) => {
    if (readOnly) return;
    const modulePermissions = groupedPermissions[module] || [];
    const modulePermissionIds = modulePermissions.map((p) => p.id);
    const allSelected = modulePermissionIds.every((id) =>
      data.selectedPermissions.includes(id)
    );

    if (allSelected) {
      onUpdate({
        selectedPermissions: data.selectedPermissions.filter(
          (id) => !modulePermissionIds.includes(id)
        ),
      });
    } else {
      const newSelected = [
        ...data.selectedPermissions,
        ...modulePermissionIds.filter((id) => !data.selectedPermissions.includes(id)),
      ];
      onUpdate({ selectedPermissions: newSelected });
    }
  };

  const clearAllSelections = () => {
    if (readOnly) return;
    onUpdate({ selectedPermissions: [] });
  };

  const getModuleSelectedCount = (module: string): number => {
    const modulePermissions = groupedPermissions[module] || [];
    return modulePermissions.filter((p) => data.selectedPermissions.includes(p.id)).length;
  };

  const isModuleFullySelected = (module: string): boolean => {
    const modulePermissions = groupedPermissions[module] || [];
    return (
      modulePermissions.length > 0 &&
      modulePermissions.every((p) => data.selectedPermissions.includes(p.id))
    );
  };

  const isModulePartiallySelected = (module: string): boolean => {
    const selected = getModuleSelectedCount(module);
    const total = (groupedPermissions[module] || []).length;
    return selected > 0 && selected < total;
  };

  // Auto-expand modules with selections or first module on load
  useEffect(() => {
    if (modules.length > 0 && expandedModules.length === 0) {
      // Expand modules that have selections, or the first module
      const modulesWithSelections = modules.filter(
        (m) => getModuleSelectedCount(m) > 0
      );
      setExpandedModules(
        modulesWithSelections.length > 0 ? modulesWithSelections : [modules[0]]
      );
    }
  }, [modules]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium mb-2">{error}</p>
            <Button onClick={fetchPermissions} variant="outline" className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Module Filter */}
        <Select value={selectedModule} onValueChange={setSelectedModule}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {modules.map((module) => (
              <SelectItem key={module} value={module}>
                <span className="capitalize">{module}</span>
                <span className="text-muted-foreground ml-1">
                  ({groupedPermissions[module].length})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selection Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="font-medium text-sm">
                {data.selectedPermissions.length} permission
                {data.selectedPermissions.length !== 1 ? 's' : ''} {readOnly ? 'assigned' : 'selected'}
              </span>
            </div>
            {!readOnly && data.selectedPermissions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllSelections}>
                Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions List */}
      <div className="space-y-2">
        {filteredModules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No permissions found matching your search.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion
            type="multiple"
            value={expandedModules}
            onValueChange={setExpandedModules}
            className="space-y-2"
          >
            {filteredModules.map((module) => {
              const modulePermissions = filteredGroupedPermissions[module];
              const selectedCount = getModuleSelectedCount(module);
              const totalCount = (groupedPermissions[module] || []).length;
              const isFullySelected = isModuleFullySelected(module);
              const isPartiallySelected = isModulePartiallySelected(module);

              return (
                <AccordionItem
                  key={module}
                  value={module}
                  className="border rounded-lg overflow-hidden"
                >
                  <div className="flex items-center px-4 py-3 hover:bg-muted/50">
                    {/* Checkbox outside of AccordionTrigger to avoid nested buttons */}
                    {!readOnly && (
                      <Checkbox
                        checked={isFullySelected}
                        ref={(el) => {
                          if (el) {
                            (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isPartiallySelected;
                          }
                        }}
                        onCheckedChange={() => selectAllInModule(module)}
                        className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary mr-3"
                      />
                    )}
                    <AccordionTrigger className="flex-1 hover:no-underline p-0 [&>svg]:ml-auto">
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="font-medium capitalize">{module}</span>
                        <Badge
                          variant={selectedCount > 0 ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {selectedCount}/{totalCount}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent className="px-4 pb-3">
                    <div className="space-y-1 pt-2">
                      {modulePermissions.map((permission) => (
                        <PermissionItem
                          key={permission.id}
                          permission={permission}
                          isSelected={data.selectedPermissions.includes(permission.id)}
                          onToggle={() => togglePermission(permission.id)}
                          readOnly={readOnly}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {/* Help Text */}
      {data.selectedPermissions.length === 0 && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          Select at least one permission to continue
        </p>
      )}
    </div>
  );
}

interface PermissionItemProps {
  permission: Permission;
  isSelected: boolean;
  onToggle: () => void;
  readOnly?: boolean;
}

function PermissionItem({ permission, isSelected, onToggle, readOnly = false }: PermissionItemProps) {
  const Component = readOnly ? 'div' : 'button';

  return (
    <Component
      type={readOnly ? undefined : 'button'}
      onClick={readOnly ? undefined : onToggle}
      className={`
        w-full flex items-start gap-3 p-3 rounded-md border text-left
        transition-colors duration-150
        ${readOnly ? 'cursor-default' : ''}
        ${
          isSelected
            ? 'bg-primary/5 border-primary/30' + (readOnly ? '' : ' hover:bg-primary/10')
            : 'border-transparent' + (readOnly ? '' : ' hover:bg-muted/50')
        }
      `}
    >
      {!readOnly ? (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 flex-shrink-0"
        />
      ) : (
        <CheckCircle2
          className={`mt-0.5 flex-shrink-0 h-4 w-4 ${
            isSelected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
          }`}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{permission.name}</span>
          {permission.code && (
            <Badge variant="outline" className="text-xs font-mono">
              {permission.code}
            </Badge>
          )}
        </div>
        {permission.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {permission.description}
          </p>
        )}
      </div>
    </Component>
  );
}
