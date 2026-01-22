/**
 * Financial Transaction Cache
 * In-memory caching for financial transaction list to reduce database queries
 *
 * TTL: 5 minutes
 */

import type { FinancialTransactionHeader } from '@/models/financialTransactionHeader.model';
import type { IncomeExpenseTransaction } from '@/models/incomeExpenseTransaction.model';

export interface EnrichedFinancialTransaction extends IncomeExpenseTransaction {
  header?: FinancialTransactionHeader;
}

interface CacheEntry {
  data: EnrichedFinancialTransaction[];
  timestamp: number;
}

class FinancialTransactionCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  get(tenantId: string): EnrichedFinancialTransaction[] | null {
    const entry = this.cache.get(tenantId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(tenantId);
      return null;
    }

    return entry.data;
  }

  set(tenantId: string, transactions: EnrichedFinancialTransaction[]): void {
    this.cache.set(tenantId, {
      data: transactions,
      timestamp: Date.now(),
    });
  }

  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export const financialTransactionCache = new FinancialTransactionCache();
