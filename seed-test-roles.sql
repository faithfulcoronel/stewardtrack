-- Insert test roles for the fallback tenant UUID
INSERT INTO roles (id, tenant_id, name, description, scope, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Admin', 'Administrative role with full access', 'tenant', now(), now()),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Ministry Leader', 'Leadership role for ministry management', 'tenant', now(), now()),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Volunteer', 'Basic volunteer access', 'tenant', now(), now()),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Finance Manager', 'Financial management role', 'tenant', now(), now())
ON CONFLICT (id) DO NOTHING;