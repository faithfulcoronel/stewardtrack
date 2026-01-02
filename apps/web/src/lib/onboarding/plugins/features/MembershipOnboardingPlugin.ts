import 'server-only';

import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMembershipTypeRepository } from '@/repositories/membershipType.repository';
import type { IMembershipStageRepository } from '@/repositories/membershipStage.repository';
import type { IDiscipleshipPathwayRepository } from '@/repositories/discipleshipPathway.repository';
import { DEFAULT_DISCIPLESHIP_PATHWAYS } from '@/models/discipleshipPathway.model';
import { BaseFeatureOnboardingPlugin } from '../BaseFeatureOnboardingPlugin';
import type { FeatureOnboardingContext, FeatureOnboardingResult } from '../types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Default membership types to seed for new tenants
 * These represent common church membership classifications
 */
const DEFAULT_MEMBERSHIP_TYPES = [
  {
    code: 'member',
    name: 'Member',
    description: 'Full church member with voting rights and access to member-only services',
    sort_order: 1,
  },
  {
    code: 'regular_attendee',
    name: 'Regular Attendee',
    description: 'Attends services regularly but not yet a formal member',
    sort_order: 2,
  },
  {
    code: 'visitor',
    name: 'Visitor',
    description: 'First-time or occasional visitor',
    sort_order: 3,
  },
  {
    code: 'online_member',
    name: 'Online Member',
    description: 'Member who primarily attends online services',
    sort_order: 4,
  },
  {
    code: 'inactive',
    name: 'Inactive',
    description: 'Previously active member who is no longer attending',
    sort_order: 5,
  },
];

/**
 * Default membership stages to seed for new tenants
 * These represent the spiritual journey stages
 */
const DEFAULT_MEMBERSHIP_STAGES = [
  {
    code: 'first_time_guest',
    name: 'First Time Guest',
    description: 'Initial visit to the church',
    sort_order: 1,
  },
  {
    code: 'returning_guest',
    name: 'Returning Guest',
    description: 'Has visited multiple times',
    sort_order: 2,
  },
  {
    code: 'connected',
    name: 'Connected',
    description: 'Engaged with a small group or ministry team',
    sort_order: 3,
  },
  {
    code: 'growing',
    name: 'Growing',
    description: 'Actively participating in discipleship and spiritual growth',
    sort_order: 4,
  },
  {
    code: 'serving',
    name: 'Serving',
    description: 'Contributing to ministry through volunteer service',
    sort_order: 5,
  },
  {
    code: 'leading',
    name: 'Leading',
    description: 'Taking leadership roles within the church',
    sort_order: 6,
  },
];

/**
 * MembershipOnboardingPlugin
 *
 * Seeds default membership types, stages, and discipleship pathways when a tenant
 * registers with the members.core feature licensed.
 *
 * Feature code: 'members.core' (maps to feature_catalog.code)
 *
 * This plugin creates:
 * - Default membership types (Member, Regular Attendee, Visitor, etc.)
 * - Default membership stages (First Time Guest, Connected, Growing, etc.)
 * - Default discipleship pathways (Growth Track, Leadership, Foundations, etc.)
 *
 * All records are marked as is_system=true so users know they are defaults
 * but can still be modified or deactivated.
 */
@injectable()
export class MembershipOnboardingPlugin extends BaseFeatureOnboardingPlugin {
  readonly featureCode = 'members.core';
  readonly name = 'Member Management Feature';
  readonly description = 'Seeds default membership types, stages, and discipleship pathways for new tenants';
  readonly priority = 10; // Run early since other features may depend on membership

  constructor(
    @inject(TYPES.IMembershipTypeRepository)
    private membershipTypeRepository: IMembershipTypeRepository,

    @inject(TYPES.IMembershipStageRepository)
    private membershipStageRepository: IMembershipStageRepository,

    @inject(TYPES.IDiscipleshipPathwayRepository)
    private discipleshipPathwayRepository: IDiscipleshipPathwayRepository
  ) {
    super();
  }

  /**
   * Check if this plugin should execute
   * Runs if 'members.core' feature is in the granted features list
   */
  override async shouldExecute(context: FeatureOnboardingContext): Promise<boolean> {
    // Check for exact 'members.core' feature or any member-related feature
    const hasMemberManagementFeature = context.grantedFeatures.some(
      (feature) =>
        feature === 'members.core' ||
        feature === 'member-management' || // Legacy support
        feature === 'community' ||
        feature.startsWith('members.') ||
        feature.startsWith('member-') ||
        feature.startsWith('community_')
    );

    console.log(
      `[MembershipOnboardingPlugin] shouldExecute check: hasMemberManagementFeature=${hasMemberManagementFeature}`,
      { grantedFeatures: context.grantedFeatures }
    );

    return hasMemberManagementFeature;
  }

