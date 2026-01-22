import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId } from '@/lib/server/context';
import type { IDonationRepository } from '@/repositories/donation.repository';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import type { Donation, DonationStatus } from '@/models/donation.model';

/**
 * GET /api/donations/export
 * Exports donations to Excel file.
 *
 * Query parameters:
 * - status: Filter by donation status (pending, paid, failed, refunded)
 * - startDate: Filter by paid_at >= startDate (ISO date string)
 * - endDate: Filter by paid_at <= endDate (ISO date string)
 * - format: Export format (xlsx or csv, defaults to xlsx)
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context available' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as DonationStatus | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'xlsx';

    // Get repositories/services from DI container
    const donationRepo = container.get<IDonationRepository>(TYPES.IDonationRepository);
    const encryptionService = container.get<EncryptionService>(TYPES.EncryptionService);

    // Fetch all donations for tenant
    const donationsResult = await donationRepo.findAll();
    let donations = (donationsResult?.data || []) as Donation[];

    // Apply filters
    if (statusFilter) {
      donations = donations.filter(d => d.status === statusFilter);
    }

    if (startDate) {
      const start = new Date(startDate);
      donations = donations.filter(d => {
        const paidDate = d.paid_at ? new Date(d.paid_at) : null;
        return paidDate && paidDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include full end day
      donations = donations.filter(d => {
        const paidDate = d.paid_at ? new Date(d.paid_at) : null;
        return paidDate && paidDate <= end;
      });
    }

    // Sort by date descending
    donations.sort((a, b) => {
      const dateA = a.paid_at || a.created_at || '';
      const dateB = b.paid_at || b.created_at || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Transform donations to export rows with decrypted data
    const exportRows = await Promise.all(
      donations.map(async (donation) => {
        // Decrypt donor information
        let donorName = 'Anonymous';
        let donorEmail = '';
        let donorPhone = '';

        if (!donation.anonymous) {
          try {
            if (donation.donor_name_encrypted) {
              donorName = await encryptionService.decrypt(
                donation.donor_name_encrypted,
                tenantId,
                'donor_name'
              ) ?? 'Donor';
            }
            if (donation.donor_email_encrypted) {
              donorEmail = await encryptionService.decrypt(
                donation.donor_email_encrypted,
                tenantId,
                'donor_email'
              ) ?? '';
            }
            if (donation.donor_phone_encrypted) {
              donorPhone = await encryptionService.decrypt(
                donation.donor_phone_encrypted,
                tenantId,
                'donor_phone'
              ) ?? '';
            }
          } catch {
            // If decryption fails, use fallback values
            donorName = donation.anonymous ? 'Anonymous' : 'Donor';
          }
        }

        // Get category and fund names from related data
        const categoryName = (donation as any).categories?.name || (donation as any).category?.name || '';
        const fundName = (donation as any).funds?.name || (donation as any).fund?.name || '';
        const campaignName = (donation as any).campaigns?.name || (donation as any).campaign?.name || '';

        // Format payment method
        const paymentMethod = formatPaymentMethod(
          donation.payment_method_type,
          donation.payment_channel,
          donation.payment_method_masked
        );

        return {
          'Donation ID': donation.id,
          'Date': donation.paid_at
            ? new Date(donation.paid_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '',
          'Status': capitalizeFirst(donation.status),
          'Donor Name': donorName,
          'Donor Email': donorEmail,
          'Donor Phone': donorPhone,
          'Amount': donation.amount,
          'Currency': donation.currency || 'PHP',
          'Xendit Fee': donation.xendit_fee || 0,
          'Platform Fee': donation.platform_fee || 0,
          'Total Charged': donation.total_charged || donation.amount,
          'Category': categoryName,
          'Fund': fundName,
          'Campaign': campaignName,
          'Payment Method': paymentMethod,
          'Recurring': donation.is_recurring ? 'Yes' : 'No',
          'Frequency': donation.recurring_frequency || '',
          'Anonymous': donation.anonymous ? 'Yes' : 'No',
          'Source': capitalizeFirst(donation.source),
          'Notes': donation.notes || '',
          'Transaction Reference': donation.xendit_payment_id || '',
          'Created At': donation.created_at
            ? new Date(donation.created_at).toISOString()
            : '',
        };
      })
    );

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create worksheet from data
    const ws = XLSX.utils.json_to_sheet(exportRows);

    // Set column widths
    const columnWidths = [
      { wch: 36 }, // Donation ID
      { wch: 12 }, // Date
      { wch: 10 }, // Status
      { wch: 25 }, // Donor Name
      { wch: 30 }, // Donor Email
      { wch: 15 }, // Donor Phone
      { wch: 12 }, // Amount
      { wch: 8 },  // Currency
      { wch: 12 }, // Xendit Fee
      { wch: 12 }, // Platform Fee
      { wch: 14 }, // Total Charged
      { wch: 20 }, // Category
      { wch: 20 }, // Fund
      { wch: 20 }, // Campaign
      { wch: 20 }, // Payment Method
      { wch: 10 }, // Recurring
      { wch: 10 }, // Frequency
      { wch: 10 }, // Anonymous
      { wch: 10 }, // Source
      { wch: 30 }, // Notes
      { wch: 30 }, // Transaction Reference
      { wch: 22 }, // Created At
    ];
    ws['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Donations');

    // Add summary sheet
    const summaryData = generateSummary(donations);
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Generate buffer
    const bookType = format === 'csv' ? 'csv' : 'xlsx';
    const buffer = XLSX.write(wb, { type: 'buffer', bookType });

    // Generate filename with date
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `donations-export-${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`;

    // Return as download
    const contentType =
      format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating donation export:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate export',
      },
      { status: 500 }
    );
  }
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(
  type: string | null,
  channel: string | null,
  masked: string | null
): string {
  if (!type) return '';

  const typeLabels: Record<string, string> = {
    card: 'Card',
    ewallet: 'E-Wallet',
    bank_transfer: 'Bank Transfer',
    direct_debit: 'Direct Debit',
  };

  const label = typeLabels[type] || type;
  const parts = [label];

  if (channel) {
    parts.push(`(${channel})`);
  }

  if (masked) {
    parts.push(`•••• ${masked}`);
  }

  return parts.join(' ');
}

/**
 * Capitalize first letter of string
 */
