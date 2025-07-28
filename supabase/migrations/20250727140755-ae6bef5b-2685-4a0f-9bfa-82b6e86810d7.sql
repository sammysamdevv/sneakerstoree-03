-- Add M-Pesa payment fields to affiliate_payouts table
ALTER TABLE affiliate_payouts 
ADD COLUMN mpesa_phone_number TEXT,
ADD COLUMN mpesa_full_name TEXT;

-- Update existing payouts to have default values for the new fields
UPDATE affiliate_payouts 
SET mpesa_phone_number = '', mpesa_full_name = '' 
WHERE mpesa_phone_number IS NULL OR mpesa_full_name IS NULL;