import { Setting } from '../models/setting.model';

export class SettingValidator {
  static validate(data: Partial<Setting>): void {
    if (data.key !== undefined && !data.key.trim()) {
      throw new Error('Setting key is required');
    }
    if (data.value === undefined || data.value === null) {
      throw new Error('Setting value is required');
    }
  }
}
