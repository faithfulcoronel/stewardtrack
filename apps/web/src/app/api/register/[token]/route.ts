import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import { decodeRegistrationToken, isRegistrationTokenValid } from '@/lib/tokens/registrationToken';
import { verifyTurnstileToken } from '@/lib/auth/turnstile';

type RouteParams = { params: Promise<{ token: string }> };

/**
 * GET /api/register/[token]
 * Validate a registration token and return schedule info
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    // Decode and validate token
    if (!isRegistrationTokenValid(token)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired registration link' },
        { status: 400 }
      );
    }

    const tokenData = decodeRegistrationToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: 'Invalid registration link' },
        { status: 400 }
      );
    }

    const { tenantId, scheduleId, expiresAt } = tokenData;

    // Fetch schedule and tenant info
    const supabase = await getSupabaseServiceClient();

    // Get schedule with ministry info
    const { data: schedule, error: scheduleError } = await supabase
      .from('ministry_schedules')
      .select(`
        id,
        name,
        description,
        location,
        capacity,
        registration_required,
        cover_photo_url,
        registration_form_schema,
        timezone,
        ministry:ministries!ministry_schedules_ministry_id_fkey (
          id,
          name
        )
      `)
      .eq('id', scheduleId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (scheduleError || !schedule) {
      console.error('Error fetching schedule:', scheduleError);
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    if (!schedule.registration_required) {
      return NextResponse.json(
        { success: false, error: 'Registration is not enabled for this event' },
        { status: 400 }
      );
    }

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get upcoming occurrences for this schedule
    const { data: occurrences } = await supabase
      .from('schedule_occurrences')
      .select('id, occurrence_date, start_at, end_at, status')
      .eq('schedule_id', scheduleId)
      .in('status', ['scheduled', 'in_progress'])
      .gte('occurrence_date', new Date().toISOString().split('T')[0])
      .order('occurrence_date', { ascending: true })
      .limit(5);

    // Count current registrations (for capacity check)
    let registrationCount = 0;
    let waitlistCount = 0;

    if (occurrences && occurrences.length > 0) {
      const upcomingOccurrenceIds = occurrences.map((o) => o.id);

      const { data: regCounts } = await supabase
        .from('event_registrations')
        .select('status')
        .in('occurrence_id', upcomingOccurrenceIds);

      if (regCounts) {
        registrationCount = regCounts.filter((r) => r.status === 'confirmed').length;
        waitlistCount = regCounts.filter((r) => r.status === 'waitlisted').length;
      }
    }

    const ministry = schedule.ministry as { id: string; name: string } | null;

    // Transform occurrences to match frontend interface
    const transformedOccurrences = (occurrences || []).map((occ: {
      id: string;
      occurrence_date: string;
      start_at: string;
      end_at: string;
      status: string;
    }) => ({
      id: occ.id,
      event_date: occ.occurrence_date,
      start_time: occ.start_at,
      end_time: occ.end_at,
      status: occ.status,
    }));

    return NextResponse.json({
      success: true,
      data: {
        scheduleId: schedule.id,
        title: schedule.name,
        description: schedule.description,
        location: schedule.location,
        capacity: schedule.capacity,
        coverPhotoUrl: schedule.cover_photo_url,
        ministryName: ministry?.name || 'Unknown Ministry',
        tenantName: tenant.name,
        formSchema: schedule.registration_form_schema,
        timezone: schedule.timezone || 'Asia/Manila',
        registrationCount,
        waitlistCount,
        expiresAt: new Date(expiresAt).toISOString(),
        upcomingOccurrences: transformedOccurrences,
      },
    });
  } catch (error) {
    console.error('Error validating registration token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate registration link' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/register/[token]
 * Register for an event using a registration token
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    // Decode and validate token
    if (!isRegistrationTokenValid(token)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired registration link' },
        { status: 400 }
      );
    }

    const tokenData = decodeRegistrationToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: 'Invalid registration link' },
        { status: 400 }
      );
    }

    const { tenantId, scheduleId } = tokenData;

    // Parse request body
    const body = await request.json();
    const {
      guest_name,
      guest_email,
      guest_phone,
      party_size = 1,
      special_requests,
      form_responses,
      occurrence_id, // Optional: specific occurrence
      turnstile_token, // CAPTCHA token
      terms_accepted, // Terms & Privacy acceptance
    } = body;

    // Verify CAPTCHA token
    if (!turnstile_token) {
      return NextResponse.json(
        { success: false, error: 'Please complete the security verification' },
        { status: 400 }
      );
    }

    // Get client IP for additional verification
    const forwardedFor = request.headers.get('x-forwarded-for');
    const remoteIp = forwardedFor?.split(',')[0]?.trim();

    const turnstileResult = await verifyTurnstileToken(turnstile_token, remoteIp);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { success: false, error: turnstileResult.error || 'Security verification failed' },
        { status: 400 }
      );
    }

    // Validate terms acceptance
    if (!terms_accepted) {
      return NextResponse.json(
        { success: false, error: 'You must accept the Terms of Service and Privacy Policy' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!guest_name?.trim() || !guest_email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServiceClient();

    // Get schedule info
    const { data: schedule, error: scheduleError } = await supabase
      .from('ministry_schedules')
      .select('id, name, registration_required, capacity')
      .eq('id', scheduleId)
      .eq('tenant_id', tenantId)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    if (!schedule.registration_required) {
      return NextResponse.json(
        { success: false, error: 'Registration is not enabled for this event' },
        { status: 400 }
      );
    }

    // Determine which occurrence to register for
    let targetOccurrenceId = occurrence_id;

    if (!targetOccurrenceId) {
      // Get the next upcoming occurrence
      const { data: nextOccurrence } = await supabase
        .from('schedule_occurrences')
        .select('id')
        .eq('schedule_id', scheduleId)
        .in('status', ['scheduled', 'in_progress'])
        .gte('occurrence_date', new Date().toISOString().split('T')[0])
        .order('occurrence_date', { ascending: true })
        .limit(1)
        .single();

      if (!nextOccurrence) {
        return NextResponse.json(
          { success: false, error: 'No upcoming events available for registration' },
          { status: 400 }
        );
      }

      targetOccurrenceId = nextOccurrence.id;
    }

    // Check for duplicate registration by email for this occurrence
    const { data: existingReg } = await supabase
      .from('schedule_registrations')
      .select('id')
      .eq('occurrence_id', targetOccurrenceId)
      .eq('tenant_id', tenantId)
      .eq('guest_email', guest_email.trim().toLowerCase())
      .maybeSingle();

    if (existingReg) {
      return NextResponse.json(
        { success: false, error: 'You have already registered for this event' },
        { status: 400 }
      );
    }

    // Check capacity
    let status = 'registered';
    let waitlistPosition = null;

    if (schedule.capacity) {
      const { count: registeredCount } = await supabase
        .from('schedule_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('occurrence_id', targetOccurrenceId)
        .eq('tenant_id', tenantId)
        .eq('status', 'registered');

      if ((registeredCount || 0) >= schedule.capacity) {
        // Add to waitlist
        status = 'waitlisted';

        const { count: waitlistCount } = await supabase
          .from('schedule_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('occurrence_id', targetOccurrenceId)
          .eq('tenant_id', tenantId)
          .eq('status', 'waitlisted');

        waitlistPosition = (waitlistCount || 0) + 1;
      }
    }

    // Generate confirmation code
    const confirmationCode = generateConfirmationCode();

    // Create registration using service role client (bypasses RLS)
    const { data: registration, error: insertError } = await supabase
      .from('schedule_registrations')
      .insert({
        tenant_id: tenantId,
        occurrence_id: targetOccurrenceId,
        guest_name: guest_name.trim(),
        guest_email: guest_email.trim().toLowerCase(),
        guest_phone: guest_phone?.trim() || null,
        party_size,
        special_requests: special_requests?.trim() || null,
        form_responses: form_responses || {},
        status,
        waitlist_position: waitlistPosition,
        confirmation_code: confirmationCode,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating registration:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create registration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: registration.id,
        status: registration.status,
        waitlist_position: waitlistPosition,
        confirmation_code: confirmationCode,
      },
    });
  } catch (error) {
    console.error('Error processing registration:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process registration' },
      { status: 500 }
    );
  }
}

/**
 * Generate a short confirmation code
 */
function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
