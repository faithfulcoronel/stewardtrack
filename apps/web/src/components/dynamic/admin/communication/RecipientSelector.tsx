"use client";

/**
 * ================================================================================
 * RECIPIENT SELECTOR COMPONENT
 * ================================================================================
 *
 * Multi-source recipient picker for communication campaigns.
 * Supports selecting recipients from:
 * - Individual members
 * - Family households
 * - Event attendees
 * - Ministry groups
 * - Custom saved lists
 * - Manual email/phone entry
 *
 * ================================================================================
 */

import * as React from "react";
import {
  Users,
  User,
  Home,
  Calendar,
  Building2,
  ListPlus,
  Search,
  X,
  Check,
  Loader2,
  ChevronDown,
  Mail,
  Phone,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Recipient source types */
export type RecipientSource =
  | "member"
  | "family"
  | "event"
  | "ministry"
  | "list"
  | "external";

/** Individual recipient entry */
export interface Recipient {
  id: string;
  source: RecipientSource;
  sourceId?: string;
  sourceName?: string;
  name: string;
  email?: string;
  phone?: string;
}

/** Group of recipients from a source */
export interface RecipientGroup {
  id: string;
  source: RecipientSource;
  name: string;
  description?: string;
  memberCount: number;
}

export interface RecipientSelectorProps {
  /** Currently selected recipients */
  value?: Recipient[];
  /** Callback when recipients change */
  onChange?: (recipients: Recipient[]) => void;
  /** Available members to select from */
  members?: Recipient[];
  /** Available families to select from */
  families?: RecipientGroup[];
  /** Available events to select from */
  events?: RecipientGroup[];
  /** Available ministries to select from */
  ministries?: RecipientGroup[];
  /** Available custom lists to select from */
  customLists?: RecipientGroup[];
  /** Callback to load members for a group */
  onLoadGroupMembers?: (
    source: RecipientSource,
    groupId: string
  ) => Promise<Recipient[]>;
  /** Callback to search members */
  onSearchMembers?: (query: string) => Promise<Recipient[]>;
  /** Whether the selector is loading data */
  isLoading?: boolean;
  /** Maximum number of recipients allowed */
  maxRecipients?: number;
  /** Whether to allow external (manual) recipients */
  allowExternal?: boolean;
  /** Which channels are enabled (affects which fields are required) */
  channels?: ("email" | "sms")[];
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional class name */
  className?: string;
}

interface SourceConfig {
  source: RecipientSource;
  label: string;
  icon: React.ElementType;
  color: string;
}

const SOURCE_CONFIGS: SourceConfig[] = [
  { source: "member", label: "Members", icon: User, color: "text-blue-500" },
  { source: "family", label: "Families", icon: Home, color: "text-green-500" },
  { source: "event", label: "Events", icon: Calendar, color: "text-orange-500" },
  { source: "ministry", label: "Ministries", icon: Building2, color: "text-purple-500" },
  { source: "list", label: "Custom Lists", icon: ListPlus, color: "text-pink-500" },
];

function getSourceConfig(source: RecipientSource): SourceConfig {
  return (
    SOURCE_CONFIGS.find((c) => c.source === source) || {
      source: "member",
      label: "Unknown",
      icon: User,
      color: "text-gray-500",
    }
  );
}

export function RecipientSelector({
  value = [],
  onChange,
  members = [],
  families = [],
  events = [],
  ministries = [],
  customLists = [],
  onLoadGroupMembers,
  onSearchMembers,
  isLoading = false,
  maxRecipients,
  allowExternal = true,
  channels = ["email"],
  disabled = false,
  className,
}: RecipientSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Recipient[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [expandedSources, setExpandedSources] = React.useState<Set<RecipientSource>>(
    new Set(["member"])
  );
  const [loadingGroups, setLoadingGroups] = React.useState<Set<string>>(new Set());
  const [showAddExternalDialog, setShowAddExternalDialog] = React.useState(false);
  const [externalForm, setExternalForm] = React.useState({
    name: "",
    email: "",
    phone: "",
  });

  // Search members when query changes
  React.useEffect(() => {
    if (!searchQuery.trim() || !onSearchMembers) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await onSearchMembers(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearchMembers]);

  // Check if recipient is selected
  const isSelected = React.useCallback(
    (recipient: Recipient) => {
      return value.some((r) => r.id === recipient.id && r.source === recipient.source);
    },
    [value]
  );

  // Toggle recipient selection
  const toggleRecipient = React.useCallback(
    (recipient: Recipient) => {
      if (isSelected(recipient)) {
        onChange?.(value.filter((r) => !(r.id === recipient.id && r.source === recipient.source)));
      } else {
        if (maxRecipients && value.length >= maxRecipients) {
          return; // Max reached
        }
        onChange?.([...value, recipient]);
      }
    },
    [value, onChange, isSelected, maxRecipients]
  );

  // Add all members from a group
  const addGroup = React.useCallback(
    async (source: RecipientSource, groupId: string, groupName: string) => {
      if (!onLoadGroupMembers) return;

      const loadingKey = `${source}-${groupId}`;
      setLoadingGroups((prev) => new Set([...prev, loadingKey]));

      try {
        const groupMembers = await onLoadGroupMembers(source, groupId);

        // Filter out already selected and add source info
        const newMembers = groupMembers
          .filter((m) => !isSelected(m))
          .map((m) => ({
            ...m,
            source,
            sourceId: groupId,
            sourceName: groupName,
          }));

        if (maxRecipients) {
          const available = maxRecipients - value.length;
          onChange?.([...value, ...newMembers.slice(0, available)]);
        } else {
          onChange?.([...value, ...newMembers]);
        }
      } catch (error) {
        console.error("Failed to load group members:", error);
      } finally {
        setLoadingGroups((prev) => {
          const next = new Set(prev);
          next.delete(loadingKey);
          return next;
        });
      }
    },
    [onLoadGroupMembers, value, onChange, isSelected, maxRecipients]
  );

  // Remove recipient
  const removeRecipient = React.useCallback(
    (recipient: Recipient) => {
      onChange?.(value.filter((r) => !(r.id === recipient.id && r.source === recipient.source)));
    },
    [value, onChange]
  );

  // Add external recipient
  const handleAddExternal = React.useCallback(() => {
    const hasEmail = channels.includes("email");
    const hasSms = channels.includes("sms");

    if (!externalForm.name.trim()) return;
    if (hasEmail && !externalForm.email.trim()) return;
    if (hasSms && !externalForm.phone.trim()) return;

    const newRecipient: Recipient = {
      id: `external-${Date.now()}`,
      source: "external",
      name: externalForm.name.trim(),
      email: externalForm.email.trim() || undefined,
      phone: externalForm.phone.trim() || undefined,
    };

    onChange?.([...value, newRecipient]);
    setExternalForm({ name: "", email: "", phone: "" });
    setShowAddExternalDialog(false);
  }, [externalForm, channels, value, onChange]);

  // Toggle source expansion
  const toggleSource = (source: RecipientSource) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  };

  // Get groups for a source
  const getGroups = (source: RecipientSource): RecipientGroup[] => {
    switch (source) {
      case "family":
        return families;
      case "event":
        return events;
      case "ministry":
        return ministries;
      case "list":
        return customLists;
      default:
        return [];
    }
  };

  // Count selected by source
  const getSourceCount = (source: RecipientSource): number => {
    return value.filter((r) => r.source === source).length;
  };

  const totalSelected = value.length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with count and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Recipients</span>
          <Badge variant="secondary">
            {totalSelected}
            {maxRecipients ? ` / ${maxRecipients}` : ""}
          </Badge>
        </div>

        {allowExternal && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddExternalDialog(true)}
            disabled={disabled || (maxRecipients ? totalSelected >= maxRecipients : false)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add External
          </Button>
        )}
      </div>

      {/* Search */}
      {onSearchMembers && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members by name or email..."
            className="pl-9"
            disabled={disabled}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {/* Search Results */}
      {searchQuery && searchResults.length > 0 && (
        <div className="border rounded-lg">
          <ScrollArea className="h-48">
            <div className="p-2 space-y-1">
              {searchResults.map((member) => (
                <button
                  key={member.id}
                  onClick={() => toggleRecipient(member)}
                  disabled={disabled}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                    "hover:bg-muted/50",
                    isSelected(member) && "bg-primary/10"
                  )}
                >
                  <div
                    className={cn(
                      "h-5 w-5 rounded border flex items-center justify-center",
                      isSelected(member)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    {isSelected(member) && <Check className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.email || member.phone}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Source Categories */}
      {!searchQuery && (
        <div className="border rounded-lg divide-y">
          {/* Individual Members */}
          <Collapsible
            open={expandedSources.has("member")}
            onOpenChange={() => toggleSource("member")}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Individual Members</span>
                {getSourceCount("member") > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {getSourceCount("member")}
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedSources.has("member") && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="h-48 border-t">
                <div className="p-2 space-y-1">
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {isLoading ? "Loading members..." : "No members available"}
                    </p>
                  ) : (
                    members.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => toggleRecipient(member)}
                        disabled={disabled}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                          "hover:bg-muted/50",
                          isSelected(member) && "bg-primary/10"
                        )}
                      >
                        <div
                          className={cn(
                            "h-5 w-5 rounded border flex items-center justify-center",
                            isSelected(member)
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border"
                          )}
                        >
                          {isSelected(member) && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email || member.phone}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>

          {/* Group Sources */}
          {SOURCE_CONFIGS.filter((c) => c.source !== "member").map((config) => {
            const groups = getGroups(config.source);
            if (groups.length === 0) return null;

            const Icon = config.icon;
            const count = getSourceCount(config.source);

            return (
              <Collapsible
                key={config.source}
                open={expandedSources.has(config.source)}
                onOpenChange={() => toggleSource(config.source)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", config.color)} />
                    <span className="font-medium">{config.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {count}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      expandedSources.has(config.source) && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t p-2 space-y-1">
                    {groups.map((group) => {
                      const loadingKey = `${config.source}-${group.id}`;
                      const isGroupLoading = loadingGroups.has(loadingKey);

                      return (
                        <div
                          key={group.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              addGroup(config.source, group.id, group.name)
                            }
                            disabled={disabled || isGroupLoading}
                          >
                            {isGroupLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Add All
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Selected Recipients Preview */}
      {totalSelected > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Selected Recipients ({totalSelected})
          </Label>
          <div className="flex flex-wrap gap-2">
            {value.slice(0, 10).map((recipient) => {
              const config = getSourceConfig(recipient.source);
              const Icon = config.icon;

              return (
                <Badge
                  key={`${recipient.source}-${recipient.id}`}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 gap-1"
                >
                  <Icon className={cn("h-3 w-3", config.color)} />
                  <span className="truncate max-w-32">{recipient.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-0.5 hover:bg-destructive/20"
                    onClick={() => removeRecipient(recipient)}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
            {totalSelected > 10 && (
              <Badge variant="outline">+{totalSelected - 10} more</Badge>
            )}
          </div>
        </div>
      )}

      {/* Add External Dialog */}
      <Dialog open={showAddExternalDialog} onOpenChange={setShowAddExternalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Recipient</DialogTitle>
            <DialogDescription>
              Add someone who isn&apos;t in your member database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ext-name">Name *</Label>
              <Input
                id="ext-name"
                value={externalForm.name}
                onChange={(e) =>
                  setExternalForm({ ...externalForm, name: e.target.value })
                }
                placeholder="Full name"
              />
            </div>

            {channels.includes("email") && (
              <div className="space-y-2">
                <Label htmlFor="ext-email">
                  Email {channels.length === 1 ? "*" : ""}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ext-email"
                    type="email"
                    value={externalForm.email}
                    onChange={(e) =>
                      setExternalForm({ ...externalForm, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            {channels.includes("sms") && (
              <div className="space-y-2">
                <Label htmlFor="ext-phone">
                  Phone {channels.length === 1 ? "*" : ""}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ext-phone"
                    type="tel"
                    value={externalForm.phone}
                    onChange={(e) =>
                      setExternalForm({ ...externalForm, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                    className="pl-9"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExternalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExternal}>Add Recipient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
