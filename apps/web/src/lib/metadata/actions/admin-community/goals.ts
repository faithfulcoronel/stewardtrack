import type { MetadataActionHandler, MetadataActionExecution, MetadataActionResult } from "../types";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { TenantService } from "@/services/TenantService";
import type { IGoalsService } from "@/services/goals";
import type { GoalCategoryService } from "@/services/goals/GoalCategoryService";

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
 * Action handler for creating/updating goal categories
 */
const handleCategorySave: MetadataActionHandler = async (
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

    const categoryId = execution.context.params?.categoryId as string | undefined;
    const isEditMode = !!categoryId;

    const categoryService = container.get<GoalCategoryService>(TYPES.GoalCategoryService);

    const categoryData = {
      name: formData.name as string,
      code: (formData.code as string) || undefined,
      description: (formData.description as string) || undefined,
      color: (formData.color as string) || "#3b82f6",
      icon: (formData.icon as string) || "target",
      sort_order: Number(formData.sort_order) || 0,
    };

    if (isEditMode) {
      await categoryService.update(categoryId, categoryData);
      return {
        success: true,
        data: { categoryId },
        message: "Category updated successfully",
      };
    } else {
      const newCategory = await categoryService.create(categoryData);
      return {
        success: true,
        data: { categoryId: newCategory.id },
        message: "Category created successfully",
      };
    }
  } catch (error) {
    console.error("[goals action] Category save failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save category",
    };
  }
};

/**
 * Action handler for deleting goal categories
 */
const handleCategoryDelete: MetadataActionHandler = async (
  execution: MetadataActionExecution
): Promise<MetadataActionResult> => {
  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return { success: false, message: "No tenant context available" };
    }

    const categoryId = execution.context.params?.categoryId as string;
    if (!categoryId) {
      return { success: false, message: "Category ID is required" };
    }

    const categoryService = container.get<GoalCategoryService>(TYPES.GoalCategoryService);
    await categoryService.delete(categoryId);

    return {
      success: true,
      message: "Category deleted successfully",
    };
  } catch (error) {
    console.error("[goals action] Category delete failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete category",
    };
  }
};

/**
 * Action handler for creating/updating goals
 */
const handleGoalSave: MetadataActionHandler = async (
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

    const goalId = execution.context.params?.goalId as string | undefined;
    const isEditMode = !!goalId;

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

    // Parse tags - handle both string and array formats
    let tags: string[] = [];
    const rawTags = formData.tags;
    if (Array.isArray(rawTags)) {
      tags = rawTags.map((t) => String(t).trim()).filter((t) => t.length > 0);
    } else if (typeof rawTags === "string" && rawTags.length > 0) {
      tags = rawTags.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
    }

    // Parse and validate status
    const statusValue = (formData.status as string) || "draft";
    const validStatuses = ["draft", "active", "on_track", "at_risk", "behind", "completed", "cancelled"] as const;
    const status = validStatuses.includes(statusValue as typeof validStatuses[number])
      ? (statusValue as typeof validStatuses[number])
      : "draft";

    const goalData = {
      title: formData.title as string,
      description: (formData.description as string) || undefined,
      category_id: (formData.category_id as string) || undefined,
      status,
      start_date: (formData.start_date as string) || undefined,
      target_date: (formData.target_date as string) || undefined,
      owner_id: (formData.owner_id as string) || undefined,
      visibility: ((formData.visibility as string) || "staff") as "private" | "leadership" | "staff" | "public",
      tags: tags.length > 0 ? tags : undefined,
    };

    let resultGoalId: string;

    if (isEditMode) {
      const updatedGoal = await goalsService.updateGoal(goalId, goalData);
      resultGoalId = updatedGoal.id;
    } else {
      const newGoal = await goalsService.createGoal(goalData);
      resultGoalId = newGoal.id;
    }

    return {
      success: true,
      data: { goalId: resultGoalId },
      message: isEditMode ? "Goal updated successfully" : "Goal created successfully",
      redirectUrl: `/admin/community/planning/goals/${resultGoalId}`,
    };
  } catch (error) {
    console.error("[goals action] Goal save failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save goal",
    };
  }
};

/**
 * Action handler for deleting goals
 */
