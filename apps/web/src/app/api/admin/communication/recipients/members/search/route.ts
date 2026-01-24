/**
 * API Route: GET /api/admin/communication/recipients/members/search
 *
 * Search members by name or email.
 */

import { NextResponse } from 'next/server';
import { getCurrentTenantId } from '@/lib/server/context';
import { createSupabaseServerClient as createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const tenantId = await getCurrentTenantId();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? '';

    if (!query.trim()) {
      return NextResponse.json({ members: [] });
    }

    const supabase = await createClient();
    const searchTerm = `%${query.trim()}%`;

    // Search members by name or email using Supabase
    const { data: members, error } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, mobile_phone, home_phone')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order('last_name', { ascending: true })
      .limit(20);

    if (error) {
      throw error;
    }

    // Transform to recipient format
    const recipients = (members ?? []).map((member) => ({
      id: member.id,
      source: 'member' as const,
      name: `${member.first_name} ${member.last_name}`.trim(),
      email: member.email ?? undefined,
      phone: member.mobile_phone ?? member.home_phone ?? undefined,
    }));

    return NextResponse.json({ members: recipients });
  } catch (error) {
    console.error('Member search failed:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
