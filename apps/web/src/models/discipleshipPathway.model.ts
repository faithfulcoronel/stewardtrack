/**
 * ================================================================================
 * DISCIPLESHIP PATHWAY MODEL
 * ================================================================================
 *
 * Database table: discipleship_pathways
 *
 * This model represents a discipleship pathway/track configuration.
 * Pathways are tenant-scoped lookup values for spiritual growth journeys.
 *
 * SCHEMA:
 *   id uuid PRIMARY KEY
 *   tenant_id uuid REFERENCES tenants(id)
 *   name text                     -- Display name (e.g., "Growth Track")
 *   code text                     -- Unique code (e.g., "growth_track")
 *   description text              -- Optional description
 *   display_order integer         -- Order for UI display
 *   is_active boolean             -- Whether pathway is available for selection
 *   created_at timestamptz
 *   updated_at timestamptz
 *   created_by uuid
 *   updated_by uuid
 *   deleted_at timestamptz        -- Soft delete
 *
 * ================================================================================
 */

import { BaseModel } from '@/models/base.model';

export interface DiscipleshipPathway extends BaseModel {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description?: string | null;
  display_order?: number | null;
  is_active?: boolean | null;
}

/**
 * Default pathways seeded during tenant onboarding
 */
export const DEFAULT_DISCIPLESHIP_PATHWAYS = [
  {
    name: 'Growth Track',
    code: 'growth_track',
    description: 'Foundation course for new believers and members',
    display_order: 1,
  },
  {
    name: 'Leadership Development',
    code: 'leadership',
    description: 'Training for emerging leaders in ministry',
    display_order: 2,
  },
  {
    name: 'Foundations',
    code: 'foundations',
    description: 'Core biblical teachings and doctrine',
    display_order: 3,
  },
  {
    name: 'Discipleship 101',
    code: 'discipleship_101',
    description: 'Introduction to discipleship principles',
    display_order: 4,
  },
  {
    name: 'Membership Class',
    code: 'membership',
    description: 'Preparation for church membership',
    display_order: 5,
  },
  {
    name: 'Baptism Preparation',
    code: 'baptism',
    description: 'Teaching and preparation for baptism',
    display_order: 6,
  },
  {
    name: 'Small Group Journey',
    code: 'small_group',
    description: 'Small group participation and growth',
    display_order: 7,
  },
];
