"use client";

/**
 * ================================================================================
 * VARIABLE INSERTER COMPONENT
 * ================================================================================
 *
 * Dropdown button for inserting personalization variables into message content.
 * Variables are inserted in {{variable_name}} format for template substitution.
 *
 * ================================================================================
 */

import * as React from "react";
import { Variable, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface VariableDefinition {
  /** Variable name (without braces) */
  name: string;
  /** Human-readable label */
  label: string;
  /** Description of what this variable contains */
  description?: string;
  /** Example value for preview */
  example?: string;
  /** Category for grouping */
  category?: string;
}

export interface VariableInserterProps {
  /** Callback when a variable is selected */
  onInsert: (variable: string) => void;
  /** Additional variables beyond the defaults */
  customVariables?: VariableDefinition[];
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Optional class name */
  className?: string;
}

/** Default personalization variables available for all campaigns */
const DEFAULT_VARIABLES: VariableDefinition[] = [
  // Recipient Info
  {
    name: "first_name",
    label: "First Name",
    description: "Recipient's first name",
    example: "John",
    category: "Recipient",
  },
  {
    name: "last_name",
    label: "Last Name",
    description: "Recipient's last name",
    example: "Smith",
    category: "Recipient",
  },
  {
    name: "full_name",
    label: "Full Name",
    description: "Recipient's full name",
    example: "John Smith",
    category: "Recipient",
  },
  {
    name: "email",
    label: "Email",
    description: "Recipient's email address",
    example: "john@example.com",
    category: "Recipient",
  },
  {
    name: "phone",
    label: "Phone",
    description: "Recipient's phone number",
    example: "(555) 123-4567",
    category: "Recipient",
  },

  // Church Info
  {
    name: "church_name",
    label: "Church Name",
    description: "Your church's name",
    example: "Grace Community Church",
    category: "Church",
  },
  {
    name: "church_address",
    label: "Church Address",
    description: "Your church's address",
    example: "123 Main St, Anytown, USA",
    category: "Church",
  },
  {
    name: "church_phone",
    label: "Church Phone",
    description: "Your church's phone number",
    example: "(555) 987-6543",
    category: "Church",
  },
  {
    name: "church_email",
    label: "Church Email",
    description: "Your church's email",
    example: "info@gracechurch.org",
    category: "Church",
  },

  // Date/Time
  {
    name: "current_date",
    label: "Current Date",
    description: "Today's date",
    example: "January 25, 2026",
    category: "Date & Time",
  },
  {
    name: "current_year",
    label: "Current Year",
    description: "The current year",
    example: "2026",
    category: "Date & Time",
  },
];

/**
 * Groups variables by their category for organized display
 */
function groupVariablesByCategory(
  variables: VariableDefinition[]
): Record<string, VariableDefinition[]> {
  return variables.reduce(
    (acc, variable) => {
      const category = variable.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(variable);
      return acc;
    },
    {} as Record<string, VariableDefinition[]>
  );
}

export function VariableInserter({
  onInsert,
  customVariables = [],
  disabled = false,
  variant = "outline",
  size = "sm",
  className,
}: VariableInserterProps) {
  const allVariables = React.useMemo(() => {
    return [...DEFAULT_VARIABLES, ...customVariables];
  }, [customVariables]);

  const groupedVariables = React.useMemo(() => {
    return groupVariablesByCategory(allVariables);
  }, [allVariables]);

  const categories = React.useMemo(() => {
    return Object.keys(groupedVariables);
  }, [groupedVariables]);

  const handleSelect = React.useCallback(
    (variableName: string) => {
      onInsert(`{{${variableName}}}`);
    },
    [onInsert]
  );

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={variant}
                size={size}
                disabled={disabled}
                className={className}
              >
                <Variable className="h-4 w-4 mr-1.5" />
                Insert Variable
                <ChevronDown className="h-3 w-3 ml-1.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Add personalization variables to your message</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
          {categories.map((category, categoryIndex) => (
            <React.Fragment key={category}>
              {categoryIndex > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
                {category}
              </DropdownMenuLabel>
              {groupedVariables[category].map((variable) => (
                <DropdownMenuItem
                  key={variable.name}
                  onClick={() => handleSelect(variable.name)}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium">{variable.label}</span>
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground ml-auto">
                      {`{{${variable.name}}}`}
                    </code>
                  </div>
                  {variable.description && (
                    <span className="text-xs text-muted-foreground">
                      {variable.description}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
