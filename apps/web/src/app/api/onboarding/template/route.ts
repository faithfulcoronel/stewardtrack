/**
 * GET /api/onboarding/template
 *
 * Returns the Excel template for bulk import during onboarding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authUtils } from '@/utils/authUtils';
import { generateTemplateBuffer } from '@/lib/excel';

export async function GET(_request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate template
    const buffer = generateTemplateBuffer();
    const filename = `stewardtrack-import-template-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Return as downloadable file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}
