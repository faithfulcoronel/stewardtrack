-- Populate fund codes for existing rows
UPDATE funds
SET code = CASE
  WHEN name = 'General Fund' THEN 'GENERAL'
  WHEN name = 'Tithes & Offerings Fund' THEN 'TITHES'
  WHEN name = 'Building Fund' THEN 'BUILDING'
  WHEN name = 'Lot Fund' THEN 'LOT'
  WHEN name = 'Missions Fund' THEN 'MISSIONS'
  WHEN name = 'Youth Ministry Fund' THEN 'YOUTH'
  WHEN name = 'Children''s / DVBS Fund' THEN 'CHILDREN'
  WHEN name = 'Love Gift / Benevolence Fund' THEN 'LOVE_GIFT'
  WHEN name = 'Pastor''s Care Fund' THEN 'PASTOR_CARE'
  WHEN name = 'Scholarship Fund' THEN 'SCHOLARSHIP'
  WHEN name = 'Church Planting Fund' THEN 'CHURCH_PLANTING'
  WHEN name = 'Music / Worship Fund' THEN 'MUSIC'
  WHEN name = 'Transportation Fund' THEN 'TRANSPORTATION'
  WHEN name = 'Media & Livestream Fund' THEN 'MEDIA'
  WHEN name = 'Anniversary / Events Fund' THEN 'ANNIVERSARY'
  WHEN name = 'Endowment Fund' THEN 'ENDOWMENT'
  ELSE code
END
WHERE code IS NULL;

-- Make code required
ALTER TABLE funds ALTER COLUMN code SET NOT NULL;
