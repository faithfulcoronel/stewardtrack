"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Church,
  Users,
  Music,
  BookOpen,
  Heart,
  HandHeart,
  Megaphone,
  Calendar,
  Star,
  Cross,
  Mic2,
  Guitar,
  Baby,
  GraduationCap,
  Coffee,
  Utensils,
  Home,
  Globe,
  Lightbulb,
  MessageCircle,
  Phone,
  Mail,
  Camera,
  Video,
  Palette,
  Wrench,
  Shield,
  Award,
  Target,
  Flag,
  Bookmark,
  type LucideIcon,
} from "lucide-react";

export interface IconOption {
  name: string;
  icon: LucideIcon;
  label: string;
}

const ICON_OPTIONS: IconOption[] = [
  { name: "church", icon: Church, label: "Church" },
  { name: "users", icon: Users, label: "Users/Team" },
  { name: "music", icon: Music, label: "Music" },
  { name: "book-open", icon: BookOpen, label: "Bible/Book" },
  { name: "heart", icon: Heart, label: "Heart" },
  { name: "hand-heart", icon: HandHeart, label: "Care/Outreach" },
  { name: "megaphone", icon: Megaphone, label: "Announcements" },
  { name: "calendar", icon: Calendar, label: "Calendar" },
  { name: "star", icon: Star, label: "Star" },
  { name: "cross", icon: Cross, label: "Cross" },
  { name: "mic-2", icon: Mic2, label: "Microphone" },
  { name: "guitar", icon: Guitar, label: "Guitar" },
  { name: "baby", icon: Baby, label: "Children" },
  { name: "graduation-cap", icon: GraduationCap, label: "Education" },
  { name: "coffee", icon: Coffee, label: "Fellowship" },
  { name: "utensils", icon: Utensils, label: "Food/Kitchen" },
  { name: "home", icon: Home, label: "Home" },
  { name: "globe", icon: Globe, label: "Missions" },
  { name: "lightbulb", icon: Lightbulb, label: "Ideas" },
  { name: "message-circle", icon: MessageCircle, label: "Communication" },
  { name: "phone", icon: Phone, label: "Phone" },
  { name: "mail", icon: Mail, label: "Email" },
  { name: "camera", icon: Camera, label: "Media" },
  { name: "video", icon: Video, label: "Video" },
  { name: "palette", icon: Palette, label: "Arts" },
  { name: "wrench", icon: Wrench, label: "Maintenance" },
  { name: "shield", icon: Shield, label: "Security" },
  { name: "award", icon: Award, label: "Award" },
  { name: "target", icon: Target, label: "Goals" },
  { name: "flag", icon: Flag, label: "Flag" },
  { name: "bookmark", icon: Bookmark, label: "Bookmark" },
];

export interface IconPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function IconPicker({
  value,
  onChange,
  placeholder = "Select an icon",
  disabled = false,
}: IconPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedIcon = ICON_OPTIONS.find((opt) => opt.name === value);
  const SelectedIconComponent = selectedIcon?.icon;

  const filteredIcons = React.useMemo(() => {
    if (!search.trim()) return ICON_OPTIONS;
    const query = search.toLowerCase();
    return ICON_OPTIONS.filter(
      (opt) =>
        opt.name.toLowerCase().includes(query) ||
        opt.label.toLowerCase().includes(query)
    );
  }, [search]);

  const handleSelect = (iconName: string) => {
    onChange?.(iconName);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start gap-2 font-normal"
          disabled={disabled}
        >
          {SelectedIconComponent ? (
            <>
              <SelectedIconComponent className="h-4 w-4" />
              <span>{selectedIcon.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        align="start"
        sideOffset={4}
      >
        <div className="p-2 border-b border-border">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div
          className="p-2 max-h-[240px] overflow-y-auto"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "4px",
          }}
        >
          {filteredIcons.map((option) => {
            const IconComponent = option.icon;
            const isSelected = value === option.name;
            return (
              <button
                key={option.name}
                type="button"
                onClick={() => handleSelect(option.name)}
                className={cn(
                  "flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors",
                  isSelected && "bg-primary/10 ring-2 ring-primary"
                )}
                title={option.label}
                style={{
                  width: "100%",
                  aspectRatio: "1",
                }}
              >
                <IconComponent className="h-5 w-5" />
              </button>
            );
          })}
        </div>
        {filteredIcons.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No icons found
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { ICON_OPTIONS };
