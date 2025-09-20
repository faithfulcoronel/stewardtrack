-- Public tenants view accessible by unauthenticated users

-- Function returning active tenants ignoring RLS
CREATE OR REPLACE FUNCTION list_public_tenants()
RETURNS TABLE(id uuid, name text)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT id, name
  FROM tenants
  WHERE status = 'active'
  ORDER BY name;
$$;

-- View selecting from the function
DROP VIEW IF EXISTS public_tenants;
CREATE VIEW public_tenants AS
SELECT * FROM list_public_tenants();

-- Permissions for anonymous access
GRANT SELECT ON public_tenants TO anon;
GRANT SELECT ON public_tenants TO authenticated;

COMMENT ON FUNCTION list_public_tenants IS 'Returns active tenants for registration';
COMMENT ON VIEW public_tenants IS 'View of active tenants accessible without authentication';
