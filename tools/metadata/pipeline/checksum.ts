import crypto from 'crypto';
import type { CanonicalDefinition } from './types';

export function applyChecksum(definition: CanonicalDefinition): CanonicalDefinition {
  const pagePayload = JSON.stringify(definition.page ?? {});
  const checksum = crypto.createHash('sha256').update(pagePayload).digest('hex');
  return { ...definition, checksum };
}
