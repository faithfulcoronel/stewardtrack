import { z } from 'zod';
import { LicenseFeature } from '@/models/licenseFeature.model';

const schema = z.object({
  code: z.string().nonempty('Feature code is required'),
  name: z.string().nonempty('Feature name is required'),
  category: z.string().nonempty('Category is required'),
  description: z.string().optional().nullable(),
  phase: z.string().nonempty('Phase is required'),
  is_delegatable: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export class LicenseFeatureValidator {
  static validate(data: Partial<LicenseFeature>): void {
    schema.partial().parse(data);
  }
}
