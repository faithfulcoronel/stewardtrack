import { z } from 'zod';
import { License } from '@/models/license.model';

const schema = z.object({
  tenant_id: z.string().uuid({ message: 'Tenant ID is required' }),
  feature_id: z.string().uuid({ message: 'Feature ID is required' }),
  grant_source: z.enum(['package', 'direct', 'trial', 'comp'], {
    errorMap: () => ({ message: 'Grant source is required' }),
  }),
  package_id: z.string().uuid().optional().nullable(),
  source_reference: z.string().optional().nullable(),
  starts_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

export class LicenseValidator {
  static validate(data: Partial<License>): void {
    schema.partial().parse(data);
  }
}
