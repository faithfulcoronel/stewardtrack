"use client";

/**
 * ================================================================================
 * RECIPIENT SELECTOR COMPONENT - MODERN REDESIGN
 * ================================================================================
 *
 * A beautiful, mobile-first recipient picker with smooth animations,
 * glass morphism effects, and intuitive touch interactions.
 *
 * Features:
 * - Mobile-first responsive design
 * - Tab-based source navigation
 * - Animated selection states
 * - Floating search with instant results
 * - Beautiful recipient cards with avatars
 * - Theme-aware glass effects
 * - Haptic-like feedback animations
 *
 * ================================================================================
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Mail,
  Phone,
  Plus,
  UserPlus,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Circle,
  CalendarCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CommunicationChannel } from "@/models/communication/campaign.model";

/** Recipient source types */
export type RecipientSource =
  | "member"
  | "family"
  | "event"
  | "ministry"
  | "registrant"
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
  /** Available event registrants to select from (includes guests) */
  registrants?: RecipientGroup[];
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
  channels?: CommunicationChannel[];
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional class name */
  className?: string;
}

interface SourceConfig {
  source: RecipientSource;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  gradient: string;
  bgColor: string;
  textColor: string;
}

const SOURCE_CONFIGS: SourceConfig[] = [
  {
    source: "member",
    label: "Individual Members",
    shortLabel: "Members",
    icon: User,
    gradient: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    source: "family",
    label: "Family Households",
    shortLabel: "Families",
    icon: Home,
    gradient: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    source: "event",
    label: "Event Attendees",
    shortLabel: "Events",
    icon: Calendar,
    gradient: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500/10 dark:bg-orange-500/20",
    textColor: "text-orange-600 dark:text-orange-400",
  },
  {
    source: "registrant",
    label: "Event Registrants",
    shortLabel: "Registrants",
    icon: CalendarCheck,
    gradient: "from-cyan-500 to-sky-500",
    bgColor: "bg-cyan-500/10 dark:bg-cyan-500/20",
    textColor: "text-cyan-600 dark:text-cyan-400",
  },
  {
    source: "ministry",
    label: "Ministry Groups",
    shortLabel: "Ministries",
    icon: Building2,
    gradient: "from-purple-500 to-violet-500",
    bgColor: "bg-purple-500/10 dark:bg-purple-500/20",
    textColor: "text-purple-600 dark:text-purple-400",
  },
  {
    source: "list",
    label: "Custom Lists",
    shortLabel: "Lists",
    icon: ListPlus,
    gradient: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-500/10 dark:bg-pink-500/20",
    textColor: "text-pink-600 dark:text-pink-400",
  },
];

function getSourceConfig(source: RecipientSource): SourceConfig {
  return (
    SOURCE_CONFIGS.find((c) => c.source === source) || {
      source: "member",
      label: "Unknown",
      shortLabel: "Unknown",
      icon: User,
      gradient: "from-gray-500 to-gray-600",
      bgColor: "bg-gray-500/10",
      textColor: "text-gray-600 dark:text-gray-400",
    }
  );
}

// Check if a string appears to be encrypted (AES-GCM format: version.iv.ciphertext.tag)
function isEncryptedData(value: string | undefined | null): boolean {
  if (!value) return false;
  // Encrypted format: "1.base64IV.base64Ciphertext.base64Tag" or similar
  const encryptedPattern = /^\d+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+/;
  return encryptedPattern.test(value);
}

// Get display name, handling encrypted data
function getDisplayName(name: string): string {
  if (isEncryptedData(name)) {
    return "Member (Encrypted)";
  }
  return name;
}