const handleGoalDelete: MetadataActionHandler = async (
  execution: MetadataActionExecution
): Promise<MetadataActionResult> => {
  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return { success: false, message: "No tenant context available" };
    }

    const goalId = execution.context.params?.goalId as string;
    if (!goalId) {
      return { success: false, message: "Goal ID is required" };
    }

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    await goalsService.deleteGoal(goalId);

    return {
      success: true,
      message: "Goal deleted successfully",
    };
  } catch (error) {
    console.error("[goals action] Goal delete failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete goal",
    };
  }
};

/**
 * Action handler for creating/updating objectives
 */
const handleObjectiveSave: MetadataActionHandler = async (
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

    const goalId = execution.context.params?.goalId as string;
    const objectiveId = execution.context.params?.objectiveId as string | undefined;
    const isEditMode = !!objectiveId;

    if (!goalId) {
      return { success: false, message: "Goal ID is required" };
    }

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

    const statusValue = (formData.status as string) || "pending";
    const validStatuses = ["pending", "in_progress", "on_track", "at_risk", "behind", "completed", "cancelled"] as const;
    const status = validStatuses.includes(statusValue as typeof validStatuses[number])
      ? (statusValue as typeof validStatuses[number])
      : "pending";

    const objectiveData = {
      title: formData.title as string,
      description: (formData.description as string) || undefined,
      responsible_id: (formData.responsible_id as string) || undefined,
      status,
      priority: ((formData.priority as string) || "normal") as "low" | "normal" | "high" | "urgent",
      due_date: (formData.due_date as string) || undefined,
    };

    let resultObjectiveId: string;

    if (isEditMode) {
      await goalsService.updateObjective(objectiveId, objectiveData);
      resultObjectiveId = objectiveId;
    } else {
      const newObjective = await goalsService.createObjective({
        goal_id: goalId,
        ...objectiveData,
      });
      resultObjectiveId = newObjective.id;
    }

    return {
      success: true,
      data: { objectiveId: resultObjectiveId, goalId },
      message: isEditMode ? "Objective updated successfully" : "Objective created successfully",
      redirectUrl: `/admin/community/planning/goals/${goalId}`,
    };
  } catch (error) {
    console.error("[goals action] Objective save failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save objective",
    };
  }
};

/**
 * Action handler for deleting objectives
 */
const handleObjectiveDelete: MetadataActionHandler = async (
  execution: MetadataActionExecution
): Promise<MetadataActionResult> => {
  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return { success: false, message: "No tenant context available" };
    }

    const objectiveId = execution.context.params?.objectiveId as string;
    if (!objectiveId) {
      return { success: false, message: "Objective ID is required" };
    }

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    await goalsService.deleteObjective(objectiveId);

    return {
      success: true,
      message: "Objective deleted successfully",
    };
  } catch (error) {
    console.error("[goals action] Objective delete failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete objective",
    };
  }
};

/**
 * Action handler for creating/updating key results (goal-level)
 */
const handleKeyResultSave: MetadataActionHandler = async (
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

    const goalId = execution.context.params?.goalId as string;
    const keyResultId = execution.context.params?.keyResultId as string | undefined;
    const isEditMode = !!keyResultId;

    if (!goalId) {
      return { success: false, message: "Goal ID is required" };
    }

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

    const updateFrequency = (formData.update_frequency as string) || "weekly";
    const validFrequencies = ["weekly", "biweekly", "monthly", "quarterly"] as const;
    const frequency = validFrequencies.includes(updateFrequency as (typeof validFrequencies)[number])
      ? (updateFrequency as "weekly" | "biweekly" | "monthly" | "quarterly")
      : "weekly";

    const keyResultData = {
      title: formData.title as string,
      description: (formData.description as string) || undefined,
      metric_type: ((formData.metric_type as string) || "number") as "number" | "percentage" | "currency" | "boolean",
      target_value: Number(formData.target_value) || 0,
      starting_value: formData.starting_value ? Number(formData.starting_value) : 0,
      unit_label: (formData.unit_label as string) || undefined,
      update_frequency: frequency,
    };

    let resultKeyResultId: string;

    if (isEditMode) {
      await goalsService.updateKeyResult(keyResultId, keyResultData);
      resultKeyResultId = keyResultId;
    } else {
      const newKeyResult = await goalsService.createKeyResult({
        goal_id: goalId,
        ...keyResultData,
      });
      resultKeyResultId = newKeyResult.id;
    }

    return {
      success: true,
      data: { keyResultId: resultKeyResultId, goalId },
      message: isEditMode ? "Key result updated successfully" : "Key result created successfully",
      redirectUrl: `/admin/community/planning/goals/${goalId}`,
    };
  } catch (error) {
    console.error("[goals action] Key result save failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save key result",
    };
  }
};

