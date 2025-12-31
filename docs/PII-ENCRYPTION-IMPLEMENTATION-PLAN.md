# PII Encryption Implementation Plan
## StewardTrack - Field-Level Encryption for Personally Identifiable Information

**Date:** 2025-11-30
**Status:** Design Complete - Awaiting Implementation Approval
**Compliance Goals:** Zero-knowledge architecture where StewardTrack developers cannot access tenant PII data

---

## Executive Summary

This plan implements **client-controlled field-level encryption** for all Personally Identifiable Information (PII) in StewardTrack, ensuring that even database administrators and StewardTrack developers cannot access sensitive tenant data without explicit authorization. The encryption will be transparently handled in the adapter layer using the **Decorator Pattern** combined with **Strategy Pattern** for flexible encryption algorithms.

### Key Benefits
- **Zero-knowledge architecture**: Developers cannot read PII even with database access
- **Tenant-controlled encryption**: Each tenant has unique encryption keys
- **Transparent implementation**: Business logic remains unchanged
- **Audit trail**: All encryption/decryption events are logged
- **Compliance ready**: GDPR, HIPAA, SOC 2 compliant
- **Performance optimized**: Field-level encryption, not full-row encryption
- **Key rotation support**: Built-in key versioning and rotation

---

## Architecture Overview

### Design Patterns Used

#### 1. **Decorator Pattern** (Primary)
Wraps existing adapters with encryption capabilities without modifying their core logic.

#### 2. **Strategy Pattern** (Encryption Algorithms)
Allows swapping encryption algorithms (AES-256-GCM, ChaCha20-Poly1305, future quantum-resistant)

#### 3. **Template Method Pattern** (Adapter Lifecycle)
Leverages existing `onBeforeCreate`, `onBeforeUpdate`, `onAfterCreate`, `onAfterUpdate` hooks

#### 4. **Factory Pattern** (Key Management)
Centralized key derivation and tenant-specific key generation

---

## PII Data Classification

### High-Sensitivity PII (Requires Encryption)

#### Member Table (`members`)
- `first_name` ✓
- `last_name` ✓
- `middle_name` ✓
- `email` ✓
- `contact_number` ✓
- `address` ✓
- `birthday` ✓
- `anniversary` ✓
- `emergency_contact_name` ✓
- `emergency_contact_phone` ✓
- `emergency_contact_relationship` ✓
- `physician_name` ✓
- `pastoral_notes` ✓ (sensitive pastoral care notes)
- `prayer_requests` ✓ (can contain sensitive personal information)

#### Member Household Table (`member_households`)
- `name` ✓
- `address_street` ✓
- `address_city` ✓
- `address_state` ✓
- `address_postal_code` ✓
- `member_names` ✓

#### User Table (`users` / Supabase Auth)
- `email` ✓
- `phone` ✓

#### Tenant Table (`tenants`)
- `address` ✓
- `contact_number` ✓
- `email` ✓

#### Member Care Plan Table (`member_care_plans`)
- `details` ✓ (pastoral care details)
- `pastoral_notes` ✓

#### Financial Data (PII when linked to members)
- `financial_transactions.account_holder` (when contains member_id) ✓
- `member_giving_profiles.*` (all giving history) ✓

### Medium-Sensitivity (Consider Encryption)
- `occupation`
- `marital_status`
- `gender`
- `profile_picture_url` (if contains identifiable images)

### Non-PII (No Encryption Required)
- `membership_type_id`
- `membership_status_id`
- `attendance_rate`
- `tags`
- `spiritual_gifts`
- All metadata, IDs, timestamps, status codes

---

## Technical Implementation

### 1. Encryption Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BaseAdapter (Existing)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Lifecycle Hooks:                                      │   │
│  │ - onBeforeCreate()                                    │   │
│  │ - onAfterCreate()                                     │   │
│  │ - onBeforeUpdate()                                    │   │
│  │ - onAfterUpdate()                                     │   │
│  │ - fetch() / fetchById()                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ extends
                           │
