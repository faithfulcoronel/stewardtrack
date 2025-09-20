-- Add birthday column to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS birthday date;

-- Add index for faster queries on birthday
CREATE INDEX IF NOT EXISTS members_birthday_idx ON members(birthday);

-- Add comment explaining birthday field
COMMENT ON COLUMN members.birthday IS 
  'The member''s date of birth. Used for age calculation and birthday notifications.';