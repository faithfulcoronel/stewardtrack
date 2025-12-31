-- Add necessary created_by columns to track record creators
-- Migration: 20251228000001_add_created_by_column.sql

-- Add created_by column to subscription_payments table
ALTER TABLE subscription_payments
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add updated_by column to payment_methods table
ALTER TABLE subscription_payments
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add deleted_at column to subscription_payments table
ALTER TABLE subscription_payments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;