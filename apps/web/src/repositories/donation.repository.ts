import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IDonationAdapter } from '@/adapters/donation.adapter';
import type {
  Donation,
  DonationStatus,
  DonationWithDetails,
} from '@/models/donation.model';
import { TYPES } from '@/lib/types';

/**
 * Interface for Donation repository operations
 */
export interface IDonationRepository extends BaseRepository<Donation> {
  createDonation(data: Partial<Donation>, tenantId: string): Promise<Donation>;
  /**
   * Create a new donation for public/unauthenticated access.
   * Uses service role client to bypass RLS policies.
   */
  createDonationPublic(data: Partial<Donation>, tenantId: string): Promise<Donation>;
  updateDonation(id: string, data: Partial<Donation>, tenantId: string): Promise<Donation>;
  /**
   * Update a donation for public/unauthenticated access.
   * Uses service role client to bypass RLS policies.
   */
  updateDonationPublic(id: string, data: Partial<Donation>, tenantId: string): Promise<Donation>;
  updateDonationStatus(
    id: string,
    status: DonationStatus,
    tenantId: string,
    additionalData?: Partial<Donation>
  ): Promise<Donation>;
  findByXenditPaymentRequestId(paymentRequestId: string): Promise<Donation | null>;
  findByXenditPaymentId(paymentId: string): Promise<Donation | null>;
  findByMemberId(memberId: string, tenantId: string): Promise<Donation[]>;
  findByCampaignId(campaignId: string, tenantId: string): Promise<Donation[]>;
  getDonationWithDetails(id: string, tenantId: string): Promise<DonationWithDetails | null>;
  getRecurringDonationsDue(tenantId: string, dueDate: string): Promise<Donation[]>;
}

@injectable()
export class DonationRepository
  extends BaseRepository<Donation>
  implements IDonationRepository
{
  constructor(@inject(TYPES.IDonationAdapter) private donationAdapter: IDonationAdapter) {
    super(donationAdapter);
  }

  /**
   * Create a new donation
   */
  async createDonation(data: Partial<Donation>, tenantId: string): Promise<Donation> {
    return await this.donationAdapter.createDonation(data, tenantId);
  }

  /**
   * Create a new donation for public/unauthenticated access.
   * Uses service role client to bypass RLS policies.
   */
  async createDonationPublic(data: Partial<Donation>, tenantId: string): Promise<Donation> {
    return await this.donationAdapter.createDonationPublic(data, tenantId);
  }

  /**
   * Update a donation
   */
  async updateDonation(id: string, data: Partial<Donation>, tenantId: string): Promise<Donation> {
    return await this.donationAdapter.updateDonation(id, data, tenantId);
  }

  /**
   * Update a donation for public/unauthenticated access.
   * Uses service role client to bypass RLS policies.
   */
  async updateDonationPublic(id: string, data: Partial<Donation>, tenantId: string): Promise<Donation> {
    return await this.donationAdapter.updateDonationPublic(id, data, tenantId);
  }

  /**
   * Update donation status
   */
  async updateDonationStatus(
    id: string,
    status: DonationStatus,
    tenantId: string,
    additionalData?: Partial<Donation>
  ): Promise<Donation> {
    return await this.donationAdapter.updateDonationStatus(id, status, tenantId, additionalData);
  }

  /**
   * Find donation by Xendit payment request ID
   */
  async findByXenditPaymentRequestId(paymentRequestId: string): Promise<Donation | null> {
    return await this.donationAdapter.findByXenditPaymentRequestId(paymentRequestId);
  }

  /**
   * Find donation by Xendit payment ID
   */
  async findByXenditPaymentId(paymentId: string): Promise<Donation | null> {
    return await this.donationAdapter.findByXenditPaymentId(paymentId);
  }

  /**
   * Find all donations for a member
   */
  async findByMemberId(memberId: string, tenantId: string): Promise<Donation[]> {
    return await this.donationAdapter.findByMemberId(memberId, tenantId);
  }

  /**
   * Find all donations for a campaign
   */
  async findByCampaignId(campaignId: string, tenantId: string): Promise<Donation[]> {
    return await this.donationAdapter.findByCampaignId(campaignId, tenantId);
  }

  /**
   * Get donation with full details for display
   */
  async getDonationWithDetails(id: string, tenantId: string): Promise<DonationWithDetails | null> {
    return await this.donationAdapter.getDonationWithDetails(id, tenantId);
  }

  /**
   * Get recurring donations that are due for processing
   */
  async getRecurringDonationsDue(tenantId: string, dueDate: string): Promise<Donation[]> {
    return await this.donationAdapter.getRecurringDonationsDue(tenantId, dueDate);
  }
}
