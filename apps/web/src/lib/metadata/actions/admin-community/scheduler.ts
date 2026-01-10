import type { MetadataActionHandler, MetadataActionExecution, MetadataActionResult } from "../types";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { TenantService } from "@/services/TenantService";
import type { MinistryService } from "@/services/MinistryService";
import type { SchedulerService } from "@/services/SchedulerService";

/**
 * Normalizes the action payload to extract form values.
 * The AdminFormSubmitHandler wraps form values in a { mode, values } structure.
 */
function normalizeFormPayload(input: unknown): {
  mode: string | null;
  values: Record<string, unknown>;
} {
  if (!input || typeof input !== "object") {
    return { mode: null, values: {} };
  }

  const payload = input as Record<string, unknown>;
  const mode = typeof payload.mode === "string" ? payload.mode : null;
  const values =
    payload.values && typeof payload.values === "object" && !Array.isArray(payload.values)
      ? (payload.values as Record<string, unknown>)
      : {};

  return { mode, values };
}

/**
 * Generates a URL-safe code/slug from a name string.
 */
function generateCodeFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

/**
 * Action handler for creating/updating ministries
 */
const handleMinistrySave: MetadataActionHandler = async (
  execution: MetadataActionExecution
): Promise<MetadataActionResult> => {
  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return { success: false, message: "No tenant context available" };
    }

    const { values: formData } = normalizeFormPayload(execution.input);
    if (!formData || Object.keys(formData).length === 0) {
      return { success: false, message: "No form data provided" };
    }

    const ministryId = execution.context.params?.ministryId as string | undefined;
    const isEditMode = !!ministryId && ministryId !== 'new';

    const ministryService = container.get<MinistryService>(TYPES.MinistryService);

    const name = formData.name as string;
    if (!name || !name.trim()) {
      return { success: false, message: "Ministry name is required" };
    }

    // Build data matching MinistryCreateInput/MinistryUpdateInput
    const ministryData = {
      name: name.trim(),
      code: (formData.code as string) || generateCodeFromName(name),
      description: (formData.description as string) || null,
      category: (formData.category as string) || 'general',
      color: (formData.color as string) || '#6366f1',
      icon: (formData.icon as string) || 'church',
      is_active: formData.isActive === true || formData.isActive === 'true',
    };

    let resultMinistryId: string;

    if (isEditMode) {
      await ministryService.updateMinistry(ministryId, ministryData, tenant.id);
      resultMinistryId = ministryId;
    } else {
      const newMinistry = await ministryService.createMinistry(ministryData, tenant.id);
      resultMinistryId = newMinistry.id;
    }

    return {
      success: true,
      data: { ministryId: resultMinistryId },
      message: isEditMode ? "Ministry updated successfully" : "Ministry created successfully",
      redirectUrl: `/admin/community/planning/scheduler/ministries/${resultMinistryId}`,
    };
  } catch (error) {
    console.error("[scheduler action] Ministry save failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save ministry",
    };
  }
};

/**
 * Action handler for deleting ministries
 */
const handleMinistryDelete: MetadataActionHandler = async (
  execution: MetadataActionExecution
): Promise<MetadataActionResult> => {
  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return { success: false, message: "No tenant context available" };
    }

    const ministryId = execution.context.params?.ministryId as string;
    if (!ministryId) {
      return { success: false, message: "Ministry ID is required" };
    }

    const ministryService = container.get<MinistryService>(TYPES.MinistryService);
    await ministryService.deleteMinistry(ministryId, tenant.id);

    return {
      success: true,
      message: "Ministry deleted successfully",
      redirectUrl: "/admin/community/planning/scheduler/ministries",
    };
  } catch (error) {
    console.error("[scheduler action] Ministry delete failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete ministry",
    };
  }
};

/**
 * Action handler for creating/updating schedules
 */
const handleScheduleSave: MetadataActionHandler = async (
  execution: MetadataActionExecution
): Promise<MetadataActionResult> => {
  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return { success: false, message: "No tenant context available" };
    }

    const { values: formData } = normalizeFormPayload(execution.input);
    if (!formData || Object.keys(formData).length === 0) {
      return { success: false, message: "No form data provided" };
    }

    const scheduleId = execution.context.params?.scheduleId as string | undefined;
    const isEditMode = !!scheduleId && scheduleId !== 'new';

    const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);

    const name = formData.name as string;
    if (!name || !name.trim()) {
      return { success: false, message: "Schedule name is required" };
    }

    const ministryId = formData.ministryId as string;
    if (!ministryId) {
      return { success: false, message: "Ministry is required" };
    }

    // Build data matching ScheduleCreateInput/ScheduleUpdateInput
    const scheduleData = {
      ministry_id: ministryId,
      name: name.trim(),
      description: (formData.description as string) || null,
      schedule_type: (formData.scheduleType as string) || 'service',
      start_time: (formData.startTime as string) || null,
      end_time: (formData.endTime as string) || null,
      duration_minutes: formData.durationMinutes ? Number(formData.durationMinutes) : null,
      timezone: 'Asia/Manila', // Default timezone
      recurrence_rule: (formData.recurrenceRule as string) || null,
      recurrence_start_date: (formData.recurrenceStartDate as string) || null,
      location: (formData.location as string) || null,
      location_type: (formData.locationType as string) || 'physical',
      virtual_meeting_url: (formData.virtualMeetingUrl as string) || null,
      capacity: formData.capacity ? Number(formData.capacity) : null,
      registration_required: formData.registrationRequired === true || formData.registrationRequired === 'true',
      is_active: formData.isActive === true || formData.isActive === 'true',
    };

    let resultScheduleId: string;

    if (isEditMode) {
      await schedulerService.updateSchedule(scheduleId, scheduleData, tenant.id);
      resultScheduleId = scheduleId;
    } else {
      const newSchedule = await schedulerService.createSchedule(scheduleData, tenant.id);
      resultScheduleId = newSchedule.id;
    }

    return {
      success: true,
      data: { scheduleId: resultScheduleId },
      message: isEditMode ? "Schedule updated successfully" : "Schedule created successfully",
      redirectUrl: `/admin/community/planning/scheduler/schedules/${resultScheduleId}`,
    };
  } catch (error) {
    console.error("[scheduler action] Schedule save failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save schedule",
    };
  }
};

/**
 * Action handler for deleting schedules
 */
const handleScheduleDelete: MetadataActionHandler = async (
  execution: MetadataActionExecution
): Promise<MetadataActionResult> => {
  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return { success: false, message: "No tenant context available" };
    }

    const scheduleId = execution.context.params?.scheduleId as string;
    if (!scheduleId) {
      return { success: false, message: "Schedule ID is required" };
    }

    const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
    await schedulerService.deleteSchedule(scheduleId, tenant.id);

    return {
      success: true,
      message: "Schedule deleted successfully",
      redirectUrl: "/admin/community/planning/scheduler/schedules",
    };
  } catch (error) {
    console.error("[scheduler action] Schedule delete failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete schedule",
    };
  }
};

export const schedulerActionHandlers: Record<string, MetadataActionHandler> = {
  "admin-community.scheduler.ministries.manage.save": handleMinistrySave,
  "admin-community.scheduler.ministries.delete": handleMinistryDelete,
  "admin-community.scheduler.schedules.manage.save": handleScheduleSave,
  "admin-community.scheduler.schedules.delete": handleScheduleDelete,
};
