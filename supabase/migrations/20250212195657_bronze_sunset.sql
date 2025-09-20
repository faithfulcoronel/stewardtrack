/*
  # Add new membership types

  1. Changes
    - Add new values to membership_type enum:
      - non_member
      - non_baptized_member

  Note: This migration adds new enum values without removing existing data
*/

ALTER TYPE membership_type ADD VALUE IF NOT EXISTS 'non_member';
ALTER TYPE membership_type ADD VALUE IF NOT EXISTS 'non_baptized_member';