/**
 * Action handler for creating/updating key results (objective-level)
 */
const handleObjectiveKeyResultSave: MetadataActionHandler = async (
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

    const goalId = execution.context.params?.goalId as string;
    const objectiveId = execution.context.params?.objectiveId as string;
    const keyResultId = execution.context.params?.keyResultId as string | undefined;
    const isEditMode = !!keyResultId;

    if (!goalId) {
      return { success: false, message: "Goal ID is required" };
    }
    if (!objectiveId) {
      return { success: false, message: "Objective ID is required" };
    }

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

    const objUpdateFrequency = (formData.update_frequency as string) || "weekly";
    const objValidFrequencies = ["weekly", "biweekly", "monthly", "quarterly"] as const;
    const objFrequency = objValidFrequencies.includes(objUpdateFrequency as (typeof objValidFrequencies)[number])
      ? (objUpdateFrequency as "weekly" | "biweekly" | "monthly" | "quarterly")
      : "weekly";

    const keyResultData = {
      title: formData.title as string,
      description: (formData.description as string) || undefined,
      metric_type: ((formData.metric_type as string) || "number") as "number" | "percentage" | "currency" | "boolean",
      target_value: Number(formData.target_value) || 0,
      starting_value: formData.starting_value ? Number(formData.starting_value) : 0,
      unit_label: (formData.unit_label as string) || undefined,
      update_frequency: objFrequency,
    };

    let resultKeyResultId: string;

    if (isEditMode) {
      await goalsService.updateKeyResult(keyResultId, keyResultData);
      resultKeyResultId = keyResultId;
    } else {
      const newKeyResult = await goalsService.createKeyResult({
        objective_id: objectiveId,
        ...keyResultData,
      });
      resultKeyResultId = newKeyResult.id;
    }

    return {
      success: true,
      data: { keyResultId: resultKeyResultId, goalId, objectiveId },
      message: isEditMode ? "Key result updated successfully" : "Key result created successfully",
      redirectUrl: `/admin/community/planning/goals/${goalId}`,
    };
  } catch (error) {
    console.error("[goals action] Objective key result save failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save key result",
    };
  }
};

/**
 * Action handler for deleting key results
 */
const handleKeyResultDelete: MetadataActionHandler = async (
  execution: MetadataActionExecution
): Promise<MetadataActionResult> => {
  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return { success: false, message: "No tenant context available" };
    }

    const keyResultId = execution.context.params?.keyResultId as string;
    if (!keyResultId) {
      return { success: false, message: "Key result ID is required" };
    }

    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    await goalsService.deleteKeyResult(keyResultId);

    return {
      success: true,
      message: "Key result deleted successfully",
    };
  } catch (error) {
    console.error("[goals action] Key result delete failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete key result",
    };
  }
};

export const goalsActionHandlers: Record<string, MetadataActionHandler> = {
  // Category actions
  "admin-community.planning.goals.categories.save": handleCategorySave,
  "admin-community.planning.goals.categories.delete": handleCategoryDelete,
  // Goal actions
  "admin-community.planning.goals.manage.save": handleGoalSave,
  "admin-community.planning.goals.detail.delete": handleGoalDelete,
  // Objective actions
  "admin-community.planning.goals.objectives.manage.save": handleObjectiveSave,
  "admin-community.planning.goals.objectives.delete": handleObjectiveDelete,
  // Key result actions (goal-level)
  "admin-community.planning.goals.keyResults.manage.save": handleKeyResultSave,
  "admin-community.planning.goals.keyResults.delete": handleKeyResultDelete,
  // Key result actions (objective-level)
  "admin-community.planning.goals.objectives.keyResults.manage.save": handleObjectiveKeyResultSave,
};
