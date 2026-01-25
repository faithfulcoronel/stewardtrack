import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IRecipientRepository } from '@/repositories/communication/recipient.repository';
import type { IPreferenceRepository } from '@/repositories/communication/preference.repository';
import type { IMemberAdapter } from '@/adapters/member.adapter';
import type { RecipientFilters, RecipientCounts } from '@/adapters/communication/recipient.adapter';
import type {
  CampaignRecipient,
  CreateRecipientDto,
  UpdateRecipientStatusDto,
  ResolvedRecipient,
  RecipientSource,
} from '@/models/communication/recipient.model';
import type { RecipientCriteria, CommunicationChannel } from '@/models/communication/campaign.model';

export interface RecipientService {
  createRecipient(data: CreateRecipientDto, tenantId: string): Promise<CampaignRecipient>;
  createRecipients(data: CreateRecipientDto[], tenantId: string): Promise<CampaignRecipient[]>;
  updateRecipientStatus(id: string, data: UpdateRecipientStatusDto): Promise<CampaignRecipient>;
  getRecipientsByCampaign(campaignId: string, tenantId: string, filters?: RecipientFilters): Promise<CampaignRecipient[]>;
  getRecipientById(id: string, tenantId: string): Promise<CampaignRecipient | null>;
  getPendingRecipients(campaignId: string, limit?: number): Promise<CampaignRecipient[]>;
  getRecipientCounts(campaignId: string): Promise<RecipientCounts>;
  deleteRecipientsByCampaign(campaignId: string, tenantId: string): Promise<void>;
  resolveRecipients(criteria: RecipientCriteria, tenantId: string): Promise<ResolvedRecipient[]>;
  getAvailableRecipientSources(tenantId: string): Promise<RecipientSource[]>;
  prepareRecipientsForCampaign(
    campaignId: string,
    criteria: RecipientCriteria,
    channel: CommunicationChannel,
    tenantId: string
  ): Promise<CampaignRecipient[]>;
}

@injectable()
export class SupabaseRecipientService implements RecipientService {
  constructor(
    @inject(TYPES.IRecipientRepository) private recipientRepo: IRecipientRepository,
    @inject(TYPES.IPreferenceRepository) private preferenceRepo: IPreferenceRepository,
    @inject(TYPES.IMemberAdapter) private memberAdapter: IMemberAdapter
  ) {}

  async createRecipient(data: CreateRecipientDto, tenantId: string): Promise<CampaignRecipient> {
    return await this.recipientRepo.createRecipient(data, tenantId);
  }

  async createRecipients(data: CreateRecipientDto[], tenantId: string): Promise<CampaignRecipient[]> {
    return await this.recipientRepo.createRecipients(data, tenantId);
  }

  async updateRecipientStatus(id: string, data: UpdateRecipientStatusDto): Promise<CampaignRecipient> {
    return await this.recipientRepo.updateRecipientStatus(id, data);
  }

  async getRecipientsByCampaign(
    campaignId: string,
    tenantId: string,
    filters?: RecipientFilters
  ): Promise<CampaignRecipient[]> {
    return await this.recipientRepo.getRecipientsByCampaign(campaignId, tenantId, filters);
  }

  async getRecipientById(id: string, tenantId: string): Promise<CampaignRecipient | null> {
    return await this.recipientRepo.getRecipientById(id, tenantId);
  }

  async getPendingRecipients(campaignId: string, limit?: number): Promise<CampaignRecipient[]> {
    return await this.recipientRepo.getPendingRecipients(campaignId, limit);
  }

  async getRecipientCounts(campaignId: string): Promise<RecipientCounts> {
    return await this.recipientRepo.getRecipientCounts(campaignId);
  }

  async deleteRecipientsByCampaign(campaignId: string, tenantId: string): Promise<void> {
    return await this.recipientRepo.deleteRecipientsByCampaign(campaignId, tenantId);
  }

