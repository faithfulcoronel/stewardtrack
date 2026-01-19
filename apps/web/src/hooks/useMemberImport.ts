"use client";

import * as React from "react";
import type { ImportedRow, UseExcelImportResult } from "@/hooks/useExcelImport";

// =============================================================================
// Types
// =============================================================================

export interface MemberImportRow {
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  preferred_name?: string | null;
  email?: string | null;
  contact_number?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
  occupation?: string | null;
  membership_type_code?: string | null;
  membership_stage_code?: string | null;
  membership_center_code?: string | null;
  membership_date?: string | null;
  tags?: string[] | null;
}

interface PreviewResult {
  success: boolean;
  preview: boolean;
  data: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  errors: Array<{ sheet: string; row: number; field: string; message: string }>;
  validMembers: MemberImportRow[];
}

// =============================================================================
// Hook
// =============================================================================

export function useMemberImport(): UseExcelImportResult<MemberImportRow> {
  const [file, setFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [preview, setPreview] = React.useState<ImportedRow<MemberImportRow>[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);

  const validCount = React.useMemo(
    () => preview.filter((row) => row.isValid).length,
    [preview]
  );

  const invalidCount = React.useMemo(
    () => preview.filter((row) => !row.isValid).length,
    [preview]
  );

  // Process file by uploading to the API for server-side validation
  const processFile = React.useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setErrors([]);
    setPreview([]);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("preview", "true");

      const response = await fetch("/api/members/import", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as PreviewResult;

      // Convert server response to ImportedRow format
      const importedRows: ImportedRow<MemberImportRow>[] = result.validMembers.map(
        (member, index) => {
          // Find errors for this row (row numbers in errors are 1-indexed, adjusted for header)
          const rowNum = index + 2;
          const rowErrors = result.errors
            .filter((e) => e.row === rowNum)
            .map((e) => `${e.field}: ${e.message}`);

          return {
            id: `row-${index}`,
            data: member,
            rowNumber: rowNum,
            errors: rowErrors,
            isValid: rowErrors.length === 0,
          };
        }
      );

      // Add rows with errors that weren't in validMembers
      const errorRowNumbers = new Set(result.errors.map((e) => e.row));
      const validMemberCount = result.validMembers.length;

      // For rows that had errors and weren't included in validMembers
      result.errors.forEach((error) => {
        if (!importedRows.some((r) => r.rowNumber === error.row)) {
          importedRows.push({
            id: `error-row-${error.row}`,
            data: {
              first_name: "",
              last_name: "",
            } as MemberImportRow,
            rowNumber: error.row,
            errors: [`${error.field}: ${error.message}`],
            isValid: false,
          });
        }
      });

      // Sort by row number
      importedRows.sort((a, b) => a.rowNumber - b.rowNumber);

      setPreview(importedRows);

      // Collect unique errors
      const allErrors = result.errors.map(
        (e) => `Row ${e.row}: ${e.field} - ${e.message}`
      );
      setErrors(allErrors);
    } catch (error) {
      console.error("Error processing file:", error);
      setErrors(["Failed to process file. Please check the file format."]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Download template from the API
  const downloadTemplate = React.useCallback(async () => {
    try {
      const response = await fetch("/api/members/import", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      // Create blob from response and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `members-import-template-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading template:", error);
    }
  }, []);

  // Reset state
  const reset = React.useCallback(() => {
    setFile(null);
    setPreview([]);
    setErrors([]);
    setIsProcessing(false);
  }, []);

  // Get valid rows for import
  const getValidRows = React.useCallback(() => {
    return preview.filter((row) => row.isValid).map((row) => row.data);
  }, [preview]);

  return {
    file,
    isProcessing,
    preview,
    errors,
    validCount,
    invalidCount,
    processFile,
    downloadTemplate,
    reset,
    getValidRows,
  };
}

export default useMemberImport;
