import { z } from 'zod';
import { LicenseFeature } from '../models/licenseFeature.model';

const schema = z.object({
  license_id: z.string().uuid({ message: 'License ID is required' }),
  feature: z.string().nonempty('Feature is required'),
  plan_name: z.string().nonempty('Plan name is required'),
  feature_key: z.string().nonempty('Feature key is required'),
});

export class LicenseFeatureValidator {
  static validate(data: Partial<LicenseFeature>): void {
    schema.partial().parse(data);
  }
}
