import { SupabaseAuditService } from "@/services/AuditService";
import { EncryptedMemberAdapter } from "@/adapters/encrypted/EncryptedMemberAdapter";
import { EncryptedAccountAdapter } from "@/adapters/encrypted/EncryptedAccountAdapter";
import { EncryptionService } from "@/lib/encryption/EncryptionService";
import { EncryptionKeyManager } from "@/lib/encryption/EncryptionKeyManager";
import { AES256GCMStrategy } from "@/lib/encryption/strategies/AES256GCMStrategy";
import { MemberRepository } from "@/repositories/member.repository";
import { MemberService } from "@/services/MemberService";
import { AccountRepository } from "@/repositories/account.repository";
import { FinancialTransactionAdapter } from "@/adapters/financialTransaction.adapter";
import { FinancialTransactionRepository } from "@/repositories/financialTransaction.repository";
import { MembershipStageAdapter } from "@/adapters/membershipStage.adapter";
import { MembershipStageRepository } from "@/repositories/membershipStage.repository";
import { MembershipTypeAdapter } from "@/adapters/membershipType.adapter";
import { MembershipTypeRepository } from "@/repositories/membershipType.repository";
import { MembershipCenterAdapter } from "@/adapters/membershipCenter.adapter";
import { MembershipCenterRepository } from "@/repositories/membershipCenter.repository";
import type { RequestContext } from "@/lib/server/context";
import type { BaseAdapter } from "@/adapters/base.adapter";
import type { MembershipStage } from "@/models/membershipStage.model";
import type { MembershipType } from "@/models/membershipType.model";
import type { MembershipCenter } from "@/models/membershipCenter.model";

export interface MemberManageResources {
  memberService: MemberService;
  stages: MembershipStage[];
  types: MembershipType[];
  centers: MembershipCenter[];
}

export class MemberManageResourceFactory {
  async build(tenantId: string, role: string | null): Promise<MemberManageResources> {
    const context = this.createRequestContext(tenantId, role);
    const auditService = new SupabaseAuditService();

    const memberService = this.createMemberService(context, auditService);
    const stageRepository = this.createMembershipStageRepository(context, auditService);
    const typeRepository = this.createMembershipTypeRepository(context, auditService);
    const centerRepository = this.createMembershipCenterRepository(context, auditService);

    const [stages, types, centers] = await Promise.all([
      this.fetchRepositoryRecords(stageRepository),
      this.fetchRepositoryRecords(typeRepository),
      this.fetchRepositoryRecords(centerRepository),
    ]);

    return {
      memberService,
      stages,
      types,
      centers,
    };
  }

  private createRequestContext(tenantId: string, role: string | null): RequestContext {
    const context: RequestContext = {
      tenantId,
    };

    if (role) {
      context.roles = [role];
    }

    return context;
  }

  private applyRequestContextToAdapter(adapter: BaseAdapter<any>, context: RequestContext) {
    (adapter as unknown as { context: RequestContext }).context = context;
  }

  private createMemberService(context: RequestContext, auditService: SupabaseAuditService): MemberService {
    // Create encryption stack (shared across all encrypted adapters)
    const encryptionStrategy = new AES256GCMStrategy();
    const keyManager = new EncryptionKeyManager();
    const encryptionService = new EncryptionService(encryptionStrategy, keyManager);

    // Use EncryptedMemberAdapter instead of plain MemberAdapter
    const memberAdapter = new EncryptedMemberAdapter(encryptionService, auditService);
    this.applyRequestContextToAdapter(memberAdapter, context);
    const memberRepository = new MemberRepository(memberAdapter);

    // Use EncryptedAccountAdapter instead of plain AccountAdapter
    const accountAdapter = new EncryptedAccountAdapter(auditService, encryptionService);
    this.applyRequestContextToAdapter(accountAdapter, context);
    const accountRepository = new AccountRepository(accountAdapter);

    const transactionAdapter = new FinancialTransactionAdapter(auditService);
    this.applyRequestContextToAdapter(transactionAdapter, context);
    const transactionRepository = new FinancialTransactionRepository(transactionAdapter);

    return new MemberService(memberRepository, accountRepository, transactionRepository);
  }

  private createMembershipStageRepository(
    context: RequestContext,
    auditService: SupabaseAuditService,
  ): MembershipStageRepository {
    const adapter = new MembershipStageAdapter(auditService);
    this.applyRequestContextToAdapter(adapter, context);
    return new MembershipStageRepository(adapter);
  }

  private createMembershipTypeRepository(
    context: RequestContext,
    auditService: SupabaseAuditService,
  ): MembershipTypeRepository {
    const adapter = new MembershipTypeAdapter(auditService);
    this.applyRequestContextToAdapter(adapter, context);
    return new MembershipTypeRepository(adapter);
  }

  private createMembershipCenterRepository(
    context: RequestContext,
    auditService: SupabaseAuditService,
  ): MembershipCenterRepository {
    const adapter = new MembershipCenterAdapter(auditService);
    this.applyRequestContextToAdapter(adapter, context);
    return new MembershipCenterRepository(adapter);
  }

  private async fetchRepositoryRecords<T extends { id: string }>(
    repository: {
      findAll: (options?: any) => Promise<{ data: T[]; count: number | null }>;
    },
  ): Promise<T[]> {
    try {
      const result = await repository.findAll();
      return result.data ?? [];
    } catch (error) {
      console.error("Failed to load repository records", error);
      return [];
    }
  }
}
