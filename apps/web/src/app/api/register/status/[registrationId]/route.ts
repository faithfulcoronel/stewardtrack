import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

type RouteParams = { params: Promise<{ registrationId: string }> };

/**
 * GET /api/register/status/[registrationId]
 * Get registration status and details (for payment success/failure pages)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { registrationId } = await params;

    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: 'Registration ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServiceClient();

    // Get registration with related data
    const { data: registration, error: regError } = await supabase
      .from('schedule_registrations')
      .select(`
        id,
        tenant_id,
        status,
        confirmation_code,
        guest_name,
        guest_email,
        guest_phone,
        party_size,
        payment_status,
        payment_amount,
        payment_currency,
        payment_url,
        paid_at,
        occurrence:schedule_occurrences!schedule_registrations_occurrence_id_fkey (
          id,
          occurrence_date,
          start_at,
          end_at,
          schedule:ministry_schedules!schedule_occurrences_schedule_id_fkey (
            id,
            name,
            location,
            timezone,
            ministry:ministries!ministry_schedules_ministry_id_fkey (
              id,
              name
            )
          )
        )
      `)
      .eq('id', registrationId)
      .single();

    if (regError || !registration) {
      console.error('Error fetching registration:', regError);
      return NextResponse.json(
        { success: false, error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Get tenant name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', registration.tenant_id)
      .single();

    // Type narrowing for nested objects
    const occurrence = registration.occurrence as {
      id: string;
      occurrence_date: string;
      start_at: string;
      end_at: string | null;
      schedule: {
        id: string;
        name: string;
        location: string | null;
        timezone: string;
        ministry: { id: string; name: string } | null;
      } | null;
    } | null;

    const schedule = occurrence?.schedule;
    const ministry = schedule?.ministry;

    // Format date and time
    const formatDate = (dateString: string, timezone?: string): string => {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: timezone,
      });
    };

    const formatTime = (timeString: string | null, timezone?: string): string => {
      if (!timeString) return '';
      const date = timeString.includes('T')
        ? new Date(timeString)
        : new Date(`1970-01-01T${timeString}`);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone,
      });
    };

    const timezone = schedule?.timezone || 'Asia/Manila';

    return NextResponse.json({
      success: true,
      data: {
        id: registration.id,
        status: registration.status,
        confirmationCode: registration.confirmation_code,
        guestName: registration.guest_name,
        guestEmail: registration.guest_email,
        guestPhone: registration.guest_phone,
        partySize: registration.party_size,
        // Schedule info
        scheduleName: schedule?.name || 'Unknown Event',
        scheduleLocation: schedule?.location,
        ministryName: ministry?.name || 'Unknown Ministry',
        tenantName: tenant?.name || 'Unknown Organization',
        // Occurrence info
        occurrenceDate: occurrence ? formatDate(occurrence.occurrence_date, timezone) : '',
        occurrenceTime: occurrence ? formatTime(occurrence.start_at, timezone) : '',
        // Payment info
        paymentStatus: registration.payment_status,
        paymentAmount: registration.payment_amount,
        paymentCurrency: registration.payment_currency,
        paymentUrl: registration.payment_url,
        paidAt: registration.paid_at,
      },
    });
  } catch (error) {
    console.error('Error fetching registration status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch registration status' },
      { status: 500 }
    );
  }
}
