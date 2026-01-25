import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { IFinancialTransactionHeaderRepository } from '@/repositories/financialTransactionHeader.repository';
import type { IIncomeExpenseTransactionRepository } from '@/repositories/incomeExpenseTransaction.repository';
import type { FinancialTransactionHeader } from '@/models/financialTransactionHeader.model';
import { getCurrentTenantId } from '@/lib/server/context';
import { getTenantCurrency } from '@/lib/metadata/services/finance-utils';

export const dynamic = 'force-dynamic';

interface ExportRow {
  id: string;
  date: string;
  type: string;
  status: string;
  accountName: string;
  category: string;
  fund: string;
  source: string;
  amount: number;
  description: string;
}

// Extended type for line items with joined relationships from adapter
// These are the nested relationship fields returned by the adapter's defaultRelationships
interface LineItemWithRelations {
  id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  // Joined relationships from adapter (named by table name)
  accounts?: { id: string; name: string } | null;
  categories?: { id: string; name: string; code?: string } | null;
  funds?: { id: string; name: string; code?: string; type?: string } | null;
  sources?: { id: string; name: string; source_type?: string } | null;
}

/**
 * GET /api/finance/transactions/export
 *
 * Export transactions within a date range.
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 *
 * Returns: { transactions: ExportTransaction[], tenantName: string, currency: string }
 */
export async function GET(request: Request) {
  try {
    await getCurrentTenantId();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { message: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { message: 'Start date must be before or equal to end date' },
        { status: 400 }
      );
    }

    // Get services
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
      TYPES.IFinancialTransactionHeaderRepository
    );
    const ieRepo = container.get<IIncomeExpenseTransactionRepository>(
      TYPES.IIncomeExpenseTransactionRepository
    );

    // Get tenant info
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return NextResponse.json(
        { message: 'No tenant context available' },
        { status: 403 }
      );
    }

    // Fetch all transaction headers
    const headers = await transactionHeaderRepo.findAll();
    const allHeaders = (headers?.data || []) as FinancialTransactionHeader[];

    // Filter by date range
    const filteredHeaders = allHeaders.filter((header) => {
      const txDate = new Date(header.transaction_date);
      return txDate >= start && txDate <= end;
    });

    // Sort by date descending
    filteredHeaders.sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime();
      const dateB = new Date(b.transaction_date).getTime();
      return dateB - dateA;
    });

    // Build export data - fetch line items with relationships for each header
    const transactions: ExportRow[] = [];

    for (const header of filteredHeaders) {
      // Get line items with joined relationships (account, category, fund, source)
      const lineItems = await ieRepo.getByHeaderId(header.id);

      if (lineItems.length === 0) {
        // No line items - add a single row with header info only
        transactions.push({
          id: header.id,
          date: header.transaction_date,
          type: capitalizeFirst(header.transaction_type || 'income'),
          status: capitalizeFirst(header.status || 'draft'),
          accountName: '',
          category: '',
          fund: '',
          source: '',
          amount: 0,
          description: header.description || '',
        });
      } else {
        // Add a row for each line item
        for (const item of lineItems) {
          // Cast to extended type with relationships
          const lineItem = item as unknown as LineItemWithRelations;
          transactions.push({
            id: header.id,
            date: header.transaction_date,
            type: capitalizeFirst(lineItem.transaction_type || header.transaction_type || 'income'),
            status: capitalizeFirst(header.status || 'draft'),
            accountName: lineItem.accounts?.name ?? '',
            category: lineItem.categories?.name ?? '',
            fund: lineItem.funds?.name ?? '',
            source: lineItem.sources?.name ?? '',
            amount: lineItem.amount ?? 0,
            description: lineItem.description ?? header.description ?? '',
          });
        }
      }
    }

    // Get tenant currency from settings cache
    const currency = await getTenantCurrency();

    return NextResponse.json({
      transactions,
      tenantName: tenant.name || 'Organization',
      currency,
    });
  } catch (error) {
    console.error('[transactions/export] Error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
