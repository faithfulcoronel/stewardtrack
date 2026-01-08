import 'server-only';
import { injectable, inject } from 'inversify';
import { randomUUID } from 'crypto';
import { TYPES } from '@/lib/types';
import type { IGoalRepository } from '@/repositories/goals';
import type { IObjectiveRepository } from '@/repositories/goals';
import type { IKeyResultRepository } from '@/repositories/goals';
import type { IKeyResultProgressUpdateRepository } from '@/repositories/goals';
import type { INotificationBusService } from '@/services/notification/NotificationBusService';
import type { PlanningService } from '@/services/PlanningService';
import type {
  Goal,
  GoalCreateInput,
  GoalUpdateInput,
  GoalFilters,
  GoalQueryOptions,
  GoalsDashboardStats,
  GoalActivity,
  GoalWithDetails,
  Objective,
  ObjectiveCreateInput,
  ObjectiveUpdateInput,
  ObjectiveFilters,
  ObjectiveWithKeyResults,
  KeyResult,
  KeyResultCreateInput,
  KeyResultUpdateInput,
  KeyResultFilters,
  KeyResultProgressUpdate,
  ProgressUpdateCreateInput,
  ProgressUpdateQueryOptions,
  ProgressHistorySummary,
} from '@/models/goals';
import { handleError } from '@/utils/errorHandler';
import { NotificationEventType } from '@/models/notification/notificationEvent.model';

// ============================================================================
// Service Interface
// ============================================================================

export interface IGoalsService {
  // Goals
  getGoals(filters?: GoalFilters, options?: GoalQueryOptions): Promise<{ data: Goal[]; total: number }>;
  getGoalById(id: string): Promise<Goal | null>;
  getGoalWithDetails(id: string): Promise<GoalWithDetails | null>;
  createGoal(data: GoalCreateInput): Promise<Goal>;
  updateGoal(id: string, data: GoalUpdateInput): Promise<Goal>;
  deleteGoal(id: string): Promise<void>;
  getDashboardStats(): Promise<GoalsDashboardStats>;
  getRecentActivity(limit?: number): Promise<GoalActivity[]>;

  // Objectives
  getObjectives(filters?: ObjectiveFilters): Promise<Objective[]>;
  getObjectiveById(id: string): Promise<Objective | null>;
  getObjectiveWithKeyResults(id: string): Promise<ObjectiveWithKeyResults | null>;
  getObjectivesByGoalId(goalId: string): Promise<Objective[]>;
  createObjective(data: ObjectiveCreateInput): Promise<Objective>;
  updateObjective(id: string, data: ObjectiveUpdateInput): Promise<Objective>;
  deleteObjective(id: string): Promise<void>;

  // Key Results
  getKeyResults(filters?: KeyResultFilters): Promise<KeyResult[]>;
  getKeyResultById(id: string): Promise<KeyResult | null>;
  getKeyResultsByGoalId(goalId: string): Promise<KeyResult[]>;
  getKeyResultsByObjectiveId(objectiveId: string): Promise<KeyResult[]>;
  createKeyResult(data: KeyResultCreateInput): Promise<KeyResult>;
  updateKeyResult(id: string, data: KeyResultUpdateInput): Promise<KeyResult>;
  deleteKeyResult(id: string): Promise<void>;
  getOverdueKeyResults(): Promise<KeyResult[]>;
  getKeyResultsDueForUpdate(daysAhead?: number): Promise<KeyResult[]>;

  // Progress Updates
  recordProgress(data: ProgressUpdateCreateInput): Promise<KeyResultProgressUpdate>;
  getProgressHistory(keyResultId: string, options?: ProgressUpdateQueryOptions): Promise<KeyResultProgressUpdate[]>;
  getProgressSummary(keyResultId: string): Promise<ProgressHistorySummary>;

  // Notifications
  sendKeyResultUpdateDueNotifications(): Promise<number>;
}

// ============================================================================
// Service Implementation
// ============================================================================

@injectable()
export class GoalsService implements IGoalsService {
  constructor(
    @inject(TYPES.IGoalRepository)
    private goalRepo: IGoalRepository,
    @inject(TYPES.IObjectiveRepository)
    private objectiveRepo: IObjectiveRepository,
    @inject(TYPES.IKeyResultRepository)
    private keyResultRepo: IKeyResultRepository,
    @inject(TYPES.IKeyResultProgressUpdateRepository)
    private progressUpdateRepo: IKeyResultProgressUpdateRepository,
    @inject(TYPES.NotificationBusService)
    private notificationBus: INotificationBusService,
    @inject(TYPES.PlanningService)
    private planningService: PlanningService
  ) {}

