import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { Announcement } from '../models/announcement.model';
import { BaseAdapter } from '../adapters/base.adapter';

export interface IAnnouncementRepository extends BaseRepository<Announcement> {
  // Add any announcement-specific repository methods here
}

@injectable()
export class AnnouncementRepository extends BaseRepository<Announcement> implements IAnnouncementRepository {
  constructor(@inject('IAnnouncementAdapter') adapter: BaseAdapter<Announcement>) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<Announcement>): Promise<Partial<Announcement>> {
    // Add any announcement-specific validation or transformation logic here
    return data;
  }

  protected override async afterCreate(announcement: Announcement): Promise<void> {
    // Add any post-creation logic here (e.g., logging, notifications)
  }

  protected override async beforeUpdate(id: string, data: Partial<Announcement>): Promise<Partial<Announcement>> {
    // Add any announcement-specific validation or transformation logic here
    return data;
  }

  protected override async afterUpdate(announcement: Announcement): Promise<void> {
    // Add any post-update logic here
  }

  protected override async beforeDelete(id: string): Promise<void> {
    // Add any pre-deletion logic here (e.g., checking dependencies)
  }

  protected override async afterDelete(id: string): Promise<void> {
    // Add any post-deletion logic here
  }
}