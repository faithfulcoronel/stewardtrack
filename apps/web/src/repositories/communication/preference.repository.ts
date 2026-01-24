import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { TYPES } from '@/lib/types';
import type {
  IPreferenceAdapter,
  OptOutIdentifier,
  OptedOutContact,
} from '@/adapters/communication/preference.adapter';
import type {
  CommunicationPreference,
  UpsertPreferenceDto,
  PreferenceCheck,
} from '@/models/communication/preference.model';

export interface IPreferenceRepository {
  upsertPreference(data: UpsertPreferenceDto, tenantId: string): Promise<CommunicationPreference>;
  getPreferenceByMember(memberId: string, tenantId: string): Promise<CommunicationPreference | null>;
  getPreferenceByEmail(email: string, tenantId: string): Promise<CommunicationPreference | null>;
  getPreferenceByPhone(phone: string, tenantId: string): Promise<CommunicationPreference | null>;
  checkPreferences(tenantId: string, email?: string, phone?: string, memberId?: string): Promise<PreferenceCheck>;
  optOut(tenantId: string, channel: 'email' | 'sms' | 'all', identifier: OptOutIdentifier): Promise<void>;
  optIn(tenantId: string, channel: 'email' | 'sms' | 'all', identifier: OptOutIdentifier): Promise<void>;
  getOptedOutContacts(tenantId: string, channel?: 'email' | 'sms'): Promise<OptedOutContact[]>;
}

@injectable()
export class PreferenceRepository extends BaseRepository<CommunicationPreference> implements IPreferenceRepository {
  constructor(
    @inject(TYPES.IPreferenceAdapter) private readonly preferenceAdapter: IPreferenceAdapter
  ) {
    super(preferenceAdapter);
  }

  async upsertPreference(data: UpsertPreferenceDto, tenantId: string): Promise<CommunicationPreference> {
    return await this.preferenceAdapter.upsertPreference(data, tenantId);
  }

  async getPreferenceByMember(memberId: string, tenantId: string): Promise<CommunicationPreference | null> {
    return await this.preferenceAdapter.getPreferenceByMember(memberId, tenantId);
  }

  async getPreferenceByEmail(email: string, tenantId: string): Promise<CommunicationPreference | null> {
    return await this.preferenceAdapter.getPreferenceByEmail(email, tenantId);
  }

  async getPreferenceByPhone(phone: string, tenantId: string): Promise<CommunicationPreference | null> {
    return await this.preferenceAdapter.getPreferenceByPhone(phone, tenantId);
  }

  async checkPreferences(
    tenantId: string,
    email?: string,
    phone?: string,
    memberId?: string
  ): Promise<PreferenceCheck> {
    return await this.preferenceAdapter.checkPreferences(tenantId, email, phone, memberId);
  }

  async optOut(
    tenantId: string,
    channel: 'email' | 'sms' | 'all',
    identifier: OptOutIdentifier
  ): Promise<void> {
    return await this.preferenceAdapter.optOut(tenantId, channel, identifier);
  }

  async optIn(
    tenantId: string,
    channel: 'email' | 'sms' | 'all',
    identifier: OptOutIdentifier
  ): Promise<void> {
    return await this.preferenceAdapter.optIn(tenantId, channel, identifier);
  }

  async getOptedOutContacts(tenantId: string, channel?: 'email' | 'sms'): Promise<OptedOutContact[]> {
    return await this.preferenceAdapter.getOptedOutContacts(tenantId, channel);
  }
}