function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Generate summary statistics
 */
function generateSummary(donations: Donation[]): Array<{ Metric: string; Value: string }> {
  const paidDonations = donations.filter(d => d.status === 'paid');
  const totalAmount = paidDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalFees = paidDonations.reduce(
    (sum, d) => sum + (d.xendit_fee || 0) + (d.platform_fee || 0),
    0
  );
  const avgDonation = paidDonations.length > 0 ? totalAmount / paidDonations.length : 0;
  const recurringCount = paidDonations.filter(d => d.is_recurring).length;

  // Count by status
  const pendingCount = donations.filter(d => d.status === 'pending').length;
  const paidCount = paidDonations.length;
  const failedCount = donations.filter(d => d.status === 'failed').length;
  const refundedCount = donations.filter(d => d.status === 'refunded').length;

  return [
    { Metric: 'Export Date', Value: new Date().toISOString() },
    { Metric: 'Total Donations', Value: donations.length.toString() },
    { Metric: 'Total Amount Received', Value: `PHP ${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
    { Metric: 'Total Fees', Value: `PHP ${totalFees.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
    { Metric: 'Average Donation', Value: `PHP ${avgDonation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
    { Metric: 'Recurring Donors', Value: recurringCount.toString() },
    { Metric: '', Value: '' },
    { Metric: 'Status Breakdown', Value: '' },
    { Metric: 'Paid', Value: paidCount.toString() },
    { Metric: 'Pending', Value: pendingCount.toString() },
    { Metric: 'Failed', Value: failedCount.toString() },
    { Metric: 'Refunded', Value: refundedCount.toString() },
  ];
}
