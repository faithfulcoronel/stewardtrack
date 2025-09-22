import { Permission } from '../models/permission.model';

export class PermissionValidator {
  static validate(data: Partial<Permission>): void {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Permission name is required');
    }

    if (data.code !== undefined) {
      const trimmed = data.code.trim();
      if (!trimmed) {
        throw new Error('Permission code is required');
      }
      if (!/^[a-z]+\.[a-z_]+$/.test(trimmed)) {
        throw new Error('Invalid permission code');
      }
    }

    if (data.module !== undefined && !data.module.trim()) {
      throw new Error('Permission module is required');
    }
  }
}
