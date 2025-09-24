"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagsInputProps {
  value: unknown;
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

function toTagArray(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item ?? "")))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function TagsInput({ value, onChange, placeholder, className }: TagsInputProps) {
  const tags = React.useMemo(() => toTagArray(value), [value]);
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const normalizedTags = React.useMemo(() => tags.map((tag) => tag.toLowerCase()), [tags]);

  const addTag = React.useCallback(
    (rawTag: string) => {
      const trimmed = rawTag.trim();
      if (!trimmed) {
        return;
      }
      const exists = normalizedTags.includes(trimmed.toLowerCase());
      if (exists) {
        setInputValue("");
        return;
      }
      onChange([...tags, trimmed]);
      setInputValue("");
    },
    [normalizedTags, onChange, tags],
  );

  const addFromInput = React.useCallback(() => {
    if (!inputValue.trim()) {
      return;
    }
    addTag(inputValue);
  }, [addTag, inputValue]);

  const removeTag = React.useCallback(
    (index: number) => {
      const next = tags.filter((_, itemIndex) => itemIndex !== index);
      onChange(next);
    },
    [onChange, tags],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        addFromInput();
        return;
      }

      if (event.key === "Backspace" && !inputValue) {
        if (tags.length === 0) {
          return;
        }
        event.preventDefault();
        removeTag(tags.length - 1);
        return;
      }
    },
    [addFromInput, inputValue, removeTag, tags],
  );

  const handleBlur = React.useCallback(() => {
    addFromInput();
  }, [addFromInput]);

  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      const text = event.clipboardData?.getData("text");
      if (!text) {
        return;
      }

      const candidateTags = text
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (candidateTags.length <= 1) {
        return;
      }

      event.preventDefault();
      let next = [...tags];
      for (const tag of candidateTags) {
        if (!next.some((item) => item.toLowerCase() === tag.toLowerCase())) {
          next = [...next, tag];
        }
      }
      onChange(next);
      setInputValue("");
    },
    [onChange, tags],
  );

  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
        className,
      )}
      onClick={() => {
        inputRef.current?.focus();
      }}
    >
      {tags.map((tag, index) => (
        <Badge key={`${tag}-${index}`} variant="secondary" className="flex items-center gap-1">
          <span>{tag}</span>
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </Badge>
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder={tags.length === 0 ? placeholder : undefined}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

