# PII Encryption Usage Guide

## Overview

StewardTrack implements zero-knowledge encryption for Personally Identifiable Information (PII) at the adapter layer. This ensures that even developers cannot access encrypted data without the system master key.

## Architecture Summary

### Encryption Stack

1. **System Master Key** (Environment Variable: `ENCRYPTION_MASTER_KEY`)
   - 256-bit AES key stored securely in `.env`
   - Never committed to version control
   - Required for all encryption operations

2. **Tenant Master Key** (Database: `encryption_keys` table)
   - Unique per tenant
   - Derived during tenant registration
   - Encrypted with system master key
   - Cached for 5 minutes for performance

3. **Field-Specific Keys** (Derived via HKDF)
   - Generated on-demand using HKDF-SHA256
   - Unique per field name (e.g., "email", "tax_id")
   - Never stored, always derived from tenant master key

### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **IV Size**: 96 bits (random per encryption)
- **Auth Tag**: 128 bits (integrity verification)
- **Format**: `{keyVersion}.{iv}.{authTag}.{ciphertext}` (all base64-encoded)

## Setup Instructions

### 1. Environment Configuration

Generate a secure encryption master key:

```bash
node -e "console.log(crypto.randomBytes(32).toString('base64'))"
```

Add to `.env`:

```bash
ENCRYPTION_MASTER_KEY=your-generated-base64-key-here
```

**CRITICAL**: Never commit this key to version control!

### 2. Database Migrations

Apply encryption infrastructure migrations:

```bash
npx supabase db push
```

This creates:
- `encryption_keys` table (tenant encryption keys)
- `field_encryption_metadata` table (PII field registry)
- `encryption_audit_log` table (encryption operation audit trail)
- Encryption metadata columns on PII tables (`encrypted_fields`, `encryption_key_version`)

### 3. Tenant Encryption Key Generation

#### For New Tenants

