import { OfferingBatch } from '../models/offeringBatch.model';

export class OfferingBatchValidator {
  static validate(data: Partial<OfferingBatch>): void {
    if (data.batch_date !== undefined && !data.batch_date) {
      throw new Error('Batch date is required');
    }
    if (
      data.total_amount !== undefined &&
      (isNaN(Number(data.total_amount)) || data.total_amount === null)
    ) {
      throw new Error('Total amount must be a valid number');
    }
  }
}
