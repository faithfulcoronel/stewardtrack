import type { FormFieldConfig } from "./types";

export function getFieldGridClassName(colSpan: FormFieldConfig["colSpan"] | null): string {
  switch (colSpan) {
    case "full":
      return "sm:col-span-2";
    case "third":
      return "sm:col-span-2 lg:col-span-1";
    default:
      return "";
  }
}

export function groupFieldsIntoRows(fields: FormFieldConfig[]): FormFieldConfig[][] {
  const rows: FormFieldConfig[][] = [];
  let currentRow: FormFieldConfig[] = [];
  let remainingColumns = 2;

  for (const field of fields) {
    const span = getFieldColumnSpanUnits(field.colSpan ?? null);

    if (span > remainingColumns && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      remainingColumns = 2;
    }

    currentRow.push(field);
    remainingColumns -= span;

    if (remainingColumns <= 0) {
      rows.push(currentRow);
      currentRow = [];
      remainingColumns = 2;
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

export function buildFieldRowHelperMap(rows: FormFieldConfig[][]): Map<string, boolean> {
  const map = new Map<string, boolean>();

  for (const row of rows) {
    const rowHasHelperText = row.some((field) => {
      const helperText = typeof field.helperText === "string" ? field.helperText : "";
      return helperText.trim().length > 0;
    });

    for (const field of row) {
      map.set(field.name, rowHasHelperText);
    }
  }

  return map;
}

function getFieldColumnSpanUnits(colSpan: FormFieldConfig["colSpan"] | null): number {
  switch (colSpan) {
    case "full":
      return 2;
    case "half":
    case "third":
    default:
      return 1;
  }
}

