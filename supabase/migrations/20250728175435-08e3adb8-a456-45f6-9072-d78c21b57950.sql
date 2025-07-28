-- Add checkout_request_id column to orders table for M-Pesa tracking
ALTER TABLE public.orders 
ADD COLUMN checkout_request_id TEXT;