  async resolveRecipients(criteria: RecipientCriteria, tenantId: string): Promise<ResolvedRecipient[]> {
    console.log('[RecipientService] resolveRecipients called with criteria:', JSON.stringify(criteria, null, 2));
    const recipients: ResolvedRecipient[] = [];

    switch (criteria.source) {
      case 'manual':
        // Manual contacts provided directly
        console.log('[RecipientService] Processing manual contacts:', criteria.manualContacts?.length || 0);
        if (criteria.manualContacts) {
          for (const contact of criteria.manualContacts) {
            // Check preferences
            const prefs = await this.preferenceRepo.checkPreferences(
              tenantId,
              contact.email,
              contact.phone
            );

            recipients.push({
              type: 'external',
              email: prefs.canSendEmail ? contact.email : undefined,
              phone: prefs.canSendSms ? contact.phone : undefined,
              fullName: contact.name,
              personalizationData: {
                full_name: contact.name,
                email: contact.email,
                phone: contact.phone,
              },
            });
          }
        }
        break;

      case 'members':
        console.log('[RecipientService] Processing members source');
        // Query specific members by IDs if provided
        if (criteria.memberIds && criteria.memberIds.length > 0) {
          console.log('[RecipientService] Fetching specific members:', criteria.memberIds);
          for (const memberId of criteria.memberIds) {
            try {
              const member = await this.memberAdapter.fetchById(memberId);
              if (member) {
                // Check preferences
                const prefs = await this.preferenceRepo.checkPreferences(
                  tenantId,
                  member.email || undefined,
                  member.contact_number || undefined
                );

                recipients.push({
                  type: 'member',
                  memberId: member.id,
                  email: prefs.canSendEmail ? (member.email || undefined) : undefined,
                  phone: prefs.canSendSms ? (member.contact_number || undefined) : undefined,
                  firstName: member.first_name,
                  lastName: member.last_name,
                  fullName: `${member.first_name} ${member.last_name}`.trim(),
                  personalizationData: {
                    first_name: member.first_name,
                    last_name: member.last_name,
                    full_name: `${member.first_name} ${member.last_name}`.trim(),
                    email: member.email || undefined,
                    phone: member.contact_number || undefined,
                  },
                });
              }
            } catch (error) {
              console.error(`[RecipientService] Failed to fetch member ${memberId}:`, error);
            }
          }
        } else {
          // TODO: Fetch all members based on filters if no specific IDs
          console.log('[RecipientService] No memberIds provided, all-members query not yet implemented');
        }
        break;

      case 'families':
        // TODO: Query family accounts and resolve to individual members
        console.log('[RecipientService] Families source not yet implemented');
        break;

      case 'event_attendees':
        // TODO: Query event registrations based on eventId
        console.log('[RecipientService] Event attendees source not yet implemented');
        break;

      case 'ministry_groups':
        // TODO: Query ministry member assignments based on ministryId
        console.log('[RecipientService] Ministry groups source not yet implemented');
        break;

      case 'custom_list':
        // TODO: Query custom contact list based on customListId
        console.log('[RecipientService] Custom list source not yet implemented');
        break;
    }

    console.log(`[RecipientService] Resolved ${recipients.length} recipients`);
    return recipients;
  }

  async getAvailableRecipientSources(tenantId: string): Promise<RecipientSource[]> {
    // TODO: Query actual counts from database
    // For now, return static sources
    void tenantId;

    return [
      {
        type: 'members',
        name: 'All Members',
        count: 0, // TODO: Get actual count
        description: 'All church members in your database',
      },
      {
        type: 'families',
        name: 'Family Households',
        count: 0, // TODO: Get actual count
        description: 'Send to all members of family households',
      },
      {
        type: 'event_attendees',
        name: 'Event Attendees',
        count: 0,
        description: 'People who registered for or attended events',
      },
      {
        type: 'ministry_groups',
        name: 'Ministry Groups',
        count: 0,
        description: 'Members of specific ministry teams',
      },
      {
        type: 'custom_list',
        name: 'Custom Lists',
        count: 0,
        description: 'Saved custom contact lists',
      },
      {
        type: 'manual',
        name: 'Manual Entry',
        count: 0,
        description: 'Manually enter email addresses or phone numbers',
      },
    ];
  }

  async prepareRecipientsForCampaign(
    campaignId: string,
    criteria: RecipientCriteria,
    channel: CommunicationChannel,
    tenantId: string
  ): Promise<CampaignRecipient[]> {
    console.log('[RecipientService] prepareRecipientsForCampaign called:', {
      campaignId,
      criteria: JSON.stringify(criteria),
      channel,
      tenantId,
    });

    // Resolve recipients based on criteria
    const resolved = await this.resolveRecipients(criteria, tenantId);
    console.log('[RecipientService] Resolved recipients:', resolved.map(r => ({
      type: r.type,
      email: r.email,
      phone: r.phone,
      fullName: r.fullName,
    })));

    // Filter by channel capability
    const validRecipients = resolved.filter((r) => {
      if (channel === 'email') return !!r.email;
      if (channel === 'sms') return !!r.phone;
      return false;
    });
    console.log('[RecipientService] Valid recipients after channel filter:', validRecipients.length);

    // Create recipient records
    const recipientDtos: CreateRecipientDto[] = validRecipients.map((r) => ({
      campaign_id: campaignId,
      recipient_type: r.type,
      recipient_id: r.memberId || r.accountId,
      email: r.email,
      phone: r.phone,
      personalization_data: r.personalizationData,
      channel,
    }));

    console.log('[RecipientService] Creating recipient records:', recipientDtos.map(r => ({
      campaign_id: r.campaign_id,
      recipient_type: r.recipient_type,
      email: r.email,
      channel: r.channel,
    })));

    const created = await this.recipientRepo.createRecipients(recipientDtos, tenantId);
    console.log('[RecipientService] Created recipients:', created.length);
    return created;
  }
}
