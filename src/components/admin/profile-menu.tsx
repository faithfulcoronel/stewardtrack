"use client";

import { useRef } from "react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "../theme/theme-provider";
import { Globe, LogOut, Moon, Sun, User, UserCircle2, BadgeCheck } from "lucide-react";

export type ProfileMenuProps = {
  name: string;
  email: string;
  avatarUrl?: string | null;
  planLabel?: string;
  logoutAction: () => Promise<void>;
};

export function ProfileMenu({ name, email, avatarUrl, planLabel = "Pro", logoutAction }: ProfileMenuProps) {
  const initials = name ? name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "U";
  const { mode, setMode, resolvedMode } = useTheme();
  const isDark = mode === "dark" || (mode === "system" && resolvedMode === "dark");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-11 items-center gap-2 rounded-full border border-border/60 px-1.5 pr-3 text-sm font-medium"
        >
          <Avatar className="size-9 border border-border/60">
            <AvatarImage src={avatarUrl ?? undefined} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight md:inline-flex">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-72 rounded-2xl border-border/60 p-0">
        <DropdownMenuLabel className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 border border-border/60">
              <AvatarImage src={avatarUrl ?? undefined} alt={name} />
              <AvatarFallback className="text-base">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-sm">
              <div className="flex items-center gap-2">
                <p className="font-semibold leading-tight text-foreground">{name}</p>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  {planLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/60" />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <a className="flex items-center gap-3 px-4 py-2 text-sm" href="#">
              <User className="size-4" /> Public Profile
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a className="flex items-center gap-3 px-4 py-2 text-sm" href="#">
              <UserCircle2 className="size-4" /> My Account
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a className="flex items-center gap-3 px-4 py-2 text-sm" href="#">
              <BadgeCheck className="size-4" /> Dev Forum
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem className="px-4 py-2 text-sm">
            <div className="flex w-full items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Globe className="size-4" /> Language
              </span>
              <span className="text-xs text-muted-foreground">English</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-border/60" />
        <DropdownMenuItem
          className="px-4 py-2 text-sm"
          onSelect={(event) => {
            event.preventDefault();
            setMode(isDark ? "light" : "dark");
          }}
        >
          <span className="inline-flex items-center gap-2">
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="px-4 py-2 text-sm text-destructive focus:text-destructive"
          onSelect={() => {
            // Submit the hidden form to trigger the server action
            formRef.current?.requestSubmit();
          }}
        >
          <span className="flex w-full items-center gap-2">
            <LogOut className="size-4" /> Logout
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      {/* Hidden form for logout action - placed outside dropdown to ensure proper form submission */}
      <form ref={formRef} action={logoutAction} className="hidden" />
    </DropdownMenu>
  );
}