┌─────────────────────────────────────────────────────────────┐
│              EncryptedBaseAdapter (Decorator)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ New Methods:                                          │   │
│  │ - encryptFields(data: T): Promise<T>                  │   │
│  │ - decryptFields(data: T): Promise<T>                  │   │
│  │ - getPIIFieldMap(): FieldEncryptionConfig[]          │   │
│  │                                                        │   │
│  │ Overridden Hooks:                                     │   │
│  │ - onBeforeCreate() → encrypt → super.onBeforeCreate()│   │
│  │ - onBeforeUpdate() → encrypt → super.onBeforeUpdate()│   │
│  │ - onAfterCreate() → decrypt → super.onAfterCreate()  │   │
│  │ - fetch() → decrypt all records                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ uses
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  EncryptionService (Injectable)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ - encrypt(plaintext: string, key: Buffer): string     │   │
│  │ - decrypt(ciphertext: string, key: Buffer): string    │   │
│  │ - getTenantKey(tenantId: string): Promise<Buffer>     │   │
│  │ - rotateKey(tenantId: string): Promise<void>          │   │
│  │ - deriveFieldKey(masterKey, fieldName): Buffer        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ uses
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              EncryptionStrategy (Interface)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Implementations:                                      │   │
│  │ - AES256GCMStrategy (default)                         │   │
│  │ - ChaCha20Poly1305Strategy (alternative)              │   │
│  │ - QuantumResistantStrategy (future)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2. File Structure

```
src/
├── lib/
│   ├── encryption/
│   │   ├── EncryptionService.ts              # Main encryption service
│   │   ├── EncryptionKeyManager.ts           # Key derivation & rotation
│   │   ├── strategies/
│   │   │   ├── IEncryptionStrategy.ts        # Strategy interface
│   │   │   ├── AES256GCMStrategy.ts          # Default algorithm
│   │   │   ├── ChaCha20Poly1305Strategy.ts   # Alternative algorithm
│   │   │   └── index.ts
│   │   ├── types.ts                          # Encryption types
│   │   └── index.ts
│   └── types.ts                              # Add TYPES.EncryptionService
│
├── adapters/
│   ├── encrypted/
│   │   ├── EncryptedBaseAdapter.ts           # Base encrypted adapter
│   │   ├── EncryptedMemberAdapter.ts         # Member-specific encryption
│   │   ├── EncryptedTenantAdapter.ts         # Tenant-specific encryption
│   │   ├── EncryptedUserAdapter.ts           # User-specific encryption
│   │   └── index.ts
│   └── [existing adapters remain unchanged]
│
├── utils/
│   └── encryptionUtils.ts                    # Helper utilities
│
└── types/
    └── encryption.d.ts                       # Type definitions

supabase/
└── migrations/
    ├── YYYYMMDDHHMMSS_add_encryption_keys_table.sql
    ├── YYYYMMDDHHMMSS_add_encryption_metadata.sql
    └── YYYYMMDDHHMMSS_update_pii_columns_for_encryption.sql
```

### 3. Database Schema Changes

#### New Tables

##### `encryption_keys` (Tenant Master Keys)
```sql
CREATE TABLE encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_version integer NOT NULL DEFAULT 1,
  encrypted_master_key text NOT NULL,  -- Encrypted with system key
  key_derivation_salt bytea NOT NULL,
  algorithm text NOT NULL DEFAULT 'AES-256-GCM',
  created_at timestamptz DEFAULT now(),
  rotated_at timestamptz,
  is_active boolean DEFAULT true,

  UNIQUE(tenant_id, key_version),
  CHECK (key_version > 0)
);

CREATE INDEX idx_encryption_keys_tenant_active
  ON encryption_keys(tenant_id, is_active)
  WHERE is_active = true;
```

##### `field_encryption_metadata` (Track encrypted fields)
```sql
CREATE TABLE field_encryption_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  field_name text NOT NULL,
  encryption_algorithm text NOT NULL,
  key_version integer NOT NULL,
  is_encrypted boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),

  UNIQUE(table_name, field_name)
);
```

##### `encryption_audit_log` (Audit trail)
```sql
CREATE TABLE encryption_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  operation text NOT NULL, -- 'encrypt', 'decrypt', 'key_rotation'
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  field_names text[] NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

CREATE INDEX idx_encryption_audit_tenant_date
  ON encryption_audit_log(tenant_id, performed_at DESC);
```

#### Modified Columns

For each PII field, we'll store encrypted data as text with format:
```
{version}.{iv}.{authTag}.{ciphertext}
```

Example migration for `members` table:
```sql
-- Increase column sizes to accommodate encrypted data
ALTER TABLE members
  ALTER COLUMN first_name TYPE text,
  ALTER COLUMN last_name TYPE text,
  ALTER COLUMN email TYPE text,
  ALTER COLUMN contact_number TYPE text,
  ALTER COLUMN address TYPE text;

-- Add encryption metadata columns
ALTER TABLE members
  ADD COLUMN encrypted_fields jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN encryption_key_version integer DEFAULT 1;
```

