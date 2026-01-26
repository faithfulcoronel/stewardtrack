"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Plus, Users, Trash2, Home, Check, X, Search, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface FamilyOption {
  id: string;
  name: string;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  member_count?: number;
}

export type FamilyRoleType =
  | 'head' | 'spouse' | 'parent' | 'child' | 'sibling' | 'dependent'
  | 'grandparent' | 'grandchild'
  | 'uncle' | 'aunt' | 'nephew' | 'niece' | 'cousin'
  | 'parent_in_law' | 'child_in_law' | 'sibling_in_law'
  | 'stepparent' | 'stepchild' | 'stepsibling'
  | 'guardian' | 'ward' | 'foster_parent' | 'foster_child'
  | 'other';

export interface FamilyMembership {
  familyId: string;
  familyName: string;
  role: FamilyRoleType;
  isPrimary: boolean;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
}

export interface FamilyMembershipManagerProps {
  /** Available families to select from */
  families?: FamilyOption[];
  /** Current family memberships */
  memberships?: FamilyMembership[];
  /** Callback when memberships change */
  onChange?: (memberships: FamilyMembership[]) => void;
  /** Callback to create a new family */
  onCreateFamily?: (name: string) => Promise<FamilyOption | null>;
  /** Whether the component is in read-only mode */
  readOnly?: boolean;
  /** CSS class name */
  className?: string;
  /** Title for the section */
  title?: string;
  /** Description for the section */
  description?: string;
}

const ROLE_OPTIONS: { value: FamilyMembership['role']; label: string; group?: string }[] = [
  // Primary household roles
  { value: 'head', label: 'Head of Family', group: 'Primary' },
  { value: 'spouse', label: 'Spouse', group: 'Primary' },
  { value: 'parent', label: 'Parent', group: 'Primary' },
  { value: 'child', label: 'Child', group: 'Primary' },
  { value: 'sibling', label: 'Sibling', group: 'Primary' },
  { value: 'dependent', label: 'Dependent', group: 'Primary' },
  // Extended family
  { value: 'grandparent', label: 'Grandparent', group: 'Extended' },
  { value: 'grandchild', label: 'Grandchild', group: 'Extended' },
  { value: 'uncle', label: 'Uncle', group: 'Extended' },
  { value: 'aunt', label: 'Aunt', group: 'Extended' },
  { value: 'nephew', label: 'Nephew', group: 'Extended' },
  { value: 'niece', label: 'Niece', group: 'Extended' },
  { value: 'cousin', label: 'Cousin', group: 'Extended' },
  // In-laws
  { value: 'parent_in_law', label: 'Parent-in-Law', group: 'In-Laws' },
  { value: 'child_in_law', label: 'Child-in-Law', group: 'In-Laws' },
  { value: 'sibling_in_law', label: 'Sibling-in-Law', group: 'In-Laws' },
  // Step relations
  { value: 'stepparent', label: 'Stepparent', group: 'Step' },
  { value: 'stepchild', label: 'Stepchild', group: 'Step' },
  { value: 'stepsibling', label: 'Stepsibling', group: 'Step' },
  // Legal relationships
  { value: 'guardian', label: 'Guardian', group: 'Legal' },
  { value: 'ward', label: 'Ward', group: 'Legal' },
  { value: 'foster_parent', label: 'Foster Parent', group: 'Legal' },
  { value: 'foster_child', label: 'Foster Child', group: 'Legal' },
  // Other
  { value: 'other', label: 'Other', group: 'Other' },
];

