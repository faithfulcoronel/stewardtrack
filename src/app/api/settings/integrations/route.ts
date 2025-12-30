import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { SettingService } from '@/services/SettingService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * GET /api/settings/integrations
 * Get integration settings for the current tenant
 */
export async function GET() {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const settingService = container.get<SettingService>(TYPES.SettingService);
    const integrationSettings = await settingService.getIntegrationSettings();

    return NextResponse.json(integrationSettings);
  } catch (error) {
    console.error('[GET /api/settings/integrations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration settings' },
      { status: 500 }
    );
  }
}