### 4. Encryption Implementation Details

#### Encryption Algorithm: AES-256-GCM (Default)

**Why AES-256-GCM?**
- **Authenticated encryption**: Provides both confidentiality and integrity
- **NIST approved**: FIPS 140-2 compliant
- **Performance**: Hardware acceleration on modern CPUs (AES-NI)
- **Security**: 256-bit keys, 96-bit IV, 128-bit authentication tag

**Encrypted Format:**
```
{keyVersion}.{iv}.{authTag}.{ciphertext}
```

Example:
```
1.a3f2c4d5e6f7a8b9.1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d.8f3a2c1b9e7d6f4a...
```

#### Key Derivation Strategy

**Master Key Hierarchy:**
```
System Master Key (env: ENCRYPTION_MASTER_KEY)
    ↓ (HKDF-SHA256)
Tenant Master Key (stored encrypted in DB)
    ↓ (HKDF-SHA256 + field name)
Field-Specific Key (derived per field, never stored)
```

**Benefits:**
- Field keys are derived, not stored
- Key rotation only requires re-encrypting master keys
- Each field uses a different derived key for defense in depth

#### Code Example: EncryptionService

```typescript
// src/lib/encryption/EncryptionService.ts
import 'server-only';
import { injectable, inject } from 'inversify';
import crypto from 'crypto';
import { TYPES } from '@/lib/types';
import type { IEncryptionStrategy } from './strategies/IEncryptionStrategy';

export interface EncryptedValue {
  keyVersion: number;
  iv: string;
  authTag: string;
  ciphertext: string;
}

@injectable()
export class EncryptionService {
  constructor(
    @inject(TYPES.EncryptionStrategy)
    private strategy: IEncryptionStrategy,

    @inject(TYPES.EncryptionKeyManager)
    private keyManager: IEncryptionKeyManager
  ) {}

  /**
   * Encrypt a plaintext value for a specific tenant and field
   */
  async encrypt(
    plaintext: string | null | undefined,
    tenantId: string,
    fieldName: string
  ): Promise<string | null> {
    if (!plaintext) return null;

    const { masterKey, keyVersion } = await this.keyManager.getTenantKey(tenantId);
    const fieldKey = this.keyManager.deriveFieldKey(masterKey, fieldName);

    const encrypted = await this.strategy.encrypt(plaintext, fieldKey);

    // Format: {version}.{iv}.{authTag}.{ciphertext}
    return `${keyVersion}.${encrypted.iv}.${encrypted.authTag}.${encrypted.ciphertext}`;
  }

  /**
   * Decrypt an encrypted value
   */
  async decrypt(
    encryptedValue: string | null | undefined,
    tenantId: string,
    fieldName: string
  ): Promise<string | null> {
    if (!encryptedValue) return null;

    const [keyVersion, iv, authTag, ciphertext] = encryptedValue.split('.');

    const { masterKey } = await this.keyManager.getTenantKey(
      tenantId,
      parseInt(keyVersion)
    );
    const fieldKey = this.keyManager.deriveFieldKey(masterKey, fieldName);

    return await this.strategy.decrypt(
      { iv, authTag, ciphertext },
      fieldKey
    );
  }

  /**
   * Encrypt multiple fields in a record
   */
  async encryptFields<T extends Record<string, any>>(
    data: T,
    tenantId: string,
    fieldConfig: FieldEncryptionConfig[]
  ): Promise<T> {
    const encrypted = { ...data };

    for (const config of fieldConfig) {
      if (data[config.fieldName] !== undefined) {
        encrypted[config.fieldName] = await this.encrypt(
          data[config.fieldName],
          tenantId,
          config.fieldName
        );
      }
    }

    return encrypted;
  }

  /**
   * Decrypt multiple fields in a record
   */
  async decryptFields<T extends Record<string, any>>(
    data: T,
    tenantId: string,
    fieldConfig: FieldEncryptionConfig[]
  ): Promise<T> {
    const decrypted = { ...data };

    for (const config of fieldConfig) {
      if (data[config.fieldName] !== undefined) {
        decrypted[config.fieldName] = await this.decrypt(
          data[config.fieldName],
          tenantId,
          config.fieldName
        );
      }
    }

    return decrypted;
  }
}
```

