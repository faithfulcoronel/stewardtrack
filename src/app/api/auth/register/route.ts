import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { LicensingService } from '@/services/LicensingService';
import { PermissionDeploymentService } from '@/services/PermissionDeploymentService';
import { seedDefaultRBAC, assignTenantAdminRole } from '@/lib/tenant/seedDefaultRBAC';

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
 * 3. Create user profile
 * 4. Provision license features based on selected offering
 * 5. Seed default RBAC roles for the tenant
 * 6. Assign tenant admin role to the user
 * 7. Deploy permissions from licensed features to tenant RBAC
 * 8. Log in the user automatically
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

    // ===== STEP 4: Create user profile =====
    const { error: profileError } = await serviceSupabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        tenant_id: tenantId,
      });

    if (profileError) {
      console.error('Failed to create profile:', profileError);
      // Non-fatal error, continue
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

    // ===== STEP 7: Seed default RBAC roles =====
    try {
      await seedDefaultRBAC(tenantId, offering.tier);
    } catch (error) {
      console.error('Failed to seed default RBAC:', error);
      // Non-fatal error, continue
    }

    // ===== STEP 8: Assign tenant admin role =====
    try {
      await assignTenantAdminRole(userId, tenantId);
    } catch (error) {
      console.error('Failed to assign tenant admin role:', error);
      // Non-fatal error, continue
    }

    // ===== STEP 9: Deploy permissions from licensed features =====
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
        surfaceBindings: deploymentSummary.totalSurfaceBindings,
      });

      if (deploymentSummary.errors.length > 0) {
        console.warn('Permission deployment errors:', deploymentSummary.errors);
      }
    } catch (error) {
      console.error('Failed to deploy permissions:', error);
      // Non-fatal error - tenant still created successfully
    }

    // ===== STEP 10: Return success =====
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
    if (userId && tenantId) {
      try {
        // Delete tenant (will cascade to related records)
        const serviceSupabase = await getSupabaseServiceClient();
        await serviceSupabase.from('tenants').delete().eq('id', tenantId);

        // Delete auth user (Supabase admin API would be needed for this)
        // For now, we'll leave the auth user as is
        console.warn(`Cleanup: Deleted tenant ${tenantId} but auth user ${userId} remains`);
      } catch (cleanupError) {
        console.error('Failed to cleanup after error:', cleanupError);
      }
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
