import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { Account } from '../../models/account.model';
import type { IAccountAdapter } from '../account.adapter';


@injectable()
export class AccountApiAdapter
  extends ApiBaseAdapter<Account>
  implements IAccountAdapter
{
  protected basePath = '/accounts';

  protected mapFromApi(data: any): Account {
    return {
      id: data.id ?? data.Id,
      name: data.name ?? data.Name,
      account_type: data.account_type ?? data.AccountType,
      account_number: data.account_number ?? data.AccountNumber,
      description: data.description ?? data.Description ?? null,
      email: data.email ?? data.Email ?? null,
      phone: data.phone ?? data.Phone ?? null,
      address: data.address ?? data.Address ?? null,
      website: data.website ?? data.Website ?? null,
      tax_id: data.tax_id ?? data.TaxId ?? null,
      is_active: data.is_active ?? data.IsActive,
      notes: data.notes ?? data.Notes ?? null,
      member_id: data.member_id ?? data.MemberId ?? null,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
      member: data.member ?? data.Member
        ? {
            id: data.member?.id ?? data.Member?.Id,
            first_name: data.member?.first_name ?? data.Member?.FirstName,
            last_name: data.member?.last_name ?? data.Member?.LastName,
            email: data.member?.email ?? data.Member?.Email,
            contact_number:
              data.member?.contact_number ?? data.Member?.ContactNumber
          }
        : undefined
    } as Account;
  }

  protected mapToApi(data: Partial<Account>) {
    return {
      id: data.id,
      name: data.name,
      accountType: data.account_type,
      accountNumber: data.account_number,
      description: data.description,
      email: data.email,
      phone: data.phone,
      address: data.address,
      website: data.website,
      taxId: data.tax_id,
      isActive: data.is_active,
      notes: data.notes,
      memberId: data.member_id
    };
  }

  protected override async onBeforeCreate(
    data: Partial<Account>
  ): Promise<Partial<Account>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    return data;
  }
}