export function FamilyMembershipManager({
  families = [],
  memberships: initialMemberships = [],
  onChange,
  onCreateFamily,
  readOnly = false,
  className,
  title = "Family",
  description,
}: FamilyMembershipManagerProps) {
  const [memberships, setMemberships] = React.useState<FamilyMembership[]>(initialMemberships);
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = React.useState(false);
  const [newFamilyName, setNewFamilyName] = React.useState("");
  const [selectedFamilyIds, setSelectedFamilyIds] = React.useState<Set<string>>(new Set());
  const [availableFamilies, setAvailableFamilies] = React.useState<FamilyOption[]>(families);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Sync with external changes
  React.useEffect(() => {
    setMemberships(initialMemberships);
  }, [initialMemberships]);

  React.useEffect(() => {
    setAvailableFamilies(families);
  }, [families]);

  // Initialize selected families from current memberships
  React.useEffect(() => {
    if (isPickerOpen) {
      setSelectedFamilyIds(new Set(memberships.map(m => m.familyId)));
    }
  }, [isPickerOpen, memberships]);

  // Get primary family for address display
  const primaryFamily = memberships.find(m => m.isPrimary);

  // Filter families based on search query
  const filteredFamilies = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return availableFamilies;
    }
    const query = searchQuery.toLowerCase().trim();
    return availableFamilies.filter(
      (family) =>
        family.name.toLowerCase().includes(query) ||
        family.address_city?.toLowerCase().includes(query) ||
        family.address_state?.toLowerCase().includes(query)
    );
  }, [availableFamilies, searchQuery]);

  const handleOpenPicker = () => {
    setIsPickerOpen(true);
    setIsCreating(false);
    setNewFamilyName("");
    setCreateError(null);
    setSearchQuery("");
  };

  const handleClosePicker = () => {
    setIsPickerOpen(false);
    setIsCreating(false);
    setNewFamilyName("");
    setCreateError(null);
    setSearchQuery("");
  };

  const handleToggleFamily = (familyId: string) => {
    setSelectedFamilyIds(prev => {
      const next = new Set(prev);
      if (next.has(familyId)) {
        next.delete(familyId);
      } else {
        next.add(familyId);
      }
      return next;
    });
  };

  const handleCreateFamily = async () => {
    const trimmedName = newFamilyName.trim();
    if (!trimmedName) {
      setCreateError("Family name is required");
      return;
    }

    // Check for duplicate name
    const isDuplicate = availableFamilies.some(
      f => f.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setCreateError("A family with this name already exists");
      return;
    }

    if (!onCreateFamily) {
      setCreateError("Family creation is not available");
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      const newFamily = await onCreateFamily(trimmedName);
      if (newFamily) {
        setAvailableFamilies(prev => [...prev, newFamily]);
        setSelectedFamilyIds(prev => new Set([...prev, newFamily.id]));
        setNewFamilyName("");
        setIsCreating(false);
        setCreateError(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create family";
      setCreateError(message);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleConfirmSelection = () => {
    const newMemberships: FamilyMembership[] = [];
    const hasPrimary = memberships.find(m => selectedFamilyIds.has(m.familyId) && m.isPrimary);

    for (const familyId of selectedFamilyIds) {
      const existing = memberships.find(m => m.familyId === familyId);
      const family = availableFamilies.find(f => f.id === familyId);

      if (existing) {
        newMemberships.push(existing);
      } else if (family) {
        newMemberships.push({
          familyId: family.id,
          familyName: family.name,
          role: 'other',
          isPrimary: !hasPrimary && newMemberships.length === 0,
          address_street: family.address_street,
          address_city: family.address_city,
          address_state: family.address_state,
          address_postal_code: family.address_postal_code,
        });
      }
    }

    // Ensure at least one primary if there are memberships
    if (newMemberships.length > 0 && !newMemberships.some(m => m.isPrimary)) {
      newMemberships[0].isPrimary = true;
    }

    setMemberships(newMemberships);
    onChange?.(newMemberships);
    handleClosePicker();
  };

  const handleRoleChange = (familyId: string, role: FamilyMembership['role']) => {
    const updated = memberships.map(m =>
      m.familyId === familyId ? { ...m, role } : m
    );
    setMemberships(updated);
    onChange?.(updated);
  };

  const handleSetPrimary = (familyId: string) => {
    const updated = memberships.map(m => ({
      ...m,
      isPrimary: m.familyId === familyId,
    }));
    setMemberships(updated);
    onChange?.(updated);
  };

  const handleRemoveMembership = (familyId: string) => {
    let updated = memberships.filter(m => m.familyId !== familyId);
    // Ensure at least one primary if there are remaining memberships
    if (updated.length > 0 && !updated.some(m => m.isPrimary)) {
      updated = updated.map((m, i) => ({ ...m, isPrimary: i === 0 }));
    }
    setMemberships(updated);
    onChange?.(updated);
  };

  const formatAddress = (family: FamilyMembership | undefined) => {
    if (!family) return null;
    const parts = [
      family.address_street,
      [family.address_city, family.address_state].filter(Boolean).join(", "),
      family.address_postal_code,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenPicker}
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Families
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Family Memberships Grid */}
        {memberships.length > 0 ? (
          <div className="space-y-3">
            {memberships.map((membership) => (
              <div
                key={membership.familyId}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border bg-card",
                  membership.isPrimary && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{membership.familyName}</span>
                    {membership.isPrimary && (
                      <Badge variant="default" className="text-xs">Primary</Badge>
                    )}
                  </div>
                </div>

                {!readOnly && (
                  <>
                    <Select
                      value={membership.role}
                      onValueChange={(value) => handleRoleChange(membership.familyId, value as FamilyMembership['role'])}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {['Primary', 'Extended', 'In-Laws', 'Step', 'Legal', 'Other'].map((group) => {
                          const groupOptions = ROLE_OPTIONS.filter(opt => opt.group === group);
                          if (groupOptions.length === 0) return null;
                          return (
                            <SelectGroup key={group}>
                              <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group}</SelectLabel>
                              {groupOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {!membership.isPrimary && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(membership.familyId)}
                        title="Set as primary family"
                      >
                        <Home className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMembership(membership.familyId)}
                      className="text-destructive hover:text-destructive"
                      title="Remove from family"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {readOnly && (
                  <span className="text-sm text-muted-foreground">
                    {ROLE_OPTIONS.find(r => r.value === membership.role)?.label || membership.role}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No family associations</p>
            {!readOnly && (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleOpenPicker}
                className="mt-2"
              >
                Add to a family
              </Button>
            )}
          </div>
        )}

        {/* Primary Family Address (Read-only) */}
        {primaryFamily && formatAddress(primaryFamily) && (
          <div className="pt-3 border-t">
            <Label className="text-sm text-muted-foreground mb-2 block">
              Primary Family Address
            </Label>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Home className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-sm">{formatAddress(primaryFamily)}</span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Family Picker Modal */}
      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Family Memberships</DialogTitle>
            <DialogDescription>
              Select families this member belongs to. You can create new families if needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Create New Family Section */}
            {isCreating ? (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <Label htmlFor="newFamilyName">New Family Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="newFamilyName"
                    value={newFamilyName}
                    onChange={(e) => {
                      setNewFamilyName(e.target.value);
                      setCreateError(null);
                    }}
                    placeholder="e.g., The Johnson Family"
                    disabled={isSubmittingCreate}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSubmittingCreate) {
                        e.preventDefault();
                        handleCreateFamily();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleCreateFamily}
                    disabled={isSubmittingCreate}
                    title="Create family"
                  >
                    {isSubmittingCreate ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={isSubmittingCreate}
                    onClick={() => {
                      setIsCreating(false);
                      setNewFamilyName("");
                      setCreateError(null);
                    }}
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {createError && (
                  <p className="text-sm text-destructive">{createError}</p>
                )}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Family
              </Button>
            )}

            {/* Family List */}
            <div className="space-y-2">
              <Label>Available Families</Label>
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search families..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[220px] rounded-md border p-2">
                {filteredFamilies.length > 0 ? (
                  <div className="space-y-2">
                    {filteredFamilies.map((family) => (
                      <div
                        key={family.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedFamilyIds.has(family.id)
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => handleToggleFamily(family.id)}
                      >
                        <Checkbox
                          checked={selectedFamilyIds.has(family.id)}
                          onCheckedChange={() => handleToggleFamily(family.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{family.name}</p>
                          {(family.address_city || family.address_state) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[family.address_city, family.address_state].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                        {family.member_count !== undefined && (
                          <Badge variant="secondary" className="text-xs">
                            {family.member_count} member{family.member_count !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {searchQuery.trim() ? (
                      <>
                        <p className="text-sm">No families matching &quot;{searchQuery}&quot;</p>
                        <p className="text-xs mt-1">Try a different search or create a new family</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm">No families available</p>
                        <p className="text-xs mt-1">Create a new family to get started</p>
                      </>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClosePicker}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmSelection}>
              Confirm Selection ({selectedFamilyIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default FamilyMembershipManager;
