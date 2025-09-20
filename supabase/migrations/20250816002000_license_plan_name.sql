-- Rename licenses.code to plan_name and adjust constraints
ALTER TABLE licenses RENAME COLUMN code TO plan_name;
ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_tenant_id_code_key;
ALTER TABLE licenses ADD CONSTRAINT licenses_tenant_id_plan_name_key UNIQUE (tenant_id, plan_name);
