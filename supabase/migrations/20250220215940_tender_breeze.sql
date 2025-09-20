-- Drop existing RLS policies for members
DROP POLICY IF EXISTS "Members are viewable only by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be managed by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be created only within the user's tenant" ON members;
DROP POLICY IF EXISTS "Members can be updated by users in the same tenant" ON members;
DROP POLICY IF EXISTS "Members can be deleted by users in the same tenant" ON members;