#### Code Example: AES256GCMStrategy

```typescript
// src/lib/encryption/strategies/AES256GCMStrategy.ts
import crypto from 'crypto';
import type { IEncryptionStrategy, EncryptedData } from './IEncryptionStrategy';

export class AES256GCMStrategy implements IEncryptionStrategy {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12; // 96 bits for GCM
  private readonly authTagLength = 16; // 128 bits

  async encrypt(plaintext: string, key: Buffer): Promise<EncryptedData> {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      ciphertext
    };
  }

  async decrypt(encrypted: EncryptedData, key: Buffer): Promise<string> {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }
}
```

#### Code Example: EncryptedMemberAdapter

```typescript
// src/adapters/encrypted/EncryptedMemberAdapter.ts
import { injectable, inject } from 'inversify';
import { MemberAdapter } from '@/adapters/member.adapter';
import { TYPES } from '@/lib/types';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import type { Member } from '@/models/member.model';

@injectable()
export class EncryptedMemberAdapter extends MemberAdapter {
  constructor(
    @inject(TYPES.EncryptionService)
    private encryptionService: EncryptionService,
    ...parentDeps
  ) {
    super(...parentDeps);
  }

  /**
   * Define which fields require encryption
   */
  private getPIIFields(): FieldEncryptionConfig[] {
    return [
      { fieldName: 'first_name', required: true },
      { fieldName: 'last_name', required: true },
      { fieldName: 'middle_name', required: false },
      { fieldName: 'email', required: false },
      { fieldName: 'contact_number', required: true },
      { fieldName: 'address', required: true },
      { fieldName: 'birthday', required: false },
      { fieldName: 'anniversary', required: false },
      { fieldName: 'emergency_contact_name', required: false },
      { fieldName: 'emergency_contact_phone', required: false },
      { fieldName: 'emergency_contact_relationship', required: false },
      { fieldName: 'physician_name', required: false },
      { fieldName: 'pastoral_notes', required: false },
      { fieldName: 'prayer_requests', required: false, isArray: true }
    ];
  }

  /**
   * Encrypt before creating record
   */
  protected override async onBeforeCreate(data: Partial<Member>): Promise<Partial<Member>> {
    const tenantId = this.context?.tenantId;
    if (!tenantId) throw new Error('Tenant context required for encryption');

    // Call parent preprocessing
    const preprocessed = await super.onBeforeCreate(data);

    // Encrypt PII fields
    const encrypted = await this.encryptionService.encryptFields(
      preprocessed,
      tenantId,
      this.getPIIFields()
    );

    // Track which fields are encrypted
    encrypted.encrypted_fields = this.getPIIFields().map(f => f.fieldName);

    return encrypted;
  }

  /**
   * Encrypt before updating record
   */
  protected override async onBeforeUpdate(
    id: string,
    data: Partial<Member>
  ): Promise<Partial<Member>> {
    const tenantId = this.context?.tenantId;
    if (!tenantId) throw new Error('Tenant context required for encryption');

    const preprocessed = await super.onBeforeUpdate(id, data);

    const encrypted = await this.encryptionService.encryptFields(
      preprocessed,
      tenantId,
      this.getPIIFields()
    );

    return encrypted;
  }

  /**
   * Decrypt after fetching records
   */
  public override async fetch(
    options: QueryOptions = {}
  ): Promise<{ data: Member[]; count: number | null }> {
    const result = await super.fetch(options);
    const tenantId = this.context?.tenantId;

    if (!tenantId || !result.data.length) return result;

    // Decrypt all records
    const decrypted = await Promise.all(
      result.data.map(record =>
        this.encryptionService.decryptFields(
          record,
          tenantId,
          this.getPIIFields()
        )
      )
    );

    return { data: decrypted, count: result.count };
  }

  /**
   * Decrypt after fetching single record
   */
  public override async fetchById(
    id: string,
    options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<Member | null> {
    const record = await super.fetchById(id, options);
    const tenantId = this.context?.tenantId;

    if (!record || !tenantId) return record;

    return await this.encryptionService.decryptFields(
      record,
      tenantId,
      this.getPIIFields()
    );
  }
}
```

### 5. Key Management Implementation

#### Initial Key Generation (During Tenant Registration)

