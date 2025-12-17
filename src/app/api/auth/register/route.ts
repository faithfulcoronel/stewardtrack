import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { PermissionDeploymentService } from '@/services/PermissionDeploymentService';
import { seedDefaultRBAC, assignTenantAdminRole } from '@/lib/tenant/seedDefaultRBAC';
import { EncryptionKeyManager } from '@/lib/encryption/EncryptionKeyManager';
import type { IAuthRepository } from '@/repositories/auth.repository';

interface RegistrationRequest {
  email: string;
  password: string;
  confirmPassword: string;
  churchName: string;
  firstName: string;
  lastName: string;
  offeringId: string;
}

const PUBLIC_PRODUCT_OFFERINGS_RPC = 'get_public_product_offerings';

interface PublicProductOffering {
  id: string;
  tier: string;
  offering_type: string;
  code: string;
  name: string;
  description?: string | null;
  base_price?: number | null;
  billing_cycle?: string | null;
  metadata?: Record<string, unknown> | null;
}

async function getPublicOfferingForSignup(
  supabase: SupabaseClient,
  offeringId: string
): Promise<PublicProductOffering | null> {
  const { data, error } = await supabase.rpc(PUBLIC_PRODUCT_OFFERINGS_RPC, {
    include_features: false,
    include_bundles: false,
    target_tier: null,
    target_id: offeringId,
  });

  if (error) {
    throw new Error(`Failed to load product offering: ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const [offering] = data as PublicProductOffering[];

  return offering ?? null;
}

/**
 * POST /api/auth/register
 *
 * Handles new user and tenant registration with the following steps:
 * 1. Create Supabase auth user
 * 2. Create tenant record
 * 3. Generate encryption key for tenant
 * 4. Create tenant_users junction record
 * 5. Provision license features based on selected offering
 * 6. Seed default RBAC roles for the tenant
 * 7. Assign tenant admin role to the user
 * 8. Deploy permissions from licensed features to tenant RBAC (automatic via PermissionDeploymentService)
 * 9. Return success (user is automatically logged in via Supabase session)
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null;
  let tenantId: string | null = null;

  try {
    const body: RegistrationRequest = await request.json();
    const { email, password, confirmPassword, churchName, firstName, lastName, offeringId } = body;

    // Validate required fields
    if (!email || !password || !churchName || !firstName || !lastName || !offeringId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    // Validate password match
    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Passwords do not match',
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const serviceSupabase = await getSupabaseServiceClient();

    // ===== STEP 1: Create auth user =====
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (authError) {
      throw new Error(`Authentication error: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    userId = authData.user.id;

    // ===== STEP 2: Get offering details to determine tier =====
    const offering = await getPublicOfferingForSignup(supabase, offeringId);

    if (!offering) {
      throw new Error('Selected product offering not found');
    }

    // ===== STEP 3: Create tenant =====
    // Generate subdomain from church name
    const subdomain = churchName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    // Check if subdomain is unique
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    let finalSubdomain = subdomain;
    if (existingTenant) {
      // Append random suffix if subdomain exists
      finalSubdomain = `${subdomain}-${Math.floor(Math.random() * 10000)}`;
    }

    const { data: tenant, error: tenantError } = await serviceSupabase
      .from('tenants')
      .insert({
        name: churchName,
        subdomain: finalSubdomain,
        subscription_tier: offering.tier,
        subscription_status: 'active',
        subscription_end_date: offering.offering_type === 'trial'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
          : null,
        subscription_offering_id: offeringId, // Link to product offering
        status: 'active',
        created_by: userId,
      })
      .select('id')
      .single();

    if (tenantError) {
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    if (!tenant) {
      throw new Error('Tenant creation failed');
    }

    tenantId = tenant.id;

    // ===== STEP 4: Generate encryption key for tenant =====
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required for encryption key generation');
      }

      const encryptionKeyManager = container.get<EncryptionKeyManager>(TYPES.EncryptionKeyManager);
      await encryptionKeyManager.generateTenantKey(tenantId);
      console.log(`Generated encryption key for tenant ${tenantId}`);
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      // Critical error - tenant won't be able to encrypt PII
      throw new Error('Failed to initialize tenant encryption');
    }

    // ===== STEP 5: Create tenant_users junction =====
    const { error: tenantUserError } = await serviceSupabase
      .from('tenant_users')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        role: 'admin', // This is the simple role field
        admin_role: 'tenant_admin', // Set admin_role for first user
        created_by: userId,
      });

    if (tenantUserError) {
      console.error('Failed to create tenant_users record:', tenantUserError);
      // Non-fatal error, continue
    }

    // ===== STEP 6: Provision license features =====
    try {
      const licensingService = container.get<LicensingService>(TYPES.LicensingService);
      await licensingService.provisionTenantLicense(tenantId, offeringId);
    } catch (error) {
      console.error('Failed to provision license features:', error);
      // Non-fatal error, continue with registration
    }

    // ===== STEP 6: Seed default RBAC roles =====
    try {
      await seedDefaultRBAC(tenantId, offering.tier);
    } catch (error) {
      console.error('Failed to seed default RBAC:', error);
      // Non-fatal error, continue
    }

    // ===== STEP 7: Assign tenant admin role =====
    try {
      await assignTenantAdminRole(userId, tenantId);
    } catch (error) {
      console.error('Failed to assign tenant admin role:', error);
      // Non-fatal error, continue
    }

    // ===== STEP 8: Deploy permissions from licensed features =====
    try {
      const permissionDeploymentService = container.get<PermissionDeploymentService>(
        TYPES.PermissionDeploymentService
      );

      const deploymentSummary = await permissionDeploymentService.deployAllFeaturePermissions(tenantId);

      console.log(`Permission deployment for tenant ${tenantId}:`, {
        totalFeatures: deploymentSummary.totalFeatures,
        successfulDeployments: deploymentSummary.successfulDeployments,
        permissionsDeployed: deploymentSummary.totalPermissionsDeployed,
        roleAssignments: deploymentSummary.totalRoleAssignments,
      });

      if (deploymentSummary.errors.length > 0) {
        console.warn('Permission deployment errors:', deploymentSummary.errors);
      }
    } catch (error) {
      console.error('Failed to deploy permissions:', error);
      // Non-fatal error - tenant still created successfully
    }

    // ===== STEP 9: Return success =====
    return NextResponse.json({
      success: true,
      data: {
        userId,
        tenantId,
        subdomain: finalSubdomain,
        message: 'Registration successful',
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);

    // Attempt cleanup if we created records
    // Note: We use service client directly here because:
    // 1. No tenant context exists yet (registration failed mid-process)
    // 2. This is an admin operation (cleanup/rollback)
    const cleanupResults: string[] = [];

    try {
      const serviceSupabase = await getSupabaseServiceClient();

      // Clean up tenant and related records
      // Using service client directly because tenant context doesn't exist yet
      if (tenantId) {
        const { error: tenantDeleteError } = await serviceSupabase
          .from('tenants')
          .delete()
          .eq('id', tenantId);

        if (tenantDeleteError) {
          cleanupResults.push(`Failed to delete tenant: ${tenantDeleteError.message}`);
        } else {
          cleanupResults.push(`Deleted tenant ${tenantId}`);
        }
      }

      // Clean up auth user using AuthRepository (follows repository pattern)
      if (userId) {
        const authRepository = container.get<IAuthRepository>(TYPES.IAuthRepository);
        const { error: authDeleteError } = await authRepository.deleteUser(userId);

        if (authDeleteError) {
          cleanupResults.push(`Failed to delete auth user: ${authDeleteError.message}`);
        } else {
          cleanupResults.push(`Deleted auth user ${userId}`);
        }
      }

      // Log cleanup results
      if (cleanupResults.length > 0) {
        console.log(`Cleanup completed: ${cleanupResults.join(', ')}`);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup after error:', cleanupError);
      console.error('Partial cleanup results:', cleanupResults);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      },
      { status: 500 }
    );
  }
}
