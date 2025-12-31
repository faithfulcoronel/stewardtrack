/**
 * ================================================================================
 * DISCIPLESHIP PATHWAY REPOSITORY
 * ================================================================================
 *
 * Repository for discipleship pathway operations.
 * Wraps adapter and adds business logic like notifications.
 *
 * ================================================================================
 */

import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { DiscipleshipPathway } from '@/models/discipleshipPathway.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IDiscipleshipPathwayAdapter } from '@/adapters/discipleshipPathway.adapter';

export interface IDiscipleshipPathwayRepository extends BaseRepository<DiscipleshipPathway> {
  getAll(): Promise<DiscipleshipPathway[]>;
  getById(pathwayId: string): Promise<DiscipleshipPathway | null>;
  getByCode(code: string): Promise<DiscipleshipPathway | null>;
  getActive(): Promise<DiscipleshipPathway[]>;
}

@injectable()
export class DiscipleshipPathwayRepository
  extends BaseRepository<DiscipleshipPathway>
  implements IDiscipleshipPathwayRepository
{
  constructor(
    @inject(TYPES.IDiscipleshipPathwayAdapter)
    private readonly pathwayAdapter: IDiscipleshipPathwayAdapter,
  ) {
    super(pathwayAdapter);
  }

  protected override async afterCreate(_data: DiscipleshipPathway): Promise<void> {
    NotificationService.showSuccess('Discipleship pathway created successfully.');
  }

  protected override async afterUpdate(_data: DiscipleshipPathway): Promise<void> {
    NotificationService.showSuccess('Discipleship pathway updated successfully.');
  }

  async getAll(): Promise<DiscipleshipPathway[]> {
    return this.pathwayAdapter.getAll();
  }

  async getById(pathwayId: string): Promise<DiscipleshipPathway | null> {
    return this.pathwayAdapter.getById(pathwayId);
  }

  async getByCode(code: string): Promise<DiscipleshipPathway | null> {
    return this.pathwayAdapter.getByCode(code);
  }

  async getActive(): Promise<DiscipleshipPathway[]> {
    return this.pathwayAdapter.getActive();
  }
}
