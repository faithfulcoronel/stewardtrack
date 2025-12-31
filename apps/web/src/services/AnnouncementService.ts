import 'server-only';
import { injectable, inject } from 'inversify';
import type { IAnnouncementRepository } from '@/repositories/announcement.repository';
import type { Announcement } from '@/models/announcement.model';
import { QueryOptions } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { CrudService } from '@/services/CrudService';
import { AnnouncementValidator } from '@/validators/announcement.validator';
import { validateOrThrow } from '@/utils/validation';

export type AnnouncementService = CrudService<Announcement> & {
  getActiveAnnouncements(): Promise<Announcement[]>;
};

@injectable()
export class SupabaseAnnouncementService implements AnnouncementService {
  constructor(
    @inject(TYPES.IAnnouncementRepository)
    private repo: IAnnouncementRepository,
  ) {}

  find(options: QueryOptions = {}) {
    return this.repo.find(options);
  }

  findAll(options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findAll(options);
  }

  findById(id: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findById(id, options);
  }

  create(
    data: Partial<Announcement>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(AnnouncementValidator, data);
    return this.repo.create(data, relations, fieldsToRemove);
  }

  update(
    id: string,
    data: Partial<Announcement>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(AnnouncementValidator, data);
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    const { data } = await this.repo.find({
      filters: { active: { operator: 'eq', value: true } },
      order: { column: 'starts_at', ascending: true },
    });
    return data ?? [];
  }
}