```typescript
// src/lib/encryption/EncryptionKeyManager.ts
import crypto from 'crypto';
import { injectable } from 'inversify';

@injectable()
export class EncryptionKeyManager {
  private systemMasterKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_MASTER_KEY;
    if (!key) throw new Error('ENCRYPTION_MASTER_KEY not configured');

    this.systemMasterKey = Buffer.from(key, 'base64');
  }

  /**
   * Generate a new tenant master key during registration
   */
  async generateTenantKey(tenantId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    // Generate random 256-bit master key
    const masterKey = crypto.randomBytes(32);
    const salt = crypto.randomBytes(32);

    // Encrypt master key with system key
    const encryptedKey = this.encryptMasterKey(masterKey);

    // Store in database
    await supabase.from('encryption_keys').insert({
      tenant_id: tenantId,
      key_version: 1,
      encrypted_master_key: encryptedKey,
      key_derivation_salt: salt,
      algorithm: 'AES-256-GCM',
      is_active: true
    });
  }

  /**
   * Retrieve tenant's active master key
   */
  async getTenantKey(
    tenantId: string,
    version?: number
  ): Promise<{ masterKey: Buffer; keyVersion: number }> {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('encryption_keys')
      .select('*')
      .eq('tenant_id', tenantId);

    if (version) {
      query = query.eq('key_version', version);
    } else {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.single();
    if (error || !data) throw new Error('Tenant encryption key not found');

    const masterKey = this.decryptMasterKey(data.encrypted_master_key);

    return { masterKey, keyVersion: data.key_version };
  }

  /**
   * Derive field-specific key from master key
   */
  deriveFieldKey(masterKey: Buffer, fieldName: string): Buffer {
    const info = Buffer.from(`field:${fieldName}`, 'utf8');

    return crypto.hkdfSync(
      'sha256',
      masterKey,
      Buffer.alloc(0), // No salt needed for HKDF
      info,
      32 // 256 bits
    );
  }

  /**
   * Rotate tenant's encryption key
   */
  async rotateKey(tenantId: string): Promise<void> {
    // 1. Get current key version
    const { keyVersion: currentVersion } = await this.getTenantKey(tenantId);

    // 2. Generate new master key
    const newMasterKey = crypto.randomBytes(32);
    const newSalt = crypto.randomBytes(32);
    const encryptedKey = this.encryptMasterKey(newMasterKey);

    const supabase = await createSupabaseServerClient();

    // 3. Mark old key as inactive
    await supabase
      .from('encryption_keys')
      .update({
        is_active: false,
        rotated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('key_version', currentVersion);

    // 4. Insert new key
    await supabase.from('encryption_keys').insert({
      tenant_id: tenantId,
      key_version: currentVersion + 1,
      encrypted_master_key: encryptedKey,
      key_derivation_salt: newSalt,
      algorithm: 'AES-256-GCM',
      is_active: true
    });

    // 5. Background job to re-encrypt all data with new key
    // (Implemented as async job queue)
  }

  private encryptMasterKey(masterKey: Buffer): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.systemMasterKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(masterKey),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  private decryptMasterKey(encryptedKey: string): Buffer {
    const buffer = Buffer.from(encryptedKey, 'base64');

    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const ciphertext = buffer.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.systemMasterKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
  }
}
```

### 6. Dependency Injection Configuration

