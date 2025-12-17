import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { MemberProfileAdapter } from '@/adapters/memberProfile.adapter';
import type { MemberRow } from '@/adapters/memberProfile.adapter';
import { TYPES } from '@/lib/types';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';

/**
 * Encrypted Member Profile Adapter
 *
 * Wraps MemberProfileAdapter to automatically decrypt PII fields after fetching.
 * This adapter is used for member profile views and detail pages.
 *
 * Encrypted Fields (12 total):
 * - first_name, last_name, middle_name (if present)
 * - email, contact_number, address
 * - emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
 * - physician_name, pastoral_notes
 * - prayer_requests (array)
 */
@injectable()
export class EncryptedMemberProfileAdapter extends MemberProfileAdapter {
  constructor(
    @inject(TYPES.EncryptionService)
    private encryptionService: EncryptionService
  ) {
    super();
  }

  /**
   * Get PII field configuration for members table
   */
  private getPIIFields() {
    return getFieldEncryptionConfig('members');
  }

  /**
   * Decrypt a single member record
   */
  private async decryptMember(member: MemberRow, tenantId: string): Promise<MemberRow> {
    try {
      console.log('[EncryptedMemberProfileAdapter] decryptMember called for member:', {
        memberId: member.id,
        tenantId,
        hasFirstName: !!member.first_name,
        firstNameSample: member.first_name?.substring(0, 20),
        hasEncryptedFields: !!(member as any).encrypted_fields,
        encryptedFields: (member as any).encrypted_fields
      });

      // Check if record has encrypted fields marker
      const encrypted_fields = (member as any).encrypted_fields;

      // Check if first_name looks encrypted (format: version.iv.tag.ciphertext)
      const firstName = member.first_name;
      const looksEncrypted = firstName && typeof firstName === 'string' &&
                            firstName.match(/^\d+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);

      console.log('[EncryptedMemberProfileAdapter] Encryption detection:', {
        hasMarker: !!(encrypted_fields && encrypted_fields.length > 0),
        looksEncrypted,
        firstNameFormat: firstName?.substring(0, 30)
      });

      if (!looksEncrypted && (!encrypted_fields || encrypted_fields.length === 0)) {
        // Plaintext record
        console.log('[EncryptedMemberProfileAdapter] Plaintext record - returning as-is');
        return member;
      }

      // Data is encrypted (either has marker OR looks encrypted)
      // Try to decrypt all PII fields
      console.log('[EncryptedMemberProfileAdapter] Attempting decryption for all PII fields');

      // Decrypt PII fields
      const decrypted = await this.encryptionService.decryptFields(
        member,
        tenantId,
        this.getPIIFields()
      );

      console.log('[EncryptedMemberProfileAdapter] Decryption complete:', {
        memberId: member.id,
        decryptedFirstName: decrypted.first_name?.substring(0, 20),
        decryptedLastName: decrypted.last_name?.substring(0, 20)
      });

      return decrypted;
    } catch (error) {
      console.error('[EncryptedMemberProfileAdapter] Decryption failed:', error);
      // Return original record rather than failing
      return member;
    }
  }

  /**
   * Fetch members with decryption
   */
  public override async fetchMembers(params: {
    tenantId: string | null;
    memberId?: string | null;
    limit: number;
  }): Promise<MemberRow[]> {
    console.log('[EncryptedMemberProfileAdapter] fetchMembers called with params:', params);

    // Fetch encrypted records
    const members = await super.fetchMembers(params);

    console.log('[EncryptedMemberProfileAdapter] Fetched members from DB:', {
      count: members.length,
      firstMemberSample: members[0] ? {
        id: members[0].id,
        firstNameSample: members[0].first_name?.substring(0, 20),
        hasEncryptedFields: !!(members[0] as any).encrypted_fields
      } : null
    });

    // Get tenant context - try params first, then fall back to record's tenant_id
    let tenantId = params.tenantId;
    if (!tenantId && members.length > 0) {
      // Members array should have tenant_id from database
      tenantId = (members[0] as any).tenant_id;
      console.log('[EncryptedMemberProfileAdapter] Using tenant_id from record:', tenantId);
    }

    if (!tenantId || members.length === 0) {
      console.log('[EncryptedMemberProfileAdapter] No tenantId or no members - returning as-is');
      return members;
    }

    console.log('[EncryptedMemberProfileAdapter] Starting decryption for', members.length, 'members');

    // Decrypt all members in parallel
    const decrypted = await Promise.all(
      members.map((member: MemberRow) => this.decryptMember(member, tenantId!))
    );

    console.log('[EncryptedMemberProfileAdapter] Successfully decrypted', decrypted.length, 'member records');

    return decrypted;
  }
}
