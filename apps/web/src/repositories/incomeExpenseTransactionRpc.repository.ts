import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type {
  IIncomeExpenseTransactionRpcAdapter,
  CreateBatchParams,
  CreateBatchResult,
  UpdateLineParams,
  UpdateLineResult,
  UpdateBatchParams,
  UpdateBatchResult,
  DeleteTransactionResult,
  DeleteBatchResult,
} from '@/adapters/incomeExpenseTransactionRpc.adapter';

export interface IIncomeExpenseTransactionRpcRepository {
  createBatch(params: CreateBatchParams): Promise<CreateBatchResult>;
  updateLine(params: UpdateLineParams): Promise<UpdateLineResult>;
  updateBatch(params: UpdateBatchParams): Promise<UpdateBatchResult>;
  deleteTransaction(tenantId: string, transactionId: string): Promise<DeleteTransactionResult>;
  deleteBatch(tenantId: string, headerId: string): Promise<DeleteBatchResult>;
}

@injectable()
export class IncomeExpenseTransactionRpcRepository implements IIncomeExpenseTransactionRpcRepository {
  constructor(
    @inject(TYPES.IIncomeExpenseTransactionRpcAdapter)
    private readonly rpcAdapter: IIncomeExpenseTransactionRpcAdapter,
  ) {}

  public async createBatch(params: CreateBatchParams): Promise<CreateBatchResult> {
    return this.rpcAdapter.createBatch(params);
  }

  public async updateLine(params: UpdateLineParams): Promise<UpdateLineResult> {
    return this.rpcAdapter.updateLine(params);
  }

  public async updateBatch(params: UpdateBatchParams): Promise<UpdateBatchResult> {
    return this.rpcAdapter.updateBatch(params);
  }

  public async deleteTransaction(tenantId: string, transactionId: string): Promise<DeleteTransactionResult> {
    return this.rpcAdapter.deleteTransaction(tenantId, transactionId);
  }

  public async deleteBatch(tenantId: string, headerId: string): Promise<DeleteBatchResult> {
    return this.rpcAdapter.deleteBatch(tenantId, headerId);
  }
}
