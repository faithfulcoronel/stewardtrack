/**
 * GET /api/finance/transactions/[transactionId]/pdf
 *
 * Returns a PDF receipt/voucher for the specified transaction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { LicenseGate } from '@/lib/access-gate';
import type { TenantService } from '@/services/TenantService';
import type { IFinancialTransactionHeaderRepository } from '@/repositories/financialTransactionHeader.repository';
import type { IIncomeExpenseTransactionRepository } from '@/repositories/incomeExpenseTransaction.repository';
import {
  generateTransactionReceiptPdf,
  type TransactionPdfData,
  type TransactionLineItem,
} from '@/lib/pdf/transactionReceiptPdf';

type Awaitable<T> = T | Promise<T>;

interface RouteContext {
  params: Awaitable<{ transactionId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Verify user is authenticated
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Check license for PDF downloads feature
    const licenseGate = new LicenseGate('pdf.downloads');
    const licenseResult = await licenseGate.check(userId, tenantId);
    if (!licenseResult.allowed) {
      return NextResponse.json(
        { error: 'PDF downloads require a license upgrade', requiresUpgrade: true },
        { status: 403 }
      );
    }

    const { transactionId } = await context.params;
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // Get services
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
      TYPES.IFinancialTransactionHeaderRepository
    );
    const incomeExpenseRepo = container.get<IIncomeExpenseTransactionRepository>(
      TYPES.IIncomeExpenseTransactionRepository
    );

    // Get tenant info
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get transaction header
    const header = await transactionHeaderRepo.findById(transactionId);
    if (!header) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Get line items from income_expense_transactions (has account relationship)
    const lineItems = await incomeExpenseRepo.getByHeaderId(transactionId);
    const transactionType = (header.transaction_type || 'income') as 'income' | 'expense';

    // Transform line items for PDF
    // income_expense_transactions have amount directly (no debit/credit separation)
    // Note: Supabase returns relationships under table names (accounts, categories, funds, sources)
    const pdfLineItems: TransactionLineItem[] = (lineItems || []).map((item: any) => ({
      account: item.accounts?.name || item.account?.name || '—',
      category: item.categories?.name || item.category?.name || '—',
      fund: item.funds?.name || item.fund?.name || '—',
      source: item.sources?.name || item.source?.name || '—',
      amount: item.amount || 0,
      description: item.description || '—',
    }));

    // Calculate total
    const totalAmount = pdfLineItems.reduce((sum, item) => sum + item.amount, 0);

    // Get tenant currency (default to PHP)
    const currency = tenant.currency || 'PHP';

    // Build PDF data
    const pdfData: TransactionPdfData = {
      transactionNumber: header.transaction_number || transactionId.substring(0, 8),
      transactionDate: header.transaction_date ? new Date(header.transaction_date) : new Date(),
      transactionType,
      status: header.status || 'draft',
      description: header.description || '',
      lineItems: pdfLineItems,
      totalAmount,
      tenantName: tenant.name || 'Organization',
      tenantAddress: tenant.address || undefined,
      currency,
    };

    // Generate PDF
    const pdfBlob = await generateTransactionReceiptPdf(pdfData);
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Generate filename
    const filename = `transaction-${header.transaction_number || transactionId.substring(0, 8)}.pdf`;

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating transaction PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
