/**
 * ================================================================================
 * DISCIPLESHIP PATHWAY SERVICE
 * ================================================================================
 *
 * Business logic service for discipleship pathways.
 * Provides CRUD operations and lookup functionality.
 *
 * IMPLEMENTS: LookupServiceInstance interface for use with membership lookup pattern
 *   - getActive(): Gets active pathways (matches LookupServiceInstance)
 *   - create(): Creates a pathway (matches LookupServiceInstance)
 *
 * USAGE IN METADATA HANDLERS:
 *   const service = container.get<DiscipleshipPathwayService>(TYPES.DiscipleshipPathwayService);
 *   const pathways = await service.getActive();
 *
 * ================================================================================
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IDiscipleshipPathwayRepository } from '@/repositories/discipleshipPathway.repository';
import type { DiscipleshipPathway } from '@/models/discipleshipPathway.model';

@injectable()
export class DiscipleshipPathwayService {
  constructor(
    @inject(TYPES.IDiscipleshipPathwayRepository)
    private repo: IDiscipleshipPathwayRepository,
  ) {}

  /**
   * Get all pathways for the current tenant
   */
  async getAll(): Promise<DiscipleshipPathway[]> {
    return this.repo.getAll();
  }

  /**
   * Get active pathways for dropdown options
   * NOTE: Method name matches LookupServiceInstance interface
   */
  async getActive(): Promise<DiscipleshipPathway[]> {
    return this.repo.getActive();
  }

  /**
   * Get a pathway by ID
   */
  async getById(pathwayId: string): Promise<DiscipleshipPathway | null> {
    return this.repo.getById(pathwayId);
  }

  /**
   * Get a pathway by code
   */
  async getByCode(code: string): Promise<DiscipleshipPathway | null> {
    return this.repo.getByCode(code);
  }

  /**
   * Create a new pathway
   * NOTE: Method name matches LookupServiceInstance interface
   */
  async create(data: Partial<DiscipleshipPathway>): Promise<DiscipleshipPathway> {
    // Generate code from name if not provided
    if (!data.code && data.name) {
      data.code = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    }

    // Set default values
    const pathwayData: Partial<DiscipleshipPathway> = {
      ...data,
      is_active: data.is_active !== false,
      display_order: data.display_order ?? 0,
    };

    return this.repo.create(pathwayData);
  }

  /**
   * Update an existing pathway
   */
  async update(
    id: string,
    data: Partial<DiscipleshipPathway>
  ): Promise<DiscipleshipPathway> {
    return this.repo.update(id, data);
  }

  /**
   * Soft delete a pathway
   */
  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  /**
   * Toggle pathway active status
   */
  async toggleActive(id: string): Promise<DiscipleshipPathway> {
    const pathway = await this.repo.getById(id);
    if (!pathway) {
      throw new Error('Pathway not found');
    }

    return this.repo.update(id, {
      is_active: !pathway.is_active,
    });
  }

  /**
   * Get pathway options formatted for form selects
   * NOTE: Uses `code` as value since member_discipleship_plans.pathway stores the code
   */
  async getPathwayOptions(): Promise<Array<{ value: string; label: string }>> {
    const pathways = await this.repo.getActive();
    return pathways.map((p) => ({
      value: p.code,
      label: p.name,
    }));
  }
}
