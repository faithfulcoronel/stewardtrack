import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { Permission } from '@/models/permission.model';
import { NotificationService } from '@/services/NotificationService';
import { PermissionValidator } from '@/validators/permission.validator';
import { TYPES } from '@/lib/types';

export type IPermissionRepository = BaseRepository<Permission>;

@injectable()
export class PermissionRepository
  extends BaseRepository<Permission>
  implements IPermissionRepository
{
  constructor(@inject(TYPES.IPermissionAdapter) adapter: BaseAdapter<Permission>) {
    super(adapter);
  }

  protected override async beforeCreate(
    data: Partial<Permission>
  ): Promise<Partial<Permission>> {
    PermissionValidator.validate(data);
    return this.formatData(data);
  }

  protected override async afterCreate(data: Permission): Promise<void> {
    NotificationService.showSuccess(
      `Permission "${data.name}" created successfully`
    );
  }

  protected override async beforeUpdate(
    id: string,
    data: Partial<Permission>
  ): Promise<Partial<Permission>> {
    PermissionValidator.validate(data);
    return this.formatData(data);
  }

  protected override async afterUpdate(data: Permission): Promise<void> {
    NotificationService.showSuccess(
      `Permission "${data.name}" updated successfully`
    );
  }

  private formatData(data: Partial<Permission>): Partial<Permission> {
    return {
      ...data,
      code: data.code?.trim(),
      name: data.name?.trim(),
      description: data.description?.trim() || null,
      module: data.module?.trim().toLowerCase(),
    };
  }
}
