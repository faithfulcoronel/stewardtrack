import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { Account } from '@/models/account.model';
import { BaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';

export interface IAccountRepository extends BaseRepository<Account> {
  // Add any account-specific repository methods here
}

@injectable()
export class AccountRepository extends BaseRepository<Account> implements IAccountRepository {
  constructor(@inject(TYPES.IAccountAdapter) adapter: BaseAdapter<Account>) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<Account>): Promise<Partial<Account>> {
    // Add any account-specific validation or transformation logic here
    return data;
  }

  protected override async afterCreate(_account: Account): Promise<void> {
    // Add any post-creation logic here (e.g., logging, notifications)
  }

  protected override async beforeUpdate(id: string, data: Partial<Account>): Promise<Partial<Account>> {
    // Add any account-specific validation or transformation logic here
    return data;
  }

  protected override async afterUpdate(_account: Account): Promise<void> {
    // Add any post-update logic here
  }

  protected override async beforeDelete(_id: string): Promise<void> {
    // Add any pre-deletion logic here (e.g., checking dependencies)
  }

  protected override async afterDelete(_id: string): Promise<void> {
    // Add any post-deletion logic here
  }
}