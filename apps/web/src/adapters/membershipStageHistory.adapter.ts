import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { MembershipStageHistory } from '@/models/membershipStageHistory.model';

export type IMembershipStageHistoryAdapter = IBaseAdapter<MembershipStageHistory>;

@injectable()
export class MembershipStageHistoryAdapter
  extends BaseAdapter<MembershipStageHistory>
  implements IMembershipStageHistoryAdapter
{
  protected tableName = 'membership_stage_history';

  protected defaultSelect = `
    id,
    member_id,
    previous_stage_id,
    stage_id,
    changed_at,
    changed_by,
    notes,
    created_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'membership_stage',
      foreignKey: 'stage_id',
      select: ['id', 'name', 'code']
    },
    {
      table: 'membership_stage',
      alias: 'previous_stage',
      foreignKey: 'previous_stage_id',
      select: ['id', 'name', 'code']
    }
  ];
}
