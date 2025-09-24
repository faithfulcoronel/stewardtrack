import * as React from "react";

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

import type { FormFieldConfig, FormFieldOption } from "./types";

export type ControllerRender = {
  value: unknown;
  onChange: (value: unknown) => void;
};

export function renderFieldInput(field: FormFieldConfig, controller: ControllerRender) {
  const basePlaceholder = field.placeholder ?? "";

  switch (field.type) {
    case "textarea":
    case "multiline":
      return (
        <Textarea
          value={String(controller.value ?? "")}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder}
          className="min-h-[120px]"
        />
      );
    case "select": {
      const options = normalizeList<FormFieldOption>(field.options);
      return (
        <Select value={String(controller.value ?? "")} onValueChange={(value) => controller.onChange(value)}>
          <SelectTrigger>
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
    case "date":
      return (
        <Input
          type="date"
          value={controller.value ? String(controller.value) : ""}
          onChange={(event) => controller.onChange(event.target.value)}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder}
        />
      );
    case "email":
      return (
        <Input
          type="email"
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder || "name@example.com"}
        />
      );
    case "tel":
      return (
        <Input
          type="tel"
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder || "(000) 000-0000"}
        />
      );
    case "text":
    default:
      return (
        <Input
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder}
        />
      );
  }
}