```typescript
// src/lib/container.ts
import { Container } from 'inversify';
import { TYPES } from './types';

// Encryption services
import { EncryptionService } from '@/lib/encryption/EncryptionService';
import { EncryptionKeyManager } from '@/lib/encryption/EncryptionKeyManager';
import { AES256GCMStrategy } from '@/lib/encryption/strategies/AES256GCMStrategy';

// Encrypted adapters
import { EncryptedMemberAdapter } from '@/adapters/encrypted/EncryptedMemberAdapter';
import { EncryptedTenantAdapter } from '@/adapters/encrypted/EncryptedTenantAdapter';

const container = new Container();

// Bind encryption services
container.bind(TYPES.EncryptionService)
  .to(EncryptionService)
  .inRequestScope();

container.bind(TYPES.EncryptionKeyManager)
  .to(EncryptionKeyManager)
  .inSingletonScope();

container.bind(TYPES.EncryptionStrategy)
  .to(AES256GCMStrategy)
  .inSingletonScope();

// Bind encrypted adapters (replace existing adapters)
container.bind(TYPES.MemberAdapter)
  .to(EncryptedMemberAdapter)
  .inRequestScope();

container.bind(TYPES.TenantAdapter)
  .to(EncryptedTenantAdapter)
  .inRequestScope();

export { container };
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Set up encryption infrastructure

- [ ] Create encryption service architecture
- [ ] Implement `EncryptionService`
- [ ] Implement `EncryptionKeyManager`
- [ ] Implement `AES256GCMStrategy`
- [ ] Add database migrations for encryption tables
- [ ] Update DI container configuration
- [ ] Write unit tests for encryption/decryption

**Deliverables:**
- Working encryption service with test coverage
- Database schema updated
- Documentation for encryption architecture

### Phase 2: Member Data Encryption (Week 3)
**Goal:** Encrypt most sensitive PII (member records)

- [ ] Create `EncryptedMemberAdapter`
- [ ] Update `MemberAdapter` to use encryption
- [ ] Migrate existing member data (background job)
- [ ] Add audit logging for member encryption events
- [ ] Integration tests for member CRUD with encryption

**Deliverables:**
- All member PII encrypted at rest
- Migration tool for existing data
- Audit trail for all encryption operations

### Phase 3: Extended PII Encryption (Week 4)
**Goal:** Encrypt all remaining PII entities

- [ ] Create `EncryptedTenantAdapter`
- [ ] Create `EncryptedUserAdapter`
- [ ] Create `EncryptedMemberHouseholdAdapter`
- [ ] Create `EncryptedMemberCarePlanAdapter`
- [ ] Migrate all existing PII data
- [ ] Performance testing and optimization

**Deliverables:**
- All PII fields encrypted across the system
- Performance benchmarks
- Migration completion report

### Phase 4: Key Rotation & Management (Week 5)
**Goal:** Implement key lifecycle management

- [ ] Implement key rotation mechanism
- [ ] Create admin UI for key management
- [ ] Build background job for re-encryption during rotation
- [ ] Add key rotation audit trail
- [ ] Create key backup/recovery procedures
- [ ] Documentation for key management

**Deliverables:**
- Key rotation functionality
- Admin interface for key management
- Disaster recovery procedures

### Phase 5: Search & Indexing Strategy (Week 6)
**Goal:** Handle encrypted data in search/filtering

- [ ] Implement searchable encryption (deterministic encryption for indexed fields)
- [ ] Create search service with decryption support
- [ ] Update metadata-driven search to handle encrypted fields
- [ ] Add encrypted field indexing strategy
- [ ] Performance optimization for search

**Deliverables:**
- Working search over encrypted data
- Performance-optimized queries
- Updated metadata system

### Phase 6: Testing & Compliance (Week 7-8)
**Goal:** Comprehensive testing and compliance verification

- [ ] Security audit of encryption implementation
- [ ] Penetration testing
- [ ] Compliance verification (GDPR, HIPAA, SOC 2)
- [ ] Load testing with encrypted data
- [ ] Documentation for compliance officers
- [ ] Create compliance reports

**Deliverables:**
- Security audit report
- Compliance certification documentation
- Performance benchmarks under load
- Complete implementation documentation

---

## Security Considerations

### 1. Key Storage Security

**System Master Key:**
- Stored in environment variable `ENCRYPTION_MASTER_KEY`
- Never committed to version control
- Rotated annually
- Backed up in secure offline storage (hardware security module recommended)

**Tenant Master Keys:**
- Encrypted with system master key before storage
- Unique per tenant
- Versioned for rotation support
- Never logged or exposed in error messages

### 2. Encryption Best Practices

**Initialization Vectors (IV):**
- Randomly generated for each encryption operation
- 96 bits for AES-GCM (NIST recommended)
- Never reused with the same key

**Authentication Tags:**
- 128-bit authentication tag for integrity
- Verified before decryption
- Prevents tampering and forgery attacks

**Key Derivation:**
- HKDF-SHA256 for deriving field keys
- Field-specific keys prevent cross-field attacks
- No key material stored, only derived

### 3. Access Control

**Encryption Service:**
- Only accessible server-side (never client-side)
- Requires tenant context for all operations
- Audit logged for all encryption/decryption

**Database Access:**
- RLS policies prevent cross-tenant key access
- Service role key required for key management operations
- Encryption keys table has strict access policies

### 4. Threat Mitigation

| Threat | Mitigation |
|--------|-----------|
| **Database breach** | All PII encrypted; attacker gets ciphertext only |
| **Insider threat (DBA)** | No access to system master key |
| **Developer access** | Cannot decrypt without tenant-specific keys |
| **Key compromise** | Key rotation invalidates old keys |
| **Replay attacks** | Authentication tags prevent tampering |
| **Timing attacks** | Constant-time comparison for auth tags |
| **Side-channel attacks** | Hardware AES-NI acceleration |

---

## Performance Impact Analysis

### Encryption Overhead

**Expected Performance Impact:**
- **Encryption time:** ~0.5-1ms per field (AES-256-GCM with AES-NI)
- **Decryption time:** ~0.5-1ms per field
- **Key derivation:** ~0.1ms per field (cached in request scope)
- **Storage overhead:** ~40-50% increase per encrypted field

**Example: Member Record**
- Fields to encrypt: 14 fields
- Total encryption time: ~14ms
- Total decryption time: ~14ms
- Storage increase: ~2KB → ~3KB (50% overhead)

### Mitigation Strategies

1. **Request-scoped caching:**
   - Cache derived field keys for request duration
   - Reduces key derivation overhead

2. **Batch operations:**
   - Encrypt/decrypt multiple records in parallel
   - Use Promise.all() for concurrent operations

3. **Selective encryption:**
   - Only encrypt fields marked as PII
   - Non-sensitive fields remain unencrypted for performance

4. **Database indexing:**
   - Use deterministic encryption for searchable fields
   - Create functional indexes on decrypted values (Supabase limitation workaround)

5. **Lazy decryption:**
   - Decrypt only when data is accessed
   - List views can show masked values (e.g., "John D****")

---

## Compliance & Regulatory Alignment

### GDPR (General Data Protection Regulation)

**Article 32 - Security of Processing:**
✅ Encryption of personal data at rest
✅ Pseudonymization through field-level encryption
✅ Ability to restore access via key management
✅ Regular security testing procedures

**Article 17 - Right to Erasure:**
✅ Cryptographic erasure (destroy encryption keys)
✅ Permanent data deletion capability

**Article 25 - Data Protection by Design:**
✅ Encryption as default for all PII
✅ Minimal access to unencrypted data

### HIPAA (Health Insurance Portability and Accountability Act)

**§164.312(a)(2)(iv) - Encryption Standard:**
✅ AES-256 encryption (NIST approved)
✅ Access controls via key management
✅ Audit trails for all PHI access

**§164.308(a)(1)(ii)(D) - Information System Activity Review:**
✅ Encryption audit logs
✅ Decryption event tracking

### SOC 2 (System and Organization Controls)

**CC6.1 - Logical and Physical Access Controls:**
✅ Encryption prevents unauthorized access
✅ Key management restricts decryption capability

**CC6.7 - Transmission of Data:**
✅ End-to-end encryption for PII
✅ Secure key derivation

---

## Migration Strategy for Existing Data

### Approach: Zero-Downtime Rolling Migration

**Phase 1: Dual-Write Mode**
1. Deploy encryption adapters
2. New writes are encrypted
3. Old reads still work (plaintext fallback)

**Phase 2: Background Migration**
```typescript
// Migration script
async function migrateMemberEncryption() {
  const batchSize = 100;
  let offset = 0;

  while (true) {
    const { data: members } = await supabase
      .from('members')
      .select('*')
      .is('encrypted_fields', null)
      .range(offset, offset + batchSize - 1);

    if (!members.length) break;

    for (const member of members) {
      const encrypted = await encryptionService.encryptFields(
        member,
        member.tenant_id,
        piiFields
      );

      await supabase
        .from('members')
        .update({
          ...encrypted,
          encrypted_fields: piiFields.map(f => f.fieldName)
        })
        .eq('id', member.id);
    }

    offset += batchSize;
    console.log(`Migrated ${offset} members`);
  }
}
```

**Phase 3: Read-Only Encryption Mode**
1. All data encrypted
2. Plaintext reads disabled
3. Encryption required for all operations

**Rollback Strategy:**
- Keep plaintext values during migration (new column `_plaintext_backup`)
- After 30 days of successful operation, drop backup columns
- Emergency rollback: restore from backups

---

## Monitoring & Alerting

### Metrics to Track

1. **Encryption Performance:**
   - Average encryption time per field
   - Average decryption time per field
   - Key derivation cache hit rate

2. **Security Events:**
   - Failed decryption attempts
   - Key rotation events
   - Unauthorized access attempts

3. **Data Integrity:**
   - Authentication tag verification failures
   - Key version mismatches
   - Encryption errors

### Alerting Rules

```yaml
alerts:
  - name: HighDecryptionFailureRate
    condition: decryption_errors > 5 per minute
    severity: critical
    action: notify_security_team

  - name: KeyAccessWithoutTenantContext
    condition: key_access.tenant_id == null
    severity: critical
    action: block_and_alert

  - name: SlowEncryptionPerformance
    condition: avg(encryption_time) > 10ms
    severity: warning
    action: notify_devops
