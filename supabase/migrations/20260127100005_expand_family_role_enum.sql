-- Migration: Expand Family Role Enum
-- Adds additional family relationship roles like grandparent, grandchild,
-- sibling, uncle, aunt, nephew, niece, cousin, in-law, guardian, etc.

-- Add new values to the family_role_type enum
-- PostgreSQL allows adding values to an enum with ALTER TYPE ... ADD VALUE

-- Immediate family
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'sibling';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'parent';

-- Extended family - Grandparents/Grandchildren
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'grandparent';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'grandchild';

-- Extended family - Aunts/Uncles/Cousins
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'uncle';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'aunt';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'nephew';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'niece';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'cousin';

-- In-laws
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'parent_in_law';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'child_in_law';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'sibling_in_law';

-- Step relations
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'stepparent';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'stepchild';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'stepsibling';

-- Legal/Guardian relationships
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'guardian';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'ward';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'foster_parent';
ALTER TYPE family_role_type ADD VALUE IF NOT EXISTS 'foster_child';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Family role enum expanded with additional relationship types';
END $$;
