import "server-only";
import { injectable, inject } from "inversify";
import { TYPES } from "@/lib/types";
import { decodeTenantToken } from "@/lib/tokens/shortUrlTokens";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getFieldEncryptionConfig } from "@/utils/encryptionUtils";
import type { RbacCoreService } from "./RbacCoreService";
import type { EncryptionService } from "@/lib/encryption/EncryptionService";
import type { EncryptionKeyManager } from "@/lib/encryption/EncryptionKeyManager";

export interface PublicMemberRegistrationData {
  tenantToken: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone: string;
  address?: string;
  password: string;
}

export interface PublicMemberRegistrationResult {
  success: boolean;
  memberId?: string;
  userId?: string;
  message?: string;
  error?: string;
}

/**
 * PublicMemberRegistrationService
 *
 * Handles the public member self-registration flow when someone scans
 * the Member Registration QR code. This service uses direct Supabase
 * service client operations since there is no authenticated user context
 * during public registration.
 *
 * Flow:
 * 1. Decode tenant token to get tenant ID
 * 2. Create Supabase auth user
 * 3. Create tenant_users record (link user to tenant)
 * 4. Get default membership type and status
 * 5. Ensure tenant has encryption key (generate if missing)
 * 6. Create member record with encrypted PII (linked to user)
 * 7. Assign "member" role
 */
@injectable()
export class PublicMemberRegistrationService {
  constructor(
    @inject(TYPES.RbacCoreService)
    private rbacService: RbacCoreService,
    @inject(TYPES.EncryptionService)
    private encryptionService: EncryptionService,
    @inject(TYPES.EncryptionKeyManager)
    private encryptionKeyManager: EncryptionKeyManager
  ) {}

  /**
   * Get PII field configuration for members table
   */
  private getPIIFields() {
    return getFieldEncryptionConfig("members");
  }

  async register(data: PublicMemberRegistrationData): Promise<PublicMemberRegistrationResult> {
    // Step 1: Decode tenant token
    const tenantId = decodeTenantToken(data.tenantToken);
    if (!tenantId) {
      return {
        success: false,
        error: "Invalid registration link. Please scan the QR code again.",
      };
    }

    const supabase = await getSupabaseServiceClient();

    // Step 2: Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm for now, can change to require email verification
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        preferred_name: data.preferredName,
        phone: data.phone,
      },
    });

    if (authError || !authData.user) {
      console.error("[PublicMemberRegistration] Auth error:", authError);

      // Handle common auth errors
      if (authError?.message?.includes("already registered")) {
        return {
          success: false,
          error: "An account with this email already exists. Please sign in instead.",
        };
      }

      return {
        success: false,
        error: authError?.message || "Failed to create account",
      };
    }

    const userId = authData.user.id;

    try {
      // Step 3: Create tenant_users record (link user to tenant)
      const { error: tenantUserError } = await supabase
        .from("tenant_users")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          created_by: userId,
        });

      if (tenantUserError) {
        console.error("[PublicMemberRegistration] Tenant user error:", tenantUserError);
        // Continue anyway - the user is created
      }

      // Step 4: Get default membership type and status for this tenant
      let membershipTypeId: string | undefined;
      let membershipStatusId: string | undefined;

      const { data: defaultMembershipType } = await supabase
        .from("membership_type")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("code", "member")
        .is("deleted_at", null)
        .single();

      const { data: defaultMembershipStatus } = await supabase
        .from("membership_status")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("code", "active")
        .is("deleted_at", null)
        .single();

      if (defaultMembershipType && defaultMembershipStatus) {
        membershipTypeId = defaultMembershipType.id;
        membershipStatusId = defaultMembershipStatus.id;
      } else {
        console.warn("[PublicMemberRegistration] Default membership type/status not found, trying fallback");
        // Try to use any available type/status as fallback
        const { data: fallbackType } = await supabase
          .from("membership_type")
          .select("id")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .limit(1)
          .single();

        const { data: fallbackStatus } = await supabase
          .from("membership_status")
          .select("id")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .limit(1)
          .single();

        if (!fallbackType || !fallbackStatus) {
          return {
            success: false,
            error: "Unable to complete registration. Please contact the church administrator.",
          };
        }

        membershipTypeId = fallbackType.id;
        membershipStatusId = fallbackStatus.id;
        console.log("[PublicMemberRegistration] Using fallback membership type/status");
      }

      // Step 5: Ensure tenant has encryption key (generate if missing)
      try {
        await this.encryptionKeyManager.getTenantKey(tenantId);
      } catch (keyError) {
        // Key doesn't exist, generate it
        console.log(`[PublicMemberRegistration] Generating encryption key for tenant ${tenantId}`);
        try {
          await this.encryptionKeyManager.generateTenantKey(tenantId);
        } catch (genError) {
          // If generation fails because key already exists (race condition), that's OK
          if (!(genError instanceof Error && genError.message.includes("already has"))) {
            console.error("[PublicMemberRegistration] Failed to generate encryption key:", genError);
            throw genError;
          }
        }
      }

      // Step 6: Create member record with encrypted PII fields
      const timestamp = new Date().toISOString();

      // Prepare member data for encryption
      const memberPayload: Record<string, unknown> = {
        tenant_id: tenantId,
        first_name: data.firstName,
        last_name: data.lastName,
        preferred_name: data.preferredName || null,
        email: data.email.toLowerCase(),
        contact_number: data.phone,
        address_street: data.address || null,
        membership_type_id: membershipTypeId,
        membership_status_id: membershipStatusId,
        membership_date: new Date().toISOString().split("T")[0],
        user_id: userId, // Link user to member directly
        created_by: userId,
        updated_by: userId,
        created_at: timestamp,
        updated_at: timestamp,
      };

      // Encrypt PII fields
      const piiFields = this.getPIIFields();
      const encrypted = await this.encryptionService.encryptFields(
        memberPayload,
        tenantId,
        piiFields
      );

      // Track which fields are encrypted
      encrypted.encrypted_fields = piiFields.map(f => f.fieldName);
      encrypted.encryption_key_version = 1;

      console.log(
        `[PublicMemberRegistration] Encrypted ${(encrypted.encrypted_fields as string[]).length} PII fields for new member`
      );

      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .insert(encrypted)
        .select("id")
        .single();

      if (memberError || !memberData) {
        console.error("[PublicMemberRegistration] Member creation error:", memberError);
        return {
          success: false,
          error: "Failed to create member record. Please try again.",
        };
      }

      const memberId = memberData.id;

      // Step 7: Assign "member" role
      try {
        // Find the member role by metadata_key
        const roles = await this.rbacService.getRoles(tenantId, true);
        const memberRole = roles.find((role) => role.metadata_key === "role_member");

        if (memberRole) {
          await this.rbacService.assignRole(
            {
              user_id: userId,
              role_id: memberRole.id,
            },
            tenantId,
            userId // assigned by self
          );
        } else {
          console.warn(
            `[PublicMemberRegistration] Member role not found for tenant ${tenantId}`
          );
        }
      } catch (roleError) {
        console.error("[PublicMemberRegistration] Role assignment error:", roleError);
        // Continue - role can be assigned later by admin
      }

      return {
        success: true,
        memberId,
        userId,
        message: "Welcome! Your member account has been created successfully.",
      };
    } catch (error) {
      console.error("[PublicMemberRegistration] Error:", error);

      // Attempt to clean up auth user if member creation failed
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (cleanupError) {
        console.error("[PublicMemberRegistration] Cleanup error:", cleanupError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      };
    }
  }
}
