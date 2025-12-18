import * as React from "react";
import { format, isValid, parseISO } from "date-fns";

import { normalizeList } from "../shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

import type { FormFieldConfig, FormFieldOption } from "./types";
import { TagsInput } from "@/components/ui/tags-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMetadataClientContext } from "@/lib/metadata/context";
import { DatePicker } from "@/components/ui/date-picker";

function isTagsField(field: FormFieldConfig): boolean {
  return field.type === "tags" || field.name === "tags";
}

function toTagArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item ?? "")))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (value === null || value === undefined) {
    return [];
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = parseISO(trimmed);
    if (isValid(parsed)) {
      return parsed;
    }
    const timestamp = Date.parse(trimmed);
    if (!Number.isNaN(timestamp)) {
      const candidate = new Date(timestamp);
      return isValid(candidate) ? candidate : null;
    }
  }
  return null;
}

function formatDateValue(value: Date | null): string {
  if (!value || !isValid(value)) {
    return "";
  }
  return format(value, "yyyy-MM-dd");
}

export type ControllerRender = {
  value: unknown;
  onChange: (value: unknown) => void;
};

interface ImageUploadFieldProps {
  field: FormFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}

function toImageValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "object") {
    const url = (value as { url?: unknown }).url;
    if (typeof url === "string") {
      const trimmed = url.trim();
      return trimmed ? trimmed : null;
    }
  }
  return null;
}

function extractProfileStoragePath(url: string | null): string | null {
  if (!url) {
    return null;
  }
  const marker = "/storage/v1/object/public/profiles/";
  const index = url.indexOf(marker);
  if (index === -1) {
    return null;
  }
  const suffix = url.slice(index + marker.length);
  const [path] = suffix.split("?");
  return path ? decodeURIComponent(path) : null;
}

function ImageUploadField({ field, value, onChange }: ImageUploadFieldProps) {
  const { tenant } = useMetadataClientContext();
  const searchParams = useSearchParams();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);

  const [preview, setPreview] = React.useState<string | null>(() => toImageValue(value));
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const previousPathRef = React.useRef<string | null>(extractProfileStoragePath(preview));

  React.useEffect(() => {
    const normalized = toImageValue(value);
    setPreview(normalized);
    previousPathRef.current = extractProfileStoragePath(normalized);
  }, [value]);

  const removeFromStorage = React.useCallback(
    async (path: string | null) => {
      if (!path) {
        return;
      }
      try {
        const { error } = await supabase.storage.from("profiles").remove([path]);
        if (error) {
          throw error;
        }
      } catch (error) {
        console.error("Failed to delete profile photo", error);
      }
    },
    [supabase],
  );

  const handleFileSelection = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (event.target) {
        event.target.value = "";
      }
      if (!file) {
        return;
      }

      if (!tenant) {
        toast.error("We couldn't determine your tenant. Please refresh and try again.");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please choose an image file (PNG or JPEG).");
        return;
      }

      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        toast.error("Please choose an image smaller than 5MB.");
        return;
      }

      setIsUploading(true);
      const previousPath = previousPathRef.current;

      try {
        const extension = (file.name.split(".").pop() ?? file.type.split("/").pop() ?? "jpg").toLowerCase();
        const identifier = searchParams?.get("memberId")?.trim() || "member";
        const uniqueId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36);
        const path = `${tenant}/${identifier}-${uniqueId}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("profiles")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("profiles").getPublicUrl(path);

        previousPathRef.current = path;
        setPreview(publicUrl);
        onChange(publicUrl);

        if (previousPath && previousPath !== path) {
          await removeFromStorage(previousPath);
        }
      } catch (error) {
        console.error("Failed to upload profile photo", error);
        toast.error("Uploading the photo failed. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [onChange, removeFromStorage, searchParams, supabase, tenant],
  );

  const handleRemove = React.useCallback(async () => {
    if (isUploading) {
      return;
    }
    const currentPath = previousPathRef.current;
    setPreview(null);
    onChange(null);
    previousPathRef.current = null;
    await removeFromStorage(currentPath);
  }, [isUploading, onChange, removeFromStorage]);

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelection}
      />
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-dashed border-border/60 bg-muted/30">
          {preview ? (
            <Image
              src={preview}
              alt={`${field.label ?? "Profile"} preview`}
              width={96}
              height={96}
              className="h-full w-full object-cover"
              sizes="96px"
              unoptimized
            />
          ) : (
            <UploadCloud className="size-8 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Uploading...
              </span>
            ) : (
              "Upload photo"
            )}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start text-destructive"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <span className="flex items-center gap-2">
                <Trash2 className="size-4" aria-hidden="true" /> Remove photo
              </span>
            </Button>
          )}
          <p className="text-xs text-muted-foreground">PNG or JPG, up to 5MB.</p>
        </div>
      </div>
    </div>
  );
}

export function renderFieldInput(field: FormFieldConfig, controller: ControllerRender) {
  const basePlaceholder = field.placeholder ?? "";
  const disabled = Boolean(field.disabled);
  const readOnly = Boolean(field.readOnly);
  const isInteractive = !(disabled || readOnly);

  // Hidden fields should render as actual hidden inputs
  if (field.type === "hidden") {
    return (
      <input
        type="hidden"
        value={String(controller.value ?? "")}
      />
    );
  }

  if (isTagsField(field)) {
    const value = toTagArray(controller.value);
    return (
      <TagsInput
        value={value}
        onChange={(next) => controller.onChange(next)}
        placeholder={basePlaceholder || "Add a tag"}
        disabled={disabled}
        readOnly={readOnly}
      />
    );
  }

  switch (field.type) {
    case "textarea":
    case "multiline":
      return (
        <Textarea
          value={String(controller.value ?? "")}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder}
          className="min-h-[120px]"
          disabled={disabled}
          readOnly={readOnly}
        />
      );
    case "select": {
      const options = normalizeList<FormFieldOption>(field.options);
      return (
        <Select
          value={String(controller.value ?? "")}
          onValueChange={(value) => controller.onChange(value)}
          disabled={!isInteractive}
        >
          <SelectTrigger disabled={!isInteractive}>
            <SelectValue placeholder={basePlaceholder || "Choose"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "image":
      return <ImageUploadField field={field} value={controller.value} onChange={controller.onChange} />;
    case "toggle":
      return (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          <Switch
            checked={Boolean(controller.value)}
            onCheckedChange={(checked) => controller.onChange(checked)}
          />
          <span className="text-sm text-muted-foreground">{basePlaceholder || "Enable"}</span>
        </div>
      );
    case "currency":
      return (
        <Input
          type="number"
          min={0}
          step="0.01"
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder || "0.00"}
        />
      );
    case "date": {
      const dateValue = toDateValue(controller.value);
      return (
        <DatePicker
          mode="single"
          value={dateValue ?? undefined}
          onChange={(nextValue) => {
            const normalized = nextValue instanceof Date && isValid(nextValue) ? nextValue : null;
            controller.onChange(formatDateValue(normalized));
          }}
          placeholder={basePlaceholder || "Select date"}
          title={field.label ?? "Select date"}
          buttonProps={{ variant: "outline", disabled: !isInteractive }}
          isDisabled={!isInteractive}
        />
      );
    }
    case "number":
      return (
        <Input
          type="number"
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
    case "email":
      return (
        <Input
          type="email"
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder || "name@example.com"}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
    case "tel":
      return (
        <Input
          type="tel"
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder || "(000) 000-0000"}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
    case "text":
    default:
      return (
        <Input
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder}
          disabled={disabled}
          readOnly={readOnly}
        />
      );
  }
}