  // ============================================================================
  // Goals
  // ============================================================================

  /**
   * Get goals with filtering and pagination
   */
  async getGoals(
    filters: GoalFilters = {},
    options: GoalQueryOptions = {}
  ): Promise<{ data: Goal[]; total: number }> {
    try {
      return await this.goalRepo.getAll(filters, options);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getGoals',
        filters,
        options,
      });
    }
  }

  /**
   * Get a goal by ID
   */
  async getGoalById(id: string): Promise<Goal | null> {
    try {
      return await this.goalRepo.getById(id);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getGoalById',
        id,
      });
    }
  }

  /**
   * Get a goal with full details (objectives, key results, activity)
   */
  async getGoalWithDetails(id: string): Promise<GoalWithDetails | null> {
    try {
      const goal = await this.goalRepo.getById(id);
      if (!goal) return null;

      // Get objectives with their key results
      const objectives = await this.objectiveRepo.getByGoalId(id);
      const objectivesWithKRs: ObjectiveWithKeyResults[] = [];

      for (const objective of objectives) {
        const keyResults = await this.keyResultRepo.getByObjectiveId(objective.id);
        objectivesWithKRs.push({
          ...objective,
          key_results: keyResults,
        });
      }

      // Get direct key results (not linked to objectives)
      const directKeyResults = await this.keyResultRepo.getByGoalId(id);

      // Get recent activity
      const recentActivity = await this.progressUpdateRepo.getRecentUpdatesForGoal(id, 10);

      return {
        ...goal,
        objectives: objectivesWithKRs,
        direct_key_results: directKeyResults,
        recent_activity: recentActivity.map((update) => ({
          id: update.id,
          type: 'progress_recorded' as const,
          entity_type: 'key_result' as const,
          entity_id: update.key_result_id,
          entity_title: update.key_result_title || '',
          description: `Progress updated: ${update.previous_value || 0} → ${update.new_value}`,
          user_id: update.created_by || null,
          user_name: update.created_by_name || null,
          timestamp: update.recorded_at,
          metadata: {
            previous_value: update.previous_value,
            new_value: update.new_value,
            notes: update.notes,
          },
        })),
      };
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getGoalWithDetails',
        id,
      });
    }
  }

  /**
   * Create a new goal
   */
  async createGoal(data: GoalCreateInput): Promise<Goal> {
    try {
      const goal = await this.goalRepo.create(data);

      // Send notification if owner is assigned
      if (goal.owner_id) {
        await this.sendGoalAssignedNotification(goal);
      }

      // Sync to calendar if goal has a target date
      if (goal.target_date) {
        await this.planningService.syncGoalEvent({
          id: goal.id,
          title: goal.title,
          description: goal.description,
          target_date: goal.target_date,
          owner_id: goal.owner_id,
          status: goal.status,
          category_name: goal.category?.name,
          visibility: goal.visibility,
        });
      }

      return goal;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.createGoal',
        data,
      });
    }
  }

  /**
   * Update a goal
   */
  async updateGoal(id: string, data: GoalUpdateInput): Promise<Goal> {
    try {
      const existingGoal = await this.goalRepo.getById(id);
      if (!existingGoal) {
        throw new Error('Goal not found');
      }

      const updatedGoal = await this.goalRepo.update(id, data);

      // Check for status change to at_risk or behind
      if (data.status && data.status !== existingGoal.status) {
        if (data.status === 'at_risk' || data.status === 'behind') {
          await this.sendGoalStatusChangeNotification(updatedGoal, existingGoal.status);
        }
      }

      // Check for owner change
      if (data.owner_id && data.owner_id !== existingGoal.owner_id) {
        await this.sendGoalAssignedNotification(updatedGoal);
      }

      // Sync calendar event if target date exists or changed
      if (updatedGoal.target_date) {
        await this.planningService.syncGoalEvent({
          id: updatedGoal.id,
          title: updatedGoal.title,
          description: updatedGoal.description,
          target_date: updatedGoal.target_date,
          owner_id: updatedGoal.owner_id,
          status: updatedGoal.status,
          category_name: updatedGoal.category?.name,
          visibility: updatedGoal.visibility,
        });
      } else if (existingGoal.target_date && !updatedGoal.target_date) {
        // Target date was removed, remove calendar event
        await this.planningService.removeGoalEvent(id);
      }

      return updatedGoal;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.updateGoal',
        id,
        data,
      });
    }
  }

  /**
   * Delete a goal (soft delete)
   */
  async deleteGoal(id: string): Promise<void> {
    try {
      await this.goalRepo.delete(id);

      // Remove calendar event if it exists
      await this.planningService.removeGoalEvent(id);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.deleteGoal',
        id,
      });
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<GoalsDashboardStats> {
    try {
      return await this.goalRepo.getDashboardStats();
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getDashboardStats',
      });
    }
  }

  /**
   * Get recent activity across all goals
   */
  async getRecentActivity(limit: number = 10): Promise<GoalActivity[]> {
    try {
      return await this.goalRepo.getRecentActivity(limit);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getRecentActivity',
        limit,
      });
    }
  }

  // ============================================================================
  // Objectives
  // ============================================================================

  /**
   * Get objectives with filtering
   */
  async getObjectives(filters: ObjectiveFilters = {}): Promise<Objective[]> {
    try {
      return await this.objectiveRepo.getAll(filters);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getObjectives',
        filters,
      });
    }
  }

  /**
   * Get an objective by ID
   */
  async getObjectiveById(id: string): Promise<Objective | null> {
    try {
      return await this.objectiveRepo.getById(id);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getObjectiveById',
        id,
      });
    }
  }

  /**
   * Get an objective with its key results
   */
  async getObjectiveWithKeyResults(id: string): Promise<ObjectiveWithKeyResults | null> {
    try {
      return await this.objectiveRepo.getByIdWithKeyResults(id);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getObjectiveWithKeyResults',
        id,
      });
    }
  }

  /**
   * Get all objectives for a goal
   */
  async getObjectivesByGoalId(goalId: string): Promise<Objective[]> {
    try {
      return await this.objectiveRepo.getByGoalId(goalId);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getObjectivesByGoalId',
        goalId,
      });
    }
  }

  /**
   * Create a new objective
   */
  async createObjective(data: ObjectiveCreateInput): Promise<Objective> {
    try {
      // Validate goal exists
      const goal = await this.goalRepo.getById(data.goal_id);
      if (!goal) {
        throw new Error('Goal not found');
      }

      const objective = await this.objectiveRepo.create(data);

      // Send notification if responsible person is assigned
      if (objective.responsible_id) {
        await this.sendObjectiveAssignedNotification(objective, goal);
      }

      // Sync to calendar if objective has a due date
      if (objective.due_date) {
        await this.planningService.syncObjectiveEvent({
          id: objective.id,
          title: objective.title,
          description: objective.description,
          due_date: objective.due_date,
          responsible_id: objective.responsible_id,
          status: objective.status,
          priority: objective.priority,
          goal_id: goal.id,
          goal_title: goal.title,
        });
      }

      return objective;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.createObjective',
        data,
      });
    }
  }

  /**
   * Update an objective
   */
  async updateObjective(id: string, data: ObjectiveUpdateInput): Promise<Objective> {
    try {
      const existingObjective = await this.objectiveRepo.getById(id);
      if (!existingObjective) {
        throw new Error('Objective not found');
      }

      const updatedObjective = await this.objectiveRepo.update(id, data);

      // Check for responsible person change
      const goal = await this.goalRepo.getById(existingObjective.goal_id);
      if (data.responsible_id && data.responsible_id !== existingObjective.responsible_id) {
        if (goal) {
          await this.sendObjectiveAssignedNotification(updatedObjective, goal);
        }
      }

      // Sync calendar event if due date exists or changed
      if (updatedObjective.due_date && goal) {
        await this.planningService.syncObjectiveEvent({
          id: updatedObjective.id,
          title: updatedObjective.title,
          description: updatedObjective.description,
          due_date: updatedObjective.due_date,
          responsible_id: updatedObjective.responsible_id,
          status: updatedObjective.status,
          priority: updatedObjective.priority,
          goal_id: goal.id,
          goal_title: goal.title,
        });
      } else if (existingObjective.due_date && !updatedObjective.due_date) {
        // Due date was removed, remove calendar event
        await this.planningService.removeObjectiveEvent(id);
      }

      return updatedObjective;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.updateObjective',
        id,
        data,
      });
    }
  }

  /**
   * Delete an objective (soft delete)
   */
  async deleteObjective(id: string): Promise<void> {
    try {
      await this.objectiveRepo.delete(id);

      // Remove calendar event if it exists
      await this.planningService.removeObjectiveEvent(id);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.deleteObjective',
        id,
      });
    }
  }

  // ============================================================================
  // Key Results
  // ============================================================================

  /**
   * Get key results with filtering
   */
  async getKeyResults(filters: KeyResultFilters = {}): Promise<KeyResult[]> {
    try {
      return await this.keyResultRepo.getAll(filters);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getKeyResults',
        filters,
      });
    }
  }

  /**
   * Get a key result by ID
   */
  async getKeyResultById(id: string): Promise<KeyResult | null> {
    try {
      return await this.keyResultRepo.getById(id);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getKeyResultById',
        id,
      });
    }
  }

  /**
   * Get key results directly linked to a goal
   */
  async getKeyResultsByGoalId(goalId: string): Promise<KeyResult[]> {
    try {
      return await this.keyResultRepo.getByGoalId(goalId);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getKeyResultsByGoalId',
        goalId,
      });
    }
  }

  /**
   * Get key results linked to an objective
   */
  async getKeyResultsByObjectiveId(objectiveId: string): Promise<KeyResult[]> {
    try {
      return await this.keyResultRepo.getByObjectiveId(objectiveId);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getKeyResultsByObjectiveId',
        objectiveId,
      });
    }
  }

  /**
   * Create a new key result
   */
  async createKeyResult(data: KeyResultCreateInput): Promise<KeyResult> {
    try {
      // Validate parent exists
      if (data.objective_id) {
        const objective = await this.objectiveRepo.getById(data.objective_id);
        if (!objective) {
          throw new Error('Objective not found');
        }
      } else if (data.goal_id) {
        const goal = await this.goalRepo.getById(data.goal_id);
        if (!goal) {
          throw new Error('Goal not found');
        }
      } else {
        throw new Error('Key result must be linked to a goal or objective');
      }

      return await this.keyResultRepo.create(data);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.createKeyResult',
        data,
      });
    }
  }

  /**
   * Update a key result
   */
  async updateKeyResult(id: string, data: KeyResultUpdateInput): Promise<KeyResult> {
    try {
      const existingKR = await this.keyResultRepo.getById(id);
      if (!existingKR) {
        throw new Error('Key result not found');
      }

      return await this.keyResultRepo.update(id, data);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.updateKeyResult',
        id,
        data,
      });
    }
  }

  /**
   * Delete a key result (soft delete)
   */
  async deleteKeyResult(id: string): Promise<void> {
    try {
      await this.keyResultRepo.delete(id);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.deleteKeyResult',
        id,
      });
    }
  }

  /**
   * Get key results with overdue updates
   */
  async getOverdueKeyResults(): Promise<KeyResult[]> {
    try {
      return await this.keyResultRepo.getOverdueUpdates();
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getOverdueKeyResults',
      });
    }
  }

  /**
   * Get key results due for update within the specified number of days
   */
  async getKeyResultsDueForUpdate(daysAhead: number = 7): Promise<KeyResult[]> {
    try {
      const dueBeforeDate = new Date();
      dueBeforeDate.setDate(dueBeforeDate.getDate() + daysAhead);
      return await this.keyResultRepo.getUpdatesDue(dueBeforeDate.toISOString());
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getKeyResultsDueForUpdate',
        daysAhead,
      });
    }
  }

  // ============================================================================
  // Progress Updates
  // ============================================================================

  /**
   * Record progress for a key result
   */
  async recordProgress(data: ProgressUpdateCreateInput): Promise<KeyResultProgressUpdate> {
    try {
      // Validate key result exists
      const keyResult = await this.keyResultRepo.getById(data.key_result_id);
      if (!keyResult) {
        throw new Error('Key result not found');
      }

      // Create progress update
      const progressUpdate = await this.progressUpdateRepo.create(data);

      // Update key result's current value
      await this.keyResultRepo.updateCurrentValue(data.key_result_id, data.new_value);

      // Recalculate parent progress
      await this.recalculateParentProgress(keyResult);

      // Check if key result is now completed (reached target)
      if (data.new_value >= keyResult.target_value && keyResult.status !== 'completed') {
        // Mark as completed
        await this.keyResultRepo.update(data.key_result_id, { status: 'completed' });
        // Send completion notification
        const parentGoal = keyResult.goal_id
          ? await this.goalRepo.getById(keyResult.goal_id)
          : null;
        await this.sendKeyResultCompletedNotification(keyResult, parentGoal);
      }

      return progressUpdate;
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.recordProgress',
        data,
      });
    }
  }

  /**
   * Get progress history for a key result
   */
  async getProgressHistory(
    keyResultId: string,
    options: ProgressUpdateQueryOptions = {}
  ): Promise<KeyResultProgressUpdate[]> {
    try {
      return await this.progressUpdateRepo.getByKeyResultId(keyResultId, options);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getProgressHistory',
        keyResultId,
        options,
      });
    }
  }

  /**
   * Get progress summary for a key result
   */
  async getProgressSummary(keyResultId: string): Promise<ProgressHistorySummary> {
    try {
      return await this.progressUpdateRepo.getHistorySummary(keyResultId);
    } catch (error) {
      throw handleError(error, {
        context: 'GoalsService.getProgressSummary',
        keyResultId,
      });
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Recalculate progress for parent objective/goal after key result update
   */
  private async recalculateParentProgress(keyResult: KeyResult): Promise<void> {
    try {
      if (keyResult.objective_id) {
        // Recalculate objective progress
        const keyResults = await this.keyResultRepo.getByObjectiveId(keyResult.objective_id);
        const totalProgress =
          keyResults.reduce((sum, kr) => sum + kr.progress_percent, 0) / keyResults.length;
        await this.objectiveRepo.updateProgress(keyResult.objective_id, totalProgress);

        // Also recalculate goal progress
        const objective = await this.objectiveRepo.getById(keyResult.objective_id);
        if (objective) {
          await this.recalculateGoalProgress(objective.goal_id);
        }
      } else if (keyResult.goal_id) {
        // Recalculate goal progress directly
        await this.recalculateGoalProgress(keyResult.goal_id);
      }
    } catch (error) {
      console.error('Failed to recalculate parent progress:', error);
    }
  }

  /**
   * Recalculate goal overall progress
   */
  private async recalculateGoalProgress(goalId: string): Promise<void> {
    try {
      const objectives = await this.objectiveRepo.getByGoalId(goalId);
      const directKeyResults = await this.keyResultRepo.getByGoalId(goalId);

      // Calculate weighted progress
      let totalWeight = 0;
      let weightedProgress = 0;

      // Objectives count as major progress contributors
      for (const objective of objectives) {
        totalWeight += 1;
        weightedProgress += objective.overall_progress;
      }

      // Direct key results also contribute
      for (const kr of directKeyResults) {
        totalWeight += 0.5; // Slightly less weight than objectives
        weightedProgress += kr.progress_percent * 0.5;
      }

      const calculatedProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;

      // Update goal's overall progress through the goal repository
      await this.goalRepo.updateProgress(goalId, calculatedProgress);
    } catch (error) {
      console.error('Failed to recalculate goal progress:', error);
    }
  }

  /**
   * Send notification when a goal is assigned to someone
   */
  private async sendGoalAssignedNotification(goal: Goal): Promise<void> {
    if (!goal.owner_id || !goal.tenant_id) return;

    try {
      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.GOAL_ASSIGNED,
        category: 'planning',
        priority: 'normal',
        tenantId: goal.tenant_id,
        recipient: {
          userId: goal.owner_id,
        },
        payload: {
          title: 'Goal Assigned',
          message: `You have been assigned as the owner of the goal: ${goal.title}`,
          goalId: goal.id,
          goalTitle: goal.title,
          actionType: 'redirect',
          actionPayload: `/admin/community/planning/goals/${goal.id}`,
        },
        channels: ['in_app', 'email'],
      });
    } catch (error) {
      console.error('Failed to send goal assigned notification:', error);
    }
  }

  /**
   * Send notification when goal status changes to at_risk or behind
   */
  private async sendGoalStatusChangeNotification(
    goal: Goal,
    previousStatus: string
  ): Promise<void> {
    if (!goal.owner_id || !goal.tenant_id) return;

    try {
      const isUrgent = goal.status === 'behind';

      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.GOAL_STATUS_CHANGED,
        category: 'planning',
        priority: isUrgent ? 'high' : 'normal',
        tenantId: goal.tenant_id,
        recipient: {
          userId: goal.owner_id,
        },
        payload: {
          title: `Goal Status: ${goal.status === 'at_risk' ? 'At Risk' : 'Behind'}`,
          message: `The goal "${goal.title}" status has changed from ${previousStatus} to ${goal.status}`,
          goalId: goal.id,
          goalTitle: goal.title,
          previousStatus,
          newStatus: goal.status,
          actionType: 'redirect',
          actionPayload: `/admin/community/planning/goals/${goal.id}`,
        },
        channels: ['in_app', 'email', 'push'],
      });
    } catch (error) {
      console.error('Failed to send goal status notification:', error);
    }
  }

  /**
   * Send notification when an objective is assigned to someone
   */
  private async sendObjectiveAssignedNotification(
    objective: Objective,
    goal: Goal
  ): Promise<void> {
    if (!objective.responsible_id || !objective.tenant_id) return;

    try {
      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.OBJECTIVE_ASSIGNED,
        category: 'planning',
        priority: objective.priority === 'urgent' ? 'high' : 'normal',
        tenantId: objective.tenant_id,
        recipient: {
          userId: objective.responsible_id,
        },
        payload: {
          title: 'Objective Assigned',
          message: `You have been assigned as responsible for the objective: ${objective.title} (Goal: ${goal.title})`,
          objectiveId: objective.id,
          objectiveTitle: objective.title,
          goalId: goal.id,
          goalTitle: goal.title,
          actionType: 'redirect',
          actionPayload: `/admin/community/planning/goals/${goal.id}?objective=${objective.id}`,
        },
        channels: ['in_app', 'email'],
      });
    } catch (error) {
      console.error('Failed to send objective assigned notification:', error);
    }
  }

  /**
   * Send notification when a key result is completed
   */
  private async sendKeyResultCompletedNotification(
    keyResult: KeyResult,
    goal: Goal | null
  ): Promise<void> {
    if (!keyResult.tenant_id) return;

    // Determine recipient - goal owner if available
    const recipientId = goal?.owner_id;
    if (!recipientId) return;

    try {
      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.KEY_RESULT_COMPLETED,
        category: 'planning',
        priority: 'normal',
        tenantId: keyResult.tenant_id,
        recipient: {
          userId: recipientId,
        },
        payload: {
          title: 'Key Result Completed',
          message: `Key result "${keyResult.title}" has reached its target value of ${keyResult.target_value}${keyResult.unit_label ? ` ${keyResult.unit_label}` : ''}`,
          keyResultId: keyResult.id,
          keyResultTitle: keyResult.title,
          targetValue: keyResult.target_value,
          currentValue: keyResult.current_value,
          unitLabel: keyResult.unit_label,
          goalId: goal?.id,
          goalTitle: goal?.title,
          actionType: 'redirect',
          actionPayload: goal ? `/admin/community/planning/goals/${goal.id}` : '/admin/community/planning/goals',
        },
        channels: ['in_app', 'email', 'push'],
      });
    } catch (error) {
      console.error('Failed to send key result completed notification:', error);
    }
  }

  /**
   * Send notification when a key result update is due
   * This should be called by a scheduled job
   */
  async sendKeyResultUpdateDueNotifications(): Promise<number> {
    try {
      // Get key results due for update in the next 24 hours
      const keyResultsDue = await this.getKeyResultsDueForUpdate(1);
      let notificationsSent = 0;

      for (const keyResult of keyResultsDue) {
        // Get the parent goal to determine the recipient
        const goal = keyResult.goal_id
          ? await this.goalRepo.getById(keyResult.goal_id)
          : null;

        const recipientId = goal?.owner_id;
        if (!recipientId || !keyResult.tenant_id) continue;

        try {
          await this.notificationBus.publish({
            id: randomUUID(),
            eventType: NotificationEventType.KEY_RESULT_UPDATE_DUE,
            category: 'planning',
            priority: 'normal',
            tenantId: keyResult.tenant_id,
            recipient: {
              userId: recipientId,
            },
            payload: {
              title: 'Progress Update Due',
              message: `Key result "${keyResult.title}" is due for a progress update`,
              keyResultId: keyResult.id,
              keyResultTitle: keyResult.title,
              currentValue: keyResult.current_value,
              targetValue: keyResult.target_value,
              unitLabel: keyResult.unit_label,
              updateFrequency: keyResult.update_frequency,
              goalId: goal?.id,
              goalTitle: goal?.title,
              actionType: 'redirect',
              actionPayload: goal
                ? `/admin/community/planning/goals/${goal.id}?action=update-progress&kr=${keyResult.id}`
                : '/admin/community/planning/goals',
            },
            channels: ['in_app', 'email'],
          });
          notificationsSent++;
        } catch (error) {
          console.error(`Failed to send key result update due notification for ${keyResult.id}:`, error);
        }
      }

      return notificationsSent;
    } catch (error) {
      console.error('Failed to send key result update due notifications:', error);
      return 0;
    }
  }
}
