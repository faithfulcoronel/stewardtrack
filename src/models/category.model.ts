import { BaseModel } from './base.model';
import { ChartOfAccount } from './chartOfAccount.model';
import { Fund } from './fund.model';

export type CategoryType =
  | 'membership'
  | 'member_status'
  | 'income_transaction'
  | 'expense_transaction'
  | 'budget'
  | 'relationship_type';

export interface BaseCategory extends BaseModel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  chart_of_account_id: string | null;
  chart_of_accounts?: ChartOfAccount;
  fund_id: string | null;
  fund?: Fund;
}

export interface Category extends BaseCategory {
  // Present for backward compatibility when querying legacy table
  type?: CategoryType;
}

export type MembershipCategory = BaseCategory;
export type MemberStatusCategory = BaseCategory;
export type IncomeTransactionCategory = BaseCategory;
export type ExpenseTransactionCategory = BaseCategory;
export type BudgetCategory = BaseCategory;
export type RelationshipTypeCategory = BaseCategory;