// Generate initials from name
function getInitials(name: string): string {
  // Handle encrypted names
  if (isEncryptedData(name)) {
    return "??";
  }

  const cleanName = name.trim();
  if (!cleanName) return "??";

  return cleanName
    .split(" ")
    .filter(n => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";
}

// Generate a consistent color based on name
function getAvatarColor(name: string): string {
  const colors = [
    "from-blue-400 to-blue-600",
    "from-emerald-400 to-emerald-600",
    "from-purple-400 to-purple-600",
    "from-orange-400 to-orange-600",
    "from-pink-400 to-pink-600",
    "from-cyan-400 to-cyan-600",
    "from-indigo-400 to-indigo-600",
    "from-rose-400 to-rose-600",
  ];
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

// Animated Avatar Component
function Avatar({
  name,
  isSelected,
  size = "md",
}: {
  name: string;
  isSelected?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const isEncrypted = isEncryptedData(name);
  const avatarColor = isEncrypted ? "from-gray-400 to-gray-500" : getAvatarColor(name);

  return (
    <motion.div
      className={cn(
        "relative rounded-full flex items-center justify-center font-medium text-white shadow-lg",
        "bg-gradient-to-br",
        avatarColor,
        sizeClasses[size]
      )}
      animate={{
        scale: isSelected ? 1.05 : 1,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {getInitials(name)}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-background"
          >
            <Check className="h-2.5 w-2.5 text-primary-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Get display contact info, handling encrypted data
function getDisplayContact(email?: string, phone?: string): string {
  if (email && !isEncryptedData(email)) {
    return email;
  }
  if (phone && !isEncryptedData(phone)) {
    return phone;
  }
  if (isEncryptedData(email) || isEncryptedData(phone)) {
    return "Contact info encrypted";
  }
  return "No contact info";
}

// Member Card Component
function MemberCard({
  member,
  isSelected,
  onToggle,
  disabled,
}: {
  member: Recipient;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const displayName = getDisplayName(member.name);
  const displayContact = getDisplayContact(member.email, member.phone);
  const isDataEncrypted = isEncryptedData(member.name);

  return (
    <motion.button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
        "border border-transparent",
        "hover:bg-muted/50 active:scale-[0.98]",
        isSelected && "bg-primary/5 border-primary/20 dark:bg-primary/10",
        isDataEncrypted && "opacity-75"
      )}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <Avatar name={member.name} isSelected={isSelected} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-sm truncate">{displayName}</p>
          {isDataEncrypted && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
              Encrypted
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {displayContact}
        </p>
      </div>
      <motion.div
        className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
        animate={{
          scale: isSelected ? 1 : 0.9,
          backgroundColor: isSelected ? "var(--primary)" : "var(--muted)",
        }}
      >
        {isSelected ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
      </motion.div>
    </motion.button>
  );
}

// Group Card Component
function GroupCard({
  group,
  config,
  isLoading,
  onAdd,
  disabled,
}: {
  group: RecipientGroup;
  config: SourceConfig;
  isLoading: boolean;
  onAdd: () => void;
  disabled?: boolean;
}) {
  const Icon = config.icon;

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4",
        "bg-gradient-to-br from-card to-card/80",
        "hover:shadow-lg transition-shadow"
      )}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Gradient accent */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
          config.gradient
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn("p-1.5 rounded-lg", config.bgColor)}>
              <Icon className={cn("h-4 w-4", config.textColor)} />
            </div>
            <h4 className="font-medium text-sm truncate">{group.name}</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onAdd}
          disabled={disabled || isLoading}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// Selected Recipients Floating Bar
function SelectedBar({
  recipients,
  onRemove,
  onClear,
  disabled,
}: {
  recipients: Recipient[];
  onRemove: (r: Recipient) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (recipients.length === 0) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <motion.button
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className={cn(
            "fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-auto",
            "flex items-center justify-between gap-3 px-4 py-3 rounded-2xl",
            "bg-primary text-primary-foreground shadow-2xl shadow-primary/25",
            "border border-primary-foreground/10"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex -space-x-2">
              {recipients.slice(0, 3).map((r, i) => {
                const isEncrypted = isEncryptedData(r.name);
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-medium text-white border-2 border-primary",
                      isEncrypted ? "from-gray-400 to-gray-500" : getAvatarColor(r.name)
                    )}
                    style={{ zIndex: 3 - i }}
                  >
                    {getInitials(r.name)}
                  </div>
                );
              })}
              {recipients.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-medium border-2 border-primary">
                  +{recipients.length - 3}
                </div>
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">
                {recipients.length} selected
              </p>
              <p className="text-xs opacity-80">Tap to manage</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 opacity-60" />
        </motion.button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            <span>Selected Recipients</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={disabled}
              className="text-destructive hover:text-destructive"
            >
              Clear All
            </Button>
          </SheetTitle>
          <SheetDescription>
            {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}{" "}
            will receive this campaign
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-80px)]">
          <div className="space-y-2 pr-4">
            {recipients.map((recipient) => {
              const config = getSourceConfig(recipient.source);
              const Icon = config.icon;
              const displayName = getDisplayName(recipient.name);
              const isDataEncrypted = isEncryptedData(recipient.name);

              return (
                <motion.div
                  key={`${recipient.source}-${recipient.id}`}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                >
                  <Avatar name={recipient.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate">
                        {displayName}
                      </p>
                      {isDataEncrypted && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium shrink-0">
                          Encrypted
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon className={cn("h-3 w-3", config.textColor)} />
                      <span>{config.shortLabel}</span>
                      {recipient.sourceName && !isEncryptedData(recipient.sourceName) && (
                        <>
                          <span>•</span>
                          <span className="truncate">{recipient.sourceName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemove(recipient)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Main Component
export function RecipientSelector({
  value = [],
  onChange,
  members = [],
  families = [],
  events = [],
  ministries = [],
  registrants = [],
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
  const [activeSource, setActiveSource] = React.useState<RecipientSource>("member");
  const [loadingGroups, setLoadingGroups] = React.useState<Set<string>>(new Set());
  const [groupSearchQuery, setGroupSearchQuery] = React.useState("");
  const [showAddExternalDialog, setShowAddExternalDialog] = React.useState(false);
  const [externalForm, setExternalForm] = React.useState({
    name: "",
    email: "",
    phone: "",
  });
  const searchInputRef = React.useRef<HTMLInputElement>(null);

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
      return value.some(
        (r) => r.id === recipient.id && r.source === recipient.source
      );
    },
    [value]
  );

  // Toggle recipient selection
  const toggleRecipient = React.useCallback(
    (recipient: Recipient) => {
      if (isSelected(recipient)) {
        onChange?.(
          value.filter(
            (r) => !(r.id === recipient.id && r.source === recipient.source)
          )
        );
      } else {
        if (maxRecipients && value.length >= maxRecipients) {
          return;
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
      onChange?.(
        value.filter(
          (r) => !(r.id === recipient.id && r.source === recipient.source)
        )
      );
    },
    [value, onChange]
  );

  // Clear all recipients
  const clearAll = React.useCallback(() => {
    onChange?.([]);
  }, [onChange]);

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

  // Get groups for a source
  const getGroups = (source: RecipientSource): RecipientGroup[] => {
    let groups: RecipientGroup[];
    switch (source) {
      case "family":
        groups = families;
        break;
      case "event":
        groups = events;
        break;
      case "registrant":
        groups = registrants;
        break;
      case "ministry":
        groups = ministries;
        break;
      case "list":
        groups = customLists;
        break;
      default:
        groups = [];
    }

    // Filter by group search query if present
    if (groupSearchQuery.trim()) {
      const query = groupSearchQuery.toLowerCase();
      return groups.filter(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          g.description?.toLowerCase().includes(query)
      );
    }

    return groups;
  };

  // Handle source tab change
  const handleSourceChange = (source: RecipientSource) => {
    setActiveSource(source);
    setGroupSearchQuery(""); // Clear group search when switching sources
  };

  // Count selected by source
  const getSourceCount = (source: RecipientSource): number => {
    return value.filter((r) => r.source === source).length;
  };

  // Get available sources (ones with data)
  const availableSources = SOURCE_CONFIGS.filter((config) => {
    if (config.source === "member") return members.length > 0 || onSearchMembers;
    return getGroups(config.source).length > 0;
  });

  const totalSelected = value.length;

  return (
    <div className={cn("relative", className)}>
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30 p-4 mb-4">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Select Recipients</h3>
              <p className="text-xs text-muted-foreground">
                Choose who will receive this campaign
              </p>
            </div>
          </div>

          {allowExternal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddExternalDialog(true)}
              disabled={
                disabled || (maxRecipients ? totalSelected >= maxRecipients : false)
              }
              className="gap-1.5 rounded-xl"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add External</span>
            </Button>
          )}
        </div>

        {/* Count badges */}
        <div className="relative flex items-center gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className={cn(
              "px-3 py-1.5 rounded-xl font-medium",
              totalSelected > 0 &&
                "bg-primary/10 text-primary border-primary/20"
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            {totalSelected} selected
            {maxRecipients && (
              <span className="opacity-60 ml-1">/ {maxRecipients}</span>
            )}
          </Badge>

          {totalSelected > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={disabled}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {onSearchMembers && (
        <div className="relative mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members by name or email..."
              className="pl-10 pr-10 h-12 rounded-xl border-2 focus:border-primary/50 transition-colors"
              disabled={disabled}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {searchQuery && (searchResults.length > 0 || isSearching) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 left-0 right-0 mt-2 rounded-xl border bg-popover shadow-xl overflow-hidden"
              >
                <ScrollArea className="max-h-64">
                  <div className="p-2">
                    {searchResults.length === 0 && isSearching ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Searching...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Search className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No members found</p>
                      </div>
                    ) : (
                      searchResults.map((member) => (
                        <MemberCard
                          key={member.id}
                          member={member}
                          isSelected={isSelected(member)}
                          onToggle={() => toggleRecipient(member)}
                          disabled={disabled}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Source Tabs */}
      {!searchQuery && availableSources.length > 0 && (
        <div className="mb-4">
          <ScrollArea className="w-full" type="scroll">
            <div className="flex gap-2 pb-2">
              {availableSources.map((config) => {
                const Icon = config.icon;
                const count = getSourceCount(config.source);
                const isActive = activeSource === config.source;

                return (
                  <motion.button
                    key={config.source}
                    onClick={() => handleSourceChange(config.source)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                      "border-2",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                    )}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                    <span className="sm:hidden">{config.shortLabel}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "ml-1 px-1.5 py-0.5 rounded-md text-xs",
                          isActive
                            ? "bg-primary-foreground/20"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Content Area */}
      {!searchQuery && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSource}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border bg-card/50 overflow-hidden"
          >
            {activeSource === "member" ? (
              // Members List
              <ScrollArea className="h-[320px] sm:h-[400px]">
                <div className="p-3 space-y-1">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin mb-3" />
                      <p className="text-sm">Loading members...</p>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <div className="p-4 rounded-full bg-muted mb-3">
                        <User className="h-8 w-8 opacity-50" />
                      </div>
                      <p className="text-sm font-medium">No members available</p>
                      <p className="text-xs mt-1">
                        Try searching or adding external recipients
                      </p>
                    </div>
                  ) : (
                    members.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        isSelected={isSelected(member)}
                        onToggle={() => toggleRecipient(member)}
                        disabled={disabled}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            ) : (
              // Group List
              <div className="flex flex-col h-[320px] sm:h-[400px]">
                {/* Group Search Input */}
                <div className="p-3 pb-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={groupSearchQuery}
                      onChange={(e) => setGroupSearchQuery(e.target.value)}
                      placeholder={`Search ${getSourceConfig(activeSource).label.toLowerCase()}...`}
                      className="pl-9 pr-9 h-10 rounded-lg"
                      disabled={disabled}
                    />
                    {groupSearchQuery && (
                      <button
                        onClick={() => setGroupSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {getGroups(activeSource).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <div className="p-4 rounded-full bg-muted mb-3">
                        {groupSearchQuery ? (
                          <Search className="h-8 w-8 opacity-50" />
                        ) : (
                          React.createElement(
                            getSourceConfig(activeSource).icon,
                            { className: "h-8 w-8 opacity-50" }
                          )
                        )}
                      </div>
                      <p className="text-sm font-medium">
                        {groupSearchQuery
                          ? `No ${getSourceConfig(activeSource).label.toLowerCase()} match "${groupSearchQuery}"`
                          : `No ${getSourceConfig(activeSource).label.toLowerCase()} available`}
                      </p>
                      {groupSearchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => setGroupSearchQuery("")}
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  ) : (
                    getGroups(activeSource).map((group) => {
                      const loadingKey = `${activeSource}-${group.id}`;
                      const isGroupLoading = loadingGroups.has(loadingKey);

                      return (
                        <GroupCard
                          key={group.id}
                          group={group}
                          config={getSourceConfig(activeSource)}
                          isLoading={isGroupLoading}
                          onAdd={() =>
                            addGroup(activeSource, group.id, group.name)
                          }
                          disabled={disabled}
                        />
                      );
                    })
                  )}
                </div>
                </ScrollArea>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Selected Recipients Bar (Mobile) */}
      <SelectedBar
        recipients={value}
        onRemove={removeRecipient}
        onClear={clearAll}
        disabled={disabled}
      />

      {/* Add External Dialog */}
      <Dialog open={showAddExternalDialog} onOpenChange={setShowAddExternalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Add External Recipient</DialogTitle>
                <DialogDescription>
                  Add someone who isn&apos;t in your member database
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ext-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ext-name"
                value={externalForm.name}
                onChange={(e) =>
                  setExternalForm({ ...externalForm, name: e.target.value })
                }
                placeholder="Full name"
                className="h-11 rounded-xl"
              />
            </div>

            {channels.includes("email") && (
              <div className="space-y-2">
                <Label htmlFor="ext-email" className="text-sm font-medium">
                  Email{" "}
                  {channels.length === 1 && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ext-email"
                    type="email"
                    value={externalForm.email}
                    onChange={(e) =>
                      setExternalForm({ ...externalForm, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    className="pl-10 h-11 rounded-xl"
                  />
                </div>
              </div>
            )}

            {channels.includes("sms") && (
              <div className="space-y-2">
                <Label htmlFor="ext-phone" className="text-sm font-medium">
                  Phone{" "}
                  {channels.length === 1 && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ext-phone"
                    type="tel"
                    value={externalForm.phone}
                    onChange={(e) =>
                      setExternalForm({ ...externalForm, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                    className="pl-10 h-11 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowAddExternalDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button onClick={handleAddExternal} className="rounded-xl gap-2">
              <Sparkles className="h-4 w-4" />
              Add Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
