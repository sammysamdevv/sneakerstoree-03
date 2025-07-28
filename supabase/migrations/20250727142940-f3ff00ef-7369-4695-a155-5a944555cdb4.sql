-- Create a table to track exact deductions from commissions
CREATE TABLE public.commission_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_id UUID NOT NULL REFERENCES affiliate_commissions(id) ON DELETE CASCADE,
  payout_id UUID NOT NULL REFERENCES affiliate_payouts(id) ON DELETE CASCADE,
  deducted_amount NUMERIC NOT NULL CHECK (deducted_amount > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_deductions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all deductions"
ON public.commission_deductions
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Affiliates can view their own deductions"
ON public.commission_deductions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM affiliate_commissions ac
  WHERE ac.id = commission_deductions.commission_id 
  AND ac.affiliate_id = auth.uid()
));

-- Create index for performance
CREATE INDEX idx_commission_deductions_commission_id ON public.commission_deductions(commission_id);
CREATE INDEX idx_commission_deductions_payout_id ON public.commission_deductions(payout_id);

-- Update the get_affiliate_balance function to use deductions instead of paid_out flag
CREATE OR REPLACE FUNCTION public.get_affiliate_balance(affiliate_user_id uuid)
RETURNS TABLE(total_earned numeric, total_pending numeric, total_approved numeric, total_paid numeric, available_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(ac.commission_amount), 0) as total_earned,
    COALESCE(SUM(CASE WHEN ac.status = 'pending' THEN ac.commission_amount ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN ac.status = 'approved' THEN ac.commission_amount ELSE 0 END), 0) as total_approved,
    COALESCE(SUM(cd.deducted_amount), 0) as total_paid,
    COALESCE(SUM(CASE WHEN ac.status = 'approved' THEN ac.commission_amount ELSE 0 END), 0) - COALESCE(SUM(cd.deducted_amount), 0) as available_balance
  FROM public.affiliate_commissions ac
  LEFT JOIN public.commission_deductions cd ON ac.id = cd.commission_id
  WHERE ac.affiliate_id = affiliate_user_id;
END;
$function$;