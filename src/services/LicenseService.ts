import { injectable } from 'inversify';
import type { License } from '../models/license.model';

export type LicenseOverrides = Partial<License>;

@injectable()
export class LicenseService {
  resolveLicense(current: License | null, overrides?: LicenseOverrides | null): License | null {
    if (!current) {
      return overrides ? ({ ...overrides } as License) : null;
    }
    return { ...current, ...(overrides || {}) } as License;
  }
}
