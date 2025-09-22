import { z } from 'zod';
import { License } from '../models/license.model';

const schema = z.object({
  plan_name: z.string().nonempty('Plan name is required'),
  tier: z.string().nonempty('Tier is required'),
  status: z.string().nonempty('Status is required'),
  starts_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

export class LicenseValidator {
  static validate(data: Partial<License>): void {
    schema.partial().parse(data);
  }
}