```

---

## Testing Strategy

### Unit Tests
- Encryption/decryption roundtrip tests
- Key derivation consistency tests
- Authentication tag verification tests
- Error handling tests

### Integration Tests
- Adapter encryption lifecycle tests
- Multi-field encryption tests
- Key rotation with data re-encryption
- Cross-tenant isolation tests

### Security Tests
- Penetration testing
- SQL injection with encrypted fields
- Timing attack resistance
- Key exposure prevention

### Performance Tests
- Benchmark encryption overhead
- Load testing with encrypted data
- Concurrent encryption/decryption
- Cache effectiveness tests

---

## Cost-Benefit Analysis

### Implementation Costs
- **Development:** 8 weeks @ 1 FTE = $40,000-$60,000
- **Testing & Security Audit:** $10,000-$20,000
- **Infrastructure:** Minimal (Node.js crypto built-in)

**Total:** ~$50,000-$80,000

### Benefits
- **Competitive Advantage:** Enterprise-grade security
- **Compliance:** Meets GDPR, HIPAA, SOC 2 requirements
- **Customer Trust:** Zero-knowledge architecture attracts security-conscious clients
- **Risk Mitigation:** Prevents data breach liability
- **Premium Pricing:** Justify 20-30% higher pricing for enterprise tier

**ROI:** Break-even after 5-10 enterprise clients

---

## Open Questions & Decisions Needed

1. **Search Strategy:**
   - Use deterministic encryption for searchable fields?
   - Implement separate search index service?
   - Accept performance trade-off for full encryption?

2. **Key Rotation Frequency:**
   - Annual rotation (recommended)?
   - Quarterly rotation (higher security)?
   - On-demand rotation only?

3. **Backup Encryption:**
   - Encrypt database backups with same keys?
   - Separate backup encryption keys?
   - Offline key escrow for disaster recovery?

4. **Multi-region Support:**
   - Regional key storage?
   - Key replication strategy?
   - GDPR data residency requirements?

5. **Field-Level vs Row-Level Encryption:**
   - Current design: field-level
   - Alternative: full-row encryption (simpler, less flexible)
   - Hybrid: encrypted JSONB column?

---

## Next Steps

1. **Review & Approval:**
   - Security team review
   - Architecture review
   - Executive approval

2. **Proof of Concept:**
   - Implement Phase 1 (foundation)
   - Benchmark performance
   - Validate approach

3. **Full Implementation:**
   - Follow 8-week implementation plan
   - Weekly progress reviews
   - Continuous security testing

4. **Documentation:**
   - Technical documentation
   - Compliance documentation
   - User-facing security features

---

## Appendix

### A. Encryption Format Specification

```
Encrypted Field Format:
{keyVersion}.{iv}.{authTag}.{ciphertext}

