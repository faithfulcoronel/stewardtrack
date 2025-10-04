SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_all_tenants_for_assignment';
