import { z } from 'zod';
import { License } from '@/models/license.model';

const GRANT_SOURCE_VALUES = ['package', 'direct', 'trial', 'comp'] as const satisfies ReadonlyArray<License['grant_source']>;

const grantSourceSchema = z
  .string()
  .transform((value) => value.trim())
  .superRefine((value, ctx) => {
    if (value.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Grant source is required' });
      return;
    }
    if (!GRANT_SOURCE_VALUES.includes(value as License['grant_source'])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Grant source must be one of package, direct, trial, or comp.',
      });
    }
  })
  .transform((value) => value as License['grant_source']);

const schema = z.object({
  tenant_id: z.string().uuid({ message: 'Tenant ID is required' }),
  feature_id: z.string().uuid({ message: 'Feature ID is required' }),
  grant_source: grantSourceSchema,
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
