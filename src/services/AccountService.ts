import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IAccountRepository } from '@/repositories/account.repository';
import type { Account } from '@/models/account.model';
import type { QueryOptions } from '@/adapters/base.adapter';
import type { CrudService } from '@/services/CrudService';
import { AccountValidator } from '@/validators/account.validator';
import { validateOrThrow } from '@/utils/validation';

export interface GenerateAccountNumberRequest {
  pageId: string;
  changedField: string;
  model: Record<string, any>;
  context?: any;
}

export interface RecalculateResponse {
  updatedFields: Record<string, any>;
  messages?: { type: 'info' | 'success' | 'warning'; text: string }[];
}

export interface AccountService extends CrudService<Account> {
  generateAccountNumber(
    req: GenerateAccountNumberRequest,
  ): Promise<RecalculateResponse>;
}

@injectable()
export class SupabaseAccountService implements AccountService {
  constructor(
    @inject(TYPES.IAccountRepository)
    private repo: IAccountRepository,
  ) {}

  async find(options: QueryOptions = {}) {
    return this.repo.find(options);
  }

  async findAll(options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findAll(options);
  }

  async findById(id: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findById(id, options);
  }

  async create(
    data: Partial<Account>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ): Promise<Account> {
    validateOrThrow(AccountValidator, data);
    return this.repo.create(data, relations, fieldsToRemove);
  }

  async update(
    id: string,
    data: Partial<Account>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = []
  ): Promise<Account> {
    validateOrThrow(AccountValidator, data);
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  async generateAccountNumber(
    { model }: GenerateAccountNumberRequest,
  ): Promise<RecalculateResponse> {
    const name = String(model?.name || '').trim();
    const type = String(model?.account_type || '').trim();
    if (!name || !type) {
      return { updatedFields: {} };
    }

    const sanitized = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const prefix = sanitized.slice(0, 3) || 'ACC';
    const typePrefix =
      type === 'organization' ? 'ORG' : type === 'person' ? 'PER' : 'ACC';
    const random = Math.floor(1000 + Math.random() * 9000);

    return {
      updatedFields: {
        account_number: `${typePrefix}-${prefix}-${random}`,
      },
    };
  }
}
