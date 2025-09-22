import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { FamilyRelationship } from '@/models/familyRelationship.model';

export type IFamilyRelationshipAdapter = IBaseAdapter<FamilyRelationship>;

@injectable()
export class FamilyRelationshipAdapter
  extends BaseAdapter<FamilyRelationship>
  implements IFamilyRelationshipAdapter
{
  protected tableName = 'family_relationships';

  protected defaultSelect = `
    id,
    member_id,
    related_member_id,
    relationship_category_id,
    notes,
    created_at,
    updated_at
  `;

  protected defaultRelationships = [
    {
      table: 'members',
      foreignKey: 'member_id',
      alias: 'member',
      select: ['id', 'first_name', 'last_name', 'email', 'contact_number'],
    },
    {
      table: 'members',
      foreignKey: 'related_member_id',
      alias: 'related_member',
      select: ['id', 'first_name', 'last_name', 'email', 'contact_number'],
    },
    {
      table: 'categories',
      foreignKey: 'relationship_category_id',
      alias: 'category',
      select: ['id', 'name', 'code'],
    },
  ];
}
