import { injectable, inject } from 'inversify';
import { TYPES } from '../lib/types';
import type { IErrorLogRepository } from '../repositories/errorLog.repository';

export interface ErrorLogService {
  logError(message: string, stack?: string | null, context?: Record<string, any>): Promise<void>;
}

@injectable()
export class SupabaseErrorLogService implements ErrorLogService {
  constructor(
    @inject(TYPES.IErrorLogRepository)
    private repo: IErrorLogRepository,
  ) {}

  async logError(message: string, stack?: string | null, context?: Record<string, any>): Promise<void> {
    try {
      await this.repo.create({ message, stack: stack ?? null, context: context ?? null });
    } catch (err) {
      console.error('Failed to record error log:', err);
    }
  }
}