  /**
   * Execute the membership onboarding logic
   */
  protected async executeInternal(
    context: FeatureOnboardingContext
  ): Promise<FeatureOnboardingResult> {
    let typesCreated = 0;
    let stagesCreated = 0;
    let pathwaysCreated = 0;

    try {
      // Create membership types
      typesCreated = await this.seedMembershipTypes(context);

      // Create membership stages
      stagesCreated = await this.seedMembershipStages(context);

      // Create discipleship pathways
      pathwaysCreated = await this.seedDiscipleshipPathways(context);

      const totalCreated = typesCreated + stagesCreated + pathwaysCreated;

      return this.successResult(
        `Created ${typesCreated} membership types, ${stagesCreated} membership stages, and ${pathwaysCreated} discipleship pathways`,
        totalCreated,
        {
          membershipTypesCreated: typesCreated,
          membershipStagesCreated: stagesCreated,
          discipleshipPathwaysCreated: pathwaysCreated,
        }
      );
    } catch (error) {
      return this.failureResult(
        `Failed to seed membership data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Seed default membership types for the tenant
   */
  private async seedMembershipTypes(context: FeatureOnboardingContext): Promise<number> {
    let created = 0;

    for (const typeData of DEFAULT_MEMBERSHIP_TYPES) {
      try {
        // Check if type already exists (idempotent)
        const existing = await this.checkExistingType(context.tenantId, typeData.code);
        if (existing) {
          console.log(
            `[MembershipOnboardingPlugin] Membership type '${typeData.code}' already exists, skipping`
          );
          continue;
        }

        await this.membershipTypeRepository.create({
          ...typeData,
          tenant_id: context.tenantId,
          is_system: true,
          is_active: true,
          created_by: context.userId,
          updated_by: context.userId,
        } as Partial<{ id: string; code: string; name: string; description: string | null; is_system: boolean; is_active: boolean; sort_order: number; tenant_id: string; created_by: string; updated_by: string }>);

        created++;
        console.log(
          `[MembershipOnboardingPlugin] Created membership type: ${typeData.name}`
        );
      } catch (error) {
        console.error(
          `[MembershipOnboardingPlugin] Failed to create membership type '${typeData.code}':`,
          error
        );
        // Continue with other types - don't fail entirely
      }
    }

    return created;
  }

  /**
   * Seed default membership stages for the tenant
   */
  private async seedMembershipStages(context: FeatureOnboardingContext): Promise<number> {
    let created = 0;

    for (const stageData of DEFAULT_MEMBERSHIP_STAGES) {
      try {
        // Check if stage already exists (idempotent)
        const existing = await this.checkExistingStage(context.tenantId, stageData.code);
        if (existing) {
          console.log(
            `[MembershipOnboardingPlugin] Membership stage '${stageData.code}' already exists, skipping`
          );
          continue;
        }

        await this.membershipStageRepository.create({
          ...stageData,
          tenant_id: context.tenantId,
          is_system: true,
          is_active: true,
          created_by: context.userId,
          updated_by: context.userId,
        } as Partial<{ id: string; code: string; name: string; description: string | null; is_system: boolean; is_active: boolean; sort_order: number; tenant_id: string; created_by: string; updated_by: string }>);

        created++;
        console.log(
          `[MembershipOnboardingPlugin] Created membership stage: ${stageData.name}`
        );
      } catch (error) {
        console.error(
          `[MembershipOnboardingPlugin] Failed to create membership stage '${stageData.code}':`,
          error
        );
        // Continue with other stages - don't fail entirely
      }
    }

    return created;
  }

  /**
   * Check if a membership type already exists
   * Uses direct Supabase query to bypass tenant context requirement during onboarding
   */
  private async checkExistingType(tenantId: string, code: string): Promise<boolean> {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from('membership_type')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('code', code)
        .is('deleted_at', null)
        .limit(1);

      if (error) {
        console.warn(`[MembershipOnboardingPlugin] Error checking existing type: ${error.message}`);
        return false;
      }
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if a membership stage already exists
   * Uses direct Supabase query to bypass tenant context requirement during onboarding
   */
  private async checkExistingStage(tenantId: string, code: string): Promise<boolean> {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from('membership_stage')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('code', code)
        .is('deleted_at', null)
        .limit(1);

      if (error) {
        console.warn(`[MembershipOnboardingPlugin] Error checking existing stage: ${error.message}`);
        return false;
      }
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Seed default discipleship pathways for the tenant
   * These represent spiritual growth tracks like Growth Track, Leadership, etc.
   */
  private async seedDiscipleshipPathways(context: FeatureOnboardingContext): Promise<number> {
    let created = 0;

    for (const pathwayData of DEFAULT_DISCIPLESHIP_PATHWAYS) {
      try {
        // Check if pathway already exists (idempotent)
        const existing = await this.checkExistingPathway(context.tenantId, pathwayData.code);
        if (existing) {
          console.log(
            `[MembershipOnboardingPlugin] Discipleship pathway '${pathwayData.code}' already exists, skipping`
          );
          continue;
        }

        await this.discipleshipPathwayRepository.create({
          ...pathwayData,
          tenant_id: context.tenantId,
          is_active: true,
          created_by: context.userId,
          updated_by: context.userId,
        } as Partial<{ id: string; code: string; name: string; description: string | null; is_active: boolean; display_order: number; tenant_id: string; created_by: string; updated_by: string }>);

        created++;
        console.log(
          `[MembershipOnboardingPlugin] Created discipleship pathway: ${pathwayData.name}`
        );
      } catch (error) {
        console.error(
          `[MembershipOnboardingPlugin] Failed to create discipleship pathway '${pathwayData.code}':`,
          error
        );
        // Continue with other pathways - don't fail entirely
      }
    }

    return created;
  }

  /**
   * Check if a discipleship pathway already exists
   * Uses direct Supabase query to bypass tenant context requirement during onboarding
   */
  private async checkExistingPathway(tenantId: string, code: string): Promise<boolean> {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from('discipleship_pathways')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('code', code)
        .is('deleted_at', null)
        .limit(1);

      if (error) {
        console.warn(`[MembershipOnboardingPlugin] Error checking existing pathway: ${error.message}`);
        return false;
      }
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }
}
