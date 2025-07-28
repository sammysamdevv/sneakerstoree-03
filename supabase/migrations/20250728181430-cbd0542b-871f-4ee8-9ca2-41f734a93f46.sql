-- Add M-Pesa receipt number to orders table
ALTER TABLE public.orders 
ADD COLUMN mpesa_receipt_number TEXT;

-- Add index for faster lookups
CREATE INDEX idx_orders_mpesa_receipt ON public.orders(mpesa_receipt_number);

-- Add comment
COMMENT ON COLUMN public.orders.mpesa_receipt_number IS 'M-Pesa transaction receipt number from callback';