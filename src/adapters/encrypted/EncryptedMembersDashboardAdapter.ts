import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { MembersDashboardAdapter } from '@/adapters/membersDashboard.adapter';
import { TYPES } from '@/lib/types';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';

/**
 * Encrypted Members Dashboard Adapter
 *
 * Wraps MembersDashboardAdapter to automatically decrypt PII fields after fetching.
 * This adapter is used for member lists and directory views.
 *
 * Encrypted Fields (12 total):
 * - first_name, last_name
 * - email, contact_number, address
 * - emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
 * - physician_name, pastoral_notes
 * - prayer_requests (array)
 */
@injectable()
export class EncryptedMembersDashboardAdapter extends MembersDashboardAdapter {
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
  private async decryptMember<T extends Record<string, any>>(
    member: T,
    tenantId: string
  ): Promise<T> {
    try {
      console.log('[EncryptedMembersDashboardAdapter] decryptMember called:', {
        memberId: (member as any).id,
        tenantId,
        hasFirstName: !!(member as any).first_name,
        firstNameSample: (member as any).first_name?.substring(0, 20),
        hasEncryptedFields: !!(member as any).encrypted_fields,
        encryptedFields: (member as any).encrypted_fields
      });

      // Check if record has encrypted fields marker
      const encrypted_fields = (member as any).encrypted_fields;

      // Check if first_name looks encrypted (format: version.iv.tag.ciphertext)
      const firstName = (member as any).first_name;
      const looksEncrypted = firstName && typeof firstName === 'string' &&
                            firstName.match(/^\d+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);

      console.log('[EncryptedMembersDashboardAdapter] Encryption detection:', {
        hasMarker: !!(encrypted_fields && encrypted_fields.length > 0),
        looksEncrypted,
        firstNameFormat: firstName?.substring(0, 30)
      });

      if (!looksEncrypted && (!encrypted_fields || encrypted_fields.length === 0)) {
        // Plaintext record
        console.log('[EncryptedMembersDashboardAdapter] Plaintext record - returning as-is');
        return member;
      }

      // Data is encrypted (either has marker OR looks encrypted)
      // Try to decrypt all PII fields
      console.log('[EncryptedMembersDashboardAdapter] Attempting decryption for all PII fields');

      // Decrypt PII fields
      const decrypted = await this.encryptionService.decryptFields(
        member,
        tenantId,
        this.getPIIFields()
      );

      console.log('[EncryptedMembersDashboardAdapter] Decryption complete:', {
        memberId: (member as any).id,
        decryptedFirstName: (decrypted as any).first_name?.substring(0, 20),
        decryptedLastName: (decrypted as any).last_name?.substring(0, 20)
      });

      return decrypted;
    } catch (error) {
      console.error('[EncryptedMembersDashboardAdapter] Decryption failed:', error);
      // Return original record rather than failing
      return member;
    }
  }

  /**
   * Fetch member directory with decryption
   */
  public override async fetchMemberDirectory(
    search: string | undefined,
    limit: number
  ): Promise<any[]> {
    console.log('[EncryptedMembersDashboardAdapter] fetchMemberDirectory called:', { search, limit });

    // Fetch encrypted records
    const members = await super.fetchMemberDirectory(search, limit);

    console.log('[EncryptedMembersDashboardAdapter] Fetched directory from DB:', {
      count: members.length,
      firstMemberSample: members[0] ? {
        id: members[0].id,
        firstNameSample: members[0].first_name?.substring(0, 20),
        hasEncryptedFields: !!(members[0] as any).encrypted_fields,
        hasTenantId: !!(members[0] as any).tenant_id
      } : null
    });

    if (members.length === 0) {
      return members;
    }

    // Get tenant ID from first member record (all should have same tenant_id)
    const tenantId = (members[0] as any).tenant_id;
    if (!tenantId) {
      console.warn('[EncryptedMembersDashboardAdapter] No tenant_id found in member records');
      return members;
    }

    console.log('[EncryptedMembersDashboardAdapter] Starting decryption for', members.length, 'members with tenantId:', tenantId);

    // Decrypt all members in parallel
    const decrypted = await Promise.all(
      members.map((member: any) => this.decryptMember(member, tenantId))
    );

    console.log('[EncryptedMembersDashboardAdapter] Successfully decrypted', decrypted.length, 'directory records');

    return decrypted;
  }

  /**
   * Fetch birthdays this month with decryption
   */
  public override async fetchBirthdaysThisMonth(): Promise<any[]> {
    // Fetch encrypted records
    const members = await super.fetchBirthdaysThisMonth();

    if (members.length === 0) {
      return members;
    }

    // Get tenant ID from first member record
    const tenantId = (members[0] as any).tenant_id;
    if (!tenantId) {
      console.warn('[EncryptedMembersDashboardAdapter] No tenant_id found in birthday records');
      return members;
    }

    // Decrypt all members in parallel
    const decrypted = await Promise.all(
      members.map((member: any) => this.decryptMember(member, tenantId))
    );

    return decrypted;
  }

  /**
   * Fetch birthdays by month with decryption
   */
  public override async fetchBirthdaysByMonth(month: number): Promise<any[]> {
    // Fetch encrypted records
    const members = await super.fetchBirthdaysByMonth(month);

    if (members.length === 0) {
      return members;
    }

    // Get tenant ID from first member record
    const tenantId = (members[0] as any).tenant_id;
    if (!tenantId) {
      console.warn('[EncryptedMembersDashboardAdapter] No tenant_id found in birthday records');
      return members;
    }

    // Decrypt all members in parallel
    const decrypted = await Promise.all(
      members.map((member: any) => this.decryptMember(member, tenantId))
    );

    return decrypted;
  }
}