Components:
- keyVersion: integer (1-999999)
- iv: base64-encoded initialization vector (96 bits)
- authTag: base64-encoded authentication tag (128 bits)
- ciphertext: base64-encoded encrypted data

Example:
1.a3f2c4d5e6f7a8b9.1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d.8f3a2c1b9e7d6f4a...
```

### B. Environment Variables

```bash
# Required for encryption
ENCRYPTION_MASTER_KEY=base64-encoded-256-bit-key

# Optional
ENCRYPTION_ALGORITHM=AES-256-GCM
ENCRYPTION_KEY_ROTATION_DAYS=365
ENCRYPTION_AUDIT_LOG_RETENTION_DAYS=2555
```

### C. Migration Checklist

- [ ] Deploy encryption infrastructure
- [ ] Generate tenant encryption keys
- [ ] Run data migration scripts
- [ ] Verify data integrity post-migration
- [ ] Enable encryption for all new writes
- [ ] Monitor encryption performance
- [ ] Drop plaintext backup columns (after 30 days)
- [ ] Update documentation
- [ ] Train support staff
- [ ] Notify customers of security enhancement

---

**Document Version:** 1.0
**Last Updated:** 2025-11-30
**Author:** Claude Code (AI Assistant)
**Status:** Awaiting Review & Approval
