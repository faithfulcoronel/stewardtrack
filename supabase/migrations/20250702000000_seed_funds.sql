-- Seed predefined funds for each tenant

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'General Fund', 'unrestricted',
       'Church operations, salaries, utilities, etc.'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Tithes & Offerings Fund', 'unrestricted',
       'Regular giving from members'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Building Fund', 'restricted',
       'Construction, renovation, expansion'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Lot Fund', 'restricted',
       'Land purchase for future buildings or expansion'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Missions Fund', 'restricted',
       'Local & foreign missionary support'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Youth Ministry Fund', 'restricted',
       'Camps, fellowships, materials for youth'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Children''s / DVBS Fund', 'restricted',
       'Sunday School, Vacation Bible School'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Love Gift / Benevolence Fund', 'restricted',
       'Assisting members in financial crisis'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Pastor''s Care Fund', 'restricted',
       'For pastor''s family, medical needs, etc.'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Scholarship Fund', 'restricted',
       'For sponsoring Bible school or academic students'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Church Planting Fund', 'restricted',
       'Support for new churches, missions, outreaches'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Music / Worship Fund', 'restricted',
       'Equipment, uniforms, musical training'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Transportation Fund', 'restricted',
       'For church vehicles or travel needs'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Media & Livestream Fund', 'restricted',
       'Equipment for digital outreach and livestream'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Anniversary / Events Fund', 'restricted',
       'For special events, anniversaries, joint fellowships'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO funds (tenant_id, name, type, description)
SELECT id, 'Endowment Fund', 'restricted',
       'Long-term investment with restricted use'
FROM tenants
ON CONFLICT DO NOTHING;
