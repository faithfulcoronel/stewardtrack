/**
 * Excel Import Service for Onboarding
 *
 * Coordinates the bulk import of data from Excel files during tenant onboarding.
 * Handles:
 * - Membership statuses
 * - Financial sources (with auto-created asset accounts)
 * - Funds (with auto-created equity accounts)
 * - Income categories (with auto-created revenue accounts)
 * - Expense categories (with auto-created expense accounts)
 * - Budget categories
 * - Opening balances (double-entry journal creation)
 *
 * Note: Members are imported separately via the Members module.
 *
 * Also auto-creates Chart of Accounts structure and Fiscal Year when needed.
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import type { MemberService } from '@/services/MemberService';
import type { MembershipTypeService } from '@/services/MembershipTypeService';
import type { FundService } from '@/services/FundService';
import type { ChartOfAccountService } from '@/services/ChartOfAccountService';
import type { AccountService } from '@/services/AccountService';
import { FinancialSourceService } from '@/services/FinancialSourceService';
import { IncomeCategoryService } from '@/services/IncomeCategoryService';
import { OpeningBalanceService } from '@/services/OpeningBalanceService';
import { FiscalYearService } from '@/services/FiscalYearService';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import {
  parseImportFile,
  validateImportData,
  getImportSummary,
  getDefaultMembershipStatuses,
  type ParsedImportData,
  type ParseResult,
  type ValidationResult,
} from '@/lib/excel';

// ============================================================================
// Types
// ============================================================================

export interface ImportProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
}

export interface ImportResult {
  success: boolean;
  summary: {
    membersCreated: number;
    membershipStatusesCreated: number;
    financialSourcesCreated: number;
    fundsCreated: number;
    incomeCategoriesCreated: number;
    expenseCategoriesCreated: number;
    budgetCategoriesCreated: number;
    openingBalancesCreated: number;
  };
  errors: string[];
  warnings: string[];
}

interface IdLookup {
  [name: string]: string;
}

// Default Chart of Accounts structure for churches
const DEFAULT_COA_STRUCTURE = [
  // Assets (1xxx)
  { code: '1000', name: 'Assets', account_type: 'asset', parent_code: null },
  { code: '1100', name: 'Cash and Bank', account_type: 'asset', parent_code: '1000' },
  { code: '1200', name: 'Accounts Receivable', account_type: 'asset', parent_code: '1000' },
  { code: '1300', name: 'Prepaid Expenses', account_type: 'asset', parent_code: '1000' },

  // Liabilities (2xxx)
  { code: '2000', name: 'Liabilities', account_type: 'liability', parent_code: null },
  { code: '2100', name: 'Accounts Payable', account_type: 'liability', parent_code: '2000' },
  { code: '2200', name: 'Accrued Expenses', account_type: 'liability', parent_code: '2000' },

  // Equity (3xxx)
  { code: '3000', name: 'Fund Balances', account_type: 'equity', parent_code: null },

  // Revenue (4xxx)
  { code: '4000', name: 'Revenue', account_type: 'revenue', parent_code: null },
  { code: '4100', name: 'Contributions', account_type: 'revenue', parent_code: '4000' },
  { code: '4200', name: 'Program Income', account_type: 'revenue', parent_code: '4000' },
  { code: '4300', name: 'Other Income', account_type: 'revenue', parent_code: '4000' },

  // Expenses (5xxx)
  { code: '5000', name: 'Expenses', account_type: 'expense', parent_code: null },
  { code: '5100', name: 'Personnel', account_type: 'expense', parent_code: '5000' },
  { code: '5200', name: 'Facilities', account_type: 'expense', parent_code: '5000' },
  { code: '5300', name: 'Ministry Programs', account_type: 'expense', parent_code: '5000' },
  { code: '5400', name: 'Administrative', account_type: 'expense', parent_code: '5000' },
];

// ============================================================================
// Service Implementation
// ============================================================================

@injectable()
export class ExcelImportService {
  constructor(
    @inject(TYPES.MemberService)
    private memberService: MemberService,
    @inject(TYPES.MembershipTypeService)
    private membershipTypeService: MembershipTypeService,
    @inject(TYPES.FundService)
    private fundService: FundService,
    @inject(TYPES.ChartOfAccountService)
    private coaService: ChartOfAccountService,
    @inject(TYPES.AccountService)
    private accountService: AccountService,
    @inject(TYPES.FinancialSourceService)
    private financialSourceService: FinancialSourceService,
    @inject(TYPES.IncomeCategoryService)
    private categoryService: IncomeCategoryService,
    @inject(TYPES.OpeningBalanceService)
    private openingBalanceService: OpeningBalanceService,
    @inject(TYPES.FiscalYearService)
    private fiscalYearService: FiscalYearService,
    @inject(TYPES.ITenantRepository)
    private tenantRepo: ITenantRepository,
  ) {}

  /**
   * Parse and validate an Excel file without importing
   */
  async parseAndValidate(buffer: ArrayBuffer | Buffer): Promise<{
    parseResult: ParseResult;
    validationResult: ValidationResult | null;
    summary: Record<string, number> | null;
  }> {
    const parseResult = parseImportFile(buffer);

    if (!parseResult.success || !parseResult.data) {
      return {
        parseResult,
        validationResult: null,
        summary: null,
      };
    }

    const validationResult = validateImportData(parseResult.data);
    const summary = getImportSummary(parseResult.data);

    return {
      parseResult,
      validationResult,
      summary,
    };
  }

  /**
   * Execute the full import process
   */
  async executeImport(
    data: ParsedImportData,
    tenantId?: string,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const errors: string[] = [];
    const warnings: string[] = [];
    const summary = {
      membersCreated: 0,
      membershipStatusesCreated: 0,
      financialSourcesCreated: 0,
      fundsCreated: 0,
      incomeCategoriesCreated: 0,
      expenseCategoriesCreated: 0,
      budgetCategoriesCreated: 0,
      openingBalancesCreated: 0,
    };

    try {
      // Step 1: Ensure COA structure exists
      onProgress?.({
        stage: 'coa',
        current: 0,
        total: 1,
        message: 'Setting up Chart of Accounts...',
      });
      await this.ensureCoaStructure(effectiveTenantId);

      // Step 2: Ensure fiscal year exists
      onProgress?.({
        stage: 'fiscal_year',
        current: 0,
        total: 1,
        message: 'Setting up Fiscal Year...',
      });
      await this.ensureFiscalYear(effectiveTenantId);

      // Step 2.5: Ensure church organization account exists (for financial transactions)
      onProgress?.({
        stage: 'church_account',
        current: 0,
        total: 1,
        message: 'Setting up Church Account...',
      });
      await this.ensureChurchAccount(effectiveTenantId);

      // Step 3: Create membership statuses
      onProgress?.({
        stage: 'membership_statuses',
        current: 0,
        total: data.membershipStatuses.length || 1,
        message: 'Creating membership statuses...',
      });
      const statusLookup = await this.createMembershipStatuses(
        data.membershipStatuses,
        effectiveTenantId,
        errors
      );
      summary.membershipStatusesCreated = Object.keys(statusLookup).length;

      // Step 4: Create financial sources (with asset accounts)
      onProgress?.({
        stage: 'financial_sources',
        current: 0,
        total: data.financialSources.length,
        message: 'Creating financial sources...',
      });
      const sourceLookup = await this.createFinancialSources(
        data.financialSources,
        effectiveTenantId,
        errors
      );
      summary.financialSourcesCreated = Object.keys(sourceLookup).length;

      // Step 5: Create funds (with equity accounts)
      onProgress?.({
        stage: 'funds',
        current: 0,
        total: data.funds.length,
        message: 'Creating funds...',
      });
      const fundLookup = await this.createFunds(
        data.funds,
        effectiveTenantId,
        errors
      );
      summary.fundsCreated = Object.keys(fundLookup).length;

      // Step 6: Create income categories (with revenue accounts)
      onProgress?.({
        stage: 'income_categories',
        current: 0,
        total: data.incomeCategories.length,
        message: 'Creating income categories...',
      });
      summary.incomeCategoriesCreated = await this.createIncomeCategories(
        data.incomeCategories,
        effectiveTenantId,
        errors
      );

      // Step 7: Create expense categories (with expense accounts)
      onProgress?.({
        stage: 'expense_categories',
        current: 0,
        total: data.expenseCategories.length,
        message: 'Creating expense categories...',
      });
      summary.expenseCategoriesCreated = await this.createExpenseCategories(
        data.expenseCategories,
        effectiveTenantId,
        errors
      );

      // Step 8: Create budget categories
      onProgress?.({
        stage: 'budget_categories',
        current: 0,
        total: data.budgetCategories.length,
        message: 'Creating budget categories...',
      });
      summary.budgetCategoriesCreated = await this.createBudgetCategories(
        data.budgetCategories,
        effectiveTenantId,
        errors
      );

      // Note: Members are imported separately via the Members module
      // Step 9 (createMembers) has been removed from onboarding import

      // Step 9: Create opening balances
      onProgress?.({
        stage: 'opening_balances',
        current: 0,
        total: data.openingBalances.length,
        message: 'Recording opening balances...',
      });
      summary.openingBalancesCreated = await this.createOpeningBalances(
        data.openingBalances,
        fundLookup,
        sourceLookup,
        effectiveTenantId,
        errors
      );

      // Debug: Log any errors before returning
      if (errors.length > 0) {
        console.log('[ExcelImportService] Import completed with errors:', errors);
      } else {
        console.log('[ExcelImportService] Import completed successfully with summary:', summary);
      }

      return {
        success: errors.length === 0,
        summary,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        summary,
        errors,
        warnings,
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  /**
   * Ensure Chart of Accounts structure exists
   */
  private async ensureCoaStructure(tenantId: string): Promise<void> {
    // Check if root accounts exist
    const { data: existingAccounts } = await this.coaService.findAll({
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
        parent_id: { operator: 'isEmpty', value: true },
      },
    });

    if (existingAccounts && existingAccounts.length > 0) {
      // COA structure already exists
      return;
    }

    // Create default COA structure
    const codeToIdMap = new Map<string, string>();

    for (const account of DEFAULT_COA_STRUCTURE) {
      const parentId = account.parent_code ? codeToIdMap.get(account.parent_code) : null;

      const created = await this.coaService.create({
        code: account.code,
        name: account.name,
        account_type: account.account_type as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
        parent_id: parentId,
        is_active: true,
        tenant_id: tenantId,
      });

      codeToIdMap.set(account.code, created.id);
    }
  }

  /**
   * Ensure fiscal year exists
   */
  private async ensureFiscalYear(tenantId: string): Promise<void> {
    // Get tenant to find registration date
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Check if any fiscal year exists
    const { data: existingYears } = await this.fiscalYearService.findAll({
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
      },
    });

    if (existingYears && existingYears.length > 0) {
      return;
    }

    // Create fiscal year based on current date
    const now = new Date();
    const year = now.getFullYear();

    await this.fiscalYearService.create({
      name: `FY ${year}`,
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      status: 'open',
      tenant_id: tenantId,
    });
  }

  /**
   * Ensure a church organization account exists for financial transactions.
   * This account is used as the account_id for financial transactions during opening balance posting.
   */
  private async ensureChurchAccount(tenantId: string): Promise<string> {
    // Get tenant to use its name for the account
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Check if organization account already exists for this tenant
    const { data: existingAccounts } = await this.accountService.findAll({
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
        account_type: { operator: 'eq', value: 'organization' },
      },
    });

    if (existingAccounts && existingAccounts.length > 0) {
      return existingAccounts[0].id;
    }

    // Generate account number using the service's helper
    const accountNumberResult = await this.accountService.generateAccountNumber({
      pageId: 'onboarding',
      changedField: 'name',
      model: {
        name: tenant.name,
        account_type: 'organization',
      },
    });

    const accountNumber = accountNumberResult.updatedFields?.account_number || `ORG-${Date.now()}`;

    // Create the church organization account
    const account = await this.accountService.create({
      name: tenant.name,
      account_type: 'organization',
      account_number: accountNumber,
      description: `Main organization account for ${tenant.name}`,
      is_active: true,
      tenant_id: tenantId,
    });

    return account.id;
  }

  /**
   * Create membership statuses
   */
  private async createMembershipStatuses(
    statuses: { name: string; description?: string | null }[],
    tenantId: string,
    errors: string[]
  ): Promise<IdLookup> {
    const lookup: IdLookup = {};

    // Use default statuses if none provided
    const statusesToCreate = statuses.length > 0
      ? statuses
      : getDefaultMembershipStatuses();

    for (const status of statusesToCreate) {
      try {
        // Check if already exists
        const { data: existing } = await this.membershipTypeService.findAll({
          filters: {
            tenant_id: { operator: 'eq', value: tenantId },
            name: { operator: 'eq', value: status.name },
          },
        });

        if (existing && existing.length > 0) {
          lookup[status.name.toLowerCase()] = existing[0].id;
          continue;
        }

        // Generate a unique code from name
        const code = status.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const created = await this.membershipTypeService.create({
          name: status.name,
          code: code,
          description: status.description ?? null,
          is_active: true,
          tenant_id: tenantId,
        });

        lookup[status.name.toLowerCase()] = created.id;
      } catch (error) {
        errors.push(`Failed to create membership status "${status.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return lookup;
  }

  /**
   * Create financial sources with auto-created asset accounts
   */
  private async createFinancialSources(
    sources: { name: string; description?: string | null; source_type?: 'bank' | 'cash' | 'online' | 'wallet' | 'fund' | 'other' | null }[],
    tenantId: string,
    errors: string[]
  ): Promise<IdLookup> {
    const lookup: IdLookup = {};

    for (const source of sources) {
      try {
        // Check if already exists
        const { data: existing } = await this.financialSourceService.findAll({
          filters: {
            tenant_id: { operator: 'eq', value: tenantId },
            name: { operator: 'eq', value: source.name },
          },
        });

        if (existing && existing.length > 0) {
          lookup[source.name.toLowerCase()] = existing[0].id;
          continue;
        }

        // Use provided source_type or auto-detect from name
        let sourceType: 'bank' | 'fund' | 'wallet' | 'cash' | 'online' | 'other' = source.source_type ?? 'other';

        // Auto-detect if not provided
        if (!source.source_type) {
          const nameLower = source.name.toLowerCase();
          if (nameLower.includes('bank') || nameLower.includes('checking') || nameLower.includes('savings')) {
            sourceType = 'bank';
          } else if (nameLower.includes('cash') || nameLower.includes('petty')) {
            sourceType = 'cash';
          } else if (nameLower.includes('online') || nameLower.includes('paypal') || nameLower.includes('stripe')) {
            sourceType = 'online';
          } else if (nameLower.includes('wallet')) {
            sourceType = 'wallet';
          }
        }

        // Create with auto-created asset account
        const created = await this.financialSourceService.createWithAccount({
          name: source.name,
          description: source.description ?? null,
          source_type: sourceType,
          is_active: true,
          tenant_id: tenantId,
          auto_create: true,
        });

        lookup[source.name.toLowerCase()] = created.id;
      } catch (error) {
        errors.push(`Failed to create financial source "${source.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return lookup;
  }

  /**
   * Create funds with auto-created equity accounts
   */
  private async createFunds(
    funds: { name: string; description?: string | null; type: 'restricted' | 'unrestricted' }[],
    tenantId: string,
    errors: string[]
  ): Promise<IdLookup> {
    const lookup: IdLookup = {};

    for (const fund of funds) {
      try {
        // Check if already exists
        const { data: existing } = await this.fundService.findAll({
          filters: {
            tenant_id: { operator: 'eq', value: tenantId },
            name: { operator: 'eq', value: fund.name },
          },
        });

        if (existing && existing.length > 0) {
          lookup[fund.name.toLowerCase()] = existing[0].id;
          continue;
        }

        // Generate a unique code from name
        const fundCode = fund.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

        // Create with auto-created equity account
        const created = await this.fundService.createWithAccount({
          name: fund.name,
          code: fundCode,
          description: fund.description ?? null,
          type: fund.type,
          tenant_id: tenantId,
        });

        lookup[fund.name.toLowerCase()] = created.id;
      } catch (error) {
        errors.push(`Failed to create fund "${fund.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return lookup;
  }

  /**
   * Create income categories with linked revenue accounts
   */
  private async createIncomeCategories(
    categories: { name: string; description?: string | null }[],
    tenantId: string,
    errors: string[]
  ): Promise<number> {
    let created = 0;

    // Get revenue parent account (4100 - Contributions)
    const revenueParent = await this.coaService.findByCode('4100');

    // Find the max existing code in the 41xx range to avoid duplicates
    let coaCodeCounter = 10; // Default start at 4110
    const { data: existingCodes } = await this.coaService.findAll({
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
      },
    });
    if (existingCodes) {
      const revenueCodeNums = existingCodes
        .filter(a => a.code.startsWith('41') && a.code.length === 4)
        .map(a => parseInt(a.code.slice(2), 10))
        .filter(n => !isNaN(n));
      if (revenueCodeNums.length > 0) {
        coaCodeCounter = Math.max(...revenueCodeNums) + 1;
      }
    }

    for (const category of categories) {
      try {
        // Check if already exists
        const { data: existing } = await this.categoryService.findAll({
          filters: {
            tenant_id: { operator: 'eq', value: tenantId },
            name: { operator: 'eq', value: category.name },
          },
        }, 'income_transaction');

        if (existing && existing.length > 0) {
          continue;
        }

        // Create COA account for this category
        let coaId: string | null = null;
        if (revenueParent) {
          const coaCode = `41${String(coaCodeCounter).padStart(2, '0')}`;
          coaCodeCounter++; // Increment before next iteration
          const coaAccount = await this.coaService.create({
            code: coaCode,
            name: category.name,
            account_type: 'revenue',
            parent_id: revenueParent.id,
            is_active: true,
            tenant_id: tenantId,
          });
          coaId = coaAccount.id;
        }

        // Generate category code from name
        const categoryCode = `INC-${category.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}`;

        await this.categoryService.create({
          name: category.name,
          code: categoryCode,
          description: category.description ?? null,
          is_active: true,
          chart_of_account_id: coaId,
          tenant_id: tenantId,
        }, undefined, [], 'income_transaction');

        created++;
      } catch (error) {
        errors.push(`Failed to create income category "${category.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return created;
  }

  /**
   * Create expense categories with linked expense accounts
   */
  private async createExpenseCategories(
    categories: { name: string; description?: string | null }[],
    tenantId: string,
    errors: string[]
  ): Promise<number> {
    let created = 0;

    // Get expense parent account (5000 - Expenses)
    const expenseParent = await this.coaService.findByCode('5000');

    // Find the max existing code in the 50xx range to avoid duplicates
    let coaCodeCounter = 10; // Default start at 5010
    const { data: existingCodes } = await this.coaService.findAll({
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
      },
    });
    if (existingCodes) {
      const expenseCodeNums = existingCodes
        .filter(a => a.code.startsWith('50') && a.code.length === 4)
        .map(a => parseInt(a.code.slice(2), 10))
        .filter(n => !isNaN(n));
      if (expenseCodeNums.length > 0) {
        coaCodeCounter = Math.max(...expenseCodeNums) + 1;
      }
    }

    for (const category of categories) {
      try {
        // Check if already exists
        const { data: existing } = await this.categoryService.findAll({
          filters: {
            tenant_id: { operator: 'eq', value: tenantId },
            name: { operator: 'eq', value: category.name },
          },
        }, 'expense_transaction');

        if (existing && existing.length > 0) {
          continue;
        }

        // Create COA account for this category
        let coaId: string | null = null;
        if (expenseParent) {
          const coaCode = `50${String(coaCodeCounter).padStart(2, '0')}`;
          coaCodeCounter++; // Increment before next iteration
          const coaAccount = await this.coaService.create({
            code: coaCode,
            name: category.name,
            account_type: 'expense',
            parent_id: expenseParent.id,
            is_active: true,
            tenant_id: tenantId,
          });
          coaId = coaAccount.id;
        }

        // Generate category code from name
        const categoryCode = `EXP-${category.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}`;

        await this.categoryService.create({
          name: category.name,
          code: categoryCode,
          description: category.description ?? null,
          is_active: true,
          chart_of_account_id: coaId,
          tenant_id: tenantId,
        }, undefined, [], 'expense_transaction');

        created++;
      } catch (error) {
        errors.push(`Failed to create expense category "${category.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return created;
  }

  /**
   * Create budget categories
   */
  private async createBudgetCategories(
    categories: { name: string; description?: string | null }[],
    tenantId: string,
    errors: string[]
  ): Promise<number> {
    let created = 0;

    for (const category of categories) {
      try {
        // Check if already exists
        const { data: existing } = await this.categoryService.findAll({
          filters: {
            tenant_id: { operator: 'eq', value: tenantId },
            name: { operator: 'eq', value: category.name },
          },
        }, 'budget');

        if (existing && existing.length > 0) {
          continue;
        }

        // Generate category code from name
        const categoryCode = `BUD-${category.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}`;

        await this.categoryService.create({
          name: category.name,
          code: categoryCode,
          description: category.description ?? null,
          is_active: true,
          tenant_id: tenantId,
        }, undefined, [], 'budget');

        created++;
      } catch (error) {
        errors.push(`Failed to create budget category "${category.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return created;
  }

  /**
   * Create members
   */
  private async createMembers(
    members: {
      first_name: string;
      middle_name?: string | null;
      last_name: string;
      email?: string | null;
      contact_number?: string | null;
      street_address?: string | null;
      city?: string | null;
      state_province?: string | null;
      postal_code?: string | null;
      country?: string | null;
      birthdate?: string | null;
      membership_status?: string | null;
    }[],
    statusLookup: IdLookup,
    tenantId: string,
    errors: string[]
  ): Promise<number> {
    let created = 0;

    for (const member of members) {
      try {
        // Look up membership type ID
        let membershipTypeId: string | undefined = undefined;
        if (member.membership_status) {
          membershipTypeId = statusLookup[member.membership_status.toLowerCase()] ?? undefined;
        }

        await this.memberService.create({
          first_name: member.first_name,
          middle_name: member.middle_name ?? null,
          last_name: member.last_name,
          email: member.email ?? null,
          contact_number: member.contact_number ?? null,
          address_street: member.street_address ?? null,
          address_city: member.city ?? null,
          address_state: member.state_province ?? null,
          address_postal_code: member.postal_code ?? null,
          address_country: member.country ?? null,
          birthday: member.birthdate ?? null,
          membership_type_id: membershipTypeId,
          tenant_id: tenantId,
        });

        created++;
      } catch (error) {
        errors.push(`Failed to create member "${member.first_name} ${member.last_name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return created;
  }

  /**
   * Create opening balances with double-entry journal entries
   */
  private async createOpeningBalances(
    balances: {
      fund_name: string;
      financial_source: string;
      amount: number;
      as_of_date: string;
    }[],
    fundLookup: IdLookup,
    sourceLookup: IdLookup,
    tenantId: string,
    errors: string[]
  ): Promise<number> {
    let created = 0;

    // Skip if no balances to import
    if (!balances || balances.length === 0) {
      return 0;
    }

    // Skip if no funds or sources
    if (Object.keys(fundLookup).length === 0 || Object.keys(sourceLookup).length === 0) {
      errors.push('Cannot create opening balances: No funds or financial sources are configured.');
      return 0;
    }

    // Get current (open) fiscal year
    const { data: fiscalYears } = await this.fiscalYearService.findAll({
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
        status: { operator: 'eq', value: 'open' },
      },
    });

    if (!fiscalYears || fiscalYears.length === 0) {
      // Try to find any fiscal year and report its status
      const { data: anyFiscalYears } = await this.fiscalYearService.findAll({
        filters: {
          tenant_id: { operator: 'eq', value: tenantId },
        },
      });

      if (anyFiscalYears && anyFiscalYears.length > 0) {
        const statuses = anyFiscalYears.map(fy => fy.status).join(', ');
        errors.push(`No open fiscal year found. Existing fiscal years have status: ${statuses}. Opening balances require an open fiscal year.`);
      } else {
        errors.push('No fiscal year found. Opening balances cannot be created without a fiscal year.');
      }
      return 0;
    }

    const fiscalYear = fiscalYears[0];
    const fiscalYearId = fiscalYear?.id;

    // Validate fiscal year ID exists
    if (!fiscalYearId) {
      errors.push('Fiscal year record is missing an ID. This may indicate a database issue.');
      console.error('[ExcelImportService] Fiscal year found but has no ID:', fiscalYear);
      return 0;
    }

    // Build entries for batch creation
    const entries: { fund_id: string; source_id: string; amount: number }[] = [];

    for (const balance of balances) {
      const fundId = fundLookup[balance.fund_name.toLowerCase()];
      const sourceId = sourceLookup[balance.financial_source.toLowerCase()];

      if (!fundId) {
        errors.push(`Fund not found: "${balance.fund_name}"`);
        continue;
      }

      if (!sourceId) {
        errors.push(`Financial source not found: "${balance.financial_source}"`);
        continue;
      }

      entries.push({
        fund_id: fundId,
        source_id: sourceId,
        amount: balance.amount,
      });
    }

    if (entries.length > 0) {
      try {
        const balanceRecords = await this.openingBalanceService.createBatch(fiscalYearId, entries);

        // Submit, approve, and post each balance
        for (const record of balanceRecords) {
          await this.openingBalanceService.submit(record.id);
          await this.openingBalanceService.approve(record.id);
          await this.openingBalanceService.post(record.id);
          created++;
        }
      } catch (error) {
        errors.push(`Failed to create opening balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return created;
  }
}