Encryption keys are automatically generated during registration ([src/app/api/auth/register/route.ts:184-192](../src/app/api/auth/register/route.ts#L184-L192)):

```typescript
const encryptionKeyManager = container.get<EncryptionKeyManager>(TYPES.EncryptionKeyManager);
await encryptionKeyManager.generateTenantKey(tenantId);
```

#### For Existing Tenants

Use the tenant key generation script (to be created):

```bash
npm run generate-tenant-keys
```

Or programmatically:

```typescript
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { EncryptionKeyManager } from '@/lib/encryption/EncryptionKeyManager';

const keyManager = container.get<EncryptionKeyManager>(TYPES.EncryptionKeyManager);
await keyManager.generateTenantKey(tenantId);
```

## Encrypted Tables

### Currently Encrypted

| Table | PII Fields | Description |
|-------|------------|-------------|
| **members** | first_name, last_name, middle_name, email, contact_number, address, birthday, anniversary, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, physician_name, pastoral_notes, prayer_requests | Member personal information |
| **member_households** | name, address_street, address_city, address_state, address_postal_code, member_names | Household information |
| **tenants** | address, contact_number, email | Church organization contact info |
| **member_care_plans** | details | Pastoral care plan details |
| **member_giving_profiles** | (TBD) | Financial giving information |
| **accounts** | email, phone, address, tax_id, notes | Financial account information (includes SSN/EIN) |

### PII Field Registry

All encrypted fields are registered in `field_encryption_metadata`:

```sql
SELECT * FROM field_encryption_metadata WHERE table_name = 'accounts';
```

Output:
```
table_name | field_name | encryption_algorithm | is_encrypted
-----------|------------|---------------------|-------------
accounts   | email      | AES-256-GCM         | true
accounts   | phone      | AES-256-GCM         | true
accounts   | address    | AES-256-GCM         | true
accounts   | tax_id     | AES-256-GCM         | true
accounts   | notes      | AES-256-GCM         | true
```

## Using Encrypted Adapters

### Example: EncryptedMemberAdapter

The encrypted adapters are **drop-in replacements** for standard adapters. No business logic changes required.

#### Standard Adapter (Before)

```typescript
import { MemberAdapter } from '@/adapters/member.adapter';

const memberAdapter = container.get<MemberAdapter>(TYPES.IMemberAdapter);
const members = await memberAdapter.fetch();
// PII fields are plaintext
```

#### Encrypted Adapter (After)

```typescript
import { EncryptedMemberAdapter } from '@/adapters/encrypted/EncryptedMemberAdapter';

// Update DI container binding:
container.bind<IMemberAdapter>(TYPES.IMemberAdapter)
  .to(EncryptedMemberAdapter)
  .inRequestScope();

// Usage is identical:
const memberAdapter = container.get<IMemberAdapter>(TYPES.IMemberAdapter);
const members = await memberAdapter.fetch();
// PII fields are automatically decrypted
```

### Transparent Encryption/Decryption

The adapter handles encryption/decryption automatically:

#### Create Operation

```typescript
// Input: Plaintext PII
const newMember = await memberAdapter.create({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  contact_number: '+1-555-0100'
});

// Database stores:
// first_name: "1.iv123...==.tag456...==.cipher789...=="
// last_name: "1.iv234...==.tag567...==.cipher890...=="
// encrypted_fields: ["first_name", "last_name", "email", "contact_number"]
// encryption_key_version: 1
```

#### Read Operation

```typescript
// Output: Decrypted PII
const member = await memberAdapter.fetchById(memberId);
console.log(member.first_name); // "John" (decrypted automatically)
```

#### Update Operation

```typescript
// Input: Plaintext PII
await memberAdapter.update(memberId, {
  email: 'new.email@example.com'
});

// Database stores encrypted value
// encrypted_fields array is updated automatically
```

### Example: EncryptedAccountAdapter

Accounts table includes highly sensitive tax_id field (SSN/EIN):

```typescript
import { EncryptedAccountAdapter } from '@/adapters/encrypted/EncryptedAccountAdapter';

const accountAdapter = container.get<IAccountAdapter>(TYPES.IAccountAdapter);

// Create account with encrypted tax ID
const account = await accountAdapter.create({
  name: 'General Operating Fund',
  account_type: 'asset',
  tax_id: '12-3456789', // EIN - will be encrypted
  email: 'finance@church.org',
  phone: '+1-555-0200'
});

// Database stores all PII encrypted
// tax_id is encrypted with highest security
```

## Encryption Service API

### Direct Encryption (Advanced Usage)

For cases where you need to encrypt outside the adapter layer:

```typescript
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { EncryptionService } from '@/lib/encryption/EncryptionService';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';

const encryptionService = container.get<EncryptionService>(TYPES.EncryptionService);

// Encrypt single field
const encryptedEmail = await encryptionService.encrypt(
  'john@example.com',
  tenantId,
  'email'
);
// Returns: "1.iv123...==.tag456...==.cipher789...=="

// Decrypt single field
const plaintext = await encryptionService.decrypt(
  encryptedEmail,
  tenantId,
  'email'
);
// Returns: "john@example.com"

// Encrypt multiple fields
const member = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com'
};

const encryptedMember = await encryptionService.encryptFields(
  member,
  tenantId,
  getFieldEncryptionConfig('members')
);

// Decrypt multiple fields
const decryptedMember = await encryptionService.decryptFields(
  encryptedMember,
  tenantId,
  getFieldEncryptionConfig('members')
);
```

## Adding Encryption to New Tables

### Step 1: Create Database Migration

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_table_encryption.sql

-- Add encryption metadata columns
ALTER TABLE your_table
  ADD COLUMN IF NOT EXISTS encrypted_fields jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_your_table_encryption_key_version
  ON your_table(encryption_key_version)
  WHERE encrypted_fields IS NOT NULL AND encrypted_fields != '[]'::jsonb;

-- Register PII fields
INSERT INTO field_encryption_metadata (table_name, field_name, encryption_algorithm, is_encrypted)
VALUES
  ('your_table', 'sensitive_field1', 'AES-256-GCM', true),
  ('your_table', 'sensitive_field2', 'AES-256-GCM', true)
ON CONFLICT (table_name, field_name) DO NOTHING;
```

### Step 2: Update Domain Model

```typescript
// src/models/yourTable.model.ts

export interface YourTable extends BaseModel {
  // ... existing fields
  sensitive_field1?: string;
  sensitive_field2?: string;

  // Encryption metadata
  encrypted_fields?: string[] | null;
  encryption_key_version?: number | null;
}
```

### Step 3: Register PII Fields

```typescript
// src/utils/encryptionUtils.ts

export function getFieldEncryptionConfig(tableName: string): FieldEncryptionConfig[] {
  const configs: Record<string, FieldEncryptionConfig[]> = {
    // ... existing configs
    your_table: [
      { fieldName: 'sensitive_field1', required: false },
      { fieldName: 'sensitive_field2', required: true },
    ],
  };
  return configs[tableName] || [];
}
```

### Step 4: Create Encrypted Adapter

```typescript
// src/adapters/encrypted/EncryptedYourTableAdapter.ts

import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { YourTableAdapter } from '@/adapters/yourTable.adapter';
import { YourTable } from '@/models/yourTable.model';
import { EncryptionService } from '@/lib/encryption/EncryptionService';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';
import { TYPES } from '@/lib/types';
import type { QueryOptions } from '@/adapters/base.adapter';

@injectable()
export class EncryptedYourTableAdapter extends YourTableAdapter {
  constructor(
    @inject(TYPES.AuditService) auditService: AuditService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {
    super(auditService);
  }

  private getPIIFields() {
    return getFieldEncryptionConfig('your_table');
  }

  protected override async onBeforeCreate(data: Partial<YourTable>): Promise<Partial<YourTable>> {
    const preprocessed = await super.onBeforeCreate(data);
    const tenantId = this.context?.tenantId;

    if (!tenantId) {
      throw new Error('Tenant context required for encryption');
    }

    const encrypted = await this.encryptionService.encryptFields(
      preprocessed,
      tenantId,
      this.getPIIFields()
    );

    encrypted.encrypted_fields = this.getPIIFields()
      .map(f => f.fieldName)
      .filter(fieldName => preprocessed[fieldName as keyof YourTable] !== undefined);

    encrypted.encryption_key_version = 1;

    return encrypted;
  }

  protected override async onBeforeUpdate(id: string, data: Partial<YourTable>): Promise<Partial<YourTable>> {
    const preprocessed = await super.onBeforeUpdate(id, data);
    const tenantId = this.context?.tenantId;

    if (!tenantId) {
      throw new Error('Tenant context required for encryption');
    }

    const fieldsToEncrypt = this.getPIIFields().filter(
      field => preprocessed[field.fieldName as keyof YourTable] !== undefined
    );

    if (fieldsToEncrypt.length === 0) {
      return preprocessed;
    }

    const encrypted = await this.encryptionService.encryptFields(
      preprocessed,
      tenantId,
      fieldsToEncrypt
    );

    const existingRecord = await this.fetchById(id);
    if (!existingRecord) {
      throw new Error(`Record with ID ${id} not found`);
    }

    const existingEncryptedFields = existingRecord.encrypted_fields || [];
    const newEncryptedFields = fieldsToEncrypt.map(f => f.fieldName);
    encrypted.encrypted_fields = [
      ...new Set([...existingEncryptedFields, ...newEncryptedFields])
    ];

    if (newEncryptedFields.length > 0) {
      encrypted.encryption_key_version = 1;
    }

    return encrypted;
  }

  public override async fetch(options: QueryOptions = {}): Promise<{ data: YourTable[]; count: number | null }> {
    const result = await super.fetch(options);
    const tenantId = this.context?.tenantId;

    if (!tenantId) {
      throw new Error('Tenant context required for decryption');
    }

    const decryptedData = await Promise.all(
      result.data.map(async (record) => {
        if (!record.encrypted_fields || record.encrypted_fields.length === 0) {
          return record;
        }

        const fieldsToDecrypt = this.getPIIFields().filter(
          field => record.encrypted_fields?.includes(field.fieldName)
        );

        if (fieldsToDecrypt.length === 0) {
          return record;
        }

        return await this.encryptionService.decryptFields(
          record,
          tenantId,
          fieldsToDecrypt
        );
      })
    );

    return { data: decryptedData, count: result.count };
  }

  public override async fetchById(id: string, options: QueryOptions = {}): Promise<YourTable | null> {
    const record = await super.fetchById(id, options);

    if (!record) {
      return null;
    }

    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context required for decryption');
    }

    if (!record.encrypted_fields || record.encrypted_fields.length === 0) {
      return record;
    }

    const fieldsToDecrypt = this.getPIIFields().filter(
      field => record.encrypted_fields?.includes(field.fieldName)
    );

    if (fieldsToDecrypt.length === 0) {
      return record;
    }

    return await this.encryptionService.decryptFields(
      record,
      tenantId,
      fieldsToDecrypt
    );
  }
}
```

### Step 5: Update DI Container

```typescript
// src/lib/container.ts

import { EncryptedYourTableAdapter } from '@/adapters/encrypted/EncryptedYourTableAdapter';

// Replace standard adapter binding with encrypted version:
container.bind<IYourTableAdapter>(TYPES.IYourTableAdapter)
  .to(EncryptedYourTableAdapter)
  .inRequestScope();
```

## Security Considerations

### Key Management

1. **System Master Key**
   - Store in secure environment variables (never in code)
   - Rotate annually or when compromised
   - Use different keys for dev/staging/production

2. **Tenant Master Keys**
   - Automatically generated per tenant
   - Encrypted at rest with system master key
   - Cached for performance (5-minute TTL)

3. **Field-Specific Keys**
   - Derived on-demand using HKDF
   - Never stored persistently
   - Unique per tenant + field combination

### Searching Encrypted Data

**IMPORTANT**: Encrypted fields cannot be searched directly in the database.

#### Current Limitation

```typescript
// ❌ This won't work - database stores encrypted values
const results = await supabase
  .from('members')
  .select('*')
  .eq('email', 'john@example.com'); // Won't match encrypted value
```

#### Workaround: Fetch-and-Filter

```typescript
// ✅ Fetch all records and filter after decryption
const { data: members } = await memberAdapter.fetch();
const filtered = members.filter(m => m.email === 'john@example.com');
```

#### Future Solutions

1. **Deterministic Encryption** (for exact-match searches)
   - Same plaintext → same ciphertext
   - Trade-off: Reduces security (pattern analysis possible)

2. **Tokenization** (for indexed searches)
   - Create searchable hash/token column
   - Store alongside encrypted data

3. **Blind Index** (cryptographic hash for searches)
   - HMAC-based index for search
   - Doesn't reveal plaintext

### Audit Logging

All encryption operations are logged to `encryption_audit_log`:

```sql
SELECT * FROM encryption_audit_log
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC
LIMIT 10;
```

Columns:
- `operation` - 'encrypt' | 'decrypt'
- `table_name` - Table being encrypted
- `field_name` - Field being encrypted
- `key_version` - Encryption key version used
- `success` - Operation success status
- `error_message` - Error details if failed

## Monitoring & Health Checks

### Encryption Status Dashboard

Query encryption coverage:

```sql
SELECT * FROM encryption_status_summary;
```

Output:
```
table_name          | total_records | encrypted_records | encryption_percentage
--------------------|---------------|-------------------|---------------------
members             | 1250          | 1250              | 100.00
accounts            | 45            | 45                | 100.00
member_households   | 380           | 380               | 100.00
```

### Key Health Check

```sql
-- Verify all tenants have encryption keys
SELECT
  t.id,
  t.name,
  CASE WHEN ek.id IS NULL THEN 'Missing Key' ELSE 'Has Key' END as key_status
FROM tenants t
LEFT JOIN encryption_keys ek ON t.id = ek.tenant_id AND ek.is_active = true;
```

## Troubleshooting

### Error: "Tenant context required for encryption"

**Cause**: Adapter doesn't have tenant context injected.

**Solution**: Ensure `RequestContext` is properly injected:

```typescript
// In API route
import { createContext } from '@/lib/server/context';

const context = await createContext(request);
container.bind<RequestContext>(TYPES.RequestContext).toConstantValue(context);
```

### Error: "Failed to decrypt field"

**Possible Causes**:
1. Wrong encryption key (tenant key changed)
2. Corrupted encrypted data
3. Missing encryption key for tenant

**Solution**:
```sql
-- Check if tenant has active encryption key
SELECT * FROM encryption_keys
WHERE tenant_id = 'your-tenant-id' AND is_active = true;

-- Check encryption audit log for errors
SELECT * FROM encryption_audit_log
WHERE tenant_id = 'your-tenant-id' AND success = false
ORDER BY created_at DESC;
```

### Performance Issues

**Symptom**: Slow queries when fetching encrypted records.

**Solutions**:

1. **Use pagination** to limit decryption operations:
```typescript
const { data: members } = await memberAdapter.fetch({
  pagination: { limit: 50, offset: 0 }
});
```

2. **Batch operations** use parallelization:
```typescript
// Automatically parallelized
const encrypted = await encryptionService.encryptRecords(records, tenantId, config);
```

3. **Key caching** is automatic (5-minute TTL) - increase if needed:
```typescript
// In EncryptionKeyManager.ts
private readonly KEY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
```

## Migration Strategy

### Migrating Existing Plaintext Data

#### Step 1: Create Migration Script

```typescript
// scripts/migrate-plaintext-to-encrypted.ts

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { EncryptionService } from '@/lib/encryption/EncryptionService';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';

async function migrateMembersToEncrypted() {
  const supabase = await getSupabaseServiceClient();
  const encryptionService = container.get<EncryptionService>(TYPES.EncryptionService);

  // Fetch all tenants
  const { data: tenants } = await supabase.from('tenants').select('id');

  for (const tenant of tenants || []) {
    console.log(`Migrating tenant ${tenant.id}...`);

    // Fetch all plaintext members
    const { data: members } = await supabase
      .from('members')
      .select('*')
      .eq('tenant_id', tenant.id)
      .is('encrypted_fields', null);

    if (!members || members.length === 0) {
      console.log(`  No plaintext records found`);
      continue;
    }

    const config = getFieldEncryptionConfig('members');

    for (const member of members) {
      // Encrypt PII fields
      const encrypted = await encryptionService.encryptFields(
        member,
        tenant.id,
        config
      );

      // Update record with encrypted values
      const { error } = await supabase
        .from('members')
        .update({
          ...encrypted,
          encrypted_fields: config.map(f => f.fieldName),
          encryption_key_version: 1
        })
        .eq('id', member.id);

      if (error) {
        console.error(`  Failed to encrypt member ${member.id}:`, error);
      } else {
        console.log(`  ✓ Encrypted member ${member.id}`);
      }
    }
  }

  console.log('Migration complete!');
}

migrateMembersToEncrypted().catch(console.error);
```

#### Step 2: Run Migration

```bash
npx ts-node scripts/migrate-plaintext-to-encrypted.ts
```

#### Step 3: Verify Encryption

```sql
-- Check that all records are encrypted
SELECT COUNT(*) as total,
       COUNT(encrypted_fields) FILTER (WHERE encrypted_fields IS NOT NULL AND encrypted_fields != '[]'::jsonb) as encrypted
FROM members;
```

## Best Practices

1. **Always use encrypted adapters** for tables with PII
2. **Never log decrypted PII** - use masking functions from `encryptionUtils.ts`
3. **Rotate encryption keys annually** or when compromised
4. **Monitor encryption audit logs** for suspicious activity
5. **Test key recovery procedures** before production deployment
6. **Use separate keys** for dev/staging/production environments
7. **Implement data retention policies** - encrypted data should still follow GDPR/CCPA requirements

## References

- Implementation Plan: [PII-ENCRYPTION-IMPLEMENTATION-PLAN.md](./PII-ENCRYPTION-IMPLEMENTATION-PLAN.md)
- Encryption Types: [src/types/encryption.d.ts](../src/types/encryption.d.ts)
- Encryption Service: [src/lib/encryption/EncryptionService.ts](../src/lib/encryption/EncryptionService.ts)
- Key Manager: [src/lib/encryption/EncryptionKeyManager.ts](../src/lib/encryption/EncryptionKeyManager.ts)
- Utility Functions: [src/utils/encryptionUtils.ts](../src/utils/encryptionUtils.ts)
- Example Adapters:
  - [src/adapters/encrypted/EncryptedMemberAdapter.ts](../src/adapters/encrypted/EncryptedMemberAdapter.ts)
  - [src/adapters/encrypted/EncryptedAccountAdapter.ts](../src/adapters/encrypted/EncryptedAccountAdapter.ts)
