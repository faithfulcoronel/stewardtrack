import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { OfferingBatch } from '../../models/offeringBatch.model';
import type { IOfferingBatchAdapter } from '../offeringBatch.adapter';


@injectable()
export class OfferingBatchApiAdapter
  extends ApiBaseAdapter<OfferingBatch>
  implements IOfferingBatchAdapter
{
  protected basePath = '/offeringbatches';

  protected mapFromApi(data: any): OfferingBatch {
    return {
      id: data.id ?? data.Id,
      service_description: data.service_description ?? data.ServiceDescription ?? null,
      batch_date: data.batch_date ?? data.BatchDate,
      total_amount: data.total_amount ?? data.TotalAmount,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as OfferingBatch;
  }

  protected mapToApi(data: Partial<OfferingBatch>) {
    return {
      id: data.id,
      serviceDescription: data.service_description,
      batchDate: data.batch_date,
      totalAmount: data.total_amount,
    };
  }
}
