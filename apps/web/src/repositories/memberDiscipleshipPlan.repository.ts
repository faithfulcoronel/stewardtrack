/**
 * ================================================================================
 * MEMBER DISCIPLESHIP PLAN REPOSITORY
 * ================================================================================
 *
 * REPOSITORY PATTERN:
 * Repositories provide a domain-oriented interface to data access.
 * They wrap adapters and add business logic like notifications and validation.
 *
 * KEY RESPONSIBILITIES:
 *   1. Delegate CRUD operations to adapter
 *   2. Handle notifications (success messages)
 *   3. Expose domain-specific query methods
 *   4. Apply business rules and validation
 *
 * ================================================================================
 */

import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { MemberDiscipleshipPlan } from '@/models/memberDiscipleshipPlan.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IMemberDiscipleshipPlanAdapter } from '@/adapters/memberDiscipleshipPlan.adapter';

/**
 * Repository interface extending base CRUD with domain-specific methods.
 *
 * @module members.discipleship
 *
 * @permission discipleshipplans:view - Required for read operations (getAll, getById, getByMember)
 * @permission discipleshipplans:manage - Required for create/update operations
 * @permission discipleshipplans:delete - Required for delete operations
 */
export interface IMemberDiscipleshipPlanRepository extends BaseRepository<MemberDiscipleshipPlan> {
  getAll(): Promise<MemberDiscipleshipPlan[]>;
  getById(planId: string): Promise<MemberDiscipleshipPlan | null>;
  getByMember(memberId: string): Promise<MemberDiscipleshipPlan[]>;
}

/**
 * Repository implementation for member discipleship plans.
 *
 * @module members.discipleship
 *
 * @permission discipleshipplans:view - Required for read operations
 * @permission discipleshipplans:manage - Required for create/update operations
 * @permission discipleshipplans:delete - Required for delete operations
 */
@injectable()
export class MemberDiscipleshipPlanRepository
  extends BaseRepository<MemberDiscipleshipPlan>
  implements IMemberDiscipleshipPlanRepository
{
  constructor(
    @inject(TYPES.IMemberDiscipleshipPlanAdapter)
    private readonly discipleshipPlanAdapter: IMemberDiscipleshipPlanAdapter,
  ) {
    super(discipleshipPlanAdapter);
  }

  // ==================== LIFECYCLE HOOKS ====================

  protected override async afterCreate(_data: MemberDiscipleshipPlan): Promise<void> {
    NotificationService.showSuccess('Discipleship plan created successfully.');
  }

  protected override async afterUpdate(_data: MemberDiscipleshipPlan): Promise<void> {
    NotificationService.showSuccess('Discipleship plan updated successfully.');
  }

  // ==================== DOMAIN-SPECIFIC METHODS ====================

  /**
   * Get all discipleship plans for the current tenant
   */
  async getAll(): Promise<MemberDiscipleshipPlan[]> {
    return this.discipleshipPlanAdapter.getAll();
  }

  /**
   * Get a discipleship plan by ID (tenant-scoped)
   */
  async getById(planId: string): Promise<MemberDiscipleshipPlan | null> {
    return this.discipleshipPlanAdapter.getById(planId);
  }

  /**
   * Get all discipleship plans for a specific member
   */
  async getByMember(memberId: string): Promise<MemberDiscipleshipPlan[]> {
    return this.discipleshipPlanAdapter.getByMember(memberId);
  }
}
